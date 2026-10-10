import type { Species } from "@poultrypilot/types";
import { addDays, daysBetween } from "./dates.js";

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
  const pct = (a: number | undefined, d: number | undefined) =>
    a === undefined || d === undefined || d <= 0 ? null : (a / d) * 100;
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
