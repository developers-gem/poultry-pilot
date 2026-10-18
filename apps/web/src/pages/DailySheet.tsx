import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFarm } from "../api/auth";
import { ApiError, authedRequest } from "../api/client";
import { useFarmQuery } from "../api/hooks";
import { EmptyState, QueryState } from "../components/states";
import { GlassCard, PageHeader } from "../components/ui";
import { num, shortDate } from "../lib/format";

/**
 * The day's paper sheet, in one screen: one row per flock, the figures in columns, one save. Built for the
 * supervisor or manager who copies the house sheets into the system at the end of the day (instead of visiting
 * the eggs, feed and health pages for every flock). Only cells that are filled in are sent; everything else on the
 * day (deaths by cause, feed entered elsewhere, photos) is left as it is.
 */

const EGGS_PER_TRAY = 30;
interface Summary {
  mortality: number;
  feedKg: number;
  waterLitres: number | null;
  eggsCollected: number | null;
  eggsBroken: number | null;
}
interface SheetFlock {
  flockId: string;
  flockCode: string;
  name: string;
  houseName: string | null;
  expectedBirds: number;
  laying: boolean;
  record: { version: number; summary: Summary; recordedByName: string | null; lastChangedByName: string | null } | null;
  previous: Summary | null;
}
interface Sheet {
  date: string;
  today: string;
  editWindowStart: string;
  flocks: SheetFlock[];
}
interface StockItem {
  itemId: string;
  name: string;
  quantityKg: number;
  bagSizeKg: number | null;
}
type Cells = Partial<Record<"deaths" | "feed" | "water" | "trays" | "loose" | "broken" | "tmin" | "tmax", string>>;
type RowResult = { ok: true } | { ok: false; message: string };

const n = (v: string | undefined) => (v === undefined || v.trim() === "" ? undefined : Number(v));

/** The PATCH body for a row: only the sections whose cells were filled in. */
export function rowPatch(c: Cells, feed: { itemId?: string; bagSizeKg: number | null } | null): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (n(c.deaths) !== undefined) p["mortality"] = n(c.deaths)! > 0 ? [{ cause: "unknown", count: n(c.deaths) }] : [];
  if (n(c.feed) !== undefined) {
    const kg = n(c.feed)! * (feed?.bagSizeKg ?? 1);
    p["feed"] = kg > 0 ? [{ quantityKg: kg, ...(feed?.itemId ? { feedItemId: feed.itemId } : {}) }] : [];
  }
  if (n(c.water) !== undefined) p["waterLitres"] = n(c.water);
  if (n(c.trays) !== undefined || n(c.loose) !== undefined || n(c.broken) !== undefined) {
    p["eggs"] = { collected: (n(c.trays) ?? 0) * EGGS_PER_TRAY + (n(c.loose) ?? 0), broken: n(c.broken) ?? 0 };
  }
  if (n(c.tmin) !== undefined) p["temperatureMinC"] = n(c.tmin);
  if (n(c.tmax) !== undefined) p["temperatureMaxC"] = n(c.tmax);
  return p;
}

function Cell({ value, onChange, placeholder, label, step = "any", width = "w-20" }: { value?: string; onChange: (v: string) => void; placeholder?: string; label: string; step?: string; width?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      aria-label={label}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`panel-inner ${width} rounded-lg px-2 py-2 text-right text-[14px] tabular-nums placeholder:text-inksoft/60`}
    />
  );
}

export default function DailySheet() {
  const farm = useFarm();
  const qc = useQueryClient();
  const [date, setDate] = useState<string | null>(null);
  const sheet = useFarmQuery<Sheet>(`/daily-records/sheet${date ? `?date=${date}` : ""}`);
  const stock = useFarmQuery<{ items: StockItem[] }>("/feed/stock");
  const [feedItemId, setFeedItemId] = useState<string | null>(null);
  const [cells, setCells] = useState<Record<string, Cells>>({});
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [saving, setSaving] = useState(false);

  const items = stock.data?.items ?? [];
  const feed = items.find((i) => i.itemId === (feedItemId ?? items[0]?.itemId)) ?? null;
  const inBags = !!feed?.bagSizeKg;
  const set = (flockId: string, key: keyof Cells, v: string) => setCells((c) => ({ ...c, [flockId]: { ...c[flockId], [key]: v } }));
  const changed = Object.entries(cells).filter(([, c]) => Object.values(c).some((v) => v !== undefined && v.trim() !== ""));

  async function saveAll(s: Sheet) {
    setSaving(true);
    const out: Record<string, RowResult> = {};
    for (const [flockId, c] of changed) {
      const row = s.flocks.find((f) => f.flockId === flockId);
      const body = { ...rowPatch(c, feed ? { itemId: feed.itemId, bagSizeKg: inBags ? feed.bagSizeKg : null } : null), ...(row?.record ? { version: row.record.version } : {}) };
      try {
        await authedRequest(`/farms/${farm.farmId}/flocks/${flockId}/daily-records/${s.date}`, { method: "PATCH", body: JSON.stringify(body) });
        out[flockId] = { ok: true };
      } catch (e) {
        out[flockId] = { ok: false, message: e instanceof ApiError && e.code === "VERSION_CONFLICT" ? "Changed by someone else meanwhile: reload and check" : e instanceof Error ? e.message : "Could not save" };
      }
    }
    setResults(out);
    setCells((c) => Object.fromEntries(Object.entries(c).filter(([id]) => !out[id]?.ok)));
    await qc.invalidateQueries({ queryKey: ["farm", farm.farmId] });
    setSaving(false);
  }

  return (
    <>
      <PageHeader eyebrow="Production" title="Daily sheet" subtitle="Every flock's day on one screen: type the figures from the house sheets and save once." />
      <QueryState query={sheet}>
        {(s) =>
          !s.flocks.length ? (
            <EmptyState title="No active flocks" body="Place a flock first, then record its days here." />
          ) : (
            <GlassCard>
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] tracking-[0.15em] text-inksoft uppercase">Date</span>
                  <input type="date" value={s.date} min={s.editWindowStart} max={s.today} onChange={(e) => { setDate(e.target.value); setCells({}); setResults({}); }} className="panel-inner rounded-xl px-3 py-2.5 text-[14px]" />
                </label>
                {items.length ? (
                  <label className="block">
                    <span className="mb-1 block text-[11px] tracking-[0.15em] text-inksoft uppercase">Feed given</span>
                    <select value={feed?.itemId ?? ""} onChange={(e) => setFeedItemId(e.target.value)} className="panel-inner rounded-xl px-3 py-2.5 text-[14px]">
                      {items.map((i) => <option key={i.itemId} value={i.itemId}>{i.name}{i.bagSizeKg ? ` (bags of ${num(i.bagSizeKg)} kg)` : ""}</option>)}
                    </select>
                  </label>
                ) : null}
                <p className="text-[12px] text-inksoft">Grey figures are already recorded; only the cells you fill in are saved. Deaths entered here are recorded without a cause.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] tracking-[0.12em] text-inksoft uppercase">
                      <th className="py-2 pr-3">Flock</th>
                      <th className="px-1">Deaths</th>
                      <th className="px-1">Feed ({inBags ? "bags" : "kg"})</th>
                      <th className="px-1">Water (L)</th>
                      <th className="px-1">Egg trays</th>
                      <th className="px-1">Loose eggs</th>
                      <th className="px-1">Broken</th>
                      <th className="px-1">Min °C</th>
                      <th className="px-1">Max °C</th>
                      <th className="px-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {s.flocks.map((f) => {
                      const r = f.record?.summary;
                      const c = cells[f.flockId] ?? {};
                      const res = results[f.flockId];
                      const bag = inBags ? feed!.bagSizeKg! : 1;
                      const eggsRecorded = r?.eggsCollected ?? null;
                      return (
                        <tr key={f.flockId} className="border-t border-black/5 align-middle">
                          <td className="py-2 pr-3">
                            <div className="font-semibold">{f.flockCode}</div>
                            <div className="text-[11px] text-inksoft">{f.houseName ?? ""} · {num(f.expectedBirds)} birds</div>
                            <div className="text-[11px] text-inksoft">{f.record ? `Recorded by ${f.record.lastChangedByName ?? f.record.recordedByName ?? "someone"}` : "Not recorded yet"}</div>
                          </td>
                          <td className="px-1"><Cell label={`Deaths, ${f.flockCode}`} step="1" value={c.deaths} onChange={(v) => set(f.flockId, "deaths", v)} placeholder={r ? String(r.mortality) : f.previous ? `yday ${f.previous.mortality}` : ""} width="w-16" /></td>
                          <td className="px-1"><Cell label={`Feed, ${f.flockCode}`} value={c.feed} onChange={(v) => set(f.flockId, "feed", v)} placeholder={r?.feedKg ? num(r.feedKg / bag, 1) : f.previous?.feedKg ? `yday ${num(f.previous.feedKg / bag, 1)}` : ""} /></td>
                          <td className="px-1"><Cell label={`Water, ${f.flockCode}`} value={c.water} onChange={(v) => set(f.flockId, "water", v)} placeholder={r?.waterLitres != null ? num(r.waterLitres) : ""} /></td>
                          {f.laying ? (
                            <>
                              <td className="px-1"><Cell label={`Egg trays, ${f.flockCode}`} step="1" value={c.trays} onChange={(v) => set(f.flockId, "trays", v)} placeholder={eggsRecorded != null ? String(Math.floor(eggsRecorded / EGGS_PER_TRAY)) : ""} width="w-16" /></td>
                              <td className="px-1"><Cell label={`Loose eggs, ${f.flockCode}`} step="1" value={c.loose} onChange={(v) => set(f.flockId, "loose", v)} placeholder={eggsRecorded != null ? String(eggsRecorded % EGGS_PER_TRAY) : ""} width="w-16" /></td>
                              <td className="px-1"><Cell label={`Broken eggs, ${f.flockCode}`} step="1" value={c.broken} onChange={(v) => set(f.flockId, "broken", v)} placeholder={r?.eggsBroken != null ? String(r.eggsBroken) : ""} width="w-16" /></td>
                            </>
                          ) : (
                            <td className="px-1 text-center text-inksoft" colSpan={3}>not laying</td>
                          )}
                          <td className="px-1"><Cell label={`Minimum temperature, ${f.flockCode}`} value={c.tmin} onChange={(v) => set(f.flockId, "tmin", v)} width="w-16" /></td>
                          <td className="px-1"><Cell label={`Maximum temperature, ${f.flockCode}`} value={c.tmax} onChange={(v) => set(f.flockId, "tmax", v)} width="w-16" /></td>
                          <td className="px-1 text-[12px]" aria-live="polite">{res ? (res.ok ? <span className="text-mint-ink">Saved</span> : <span className="text-rose-ink">{res.message}</span>) : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[12px] text-inksoft">{changed.length ? `${changed.length} flock${changed.length === 1 ? "" : "s"} changed for ${shortDate(s.date)}` : "Nothing changed yet"}</span>
                <button type="button" disabled={!changed.length || saving} onClick={() => saveAll(s)} className="rounded-xl bg-ink px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-40">
                  {saving ? "Saving…" : changed.length ? `Save ${changed.length} ${changed.length === 1 ? "flock" : "flocks"}` : "Save"}
                </button>
              </div>
            </GlassCard>
          )
        }
      </QueryState>
    </>
  );
}
