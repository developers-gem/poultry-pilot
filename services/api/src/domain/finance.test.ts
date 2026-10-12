import { describe, expect, it } from "vitest";
import { ageBucket, applyTax, assertPaymentFits, paymentStatus } from "./finance.js";
import { assertOrderTransition, ORDER_TRANSITIONS } from "./orders.js";

describe("tax", () => {
  it("adds tax on top, or splits it out of an inclusive amount; net + tax = gross", () => {
    expect(applyTax(100_000, { ratePercent: 18, inclusive: false })).toEqual({ netMinor: 100_000, taxMinor: 18_000, grossMinor: 118_000 });
    expect(applyTax(118_000, { ratePercent: 18, inclusive: true })).toEqual({ netMinor: 100_000, taxMinor: 18_000, grossMinor: 118_000 });
    const odd = applyTax(999, { ratePercent: 5, inclusive: true });
    expect(odd.netMinor + odd.taxMinor).toBe(999);
    expect(applyTax(500, undefined)).toEqual({ netMinor: 500, taxMinor: 0, grossMinor: 500 });
    expect(() => applyTax(10.5, undefined)).toThrow(/whole minor units/);
    expect(() => applyTax(100, { ratePercent: 120, inclusive: false })).toThrow(/between 0 and 100/);
  });
});

describe("payments", () => {
  it("status follows what has been paid", () => {
    expect(paymentStatus(1000, 0)).toBe("unpaid");
    expect(paymentStatus(1000, 400)).toBe("partially_paid");
    expect(paymentStatus(1000, 1000)).toBe("paid");
  });
  it("no overpayment, no refund beyond what was paid", () => {
    expect(() => assertPaymentFits("payment", 700, 1000, 400)).toThrow(/overpay by 100 \(outstanding 600\)/);
    expect(() => assertPaymentFits("payment", 600, 1000, 400)).not.toThrow();
    expect(() => assertPaymentFits("refund", 500, 1000, 400)).toThrow(/Only 400 has been paid/);
    expect(() => assertPaymentFits("payment", 0, 1000, 0)).toThrow(/more than zero/);
  });
  it("ages by days past due", () => {
    expect(ageBucket("2026-10-10", "2026-10-10")).toEqual({ daysOverdue: 0, bucket: "current" });
    expect(ageBucket("2026-10-01", "2026-10-10")).toEqual({ daysOverdue: 9, bucket: "1_30" });
    expect(ageBucket("2026-07-01", "2026-10-10").bucket).toBe("over_90");
  });
});

describe("order state machine", () => {
  const delivery = (status: keyof typeof ORDER_TRANSITIONS, paymentStatus = "unpaid") => ({ status, fulfilment: "seller_delivery" as const, paymentStatus });
  it("follows PENDING → ACCEPTED → PREPARING → DISPATCHED → DELIVERED → COMPLETED", () => {
    expect(() => assertOrderTransition(delivery("pending"), "accepted", "seller")).not.toThrow();
    expect(() => assertOrderTransition(delivery("accepted"), "preparing", "seller")).not.toThrow();
    expect(() => assertOrderTransition(delivery("preparing"), "dispatched", "seller")).not.toThrow();
    expect(() => assertOrderTransition(delivery("dispatched"), "delivered", "buyer")).not.toThrow();
    expect(() => assertOrderTransition(delivery("delivered", "paid"), "completed", "seller")).not.toThrow();
  });
  it("refuses every move not in the table", () => {
    const all = Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[];
    for (const from of all) {
      for (const to of all) {
        if (ORDER_TRANSITIONS[from].includes(to)) continue;
        expect(() => assertOrderTransition(delivery(from, "paid"), to, "seller"), `${from}→${to}`).toThrow(expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }));
      }
    }
  });
  it("delivery orders must be dispatched first; pickup orders are never dispatched", () => {
    expect(() => assertOrderTransition(delivery("accepted"), "delivered", "seller")).toThrow(/Dispatch the order/);
    const pickup = { status: "preparing" as const, fulfilment: "pickup" as const };
    expect(() => assertOrderTransition(pickup, "dispatched", "seller")).toThrow(/collected, not dispatched/);
    expect(() => assertOrderTransition(pickup, "delivered", "seller")).not.toThrow();
  });
  it("buyers cancel only early, confirm receipt only after dispatch, and never drive preparation", () => {
    expect(() => assertOrderTransition(delivery("accepted"), "cancelled", "buyer")).not.toThrow();
    expect(() => assertOrderTransition(delivery("preparing"), "cancelled", "buyer")).toThrow(/ask the seller/);
    expect(() => assertOrderTransition(delivery("pending"), "accepted", "buyer")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertOrderTransition(delivery("preparing"), "cancelled", "seller")).not.toThrow();
    expect(() => assertOrderTransition(delivery("dispatched"), "cancelled", "seller")).toThrow(expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }));
  });
  it("an order completes only when fully paid", () => {
    expect(() => assertOrderTransition(delivery("delivered", "partially_paid"), "completed", "seller")).toThrow(/full payment/);
  });
});
