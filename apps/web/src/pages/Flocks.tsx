import { FLOCK_TYPES, HOUSE_TYPES } from "@poultrypilot/constants";
import { Link } from "@tanstack/react-router";
import { useAuth } from "../api/auth";
import { useFarmInfo, useFlockDetails, useFlocks, feedFigure } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { FormCard } from "../components/forms";
import { EmptyState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, ConfirmButton, GlassCard, PageHeader, SectionTitle } from "../components/ui";
import { label, money, num, toMinor } from "../lib/format";

interface House {
  id: string;
  name: string;
  type: string;
  capacityBirds?: number;
  status: string;
  version: number;
}

export function FlocksPage() {
  const { can } = useAuth();
  const { currency, today } = useFarmInfo();
  const houses = useFarmQuery<{ items: House[] }>("/houses");
  const flocks = useFlocks();
  const list = (flocks.data?.items ?? []).filter((f) => f.status !== "archived");
  const details = useFlockDetails(list.filter((f) => f.status !== "planned").map((f) => f.id));
  const metricsOf = (id: string) => details.find((q) => q.data?.id === id)?.data?.metrics;
  const addFlock = useFarmMutation("POST", "/flocks", { success: "Batch added" });
  const addHouse = useFarmMutation("POST", "/houses", { success: "House added" });
  const delFlock = useFarmMutation<{ _id: string }>("DELETE", (b) => `/flocks/${b._id}`, { success: "Batch removed" });
  const delHouse = useFarmMutation<{ _id: string }>("DELETE", (b) => `/houses/${b._id}`, { success: "House removed" });
  const houseName = (id: string) => houses.data?.items.find((h) => h.id === id)?.name ?? "—";
  const houseOptions = (houses.data?.items ?? []).filter((h) => h.status === "active").map((h) => ({ value: h.id, label: h.name }));

  return (
    <>
      <PageHeader eyebrow="BroilerProfit" title="Flocks & batch profit" subtitle="Weight gain, feed use, costs and expected profit for every batch." />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <FormCard
          title="Add a flock or batch"
          allowed={can("flock.manage")}
          description={houseOptions.length ? "Birds are placed now if you give a count; leave it empty to plan the batch for later." : "Add a house first: every batch lives in a house."}
          submitLabel="Add batch"
          fields={[
            { name: "name", label: "Batch name", required: true, placeholder: "Broilers October" },
            { name: "flockCode", label: "Batch code (optional)", placeholder: "Leave empty", hint: "Left empty, the farm numbers it (e.g. B-2610-1)" },
            { name: "type", label: "Bird type", type: "select", defaultValue: "broiler", options: FLOCK_TYPES.map((t) => ({ value: t, label: t === "chick" ? "Day-old chicks" : label(t) })) },
            { name: "customTypeName", label: "Which poultry?", placeholder: "Kadaknath, geese…", show: (v) => v["type"] === "custom" },
            { name: "breed", label: "Breed", placeholder: "Cobb 500" },
            { name: "houseId", label: "House", type: "select", required: true, defaultValue: houseOptions[0]?.value ?? "", options: [{ value: "", label: "Choose a house" }, ...houseOptions] },
            { name: "count", label: "Number of birds placed", type: "number", min: 1 },
            { name: "date", label: "Placement date", type: "date", defaultValue: today },
            { name: "hatchDate", label: "Hatch date", type: "date" },
            { name: "targetSaleDate", label: "Target sale date", type: "date" },
            { name: "chickCost", label: `Cost of stock (${currency})`, type: "money", min: 0 },
            { name: "startingWeightG", label: "Average weight at placement (g)", type: "number", min: 1 },
          ]}
          errorMap={{ "placement.count": "count", "placement.date": "date", "placement.chickCost": "chickCost", "placement.startingWeightG": "startingWeightG" }}
          onSubmit={({ count, date, chickCost, startingWeightG, ...rest }) =>
            addFlock.mutateAsync({
              ...rest,
              ...(count ? { placement: { count, date: date ?? today, ...(chickCost !== undefined ? { chickCost: { amountMinor: toMinor(Number(chickCost), currency), currency } } : {}), ...(startingWeightG ? { startingWeightG } : {}) } } : {}),
            })
          }
        />
        <FormCard
          title="Add a house"
          allowed={can("flock.manage")}
          submitLabel="Add house"
          fields={[
            { name: "name", label: "House name", required: true, placeholder: "House A" },
            { name: "type", label: "Purpose", type: "select", defaultValue: "broiler", options: HOUSE_TYPES.map((t) => ({ value: t, label: label(t) })) },
            { name: "capacityBirds", label: "Capacity (birds)", type: "number", min: 1 },
            { name: "floorAreaM2", label: "Floor area (m²)", type: "number", min: 1 },
          ]}
          onSubmit={(v) => addHouse.mutateAsync(v)}
        />
      </div>

      <GlassCard className="mb-4">
        <SectionTitle hint="From each batch's records: birds, feed, weighings, costs and sales">Batch performance</SectionTitle>
        <QueryState query={flocks} isEmpty={() => !list.length} empty={<EmptyState title="No batches yet." body="Add one above." />}>
          {() => (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((f) => {
                const m = metricsOf(f.id);
                return (
                  <div key={f.id} className="panel-inner rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-[17px] font-semibold tracking-tight">{f.name}</p>
                        <p className="text-[12px] text-inksoft">{label(f.type)} · {f.breed ?? "no breed"} · {m?.ageDays !== null && m?.ageDays !== undefined ? `day ${m.ageDays}` : label(f.status)}</p>
                        <p className="text-[12px] text-inksoft">{houseName(f.houseId)} · {f.flockCode}</p>
                      </div>
                      {f.status === "planned" && can("flock.manage") ? <ConfirmButton onConfirm={() => delFlock.mutate({ _id: f.id })} /> : <Badge tone={f.status === "active" ? "mint" : "cyan"}>{label(f.status)}</Badge>}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      <div><dt className="text-inksoft">Live birds</dt><dd className="font-semibold">{num(m?.currentBirdCount ?? f.currentBirdCount)}</dd></div>
                      <div><dt className="text-inksoft">Feed used</dt><dd className="font-semibold">{m ? `${num(m.feedConsumedKg)} kg` : "—"}</dd></div>
                      {(() => {
                        const ff = feedFigure(f.type, m);
                        return <div title={ff.note ?? undefined}><dt className="text-inksoft">{ff.label}</dt><dd className={`font-semibold ${ff.note ? "text-amber-ink" : ""}`}>{ff.value}</dd></div>;
                      })()}
                      <div><dt className="text-inksoft">Avg weight</dt><dd className="font-semibold">{m?.averageWeightG ? `${num(m.averageWeightG)} g` : "—"}</dd></div>
                      {can("money.read") ? (
                        <>
                          <div><dt className="text-inksoft">Costs</dt><dd className="font-semibold">{m ? money(m.cost.totalMinor, currency) : "—"}</dd></div>
                          <div><dt className="text-inksoft">{f.status === "closed" ? "Profit" : "Profit so far"}</dt><dd className={`font-semibold ${m && m.profitMinor < 0 ? "text-rose-ink" : "text-mint-ink"}`}>{m ? money(m.profitMinor, currency) : "—"}</dd></div>
                        </>
                      ) : null}
                    </dl>
                    {m && !m.costsComplete && can("money.read") ? <p className="mt-2 text-[11px] text-amber-ink">Some feed has no price yet, so costs are incomplete.</p> : null}
                    {f.status !== "planned" ? <Link to="/lifecycle" className="mt-3 inline-block text-[12px] font-medium text-inksoft hover:text-brand-ink">Lifecycle & sale →</Link> : null}
                  </div>
                );
              })}
            </div>
          )}
        </QueryState>
      </GlassCard>

      <GlassCard>
        <SectionTitle>Houses</SectionTitle>
        <QueryState query={houses}>
          {(h) => (
            <DataTable
              rows={h.items}
              rowKey={(r) => r.id}
              empty="No houses yet."
              columns={[
                { key: "name", label: "House" },
                { key: "type", label: "Purpose", render: (r) => label(r.type) },
                { key: "capacityBirds", label: "Capacity", align: "right", render: (r) => (r.capacityBirds ? num(r.capacityBirds) : "—") },
                { key: "flocks", label: "Active batches", align: "right", render: (r) => num(list.filter((f) => f.houseId === r.id && f.status === "active").length) },
                { key: "status", label: "Status", render: (r) => label(r.status) },
              ]}
              actions={can("flock.manage") ? (r) => (list.some((f) => f.houseId === r.id && (f.status === "active" || f.status === "planned")) ? <span className="text-[11px] text-inksoft">In use</span> : <ConfirmButton onConfirm={() => delHouse.mutate({ _id: r.id })} />) : undefined}
            />
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
