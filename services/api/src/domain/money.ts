import type { Money } from "@poultrypilot/types";
import { DomainError } from "./errors.js";

/**
 * Integer minor-unit money. Fixes the prototype's hard-coded USD formatting and float arithmetic.
 */

const digitsCache = new Map<string, number>();

/** Minor-unit digits for a currency: INR 2, JPY 0, KWD 3. */
export function minorDigits(currency: string): number {
  const cached = digitsCache.get(currency);
  if (cached !== undefined) return cached;
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  digitsCache.set(currency, digits);
  return digits;
}

/** Parse a decimal string ("1250.5") exactly into minor units without floating-point error. */
export function parseToMinor(input: string, currency: string): number {
  const s = input.trim();
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) throw new DomainError("VALIDATION_FAILED", `"${input}" is not a valid non-negative amount`);
  const digits = minorDigits(currency);
  const whole = m[1] ?? "0";
  const frac = m[2] ?? "";
  if (frac.length > digits) {
    throw new DomainError("VALIDATION_FAILED", `${currency} allows at most ${digits} decimal places`);
  }
  const minor = Number(whole) * 10 ** digits + Number(frac.padEnd(digits, "0") || "0");
  if (!Number.isSafeInteger(minor)) throw new DomainError("VALIDATION_FAILED", "Amount too large");
  return minor;
}

export function money(amountMinor: number, currency: string): Money {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new DomainError("VALIDATION_FAILED", "Money must be a non-negative integer of minor units");
  }
  return { amountMinor, currency };
}

/** Round half away from zero to an integer number of minor units. */
export function roundMinor(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** unit price × quantity (quantity may be fractional, e.g. 2.35 kg). */
export function multiply(unitPrice: Money, quantity: number): Money {
  if (!(quantity >= 0)) throw new DomainError("VALIDATION_FAILED", "Quantity must be non-negative");
  return money(roundMinor(unitPrice.amountMinor * quantity), unitPrice.currency);
}

export function assertSameCurrency(items: Money[]): string | undefined {
  const first = items[0]?.currency;
  for (const m of items) {
    if (m.currency !== first) {
      throw new DomainError("VALIDATION_FAILED", `Cannot combine ${first} and ${m.currency} without conversion`);
    }
  }
  return first;
}

export function sum(items: Money[], currency: string): Money {
  if (items.length) assertSameCurrency([...items, { amountMinor: 0, currency }]);
  return money(
    items.reduce((t, m) => t + m.amountMinor, 0),
    currency,
  );
}

/** Split `totalMinor` across weights with the largest-remainder method; parts always sum to the total. */
export function allocate(totalMinor: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((t, w) => t + w, 0);
  if (totalWeight <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (totalMinor * w) / totalWeight);
  const floors = raw.map(Math.floor);
  let remainder = totalMinor - floors.reduce((t, v) => t + v, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remainder--;
  }
  return floors;
}

export function formatMoney(m: Money, locale = "en-IN"): string {
  const digits = minorDigits(m.currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency: m.currency }).format(m.amountMinor / 10 ** digits);
}

/** Signed formatting helper for net figures that can be negative (net profit). */
export function formatSignedMinor(amountMinor: number, currency: string, locale = "en-IN"): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 10 ** digits);
}
