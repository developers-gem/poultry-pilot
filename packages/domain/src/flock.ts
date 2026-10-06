import type { FlockPurpose, FlockStatus, Species } from "@poultrypilot/contracts";
import { daysBetween } from "./dates.js";
import { DomainError } from "./errors.js";

/**
 * Flock population is derived from events, never stored as a mutable counter.
 * Replaces the prototype's mix of bird_count, chicks_received and birds_sold (audit B18, B21).
 */

export type FlockEvent =
  | { type: "placement"; date: string; birdsReceived: number; deadOnArrival: number }
  | { type: "mortality"; date: string; count: number }
  | { type: "cull"; date: string; count: number }
  | { type: "sale"; date: string; birds: number; totalLiveWeightKg: number }
  | { type: "transfer_out"; date: string; birds: number }
  | { type: "transfer_in"; date: string; birds: number };

export interface Population {
  placed: number;
  mortality: number;
  culled: number;
  sold: number;
  transferredOut: number;
  alive: number;
  soldLiveWeightKg: number;
}

/** Population as of the end of `asOf` (inclusive). Events after `asOf` are ignored. */
export function population(events: FlockEvent[], asOf?: string): Population {
  const p: Population = { placed: 0, mortality: 0, culled: 0, sold: 0, transferredOut: 0, alive: 0, soldLiveWeightKg: 0 };
  for (const e of events) {
    if (asOf && e.date > asOf) continue;
    switch (e.type) {
      case "placement":
        p.placed += e.birdsReceived - e.deadOnArrival;
        break;
      case "transfer_in":
        p.placed += e.birds;
        break;
      case "mortality":
        p.mortality += e.count;
        break;
      case "cull":
        p.culled += e.count;
        break;
      case "sale":
        p.sold += e.birds;
        p.soldLiveWeightKg += e.totalLiveWeightKg;
        break;
      case "transfer_out":
        p.transferredOut += e.birds;
        break;
    }
  }
  p.alive = p.placed - p.mortality - p.culled - p.sold - p.transferredOut;
  return p;
}

/**
 * Validate that appending `next` keeps the flock consistent at every date.
 * Rejects a sale, cull, death or transfer that would take birds alive below zero
 * on the event date or on any later date (an earlier-dated entry can invalidate later ones).
 */
export function assertEventAllowed(existing: FlockEvent[], next: FlockEvent): void {
  const all = [...existing, next];
  const checkDates = [...new Set(all.map((e) => e.date).filter((d) => d >= next.date))].sort();
  for (const d of checkDates) {
    const p = population(all, d);
    if (p.alive < 0) {
      throw new DomainError(
        "INSUFFICIENT_BIRDS",
        `This entry would leave ${p.alive} birds alive on ${d}. Check the counts.`,
        { date: d, alive: p.alive },
      );
    }
  }
}

const TRANSITIONS: Record<FlockStatus, readonly FlockStatus[]> = {
  planned: ["active", "cancelled"],
  active: ["closed"],
  closed: ["active"], // reopen to correct records; owner-only, enforced by the service
  cancelled: [],
};

export function assertTransition(from: FlockStatus, to: FlockStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError("INVALID_STATE_TRANSITION", `A ${from} flock cannot become ${to}`, { from, to });
  }
}

/** Closing requires every bird to be accounted for (sold, dead, culled or transferred). */
export function assertCanClose(events: FlockEvent[]): void {
  const p = population(events);
  if (p.alive !== 0) {
    throw new DomainError(
      "INVALID_STATE_TRANSITION",
      `${p.alive} birds are still recorded as alive. Record their sale, transfer or loss before closing.`,
      { alive: p.alive },
    );
  }
}

/** Bird age in days. Uses hatch date when known, otherwise placement date plus age at placement. */
export function ageDays(
  opts: { hatchDate?: string; placementDate?: string; ageDaysAtPlacement?: number },
  asOf: string,
): number | null {
  if (opts.hatchDate) return daysBetween(opts.hatchDate, asOf);
  if (opts.placementDate) return daysBetween(opts.placementDate, asOf) + (opts.ageDaysAtPlacement ?? 0);
  return null;
}

export interface Stage {
  key: string;
  label: string;
  fromDay: number;
}

export interface ProductionProfile {
  key: string;
  species: Species;
  purpose: FlockPurpose;
  label: string;
  stages: Stage[];
  /** Typical cycle end in days; used only for progress bars, never to change status automatically. */
  typicalEndDay?: number;
}

/**
 * Seed defaults. The broiler boundaries match the prototype (0–14 / 15–35 / 36+).
 * Farms can edit them; values must be checked against the breed management guide.
 */
export const DEFAULT_PROFILES: ProductionProfile[] = [
  {
    key: "chicken_broiler",
    species: "chicken",
    purpose: "broiler",
    label: "Chicken broiler",
    stages: [
      { key: "brooding", label: "Brooding", fromDay: 0 },
      { key: "grow_out", label: "Grow-out", fromDay: 15 },
      { key: "finishing", label: "Finishing", fromDay: 36 },
    ],
    typicalEndDay: 42,
  },
  {
    key: "chicken_layer",
    species: "chicken",
    purpose: "layer",
    label: "Chicken layer",
    stages: [
      { key: "chick", label: "Chick", fromDay: 0 },
      { key: "grower", label: "Grower", fromDay: 43 },
      { key: "pre_lay", label: "Pre-lay", fromDay: 120 },
      { key: "laying", label: "Laying", fromDay: 140 },
    ],
    typicalEndDay: 560,
  },
];

export function stageFor(profile: ProductionProfile, age: number | null): Stage | null {
  if (age === null || age < 0) return null;
  const sorted = [...profile.stages].sort((a, b) => a.fromDay - b.fromDay);
  let current: Stage | null = null;
  for (const s of sorted) if (age >= s.fromDay) current = s;
  return current;
}
