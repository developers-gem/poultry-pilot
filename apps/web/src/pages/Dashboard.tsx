import { Link } from "@tanstack/react-router";
import { useAuth } from "../api/auth";
import { useFarmInfo, useFlockDetails, useFlocks } from "../api/farm";
import { useFarmQuery } from "../api/hooks";
import { CardQuery, EmptyState, ErrorState, QueryState, StatSkeleton } from "../components/states";
import { Badge, GlassCard, LinkButton, MiniBars, PageHeader, ProgressBar, SectionTitle, Stat, StatGrid } from "../components/ui";
import { addDays, label, money, num, pct, shortDate, weekday } from "../lib/format";

interface Dashboard {
  date: string;
  alerts: { open: number; bySeverity: Record<string, number>; latest: { id: string; severity: string; title: string; date: string }[] };
  production?: { totals: { birdsAlive: number; eggsCollected: number; eggsBroken: number; feedKg: number; henDayPercent: number | null; mortality: number }; flocksTotal: number; flocksRecorded: number } | { unavailable: string };
  upcoming?: { id: string; type: string; date: string; title: string; overdue: boolean }[] | { unavailable: string };
  inventory?: { feedDaysRemaining: number | null; lowStockItems: number } | { unavailable: string };
  hatchery?: { incubating: number; eggsIncubating: number; nextHatch: { code: string; date: string } | null } | { unavailable: string };
}
interface Trends {
  days: { date: string; eggsCollected: number; eggsBroken: number; feedKg: number; mortality: number }[];
}
interface FeedStock {
  totals: { quantityKg: number; valueMinor: number; daysRemaining: number | null };
}
interface Profitability {
  flocks: { flockId: string }[];
  totals: { revenueMinor: number; costMinor: number; profitMinor: number; costPerBirdMinor: number | null; costPerEggMinor: number | null };
}
interface Batch {
  id: string;
  code: string;
  setDate: string;
  status: string;
  eggsSet: number;
  counts: { hatched: number };
  metrics: { hatchOfSetPercent: number | null };
}

const ok = <T,>(x: T | { unavailable: string } | undefined): T | undefined => (x && !(typeof x === "object" && "unavailable" in (x as object)) ? (x as T) : undefined);

export function DashboardPage() {
  const { me, can } = useAuth();
  const { currency, today } = useFarmInfo();
  const dash = useFarmQuery<Dashboard>("/dashboard");
  const trends = useFarmQuery<Trends>(`/dashboard/trends?from=${addDays(today, -6)}&to=${today}`);
  const flocks = useFlocks("active");
  const active = flocks.data?.items ?? [];
  const details = useFlockDetails(active.map((f) => f.id));
  const stock = useFarmQuery<FeedStock>("/feed/stock", { enabled: can("inventory.read") });
  // Profit is only meaningful for batches that have been sold; an active batch has costs and no sales yet, so
  // adding it in shows a loss that is not one. Closed batches give the profit; active ones, what has been spent.
  const profit = useFarmQuery<Profitability>("/finance/reports/flock-profitability?status=closed", { enabled: can("money.read") });
  const spent = useFarmQuery<Profitability>("/finance/reports/flock-profitability?status=active", { enabled: can("money.read") });
  const batches = useFarmQuery<{ items: Batch[] }>("/hatchery/batches", { enabled: can("hatchery.read") });

  const d = dash.data;
  const prod = ok<NonNullable<Exclude<Dashboard["production"], { unavailable: string }>>>(d?.production);
  const days = trends.data?.days ?? [];
  const eggs = days.map((x) => x.eggsCollected);
  const prior = eggs.slice(0, -1).filter((_, i) => days[i]!.eggsCollected > 0 || days[i]!.eggsBroken > 0);
  const weekAvg = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : 0;
  const eggsToday = prod?.totals.eggsCollected ?? 0;
  const eggDelta = weekAvg ? ((eggsToday - weekAvg) / weekAvg) * 100 : null;
  const weighed = details.map((q) => q.data).filter((f): f is NonNullable<typeof f> => !!f?.metrics?.averageWeightG);
  const aliveWeighed = weighed.reduce((t, f) => t + f.metrics.currentBirdCount, 0);
  const avgWeightKg = aliveWeighed ? weighed.reduce((t, f) => t + (f.metrics.averageWeightG ?? 0) * f.metrics.currentBirdCount, 0) / aliveWeighed / 1000 : null;
  const feedTotals = stock.data?.totals;
  const feedLow = feedTotals?.daysRemaining !== null && feedTotals?.daysRemaining !== undefined && feedTotals.daysRemaining < 7;
  const upcoming = ok<NonNullable<Exclude<Dashboard["upcoming"], { unavailable: string }>>>(d?.upcoming) ?? [];
  const hatch = ok<NonNullable<Exclude<Dashboard["hatchery"], { unavailable: string }>>>(d?.hatchery);

  return (
    <>
      <PageHeader
        eyebrow={`Overview · ${num(active.length)} active flocks`}
        title={`Good day, ${me?.user.fullName.split(" ")[0] ?? "farmer"}`}
        subtitle={prod ? `${num(prod.totals.birdsAlive)} birds in production${feedTotals ? ` · ${num(feedTotals.quantityKg)} kg feed on hand` : ""} · ${num(eggsToday)} eggs logged today` : undefined}
        action={
          <>
            <LinkButton to="/eggs" variant="glass">Record egg count</LinkButton>
            <LinkButton to="/flocks">+ New batch</LinkButton>
          </>
        }
      />
      {dash.isError ? <ErrorState error={dash.error} onRetry={() => void dash.refetch()} /> : null}
      {!d ? (
        <StatSkeleton />
      ) : (
        <StatGrid>
          <Stat label="Average bird weight" value={avgWeightKg ? `${avgWeightKg.toFixed(2)} kg` : "No weights"} badge={weighed[0]?.metrics.latestWeighingDate ? shortDate(weighed[0].metrics.latestWeighingDate) : undefined} hint={weighed.length ? `${weighed.length} weighed flock${weighed.length > 1 ? "s" : ""}` : "Record a weigh-in on Weights"}>
            {weighed.length ? <div className="mt-3"><MiniBars values={weighed.map((f) => f.metrics.averageWeightG ?? 0)} labels={weighed.map((f) => f.flockCode)} height="h-8" /></div> : null}
          </Stat>
          <Stat label="Eggs today" value={num(eggsToday)} badge={eggDelta === null ? undefined : `${eggDelta >= 0 ? "+" : ""}${eggDelta.toFixed(1)}%`} badgeTone={eggDelta !== null && eggDelta < 0 ? "rose" : "mint"} hint={`${num(prod?.totals.eggsBroken ?? 0)} broken · hen-day ${pct(prod?.totals.henDayPercent)}`} />
          {can("inventory.read") ? (
            <Stat label="Feed inventory" value={feedTotals ? `${num(feedTotals.quantityKg)} kg` : "—"} badge={feedTotals ? (feedLow ? "Low" : "OK") : undefined} badgeTone={feedLow ? "amber" : "mint"} hint={feedTotals ? `Est. ${feedTotals.daysRemaining ?? "—"} days · ${feedTotals.quantityKg ? money(feedTotals.valueMinor / feedTotals.quantityKg, currency) : "—"} / kg` : "Loading stock…"} />
          ) : (
            <Stat label="Birds alive" value={num(prod?.totals.birdsAlive)} hint={`${num(prod?.flocksRecorded)} of ${num(prod?.flocksTotal)} flocks recorded today`} />
          )}
          {can("money.read") ? (
            profit.data && profit.data.flocks.length ? (
              <Stat label="Profit on sold batches" value={money(profit.data.totals.profitMinor, currency)} badge={`${num(profit.data.flocks.length)} closed`} badgeTone="accent" hint={spent.data ? `Plus ${money(spent.data.totals.costMinor, currency)} spent so far on ${num(active.length)} active batch${active.length === 1 ? "" : "es"}` : "Loading…"} />
            ) : (
              <Stat label="Spent on active batches" value={spent.data ? money(spent.data.totals.costMinor, currency) : "—"} badge={`${num(active.length)} batches`} badgeTone="accent" hint="Profit shows once a batch is sold" />
            )
          ) : (
            <Stat label="Open alerts" value={num(d.alerts.open)} badgeTone={d.alerts.open ? "rose" : "mint"} badge={d.alerts.bySeverity["critical"] ? `${d.alerts.bySeverity["critical"]} critical` : undefined} />
          )}
        </StatGrid>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <GlassCard>
            <SectionTitle hint="Live from today's records" action={<Link to="/flocks" className="text-[12px] font-medium text-inksoft hover:text-brand-ink">View all →</Link>}>Flock &amp; house status</SectionTitle>
            <QueryState query={flocks} isEmpty={(x) => !x.items.length} empty={<EmptyState title="No active flocks yet." body="Add your first batch on the Flocks page." action={<LinkButton to="/flocks">Add a batch</LinkButton>} />}>
              {() => (
                <div className="grid gap-3 sm:grid-cols-3">
                  {details.slice(0, 3).map((q, i) => {
                    const f = q.data;
                    const m = f?.metrics;
                    return (
                      <div key={active[i]!.id} className="panel-inner rounded-xl p-4">
                        <p className="truncate text-[11px] tracking-[0.15em] text-inksoft uppercase">{active[i]!.flockCode} · {label(active[i]!.type)}</p>
                        <p className="mt-2 font-display text-[20px] font-semibold tracking-tight">{m ? `${num(m.currentBirdCount)} birds` : "…"}</p>
                        <p className="mt-1 text-[12px] text-inksoft">Day {m?.ageDays ?? "—"} · {m?.eggsCollected ? `${num(m.eggsCollected)} eggs to date` : `${num(m?.mortalityCount ?? 0)} deaths`}</p>
                        <div className="mt-3"><ProgressBar value={m?.survivalRate ?? 0} label={`Survival of ${active[i]!.flockCode}`} /></div>
                        <p className="mt-1.5 text-[11px] font-medium text-mint-ink">{pct(m?.survivalRate)} survival</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </QueryState>
          </GlassCard>

          <GlassCard>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-[16px] font-semibold tracking-tight">Egg production · last 7 days</h2>
                <p className="text-[12px] text-inksoft">Collected vs. broken</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-inksoft">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan" />Collected</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose/70" />Broken</span>
              </div>
            </div>
            <QueryState query={trends}>
              {(t) => {
                const max = Math.max(1, ...t.days.map((x) => x.eggsCollected));
                return (
                  <div className="flex h-40 items-end justify-between gap-2 sm:gap-3" role="img" aria-label={t.days.map((x) => `${x.date}: ${x.eggsCollected} collected, ${x.eggsBroken} broken`).join("; ")}>
                    {t.days.map((x, i) => (
                      <div key={x.date} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-32 w-full items-end gap-1">
                          <span className="flex-1 rounded-t-md bg-cyan/80" style={{ height: `${Math.max(2, (x.eggsCollected / max) * 100)}%` }} />
                          <span className="flex-1 rounded-t-md bg-rose/40" style={{ height: `${Math.max(2, (x.eggsBroken / max) * 100)}%` }} />
                        </div>
                        <span className="text-[11px] text-inksoft">{i === t.days.length - 1 ? "Today" : weekday(x.date)}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            </QueryState>
          </GlassCard>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-rose" /><h2 className="font-display text-[15px] font-semibold tracking-tight">Farm alerts</h2></div>
              <Link to="/alerts" className="text-[12px] font-medium text-inksoft hover:text-brand-ink">All</Link>
            </div>
            {!d ? null : d.alerts.latest.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-inksoft">No open alerts. Everything looks steady.</p>
            ) : (
              <div className="space-y-3">
                {d.alerts.latest.slice(0, 3).map((a) => (
                  <Link to="/alerts" key={a.id} className={`block rounded-xl border p-3 ${a.severity === "critical" ? "border-rose/30 bg-rose/12" : a.severity === "warning" ? "border-amber/30 bg-amber/10" : "border-cyan/30 bg-cyan/10"}`}>
                    <p className="text-[13px] font-semibold">{a.title}</p>
                    <p className="mt-1 text-[12px] text-inksoft">{label(a.severity)} · {shortDate(a.date)}</p>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="mb-3 font-display text-[15px] font-semibold tracking-tight">FeedWise · consumption</h2>
            <MiniBars values={days.map((x) => x.feedKg)} labels={days.map((x) => x.date)} tone="accent" />
            <div className="mt-2 mb-4 flex items-center justify-between text-[11px] text-inksoft"><span>7 days ago</span><span>Today</span></div>
            {can("money.read") ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="panel-inner rounded-xl p-3"><p className="text-[11px] text-inksoft">Cost per bird</p><p className="mt-1 font-display text-[17px] font-semibold tracking-tight">{money(profit.data?.totals.costPerBirdMinor, currency)}</p></div>
                <div className="panel-inner rounded-xl p-3"><p className="text-[11px] text-inksoft">Cost per egg</p><p className="mt-1 font-display text-[17px] font-semibold tracking-tight">{money(profit.data?.totals.costPerEggMinor, currency)}</p></div>
              </div>
            ) : null}
          </GlassCard>

          {can("hatchery.read") ? (
            <GlassCard>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-[15px] font-semibold tracking-tight">Hatchery</h2>
                {hatch ? <Badge tone="cyan">{num(hatch.eggsIncubating)} eggs in</Badge> : null}
              </div>
              <QueryState query={batches} isEmpty={(x) => !x.items.length} empty={<p className="py-4 text-center text-[13px] text-inksoft">No incubation batches yet.</p>}>
                {(b) => (
                  <div className="space-y-2 text-[12px]">
                    {b.items.slice(0, 3).map((x) => (
                      <div key={x.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-inksoft">{x.code} · set {shortDate(x.setDate)}</span>
                        <span className="font-semibold">{x.metrics.hatchOfSetPercent !== null ? pct(x.metrics.hatchOfSetPercent) : label(x.status)}</span>
                      </div>
                    ))}
                    {hatch?.nextHatch ? <p className="pt-1 text-inksoft">Next hatch: {hatch.nextHatch.code} on {shortDate(hatch.nextHatch.date)}</p> : null}
                  </div>
                )}
              </QueryState>
            </GlassCard>
          ) : null}

          <CardQuery title="Coming up" query={dash} isEmpty={() => !upcoming.length} empty={<p className="py-3 text-center text-[13px] text-inksoft">Nothing scheduled this week.</p>}>
            {() => (
              <ul className="space-y-2 text-[12px]">
                {upcoming.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{e.title}</span>
                    <span className={`shrink-0 ${e.overdue ? "font-semibold text-rose-ink" : "text-inksoft"}`}>{e.overdue ? "Overdue" : shortDate(e.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardQuery>
        </div>
      </div>
    </>
  );
}
