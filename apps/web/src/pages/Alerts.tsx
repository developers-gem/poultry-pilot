import { useState } from "react";
import { useAuth } from "../api/auth";
import { useFarmInfo } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form } from "../components/forms";
import { EmptyState, QueryState } from "../components/states";
import { Badge, Button, GlassCard, PageHeader, SectionTitle, Stat, StatGrid, Tabs } from "../components/ui";
import { addDays, label, num, shortDate } from "../lib/format";

interface Alert { id: string; status: string; severity: "info" | "warning" | "critical"; title: string; message?: string; date: string; ruleType: string; acknowledgedAt?: string }
interface Rule { key: string; label: string; description: string; enabled: boolean; baseline: string; parameters: { key: string; label: string; unit?: string; value: number | null; min: number; max: number }[] }

const TONE = { critical: "rose", warning: "amber", info: "cyan" } as const;

export function AlertsPage() {
  const { can } = useAuth();
  const { today } = useFarmInfo();
  const [status, setStatus] = useState<"open" | "acknowledged" | "resolved">("open");
  const alerts = useFarmQuery<{ items: Alert[]; counts: { open: number; acknowledged: number; bySeverity: Record<string, number> } }>(`/alerts?status=${status}&limit=100`);
  const trends = useFarmQuery<{ days: { date: string; eggsCollected: number; mortality: number; feedKg: number; records: number }[] }>(`/dashboard/trends?from=${addDays(today, -7)}&to=${today}`);
  const rules = useFarmQuery<{ items: Rule[] }>("/alert-rules");
  const ack = useFarmMutation<{ _id: string }>("POST", (b) => `/alerts/${b._id}/acknowledge`, { success: "Marked as seen" });
  const evaluate = useFarmMutation("POST", "/alerts/evaluate", { success: "Checks finished" });
  const setRule = useFarmMutation<Record<string, unknown> & { _key: string }>("PUT", (b) => `/alert-rules/${b._key}`, { success: "Rule saved" });
  const [editing, setEditing] = useState<string | null>(null);
  const days = trends.data?.days ?? [];
  const todayRow = days.find((d) => d.date === today);
  const prior = days.filter((d) => d.date < today && d.records > 0);
  const avg = (k: "eggsCollected" | "mortality" | "feedKg") => (prior.length ? prior.reduce((t, d) => t + d[k], 0) / prior.length : null);
  const c = alerts.data?.counts;

  return (
    <>
      <PageHeader eyebrow="FarmAlert" title="Alerts" subtitle="PoultryPilot checks your records against your own farm's normal and warns you when something moves the wrong way." action={can("alert.manage") ? <Button variant="glass" onClick={() => evaluate.mutate(undefined)} disabled={evaluate.isPending}>{evaluate.isPending ? "Checking…" : "Check now"}</Button> : undefined} />
      <StatGrid>
        <Stat label="Open alerts" value={num(c?.open)} badgeTone={c?.open ? "rose" : "mint"} badge={c?.bySeverity["critical"] ? `${c.bySeverity["critical"]} critical` : undefined} />
        <Stat label="Eggs today" value={num(todayRow?.eggsCollected ?? 0)} hint={`Weekly average ${num(avg("eggsCollected"))}`} />
        <Stat label="Deaths today" value={num(todayRow?.mortality ?? 0)} hint={`Weekly average ${num(avg("mortality"), 1)}`} badgeTone="rose" />
        <Stat label="Feed today" value={`${num(todayRow?.feedKg ?? 0)} kg`} hint={`Weekly average ${num(avg("feedKg"))} kg`} badgeTone="accent" />
      </StatGrid>
      <Tabs value={status} onChange={setStatus} tabs={[{ id: "open", label: "Needs your attention", count: c?.open }, { id: "acknowledged", label: "Seen", count: c?.acknowledged }, { id: "resolved", label: "Resolved" }]} />
      <GlassCard className="mb-4">
        <QueryState query={alerts} isEmpty={(x) => !x.items.length} empty={<EmptyState title={status === "open" ? "No open alerts. Everything looks steady." : "Nothing here."} />}>
          {(x) => (
            <ul className="space-y-3">
              {x.items.map((a) => (
                <li key={a.id} className={`rounded-xl border p-4 ${a.severity === "critical" ? "border-rose/30 bg-rose/10" : a.severity === "warning" ? "border-amber/30 bg-amber/10" : "border-cyan/30 bg-cyan/10"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold">{a.title}</p>
                      {a.message ? <p className="mt-1 text-[13px] text-inksoft">{a.message}</p> : null}
                      <p className="mt-1 text-[11px] text-inksoft">{shortDate(a.date)} · {label(a.ruleType)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={TONE[a.severity]}>{label(a.severity)}</Badge>
                      {a.status === "open" && can("alert.manage") ? <Button variant="glass" className="!px-3 !py-1.5" onClick={() => ack.mutate({ _id: a.id })}>Mark seen</Button> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </GlassCard>
      <GlassCard>
        <SectionTitle hint="Each rule compares with your own farm's history; fixed limits apply only if you set them">Alert rules</SectionTitle>
        <QueryState query={rules}>
          {(x) => (
            <ul className="grid gap-2 md:grid-cols-2">
              {x.items.map((r) => (
                <li key={r.key} className="panel-inner rounded-xl p-3 text-[13px]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{r.label}</p>
                      <p className="text-[12px] text-inksoft">{r.description}</p>
                    </div>
                    {can("alert.manage") ? (
                      <label className="flex shrink-0 items-center gap-1.5 text-[12px]">
                        <input type="checkbox" checked={r.enabled} onChange={(e) => setRule.mutate({ _key: r.key, enabled: e.target.checked, parameters: Object.fromEntries(r.parameters.filter((p) => p.value !== null).map((p) => [p.key, p.value])) })} className="size-4 accent-[var(--color-brand)]" />
                        On
                      </label>
                    ) : <Badge tone={r.enabled ? "mint" : "cyan"}>{r.enabled ? "On" : "Off"}</Badge>}
                  </div>
                  {r.parameters.length && can("alert.manage") ? <button type="button" className="mt-2 text-[12px] font-medium text-brand-ink hover:underline" onClick={() => setEditing(editing === r.key ? null : r.key)}>{editing === r.key ? "Close" : "Adjust"}</button> : null}
                  {editing === r.key ? (
                    <div className="mt-3 border-t border-white/60 pt-3">
                      <Form
                        submitLabel="Save rule"
                        resetOnSuccess={false}
                        initial={Object.fromEntries(r.parameters.map((p) => [p.key, p.value ?? ""])) as never}
                        fields={r.parameters.map((p) => ({ name: p.key, label: `${p.label}${p.unit ? ` (${p.unit})` : ""}`, type: "number" as const, min: p.min, max: p.max, step: "any" as const }))}
                        onSubmit={async (v) => { await setRule.mutateAsync({ _key: r.key, enabled: r.enabled, parameters: v }); setEditing(null); }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
