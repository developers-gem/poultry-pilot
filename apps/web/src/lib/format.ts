/**
 * Display formatting. Money arrives from the API in minor units with its currency; nothing is assumed to be USD
 * (the prototype formatted everything as dollars).
 */
export interface Money {
  amountMinor: number;
  currency: string;
}

const fractionDigits = (currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;

export function money(minor: number | null | undefined, currency: string, opts: { compact?: boolean } = {}): string {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return "—";
  const digits = fractionDigits(currency);
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: opts.compact ? 0 : digits, ...(opts.compact ? { notation: "compact" } : {}) }).format(minor / 10 ** digits);
}

export const moneyOf = (m: Money | null | undefined) => (m ? money(m.amountMinor, m.currency) : "—");

/** Major units typed in a form → minor units for the API. */
export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** fractionDigits(currency));
}

export function num(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
}

export const pct = (n: number | null | undefined, digits = 1) => (n === null || n === undefined || !Number.isFinite(n) ? "—" : `${num(n, digits)}%`);

/** Today in the farm's time zone (the API's dates are farm-local). */
export function todayIn(timezone: string | undefined): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);
}

export function shortDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function weekday(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
}

export const label = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—");
