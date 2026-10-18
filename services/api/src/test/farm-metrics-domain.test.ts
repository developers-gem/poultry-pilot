import { describe, expect, it } from "vitest";
import { addDays } from "../domain/dates.js";
import { computeFlockMetrics, type FeedEntry } from "../domain/flock-metrics.js";
import type { LedgerEvent } from "../domain/flock.js";

/**
 * Farm figures as a poultry manager calculates them, with realistic numbers (Cobb/Ross-like broilers, ISA layers).
 * These are domain checks: each expectation is a number a farmer would recognise.
 */
const START = "2026-09-01";
const day = (n: number) => addDays(START, n);
const ev = (id: string, e: Omit<LedgerEvent, "id">): LedgerEvent => ({ id, ...e }) as LedgerEvent;
/** Feed spread evenly over days 1..n so the cumulative total on day n is `totalKg`. */
const feedUpTo = (n: number, totalKg: number): FeedEntry[] => Array.from({ length: n }, (_, k) => ({ date: day(k + 1), quantityKg: totalKg / n }));

describe("broiler FCR is measured on the weigh-in date", () => {
  const placement = ev("p", { type: "placement", date: START, birds: 1000, costMinor: 4_000_000 });
  const weighing21 = ev("w21", { type: "weighing", date: day(21), averageWeightG: 900, sampleSize: 50 });

  it("feed recorded after the last weigh-in does not inflate FCR (the manager's day-28 view)", () => {
    // 1,150 kg eaten by day 21 (1.15 kg/bird), weighed at 900 g; feed recorded on to day 28 (2,000 kg in all).
    const feed = [...feedUpTo(21, 1150), ...Array.from({ length: 7 }, (_, k) => ({ date: day(22 + k), quantityKg: 850 / 7 }))];
    const m = computeFlockMetrics({ placementDate: START, startingWeightG: 42, events: [placement, weighing21], feed, asOf: day(28), includeMortalityWeight: false });
    expect(m.fcrAsOf).toBe(day(21));
    expect(m.fcr).toBeCloseTo(1150 / 900, 2); // 1.28, not 2000 / 900 = 2.22
    expect(m.feedConsumedKg).toBeCloseTo(2000, 6); // the feed total itself is still to date
  });

  it("a finished batch: FCR, EPEF and cost per bird from the sale weights", () => {
    const events = [
      placement,
      ev("m", { type: "mortality", date: day(10), birds: 30 }),
      ev("w35", { type: "weighing", date: day(35), averageWeightG: 2200, sampleSize: 50 }),
      ev("s", { type: "sale", date: day(35), birds: 970, totalLiveWeightKg: 2134, totalMinor: 23_474_000 }),
    ];
    const m = computeFlockMetrics({ placementDate: START, startingWeightG: 42, events, feed: feedUpTo(35, 3400), asOf: day(36), includeMortalityWeight: false });
    expect(m.fcr).toBeCloseTo(3400 / 2134, 3); // 1.593
    expect(m.survivalRate).toBe(97);
    // EPEF = 97 × 2.2 / (35 × 1.593) × 100 ≈ 383 (good commercial result)
    expect(m.epef).toBeGreaterThan(375);
    expect(m.epef).toBeLessThan(390);
    // Cost per bird: per bird placed vs per bird actually produced (sold).
    expect(m.costPerBirdProducedMinor! > m.costPerBirdMinor!).toBe(true);
  });
});

describe("layer figures", () => {
  it("eggs per hen housed and feed per dozen eggs", () => {
    const events = [ev("p", { type: "placement", date: START, birds: 1000 })];
    const m = computeFlockMetrics({ placementDate: START, ageDaysAtPlacement: 126, events, feed: feedUpTo(30, 3300), asOf: day(30), includeMortalityWeight: false, eggsCollected: 26_400 });
    expect(m.ageDays).toBe(156); // 18 weeks at placement + 30 days, not "day 30"
    expect(m.eggsPerHenHoused).toBeCloseTo(26.4, 6);
    expect(m.feedPerDozenEggsKg).toBeCloseTo(3300 / 2200, 6); // 1.5 kg per dozen
  });
});
