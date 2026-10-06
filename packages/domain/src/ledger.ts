import type { LedgerCategory, LedgerDirection } from "@poultrypilot/contracts";
import { DomainError } from "./errors.js";

/**
 * ONE profit definition (fixes audit B19, five conflicting "profit" figures).
 *
 * Farm profit for a period = Σ income − Σ expense of ledger entries dated in that period.
 * Every module posts to the ledger: feed receipts, stock purchases, health costs, payments
 * received on orders, recurring bills when marked paid, and manual entries. The ledger is
 * cash-basis; receivables are visible on orders, not counted as income until paid.
 */
export interface LedgerEntry {
  date: string;
  direction: LedgerDirection;
  category: LedgerCategory;
  amountMinor: number;
  currency: string;
  flockId?: string;
}

export interface LedgerSummary {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  byCategory: Partial<Record<LedgerCategory, number>>;
}

export function summarizeLedger(entries: LedgerEntry[], opts: { from: string; to: string; currency: string }): LedgerSummary {
  const s: LedgerSummary = { currency: opts.currency, incomeMinor: 0, expenseMinor: 0, netMinor: 0, byCategory: {} };
  for (const e of entries) {
    if (e.date < opts.from || e.date > opts.to) continue;
    if (e.currency !== opts.currency) {
      throw new DomainError("VALIDATION_FAILED", `Ledger entry in ${e.currency} cannot be summed in ${opts.currency}`);
    }
    if (e.direction === "income") s.incomeMinor += e.amountMinor;
    else s.expenseMinor += e.amountMinor;
    s.byCategory[e.category] = (s.byCategory[e.category] ?? 0) + e.amountMinor;
  }
  s.netMinor = s.incomeMinor - s.expenseMinor;
  return s;
}

export interface BatchEconomicsInput {
  flockId: string;
  currency: string;
  ledger: LedgerEntry[];
  /** Feed cost from the feed ledger's issues to this flock (moving average). */
  feedIssuedCostMinor: number;
  birdsAlive: number;
  currentAvgWeightG: number | null;
  /** Reference live price per kg for valuing birds still on the farm. null = do not project. */
  referencePricePerKgMinor: number | null;
  closed: boolean;
  birdsPlaced: number;
}

export interface BatchEconomics {
  realizedIncomeMinor: number;
  stockCostMinor: number;
  feedCostMinor: number;
  otherDirectCostMinor: number;
  totalCostMinor: number;
  liveInventoryValueMinor: number | null;
  /** Realized income + live inventory value. null while open with no reference price. */
  projectedValueMinor: number | null;
  marginMinor: number | null;
  marginPercent: number | null;
  costPerBirdPlacedMinor: number | null;
}

/**
 * Batch margin — a management view, distinct from farm cash profit.
 * Feed is costed from issues to the flock, so flock-tagged "feed" ledger entries are
 * excluded here to avoid counting feed twice.
 */
export function batchEconomics(i: BatchEconomicsInput): BatchEconomics {
  const mine = i.ledger.filter((e) => e.flockId === i.flockId);
  for (const e of mine) {
    if (e.currency !== i.currency) throw new DomainError("VALIDATION_FAILED", "Mixed currencies in batch ledger");
  }
  const realizedIncomeMinor = mine.filter((e) => e.direction === "income").reduce((t, e) => t + e.amountMinor, 0);
  const expenses = mine.filter((e) => e.direction === "expense");
  const stockCostMinor = expenses.filter((e) => e.category === "stock_purchase").reduce((t, e) => t + e.amountMinor, 0);
  const otherDirectCostMinor = expenses
    .filter((e) => e.category !== "stock_purchase" && e.category !== "feed")
    .reduce((t, e) => t + e.amountMinor, 0);
  const totalCostMinor = stockCostMinor + i.feedIssuedCostMinor + otherDirectCostMinor;

  let liveInventoryValueMinor: number | null = null;
  if (i.closed || i.birdsAlive === 0) liveInventoryValueMinor = 0;
  else if (i.referencePricePerKgMinor !== null && i.currentAvgWeightG) {
    liveInventoryValueMinor = Math.round((i.currentAvgWeightG / 1000) * i.birdsAlive * i.referencePricePerKgMinor);
  }
  const projectedValueMinor = liveInventoryValueMinor === null ? null : realizedIncomeMinor + liveInventoryValueMinor;
  const marginMinor = projectedValueMinor === null ? null : projectedValueMinor - totalCostMinor;

  return {
    realizedIncomeMinor,
    stockCostMinor,
    feedCostMinor: i.feedIssuedCostMinor,
    otherDirectCostMinor,
    totalCostMinor,
    liveInventoryValueMinor,
    projectedValueMinor,
    marginMinor,
    marginPercent: marginMinor !== null && projectedValueMinor ? (marginMinor / projectedValueMinor) * 100 : null,
    costPerBirdPlacedMinor: i.birdsPlaced > 0 ? Math.round(totalCostMinor / i.birdsPlaced) : null,
  };
}
