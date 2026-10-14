import { EXPENSE_CATEGORIES, RECURRING_FREQUENCIES } from "@poultrypilot/constants";
import { useAuth } from "../api/auth";
import { useFarmInfo } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { FormCard } from "../components/forms";
import { EmptyState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, ConfirmButton, GlassCard, PageHeader, SectionTitle, Stat, StatGrid } from "../components/ui";
import { label, money, shortDate, toMinor } from "../lib/format";

interface Recurring { id: string; name: string; category: string; vendor?: string; amount: { amountMinor: number; currency: string }; frequency: string; startDate: string; endDate?: string; nextDueDate?: string; active: boolean; pauses: { from: string; to?: string }[] }
interface Bill { id: string; recurringExpenseId?: string; amount: { amountMinor: number }; outstandingMinor: number; status: string }

/** Times per year, to show a bill's monthly equivalent (arithmetic on the bill's own amount and frequency). */
const PER_YEAR: Record<string, number> = { daily: 365, weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };

export function ExpensesPage() {
  const { can } = useAuth();
  const { currency, today } = useFarmInfo();
  const recurring = useFarmQuery<{ items: Recurring[] }>("/finance/recurring");
  const bills = useFarmQuery<{ items: Bill[] }>("/finance/expenses?limit=500");
  const add = useFarmMutation("POST", "/finance/recurring", { success: "Recurring cost added" });
  const pause = useFarmMutation<{ _id: string; from: string }>("POST", (b) => `/finance/recurring/${b._id}/pause`, { success: "Paused from today" });
  const generate = useFarmMutation("POST", "/finance/recurring/generate", { success: "Bills brought up to date" });
  const list = recurring.data?.items ?? [];
  const isPaused = (r: Recurring) => r.pauses.some((p) => p.from <= today && (!p.to || p.to >= today));
  const live = list.filter((r) => r.active && !isPaused(r));
  const monthly = (r: Recurring) => (r.amount.amountMinor * (PER_YEAR[r.frequency] ?? 12)) / 12;
  const generated = (bills.data?.items ?? []).filter((b) => b.recurringExpenseId && b.status !== "cancelled");
  const billedFor = (id: string) => generated.filter((b) => b.recurringExpenseId === id).reduce((t, b) => t + b.amount.amountMinor, 0);
  const unpaid = generated.reduce((t, b) => t + b.outstandingMinor, 0);
  const m = (x: number) => money(x, currency);
  const byCat = new Map<string, number>();
  for (const r of live) byCat.set(r.category, (byCat.get(r.category) ?? 0) + monthly(r));
  const maxCat = Math.max(1, ...byCat.values());

  return (
    <>
      <PageHeader eyebrow="Running costs" title="Recurring expenses" subtitle="Electricity, water, salaries and every other bill that keeps repeating. Each one becomes a bill on its due date, folded straight into farm profit." />
      <StatGrid>
        <Stat label="Monthly run-rate" value={m(live.reduce((t, r) => t + monthly(r), 0))} badge={`${live.length} active`} badgeTone="accent" />
        <Stat label="Billed to date" value={m(generated.reduce((t, b) => t + b.amount.amountMinor, 0))} badgeTone="rose" hint="Bills created from these costs" />
        <Stat label="Still unpaid" value={m(unpaid)} badgeTone={unpaid ? "amber" : "mint"} hint="Pay them on the Money page" />
        <Stat label="Paused or ended" value={String(list.length - live.length)} badgeTone="cyan" />
      </StatGrid>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <FormCard
          title="Add a recurring cost"
          allowed={can("money.record")}
          submitLabel="Add cost"
          fields={[
            { name: "name", label: "What is it?", required: true, placeholder: "Farmhouse electricity" },
            { name: "category", label: "Category", type: "select", defaultValue: "electricity", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: label(c) })) },
            { name: "vendor", label: "Paid to", placeholder: "Power company, the attendant" },
            { name: "amount", label: `Amount each time (${currency})`, type: "money", required: true, min: 0 },
            { name: "frequency", label: "How often", type: "select", defaultValue: "monthly", options: RECURRING_FREQUENCIES.map((f) => ({ value: f, label: label(f) })) },
            { name: "startDate", label: "First charged on", type: "date", defaultValue: today, required: true },
            { name: "endDate", label: "Ends on (optional)", type: "date" },
            { name: "notes", label: "Notes" },
          ]}
          onSubmit={({ amount, ...rest }) => add.mutateAsync({ ...rest, amount: { amountMinor: toMinor(Number(amount), currency), currency } })}
        />
        <GlassCard>
          <SectionTitle hint="Active costs, per month" action={can("money.record") ? <button type="button" className="text-[12px] font-medium text-inksoft hover:text-brand-ink" onClick={() => generate.mutate(undefined)}>Bring bills up to date</button> : undefined}>Monthly cost by category</SectionTitle>
          {byCat.size === 0 ? <EmptyState title="No active recurring costs." /> : (
            <ul className="space-y-2.5">
              {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <li key={k}><div className="mb-1 flex justify-between text-[12px]"><span>{label(k)}</span><span className="font-semibold">{m(v)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-accent/60" style={{ width: `${(v / maxCat) * 100}%` }} /></div></li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
      <GlassCard>
        <SectionTitle>All recurring costs</SectionTitle>
        <QueryState query={recurring}>
          {() => (
            <DataTable rows={list} rowKey={(r) => r.id} empty="No recurring costs yet." columns={[
              { key: "name", label: "Bill" },
              { key: "category", label: "Category", render: (r) => label(r.category) },
              { key: "vendor", label: "Paid to", hideOnPhone: true },
              { key: "amount", label: "Amount", align: "right", render: (r) => money(r.amount.amountMinor, r.amount.currency) },
              { key: "frequency", label: "How often", render: (r) => label(r.frequency) },
              { key: "monthly", label: "Per month", align: "right", render: (r) => m(monthly(r)), hideOnPhone: true },
              { key: "billed", label: "Billed to date", align: "right", render: (r) => m(billedFor(r.id)) },
              { key: "next", label: "Next bill", render: (r) => (r.active && !isPaused(r) ? shortDate(r.nextDueDate) : <Badge tone="cyan">{r.active ? "Paused" : "Ended"}</Badge>) },
            ]} actions={can("money.record") ? (r) => (r.active && !isPaused(r) ? <ConfirmButton confirmText="Pause it" onConfirm={() => pause.mutate({ _id: r.id, from: today })}>Pause</ConfirmButton> : null) : undefined} />
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
