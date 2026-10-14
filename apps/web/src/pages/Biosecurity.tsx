import { BIOSECURITY_ENTRY_TYPES, CLEANING_SCHEDULES, PEST_TYPES, VISITOR_TYPES } from "@poultrypilot/constants";
import { useState } from "react";
import { useAuth } from "../api/auth";
import { useFarmInfo } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form, FormCard } from "../components/forms";
import { EmptyState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, Button, GlassCard, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { label, num, shortDate } from "../lib/format";

interface Summary {
  visitorsToday: number;
  visitorsOnSite: number;
  flaggedVisitorsLast7Days: number;
  openCorrectiveActions: number;
  overdueCorrectiveActions: number;
  cleaningOverdue: number;
  cleaningDueToday: number;
  failedChecksLast7Days: number;
  lastFootbathCheck: string | null;
}
interface Visitor { id: string; name: string; company?: string; type: string; purpose?: string; checkInAt: string; checkOutAt?: string; flags?: string[]; downtimeHours?: number }
interface Log { id: string; type: string; date: string; houseId?: string; performedBy?: string; details?: string; footbath?: { action: string }; vehicle?: { registration: string; disinfected: boolean }; pest?: { pestType: string; activityFound: boolean }; wildBird?: { description: string }; product?: { name?: string } }
interface Schedule { id: string; title: string; activity: string; schedule: string; nextDueDate?: string; lastDoneDate?: string; active: boolean }
interface Action { id: string; title: string; status: string; priority: string; dueDate?: string; completedBy?: string; resolutionNotes?: string }

export function BiosecurityPage() {
  const { can, me } = useAuth();
  const { today } = useFarmInfo();
  const summary = useFarmQuery<Summary>("/biosecurity/summary");
  const visitors = useFarmQuery<{ items: Visitor[] }>("/biosecurity/visitors");
  const logs = useFarmQuery<{ items: Log[] }>("/biosecurity/logs?limit=100");
  const schedules = useFarmQuery<{ items: Schedule[] }>("/biosecurity/cleaning-schedules");
  const actions = useFarmQuery<{ items: Action[] }>("/biosecurity/corrective-actions");
  const houses = useFarmQuery<{ items: { id: string; name: string }[] }>("/houses");
  const checkIn = useFarmMutation("POST", "/biosecurity/visitors", { success: "Visitor checked in" });
  const checkOut = useFarmMutation<{ _id: string }>("POST", (b) => `/biosecurity/visitors/${b._id}/check-out`, { success: "Visitor checked out" });
  const addLog = useFarmMutation("POST", "/biosecurity/logs", { success: "Entry saved" });
  const addSchedule = useFarmMutation("POST", "/biosecurity/cleaning-schedules", { success: "Cleaning task added" });
  const complete = useFarmMutation<{ _id: string; date: string }>("POST", (b) => `/biosecurity/cleaning-schedules/${b._id}/complete`, { success: "Marked done" });
  const finishAction = useFarmMutation<{ _id: string; resolutionNotes: string }>("POST", (b) => `/biosecurity/corrective-actions/${b._id}/complete`, { success: "Action completed" });
  const verify = useFarmMutation<{ _id: string }>("POST", (b) => `/biosecurity/corrective-actions/${b._id}/verify`, { success: "Action verified" });
  const [resolving, setResolving] = useState<string | null>(null);
  const s = summary.data;
  const houseName = (id?: string) => houses.data?.items.find((h) => h.id === id)?.name ?? "—";
  const houseOpts = [{ value: "", label: "Whole farm" }, ...(houses.data?.items ?? []).map((h) => ({ value: h.id, label: h.name }))];
  const detail = (l: Log) => l.footbath ? `Footbath ${label(l.footbath.action).toLowerCase()}` : l.vehicle ? `${l.vehicle.registration}${l.vehicle.disinfected ? " · disinfected" : " · not disinfected"}` : l.pest ? `${label(l.pest.pestType)}${l.pest.activityFound ? " · activity found" : ""}` : l.wildBird ? l.wildBird.description : l.product?.name ?? l.details ?? "—";

  return (
    <>
      <PageHeader eyebrow="BioSecure Farm" title="Biosecurity checks & logs" subtitle="Cleaning tasks for workers, plus a record of every visitor, vehicle and check on the farm." />
      <StatGrid>
        <Stat label="Cleaning due" value={num((s?.cleaningDueToday ?? 0) + (s?.cleaningOverdue ?? 0))} badge={s?.cleaningOverdue ? `${s.cleaningOverdue} overdue` : "on time"} badgeTone={s?.cleaningOverdue ? "rose" : "mint"} />
        <Stat label="Visitors today" value={num(s?.visitorsToday)} badge={s?.visitorsOnSite ? `${s.visitorsOnSite} on site` : undefined} badgeTone="cyan" hint={s?.flaggedVisitorsLast7Days ? `${s.flaggedVisitorsLast7Days} flagged this week` : "None flagged this week"} />
        <Stat label="Open corrective actions" value={num(s?.openCorrectiveActions)} badge={s?.overdueCorrectiveActions ? `${s.overdueCorrectiveActions} overdue` : undefined} badgeTone="amber" />
        <Stat label="Last footbath check" value={s?.lastFootbathCheck ? shortDate(s.lastFootbathCheck) : "None yet"} hint={s ? `${num(s.failedChecksLast7Days)} failed checks this week` : undefined} badgeTone="accent" />
      </StatGrid>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <FormCard
          title="Check in a visitor"
          allowed={can("biosecurity.record")}
          submitLabel="Check in"
          fields={[
            { name: "name", label: "Visitor name", required: true },
            { name: "company", label: "Company" },
            { name: "type", label: "Visitor type", type: "select", defaultValue: "supplier", options: VISITOR_TYPES.map((t) => ({ value: t, label: label(t) })) },
            { name: "purpose", label: "Purpose" },
            { name: "hadContact", label: "Been near other poultry recently", type: "checkbox" },
            { name: "lastContactAt", label: "Last poultry contact", type: "date", show: (v) => !!v["hadContact"] },
            { name: "footbathUsed", label: "Used the footbath", type: "checkbox" },
            { name: "disinfected", label: "Hands/boots disinfected", type: "checkbox" },
            { name: "vehicleRegistration", label: "Vehicle number" },
          ]}
          errorMap={{ "previousPoultryContact.lastContactAt": "lastContactAt" }}
          onSubmit={({ hadContact, lastContactAt, ...rest }) => checkIn.mutateAsync({ ...rest, previousPoultryContact: { hadContact: !!hadContact, ...(lastContactAt ? { lastContactAt: new Date(`${lastContactAt}T12:00:00`).toISOString() } : {}) } })}
        />
        <FormCard
          title="Add a biosecurity entry"
          allowed={can("biosecurity.record")}
          submitLabel="Save entry"
          fields={[
            { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
            { name: "type", label: "Entry", type: "select", defaultValue: "cleaning", options: BIOSECURITY_ENTRY_TYPES.map((t) => ({ value: t, label: label(t) })) },
            { name: "houseId", label: "House", type: "select", defaultValue: "", options: houseOpts },
            { name: "performedBy", label: "Done by" },
            { name: "productName", label: "Product used", show: (v) => v["type"] === "cleaning" || v["type"] === "disinfection" },
            { name: "footbathAction", label: "Footbath", type: "select", defaultValue: "checked", options: [{ value: "changed", label: "Changed" }, { value: "checked", label: "Checked" }, { value: "topped_up", label: "Topped up" }], show: (v) => v["type"] === "footbath" },
            { name: "registration", label: "Vehicle number", required: true, show: (v) => v["type"] === "vehicle" },
            { name: "vehicleDisinfected", label: "Vehicle disinfected", type: "checkbox", show: (v) => v["type"] === "vehicle" },
            { name: "pestType", label: "Pest", type: "select", defaultValue: "rodents", options: PEST_TYPES.map((p) => ({ value: p, label: label(p) })), show: (v) => v["type"] === "pest_control" },
            { name: "activityFound", label: "Activity found", type: "checkbox", show: (v) => v["type"] === "pest_control" },
            { name: "birdDescription", label: "What was seen", required: true, show: (v) => v["type"] === "wild_bird_observation" },
            { name: "contactWithPoultry", label: "Wild birds touched poultry", type: "checkbox", show: (v) => v["type"] === "wild_bird_observation" },
            { name: "details", label: "Details", type: "textarea" },
          ]}
          errorMap={{ "vehicle.registration": "registration", "wildBird.description": "birdDescription" }}
          onSubmit={({ productName, footbathAction, registration, vehicleDisinfected, pestType, activityFound, birdDescription, contactWithPoultry, houseId, ...rest }) => {
            const t = rest["type"];
            return addLog.mutateAsync({
              ...rest,
              ...(houseId ? { houseId } : {}),
              ...(productName ? { product: { name: productName } } : {}),
              ...(t === "footbath" ? { footbath: { action: footbathAction ?? "checked" } } : {}),
              ...(t === "vehicle" ? { vehicle: { registration, disinfected: !!vehicleDisinfected } } : {}),
              ...(t === "pest_control" ? { pest: { pestType: pestType ?? "rodents", activityFound: !!activityFound } } : {}),
              ...(t === "wild_bird_observation" ? { wildBird: { description: birdDescription, contactWithPoultry: !!contactWithPoultry } } : {}),
            });
          }}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle hint="Mark tasks done as they are completed; the next date moves on by itself">Worker cleaning checklist</SectionTitle>
          <QueryState query={schedules} isEmpty={(x) => !x.items.filter((i) => i.active).length} empty={<EmptyState title="No cleaning tasks set up." body="Add your cleaning and disinfection routine below." />}>
            {(x) => (
              <ul className="space-y-2">
                {x.items.filter((i) => i.active).map((t) => {
                  const overdue = t.nextDueDate && t.nextDueDate < today;
                  const due = t.nextDueDate && t.nextDueDate <= today;
                  return (
                    <li key={t.id} className="panel-inner flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-[13px]">
                      <span>
                        <span className="font-semibold">{t.title}</span>
                        <span className="block text-[12px] text-inksoft">{label(t.schedule)} · {t.lastDoneDate ? `last done ${shortDate(t.lastDoneDate)}` : "not done yet"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={overdue ? "rose" : due ? "amber" : "mint"}>{t.nextDueDate ? (overdue ? `Overdue ${shortDate(t.nextDueDate)}` : due ? "Due today" : `Next ${shortDate(t.nextDueDate)}`) : "No date"}</Badge>
                        {can("biosecurity.record") ? <Button variant="glass" className="!px-2.5 !py-1" onClick={() => complete.mutate({ _id: t.id, date: today })}>Done</Button> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </QueryState>
          {can("biosecurity.manage") ? (
            <div className="mt-4 border-t border-white/60 pt-4">
              <Form submitLabel="Add cleaning task" fields={[{ name: "title", label: "Task", required: true, placeholder: "Wash drinkers in House A" }, { name: "activity", label: "Type", type: "select", defaultValue: "cleaning", options: [{ value: "cleaning", label: "Cleaning" }, { value: "disinfection", label: "Disinfection" }] }, { name: "schedule", label: "How often", type: "select", defaultValue: "weekly", options: CLEANING_SCHEDULES.map((c) => ({ value: c, label: label(c) })) }, { name: "nextDueDate", label: "First due", type: "date", defaultValue: today }]} onSubmit={(v) => addSchedule.mutateAsync(v)} />
            </div>
          ) : null}
        </GlassCard>
        <GlassCard>
          <SectionTitle hint="Raised by failed checks or by hand; verified by someone other than the person who fixed it">Corrective actions</SectionTitle>
          <QueryState query={actions} isEmpty={(x) => !x.items.length} empty={<EmptyState title="Nothing to fix." />}>
            {(x) => (
              <ul className="space-y-2">
                {x.items.slice(0, 10).map((a) => (
                  <li key={a.id} className="panel-inner rounded-xl p-3 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{a.title}</span>
                      <span className="flex items-center gap-2">
                        <Badge tone={a.status === "verified" ? "mint" : a.status === "done" ? "cyan" : "amber"}>{label(a.status)}</Badge>
                        {(a.status === "open" || a.status === "in_progress") && can("biosecurity.record") ? <Button variant="glass" className="!px-2.5 !py-1" onClick={() => setResolving(resolving === a.id ? null : a.id)}>Fixed</Button> : null}
                        {a.status === "done" && can("biosecurity.manage") && a.completedBy !== me?.user.id ? <Button variant="glass" className="!px-2.5 !py-1" onClick={() => verify.mutate({ _id: a.id })}>Verify</Button> : null}
                      </span>
                    </div>
                    {a.resolutionNotes ? <p className="mt-1 text-[12px] text-inksoft">{a.resolutionNotes}</p> : null}
                    {resolving === a.id ? <div className="mt-3"><Form columns={1} submitLabel="Mark fixed" fields={[{ name: "resolutionNotes", label: "What was done", type: "textarea", required: true }]} onSubmit={async (v) => { await finishAction.mutateAsync({ _id: a.id, resolutionNotes: String(v["resolutionNotes"]) }); setResolving(null); }} /></div> : null}
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </GlassCard>
      </div>

      <GlassCard className="mb-4">
        <SectionTitle>Visitor log</SectionTitle>
        <QueryState query={visitors}>
          {(x) => (
            <DataTable rows={x.items} rowKey={(r) => r.id} empty="No visitors recorded." columns={[
              { key: "checkInAt", label: "Arrived", render: (r) => new Date(r.checkInAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
              { key: "name", label: "Visitor" },
              { key: "company", label: "Company", hideOnPhone: true },
              { key: "type", label: "Type", render: (r) => label(r.type) },
              { key: "flags", label: "Flags", render: (r) => (r.flags?.length ? <Badge tone="rose">{r.flags.map(label).join(", ")}</Badge> : "—") },
              { key: "checkOutAt", label: "Left", render: (r) => (r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "On site") },
            ]} actions={can("biosecurity.record") ? (r) => (!r.checkOutAt ? <button type="button" className="text-[12px] font-medium text-brand-ink hover:underline" onClick={() => checkOut.mutate({ _id: r.id })}>Check out</button> : null) : undefined} />
          )}
        </QueryState>
      </GlassCard>

      <GlassCard>
        <SectionTitle>Biosecurity log</SectionTitle>
        <QueryState query={logs}>
          {(x) => (
            <DataTable rows={x.items} rowKey={(r) => r.id} empty="No entries yet." columns={[
              { key: "date", label: "Date", render: (r) => shortDate(r.date) },
              { key: "type", label: "Type", render: (r) => label(r.type) },
              { key: "house", label: "House", render: (r) => houseName(r.houseId) },
              { key: "detail", label: "Details", render: detail },
              { key: "performedBy", label: "By", hideOnPhone: true },
            ]} />
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
