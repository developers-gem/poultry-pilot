import { DomainError } from "./errors.js";

/** Hen-day production %: eggs laid on a day ÷ hens present that day × 100. */
export function henDayPercent(eggs: number, hensPresent: number): number | null {
  if (hensPresent <= 0) return null;
  return (eggs / hensPresent) * 100;
}

/** Hen-housed eggs: cumulative eggs ÷ hens originally housed. */
export function henHousedEggs(cumulativeEggs: number, hensHoused: number): number | null {
  if (hensHoused <= 0) return null;
  return cumulativeEggs / hensHoused;
}

export function breakagePercent(broken: number, collected: number): number | null {
  if (collected <= 0) return null;
  return (broken / collected) * 100;
}

export type EggMovement =
  | { type: "collected"; date: string; eggs: number }
  | { type: "broken"; date: string; eggs: number }
  | { type: "sold"; date: string; eggs: number }
  | { type: "used"; date: string; eggs: number }
  | { type: "adjustment"; date: string; eggs: number; reason: string };

/**
 * Sellable egg stock. Market deliveries post "sold" movements here, so stock and sales
 * can no longer disagree (audit: eggs sold via orders never reduced stock).
 */
export function eggStock(movements: EggMovement[]): number {
  let stock = 0;
  for (const m of movements) {
    if (m.type === "collected") stock += m.eggs;
    else if (m.type === "adjustment") stock += m.eggs;
    else stock -= m.eggs;
  }
  return stock;
}

export function assertEggsAvailable(movements: EggMovement[], requested: number): void {
  const available = eggStock(movements);
  if (requested > available) {
    throw new DomainError("INSUFFICIENT_STOCK", `Only ${available} eggs in stock`, { available, requested });
  }
}
