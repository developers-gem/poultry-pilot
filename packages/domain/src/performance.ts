/**
 * Flock performance metrics. Each returns null when the inputs cannot support a value,
 * instead of the prototype's habit of showing 0 (which reads as a real measurement).
 */

export interface WeighStats {
  count: number;
  meanG: number;
  minG: number;
  maxG: number;
  sdG: number;
  cvPercent: number;
  /** Share of birds within ±10% of the mean — the usual flock uniformity measure. */
  uniformityPercent: number;
}

export function weighSessionStats(weightsG: number[]): WeighStats | null {
  const n = weightsG.length;
  if (n === 0) return null;
  const mean = weightsG.reduce((t, w) => t + w, 0) / n;
  const variance = n > 1 ? weightsG.reduce((t, w) => t + (w - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const within = weightsG.filter((w) => Math.abs(w - mean) <= mean * 0.1).length;
  return {
    count: n,
    meanG: mean,
    minG: Math.min(...weightsG),
    maxG: Math.max(...weightsG),
    sdG: sd,
    cvPercent: mean > 0 ? (sd / mean) * 100 : 0,
    uniformityPercent: (within / n) * 100,
  };
}

/** Average daily gain between the first and last session of ONE flock. */
export function averageDailyGainG(
  sessions: { date: string; meanG: number }[],
  daysBetweenFn: (a: string, b: string) => number,
): number | null {
  if (sessions.length < 2) return null;
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const days = daysBetweenFn(first.date, last.date);
  if (days <= 0) return null;
  return (last.meanG - first.meanG) / days;
}

export interface FcrInput {
  feedKg: number;
  birdsAlive: number;
  currentAvgWeightG: number | null;
  soldLiveWeightKg: number;
  /** Total recorded weight of dead birds; only used when includeMortalityWeight is true. */
  deadWeightKg?: number;
  /** Live weight of birds at placement (e.g. chicks ~40 g each); subtracted so FCR measures gain. */
  placedLiveWeightKg?: number;
  includeMortalityWeight: boolean;
}

/**
 * Cumulative feed conversion ratio.
 * Fixes audit B17: the prototype divided by the weight of birds still alive only, so FCR
 * jumped after every partial sale. Weight that left the flock (sold, optionally dead) counts.
 */
export function feedConversionRatio(i: FcrInput): number | null {
  if (i.feedKg <= 0) return null;
  const aliveKg = i.currentAvgWeightG && i.birdsAlive > 0 ? (i.currentAvgWeightG / 1000) * i.birdsAlive : 0;
  const deadKg = i.includeMortalityWeight ? (i.deadWeightKg ?? 0) : 0;
  const produced = aliveKg + i.soldLiveWeightKg + deadKg - (i.placedLiveWeightKg ?? 0);
  if (produced <= 0) return null;
  return i.feedKg / produced;
}

/** Livability: share of placed birds not lost to death or culling. Sold birds are not losses. */
export function livabilityPercent(placed: number, mortality: number, culled: number): number | null {
  if (placed <= 0) return null;
  return ((placed - mortality - culled) / placed) * 100;
}

/** Mortality as % of birds placed, for the period the counts cover. */
export function mortalityPercent(placed: number, deaths: number): number | null {
  if (placed <= 0) return null;
  return (deaths / placed) * 100;
}

/**
 * European Production Efficiency Factor for broilers:
 * (livability % × average weight kg) / (age days × FCR) × 100.
 */
export function epef(livabilityPct: number, avgWeightKg: number, ageDays: number, fcr: number): number | null {
  if (ageDays <= 0 || fcr <= 0) return null;
  return ((livabilityPct * avgWeightKg) / (ageDays * fcr)) * 100;
}
