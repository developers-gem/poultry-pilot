import { describe, expect, it } from "vitest";
import { assertEggsAvailable, breakagePercent, eggStock, henDayPercent } from "./eggs.js";
import { batchRates, expectedHatchDate, overallHatchOfSet } from "./hatchery.js";

describe("eggs", () => {
  it("hen-day and breakage return null on empty denominators", () => {
    expect(henDayPercent(870, 1000)).toBe(87);
    expect(henDayPercent(10, 0)).toBeNull();
    expect(breakagePercent(12, 600)).toBe(2);
  });
  it("stock includes market sales", () => {
    const moves = [
      { type: "collected" as const, date: "2026-10-01", eggs: 900 },
      { type: "broken" as const, date: "2026-10-01", eggs: 10 },
      { type: "sold" as const, date: "2026-10-02", eggs: 600 },
    ];
    expect(eggStock(moves)).toBe(290);
    expect(() => assertEggsAvailable(moves, 300)).toThrow(expect.objectContaining({ code: "INSUFFICIENT_STOCK" }));
  });
});

describe("hatchery", () => {
  it("is species-aware", () => {
    expect(expectedHatchDate("2026-10-01", "chicken")).toBe("2026-10-22");
    expect(expectedHatchDate("2026-10-01", "duck")).toBe("2026-10-29");
    expect(expectedHatchDate("2026-10-01", "quail", 18)).toBe("2026-10-19");
  });
  it("separates fertility, hatch of set and hatch of fertile", () => {
    expect(batchRates({ eggsSet: 1000, fertile: 900, hatched: 810 })).toEqual({
      fertilityPercent: 90,
      hatchOfSetPercent: 81,
      hatchOfFertilePercent: 90,
    });
  });
  it("excludes batches still incubating (B27)", () => {
    expect(overallHatchOfSet([{ eggsSet: 1000, hatched: 850 }, { eggsSet: 1000 }])).toBe(85);
    expect(overallHatchOfSet([{ eggsSet: 1000 }])).toBeNull();
  });
});
