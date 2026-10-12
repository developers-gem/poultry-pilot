import type { Species } from "@poultrypilot/types";
import { addDays, daysBetween } from "./dates.js";
import { DomainError } from "./errors.js";

/**
 * Typical incubation periods in days. The prototype assumed 21 for every egg (audit table).
 * Quail 16–18 and guinea fowl 26–28 vary by breed; farms can override per batch.
 */
export const INCUBATION_DAYS: Record<Species, number> = {
  chicken: 21,
  duck: 28,
  turkey: 28,
  quail: 17,
  guinea_fowl: 27,
};

export function expectedHatchDate(setDate: string, species: Species, overrideDays?: number): string {
  return addDays(setDate, overrideDays ?? INCUBATION_DAYS[species]);
}

/** Day of incubation, where the set date is day 0. */
export function incubationDay(setDate: string, asOf: string): number {
  return daysBetween(setDate, asOf);
}

/** Eggs usually move from setter to hatcher about 3 days before hatch (18 of 21 days for chickens). */
export function expectedTransferDate(setDate: string, incubationDays: number): string {
  return addDays(setDate, Math.max(1, incubationDays - 3));
}

export interface HatchBatchResult {
  eggsSet: number;
  fertile?: number; // from candling
  hatched?: number; // undefined while incubating
}

export function batchRates(b: HatchBatchResult): {
  fertilityPercent: number | null;
  hatchOfSetPercent: number | null;
  hatchOfFertilePercent: number | null;
} {
  const pct = (a: number | undefined, d: number | undefined) => (a === undefined || d === undefined || d <= 0 ? null : (a / d) * 100);
  return {
    fertilityPercent: pct(b.fertile, b.eggsSet),
    hatchOfSetPercent: pct(b.hatched, b.eggsSet),
    hatchOfFertilePercent: pct(b.hatched, b.fertile),
  };
}

/**
 * Overall hatch-of-set across COMPLETED batches only.
 * Fixes audit B27: the prototype included batches still incubating, dragging the rate down.
 */
export function overallHatchOfSet(batches: HatchBatchResult[]): number | null {
  const done = batches.filter((b) => b.hatched !== undefined);
  const set = done.reduce((t, b) => t + b.eggsSet, 0);
  const hatched = done.reduce((t, b) => t + (b.hatched ?? 0), 0);
  return set > 0 ? (hatched / set) * 100 : null;
}

/**
 * The hatchery ledger. A batch's counts are derived from its events; nothing is typed in as a running total.
 * Stage order: set → candling (any number) → transfer to hatcher → hatch → chick grading.
 * Every egg set must end up in exactly one bucket: infertile, cracked, dead embryo, dead in shell, culled or saleable.
 */
export interface HatchCounts {
  infertile?: number;
  cracked?: number;
  deadEmbryo?: number;
  hatched?: number;
  deadInShell?: number;
  saleable?: number;
  culled?: number;
}

export interface HatchEvent {
  id: string;
  type: "set" | "candling" | "transfer_to_hatcher" | "hatch" | "chick_grading" | "environment_reading" | "note" | "cancelled" | "reversal";
  date: string;
  counts?: HatchCounts;
  reversalOf?: string;
}

export interface BatchCounts {
  eggsSet: number;
  infertile: number;
  cracked: number;
  deadEmbryo: number;
  /** Eggs moved to the hatcher; null before transfer. */
  transferred: number | null;
  hatched: number;
  deadInShell: number;
  culled: number;
  saleable: number;
  /** Eggs still incubating (before hatch); 0 afterwards. */
  inIncubation: number;
  stage: "incubating" | "in_hatcher" | "hatched" | "graded";
}

const COUNTED = new Set(["candling", "transfer_to_hatcher", "hatch", "chick_grading"]);

/** Events still in force: a reversal cancels the event it names, and both drop out. */
export function effectiveHatchEvents(events: HatchEvent[]): HatchEvent[] {
  const reversed = new Set(events.filter((e) => e.type === "reversal" && e.reversalOf).map((e) => e.reversalOf!));
  return events.filter((e) => e.type !== "reversal" && !reversed.has(e.id));
}

export function batchCounts(eggsSet: number, events: HatchEvent[]): BatchCounts {
  const c: BatchCounts = { eggsSet, infertile: 0, cracked: 0, deadEmbryo: 0, transferred: null, hatched: 0, deadInShell: 0, culled: 0, saleable: 0, inIncubation: eggsSet, stage: "incubating" };
  for (const e of effectiveHatchEvents(events)) {
    const n = e.counts ?? {};
    if (e.type === "candling" || e.type === "transfer_to_hatcher") {
      c.infertile += n.infertile ?? 0;
      c.cracked += n.cracked ?? 0;
      c.deadEmbryo += n.deadEmbryo ?? 0;
      c.inIncubation -= (n.infertile ?? 0) + (n.cracked ?? 0) + (n.deadEmbryo ?? 0);
      if (e.type === "transfer_to_hatcher") {
        c.transferred = c.inIncubation;
        c.stage = "in_hatcher";
      }
    } else if (e.type === "hatch") {
      c.hatched = n.hatched ?? 0;
      c.deadInShell = n.deadInShell ?? 0;
      c.inIncubation -= c.hatched + c.deadInShell;
      c.stage = "hatched";
    } else if (e.type === "chick_grading") {
      c.saleable = n.saleable ?? 0;
      c.culled = n.culled ?? 0;
      c.stage = "graded";
    }
  }
  return c;
}

/** Validates the next event against the batch so far: stage order and egg accounting. */
export function assertHatchEventAllowed(eggsSet: number, events: HatchEvent[], next: HatchEvent): void {
  const c = batchCounts(eggsSet, events);
  const n = next.counts ?? {};
  const removed = (n.infertile ?? 0) + (n.cracked ?? 0) + (n.deadEmbryo ?? 0);
  const stageError = (msg: string) => new DomainError("INVALID_STATE_TRANSITION", msg, { stage: c.stage });
  switch (next.type) {
    case "candling":
      if (c.stage !== "incubating") throw stageError("Candling is done before eggs move to the hatcher");
      if (removed > c.inIncubation) throw new DomainError("VALIDATION_FAILED", `Only ${c.inIncubation} eggs are still incubating; this removes ${removed}`, { inIncubation: c.inIncubation });
      return;
    case "transfer_to_hatcher":
      if (c.stage !== "incubating") throw stageError("This batch has already been transferred");
      if (removed > c.inIncubation) throw new DomainError("VALIDATION_FAILED", `Only ${c.inIncubation} eggs are still incubating; this removes ${removed}`, { inIncubation: c.inIncubation });
      return;
    case "hatch": {
      if (c.stage !== "incubating" && c.stage !== "in_hatcher") throw stageError("This batch has already hatched");
      const total = (n.hatched ?? 0) + (n.deadInShell ?? 0);
      if (total !== c.inIncubation) {
        throw new DomainError("VALIDATION_FAILED", `Hatched plus dead in shell must equal the ${c.inIncubation} eggs in the hatcher (got ${total})`, { inIncubation: c.inIncubation });
      }
      return;
    }
    case "chick_grading": {
      if (c.stage !== "hatched") throw stageError(c.stage === "graded" ? "Chicks from this batch are already graded" : "Grade chicks after the hatch is recorded");
      const total = (n.saleable ?? 0) + (n.culled ?? 0);
      if (total !== c.hatched) throw new DomainError("VALIDATION_FAILED", `Saleable plus culled must equal the ${c.hatched} chicks hatched (got ${total})`, { hatched: c.hatched });
      return;
    }
    default:
      return;
  }
}

/** The event a reversal may cancel: the latest counted event still in force (corrections go backwards, one step at a time). */
export function reversibleHatchEvent(events: HatchEvent[]): HatchEvent | null {
  const effective = effectiveHatchEvents(events).filter((e) => COUNTED.has(e.type));
  return effective[effective.length - 1] ?? null;
}

export interface HatcheryMetrics {
  fertile: number;
  /** Fertile ÷ eggs whose fertility could be judged (eggs set − cracked). */
  fertilityPercent: number | null;
  /** Hatched ÷ fertile eggs (hatch of fertile). Null until the hatch is recorded. */
  hatchabilityPercent: number | null;
  /** Hatched ÷ eggs set. */
  hatchOfSetPercent: number | null;
  /** Saleable chicks ÷ eggs set. Null until grading. */
  saleableChickPercent: number | null;
  /** Saleable ÷ hatched. */
  saleableOfHatchedPercent: number | null;
  /** (Eggs set − saleable) ÷ eggs set. Null until grading. */
  lossPercent: number | null;
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);

export function hatcheryMetrics(c: BatchCounts): HatcheryMetrics {
  const assessable = c.eggsSet - c.cracked;
  const fertile = assessable - c.infertile;
  const hatched = c.stage === "hatched" || c.stage === "graded";
  const graded = c.stage === "graded";
  return {
    fertile,
    fertilityPercent: pct(fertile, assessable),
    hatchabilityPercent: hatched ? pct(c.hatched, fertile) : null,
    hatchOfSetPercent: hatched ? pct(c.hatched, c.eggsSet) : null,
    saleableChickPercent: graded ? pct(c.saleable, c.eggsSet) : null,
    saleableOfHatchedPercent: graded ? pct(c.saleable, c.hatched) : null,
    lossPercent: graded ? pct(c.eggsSet - c.saleable, c.eggsSet) : null,
  };
}

// ---- brooding --------------------------------------------------------------------

export interface BroodingBand {
  fromDay: number;
  toDay: number;
  tempMinC?: number;
  tempMaxC?: number;
  humidityMin?: number;
  humidityMax?: number;
  targetWeightG?: number;
}

export type BroodingFlag = "temperature_low" | "temperature_high" | "humidity_low" | "humidity_high" | "behaviour" | "no_feed" | "no_water";

/** Compares a brooder check with the farm's own profile for that day of age. No profile, no range flags. */
export function evaluateBrooderCheck(
  check: { dayOfAge: number; temperatureC?: number; humidityPercent?: number; behaviour?: string; feedAvailable?: boolean; waterAvailable?: boolean },
  bands: BroodingBand[] | undefined,
): { band: BroodingBand | null; flags: BroodingFlag[] } {
  const band = bands?.find((b) => check.dayOfAge >= b.fromDay && check.dayOfAge <= b.toDay) ?? null;
  const flags: BroodingFlag[] = [];
  if (band && check.temperatureC !== undefined) {
    if (band.tempMinC !== undefined && check.temperatureC < band.tempMinC) flags.push("temperature_low");
    if (band.tempMaxC !== undefined && check.temperatureC > band.tempMaxC) flags.push("temperature_high");
  }
  if (band && check.humidityPercent !== undefined) {
    if (band.humidityMin !== undefined && check.humidityPercent < band.humidityMin) flags.push("humidity_low");
    if (band.humidityMax !== undefined && check.humidityPercent > band.humidityMax) flags.push("humidity_high");
  }
  if (check.behaviour && check.behaviour !== "comfortable") flags.push("behaviour");
  if (check.feedAvailable === false) flags.push("no_feed");
  if (check.waterAvailable === false) flags.push("no_water");
  return { band, flags };
}

/** Bands must not overlap and must run from a lower to a higher day. */
export function assertBands(bands: BroodingBand[]): void {
  const sorted = [...bands].sort((a, b) => a.fromDay - b.fromDay);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (b.toDay < b.fromDay) throw new DomainError("VALIDATION_FAILED", `Band from day ${b.fromDay} ends before it starts`);
    if (b.tempMinC !== undefined && b.tempMaxC !== undefined && b.tempMinC > b.tempMaxC) throw new DomainError("VALIDATION_FAILED", `Band from day ${b.fromDay}: minimum temperature above maximum`);
    if (i > 0 && b.fromDay <= sorted[i - 1]!.toDay) throw new DomainError("VALIDATION_FAILED", `Bands overlap at day ${b.fromDay}`);
  }
}
