import type { RecurringFrequency } from "@poultrypilot/types";
import { addDays, addMonthsClamped, dayNumber } from "./dates.js";

export const PERIODS_PER_YEAR: Record<RecurringFrequency, number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export interface RecurringBill {
  amountMinor: number;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  /** Periods during which the bill was paused (inclusive). `to` absent = still paused. */
  pauses?: { from: string; to?: string }[];
}

function isPaused(bill: RecurringBill, date: string): boolean {
  return (bill.pauses ?? []).some((p) => date >= p.from && (!p.to || date <= p.to));
}

/** Due dates between `from` and `to` inclusive. Monthly bills keep their anchor day (31st → last day). */
export function dueDates(bill: RecurringBill, from: string, to: string): string[] {
  const out: string[] = [];
  const last = bill.endDate && bill.endDate < to ? bill.endDate : to;
  const anchor = Number(bill.startDate.slice(8, 10));
  let i = 0;
  // Guard against runaway loops on bad data: at most 50 years of daily bills.
  while (i < 365 * 50) {
    let d: string;
    switch (bill.frequency) {
      case "daily":
        d = addDays(bill.startDate, i);
        break;
      case "weekly":
        d = addDays(bill.startDate, i * 7);
        break;
      case "monthly":
        d = addMonthsClamped(bill.startDate, i, anchor);
        break;
      case "quarterly":
        d = addMonthsClamped(bill.startDate, i * 3, anchor);
        break;
      case "yearly":
        d = addMonthsClamped(bill.startDate, i * 12, anchor);
        break;
    }
    if (dayNumber(d) > dayNumber(last)) break;
    if (d >= from && !isPaused(bill, d)) out.push(d);
    i++;
  }
  return out;
}

/**
 * Expected amount due up to `asOf`. Fixes audit B16 (paused bills kept accruing).
 * This is what SHOULD have been paid; what WAS paid lives in the ledger.
 */
export function expectedToDateMinor(bill: RecurringBill, asOf: string): number {
  return dueDates(bill, bill.startDate, asOf).length * bill.amountMinor;
}

export function monthlyRunRateMinor(bill: RecurringBill, asOf: string): number {
  if (bill.endDate && bill.endDate < asOf) return 0;
  if (isPaused(bill, asOf)) return 0;
  return Math.round((bill.amountMinor * PERIODS_PER_YEAR[bill.frequency]) / 12);
}
