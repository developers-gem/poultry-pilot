import { useState } from "react";
import { downloadFile } from "../api/client";
import { useFarm } from "../api/auth";
import { useFarmInfo } from "../api/farm";
import { useFarmQuery } from "../api/hooks";
import { errorText, QueryState } from "../components/states";
import { toast } from "../components/toast";
import { Button, GlassCard, PageHeader, Stat, StatGrid } from "../components/ui";
import { addDays, label, num, shortDate } from "../lib/format";

interface Event { id: string; type: string; date: string; title: string; overdue: boolean }
const DOT: Record<string, string> = { vaccination_due: "bg-mint", health_follow_up: "bg-rose", hatch_expected: "bg-amber", transfer_expected: "bg-cyan", chick_delivery: "bg-accent", chick_arrival: "bg-brand", cleaning_due: "bg-inksoft" };
const pad = (n: number) => String(n).padStart(2, "0");

export function CalendarPage() {
  const farm = useFarm();
  const { today } = useFarmInfo();
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const first = `${cursor.y}-${pad(cursor.m)}-01`;
  const lastDay = new Date(Date.UTC(cursor.y, cursor.m, 0)).getUTCDate();
  const last = `${cursor.y}-${pad(cursor.m)}-${pad(lastDay)}`;
  const month = useFarmQuery<{ events: Event[] }>(`/calendar?from=${first}&to=${last}`);
  const next = useFarmQuery<{ events: Event[] }>(`/calendar?from=${today}&to=${addDays(today, 30)}`);
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: lastDay }, (_, i) => `${cursor.y}-${pad(cursor.m)}-${pad(i + 1)}`)];
  const monthName = new Date(`${first}T12:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  const move = (d: number) => setCursor((c) => { const m = c.m + d; return m < 1 ? { y: c.y - 1, m: 12 } : m > 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m }; });
  const upcoming = next.data?.events ?? [];
  const nextVacc = upcoming.find((e) => e.type === "vaccination_due");

  return (
    <>
      <PageHeader
        eyebrow="Farm calendar"
        title="Plan vaccinations, vet visits & hatch dates"
        subtitle="Everything scheduled across FlockHealth, HatcheryHub, ChickStart, BioSecure and orders on one month view."
        action={<Button variant="glass" onClick={() => downloadFile(`/farms/${farm.farmId}/calendar/ics?from=${today}&to=${addDays(today, 90)}`, "poultrypilot.ics").catch((e: unknown) => toast.error(errorText(e)))}>Add to phone calendar</Button>}
      />
      <StatGrid>
        <Stat label="This month" value={num(month.data?.events.length)} hint={monthName} badgeTone="accent" />
        <Stat label="Next 30 days" value={num(upcoming.length)} badgeTone="cyan" badge={upcoming.some((e) => e.overdue) ? "Some overdue" : undefined} />
        <Stat label="Next vaccination" value={nextVacc ? shortDate(nextVacc.date) : "None"} hint={nextVacc?.title ?? "No date set"} badgeTone="mint" />
        <Stat label="Next event" value={upcoming[0] ? shortDate(upcoming[0].date) : "None"} hint={upcoming[0]?.title ?? "Nothing scheduled"} badgeTone="amber" />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => move(-1)} aria-label="Previous month">‹</Button>
              <Button variant="ghost" onClick={() => setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) })}>Today</Button>
              <Button variant="ghost" onClick={() => move(1)} aria-label="Next month">›</Button>
            </div>
          </div>
          <QueryState query={month}>
            {(x) => (
              <div className="grid grid-cols-7 gap-1 text-[11px]">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="pb-1 text-center font-medium text-inksoft">{d}</div>)}
                {cells.map((date, i) => {
                  const evs = date ? x.events.filter((e) => e.date === date) : [];
                  return (
                    <div key={i} className={`min-h-[64px] rounded-lg p-1 sm:min-h-[84px] ${date ? "panel-inner" : ""} ${date === today ? "ring-2 ring-brand" : ""}`}>
                      {date ? <p className={`text-[11px] ${date === today ? "font-bold text-brand-ink" : "text-inksoft"}`}>{Number(date.slice(8))}</p> : null}
                      <ul className="mt-0.5 space-y-0.5">
                        {evs.slice(0, 3).map((e) => (
                          <li key={e.id} title={e.title} className="flex items-center gap-1 truncate">
                            <span className={`size-1.5 shrink-0 rounded-full ${DOT[e.type] ?? "bg-brand"}`} />
                            <span className="hidden truncate sm:inline">{e.title}</span>
                          </li>
                        ))}
                        {evs.length > 3 ? <li className="text-inksoft">+{evs.length - 3}</li> : null}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </QueryState>
        </GlassCard>
        <GlassCard className="lg:col-span-4">
          <h2 className="mb-3 text-lg font-semibold">Coming up</h2>
          <QueryState query={next} isEmpty={(x) => !x.events.length} empty={<p className="py-6 text-center text-[13px] text-inksoft">Nothing in the next 30 days.</p>}>
            {(x) => (
              <ul className="space-y-2">
                {x.events.map((e) => (
                  <li key={e.id} className="panel-inner flex items-start gap-2 rounded-xl p-3 text-[13px]">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[e.type] ?? "bg-brand"}`} />
                    <span className="min-w-0">
                      <span className="block font-medium">{e.title}</span>
                      <span className={`text-[12px] ${e.overdue ? "font-semibold text-rose-ink" : "text-inksoft"}`}>{e.overdue ? "Overdue · " : ""}{shortDate(e.date)} · {label(e.type)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </GlassCard>
      </div>
    </>
  );
}
