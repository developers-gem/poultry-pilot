import { DomainError } from "./errors.js";

/**
 * Feed inventory ledger per feed item with moving-average cost.
 * Replaces the prototype's single farm-wide pool and lifetime-average price.
 */
export type FeedMovement =
  | { type: "receipt"; date: string; seq: number; kg: number; costMinor: number }
  | { type: "issue"; date: string; seq: number; kg: number; flockId: string }
  | { type: "adjustment"; date: string; seq: number; kgDelta: number; reason: string };

export interface FeedLedgerResult {
  balanceKg: number;
  valueMinor: number;
  avgCostMinorPerKg: number | null;
  issueCosts: { seq: number; flockId: string; kg: number; costMinor: number }[];
}

const EPS = 1e-9;

export function runFeedLedger(movements: FeedMovement[]): FeedLedgerResult {
  const sorted = [...movements].sort((a, b) => (a.date === b.date ? a.seq - b.seq : a.date < b.date ? -1 : 1));
  let balanceKg = 0;
  let valueMinor = 0;
  const issueCosts: FeedLedgerResult["issueCosts"] = [];

  for (const m of sorted) {
    if (m.type === "receipt") {
      balanceKg += m.kg;
      valueMinor += m.costMinor;
    } else if (m.type === "issue") {
      if (m.kg > balanceKg + EPS) {
        throw new DomainError(
          "INSUFFICIENT_STOCK",
          `Issuing ${m.kg} kg on ${m.date} exceeds the ${round(balanceKg)} kg in stock`,
          { date: m.date, requestedKg: m.kg, availableKg: balanceKg },
        );
      }
      const avg = balanceKg > EPS ? valueMinor / balanceKg : 0;
      const cost = Math.round(avg * m.kg);
      balanceKg -= m.kg;
      valueMinor = balanceKg <= EPS ? 0 : valueMinor - cost;
      if (balanceKg <= EPS) balanceKg = 0;
      issueCosts.push({ seq: m.seq, flockId: m.flockId, kg: m.kg, costMinor: cost });
    } else {
      const avg = balanceKg > EPS ? valueMinor / balanceKg : 0;
      if (balanceKg + m.kgDelta < -EPS) {
        throw new DomainError("INSUFFICIENT_STOCK", "Adjustment would make stock negative", { date: m.date });
      }
      balanceKg += m.kgDelta;
      valueMinor = balanceKg <= EPS ? 0 : Math.max(0, valueMinor + Math.round(avg * m.kgDelta));
      if (balanceKg <= EPS) balanceKg = 0;
    }
  }
  return {
    balanceKg,
    valueMinor,
    avgCostMinorPerKg: balanceKg > EPS ? valueMinor / balanceKg : null,
    issueCosts,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Average daily use over the `windowDays` complete days ending the day before `today`,
 * averaged over days that actually have issue records (a missing record is not "zero feed").
 */
export function averageDailyUseKg(
  issues: { date: string; kg: number }[],
  windowDates: string[],
): number | null {
  const set = new Set(windowDates);
  const byDay = new Map<string, number>();
  for (const i of issues) if (set.has(i.date)) byDay.set(i.date, (byDay.get(i.date) ?? 0) + i.kg);
  if (byDay.size === 0) return null;
  return [...byDay.values()].reduce((t, v) => t + v, 0) / byDay.size;
}

export type CoverStatus = "out" | "low" | "ok" | "unknown";

/**
 * Days of feed cover. Fixes audit B6: the prototype treated 0 days as falsy and showed "OK"
 * when a farm had run out of feed.
 */
export function daysOfCover(
  balanceKg: number,
  avgDailyUseKg: number | null,
  lowThresholdDays = 7,
): { days: number | null; status: CoverStatus } {
  if (balanceKg <= 0) return { days: 0, status: "out" };
  if (!avgDailyUseKg || avgDailyUseKg <= 0) return { days: null, status: "unknown" };
  const days = Math.floor(balanceKg / avgDailyUseKg);
  return { days, status: days < lowThresholdDays ? "low" : "ok" };
}
