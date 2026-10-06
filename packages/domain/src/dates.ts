import { isValidLocalDate } from "@poultrypilot/contracts";

/**
 * Farm-local date handling. Fixes audit B11: the prototype derived "today" from UTC,
 * so in India anything recorded before 05:30 landed on the previous day.
 *
 * LocalDate strings ("YYYY-MM-DD") are compared lexically and converted to a day number
 * via UTC midnight purely as arithmetic — no timezone is involved in that step.
 */

const MS_PER_DAY = 86_400_000;

function assertDate(d: string): void {
  if (!isValidLocalDate(d)) throw new RangeError(`Invalid local date: ${d}`);
}

/** The calendar date at `instant` in `timeZone`, e.g. localDateOf(new Date(), "Asia/Kolkata"). */
export function localDateOf(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dayNumber(date: string): number {
  assertDate(date);
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

function fromDayNumber(n: number): string {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Signed whole days from `from` to `to`. daysBetween("2026-10-01", "2026-10-06") === 5. Never clamped. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(date: string, days: number): string {
  if (!Number.isInteger(days)) throw new RangeError("days must be an integer");
  return fromDayNumber(dayNumber(date) + days);
}

/** Add calendar months, clamping to the month's last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonthsClamped(date: string, months: number, anchorDay?: number): string {
  assertDate(date);
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const targetIndex = y * 12 + (m - 1) + months;
  const ty = Math.floor(targetIndex / 12);
  const tm = targetIndex - ty * 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const day = Math.min(anchorDay ?? d, lastDay);
  return `${String(ty).padStart(4, "0")}-${String(tm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Inclusive list of dates from `from` to `to`. Empty when to < from. */
export function dateRange(from: string, to: string): string[] {
  const start = dayNumber(from);
  const end = dayNumber(to);
  const out: string[] = [];
  for (let n = start; n <= end; n++) out.push(fromDayNumber(n));
  return out;
}

/** The last `count` dates ending at `endInclusive`, oldest first. */
export function lastNDates(endInclusive: string, count: number): string[] {
  return dateRange(addDays(endInclusive, -(count - 1)), endInclusive);
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}
