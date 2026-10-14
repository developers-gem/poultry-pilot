import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth, useFarm } from "../api/auth";
import { authedRequest } from "../api/client";
import { useFarmInfo, useFlockDetails, useFlocks } from "../api/farm";
import { useFarmMutation } from "../api/hooks";
import { FormCard } from "../components/forms";
import { EmptyState, LoadingState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { GlassCard, MiniBars, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { num, pct, shortDate } from "../lib/format";

interface WeighIn {
  eventId: string;
  date: string;
  averageWeightG: number | null;
  sampleSize: number | null;
  stats?: { minG: number; maxG: number; cvPercent: number; uniformityPercent: number };
  note: string | null;
}

export function WeightsPage() {
  const { can } = useAuth();
  const farm = useFarm();
  const { today } = useFarmInfo();
  const flocks = useFlocks("active");
  const active = flocks.data?.items ?? [];
  const details = useFlockDetails(active.map((f) => f.id));
  const weighIns = useQueries({ queries: active.map((f) => ({ queryKey: ["farm", farm.farmId, `/flocks/${f.id}/weighings`], queryFn: () => authedRequest<{ items: WeighIn[] }>(`/farms/${farm.farmId}/flocks/${f.id}/weighings`) })) });
  const add = useFarmMutation<Record<string, unknown> & { _id: string }>("POST", (b) => `/flocks/${b._id}/weighings`, { success: "Weigh-in saved" });
  const [mode, setMode] = useState<"birds" | "average">("birds");
  const all = active.flatMap((f, i) => (weighIns[i]?.data?.items ?? []).map((w) => ({ ...w, flock: f.flockCode })));
  const latest = [...all].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const gains = details.map((q) => q.data?.metrics.dailyWeightGainG).filter((g): g is number => !!g);
  const loading = weighIns.some((q) => q.isPending) && active.length > 0;

  return (
    <>
      <PageHeader eyebrow="BroilerProfit" title="Bird weight tracker" subtitle="Weigh sample birds in each flock so growth, feed ratio and profit are based on real numbers." />
      <StatGrid>
        <Stat label="Weigh-ins" value={num(all.length)} hint={`${num(all.reduce((t, w) => t + (w.sampleSize ?? 0), 0))} birds weighed`} />
        <Stat label="Latest average" value={latest?.averageWeightG ? `${num(latest.averageWeightG)} g` : "—"} badge={latest ? shortDate(latest.date) : undefined} badgeTone="cyan" hint={latest ? `${latest.flock}` : "No weigh-ins yet"} />
        <Stat label="Daily gain" value={gains.length ? `${num(gains.reduce((a, b) => a + b, 0) / gains.length, 1)} g` : "—"} badgeTone="mint" hint="Average across active flocks, from their weigh-ins" />
        <Stat label="Spread in last weighing" value={latest?.stats ? `${num(latest.stats.minG)}–${num(latest.stats.maxG)} g` : "—"} badgeTone="amber" badge={latest?.stats ? `${pct(latest.stats.uniformityPercent, 0)} uniform` : undefined} hint={latest?.stats ? `CV ${pct(latest.stats.cvPercent)}` : "Weigh birds one by one to see the spread"} />
      </StatGrid>

      <div className="mb-4">
        <FormCard
          title="Record a weigh-in"
          allowed={can("production.record")}
          description={
            <span>
              <button type="button" onClick={() => setMode("birds")} className={`mr-3 font-medium ${mode === "birds" ? "text-brand-ink underline" : ""}`}>Bird by bird</button>
              <button type="button" onClick={() => setMode("average")} className={`font-medium ${mode === "average" ? "text-brand-ink underline" : ""}`}>Average only</button>
            </span>
          }
          submitLabel="Save weigh-in"
          fields={[
            { name: "_flock", label: "Flock", type: "select", required: true, defaultValue: active[0]?.id ?? "", options: [{ value: "", label: "Choose a flock" }, ...active.map((f) => ({ value: f.id, label: `${f.flockCode} · ${f.name}` }))] },
            { name: "date", label: "Date weighed", type: "date", defaultValue: today, required: true },
            ...(mode === "birds"
              ? [{ name: "weights", label: "Weights in grams", type: "textarea" as const, required: true, placeholder: "e.g. 1820, 1905, 1770, 1860", hint: "One per bird, separated by commas, spaces or new lines." }]
              : [
                  { name: "averageWeightG", label: "Average weight (g)", type: "number" as const, required: true, min: 1 },
                  { name: "sampleSize", label: "Birds weighed", type: "number" as const, min: 1 },
                ]),
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          errorMap={{ weightsG: "weights" }}
          onSubmit={({ _flock, weights, ...rest }) => {
            const weightsG = weights ? String(weights).split(/[\s,;]+/).filter(Boolean).map(Number) : undefined;
            return add.mutateAsync({ _id: String(_flock), ...rest, ...(weightsG ? { weightsG } : {}) });
          }}
        />
      </div>

      <GlassCard className="mb-4">
        <SectionTitle hint="Average weight at each weigh-in, oldest to newest">Weight gain by flock</SectionTitle>
        <QueryState query={flocks} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No active flocks." body="Weigh-ins are recorded for placed, active flocks." />}>
          {() => (loading ? <LoadingState /> : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {active.map((f, i) => {
                const list = [...(weighIns[i]?.data?.items ?? [])].reverse();
                const m = details[i]?.data?.metrics;
                return (
                  <div key={f.id} className="panel-inner rounded-xl p-4">
                    <p className="font-display text-[16px] font-semibold">{f.flockCode} · {f.name}</p>
                    <p className="text-[12px] text-inksoft">{list.length} weigh-ins · day {m?.ageDays ?? "—"}</p>
                    {list.length ? <div className="mt-3"><MiniBars values={list.map((w) => w.averageWeightG ?? 0)} labels={list.map((w) => w.date)} tone="mint" height="h-16" /></div> : <p className="mt-3 text-[12px] text-inksoft">Not weighed yet.</p>}
                    <p className="mt-2 text-[12px]">Latest <span className="font-semibold">{m?.averageWeightG ? `${num(m.averageWeightG)} g` : "—"}</span> · gain <span className="font-semibold">{m?.dailyWeightGainG ? `${num(m.dailyWeightGainG, 1)} g/day` : "—"}</span></p>
                  </div>
                );
              })}
            </div>
          ))}
        </QueryState>
      </GlassCard>

      <GlassCard>
        <SectionTitle>All weigh-ins</SectionTitle>
        {loading ? <LoadingState /> : (
          <DataTable
            rows={[...all].sort((a, b) => (a.date < b.date ? 1 : -1))}
            rowKey={(r) => r.eventId}
            empty="No weigh-ins yet."
            columns={[
              { key: "date", label: "Date", render: (r) => shortDate(r.date) },
              { key: "flock", label: "Flock" },
              { key: "averageWeightG", label: "Average", align: "right", render: (r) => (r.averageWeightG ? `${num(r.averageWeightG)} g` : "—") },
              { key: "sampleSize", label: "Birds", align: "right" },
              { key: "spread", label: "Range", align: "right", render: (r) => (r.stats ? `${num(r.stats.minG)}–${num(r.stats.maxG)} g` : "—") },
              { key: "uniformity", label: "Uniformity", align: "right", render: (r) => (r.stats ? pct(r.stats.uniformityPercent, 0) : "—"), hideOnPhone: true },
              { key: "note", label: "Notes", hideOnPhone: true },
            ]}
          />
        )}
      </GlassCard>
    </>
  );
}
