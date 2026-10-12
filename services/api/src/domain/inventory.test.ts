import { describe, expect, it } from "vitest";
import { addDays } from "./dates.js";
import { allocate, averageUnitCost, evaluateWater, expiryStatus, fefoOrder, stockTotals, type StockLot } from "./inventory.js";

const lots: StockLot[] = [
  { id: "a", receivedDate: "2026-09-01", expiryDate: "2026-12-01", quantityRemaining: 100, unitCostMinor: 3000 },
  { id: "b", receivedDate: "2026-09-10", expiryDate: "2026-11-01", quantityRemaining: 50, unitCostMinor: 3200 },
  { id: "c", receivedDate: "2026-08-01", quantityRemaining: 80, unitCostMinor: 2900 },
  { id: "old", receivedDate: "2026-06-01", expiryDate: "2026-09-30", quantityRemaining: 20, unitCostMinor: 2500 },
];

describe("FEFO lots", () => {
  it("orders by soonest expiry, lots without expiry last", () => {
    expect(fefoOrder(lots).map((l) => l.id)).toEqual(["old", "b", "a", "c"]);
  });

  it("uses the soonest-expiring unexpired stock first, costed at each lot's price", () => {
    const out = allocate(lots, 120, "2026-10-10", "use");
    expect(out).toEqual([
      { lotId: "b", quantity: 50, costMinor: 160_000 },
      { lotId: "a", quantity: 70, costMinor: 210_000 },
    ]);
  });

  it("never uses expired stock, and says how much is expired when short", () => {
    expect(() => allocate(lots, 231, "2026-10-10", "use")).toThrow(/Only 230 in date stock available \(20 more is expired/);
    expect(() => allocate(lots, 231, "2026-10-10", "use")).toThrow(expect.objectContaining({ code: "INSUFFICIENT_STOCK" }));
  });

  it("wastage writes off expired stock first", () => {
    expect(allocate(lots, 25, "2026-10-10", "wastage")).toEqual([
      { lotId: "old", quantity: 20, costMinor: 50_000 },
      { lotId: "b", quantity: 5, costMinor: 16_000 },
    ]);
  });

  it("handles decimal quantities without drift", () => {
    const out = allocate([{ id: "x", receivedDate: "2026-01-01", quantityRemaining: 0.3, unitCostMinor: 1000 }, { id: "y", receivedDate: "2026-01-02", quantityRemaining: 0.3, unitCostMinor: 1000 }], 0.6, "2026-01-03", "use");
    expect(out.map((a) => a.quantity)).toEqual([0.3, 0.3]);
  });

  it("totals and average cost", () => {
    expect(stockTotals(lots)).toEqual({ quantity: 250, valueMinor: 300_000 + 160_000 + 232_000 + 50_000 });
    expect(averageUnitCost(lots)).toBeCloseTo(742_000 / 250, 6);
    expect(averageUnitCost([])).toBe(0);
  });

  it("refuses zero or negative quantities", () => {
    expect(() => allocate(lots, 0, "2026-10-10", "use")).toThrow(/more than zero/);
  });
});

describe("expiry status", () => {
  it("expired, expiring within the warning window, or ok", () => {
    expect(expiryStatus("2026-10-09", "2026-10-10", 30, addDays)).toBe("expired");
    expect(expiryStatus("2026-10-10", "2026-10-10", 30, addDays)).toBe("expiring");
    expect(expiryStatus("2026-11-09", "2026-10-10", 30, addDays)).toBe("expiring");
    expect(expiryStatus("2026-11-10", "2026-10-10", 30, addDays)).toBe("ok");
    expect(expiryStatus(undefined, "2026-10-10", 30, addDays)).toBeNull();
  });
});

describe("water evaluation", () => {
  const prev = [200, 210, 190]; // average 200 L
  it("flags consumption more than 20% from the flock's recent average", () => {
    expect(evaluateWater({ litres: 150, previousDays: prev })).toMatchObject({ flags: ["consumption_low"], baselineLitres: 200, deviationPercent: -25 });
    expect(evaluateWater({ litres: 245, previousDays: prev }).flags).toEqual(["consumption_high"]);
    expect(evaluateWater({ litres: 230, previousDays: prev }).flags).toEqual([]);
  });
  it("needs a baseline before judging consumption", () => {
    expect(evaluateWater({ litres: 10, previousDays: [200, 200] })).toMatchObject({ flags: [], baselineLitres: null });
  });
  it("flags pH and dissolved solids only against limits the farm set; none are assumed", () => {
    expect(evaluateWater({ litres: 200, ph: 5.5, tdsPpm: 5000, previousDays: [] }).flags).toEqual([]);
    const rules = { deviationPercent: 20, minBaselineDays: 3, phMin: 6, phMax: 8, tdsMaxPpm: 1000 };
    expect(evaluateWater({ litres: 200, ph: 5.5, previousDays: [], rules }).flags).toEqual(["ph_low"]);
    expect(evaluateWater({ litres: 200, ph: 8.4, tdsPpm: 1500, previousDays: [], rules }).flags).toEqual(["ph_high", "tds_high"]);
  });
});
