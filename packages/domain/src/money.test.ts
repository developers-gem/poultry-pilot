import { describe, expect, it } from "vitest";
import { DomainError } from "./errors.js";
import { allocate, formatMoney, minorDigits, multiply, parseToMinor, sum } from "./money.js";

describe("money", () => {
  it("knows minor digits per currency", () => {
    expect(minorDigits("INR")).toBe(2);
    expect(minorDigits("JPY")).toBe(0);
    expect(minorDigits("KWD")).toBe(3);
  });
  it("parses decimal strings exactly", () => {
    expect(parseToMinor("1250.5", "INR")).toBe(125050);
    expect(parseToMinor("0.1", "INR") + parseToMinor("0.2", "INR")).toBe(30);
    expect(parseToMinor("1500", "JPY")).toBe(1500);
    expect(() => parseToMinor("10.555", "INR")).toThrow(DomainError);
    expect(() => parseToMinor("-5", "INR")).toThrow(DomainError);
  });
  it("multiplies by fractional quantities with rounding", () => {
    expect(multiply({ amountMinor: 14550, currency: "INR" }, 2.35)).toEqual({ amountMinor: 34193, currency: "INR" });
  });
  it("refuses to sum mixed currencies", () => {
    expect(() =>
      sum([{ amountMinor: 1, currency: "INR" }, { amountMinor: 1, currency: "USD" }], "INR"),
    ).toThrow(/Cannot combine/);
  });
  it("allocates without losing a paisa", () => {
    const parts = allocate(10000, [1, 1, 1]);
    expect(parts.reduce((t, p) => t + p, 0)).toBe(10000);
    expect(parts).toEqual([3334, 3333, 3333]);
  });
  it("formats in the farm currency, not USD", () => {
    expect(formatMoney({ amountMinor: 125050, currency: "INR" }, "en-IN")).toBe("₹1,250.50");
  });
});
