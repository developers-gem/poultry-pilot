import { addDays, daysBetween } from "./dates.js";
import { DomainError } from "./errors.js";

/**
 * Health record arithmetic only: dates, withdrawal periods, schedules and checklist results.
 * Nothing here suggests a diagnosis or a treatment; those are entered and attributed by people.
 */

/** Last day of a treatment course. A one-day course ends on its start date. */
export function treatmentEndDate(startDate: string, durationDays: number): string {
  if (!Number.isInteger(durationDays) || durationDays < 1) throw new DomainError("VALIDATION_FAILED", "Duration must be at least 1 day");
  return addDays(startDate, durationDays - 1);
}

/**
 * Last day of the withdrawal period: `days` after the last dose. Birds or eggs may be sold only after this date.
 * Zero days means no withdrawal (null).
 */
export function withdrawalUntil(endDate: string, days: number | undefined): string | null {
  if (!days || days <= 0) return null;
  return addDays(endDate, days);
}

export interface WithdrawalWindow {
  until: string;
  kind: "meat" | "eggs";
  medicineName: string;
  recordId: string;
}

/** The withdrawal that ends last among those still running on `date` (inclusive), or null. */
export function activeWithdrawal(windows: WithdrawalWindow[], date: string, kind: "meat" | "eggs"): WithdrawalWindow | null {
  const active = windows.filter((w) => w.kind === kind && w.until >= date);
  return active.sort((a, b) => (a.until < b.until ? 1 : -1))[0] ?? null;
}

export type VaccinationState = "scheduled" | "due" | "overdue" | "done" | "skipped" | "cancelled";

/** "due" within `dueSoonDays` (default 3) of today; "overdue" once the due date has passed. Never stored. */
export function vaccinationState(status: "scheduled" | "done" | "skipped" | "cancelled", dueDate: string, today: string, dueSoonDays = 3): VaccinationState {
  if (status !== "scheduled") return status;
  if (dueDate < today) return "overdue";
  if (daysBetween(today, dueDate) <= dueSoonDays) return "due";
  return "scheduled";
}

export interface ProgrammeItem {
  dayOfAge: number;
  vaccineName: string;
}

/**
 * Due dates for a farm's vaccination programme. Age is counted from the hatch date when known, otherwise from
 * placement minus the age the birds arrived at. Items whose day has already passed are returned with `past: true`
 * so the caller can schedule them as overdue or leave them out.
 */
export function scheduleProgramme<T extends ProgrammeItem>(items: T[], opts: { hatchDate?: string; placementDate?: string; ageDaysAtPlacement?: number }, today: string): (T & { dueDate: string; past: boolean })[] {
  const day0 = opts.hatchDate ?? (opts.placementDate ? addDays(opts.placementDate, -(opts.ageDaysAtPlacement ?? 0)) : null);
  if (!day0) throw new DomainError("VALIDATION_FAILED", "The flock needs a hatch or placement date before a programme can be applied");
  return [...items]
    .sort((a, b) => a.dayOfAge - b.dayOfAge)
    .map((i) => {
      const dueDate = addDays(day0, i.dayOfAge);
      return { ...i, dueDate, past: dueDate < today };
    });
}

// ---- checklists ----------------------------------------------------------------

export interface ChecklistItemDef {
  id: string;
  text: string;
  required: boolean;
  responseType: "yes_no" | "text" | "number" | "choice";
  choices?: string[];
  /** The answer that counts as a failed check (e.g. "no" for "Footbath used?"). */
  failIf?: string;
}

export interface ChecklistAnswer {
  itemId: string;
  answer: string | number | boolean;
}

export interface EvaluatedAnswer {
  itemId: string;
  text: string;
  answer: string | number | boolean;
  passed: boolean;
}

/** Checks answers against a template: every required item answered, answer types valid, failed items listed. */
export function evaluateChecklist(items: ChecklistItemDef[], answers: ChecklistAnswer[]): { answers: EvaluatedAnswer[]; failed: EvaluatedAnswer[] } {
  const byId = new Map(answers.map((a) => [a.itemId, a]));
  for (const a of answers) if (!items.some((i) => i.id === a.itemId)) throw new DomainError("VALIDATION_FAILED", `Unknown checklist item ${a.itemId}`);
  const missing = items.filter((i) => i.required && !byId.has(i.id));
  if (missing.length) throw new DomainError("CHECKLIST_INCOMPLETE", `Answer every required item: ${missing.map((m) => m.text).join("; ")}`, { missing: missing.map((m) => m.id) });
  const out: EvaluatedAnswer[] = [];
  for (const item of items) {
    const a = byId.get(item.id);
    if (!a) continue;
    const v = a.answer;
    if (item.responseType === "yes_no" && typeof v !== "boolean") throw new DomainError("VALIDATION_FAILED", `"${item.text}" needs yes or no`);
    if (item.responseType === "number" && typeof v !== "number") throw new DomainError("VALIDATION_FAILED", `"${item.text}" needs a number`);
    if (item.responseType === "choice" && !item.choices?.includes(String(v))) throw new DomainError("VALIDATION_FAILED", `"${item.text}" must be one of: ${item.choices?.join(", ")}`);
    const normalized = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
    out.push({ itemId: item.id, text: item.text, answer: v, passed: item.failIf === undefined || normalized !== item.failIf });
  }
  return { answers: out, failed: out.filter((a) => !a.passed) };
}

/** Hours between a visitor's last poultry contact and arrival, against the farm's own required downtime. */
export function visitorDowntime(lastContactAt: Date | undefined, checkInAt: Date, requiredHours: number | undefined): { hours: number | null; short: boolean } {
  if (!lastContactAt) return { hours: null, short: false };
  const hours = Math.round(((checkInAt.getTime() - lastContactAt.getTime()) / 3_600_000) * 10) / 10;
  return { hours, short: requiredHours !== undefined && hours < requiredHours };
}
