import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth, useFarm } from "../api/auth";
import { authedRequest } from "../api/client";
import { useFarmInfo, useFlocks, type Flock, type FlockMetrics } from "../api/farm";
import { useFarmMutation } from "../api/hooks";
import { Form } from "../components/forms";
import { EmptyState, QueryState, StatSkeleton } from "../components/states";
import { Button, GlassCard, PageHeader, Stat, StatGrid } from "../components/ui";
import { label, money, num, pct, toMinor } from "../lib/format";

/** Stage bands as in the prototype; the current stage comes from the API (metrics.stage). */
const STAGES = [
  { key: "brooding", label: "Brooding", to: 14 },
  { key: "grow_out", label: "Grow-out", to: 35 },
  { key: "finishing", label: "Finishing", to: 48 },
  { key: "closed", label: "Sale", to: 49 },
];

function useMetrics(flocks: Flock[], pricePerKgMinor: number | null) {
  const farm = useFarm();
  return useQuery({
    queryKey: ["farm", farm.farmId, "lifecycle", flocks.map((f) => f.id).join(","), pricePerKgMinor],
    enabled: flocks.length > 0,
    queryFn: async () => Promise.all(flocks.map(async (f) => ({ flock: f, m: await authedRequest<FlockMetrics>(`/farms/${farm.farmId}/flocks/${f.id}/metrics${pricePerKgMinor ? `?referencePricePerKgMinor=${pricePerKgMinor}` : ""}`) }))),
  });
}

export function LifecyclePage() {
  const { can } = useAuth();
  const { currency, today } = useFarmInfo();
  const flocks = useFlocks();
  const running = (flocks.data?.items ?? []).filter((f) => f.status === "active" || f.status === "closed");
  const [price, setPrice] = useState("");
  const priceMinor = price ? toMinor(Number(price), currency) : null;
  const metrics = useMetrics(running, priceMinor);
  const [open, setOpen] = useState<{ id: string; action: "sale" | "close" } | null>(null);
  const sell = useFarmMutation<Record<string, unknown> & { _id: string }>("POST", (b) => `/flocks/${b._id}/sales`, { success: "Sale recorded" });
  const close = useFarmMutation<{ _id: string; date: string }>("POST", (b) => `/flocks/${b._id}/close`, { success: "Batch closed" });
  const rows = metrics.data ?? [];
  const active = rows.filter((r) => r.flock.status === "active");
  const placed = rows.reduce((t, r) => t + r.m.birdsIn, 0);
  const alive = rows.reduce((t, r) => t + r.m.currentBirdCount, 0);
  const deaths = rows.reduce((t, r) => t + r.m.mortalityCount, 0);
  const totalCost = rows.reduce((t, r) => t + r.m.cost.totalMinor, 0);
  const totalProfit = rows.reduce((t, r) => t + (r.flock.status === "active" && r.m.projectedProfitMinor !== null ? r.m.projectedProfitMinor : r.m.profitMinor), 0);
  const m = (x: number | null | undefined) => money(x, currency);

  return (
    <>
      <PageHeader
        eyebrow="BroilerProfit"
        title="Batch lifecycle"
        subtitle="Hatch to sale for every batch: chick survival, grow-out, weigh-ins, sale price and profit against real costs."
        action={can("money.read") ? (
          <label className="text-[12px] text-inksoft">
            Live price per kg ({currency})
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} step="0.01" inputMode="decimal" placeholder="for projections" className="panel-inner ml-2 w-28 rounded-xl px-3 py-2 text-[13px]" />
          </label>
        ) : undefined}
      />
      {!metrics.data && running.length ? <StatSkeleton /> : (
        <StatGrid>
          <Stat label="Batches running" value={num(active.length)} hint={`${num(rows.length - active.length)} closed`} />
          <Stat label="Survival" value={placed ? pct(((placed - deaths) / placed) * 100) : "—"} badge={`${num(alive)} alive`} badgeTone="mint" hint={`${num(deaths)} deaths of ${num(placed)} placed`} />
          {can("money.read") ? (
            <>
              <Stat label="Costs to date" value={m(totalCost)} hint="Chicks, feed eaten, health and batch charges." />
              <Stat label={priceMinor ? "Profit incl. birds on farm" : "Profit to date"} value={m(totalProfit)} badgeTone={totalProfit < 0 ? "rose" : "mint"} badge={totalProfit < 0 ? "Loss" : "Gain"} hint={priceMinor ? `Birds still on the farm valued at ${m(priceMinor)}/kg` : "Enter a live price to include birds still on the farm"} />
            </>
          ) : null}
        </StatGrid>
      )}
      <GlassCard>
        <h2 className="mb-4 font-display text-[16px] font-semibold tracking-tight">Every batch, hatch to sale</h2>
        <QueryState query={flocks} isEmpty={() => !running.length} empty={<EmptyState title="No placed batches yet." body="Place birds from the Flocks page to follow them here." />}>
          {() => (
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map(({ flock: f, m: x }) => {
                const stageIdx = Math.max(0, STAGES.findIndex((s) => s.key === (f.status === "closed" ? "closed" : x.stage)));
                return (
                  <div key={f.id} className="panel-inner rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-[17px] font-semibold tracking-tight">{f.name}</p>
                        <p className="text-[12px] text-inksoft">{f.status === "closed" ? `Closed ${f.closedDate ?? ""}` : `${label(x.stage)} · day ${x.ageDays ?? "—"}`}</p>
                      </div>
                      {f.status === "active" ? (
                        <div className="flex gap-1">
                          {can("flock.sell") ? <Button variant="glass" className="!px-3 !py-1.5" onClick={() => setOpen(open?.id === f.id && open.action === "sale" ? null : { id: f.id, action: "sale" })}>Record sale</Button> : null}
                          {can("flock.manage") ? <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setOpen(open?.id === f.id && open.action === "close" ? null : { id: f.id, action: "close" })}>Close</Button> : null}
                        </div>
                      ) : null}
                    </div>
                    <ol className="mt-3 flex gap-1" aria-label="Stage">
                      {STAGES.map((s, i) => (
                        <li key={s.key} className={`flex-1 rounded-md px-1 py-1 text-center text-[10px] font-medium ${i < stageIdx ? "bg-brand/25 text-brand-ink" : i === stageIdx ? "bg-brand text-white" : "bg-black/5 text-inksoft"}`} aria-current={i === stageIdx ? "step" : undefined}>
                          {s.label}
                        </li>
                      ))}
                    </ol>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
                      <div><dt className="text-inksoft">Chicks placed</dt><dd className="font-semibold">{num(x.birdsIn)}</dd></div>
                      <div><dt className="text-inksoft">Survival</dt><dd className="font-semibold">{pct(x.survivalRate)}</dd></div>
                      <div><dt className="text-inksoft">Live now</dt><dd className="font-semibold">{num(x.currentBirdCount)}</dd></div>
                      <div><dt className="text-inksoft">Avg weight</dt><dd className="font-semibold">{x.averageWeightG ? `${num(x.averageWeightG)} g` : "—"}</dd></div>
                      <div><dt className="text-inksoft">Daily gain</dt><dd className="font-semibold">{x.dailyWeightGainG ? `${num(x.dailyWeightGainG, 1)} g` : "—"}</dd></div>
                      <div><dt className="text-inksoft">Feed used</dt><dd className="font-semibold">{num(x.feedConsumedKg)} kg</dd></div>
                      <div><dt className="text-inksoft">Feed ratio</dt><dd className="font-semibold">{x.fcr ? x.fcr.toFixed(2) : "—"}</dd></div>
                      <div><dt className="text-inksoft">Weight produced</dt><dd className="font-semibold">{x.weightProducedKg ? `${num(x.weightProducedKg)} kg` : "—"}</dd></div>
                    </dl>
                    {can("money.read") ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                        <div className="rounded-lg bg-white/50 p-2"><p className="text-inksoft">Costs</p><p className="font-display text-[15px] font-semibold">{m(x.cost.totalMinor)}</p><p className="text-[11px] text-inksoft">{m(x.costPerBirdMinor)} / bird</p></div>
                        <div className="rounded-lg bg-white/50 p-2"><p className="text-inksoft">Sales</p><p className="font-display text-[15px] font-semibold">{m(x.revenueMinor)}</p></div>
                        <div className="rounded-lg bg-white/50 p-2"><p className="text-inksoft">{f.status === "active" && x.projectedProfitMinor !== null ? "Expected profit" : "Profit"}</p><p className={`font-display text-[15px] font-semibold ${(x.projectedProfitMinor ?? x.profitMinor) < 0 ? "text-rose-ink" : "text-mint-ink"}`}>{m(f.status === "active" && x.projectedProfitMinor !== null ? x.projectedProfitMinor : x.profitMinor)}</p></div>
                      </div>
                    ) : null}
                    {open?.id === f.id && open.action === "sale" ? (
                      <div className="mt-4 border-t border-white/60 pt-4">
                        <Form
                          submitLabel="Record sale"
                          fields={[
                            { name: "date", label: "Sale date", type: "date", defaultValue: today, required: true },
                            { name: "birds", label: "Birds sold", type: "number", required: true, min: 1, max: x.currentBirdCount },
                            { name: "totalLiveWeightKg", label: "Total live weight (kg)", type: "number", min: 0 },
                            { name: "priceBasis", label: "Price", type: "select", defaultValue: "pricePerKg", options: [{ value: "pricePerKg", label: "Per kg" }, { value: "pricePerBird", label: "Per bird" }, { value: "total", label: "Total for the sale" }] },
                            { name: "price", label: `Amount (${currency})`, type: "money", required: true, min: 0 },
                            { name: "notes", label: "Buyer / notes", type: "textarea" },
                          ]}
                          errorMap={{ pricePerKg: "price", pricePerBird: "price", total: "price" }}
                          onSubmit={async ({ priceBasis, price: p, ...rest }) => {
                            await sell.mutateAsync({ _id: f.id, ...rest, [String(priceBasis)]: { amountMinor: toMinor(Number(p), currency), currency } });
                            setOpen(null);
                          }}
                        />
                      </div>
                    ) : null}
                    {open?.id === f.id && open.action === "close" ? (
                      <div className="mt-4 border-t border-white/60 pt-4">
                        <p className="mb-2 text-[12px] text-inksoft">Closing ends the batch. Every bird must be sold, moved or recorded as dead first.</p>
                        <Form columns={1} submitLabel="Close batch" fields={[{ name: "date", label: "Closing date", type: "date", defaultValue: today, required: true }]} onSubmit={async (v) => { await close.mutateAsync({ _id: f.id, date: String(v["date"]) }); setOpen(null); }} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
