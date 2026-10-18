import { EGG_GRADES } from "@poultrypilot/constants";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth, useFarm } from "../api/auth";
import { authedRequest } from "../api/client";
import { LAYING, useFarmInfo, useFlocks } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form, FormCard } from "../components/forms";
import { EmptyState, LoadingState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { GlassCard, MiniBars, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { addDays, label, num, pct, shortDate } from "../lib/format";

interface DayView {
  version: number | null;
  eggs?: { collected: number; broken: number; byGrade?: Record<string, number>; henDayPercent: number | null; withheldUntil?: string };
}
interface ListItem {
  id: string;
  flockId: string;
  flockCode: string;
  flockType: string;
  date: string;
  version: number;
  summary: { eggsCollected: number | null; eggsBroken: number | null; feedKg: number; mortality: number };
}

const GRADES = ["large", "medium", "small"] as const;
const EGGS_PER_TRAY = 30;

/** Collection form for one flock and day: shows what is already recorded and changes only the eggs. */
function RecordEggs({ flocks, today }: { flocks: { id: string; flockCode: string; name: string }[]; today: string }) {
  const farm = useFarm();
  const [flockId, setFlockId] = useState(flocks[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const day = useQuery({ queryKey: ["farm", farm.farmId, `/flocks/${flockId}/daily-records/${date}`], enabled: !!flockId && !!date, queryFn: () => authedRequest<DayView>(`/farms/${farm.farmId}/flocks/${flockId}/daily-records/${date}`) });
  const save = useFarmMutation<Record<string, unknown>>("PATCH", `/flocks/${flockId}/daily-records/${date}`, { success: "Egg collection saved" });
  const e = day.data?.eggs;
  return (
    <>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[11px] tracking-[0.15em] text-inksoft uppercase">Flock</span>
          <select value={flockId} onChange={(x) => setFlockId(x.target.value)} className="panel-inner w-full rounded-xl px-3 py-2.5 text-[14px]">{flocks.map((f) => <option key={f.id} value={f.id}>{f.flockCode} · {f.name}</option>)}</select>
        </label>
        <label className="block"><span className="mb-1 block text-[11px] tracking-[0.15em] text-inksoft uppercase">Date</span>
          <input type="date" value={date} max={today} onChange={(x) => setDate(x.target.value)} className="panel-inner w-full rounded-xl px-3 py-2.5 text-[14px]" />
        </label>
      </div>
      {day.isPending ? <LoadingState rows={1} /> : (
        <>
          {e ? <p className="mb-3 rounded-xl bg-cyan/10 px-3 py-2 text-[12px] text-cyan-ink">Already recorded for this day: {num(e.collected)} collected, {num(e.broken)} broken. A second collection is added to these.</p> : null}
          <Form
            key={`${flockId}:${date}:${day.data?.version ?? "new"}`}
            submitLabel={e ? "Save collection" : "Save egg collection"}
            initial={{ mode: e ? "add" : "total", trays: "", loose: "", broken: "" } as never}
            fields={[
              ...(e ? [{ name: "mode", label: "This entry", type: "select" as const, options: [{ value: "add", label: `Add a collection to today's ${num(e.collected)}` }, { value: "total", label: "Set the day's total (correction)" }] }] : []),
              { name: "trays", label: `Trays of ${EGGS_PER_TRAY}`, type: "number", min: 0, hint: "Full trays counted" },
              { name: "loose", label: "Loose eggs", type: "number", min: 0, hint: "Eggs not in a full tray" },
              { name: "broken", label: "Broken eggs", type: "number", min: 0 },
              ...(e ? [] : GRADES.map((g) => ({ name: g, label: `${label(g)} (optional)`, type: "number" as const, min: 0 }))),
            ]}
            errorMap={{ "eggs.collected": "trays", "eggs.broken": "broken", "eggs.byGrade": "trays", eggs: "trays" }}
            resetOnSuccess={false}
            onSubmit={({ mode, trays, loose, broken, ...g }) => {
              // Farmers count trays (30) plus loose eggs, and collect two or three times a day: a later collection
              // is added to the day, never retyped or overwritten.
              const counted = Number(trays ?? 0) * EGGS_PER_TRAY + Number(loose ?? 0);
              const adding = !!e && mode !== "total";
              const collected = adding ? e!.collected + counted : counted;
              const brokenTotal = (adding ? e!.broken : 0) + Number(broken ?? 0);
              const byGrade = Object.fromEntries(GRADES.filter((k) => g[k] !== undefined && g[k] !== "").map((k) => [k, Number(g[k])]));
              return save.mutateAsync({ eggs: { collected, broken: brokenTotal, ...(Object.keys(byGrade).length ? { byGrade } : {}) }, ...(day.data?.version !== null && day.data?.version !== undefined ? { version: day.data.version } : {}) });
            }}
          />
        </>
      )}
    </>
  );
}

export function EggsPage() {
  const { can } = useAuth();
  const { today } = useFarmInfo();
  const layers = (useFlocks("active").data?.items ?? []).filter((f) => LAYING.has(f.type));
  const trends = useFarmQuery<{ days: { date: string; eggsCollected: number; eggsBroken: number }[]; totals: { eggsCollected: number; eggsBroken: number } }>(`/dashboard/trends?from=${addDays(today, -29)}&to=${today}`);
  const stock = useFarmQuery<{ total: number; byGrade: Record<string, number> }>("/inventory/eggs", { enabled: can("inventory.read") });
  const history = useFarmQuery<{ items: ListItem[] }>(`/daily-records?from=${addDays(today, -29)}&to=${today}&limit=200`);
  const movement = useFarmMutation("POST", "/inventory/eggs/movements", { success: "Egg stock updated" });
  const remove = useFarmMutation<{ _id: string }>("DELETE", (b) => `/daily-records/${b._id}`, { success: "Day's record removed" });
  const days = trends.data?.days ?? [];
  const todayRow = days.find((d) => d.date === today);
  const t = trends.data?.totals;
  const rows = (history.data?.items ?? []).filter((r) => r.summary.eggsCollected !== null);

  return (
    <>
      <PageHeader eyebrow="EggCount" title="Egg collection" subtitle="Eggs recorded by flock, with broken eggs and egg stock tracked separately." />
      <StatGrid>
        <Stat label="Collected today" value={num(todayRow?.eggsCollected ?? 0)} hint={`${num(todayRow?.eggsBroken ?? 0)} broken today`} />
        <Stat label="Collected · last 30 days" value={num(t?.eggsCollected)} badgeTone="cyan" />
        <Stat label="Broken" value={num(t?.eggsBroken)} badge={t?.eggsCollected ? pct((t.eggsBroken / t.eggsCollected) * 100) : undefined} badgeTone="rose" hint="Last 30 days" />
        {can("inventory.read") ? <Stat label="In stock" value={num(stock.data?.total)} badge="eggs" badgeTone="mint" hint={stock.data ? Object.entries(stock.data.byGrade).filter(([, n]) => n).map(([g, n]) => `${num(n)} ${label(g).toLowerCase()}`).join(" · ") : undefined} /> : null}
      </StatGrid>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="mb-4 font-display text-[16px] font-semibold tracking-tight">Record egg collection</h2>
          {!can("production.record") ? <p className="text-[13px] text-inksoft">Your role can view egg records but not add them.</p> : layers.length ? <RecordEggs flocks={layers} today={today} /> : <EmptyState title="No laying flocks." body="Eggs are recorded for active layer, breeder or custom flocks." />}
        </GlassCard>
        <div className="space-y-4">
          <GlassCard>
            <SectionTitle hint="Collected per day">Last 14 days</SectionTitle>
            <QueryState query={trends}>{() => <MiniBars values={days.slice(-14).map((d) => d.eggsCollected)} labels={days.slice(-14).map((d) => d.date)} tone="cyan" />}</QueryState>
          </GlassCard>
          <FormCard
            title="Eggs used or spoiled"
            allowed={can("inventory.issue")}
            description="Take eggs out of stock that were not sold (used on the farm, spoiled), or correct the count."
            submitLabel="Update stock"
            fields={[
              { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
              { name: "type", label: "What happened", type: "select", defaultValue: "used", options: [{ value: "used", label: "Used" }, { value: "spoiled", label: "Spoiled" }, { value: "adjustment", label: "Count correction (+/−)" }] },
              { name: "quantity", label: "Eggs", type: "number", required: true },
              { name: "grade", label: "Grade", type: "select", defaultValue: "", options: [{ value: "", label: "Ungraded" }, ...EGG_GRADES.map((g) => ({ value: g, label: label(g) }))] },
              { name: "reason", label: "Reason", type: "textarea" },
            ]}
            onSubmit={(v) => movement.mutateAsync(v)}
          />
        </div>
      </div>

      <GlassCard>
        <SectionTitle hint="Last 30 days">Collection history</SectionTitle>
        <QueryState query={history} loading={<LoadingState />}>
          {() => (
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              empty="No eggs recorded in the last 30 days."
              columns={[
                { key: "date", label: "Date", render: (r) => shortDate(r.date) },
                { key: "flockCode", label: "Flock" },
                { key: "collected", label: "Collected", align: "right", render: (r) => num(r.summary.eggsCollected) },
                { key: "broken", label: "Broken", align: "right", render: (r) => num(r.summary.eggsBroken) },
                { key: "good", label: "Good", align: "right", render: (r) => num((r.summary.eggsCollected ?? 0) - (r.summary.eggsBroken ?? 0)) },
              ]}
              actions={can("production.record") ? (r) => <ConfirmRemoveDay onConfirm={() => remove.mutate({ _id: r.id })} /> : undefined}
            />
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}

function ConfirmRemoveDay({ onConfirm }: { onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" onClick={() => setAsking(true)} className="text-[12px] font-medium text-rose-ink hover:underline">Remove day</button>;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2 text-[12px]">
      <span className="text-inksoft">Removes the whole day's record (eggs, feed, deaths)?</span>
      <button type="button" onClick={() => { setAsking(false); onConfirm(); }} className="rounded-lg bg-rose/15 px-2 py-1 font-semibold text-rose-ink">Remove</button>
      <button type="button" onClick={() => setAsking(false)} className="text-inksoft hover:underline">Cancel</button>
    </span>
  );
}
