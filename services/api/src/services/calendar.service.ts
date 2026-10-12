import { addDays, dateRange, localDateOf } from "../domain/index.js";
import { AppError } from "../lib/errors.js";
import type { Clock } from "../lib/util.js";
import type { Repositories } from "../ports/repositories.js";
import { assertCan, type FarmContext } from "./context.js";

export const CALENDAR_TYPES = ["transfer_expected", "hatch_expected", "chick_delivery", "chick_arrival", "vaccination_due", "cleaning_due", "health_follow_up"] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];

export interface CalendarEvent {
  id: string;
  type: CalendarType;
  date: string;
  title: string;
  overdue: boolean;
  refType: string;
  refId: string;
  flockId?: string;
  houseId?: string;
}

/** One calendar for the farm, built from the source records each time (never stored, so never stale). */
export function createCalendarService(d: { repos: Repositories; clock: Clock }) {
  const { repos } = d;

  async function events(ctx: FarmContext, q: { from: string; to: string; types?: CalendarType[] }): Promise<{ today: string; events: CalendarEvent[] }> {
    assertCan(ctx, "farm.read");
    if (q.from > q.to) throw new AppError("VALIDATION_FAILED", "from must be on or before to");
    if (dateRange(q.from, q.to).length > 366) throw new AppError("VALIDATION_FAILED", "Ask for at most 366 days at a time");
    const farm = await repos.farms.findById(ctx.farmId);
    const today = localDateOf(d.clock.now(), farm!.settings.timezone);
    const want = new Set(q.types?.length ? q.types : CALENDAR_TYPES);
    const inRange = (date?: string) => !!date && date >= q.from && date <= q.to;
    const out: CalendarEvent[] = [];
    const push = (e: Omit<CalendarEvent, "id" | "overdue">, overdue = e.date < today) => {
      if (want.has(e.type) && inRange(e.date)) out.push({ ...e, id: `${e.type}:${e.refId}`, overdue });
    };

    const [batches, orders, arrivals, vaccinations, schedules, health, flocks, buyers] = await Promise.all([
      repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] } as never }),
      repos.orders.find(ctx.farmId, { where: { status: ["pending", "confirmed"] } as never }),
      repos.chickArrivals.find(ctx.farmId, { where: { status: "planned" } }),
      repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: q.to } }),
      repos.cleaningTasks.find(ctx.farmId, { where: { active: true } }),
      repos.healthRecords.find(ctx.farmId, { where: { followUpDone: false }, range: { field: "followUpDate", from: q.from, to: q.to } }),
      repos.flocks.find(ctx.farmId),
      repos.buyers.find(ctx.farmId),
    ]);
    const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
    const buyer = new Map(buyers.map((b) => [b.id, b.name]));
    for (const b of batches) {
      if (b.status === "incubating") push({ type: "transfer_expected", date: b.expectedTransferDate, title: `Move batch ${b.code} to the hatcher`, refType: "hatchery_batch", refId: b.id });
      push({ type: "hatch_expected", date: b.expectedHatchDate, title: `Batch ${b.code} hatches (${b.results?.inIncubation ?? b.eggsSet} eggs)`, refType: "hatchery_batch", refId: b.id });
    }
    for (const o of orders) {
      if (o.requestedDeliveryDate) push({ type: "chick_delivery", date: o.requestedDeliveryDate, title: `Deliver ${o.lines.reduce((t, l) => t + l.quantity, 0)} chicks to ${o.buyerId ? buyer.get(o.buyerId) ?? "buyer" : "buyer"} (order ${o.orderNumber})`, refType: "order", refId: o.id });
    }
    for (const a of arrivals) push({ type: "chick_arrival", date: a.expectedDate, title: `${a.expectedCount} chicks arrive${a.preparation ? "" : " (house not yet prepared)"}`, refType: "chick_arrival", refId: a.id, houseId: a.houseId });
    // An overdue vaccination is shown on today (when today is in range) so it is not lost in the past.
    for (const v of vaccinations) {
      const overdue = v.dueDate < today;
      const date = overdue && inRange(today) ? today : v.dueDate;
      push({ type: "vaccination_due", date, title: `${v.vaccineName} for ${code.get(v.flockId) ?? "flock"}${overdue ? ` (due ${v.dueDate})` : ""}`, refType: "vaccination", refId: v.id, flockId: v.flockId }, overdue);
    }
    for (const s of schedules) if (s.nextDueDate) push({ type: "cleaning_due", date: s.nextDueDate, title: s.title, refType: "cleaning_task", refId: s.id, ...(s.houseIds?.length === 1 ? { houseId: s.houseIds[0] } : {}) });
    for (const h of health) push({ type: "health_follow_up", date: h.followUpDate!, title: `Follow up: ${h.title}`, refType: "health_record", refId: h.id, ...(h.flockId ? { flockId: h.flockId } : {}) });
    return { today, events: out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type.localeCompare(b.type))) };
  }

  /** iCalendar (RFC 5545) for importing into phone and desktop calendars: all-day events. */
  function toIcs(farmName: string, list: CalendarEvent[]): string {
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const day = (s: string) => s.replace(/-/g, "");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PoultryPilot//Farm calendar//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(`PoultryPilot – ${farmName}`)}`];
    for (const e of list) {
      lines.push("BEGIN:VEVENT", `UID:${e.id}@poultrypilot`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(e.date)}`, `DTEND;VALUE=DATE:${day(addDays(e.date, 1))}`, `SUMMARY:${esc(e.title)}`, `CATEGORIES:${e.type}`, "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }

  return {
    events,
    async ics(ctx: FarmContext, q: { from: string; to: string; types?: CalendarType[] }) {
      const farm = await repos.farms.findById(ctx.farmId);
      return toIcs(farm?.name ?? "Farm", (await events(ctx, q)).events);
    },
  };
}

export type CalendarService = ReturnType<typeof createCalendarService>;
