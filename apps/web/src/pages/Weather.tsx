import { Link } from "@tanstack/react-router";
import { ApiError } from "../api/client";
import { useFarmInfo } from "../api/farm";
import { useFarmQuery } from "../api/hooks";
import { EmptyState, ErrorState, LoadingState, StatSkeleton } from "../components/states";
import { Badge, GlassCard, LinkButton, MiniBars, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { addDays, label, num, shortDate, weekday } from "../lib/format";

interface Day { date: string; tempMaxC?: number; tempMinC?: number; rainMm?: number; windMaxKph?: number; humidityMaxPercent?: number; humidityMinPercent?: number }
interface Weather {
  location: { label: string | null };
  provider: string;
  fetchedAt: string;
  stale: boolean;
  current: { temperatureC?: number; humidityPercent?: number; rainMm?: number; windKph?: number; observedAt: string };
  forecast: Day[];
  history: Day[];
  risks: { date: string; kind: string; value: number; reason: string }[];
  baseline: { avgMaxC: number | null; avgMinC: number | null; days: number };
}

export function WeatherPage() {
  const { today } = useFarmInfo();
  const w = useFarmQuery<Weather>("/weather?historyDays=30");
  const trends = useFarmQuery<{ days: { date: string; mortality: number; waterLitres: number; feedKg: number }[] }>(`/dashboard/trends?from=${addDays(today, -7)}&to=${addDays(today, -1)}`);
  const noLocation = w.error instanceof ApiError && /location/i.test(w.error.message);
  const x = w.data;
  const week = (x?.history ?? []).slice(-7);
  return (
    <>
      <PageHeader eyebrow="Farm Weather" title="Temperature, humidity & rainfall" subtitle="Live conditions and a 7-day forecast for your farm, judged against your own recent weather, alongside what your flocks did." />
      {noLocation ? (
        <GlassCard><EmptyState title="Set your farm's location to see weather." body="Add the farm's location on the Farm page (you can use your phone's location)." action={<LinkButton to="/farm-profile">Set location</LinkButton>} /></GlassCard>
      ) : w.isError ? <ErrorState error={w.error} onRetry={() => void w.refetch()} /> : !x ? <><StatSkeleton /><LoadingState /></> : (
        <>
          {x.stale ? <p className="mb-4 rounded-xl bg-amber/12 px-4 py-2 text-[13px] text-amber-ink">The weather service isn't answering, so this is the last forecast received ({new Date(x.fetchedAt).toLocaleString()}).</p> : null}
          <StatGrid>
            <Stat label="Temperature now" value={x.current.temperatureC !== undefined ? `${num(x.current.temperatureC, 1)} °C` : "—"} hint={x.location.label ?? undefined} badgeTone="amber" />
            <Stat label="Humidity now" value={x.current.humidityPercent !== undefined ? `${num(x.current.humidityPercent)}%` : "—"} badgeTone="cyan" />
            <Stat label="Rain today" value={x.forecast[0]?.rainMm !== undefined ? `${num(x.forecast[0].rainMm, 1)} mm` : "—"} badgeTone="brand" hint={x.current.windKph !== undefined ? `Wind ${num(x.current.windKph)} km/h` : undefined} />
            <Stat label="Weather risks ahead" value={num(x.risks.length)} badge={x.risks.length ? "Check" : "None"} badgeTone={x.risks.length ? "rose" : "mint"} hint={x.baseline.avgMaxC !== null ? `Your recent average high: ${num(x.baseline.avgMaxC, 1)} °C` : "Building your farm's weather history"} />
          </StatGrid>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <h2 className="font-display text-lg font-semibold text-amber-ink">Last 7 days — high temperature (°C)</h2>
              {week.length ? <div className="mt-3"><MiniBars values={week.map((d) => d.tempMaxC ?? 0)} labels={week.map((d) => d.date)} tone="amber" /></div> : <p className="mt-3 text-[13px] text-inksoft">History builds up from the day weather is first loaded.</p>}
              <h2 className="mt-6 font-display text-lg font-semibold text-cyan-ink">Last 7 days — rainfall (mm)</h2>
              {week.length ? <div className="mt-3"><MiniBars values={week.map((d) => d.rainMm ?? 0)} labels={week.map((d) => d.date)} tone="cyan" /></div> : null}
            </GlassCard>
            <GlassCard>
              <h2 className="mb-3 font-display text-lg font-semibold text-brand-ink">Next 7 days forecast</h2>
              <ul className="space-y-1.5">
                {x.forecast.map((d) => (
                  <li key={d.date} className="panel-inner grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 rounded-xl px-3 py-2 text-[13px]">
                    <span className="font-medium">{d.date === today ? "Today" : weekday(d.date)}</span>
                    <span className="text-inksoft">{num(d.tempMinC)}–{num(d.tempMaxC)} °C{d.humidityMaxPercent !== undefined ? ` · ${num(d.humidityMinPercent)}–${num(d.humidityMaxPercent)}% RH` : ""}</span>
                    <span className="text-[12px] text-inksoft">{d.rainMm ? `${num(d.rainMm, 1)} mm` : "dry"}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
          <GlassCard>
            <SectionTitle hint="Forecast days unusual for your farm, and what your flocks did last week">Climate impact on your flocks</SectionTitle>
            {x.risks.length ? (
              <ul className="mb-4 space-y-2">
                {x.risks.map((r) => <li key={`${r.date}${r.kind}`} className="rounded-xl border border-rose/25 bg-rose/8 p-3 text-[13px]"><Badge tone="rose">{label(r.kind)}</Badge> <span className="font-semibold">{shortDate(r.date)}:</span> {r.reason}</li>)}
              </ul>
            ) : <p className="mb-4 text-[13px] text-inksoft">No unusual weather in the forecast for your farm.</p>}
            {trends.data ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="panel-inner rounded-xl p-3"><p className="text-[11px] text-inksoft">Deaths, last 7 days</p><p className="font-display text-[18px] font-semibold">{num(trends.data.days.reduce((t, d) => t + d.mortality, 0))}</p></div>
                <div className="panel-inner rounded-xl p-3"><p className="text-[11px] text-inksoft">Water drunk</p><p className="font-display text-[18px] font-semibold">{num(trends.data.days.reduce((t, d) => t + d.waterLitres, 0))} L</p></div>
                <div className="panel-inner rounded-xl p-3"><p className="text-[11px] text-inksoft">Feed eaten</p><p className="font-display text-[18px] font-semibold">{num(trends.data.days.reduce((t, d) => t + d.feedKg, 0))} kg</p></div>
              </div>
            ) : null}
            <p className="mt-4 text-[11px] text-inksoft">Weather data from {x.provider}, updated {new Date(x.fetchedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}. Warnings follow your <Link to="/alerts" className="underline">weather alert settings</Link>.</p>
          </GlassCard>
        </>
      )}
    </>
  );
}
