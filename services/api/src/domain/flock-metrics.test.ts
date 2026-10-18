import { describe, expect, it } from "vitest";
import { computeFlockMetrics, weightCurve, type FeedEntry } from "./flock-metrics.js";
import type { LedgerEvent } from "./flock.js";

/**
 * One broiler flock, with every expected value worked out by hand in the comments.
 * Money in minor units (paise): ₹1 = 100.
 */
const events: LedgerEvent[] = [
  { id: "p", type: "placement", date: "2026-09-01", birds: 1000, deadOnArrival: 10, costMinor: 4_000_000 }, // ₹40,000 for chicks
  { id: "m1", type: "mortality", date: "2026-09-05", birds: 15 },
  { id: "w1", type: "weighing", date: "2026-09-15", averageWeightG: 500, sampleSize: 50 },
  { id: "m2", type: "mortality", date: "2026-09-20", birds: 10 },
  { id: "c1", type: "cull", date: "2026-09-25", birds: 5 },
  { id: "w2", type: "weighing", date: "2026-09-29", averageWeightG: 1500, sampleSize: 50 },
  { id: "w3", type: "weighing", date: "2026-10-06", averageWeightG: 2000, sampleSize: 50 },
  { id: "s1", type: "sale", date: "2026-10-08", birds: 400, totalLiveWeightKg: 880, totalMinor: 9_680_000 }, // 880 kg × ₹110
];
const feed: FeedEntry[] = [
  { date: "2026-09-10", quantityKg: 500, costMinor: 1_500_000 }, // ₹30/kg
  { date: "2026-09-25", quantityKg: 1500, costMinor: 4_800_000 }, // ₹32/kg
  { date: "2026-10-05", quantityKg: 1400 }, // not costed
];
const input = { placementDate: "2026-09-01", ageDaysAtPlacement: 0, startingWeightG: 40, events, feed, asOf: "2026-10-10", includeMortalityWeight: false };
const m = computeFlockMetrics(input);

describe("bird counts and rates", () => {
  it("currentBirdCount = 990 placed − 25 dead − 5 culled − 400 sold = 560", () => {
    expect(m).toMatchObject({ placed: 990, birdsIn: 990, currentBirdCount: 560, mortalityCount: 25, cullCount: 5, sold: 400, ageDays: 39 });
  });
  it("mortalityRate = 25 / 990; survivalRate = (990 − 30) / 990; cullRate = 5 / 990", () => {
    expect(m.mortalityRate).toBeCloseTo(2.525252, 5);
    expect(m.survivalRate).toBeCloseTo(96.969697, 5);
    expect(m.cullRate).toBeCloseTo(0.505051, 5);
  });
  it("rates are null, not 0, before any birds arrive", () => {
    const empty = computeFlockMetrics({ ...input, events: [], feed: [] });
    expect(empty).toMatchObject({ currentBirdCount: 0, mortalityRate: null, survivalRate: null, costPerBirdMinor: null, fcr: null, averageWeightG: null });
  });
});

describe("weights", () => {
  it("averageWeight is the latest weighing; liveWeight = 560 × 2.0 kg = 1120 kg", () => {
    expect(m.averageWeightG).toBe(2000);
    expect(m.latestWeighingDate).toBe("2026-10-06");
    expect(m.liveWeightKg).toBe(1120);
  });
  it("dailyWeightGain = (2000 − 40 g) / 35 days = 56 g; recent = (2000 − 1500) / 7 = 71.43 g", () => {
    expect(m.dailyWeightGainG).toBeCloseTo(56, 6);
    expect(m.recentDailyWeightGainG).toBeCloseTo(71.428571, 5);
  });
  it("without a placement weight, gain runs from the first weighing", () => {
    const noStart = computeFlockMetrics({ ...input, startingWeightG: undefined });
    expect(noStart.dailyWeightGainG).toBeCloseTo((2000 - 500) / 21, 6);
  });
  it("the growth curve interpolates between weighings and never extrapolates", () => {
    const c = weightCurve(40, "2026-09-01", events);
    expect(c.at("2026-09-05")).toBeCloseTo(40 + (460 * 4) / 14, 6);
    expect(c.at("2026-08-01")).toBe(40);
    expect(c.at("2026-12-01")).toBe(2000);
    expect(weightCurve(undefined, undefined, []).at("2026-09-01")).toBeNull();
  });
  it("liveWeight is null while birds are alive but never weighed", () => {
    const unweighed = computeFlockMetrics({ ...input, events: events.filter((e) => e.type !== "weighing") });
    expect(unweighed.liveWeightKg).toBeNull();
    expect(unweighed.fcr).toBeNull();
  });
});

describe("feed and FCR", () => {
  it("feedConsumed = 3400 kg; 1400 kg uncosted; feed per bird = 3400 / 990", () => {
    expect(m.feedConsumedKg).toBe(3400);
    expect(m.uncostedFeedKg).toBe(1400);
    expect(m.feedPerBirdKg).toBeCloseTo(3.434343, 5);
    expect(m.costsComplete).toBe(false);
  });
  it("FCR (liveweight basis) = 3400 / (1120 live + 880 sold) = 1.70; feed per kg gain = 3400 / (2000 − 39.6 placed) = 1.734", () => {
    expect(m.weightInKg).toBeCloseTo(39.6, 6);
    expect(m.weightOutKg).toBe(880);
    expect(m.weightProducedKg).toBeCloseTo(1960.4, 6);
    // Measured on the last weigh-in (10-06: 960 birds × 2.0 kg = 1920 kg, all 3400 kg eaten by then). The sale on
    // 10-08 came after it, so it does not enter: mixing the sold birds' newer weight with the others' older one was
    // the old, inconsistent basis.
    expect(m.fcrAsOf).toBe("2026-10-06");
    expect(m.fcr).toBeCloseTo(3400 / 1920, 6);
    expect(m.feedPerKgGainKg).toBeCloseTo(3400 / (1920 - 39.6), 5);
  });
  it("with the mortality-weight setting, dead birds add their estimated weight (2.571 + 8.571 kg)", () => {
    const withDead = computeFlockMetrics({ ...input, includeMortalityWeight: true });
    // 15 birds × 171.43 g on 09-05 (between 40 g and 500 g) + 10 birds × 857.14 g on 09-20 (between 500 g and 1500 g)
    expect(withDead.weightOutKg).toBeCloseTo(880 + 2.571429 + 8.571429, 5);
    expect(withDead.fcr).toBeCloseTo(3400 / (1920 + 2.571429 + 8.571429), 5);
    expect(withDead.feedPerKgGainKg).toBeCloseTo(3400 / (1920 + 2.571429 + 8.571429 - 39.6), 5);
  });
  it("selling birds does not make FCR jump (prototype bug B17)", () => {
    const beforeSale = computeFlockMetrics({ ...input, events: events.filter((e) => e.type !== "sale"), asOf: "2026-10-07" });
    // 960 birds × 2.0 kg = 1920 kg at the last weigh-in; a sale after it does not change an FCR measured then.
    expect(beforeSale.fcr).toBeCloseTo(3400 / 1920, 6);
    expect(m.fcr).toBeCloseTo(beforeSale.fcr!, 6);
  });
});

describe("feed cost and wastage", () => {
  it("feed cost per bird = ₹63,000 / 990 birds; wastage costs money but is not in FCR", () => {
    expect(m.feedCostMinor).toBe(6_300_000);
    expect(m.feedCostPerBirdMinor).toBe(6364); // 6,300,000 / 990 = 6363.6 → 6364 paise
    const wasted = computeFlockMetrics({ ...input, feed: [...feed, { date: "2026-10-06", quantityKg: 50, costMinor: 160_000, kind: "wastage" }] });
    expect(wasted.feedWastedKg).toBe(50);
    expect(wasted.feedConsumedKg).toBe(3400);
    expect(wasted.fcr).toBe(m.fcr);
    expect(wasted.feedCostMinor).toBe(6_460_000);
  });
  it("feed cost per egg = feed cost ÷ eggs collected; null without eggs", () => {
    expect(m.feedCostPerEggMinor).toBeNull();
    const layer = computeFlockMetrics({ ...input, eggsCollected: 25_000 });
    expect(layer.feedCostPerEggMinor).toBeCloseTo(252, 6); // 6,300,000 / 25,000 = 252 paise (₹2.52)
  });
});

describe("money", () => {
  it("revenue = ₹96,800; cost = ₹40,000 chicks + ₹63,000 feed = ₹1,03,000", () => {
    expect(m.revenueMinor).toBe(9_680_000);
    expect(m.cost).toEqual({ chickMinor: 4_000_000, transferredInMinor: 0, transferredOutMinor: 0, feedMinor: 6_300_000, otherMinor: 0, totalMinor: 10_300_000 });
  });
  it("profit = −₹6,200; margin = −6,200 / 96,800 = −6.405%", () => {
    expect(m.profitMinor).toBe(-620_000);
    expect(m.marginPercent).toBeCloseTo(-6.404959, 5);
  });
  it("costPerBird = 10,300,000 / 990 = 10,404 paise; per kg produced = 10,300,000 / 1960.4 = 5,254", () => {
    expect(m.costPerBirdMinor).toBe(10_404);
    expect(m.costPerKgProducedMinor).toBe(5254);
  });
  it("projection at ₹105/kg: stock 1120 kg × ₹105 = ₹1,17,600; projected profit ₹1,11,400; margin 51.96%", () => {
    const p = computeFlockMetrics({ ...input, referencePricePerKgMinor: 10_500 });
    expect(p.liveInventoryValueMinor).toBe(11_760_000);
    expect(p.projectedProfitMinor).toBe(11_140_000);
    expect(p.projectedMarginPercent).toBeCloseTo((11_140_000 / 21_440_000) * 100, 6);
    expect(m.liveInventoryValueMinor).toBeNull();
    expect(m.projectedProfitMinor).toBeNull();
  });
  it("margin is null before the first sale", () => {
    expect(computeFlockMetrics({ ...input, asOf: "2026-10-07" }).marginPercent).toBeNull();
  });
  it("other flock income and costs from the ledger are included", () => {
    const o = computeFlockMetrics({ ...input, otherCostMinor: 200_000, otherIncomeMinor: 50_000 });
    expect(o.revenueMinor).toBe(9_730_000);
    expect(o.cost.totalMinor).toBe(10_500_000);
  });
});

describe("transfers, splits and merges", () => {
  it("cost and weight move with birds; birds received from elsewhere count in rates", () => {
    const flockB: LedgerEvent[] = [
      { id: "in", type: "split_in", date: "2026-09-15", birds: 200, costMinor: 804_000, totalLiveWeightKg: 100 },
      { id: "w", type: "weighing", date: "2026-10-01", averageWeightG: 1800 },
      { id: "d", type: "mortality", date: "2026-09-20", birds: 4 },
    ];
    const b = computeFlockMetrics({ events: flockB, feed: [{ date: "2026-09-20", quantityKg: 450, costMinor: 1_350_000 }], asOf: "2026-10-01", includeMortalityWeight: false });
    expect(b).toMatchObject({ birdsIn: 200, transferredIn: 200, currentBirdCount: 196 });
    expect(b.mortalityRate).toBe(2);
    expect(b.cost.totalMinor).toBe(804_000 + 1_350_000);
    // 196 × 1.8 = 352.8 kg live − 100 kg arrived = 252.8 kg produced
    expect(b.weightProducedKg).toBeCloseTo(252.8, 6);
    expect(b.fcr).toBeCloseTo(450 / 352.8, 6);
    expect(b.feedPerKgGainKg).toBeCloseTo(450 / 252.8, 6);

    const flockA: LedgerEvent[] = [...events.slice(0, 3), { id: "out", type: "split_out", date: "2026-09-15", birds: 200, costMinor: 804_000, totalLiveWeightKg: 100 }];
    const a = computeFlockMetrics({ ...input, events: flockA, asOf: "2026-09-16", feed: [] });
    expect(a.cost.totalMinor).toBe(4_000_000 - 804_000);
    expect(a.transferredOut).toBe(200);
    expect(a.currentBirdCount).toBe(990 - 15 - 200);
  });
});
