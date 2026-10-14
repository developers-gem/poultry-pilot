import { HEALTH_RECORD_TYPES, MORTALITY_CAUSES } from "@poultrypilot/constants";
import { useState } from "react";
import { useAuth } from "../api/auth";
import { useFarmInfo, useFlocks } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form, FormCard } from "../components/forms";
import { QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, Button, ConfirmButton, GlassCard, MiniBars, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { addDays, label, money, num, shortDate, toMinor } from "../lib/format";

interface HealthRecord {
  id: string;
  type: string;
  date: string;
  flockId?: string;
  title: string;
  symptoms?: string[];
  vetName?: string;
  assessment?: { text: string; by: string };
  treatments?: { medicineName?: string; endDate: string; withdrawalMeatUntil?: string; withdrawalEggsUntil?: string }[];
  cost?: { amountMinor: number; currency: string };
  followUpDate?: string;
  followUpDone?: boolean;
  dailyRecordId?: string;
}
interface Vaccination {
  id: string;
  flockId: string;
  vaccineName: string;
  dueDate: string;
  state: string;
  administeredDate?: string;
  birdsVaccinated?: number;
}
interface Reminder {
  kind: string;
  date: string;
  overdue: boolean;
  title: string;
  refId: string;
}

const STATE_TONE: Record<string, "mint" | "amber" | "rose" | "cyan"> = { done: "mint", due: "amber", overdue: "rose", scheduled: "cyan", skipped: "cyan" };

export function HealthPage() {
  const { can } = useAuth();
  const { currency, today } = useFarmInfo();
  const flocks = useFlocks().data?.items ?? [];
  const active = flocks.filter((f) => f.status === "active");
  const records = useFarmQuery<{ items: HealthRecord[] }>("/health/records");
  const vacc = useFarmQuery<{ items: Vaccination[] }>("/health/vaccinations");
  const reminders = useFarmQuery<{ items: Reminder[] }>("/health/reminders?days=30");
  const trends = useFarmQuery<{ days: { date: string; mortality: number }[]; totals: { mortality: number } }>(`/dashboard/trends?from=${addDays(today, -13)}&to=${today}`);
  const addRecord = useFarmMutation("POST", "/health/records", { success: "Health record saved" });
  const delRecord = useFarmMutation<{ _id: string }>("DELETE", (b) => `/health/records/${b._id}`, { success: "Record removed" });
  const followUp = useFarmMutation<{ _id: string }>("POST", (b) => `/health/records/${b._id}/follow-up-done`, { success: "Follow-up done" });
  const deaths = useFarmMutation<Record<string, unknown> & { _id: string }>("POST", (b) => `/flocks/${b._id}/mortality`, { success: "Deaths recorded" });
  const schedule = useFarmMutation("POST", "/health/vaccinations", { success: "Vaccination scheduled" });
  const administer = useFarmMutation<Record<string, unknown> & { _id: string }>("POST", (b) => `/health/vaccinations/${b._id}/administer`, { success: "Vaccination recorded" });
  const skip = useFarmMutation<{ _id: string; reason: string }>("POST", (b) => `/health/vaccinations/${b._id}/skip`, { success: "Vaccination skipped" });
  const [giving, setGiving] = useState<string | null>(null);
  const code = (id?: string) => (id ? flocks.find((f) => f.id === id)?.flockCode ?? "—" : "Whole farm");
  const days = trends.data?.days ?? [];
  const spend = (records.data?.items ?? []).reduce((t, r) => t + (r.cost?.amountMinor ?? 0), 0);
  const nextDue = (reminders.data?.items ?? [])[0];
  const flockOptions = active.map((f) => ({ value: f.id, label: `${f.flockCode} · ${f.name}` }));

  return (
    <>
      <PageHeader eyebrow="FlockHealth" title="Health, vaccination & mortality" subtitle="Every vet visit, vaccination, symptom and treatment, with mortality tracked alongside. PoultryPilot records what you and your vet observe; it does not diagnose." />
      <StatGrid>
        <Stat label="Deaths · last 14 days" value={num(trends.data?.totals.mortality)} badgeTone="rose" />
        <Stat label="Health records" value={num(records.data?.items.length)} badgeTone="cyan" />
        {can("money.read") ? <Stat label="Vet & medicine fees" value={money(spend, currency)} badgeTone="amber" hint="Fees entered on health records" /> : null}
        <Stat label="Next due" value={nextDue ? shortDate(nextDue.date) : "Nothing due"} badge={nextDue?.overdue ? "Overdue" : undefined} badgeTone="rose" hint={nextDue?.title ?? "No vaccinations or follow-ups in the next 30 days"} />
      </StatGrid>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <FormCard
          title="Add a health record"
          allowed={can("health.record_observation")}
          submitLabel="Save record"
          fields={[
            { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
            { name: "type", label: "Record type", type: "select", defaultValue: "observation", options: HEALTH_RECORD_TYPES.filter((t) => can("health.manage") || t === "observation").map((t) => ({ value: t, label: t === "observation" ? "Symptom observed" : label(t) })) },
            { name: "title", label: "Title", required: true, placeholder: "Coughing in house A" },
            { name: "flockId", label: "Flock", type: "select", defaultValue: "", options: [{ value: "", label: "Whole farm" }, ...flockOptions] },
            { name: "symptoms", label: "Symptoms", placeholder: "coughing, watery droppings", hint: "Separate with commas" },
            { name: "affectedBirds", label: "Birds affected", type: "number", min: 0 },
            { name: "vetName", label: "Vet name", show: (v) => v["type"] !== "observation" },
            { name: "assessment", label: "Vet's assessment", type: "textarea", show: (v) => v["type"] !== "observation", hint: "Recorded as said by the vet named above" },
            { name: "medicineName", label: "Treatment given (medicine)", show: (v) => v["type"] === "treatment" || v["type"] === "vet_visit" },
            { name: "durationDays", label: "For how many days", type: "number", min: 1, show: (v) => !!v["medicineName"] },
            { name: "withdrawalMeatDays", label: "Meat withdrawal (days)", type: "number", min: 0, show: (v) => !!v["medicineName"], hint: "From the label or your vet" },
            { name: "withdrawalEggDays", label: "Egg withdrawal (days)", type: "number", min: 0, show: (v) => !!v["medicineName"] },
            { name: "cost", label: `Cost (${currency})`, type: "money", min: 0, show: () => can("health.manage") },
            { name: "followUpDate", label: "Follow up on", type: "date" },
          ]}
          errorMap={{ "treatments.0.durationDays": "durationDays", "assessment.text": "assessment" }}
          onSubmit={({ symptoms, assessment, medicineName, durationDays, withdrawalMeatDays, withdrawalEggDays, cost, date, vetName, ...rest }) =>
            addRecord.mutateAsync({
              ...rest,
              date,
              ...(vetName ? { vetName } : {}),
              ...(symptoms ? { symptoms: String(symptoms).split(",").map((s) => s.trim().toLowerCase()).filter((s) => s.length >= 2) } : {}),
              ...(assessment ? { assessment: { text: assessment, by: vetName || "Vet", source: "veterinarian" } } : {}),
              ...(medicineName ? { treatments: [{ medicineName, startDate: date, durationDays: durationDays ?? 1, ...(withdrawalMeatDays !== undefined ? { withdrawalMeatDays, withdrawalSource: "veterinarian" } : {}), ...(withdrawalEggDays !== undefined ? { withdrawalEggDays, withdrawalSource: "veterinarian" } : {}) }] } : {}),
              ...(cost !== undefined ? { cost: { amountMinor: toMinor(Number(cost), currency), currency } } : {}),
            })
          }
        />
        <FormCard
          title="Record deaths"
          allowed={can("production.record")}
          submitLabel="Record deaths"
          fields={[
            { name: "_flock", label: "Flock", type: "select", required: true, defaultValue: active[0]?.id ?? "", options: [{ value: "", label: "Choose a flock" }, ...flockOptions] },
            { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
            { name: "count", label: "Birds lost", type: "number", required: true, min: 1 },
            { name: "cause", label: "Cause", type: "select", defaultValue: "unknown", options: MORTALITY_CAUSES.map((c) => ({ value: c, label: label(c) })) },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          onSubmit={({ _flock, ...rest }) => deaths.mutateAsync({ _id: String(_flock), ...rest })}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle hint="All flocks">Mortality · last 14 days</SectionTitle>
          <QueryState query={trends}>{() => <MiniBars values={days.map((d) => d.mortality)} labels={days.map((d) => d.date)} tone="rose" />}</QueryState>
          <div className="mt-2 flex justify-between text-[11px] text-inksoft"><span>14 days ago</span><span>Today</span></div>
        </GlassCard>
        <GlassCard>
          <SectionTitle hint="From your farm's vaccination plan">Vaccination schedule</SectionTitle>
          <QueryState query={vacc} isEmpty={(v) => !v.items.length} empty={<p className="py-4 text-center text-[13px] text-inksoft">No vaccinations scheduled.</p>}>
            {(v) => (
              <ul className="space-y-2">
                {v.items.slice(0, 8).map((x) => (
                  <li key={x.id} className="panel-inner rounded-xl p-3 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span><span className="font-semibold">{x.vaccineName}</span> <span className="text-inksoft">· {code(x.flockId)} · {shortDate(x.dueDate)}</span></span>
                      <span className="flex items-center gap-2">
                        <Badge tone={STATE_TONE[x.state] ?? "cyan"}>{label(x.state)}</Badge>
                        {x.state !== "done" && x.state !== "skipped" && can("health.vaccinate") ? <Button variant="glass" className="!px-2.5 !py-1" onClick={() => setGiving(giving === x.id ? null : x.id)}>Given</Button> : null}
                        {x.state !== "done" && x.state !== "skipped" && can("health.manage") ? <ConfirmButton confirmText="Skip it" onConfirm={() => skip.mutate({ _id: x.id, reason: "Skipped from the health page" })}>Skip</ConfirmButton> : null}
                      </span>
                    </div>
                    {giving === x.id ? (
                      <div className="mt-3 border-t border-white/60 pt-3">
                        <Form submitLabel="Record vaccination" fields={[{ name: "date", label: "Date given", type: "date", defaultValue: today, required: true }, { name: "birdsVaccinated", label: "Birds vaccinated", type: "number", min: 1 }, { name: "batchNumber", label: "Vaccine batch number" }, { name: "administeredBy", label: "Given by" }]}
                          onSubmit={async ({ batchNumber, ...rest }) => { await administer.mutateAsync({ _id: x.id, ...rest, ...(batchNumber ? { batches: [{ batchNumber }] } : {}) }); setGiving(null); }} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
          {can("health.manage") ? (
            <div className="mt-4 border-t border-white/60 pt-4">
              <p className="mb-2 text-[12px] font-medium text-inksoft">Schedule a vaccination</p>
              <Form submitLabel="Schedule" fields={[{ name: "flockId", label: "Flock", type: "select", required: true, defaultValue: active[0]?.id ?? "", options: flockOptions }, { name: "vaccineName", label: "Vaccine", required: true, placeholder: "Newcastle (La Sota)" }, { name: "dueDate", label: "Due", type: "date", required: true, defaultValue: today }, { name: "targetDisease", label: "Against" }]} onSubmit={(v) => schedule.mutateAsync(v)} />
            </div>
          ) : null}
        </GlassCard>
      </div>

      <GlassCard>
        <SectionTitle>Health history</SectionTitle>
        <QueryState query={records}>
          {(r) => (
            <DataTable
              rows={r.items}
              rowKey={(x) => x.id}
              empty="No health records yet."
              columns={[
                { key: "date", label: "Date", render: (x) => shortDate(x.date) },
                { key: "type", label: "Type", render: (x) => label(x.type) },
                { key: "title", label: "Record" },
                { key: "flock", label: "Flock", render: (x) => code(x.flockId) },
                { key: "treatment", label: "Treatment", render: (x) => x.treatments?.map((t) => `${t.medicineName ?? "Medicine"}${t.withdrawalMeatUntil ? ` · no sale until ${shortDate(t.withdrawalMeatUntil)}` : ""}`).join("; ") || "—", hideOnPhone: true },
                { key: "vetName", label: "Vet", hideOnPhone: true },
                ...(can("money.read") ? [{ key: "cost", label: "Cost", align: "right" as const, render: (x: HealthRecord) => (x.cost ? money(x.cost.amountMinor, x.cost.currency) : "—") }] : []),
                { key: "followUpDate", label: "Follow-up", render: (x) => (x.followUpDate ? (x.followUpDone ? "Done" : shortDate(x.followUpDate)) : "—") },
              ]}
              actions={(x) => (
                <span className="flex justify-end gap-3">
                  {x.followUpDate && !x.followUpDone && can("health.record_observation") ? <button type="button" className="text-[12px] font-medium text-mint-ink hover:underline" onClick={() => followUp.mutate({ _id: x.id })}>Follow-up done</button> : null}
                  {can("health.manage") && !x.dailyRecordId ? <ConfirmButton onConfirm={() => delRecord.mutate({ _id: x.id })} /> : null}
                </span>
              )}
            />
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
