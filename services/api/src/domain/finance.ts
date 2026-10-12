import { daysBetween } from "./dates.js";
import { DomainError } from "./errors.js";

/**
 * Finance arithmetic. Amounts are integer minor units. Tax is whatever the farm enters (rate and label);
 * PoultryPilot holds no country tax rules.
 */
export interface TaxInput {
  ratePercent: number;
  /** true: the amount already includes tax. false: tax is added on top. */
  inclusive: boolean;
  label?: string;
}

/** Splits an amount into net and tax. Rounds tax to the minor unit; net + tax always equals gross. */
export function applyTax(amountMinor: number, tax: TaxInput | undefined): { netMinor: number; taxMinor: number; grossMinor: number } {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new DomainError("VALIDATION_FAILED", "Amounts must be whole minor units, not negative");
  if (!tax || tax.ratePercent === 0) return { netMinor: amountMinor, taxMinor: 0, grossMinor: amountMinor };
  if (tax.ratePercent < 0 || tax.ratePercent > 100) throw new DomainError("VALIDATION_FAILED", "Tax rate must be between 0 and 100%");
  if (tax.inclusive) {
    const taxMinor = Math.round(amountMinor - amountMinor / (1 + tax.ratePercent / 100));
    return { netMinor: amountMinor - taxMinor, taxMinor, grossMinor: amountMinor };
  }
  const taxMinor = Math.round((amountMinor * tax.ratePercent) / 100);
  return { netMinor: amountMinor, taxMinor, grossMinor: amountMinor + taxMinor };
}

export type DocumentStatus = "unpaid" | "partially_paid" | "paid" | "cancelled";

export function paymentStatus(totalMinor: number, paidMinor: number): Exclude<DocumentStatus, "cancelled"> {
  if (paidMinor <= 0) return "unpaid";
  return paidMinor >= totalMinor ? "paid" : "partially_paid";
}

/** A payment may not take a document past its total; a refund may not exceed what was paid. */
export function assertPaymentFits(kind: "payment" | "refund", amountMinor: number, totalMinor: number, paidMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new DomainError("VALIDATION_FAILED", "Amount must be more than zero");
  if (kind === "payment" && paidMinor + amountMinor > totalMinor) {
    throw new DomainError("VALIDATION_FAILED", `This would overpay by ${paidMinor + amountMinor - totalMinor} (outstanding ${totalMinor - paidMinor})`, { outstandingMinor: totalMinor - paidMinor });
  }
  if (kind === "refund" && amountMinor > paidMinor) throw new DomainError("VALIDATION_FAILED", `Only ${paidMinor} has been paid; a refund cannot exceed it`, { paidMinor });
}

export type AgeBucket = "current" | "1_30" | "31_60" | "61_90" | "over_90";

/** Days past due, bucketed. Documents without a due date are due on their date. */
export function ageBucket(dueDate: string, today: string): { daysOverdue: number; bucket: AgeBucket } {
  const d = daysBetween(dueDate, today);
  const bucket: AgeBucket = d <= 0 ? "current" : d <= 30 ? "1_30" : d <= 60 ? "31_60" : d <= 90 ? "61_90" : "over_90";
  return { daysOverdue: Math.max(0, d), bucket };
}
