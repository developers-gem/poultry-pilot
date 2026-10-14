import { FLOCK_TYPES } from "@poultrypilot/constants";
import { useState } from "react";
import { useAuth } from "../api/auth";
import { useFarmInfo, useFlocks } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form, FormCard } from "../components/forms";
import { EmptyState, LoadingState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, Button, GlassCard, MiniBars, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { label, num, pct, shortDate } from "../lib/format";

interface Arrival {
  id: string;
  houseId: string;
  expectedDate: string;
  expectedCount: number;
  source: string;
  supplier?: string;
  flockType: string;
  breed?: string;
  status: "planned" | "arrived" | "cancelled";
  prepared: boolean;
  preparation?: { checklist: { failedCount: number } };
  arrival?: { received: number; deadOnArrival: number; averageWeightG?: number };
  flockId?: string;
}
interface BroodingDay {
  date: string;
  dayOfAge: number;
  birdsAlive: number;
  mortality: number;
  feedKg: number;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  averageWeightG: number | null;
  targetWeightG: number | null;
  brooderChecks: number;
  flaggedChecks: number;
  cropFillPercent: number | null;
}
interface Brooding {
  flockCode: string;
  profile: { name: string } | null;
  days: BroodingDay[];
  totals: { mortality: number; mortalityPercent: number | null; flaggedChecks: number; daysWithChecks: number };
}
interface Checklist {
  id: string;
  name: string;
  kind: string;
  items: { id: string; text: string; responseType: string; required: boolean }[];
}

export function ChicksPage() {
  const { can } = useAuth();
  const { today } = useFarmInfo();
  const flocks = useFlocks("active");
  const young = (flocks.data?.items ?? []).filter((f) => f.placementDate && f.placementDate >= new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10));
  const [flockId, setFlockId] = useState<string | null>(null);
  const chosen = flockId ?? young[0]?.id ?? null;
  const brooding = useFarmQuery<Brooding>(`/chickstart/flocks/${chosen}?days=21`, { enabled: !!chosen });
  const arrivals = useFarmQuery<{ items: Arrival[] }>("/chickstart/arrivals");
  const houses = useFarmQuery<{ items: { id: string; name: string; status: string }[] }>("/houses");
  const checklists = useFarmQuery<{ items: Checklist[] }>("/biosecurity/checklists?kind=arrival_preparation", { enabled: can("biosecurity.read") });
  const check = useFarmMutation("POST", "/chickstart/checks", { success: "Brooder check saved" });
  const plan = useFarmMutation("POST", "/chickstart/arrivals", { success: "Arrival planned" });
  const prepare = useFarmMutation<{ _id: string; checklist: unknown }>("POST", (b) => `/chickstart/arrivals/${b._id}/preparation`, { success: "Preparation recorded" });
  const arrive = useFarmMutation<Record<string, unknown> & { _id: string }>("POST", (b) => `/chickstart/arrivals/${b._id}/arrive`, { success: "Chicks placed" });
  const starters = useFarmMutation("POST", "/biosecurity/checklists/starter", { success: "Starter checklists added" });
  const [openArrival, setOpenArrival] = useState<{ id: string; step: "prepare" | "arrive" } | null>(null);
  const b = brooding.data;
  const days = b?.days ?? [];
  const lastTemp = [...days].reverse().find((d) => d.temperatureMaxC !== null);
  const houseName = (id: string) => houses.data?.items.find((h) => h.id === id)?.name ?? "—";
  const prepList = checklists.data?.items[0];

  return (
    <>
      <PageHeader eyebrow="ChickStart" title="Chick arrival & brooding" subtitle="The first 21 days decide the batch: house preparation, brooder temperature, early feeding and losses." />
      <StatGrid>
        <Stat label="Chicks placed (last 4 weeks)" value={num(young.reduce((t, f) => t + (f.placementCount ?? 0), 0))} hint={`${young.length} brooding batches`} />
        <Stat label="Early losses" value={b ? num(b.totals.mortality) : "—"} badge={b ? pct(b.totals.mortalityPercent) : undefined} badgeTone="rose" hint={b ? `${b.flockCode}, first ${days.length} days` : "Choose a batch below"} />
        <Stat label="Latest house temperature" value={lastTemp ? `${num(lastTemp.temperatureMaxC, 1)} °C` : "—"} badgeTone="amber" hint={lastTemp ? `Max on ${shortDate(lastTemp.date)} (daily record)` : "From daily records"} />
        <Stat label="Brooder checks flagged" value={b ? num(b.totals.flaggedChecks) : "—"} badgeTone="accent" hint={b?.profile ? `Against "${b.profile.name}"` : "Set a brooding profile to judge checks"} />
      </StatGrid>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <FormCard
          title="Log a brooder check"
          allowed={can("production.record")}
          submitLabel="Save check"
          fields={[
            { name: "flockId", label: "Brooding batch", type: "select", required: true, defaultValue: chosen ?? "", options: [{ value: "", label: "Choose a batch" }, ...young.map((f) => ({ value: f.id, label: `${f.flockCode} · ${f.name}` }))] },
            { name: "temperatureC", label: "Temperature at chick level (°C)", type: "number", step: 0.1 },
            { name: "humidityPercent", label: "Humidity (%)", type: "number", min: 0, max: 100 },
            { name: "behaviour", label: "Chick behaviour", type: "select", defaultValue: "", options: [{ value: "", label: "Not noted" }, ...["comfortable", "huddling", "spread_out", "panting", "avoiding_area"].map((v) => ({ value: v, label: label(v) }))] },
            { name: "feedAvailable", label: "Feed available", type: "checkbox", defaultValue: true },
            { name: "waterAvailable", label: "Water available", type: "checkbox", defaultValue: true },
            { name: "cropSampled", label: "Crops felt (chicks)", type: "number", min: 1 },
            { name: "cropFull", label: "…of which full", type: "number", min: 0 },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          errorMap={{ "cropFill.sampled": "cropSampled", "cropFill.full": "cropFull" }}
          onSubmit={({ cropSampled, cropFull, ...rest }) => check.mutateAsync({ ...rest, ...(cropSampled ? { cropFill: { sampled: cropSampled, full: cropFull ?? 0 } } : {}) })}
        />
        <FormCard
          title="Plan a chick arrival"
          allowed={can("flock.manage")}
          submitLabel="Plan arrival"
          fields={[
            { name: "houseId", label: "House", type: "select", required: true, defaultValue: "", options: [{ value: "", label: "Choose a house" }, ...(houses.data?.items ?? []).filter((h) => h.status === "active").map((h) => ({ value: h.id, label: h.name }))] },
            { name: "expectedDate", label: "Expected arrival", type: "date", required: true, defaultValue: today },
            { name: "expectedCount", label: "Chicks expected", type: "number", required: true, min: 1 },
            { name: "flockType", label: "Bird type", type: "select", defaultValue: "broiler", options: FLOCK_TYPES.map((t) => ({ value: t, label: label(t) })) },
            { name: "source", label: "Coming from", type: "select", defaultValue: "supplier", options: [{ value: "supplier", label: "A supplier" }, { value: "own_hatchery", label: "Our hatchery" }, { value: "chick_lot", label: "Chicks in stock" }] },
            { name: "supplier", label: "Supplier", show: (v) => v["source"] === "supplier" },
            { name: "breed", label: "Breed" },
          ]}
          onSubmit={(v) => plan.mutateAsync(v)}
        />
      </div>

      <GlassCard className="mb-4">
        <SectionTitle hint="Prepare the house, then record the arrival: it places the chicks as a new batch">Arrivals</SectionTitle>
        <QueryState query={arrivals} isEmpty={(a) => !a.items.length} empty={<EmptyState title="No arrivals planned." body="Plan one above to get a preparation checklist and place the chicks on arrival." />}>
          {(a) => (
            <div className="space-y-2">
              {a.items.map((x) => (
                <div key={x.id} className="panel-inner rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    <div>
                      <p className="font-semibold">{num(x.expectedCount)} {label(x.flockType)} chicks · {houseName(x.houseId)}</p>
                      <p className="text-[12px] text-inksoft">{shortDate(x.expectedDate)} · {x.supplier ?? label(x.source)}{x.breed ? ` · ${x.breed}` : ""}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {x.status === "arrived" ? <Badge tone="mint">Arrived · {num(x.arrival?.received)} received</Badge> : x.status === "cancelled" ? <Badge tone="rose">Cancelled</Badge> : <Badge tone={x.prepared ? "mint" : "amber"}>{x.prepared ? "House prepared" : "Not prepared"}</Badge>}
                      {x.status === "planned" && can("production.record") ? <Button variant="glass" className="!px-3 !py-1.5" onClick={() => setOpenArrival({ id: x.id, step: "prepare" })}>Preparation</Button> : null}
                      {x.status === "planned" && can("flock.manage") ? <Button className="!px-3 !py-1.5" onClick={() => setOpenArrival({ id: x.id, step: "arrive" })}>Chicks arrived</Button> : null}
                    </div>
                  </div>
                  {openArrival?.id === x.id && openArrival.step === "prepare" ? (
                    <div className="mt-3 border-t border-white/60 pt-3">
                      {!prepList ? (
                        <EmptyState title="No preparation checklist yet." body="Add the starter checklists, then edit them on BioSecure to match your farm." action={can("biosecurity.manage") ? <Button variant="glass" onClick={() => starters.mutate(undefined)}>Add starter checklists</Button> : undefined} />
                      ) : (
                        <Form
                          submitLabel="Save preparation"
                          fields={prepList.items.map((i) => (i.responseType === "yes_no" ? { name: i.id, label: i.text, type: "checkbox" as const } : { name: i.id, label: i.text, type: i.responseType === "number" ? ("number" as const) : ("text" as const), required: i.required }))}
                          onSubmit={async (v) => {
                            await prepare.mutateAsync({ _id: x.id, checklist: { templateId: prepList.id, answers: prepList.items.map((i) => ({ itemId: i.id, answer: v[i.id] ?? (i.responseType === "yes_no" ? false : "") })).filter((a) => a.answer !== "") } });
                            setOpenArrival(null);
                          }}
                        />
                      )}
                    </div>
                  ) : null}
                  {openArrival?.id === x.id && openArrival.step === "arrive" ? (
                    <div className="mt-3 border-t border-white/60 pt-3">
                      <Form
                        submitLabel="Place chicks"
                        fields={[
                          { name: "received", label: "Chicks received", type: "number", required: true, defaultValue: x.expectedCount, min: 1 },
                          { name: "deadOnArrival", label: "Dead on arrival", type: "number", defaultValue: 0, min: 0 },
                          { name: "averageWeightG", label: "Average chick weight (g)", type: "number", min: 1 },
                          { name: "name", label: "New batch name", required: true, defaultValue: `Chicks ${shortDate(x.expectedDate)}` },
                          { name: "flockCode", label: "Batch code", required: true },
                          { name: "qualityNotes", label: "Chick quality", type: "textarea" },
                        ]}
                        errorMap={{ "flock.name": "name", "flock.flockCode": "flockCode" }}
                        onSubmit={async ({ name, flockCode, ...rest }) => {
                          await arrive.mutateAsync({ _id: x.id, ...rest, flock: { name, flockCode } });
                          setOpenArrival(null);
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </GlassCard>

      <GlassCard>
        <SectionTitle
          hint="From daily records and brooder checks"
          action={young.length > 1 ? (
            <select value={chosen ?? ""} onChange={(e) => setFlockId(e.target.value)} className="panel-inner rounded-xl px-3 py-1.5 text-[13px]" aria-label="Batch">
              {young.map((f) => <option key={f.id} value={f.id}>{f.flockCode} · {f.name}</option>)}
            </select>
          ) : undefined}
        >
          Brooding log
        </SectionTitle>
        {!chosen ? (
          <EmptyState title="No batch in its first four weeks." body="Brooding days appear here once chicks are placed." />
        ) : (
          <QueryState query={brooding} loading={<LoadingState />}>
            {(x) => (
              <>
                <div className="mb-4"><MiniBars values={x.days.map((d) => d.temperatureMaxC ?? 0)} labels={x.days.map((d) => `Day ${d.dayOfAge}`)} tone="amber" height="h-16" /></div>
                <DataTable
                  rows={[...x.days].reverse()}
                  rowKey={(r) => r.date}
                  columns={[
                    { key: "dayOfAge", label: "Day", render: (r) => `${r.dayOfAge} · ${shortDate(r.date)}` },
                    { key: "birdsAlive", label: "Alive", align: "right", render: (r) => num(r.birdsAlive) },
                    { key: "mortality", label: "Lost", align: "right" },
                    { key: "feedKg", label: "Feed (kg)", align: "right", render: (r) => num(r.feedKg, 1) },
                    { key: "temp", label: "Temp", align: "right", render: (r) => (r.temperatureMaxC !== null ? `${num(r.temperatureMinC, 1)}–${num(r.temperatureMaxC, 1)} °C` : "—") },
                    { key: "weight", label: "Weight", align: "right", render: (r) => (r.averageWeightG ? `${num(r.averageWeightG)} g${r.targetWeightG ? ` / ${num(r.targetWeightG)}` : ""}` : "—") },
                    { key: "checks", label: "Checks", align: "right", render: (r) => (r.brooderChecks ? `${r.brooderChecks}${r.flaggedChecks ? ` (${r.flaggedChecks} flagged)` : ""}` : "—"), hideOnPhone: true },
                    { key: "crop", label: "Crop fill", align: "right", render: (r) => pct(r.cropFillPercent, 0), hideOnPhone: true },
                  ]}
                />
              </>
            )}
          </QueryState>
        )}
      </GlassCard>
    </>
  );
}
