import { DomainError } from "./errors.js";

/**
 * Lot-based stock. Every receipt creates a lot with its own unit cost and optional expiry.
 * Stock leaves FEFO (first expiry, first out), and each issue is costed at the cost of the lots it used.
 */
export interface StockLot {
  id: string;
  receivedDate: string;
  expiryDate?: string;
  quantityRemaining: number;
  unitCostMinor: number;
}

export interface Allocation {
  lotId: string;
  quantity: number;
  costMinor: number;
}

/** Quantities are decimals (kg, litres): keep three decimals to avoid floating-point drift. */
export const q3 = (n: number) => Math.round(n * 1000) / 1000;

/** FEFO order: soonest expiry first, lots without expiry last, then oldest receipt first. */
export function fefoOrder<L extends StockLot>(lots: L[]): L[] {
  return [...lots].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate < b.expiryDate ? -1 : 1;
    }
    if (a.receivedDate !== b.receivedDate) return a.receivedDate < b.receivedDate ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

export const isExpired = (lot: Pick<StockLot, "expiryDate">, date: string) => !!lot.expiryDate && lot.expiryDate < date;

/**
 * Picks lots for `quantity` on `date`.
 * - purpose "use": expired lots are never used; if unexpired stock is short, INSUFFICIENT_STOCK reports both figures.
 * - purpose "wastage": expired lots go first (writing off expired stock), then FEFO.
 */
export function allocate(lots: StockLot[], quantity: number, date: string, purpose: "use" | "wastage"): Allocation[] {
  if (!(quantity > 0)) throw new DomainError("VALIDATION_FAILED", "Quantity must be more than zero");
  const open = lots.filter((l) => l.quantityRemaining > 0);
  const usable = purpose === "use" ? open.filter((l) => !isExpired(l, date)) : open;
  const ordered = purpose === "wastage" ? [...fefoOrder(usable.filter((l) => isExpired(l, date))), ...fefoOrder(usable.filter((l) => !isExpired(l, date)))] : fefoOrder(usable);
  const available = q3(ordered.reduce((t, l) => t + l.quantityRemaining, 0));
  if (quantity > available + 1e-9) {
    const expired = q3(open.filter((l) => isExpired(l, date)).reduce((t, l) => t + l.quantityRemaining, 0));
    throw new DomainError(
      "INSUFFICIENT_STOCK",
      expired > 0 && purpose === "use"
        ? `Only ${available} in date stock available (${expired} more is expired and cannot be used)`
        : `Only ${available} in stock; ${quantity} requested`,
      { available, requested: quantity, expired },
    );
  }
  const out: Allocation[] = [];
  let left = quantity;
  for (const lot of ordered) {
    if (left <= 1e-9) break;
    const take = q3(Math.min(lot.quantityRemaining, left));
    out.push({ lotId: lot.id, quantity: take, costMinor: Math.round(take * lot.unitCostMinor) });
    left = q3(left - take);
  }
  return out;
}

export function stockTotals(lots: StockLot[]): { quantity: number; valueMinor: number } {
  return lots.reduce((t, l) => ({ quantity: q3(t.quantity + l.quantityRemaining), valueMinor: t.valueMinor + Math.round(l.quantityRemaining * l.unitCostMinor) }), { quantity: 0, valueMinor: 0 });
}

/** Weighted average unit cost of what is in stock; used to value a positive stock-count correction. */
export function averageUnitCost(lots: StockLot[]): number {
  const t = stockTotals(lots);
  return t.quantity > 0 ? t.valueMinor / t.quantity : 0;
}

export type ExpiryStatus = "expired" | "expiring" | "ok";

export function expiryStatus(expiryDate: string | undefined, today: string, warnDays: number, addDays: (d: string, n: number) => string): ExpiryStatus | null {
  if (!expiryDate) return null;
  if (expiryDate < today) return "expired";
  if (expiryDate <= addDays(today, warnDays)) return "expiring";
  return "ok";
}

// ---- water --------------------------------------------------------------------

export interface WaterRules {
  /** Alert when a day's consumption differs from the flock's recent average by more than this. */
  deviationPercent: number;
  minBaselineDays: number;
  phMin: number;
  phMax: number;
  tdsMaxPpm: number;
}

/** Defaults; farms should set limits from their veterinarian or local water guidance. */
export const DEFAULT_WATER_RULES: WaterRules = { deviationPercent: 20, minBaselineDays: 3, phMin: 6, phMax: 8, tdsMaxPpm: 1000 };

export type WaterFlag = "consumption_high" | "consumption_low" | "ph_low" | "ph_high" | "tds_high";

/** Flags for one day's water record. Falling water intake is often the first sign something is wrong. */
export function evaluateWater(i: { litres: number; ph?: number; tdsPpm?: number; previousDays: number[]; rules?: WaterRules }): { flags: WaterFlag[]; baselineLitres: number | null; deviationPercent: number | null } {
  const r = i.rules ?? DEFAULT_WATER_RULES;
  const flags: WaterFlag[] = [];
  let baseline: number | null = null;
  let deviation: number | null = null;
  if (i.previousDays.length >= r.minBaselineDays) {
    baseline = i.previousDays.reduce((t, v) => t + v, 0) / i.previousDays.length;
    if (baseline > 0) {
      deviation = ((i.litres - baseline) / baseline) * 100;
      if (deviation > r.deviationPercent) flags.push("consumption_high");
      if (deviation < -r.deviationPercent) flags.push("consumption_low");
    }
  }
  if (i.ph !== undefined && i.ph < r.phMin) flags.push("ph_low");
  if (i.ph !== undefined && i.ph > r.phMax) flags.push("ph_high");
  if (i.tdsPpm !== undefined && i.tdsPpm > r.tdsMaxPpm) flags.push("tds_high");
  return { flags, baselineLitres: baseline, deviationPercent: deviation };
}
