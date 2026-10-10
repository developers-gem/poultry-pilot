import { describe, expect, it } from "vitest";
import { averageDailyUseKg, daysOfCover, runFeedLedger, type FeedMovement } from "./feed.js";
import { batchEconomics, summarizeLedger, type LedgerEntry } from "./ledger.js";
import { dueDates, expectedToDateMinor, monthlyRunRateMinor } from "./recurring.js";

describe("feed ledger", () => {
  const moves: FeedMovement[] = [
    { type: "receipt", date: "2026-10-01", seq: 1, kg: 1000, costMinor: 3_000_000 }, // ₹30/kg
    { type: "issue", date: "2026-10-02", seq: 2, kg: 400, flockId: "a" },
    { type: "receipt", date: "2026-10-03", seq: 3, kg: 600, costMinor: 2_160_000 }, // ₹36/kg
    { type: "issue", date: "2026-10-04", seq: 4, kg: 500, flockId: "b" },
  ];
  it("costs issues at moving average", () => {
    const r = runFeedLedger(moves);
    expect(r.issueCosts[0]).toMatchObject({ flockId: "a", costMinor: 1_200_000 });
    // after second receipt: 600 kg @30 + 600 kg @36 = avg 33/kg
    expect(r.issueCosts[1]).toMatchObject({ flockId: "b", costMinor: 1_650_000 });
    expect(r.balanceKg).toBe(700);
    expect(r.valueMinor).toBe(2_310_000);
  });
  it("refuses to issue more than is in stock", () => {
    expect(() => runFeedLedger([...moves, { type: "issue", date: "2026-10-05", seq: 5, kg: 701, flockId: "a" }])).toThrow(
      expect.objectContaining({ code: "INSUFFICIENT_STOCK" }),
    );
  });
});

describe("days of cover (B6)", () => {
  it("reports 'out' at zero stock instead of OK", () => {
    expect(daysOfCover(0, 50)).toEqual({ days: 0, status: "out" });
    expect(daysOfCover(200, 50)).toEqual({ days: 4, status: "low" });
    expect(daysOfCover(1000, 50)).toEqual({ days: 20, status: "ok" });
    expect(daysOfCover(1000, null)).toEqual({ days: null, status: "unknown" });
  });
  it("averages over recorded days only", () => {
    const window = ["2026-10-01", "2026-10-02", "2026-10-03"];
    expect(averageDailyUseKg([{ date: "2026-10-01", kg: 60 }, { date: "2026-10-03", kg: 40 }], window)).toBe(50);
    expect(averageDailyUseKg([], window)).toBeNull();
  });
});

describe("recurring bills (B16)", () => {
  const bill = { amountMinor: 500_000, frequency: "monthly" as const, startDate: "2026-01-31" };
  it("keeps the month-end anchor", () => {
    expect(dueDates(bill, "2026-01-01", "2026-05-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });
  it("does not accrue while paused and stops at end date", () => {
    const paused = { ...bill, pauses: [{ from: "2026-03-01", to: "2026-04-30" }] };
    expect(expectedToDateMinor(paused, "2026-05-31")).toBe(3 * 500_000);
    expect(expectedToDateMinor({ ...bill, endDate: "2026-02-28" }, "2026-12-31")).toBe(2 * 500_000);
    expect(monthlyRunRateMinor({ ...bill, pauses: [{ from: "2026-06-01" }] }, "2026-06-15")).toBe(0);
    expect(monthlyRunRateMinor({ ...bill, frequency: "weekly", amountMinor: 120_000 }, "2026-06-15")).toBe(520_000);
  });
});

describe("one profit definition (B19)", () => {
  const ledger: LedgerEntry[] = [
    { date: "2026-09-01", direction: "expense", category: "stock_purchase", amountMinor: 4_000_000, currency: "INR", flockId: "f1" },
    { date: "2026-09-01", direction: "expense", category: "feed", amountMinor: 9_000_000, currency: "INR" },
    { date: "2026-09-20", direction: "expense", category: "feed", amountMinor: 100_000, currency: "INR", flockId: "f1" },
    { date: "2026-09-25", direction: "expense", category: "medicine_vaccine", amountMinor: 300_000, currency: "INR", flockId: "f1" },
    { date: "2026-09-30", direction: "expense", category: "electricity", amountMinor: 500_000, currency: "INR" },
    { date: "2026-10-12", direction: "income", category: "bird_sales", amountMinor: 18_000_000, currency: "INR", flockId: "f1" },
  ];
  it("farm profit is ledger income minus expense in the period", () => {
    const s = summarizeLedger(ledger, { from: "2026-09-01", to: "2026-10-31", currency: "INR" });
    expect(s.incomeMinor).toBe(18_000_000);
    expect(s.expenseMinor).toBe(13_900_000);
    expect(s.netMinor).toBe(4_100_000);
  });
  it("batch economics costs feed from issues and never double-counts flock-tagged feed", () => {
    const b = batchEconomics({
      flockId: "f1",
      currency: "INR",
      ledger,
      feedIssuedCostMinor: 8_500_000,
      birdsAlive: 0,
      currentAvgWeightG: null,
      referencePricePerKgMinor: null,
      closed: true,
      birdsPlaced: 1000,
    });
    expect(b.totalCostMinor).toBe(4_000_000 + 8_500_000 + 300_000);
    expect(b.marginMinor).toBe(18_000_000 - 12_800_000);
    expect(b.costPerBirdPlacedMinor).toBe(12_800);
  });
  it("projected value is null, not 0, for an open flock without a price", () => {
    const b = batchEconomics({
      flockId: "f1",
      currency: "INR",
      ledger: [],
      feedIssuedCostMinor: 0,
      birdsAlive: 900,
      currentAvgWeightG: 1800,
      referencePricePerKgMinor: null,
      closed: false,
      birdsPlaced: 1000,
    });
    expect(b.projectedValueMinor).toBeNull();
    expect(b.marginMinor).toBeNull();
  });
});
