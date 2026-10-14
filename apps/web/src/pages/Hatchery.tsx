import { useState } from "react";
import { useAuth } from "../api/auth";
import { LAYING, useFarmInfo, useFlocks } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form, FormCard, type FieldDef } from "../components/forms";
import { EmptyState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, Button, GlassCard, PageHeader, ProgressBar, SectionTitle, Stat, StatGrid } from "../components/ui";
import { daysBetween, label, money, num, pct, shortDate, toMinor } from "../lib/format";

interface Batch {
  id: string;
  code: string;
  eggSource: string;
  setDate: string;
  incubationDays: number;
  expectedTransferDate: string;
  expectedHatchDate: string;
  status: string;
  eggsSet: number;
  counts: { infertile: number; cracked: number; deadEmbryo: number; hatched: number; deadInShell: number; culled: number; saleable: number; inIncubation: number; stage: "incubating" | "in_hatcher" | "hatched" | "graded" };
  metrics: { fertilityPercent: number | null; hatchabilityPercent: number | null; hatchOfSetPercent: number | null; saleableChickPercent: number | null };
  chicksBooked: number;
  chickLotId?: string;
}
interface Summary {
  batches: { incubating: number; hatched: number };
  eggsIncubating: number;
  completed: { eggsSet: number; hatched: number; saleable: number; hatchOfSetPercent: number | null; fertilityPercent: number | null; hatchabilityPercent: number | null };
}
interface Order {
  id: string;
  orderNumber: number;
  status: string;
  quantity: number;
  total: { amountMinor: number; currency: string };
  buyerName?: string;
  requestedDeliveryDate?: string;
  hatcheryBatchId?: string;
  /** Present on marketplace order views; derived from status for chick orders listed here. */
  nextStatuses?: string[];
  fulfilment?: string;
}

/** Chick orders are pickup orders by default: pending → accepted → delivered (the API enforces the same rules). */
const nextFor = (o: Order) => o.nextStatuses ?? ({ pending: ["accepted", "cancelled"], accepted: ["delivered", "cancelled"], preparing: ["delivered", "cancelled"] } as Record<string, string[]>)[o.status] ?? [];

type Step = "candling" | "transfer" | "hatch" | "grading";
const NEXT: Record<Batch["counts"]["stage"], Step[]> = { incubating: ["candling", "transfer", "hatch"], in_hatcher: ["hatch"], hatched: ["grading"], graded: [] };
const STEP_LABEL: Record<Step, string> = { candling: "Candling", transfer: "Move to hatcher", hatch: "Record hatch", grading: "Grade chicks" };

function stepFields(step: Step, b: Batch, today: string): FieldDef[] {
  const date: FieldDef = { name: "date", label: "Date", type: "date", defaultValue: today, required: true };
  if (step === "candling") return [date, { name: "infertile", label: "Infertile (clear)", type: "number", min: 0, defaultValue: 0 }, { name: "deadEmbryo", label: "Dead embryos", type: "number", min: 0, defaultValue: 0 }, { name: "cracked", label: "Cracked", type: "number", min: 0, defaultValue: 0 }];
  if (step === "transfer") return [date, { name: "deadEmbryo", label: "Dead embryos found", type: "number", min: 0, defaultValue: 0 }, { name: "cracked", label: "Cracked", type: "number", min: 0, defaultValue: 0 }];
  if (step === "hatch") return [date, { name: "hatched", label: "Chicks hatched", type: "number", required: true, min: 0 }, { name: "deadInShell", label: "Dead in shell", type: "number", min: 0, hint: `Leave empty: the rest of the ${num(b.counts.inIncubation)} eggs count as dead in shell` }];
  return [date, { name: "saleable", label: "Saleable chicks", type: "number", required: true, min: 0, defaultValue: b.counts.hatched }, { name: "culled", label: "Culled", type: "number", min: 0, defaultValue: 0, hint: `Saleable + culled must equal ${num(b.counts.hatched)} hatched` }];
}

export function HatcheryPage() {
  const { can } = useAuth();
  const { currency, today } = useFarmInfo();
  const batches = useFarmQuery<{ items: Batch[] }>("/hatchery/batches");
  const summary = useFarmQuery<Summary>("/hatchery/summary");
  const orders = useFarmQuery<{ items: Order[] }>("/chick-orders", { enabled: can("market.read") });
  const buyers = useFarmQuery<{ items: { id: string; name: string }[] }>("/buyers", { enabled: can("market.read") });
  const laying = (useFlocks("active").data?.items ?? []).filter((f) => LAYING.has(f.type));
  const add = useFarmMutation("POST", "/hatchery/batches", { success: "Batch set" });
  const stage = useFarmMutation<Record<string, unknown> & { _id: string; _step: Step }>("POST", (b) => `/hatchery/batches/${b._id}/${b._step}`, { success: "Recorded" });
  const addOrder = useFarmMutation("POST", "/chick-orders", { success: "Order recorded" });
  const orderAct = useFarmMutation<{ _id: string; _act: string; date?: string }>("POST", (b) => `/chick-orders/${b._id}/${b._act}`, { success: "Order updated" });
  const [open, setOpen] = useState<{ id: string; step: Step } | null>(null);
  const s = summary.data;
  const incubating = (batches.data?.items ?? []).filter((b) => b.counts.stage === "incubating" || b.counts.stage === "in_hatcher");

  return (
    <>
      <PageHeader eyebrow="HatcheryHub" title="Incubation & chick orders" subtitle="Eggs set, hatch dates, results, and who the day-old chicks are going to." />
      <StatGrid>
        <Stat label="Eggs in the machines" value={num(s?.eggsIncubating)} hint={`${num(s?.batches.incubating)} batches incubating`} badgeTone="cyan" />
        <Stat label="Chicks hatched" value={num(s?.completed.hatched)} badge={s ? `${num(s.completed.saleable)} saleable` : undefined} badgeTone="mint" hint="Completed batches" />
        <Stat label="Hatch rate" value={pct(s?.completed.hatchOfSetPercent)} badgeTone="accent" hint={s ? `Fertility ${pct(s.completed.fertilityPercent)} · hatchability ${pct(s.completed.hatchabilityPercent)}` : undefined} />
        <Stat label="Chicks booked" value={num(incubating.reduce((t, b) => t + b.chicksBooked, 0))} badgeTone="amber" hint="On open orders for batches still incubating" />
      </StatGrid>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <FormCard
          title="Set a new batch"
          allowed={can("hatchery.manage")}
          submitLabel="Set batch"
          fields={[
            { name: "code", label: "Batch code", required: true, placeholder: "HB-014" },
            { name: "eggSource", label: "Eggs from", type: "select", defaultValue: "purchased", options: [{ value: "purchased", label: "Bought in" }, { value: "own_flock", label: "Our own flock" }] },
            { name: "sourceFlockId", label: "Flock", type: "select", defaultValue: laying[0]?.id ?? "", options: laying.map((f) => ({ value: f.id, label: `${f.flockCode} · ${f.name}` })), show: (v) => v["eggSource"] === "own_flock", hint: "The eggs leave your egg stock" },
            { name: "supplier", label: "Supplier", show: (v) => v["eggSource"] === "purchased" },
            { name: "eggsReceived", label: "Eggs received", type: "number", required: true, min: 1 },
            { name: "rejectedCracked", label: "Rejected: cracked", type: "number", min: 0 },
            { name: "rejectedOther", label: "Rejected: dirty or misshapen", type: "number", min: 0 },
            { name: "setDate", label: "Set date", type: "date", defaultValue: today, required: true },
            { name: "eggCost", label: `Egg cost (${currency})`, type: "money", min: 0 },
          ]}
          onSubmit={({ rejectedCracked, rejectedOther, eggCost, ...rest }) =>
            add.mutateAsync({ ...rest, ...(rejectedCracked || rejectedOther ? { rejects: { ...(rejectedCracked ? { cracked: rejectedCracked } : {}), ...(rejectedOther ? { dirty: rejectedOther } : {}) } } : {}), ...(eggCost !== undefined ? { eggCost: { amountMinor: toMinor(Number(eggCost), currency), currency } } : {}) })
          }
        />
        <GlassCard>
          <SectionTitle hint="Days set and expected transfer and hatch">Incubation calendar</SectionTitle>
          {incubating.length === 0 ? <EmptyState title="Nothing in the incubator." /> : (
            <div className="space-y-3">
              {incubating.map((b) => {
                const day = Math.max(0, daysBetween(b.setDate, today));
                return (
                  <div key={b.id}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-semibold">{b.code}</span>
                      <span className="text-inksoft">Day {day} of {b.incubationDays} · move {shortDate(b.expectedTransferDate)} · hatch {shortDate(b.expectedHatchDate)}</span>
                    </div>
                    <ProgressBar value={(day / b.incubationDays) * 100} tone={day >= b.incubationDays ? "amber" : "brand"} />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="mb-4">
        <SectionTitle hint="Every egg is accounted for: infertile, cracked, dead embryo, dead in shell, culled or saleable">Hatch results</SectionTitle>
        <QueryState query={batches} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No batches yet." body="Set your first batch above." />}>
          {(x) => (
            <div className="space-y-2">
              {x.items.map((b) => (
                <div key={b.id} className="panel-inner rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px]">
                      <span className="font-semibold">{b.code}</span> <span className="text-inksoft">· set {shortDate(b.setDate)} · {num(b.eggsSet)} eggs</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={b.status === "cancelled" ? "rose" : b.counts.stage === "graded" ? "mint" : "cyan"}>{label(b.counts.stage)}</Badge>
                      {b.status !== "cancelled" && can("hatchery.record") ? NEXT[b.counts.stage].map((st) => (
                        <Button key={st} variant="glass" className="!px-3 !py-1.5" onClick={() => setOpen(open?.id === b.id && open.step === st ? null : { id: b.id, step: st })}>{STEP_LABEL[st]}</Button>
                      )) : null}
                    </div>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-[12px] sm:grid-cols-6">
                    {([["Infertile", b.counts.infertile], ["Dead embryo", b.counts.deadEmbryo], ["Cracked", b.counts.cracked], ["Hatched", b.counts.hatched], ["Dead in shell", b.counts.deadInShell], ["Saleable", b.counts.saleable]] as const).map(([k, v]) => (
                      <div key={k}><dt className="text-inksoft">{k}</dt><dd className="font-semibold">{num(v)}</dd></div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[12px] text-inksoft">Fertility {pct(b.metrics.fertilityPercent)} · hatchability {pct(b.metrics.hatchabilityPercent)} · hatch of set {pct(b.metrics.hatchOfSetPercent)} · saleable {pct(b.metrics.saleableChickPercent)}</p>
                  {open?.id === b.id ? (
                    <div className="mt-3 border-t border-white/60 pt-3">
                      <Form submitLabel={STEP_LABEL[open.step]} fields={stepFields(open.step, b, today)} onSubmit={async (v) => { await stage.mutateAsync({ _id: b.id, _step: open.step, ...v }); setOpen(null); }} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </GlassCard>

      {can("market.read") ? (
        <>
          <div className="mb-4">
            <FormCard
              title="Record a chick order"
              allowed={can("market.manage")}
              description={buyers.data?.items.length ? undefined : "Add buyers on the Market page first."}
              submitLabel="Record order"
              fields={[
                { name: "buyerId", label: "Buyer", type: "select", required: true, defaultValue: "", options: [{ value: "", label: "Choose a buyer" }, ...(buyers.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))] },
                { name: "hatcheryBatchId", label: "From batch", type: "select", required: true, defaultValue: incubating[0]?.id ?? "", options: incubating.map((x) => ({ value: x.id, label: `${x.code} · hatch ${shortDate(x.expectedHatchDate)}` })) },
                { name: "quantity", label: "Chicks", type: "number", required: true, min: 1 },
                { name: "unitPrice", label: `Price per chick (${currency})`, type: "money", required: true, min: 0 },
                { name: "requestedDeliveryDate", label: "Delivery date", type: "date" },
              ]}
              onSubmit={({ unitPrice, ...rest }) => addOrder.mutateAsync({ ...rest, unitPrice: { amountMinor: toMinor(Number(unitPrice), currency), currency } })}
            />
          </div>
          <GlassCard>
            <SectionTitle>Chick orders & deliveries</SectionTitle>
            <QueryState query={orders}>
              {(o) => (
                <DataTable
                  rows={o.items}
                  rowKey={(r) => r.id}
                  empty="No chick orders yet."
                  columns={[
                    { key: "orderNumber", label: "Order", render: (r) => `#${r.orderNumber}` },
                    { key: "buyerName", label: "Buyer" },
                    { key: "quantity", label: "Chicks", align: "right", render: (r) => num(r.quantity) },
                    { key: "total", label: "Value", align: "right", render: (r) => money(r.total.amountMinor, r.total.currency) },
                    { key: "requestedDeliveryDate", label: "Delivery", render: (r) => shortDate(r.requestedDeliveryDate) },
                    { key: "status", label: "Status", render: (r) => label(r.status) },
                  ]}
                  actions={can("market.manage") ? (r) => (
                    <span className="flex justify-end gap-3 text-[12px] font-medium">
                      {nextFor(r).includes("accepted") ? <button type="button" className="text-brand-ink hover:underline" onClick={() => orderAct.mutate({ _id: r.id, _act: "confirm" })}>Confirm</button> : null}
                      {nextFor(r).includes("delivered") ? <button type="button" className="text-mint-ink hover:underline" onClick={() => orderAct.mutate({ _id: r.id, _act: "deliver", date: today })}>Delivered today</button> : null}
                    </span>
                  ) : undefined}
                />
              )}
            </QueryState>
          </GlassCard>
        </>
      ) : null}
    </>
  );
}
