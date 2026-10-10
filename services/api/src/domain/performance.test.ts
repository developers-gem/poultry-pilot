import { describe, expect, it } from "vitest";
import { daysBetween } from "./dates.js";
import {
  averageDailyGainG,
  epef,
  feedConversionRatio,
  livabilityPercent,
  weighSessionStats,
} from "./performance.js";

describe("weighSessionStats", () => {
  it("computes CV and ±10% uniformity", () => {
    const s = weighSessionStats([1800, 1900, 2000, 2100, 2200])!;
    expect(s.meanG).toBe(2000);
    expect(s.minG).toBe(1800);
    expect(s.cvPercent).toBeCloseTo(7.906, 2);
    expect(s.uniformityPercent).toBe(100);
    expect(weighSessionStats([1000, 2000])!.uniformityPercent).toBe(0);
    expect(weighSessionStats([])).toBeNull();
  });
});

describe("averageDailyGainG (B30: per flock only)", () => {
  it("needs two distinct dates", () => {
    expect(averageDailyGainG([{ date: "2026-10-01", meanG: 1500 }], daysBetween)).toBeNull();
    expect(
      averageDailyGainG(
        [
          { date: "2026-10-08", meanG: 2100 },
          { date: "2026-10-01", meanG: 1500 },
        ],
        daysBetween,
      ),
    ).toBeCloseTo(85.714, 2);
  });
});

describe("feedConversionRatio (B17)", () => {
  const before = { feedKg: 3400, birdsAlive: 1000, currentAvgWeightG: 2000, soldLiveWeightKg: 0, includeMortalityWeight: false };
  it("matches the simple ratio before any sale", () => {
    expect(feedConversionRatio(before)).toBeCloseTo(1.7, 6);
  });
  it("does not jump after a partial sale — sold weight still counts", () => {
    const after = { ...before, birdsAlive: 600, soldLiveWeightKg: 800 };
    expect(feedConversionRatio(after)).toBeCloseTo(1.7, 6);
  });
  it("optionally includes dead weight and subtracts placed chick weight", () => {
    expect(feedConversionRatio({ ...before, deadWeightKg: 50, includeMortalityWeight: true })).toBeCloseTo(3400 / 2050, 6);
    expect(feedConversionRatio({ ...before, placedLiveWeightKg: 40 })).toBeCloseTo(3400 / 1960, 6);
  });
  it("returns null instead of 0 when it cannot be computed", () => {
    expect(feedConversionRatio({ ...before, feedKg: 0 })).toBeNull();
    expect(feedConversionRatio({ ...before, currentAvgWeightG: null })).toBeNull();
  });
});

describe("livability and EPEF", () => {
  it("does not count sold birds as losses", () => {
    expect(livabilityPercent(1000, 30, 10)).toBe(96);
    expect(livabilityPercent(0, 0, 0)).toBeNull();
  });
  it("computes EPEF", () => {
    expect(epef(96, 2.5, 42, 1.7)).toBeCloseTo(336.13, 1);
  });
});
