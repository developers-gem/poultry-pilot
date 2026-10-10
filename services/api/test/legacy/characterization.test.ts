import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  daysOfCover,
  expectedToDateMinor,
  feedConversionRatio,
  localDateOf,
  overallHatchOfSet,
  population,
  type FlockEvent,
} from "../../src/domain/index.js";
import * as legacy from "./legacy.js";
import * as fx from "./fixtures/broiler-farm.js";

/**
 * Pins the prototype's current outputs. When a domain function intentionally differs,
 * the test states both numbers and the audit bug ID. Changing an expectation here
 * requires a reviewed reason.
 */

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(fx.NOW));
});
afterAll(() => vi.useRealTimers());

describe("batchLifecycle — current behaviour of Batch 14", () => {
  const life = () => legacy.batchLifecycle(fx.flocks[0], { logs: fx.logs, weights: fx.weights, tx: fx.tx, feedPricePerKg: 30 });

  it("matches the prototype output", () => {
    const l = life();
    expect(l).toMatchObject({
      ageDays: 35,
      stage: "Grow-out",
      placed: 1000,
      deaths: 25,
      sold: 400,
      alive: 575,
      survival: 97.5,
      avgWeightG: 2400,
      dailyGainG: 58.333333333333336,
      feedKg: 3400,
      liveWeightKg: 1380,
    });
    expect(l.fcr).toBeCloseTo(2.4638, 4);
    expect(l.revenue).toBe(101200);
    expect(l.projected).toBe(253000);
    expect(l.costs).toBe(145000);
  });

  it("B17: FCR inflates after a partial sale; domain counts sold weight", () => {
    const l = life();
    const corrected = feedConversionRatio({
      feedKg: l.feedKg,
      birdsAlive: l.alive,
      currentAvgWeightG: l.avgWeightG,
      soldLiveWeightKg: 920,
      includeMortalityWeight: false,
    })!;
    expect(l.fcr).toBeCloseTo(2.46, 2); // prototype
    expect(corrected).toBeCloseTo(1.478, 3); // 3400 / (1380 + 920)
  });
});

describe("B18: dashboard bird count", () => {
  it("subtracts closed flocks' deaths and ignores sales", () => {
    expect(legacy.dashboardBirds(fx.flocks, fx.logs)).toBe(945); // prototype
    const events: FlockEvent[] = [
      { type: "placement", date: "2026-09-01", birdsReceived: 1000, deadOnArrival: 0 },
      { type: "mortality", date: "2026-09-02", count: 12 },
      { type: "mortality", date: "2026-09-20", count: 8 },
      { type: "mortality", date: "2026-10-01", count: 5 },
      { type: "sale", date: "2026-10-03", birds: 400, totalLiveWeightKg: 920 },
    ];
    expect(population(events).alive).toBe(575); // corrected
  });
});

describe("B19: five profit figures from the same data", () => {
  it("disagree with each other", () => {
    const dashboard = legacy.profitDefinitions.dashboard(fx);
    const money = legacy.profitDefinitions.money(fx);
    const running = legacy.profitDefinitions.runningCosts(fx);
    const lifecycle = legacy.batchLifecycle(fx.flocks[0], { logs: fx.logs, weights: fx.weights, tx: fx.tx, feedPricePerKg: 30 }).profit;
    expect({ dashboard, money, running, lifecycle }).toEqual({
      dashboard: -376000, // 5,000 − (93,000 + 90,000 + 72,000 + 126,000)
      money: -250000, // 5,000 − (93,000 + 90,000 + 72,000)
      running: -214000, // 5,000 − 93,000 − 126,000
      lifecycle: 108000, // projected 253,000 − costs 145,000 (one flock only)
    });
  });
});

describe("B6: feed badge", () => {
  it("shows OK when completely out of feed", () => {
    expect(legacy.feedBadge(0, 120)).toEqual({ feedDays: 0, badge: "OK" });
    expect(daysOfCover(0, 120).status).toBe("out");
  });
});

describe("B16: paused bill keeps accruing", () => {
  it("counts the paused attendant's salary up to today", () => {
    const { toDate, perMonth } = legacy.recurringTotals(fx.recurring);
    expect(perMonth).toBe(5000);
    expect(toDate).toBe(5000 * 9 + 9000 * 9); // Jan–Sep cycles counted for both
    const corrected = expectedToDateMinor(
      { amountMinor: 900_000, frequency: "monthly", startDate: "2026-01-01", pauses: [{ from: "2026-01-01" }] },
      "2026-10-06",
    );
    expect(corrected).toBe(0);
  });
});

describe("B4 / B5: health schedule", () => {
  it("drops overdue items and labels every future one 'in 0d'", () => {
    const out = legacy.healthUpcoming([
      { id: "overdue", next_due: "2026-10-01" },
      { id: "soon", next_due: "2026-10-16" },
    ]);
    expect(out).toEqual([{ id: "soon", label: "in 0d" }]);
  });
});

describe("B3: weather 'today' index", () => {
  it("points at yesterday for 7 past + 7 forecast days", () => {
    expect(legacy.weatherTodayIndex(14)).toBe(6); // correct index is 7
  });
});

describe("B2: weather accumulation through num()", () => {
  it("turns 1,250 eggs into NaN", () => {
    expect(legacy.weatherAccumulate([1250])).toBeNaN();
  });
});

describe("B20: calendar 'next 30 days'", () => {
  it("includes events months away", () => {
    expect(legacy.calendarNext30(["2026-10-10", "2027-03-01"])).toHaveLength(2);
  });
});

describe("B27: hatch rate includes batches still incubating", () => {
  it("halves the rate during incubation", () => {
    const batches = [
      { eggs_set: 1000, chicks_hatched: 850, status: "hatched" },
      { eggs_set: 1000, chicks_hatched: 0, status: "incubating" },
    ];
    expect(legacy.hatcheryRate(batches)).toBe(42.5);
    expect(overallHatchOfSet([{ eggsSet: 1000, hatched: 850 }, { eggsSet: 1000 }])).toBe(85);
  });
});

describe("B11: UTC 'today'", () => {
  it("is yesterday for an Indian farmer before 05:30", () => {
    vi.setSystemTime(new Date("2026-10-05T21:00:00Z")); // 02:30 IST on 6 Oct
    expect(legacy.today()).toBe("2026-10-05");
    expect(localDateOf(new Date(), "Asia/Kolkata")).toBe("2026-10-06");
    vi.setSystemTime(new Date(fx.NOW));
  });
});
