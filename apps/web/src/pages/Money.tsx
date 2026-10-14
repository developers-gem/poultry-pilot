import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@poultrypilot/constants";
import { useState } from "react";
import { useAuth } from "../api/auth";
import { useFarmInfo, useFlocks } from "../api/farm";
import { useFarmMutation, useFarmQuery } from "../api/hooks";
import { Form, FormCard } from "../components/forms";
import { EmptyState, QueryState } from "../components/states";
import { DataTable } from "../components/table";
import { Badge, ConfirmButton, GlassCard, PageHeader, SectionTitle, Stat, StatGrid, Tabs } from "../components/ui";
import { addDays, label, money, num, shortDate, toMinor } from "../lib/format";

interface Doc {
  id: string;
  kind: string;
  date: string;
  dueDate?: string;
  category: string;
  description: string;
  vendor?: string;
  customerName?: string;
  amount: { amountMinor: number; currency: string };
  outstandingMinor: number;
  status: string;
  sourceType: string;
  flockId?: string;
}
interface Pnl { revenue: { totalMinor: number; byCategory: { key: string; amountMinor: number }[] }; expenses: { totalMinor: number; byCategory: { key: string; amountMinor: number }[] }; netProfitMinor: number; marginPercent: number | null }
interface Account { id: string; name: string; type: string; balanceMinor: number }

export function MoneyPage() {
  const { can } = useAuth();
  const { currency, today } = useFarmInfo();
  const [days, setDays] = useState<"30" | "90" | "365">("30");
  const from = addDays(today, -(Number(days) - 1));
  const flocks = useFlocks().data?.items ?? [];
  const pnl = useFarmQuery<Pnl>(`/finance/reports/pnl?from=${from}&to=${today}`);
  const accounts = useFarmQuery<{ items: Account[] }>("/finance/accounts");
  const incomes = useFarmQuery<{ items: Doc[] }>(`/finance/incomes?from=${from}&to=${today}&limit=200`);
  const expenses = useFarmQuery<{ items: Doc[] }>(`/finance/expenses?from=${from}&to=${today}&limit=200`);
  const addIncome = useFarmMutation("POST", "/finance/incomes", { success: "Money in recorded" });
  const addExpense = useFarmMutation("POST", "/finance/expenses", { success: "Money out recorded" });
  const addAccount = useFarmMutation("POST", "/finance/accounts", { success: "Account added" });
  const pay = useFarmMutation<Record<string, unknown> & { _kind: string; _id: string }>("POST", (b) => `/finance/${b._kind}/${b._id}/payments`, { success: "Payment recorded" });
  const cancel = useFarmMutation<{ _kind: string; _id: string; reason: string }>("POST", (b) => `/finance/${b._kind}/${b._id}/cancel`, { success: "Cancelled" });
  const [paying, setPaying] = useState<string | null>(null);
  const p = pnl.data;
  const accts = accounts.data?.items ?? [];
  const rows = [...(incomes.data?.items ?? []).map((d) => ({ ...d, dir: "in" as const })), ...(expenses.data?.items ?? []).map((d) => ({ ...d, dir: "out" as const }))].filter((d) => d.status !== "cancelled").sort((a, b) => (a.date < b.date ? 1 : -1));
  const maxExp = Math.max(1, ...(p?.expenses.byCategory.map((c) => c.amountMinor) ?? [1]));
  const m = (x: number | null | undefined) => money(x, currency);
  const accountOpts = accts.map((a) => ({ value: a.id, label: `${a.name} (${m(a.balanceMinor)})` }));

  return (
    <>
      <PageHeader eyebrow="Money" title="Expenses & sales" subtitle="Every cost and every sale, including feed purchases, vet fees, bird sales and orders that post here automatically." action={<Tabs tabs={[{ id: "30", label: "30 days" }, { id: "90", label: "90 days" }, { id: "365", label: "Year" }]} value={days} onChange={setDays} />} />
      <StatGrid>
        <Stat label="Sales income" value={m(p?.revenue.totalMinor)} badgeTone="mint" hint={`${num(incomes.data?.items.length)} entries · before tax`} />
        <Stat label="Expenses" value={m(p?.expenses.totalMinor)} badgeTone="rose" hint="Including feed and stock bought" />
        <Stat label="Net profit" value={m(p?.netProfitMinor)} badge={p?.marginPercent !== null && p?.marginPercent !== undefined ? `${num(p.marginPercent, 0)}% margin` : undefined} badgeTone={p && p.netProfitMinor < 0 ? "rose" : "mint"} />
        <Stat label="Cash in accounts" value={m(accts.reduce((t, a) => t + a.balanceMinor, 0))} badgeTone="cyan" hint={accts.map((a) => a.name).join(" · ") || "No accounts yet"} />
      </StatGrid>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {can("money.record") ? (
          <FormCard
            title="Record money in or out"
            submitLabel="Save"
            fields={[
              { name: "dir", label: "Type", type: "select", defaultValue: "out", options: [{ value: "out", label: "Expense (money out)" }, { value: "in", label: "Sale or income (money in)" }] },
              { name: "date", label: "Date", type: "date", defaultValue: today, required: true },
              { name: "expenseCategory", label: "Category", type: "select", defaultValue: "other_expense", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: label(c) })), show: (v) => v["dir"] === "out" },
              { name: "incomeCategory", label: "Category", type: "select", defaultValue: "egg_sales", options: INCOME_CATEGORIES.map((c) => ({ value: c, label: label(c) })), show: (v) => v["dir"] === "in" },
              { name: "description", label: "Description", required: true, placeholder: "Labour, medicine, eggs to hotel…" },
              { name: "party", label: "Paid to / received from" },
              { name: "amount", label: `Amount (${currency})`, type: "money", required: true, min: 0 },
              { name: "flockId", label: "Flock (optional)", type: "select", defaultValue: "", options: [{ value: "", label: "Whole farm" }, ...flocks.map((f) => ({ value: f.id, label: f.flockCode }))] },
              { name: "paidNow", label: "Paid already", type: "checkbox", show: () => accts.length > 0 },
              { name: "accountId", label: "From / into account", type: "select", defaultValue: accts[0]?.id ?? "", options: accountOpts, show: (v) => !!v["paidNow"] },
              { name: "method", label: "How", type: "select", defaultValue: "cash", options: PAYMENT_METHODS.map((x) => ({ value: x, label: label(x) })), show: (v) => !!v["paidNow"] },
              { name: "dueDate", label: "Due by", type: "date", show: (v) => !v["paidNow"] },
            ]}
            errorMap={{ category: "expenseCategory", vendor: "party", customerName: "party" }}
            onSubmit={({ dir, expenseCategory, incomeCategory, party, amount, paidNow, accountId, method, flockId, ...rest }) => {
              const body = { ...rest, ...(flockId ? { flockId } : {}), amount: { amountMinor: toMinor(Number(amount), currency), currency }, ...(paidNow ? { paidNow: { accountId, method } } : {}) };
              return dir === "in" ? addIncome.mutateAsync({ ...body, kind: incomeCategory === "other_income" ? "income" : "sale", category: incomeCategory, ...(party ? { customerName: party } : {}) }) : addExpense.mutateAsync({ ...body, kind: "expense", category: expenseCategory, ...(party ? { vendor: party } : {}) });
            }}
          />
        ) : null}
        <GlassCard>
          <SectionTitle hint={`Last ${days} days, before tax`}>Where the money goes</SectionTitle>
          <QueryState query={pnl} isEmpty={(x) => !x.expenses.byCategory.length} empty={<EmptyState title="No expenses in this period." />}>
            {(x) => (
              <ul className="space-y-2.5">
                {x.expenses.byCategory.map((c) => (
                  <li key={c.key}>
                    <div className="mb-1 flex justify-between text-[12px]"><span>{label(c.key)}</span><span className="font-semibold">{m(c.amountMinor)}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-rose/70" style={{ width: `${(c.amountMinor / maxExp) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </GlassCard>
      </div>

      {can("money.record") && accounts.data && !accts.length ? (
        <div className="mb-4">
          <FormCard title="Add a cash or bank account" defaultOpen description="Payments come out of and go into accounts, so balances stay right." submitLabel="Add account"
            fields={[{ name: "name", label: "Name", required: true, placeholder: "Cash box" }, { name: "type", label: "Type", type: "select", defaultValue: "cash", options: [{ value: "cash", label: "Cash" }, { value: "bank", label: "Bank" }, { value: "mobile_money", label: "Mobile money" }] }, { name: "openingBalance", label: `Balance today (${currency})`, type: "money", required: true, min: 0 }]}
            onSubmit={({ openingBalance, ...rest }) => addAccount.mutateAsync({ ...rest, openingDate: today, openingBalance: { amountMinor: toMinor(Number(openingBalance), currency), currency } })} />
        </div>
      ) : null}

      <GlassCard>
        <SectionTitle hint={`Last ${days} days`}>Transactions</SectionTitle>
        <QueryState query={expenses}>
          {() => (
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              empty="Nothing recorded in this period."
              columns={[
                { key: "date", label: "Date", render: (r) => shortDate(r.date) },
                { key: "dir", label: "Type", render: (r) => <Badge tone={r.dir === "in" ? "mint" : "rose"}>{r.dir === "in" ? "In" : "Out"}</Badge> },
                { key: "category", label: "Category", render: (r) => label(r.category) },
                { key: "description", label: "Description" },
                { key: "party", label: "Party", render: (r) => r.vendor ?? r.customerName ?? "—", hideOnPhone: true },
                { key: "amount", label: "Amount", align: "right", render: (r) => money(r.amount.amountMinor, r.amount.currency) },
                { key: "status", label: "Status", render: (r) => (r.outstandingMinor > 0 ? <Badge tone="amber">{m(r.outstandingMinor)} owed</Badge> : <Badge tone="mint">Paid</Badge>) },
              ]}
              actions={(r) => (
                <span className="flex flex-col items-end gap-2">
                  <span className="flex gap-3">
                    {r.outstandingMinor > 0 && can("payment.record") && accts.length && r.sourceType !== "market_order" && r.sourceType !== "chick_order" ? <button type="button" className="text-[12px] font-medium text-brand-ink hover:underline" onClick={() => setPaying(paying === r.id ? null : r.id)}>Pay</button> : null}
                    {(r.sourceType === "manual" || r.sourceType === "recurring_expense") && r.status === "unpaid" && can("money.delete") ? <ConfirmButton confirmText="Cancel it" onConfirm={() => cancel.mutate({ _kind: r.dir === "in" ? "incomes" : "expenses", _id: r.id, reason: "Cancelled from Money" })}>Cancel</ConfirmButton> : null}
                  </span>
                  {paying === r.id ? (
                    <div className="w-72 text-left">
                      <Form columns={1} submitLabel="Record payment" fields={[{ name: "amount", label: `Amount (${currency})`, type: "money", required: true, defaultValue: r.outstandingMinor / 100 }, { name: "accountId", label: "Account", type: "select", defaultValue: accts[0]?.id ?? "", options: accountOpts }, { name: "method", label: "How", type: "select", defaultValue: "cash", options: PAYMENT_METHODS.map((x) => ({ value: x, label: label(x) })) }, { name: "date", label: "Date", type: "date", defaultValue: today }]}
                        onSubmit={async ({ amount, ...rest }) => { await pay.mutateAsync({ _kind: r.dir === "in" ? "incomes" : "expenses", _id: r.id, ...rest, amount: { amountMinor: toMinor(Number(amount), currency), currency } }); setPaying(null); }} />
                    </div>
                  ) : null}
                </span>
              )}
            />
          )}
        </QueryState>
      </GlassCard>
    </>
  );
}
