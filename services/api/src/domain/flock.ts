import type { FlockEventType, FlockStatus, FlockType } from "@poultrypilot/types";
import { daysBetween } from "./dates.js";
import { DomainError } from "./errors.js";

/**
 * The flock ledger. A flock's bird count is never stored as an editable number: it is the sum of its
 * events. Corrections are new events with `reversalOf`; a reversed event and its reversal both drop out.
 */
export interface LedgerEvent {
  id: string;
  type: FlockEventType;
  date: string;
  /** Positive count for placement, mortality, cull, sale and every transfer/split/merge half. */
  birds?: number;
  /** Placement only: birds dead on arrival, deducted from the placement. */
  deadOnArrival?: number;
  /** Adjustment only: signed correction of the count. */
  delta?: number;
  /** Measured or estimated live weight of the birds that moved (placement, sale, *_out, *_in). */
  totalLiveWeightKg?: number;
  /** Weighing only. */
  averageWeightG?: number;
  sampleSize?: number;
  /** Sale: revenue in minor units. */
  totalMinor?: number;
  /** Placement: purchase cost. *_in: acquisition cost received. *_out: acquisition cost given away. Minor units. */
  costMinor?: number;
  toStatus?: FlockStatus;
  reversalOf?: string;
}

const IN_TYPES: ReadonlySet<FlockEventType> = new Set(["transfer_in", "split_in", "merge_in"]);
const OUT_TYPES: ReadonlySet<FlockEventType> = new Set(["transfer_out", "split_out", "merge_out"]);
export const isInbound = (t: FlockEventType) => IN_TYPES.has(t);
export const isOutbound = (t: FlockEventType) => OUT_TYPES.has(t);

/** Events that still count: drops reversal entries and the events they reverse. */
export function effectiveEvents<E extends LedgerEvent>(events: E[]): E[] {
  const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf!));
  return events.filter((e) => !e.reversalOf && !reversed.has(e.id));
}

/** Change in birds alive caused by one event. */
export function birdDelta(e: LedgerEvent): number {
  switch (e.type) {
    case "placement":
      return (e.birds ?? 0) - (e.deadOnArrival ?? 0);
    case "transfer_in":
    case "split_in":
    case "merge_in":
      return e.birds ?? 0;
    case "mortality":
    case "cull":
    case "sale":
    case "transfer_out":
    case "split_out":
    case "merge_out":
      return -(e.birds ?? 0);
    case "adjustment":
      return e.delta ?? 0;
    default:
      return 0;
  }
}

export interface Population {
  /** Birds placed, net of dead-on-arrival. */
  placed: number;
  deadOnArrival: number;
  transferredIn: number;
  /** placed + transferredIn: every bird the flock has received. Denominator of mortality and survival rates. */
  birdsIn: number;
  mortality: number;
  culled: number;
  sold: number;
  transferredOut: number;
  adjustments: number;
  alive: number;
}

/** Population at the end of `asOf` (inclusive). Later events are ignored. */
export function population(events: LedgerEvent[], asOf?: string): Population {
  const p: Population = { placed: 0, deadOnArrival: 0, transferredIn: 0, birdsIn: 0, mortality: 0, culled: 0, sold: 0, transferredOut: 0, adjustments: 0, alive: 0 };
  for (const e of effectiveEvents(events)) {
    if (asOf && e.date > asOf) continue;
    const n = e.birds ?? 0;
    if (e.type === "placement") {
      p.placed += n - (e.deadOnArrival ?? 0);
      p.deadOnArrival += e.deadOnArrival ?? 0;
    } else if (isInbound(e.type)) p.transferredIn += n;
    else if (e.type === "mortality") p.mortality += n;
    else if (e.type === "cull") p.culled += n;
    else if (e.type === "sale") p.sold += n;
    else if (isOutbound(e.type)) p.transferredOut += n;
    else if (e.type === "adjustment") p.adjustments += e.delta ?? 0;
    p.alive += birdDelta(e);
  }
  p.birdsIn = p.placed + p.transferredIn;
  return p;
}

/**
 * Rejects any ledger in which birds alive would be negative at the end of any day.
 * Checking every day (not just today) means a back-dated loss cannot invalidate a later sale unnoticed.
 */
export function assertLedgerValid(events: LedgerEvent[], fromDate?: string): void {
  const effective = effectiveEvents(events);
  const dates = [...new Set(effective.map((e) => e.date))].filter((d) => !fromDate || d >= fromDate).sort();
  for (const d of dates) {
    const alive = population(effective, d).alive;
    if (alive < 0) {
      throw new DomainError("INSUFFICIENT_BIRDS", `Not enough birds: this would leave ${alive} birds alive on ${d}.`, { date: d, alive });
    }
  }
}

/** Validates appending `next` (or a reversal) to a flock's ledger. */
export function assertEventAllowed(existing: LedgerEvent[], next: LedgerEvent): void {
  if (next.type === "placement" && (next.deadOnArrival ?? 0) > (next.birds ?? 0)) {
    throw new DomainError("VALIDATION_FAILED", "Dead on arrival cannot exceed birds received");
  }
  if (next.reversalOf) {
    const target = existing.find((e) => e.id === next.reversalOf);
    if (!target) throw new DomainError("NOT_FOUND", "The event to reverse does not belong to this flock");
    if (target.reversalOf) throw new DomainError("INVALID_STATE_TRANSITION", "A reversal cannot itself be reversed; record a new event instead");
    if (existing.some((e) => e.reversalOf === target.id)) throw new DomainError("INVALID_STATE_TRANSITION", "This event has already been reversed");
    assertLedgerValid([...existing, next], target.date);
    return;
  }
  assertLedgerValid([...existing, next], next.date);
}

/** Birds alive on a date, for "how many can I sell / move on this day". */
export function birdsAvailable(events: LedgerEvent[], date: string): number {
  // Birds that leave on a later date are still on the farm today, but they are already committed:
  // the minimum over today and every later day is what can safely leave today.
  const effective = effectiveEvents(events);
  const dates = [date, ...new Set(effective.map((e) => e.date).filter((d) => d > date))];
  return Math.min(...dates.map((d) => population(effective, d).alive));
}

/**
 * Acquisition cost per bird: what the birds cost to obtain (placement purchases plus cost received with
 * transferred-in birds, minus cost given away with birds moved out), spread over the birds still owned
 * or lost. Used to move cost with birds in transfers, splits and merges. Feed cost stays with the flock that ate it.
 */
export function acquisitionCostPerBird(events: LedgerEvent[]): number {
  let cost = 0;
  let birds = 0;
  for (const e of effectiveEvents(events)) {
    if (e.type === "placement") {
      cost += e.costMinor ?? 0;
      birds += (e.birds ?? 0) - (e.deadOnArrival ?? 0);
    } else if (isInbound(e.type)) {
      cost += e.costMinor ?? 0;
      birds += e.birds ?? 0;
    } else if (isOutbound(e.type)) {
      cost -= e.costMinor ?? 0;
      birds -= e.birds ?? 0;
    }
  }
  return birds > 0 ? cost / birds : 0;
}

// ---- lifecycle ---------------------------------------------------------------

const TRANSITIONS: Record<FlockStatus, readonly FlockStatus[]> = {
  planned: ["active", "cancelled"],
  active: ["closed"],
  closed: [],
  cancelled: [],
};

export function assertTransition(from: FlockStatus, to: FlockStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError("INVALID_STATE_TRANSITION", `A ${from} flock cannot become ${to}`, { from, to });
  }
}

/** A flock can close only when every bird is accounted for. */
export function assertCanClose(events: LedgerEvent[], closeDate: string): void {
  const effective = effectiveEvents(events);
  const later = effective.find((e) => e.date > closeDate);
  if (later) throw new DomainError("INVALID_STATE_TRANSITION", `There are events after ${closeDate} (first on ${later.date}). Close on or after that date.`);
  const p = population(effective, closeDate);
  if (p.alive !== 0) {
    throw new DomainError(
      "INVALID_STATE_TRANSITION",
      `${p.alive} birds are still recorded as alive. Record their sale, transfer or loss, or an adjustment, before closing.`,
      { alive: p.alive },
    );
  }
}

/** Bird age in days. Uses hatch date when known, otherwise placement date plus age at placement. */
export function ageDays(opts: { hatchDate?: string; placementDate?: string; ageDaysAtPlacement?: number }, asOf: string): number | null {
  if (opts.hatchDate) return daysBetween(opts.hatchDate, asOf);
  if (opts.placementDate) return daysBetween(opts.placementDate, asOf) + (opts.ageDaysAtPlacement ?? 0);
  return null;
}

export interface Stage {
  key: string;
  label: string;
  fromDay: number;
}

/** Default stage boundaries per flock type. Farms will be able to edit them; check against the breed guide. */
export const DEFAULT_STAGES: Record<FlockType, Stage[]> = {
  broiler: [
    { key: "brooding", label: "Brooding", fromDay: 0 },
    { key: "grow_out", label: "Grow-out", fromDay: 15 },
    { key: "finishing", label: "Finishing", fromDay: 36 },
  ],
  layer: [
    { key: "chick", label: "Chick", fromDay: 0 },
    { key: "grower", label: "Grower", fromDay: 43 },
    { key: "pre_lay", label: "Pre-lay", fromDay: 120 },
    { key: "laying", label: "Laying", fromDay: 140 },
  ],
  breeder: [
    { key: "rearing", label: "Rearing", fromDay: 0 },
    { key: "pre_breeding", label: "Pre-breeding", fromDay: 140 },
    { key: "production", label: "Production", fromDay: 168 },
  ],
  chick: [
    { key: "brooding", label: "Brooding", fromDay: 0 },
    { key: "rearing", label: "Rearing", fromDay: 28 },
  ],
  custom: [],
};

export function stageFor(type: FlockType, age: number | null): Stage | null {
  if (age === null || age < 0) return null;
  let current: Stage | null = null;
  for (const s of DEFAULT_STAGES[type]) if (age >= s.fromDay) current = s;
  return current;
}
