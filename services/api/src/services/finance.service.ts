import { addDays, addMonthsClamped, ageBucket, applyTax, assertPaymentFits, localDateOf, paymentStatus, type TaxInput } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type {
  ExpenseRecord,
  FarmRecord,
  FlockEventRecord,
  FlockRecord,
  HealthRecordRecord,
  IncomeRecord,
  InventoryItemRecord,
  InventoryLotRecord,
  MoneyAccountRecord,
  MoneyValue,
  OrderRecord,
  RecurringExpenseRecord,
  SupplierRecord,
  TransactionRecord,
} from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import type { FlockService } from "./flock.service.js";
import { duplicate } from "./house.service.js";
import type { SyncService } from "./sync.service.js";

type DocType = "expense" | "income";
type Doc = ExpenseRecord | IncomeRecord;

export interface DocumentInput {
  date: string;
  dueDate?: string;
  category: string;
  description: string;
  amount: MoneyValue;
  tax?: TaxInput;
  flockId?: string;
  houseId?: string;
  invoiceNumber?: string;
  attachments?: { assetId: string; name?: string }[];
  notes?: string;
  /** Pay or receive it now, from or into this account. */
  paidNow?: { accountId: string; method: TransactionRecord["paymentMethod"]; reference?: string };
}
export interface ExpenseInput extends DocumentInput {
  kind: "expense" | "purchase";
  supplierId?: string;
  vendor?: string;
}
export interface IncomeInput extends DocumentInput {
  kind: "sale" | "income";
  buyerId?: string;
  customerName?: string;
}

/** Stock categories map to expense categories for automatic purchase bills. */
const PURCHASE_CATEGORY: Record<string, ExpenseRecord["category"]> = {
  feed: "feed",
  medicine: "medicine_vaccine",
  vaccine: "medicine_vaccine",
  litter: "litter_bedding",
  equipment: "equipment",
  spare_part: "maintenance",
};
/** Order line categories map to income categories. */
const ORDER_CATEGORY: Record<string, IncomeRecord["category"]> = {
  live_birds: "bird_sales",
  dressed_birds: "bird_sales",
  eggs: "egg_sales",
  hatching_eggs: "egg_sales",
  day_old_chicks: "chick_sales",
  manure: "manure_sales",
};
/** Bills that reach a flock's costs another way (stock issued to it, FlockHealth fees), so not counted again. */
const COSTED_ELSEWHERE = new Set(["inventory_purchase", "health_record"]);

export function createFinanceService(d: { repos: Repositories; clock: Clock; audit: AuditService; sync: SyncService; flocks: FlockService }) {
  const { repos, clock } = d;
  const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
  const strip = <T extends { farmId: string; deletedAt?: Date; deletedBy?: string; createdAt: Date; updatedAt: Date }>({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }: T) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  });

  async function farmOf(ctx: FarmContext, tx?: Tx): Promise<FarmRecord> {
    const f = await repos.farms.findById(ctx.farmId, tx);
    if (!f) throw notFound("Farm");
    return f;
  }
  const todayOf = (farm: FarmRecord) => localDateOf(clock.now(), farm.settings.timezone);
  const money = (amountMinor: number, farm: FarmRecord): MoneyValue => ({ amountMinor: Math.round(amountMinor), currency: farm.settings.currency });
  const repoOf = (t: DocType) => (t === "expense" ? repos.expenses : repos.incomes) as unknown as import("../ports/repositories.js").FarmRepo<Doc>;

  function assertCurrency(m: MoneyValue | undefined, farm: FarmRecord, field: string) {
    if (m && m.currency !== farm.settings.currency) throw new AppError("VALIDATION_FAILED", `${field} must be in the farm currency (${farm.settings.currency}); other currencies are not supported yet`);
  }

  // ---- accounts ----------------------------------------------------------------------

  /** Balance at the end of `asOf` (default: now): the opening balance once opened, plus every ledger entry to that date. */
  async function balanceOf(ctx: FarmContext, account: MoneyAccountRecord, asOf?: string, tx?: Tx): Promise<number> {
    const txns = await repos.transactions.find(ctx.farmId, { where: { accountId: account.id }, ...(asOf ? { range: { field: "date", to: asOf } } : {}) }, tx);
    const opening = !asOf || account.openingDate <= asOf ? account.openingBalance.amountMinor : 0;
    return opening + txns.reduce((t, x) => t + (x.direction === "in" ? 1 : -1) * x.amount.amountMinor, 0);
  }

  async function loadAccount(ctx: FarmContext, id: string, tx?: Tx) {
    const a = await repos.moneyAccounts.findById(ctx.farmId, id, tx);
    if (!a) throw notFound("Money account");
    if (!a.active) throw new AppError("VALIDATION_FAILED", `${a.name} is closed`);
    return a;
  }

  /** Cash and mobile money cannot go below zero; a bank account may (overdraft). */
  async function assertCanPayOut(ctx: FarmContext, account: MoneyAccountRecord, amountMinor: number, tx: Tx) {
    if (account.type === "bank" || account.type === "other") return;
    const balance = await balanceOf(ctx, account, undefined, tx);
    if (amountMinor > balance) throw new AppError("INSUFFICIENT_FUNDS", `${account.name} holds ${balance}; this payment needs ${amountMinor}`, { balanceMinor: balance });
  }

  async function postTransaction(ctx: FarmContext, t: Omit<TransactionRecord, "id" | "farmId" | "createdBy" | "createdAt" | "updatedAt">, tx: Tx) {
    const now = clock.now();
    const rec: TransactionRecord = { id: newId(), farmId: ctx.farmId, createdBy: ctx.userId, createdAt: now, updatedAt: now, ...defined(t) };
    await repos.transactions.insert(rec, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "transaction", entityId: rec.id, op: "upsert", version: 0 }, tx);
    return rec;
  }

  // ---- documents ------------------------------------------------------------------------

  async function validateRefs(ctx: FarmContext, farm: FarmRecord, i: DocumentInput & { supplierId?: string; buyerId?: string }, tx: Tx) {
    assertCurrency(i.amount, farm, "amount");
    if (i.date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${i.date} is in the future for this farm`);
    if (i.dueDate && i.dueDate < i.date) throw new AppError("VALIDATION_FAILED", "The due date is before the document date");
    if (i.supplierId && !(await repos.suppliers.findById(ctx.farmId, i.supplierId, tx))) throw notFound("Supplier");
    if (i.buyerId && !(await repos.buyers.findById(ctx.farmId, i.buyerId, tx))) throw notFound("Buyer");
    if (i.flockId && !(await repos.flocks.findById(ctx.farmId, i.flockId, tx))) throw notFound("Flock");
    if (i.houseId && !(await repos.houses.findById(ctx.farmId, i.houseId, tx))) throw notFound("House");
    for (const a of i.attachments ?? []) if (!(await repos.mediaAssets.findById(ctx.farmId, a.assetId, tx))) throw new AppError("NOT_FOUND", `Attachment ${a.assetId} not found on this farm`);
  }

  function amounts(i: DocumentInput, farm: FarmRecord) {
    const t = applyTax(i.amount.amountMinor, i.tax);
    return {
      amount: money(t.grossMinor, farm),
      net: money(t.netMinor, farm),
      ...(i.tax && i.tax.ratePercent > 0 ? { tax: defined({ label: i.tax.label, ratePercent: i.tax.ratePercent, inclusive: i.tax.inclusive, amountMinor: t.taxMinor }) } : {}),
      amountPaid: money(0, farm),
      status: "unpaid" as const,
    };
  }

  async function createDocument(ctx: FarmContext, type: DocType, i: ExpenseInput | IncomeInput, source: { sourceType: Doc["sourceType"]; sourceId?: string; recurringExpenseId?: string }, tx: Tx): Promise<Doc> {
    const farm = await farmOf(ctx, tx);
    await validateRefs(ctx, farm, i, tx);
    const now = clock.now();
    const { paidNow, tax: _t, amount: _a, ...fields } = i;
    const rec = {
      id: newId(),
      farmId: ctx.farmId,
      ...defined(fields),
      ...amounts(i, farm),
      ...defined(source),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0,
    } as Doc;
    await repoOf(type).insert(rec, tx);
    await d.audit.record(ctx, { action: `${type}.created`, entity: type, entityId: rec.id, after: { category: rec.category, amountMinor: rec.amount.amountMinor, sourceType: rec.sourceType } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: type, entityId: rec.id, op: "upsert", version: 0 }, tx);
    if (paidNow) return (await settle(ctx, type, rec.id, "payment", { date: i.date, amountMinor: rec.amount.amountMinor, accountId: paidNow.accountId, method: paidNow.method, ...(paidNow.reference ? { reference: paidNow.reference } : {}) }, tx)).document;
    return rec;
  }

  /** A payment or refund against a bill or income: a ledger entry, and the document's paid amount and status. */
  async function settle(
    ctx: FarmContext,
    type: DocType,
    id: string,
    kind: "payment" | "refund",
    r: { date: string; amountMinor: number; accountId: string; method?: TransactionRecord["paymentMethod"]; reference?: string; description?: string; orderId?: string },
    tx: Tx,
  ): Promise<{ document: Doc; transaction: TransactionRecord }> {
    const farm = await farmOf(ctx, tx);
    const doc = await repoOf(type).findById(ctx.farmId, id, tx);
    if (!doc) throw notFound(type === "expense" ? "Bill" : "Income");
    if (doc.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This document is cancelled");
    if (r.date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
    assertPaymentFits(kind, r.amountMinor, doc.amount.amountMinor, doc.amountPaid.amountMinor);
    const account = await loadAccount(ctx, r.accountId, tx);
    // Money leaves the farm when paying a bill or refunding a customer.
    const direction: TransactionRecord["direction"] = (type === "expense") === (kind === "payment") ? "out" : "in";
    if (direction === "out") await assertCanPayOut(ctx, account, r.amountMinor, tx);
    const txn = await postTransaction(
      ctx,
      {
        date: r.date, kind, direction, accountId: account.id, amount: money(r.amountMinor, farm), category: doc.category, documentType: type, documentId: doc.id,
        ...defined({
          orderId: r.orderId, flockId: doc.flockId, houseId: doc.houseId, paymentMethod: r.method, reference: r.reference,
          supplierId: (doc as ExpenseRecord).supplierId, buyerId: (doc as IncomeRecord).buyerId, description: r.description ?? doc.description,
        }),
      },
      tx,
    );
    const paid = doc.amountPaid.amountMinor + (kind === "payment" ? r.amountMinor : -r.amountMinor);
    const next = await repoOf(type).update(ctx.farmId, doc.id, { amountPaid: money(paid, farm), status: paymentStatus(doc.amount.amountMinor, paid), updatedBy: ctx.userId, updatedAt: clock.now() } as Partial<Doc>, { expectedVersion: doc.version }, tx);
    if (!next) throw new AppError("VERSION_CONFLICT", "This document was changed at the same time elsewhere. Try again.");
    await d.audit.record(ctx, { action: `${type}.${kind}`, entity: type, entityId: doc.id, after: { amountMinor: r.amountMinor, accountId: account.id, status: next.status } }, tx);
    return { document: next, transaction: txn };
  }

  async function cancelDocument(ctx: FarmContext, type: DocType, doc: Doc, reason: string, tx: Tx) {
    if (doc.status === "cancelled") return doc;
    if (doc.amountPaid.amountMinor > 0) throw new AppError("INVALID_STATE_TRANSITION", `Payments of ${doc.amountPaid.amountMinor} have been recorded; refund them before cancelling`, { paidMinor: doc.amountPaid.amountMinor });
    const next = await repoOf(type).update(ctx.farmId, doc.id, { status: "cancelled", notes: [doc.notes, `Cancelled: ${reason}`].filter(Boolean).join("\n"), updatedBy: ctx.userId, updatedAt: clock.now() } as Partial<Doc>, { expectedVersion: doc.version }, tx);
    await d.audit.record(ctx, { action: `${type}.cancelled`, entity: type, entityId: doc.id, after: { reason } }, tx);
    return next!;
  }

  /** The live document created from a source. A source can have earlier, cancelled ones (e.g. a changed vet fee). */
  const bySource = async (ctx: FarmContext, type: DocType, sourceId: string, tx?: Tx) => {
    const rows = await repoOf(type).find(ctx.farmId, { where: { sourceId } as never }, tx);
    return rows.find((x) => x.status !== "cancelled") ?? null;
  };

  function nextDate(freq: RecurringExpenseRecord["frequency"], date: string): string {
    switch (freq) {
      case "daily": return addDays(date, 1);
      case "weekly": return addDays(date, 7);
      case "monthly": return addMonthsClamped(date, 1);
      case "quarterly": return addMonthsClamped(date, 3);
      default: return addMonthsClamped(date, 12);
    }
  }
  const paused = (r: RecurringExpenseRecord, date: string) => r.pauses.some((p) => date >= p.from && (!p.to || date <= p.to));

  /**
   * Creates the bills that have fallen due up to today (idempotent: one bill per recurring expense and due date).
   * Paused dates are skipped. Called hourly by the job and on demand.
   */
  async function generateDue(ctx: FarmContext, tx?: Tx): Promise<{ created: number }> {
    const run = async (t: Tx) => {
      const farm = await farmOf(ctx, t);
      const today = todayOf(farm);
      let created = 0;
      for (const r of await repos.recurringExpenses.find(ctx.farmId, { where: { active: true }, range: { field: "nextDueDate", to: today } }, t)) {
        let due = r.nextDueDate!;
        for (let i = 0; i < 400 && due <= today && (!r.endDate || due <= r.endDate); i++) {
          const exists = (await repos.expenses.find(ctx.farmId, { where: { recurringExpenseId: r.id, dueDate: due }, limit: 1 }, t))[0];
          if (!exists && !paused(r, due)) {
            await createDocument(ctx, "expense", { kind: "expense", date: due, dueDate: due, category: r.category, description: r.name, amount: r.amount, ...defined({ tax: r.tax, supplierId: r.supplierId, vendor: r.vendor, flockId: r.flockId, houseId: r.houseId }) }, { sourceType: "recurring_expense", recurringExpenseId: r.id }, t);
            created++;
          }
          due = nextDate(r.frequency, due);
        }
        const ended = !!r.endDate && due > r.endDate;
        await repos.recurringExpenses.update(ctx.farmId, r.id, { nextDueDate: ended ? undefined : due, active: !ended, updatedAt: clock.now() }, undefined, t);
      }
      return { created };
    };
    return tx ? run(tx) : repos.tx.run(run);
  }

  const docView = (doc: Doc, today: string) => ({ ...strip(doc), outstandingMinor: doc.status === "cancelled" ? 0 : doc.amount.amountMinor - doc.amountPaid.amountMinor, ...(doc.status !== "paid" && doc.status !== "cancelled" ? ageBucket(doc.dueDate ?? doc.date, today) : {}) });

  async function documentsIn(ctx: FarmContext, type: DocType, from?: string, to?: string) {
    return (await repoOf(type).find(ctx.farmId, { range: { field: "date", ...(from ? { from } : {}), ...(to ? { to } : {}) } })).filter((x) => x.status !== "cancelled");
  }

  function group<T>(rows: T[], key: (r: T) => string | undefined, value: (r: T) => number) {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = key(r) ?? "unassigned";
      m.set(k, (m.get(k) ?? 0) + value(r));
    }
    return [...m.entries()].map(([k, v]) => ({ key: k, amountMinor: v })).sort((a, b) => b.amountMinor - a.amountMinor);
  }

  return {
    settle,

    // ---- suppliers and accounts

    async createSupplier(ctx: FarmContext, r: Omit<SupplierRecord, keyof import("../ports/records.js").Editable>) {
      assertCan(ctx, "money.record");
      const now = clock.now();
      const rec: SupplierRecord = { id: newId(), farmId: ctx.farmId, ...defined(r), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.suppliers.insert(rec);
      return strip(rec);
    },

    async listSuppliers(ctx: FarmContext) {
      assertCan(ctx, "money.read");
      return (await repos.suppliers.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },

    /** A supplier with what the farm still owes it. */
    async supplierStatement(ctx: FarmContext, id: string) {
      assertCan(ctx, "money.read");
      const s = await repos.suppliers.findById(ctx.farmId, id);
      if (!s) throw notFound("Supplier");
      const farm = await farmOf(ctx);
      const bills = (await repos.expenses.find(ctx.farmId, { where: { supplierId: id }, sort: [{ field: "date", dir: -1 }] })).filter((b) => b.status !== "cancelled");
      return { supplier: strip(s), bills: bills.map((b) => docView(b, todayOf(farm))), outstandingMinor: bills.reduce((t, b) => t + b.amount.amountMinor - b.amountPaid.amountMinor, 0), totalBilledMinor: bills.reduce((t, b) => t + b.amount.amountMinor, 0) };
    },

    async createAccount(ctx: FarmContext, r: { name: string; type: MoneyAccountRecord["type"]; openingBalance: MoneyValue; openingDate: string; notes?: string }) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      assertCurrency(r.openingBalance, farm, "openingBalance");
      const now = clock.now();
      const rec: MoneyAccountRecord = { id: newId(), farmId: ctx.farmId, ...defined(r), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.moneyAccounts.insert(rec).catch(duplicate(`An account named "${r.name}"`));
      await repos.tx.run((tx) => d.audit.record(ctx, { action: "account.created", entity: "money_account", entityId: rec.id, after: { name: rec.name, openingMinor: rec.openingBalance.amountMinor } }, tx));
      return { ...strip(rec), balanceMinor: rec.openingBalance.amountMinor };
    },

    async listAccounts(ctx: FarmContext) {
      assertCan(ctx, "money.read");
      const rows = await repos.moneyAccounts.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] });
      return Promise.all(rows.map(async (a) => ({ ...strip(a), balanceMinor: await balanceOf(ctx, a) })));
    },

    /** Money moved between two of the farm's accounts: two ledger entries, no effect on profit. */
    async transfer(ctx: FarmContext, r: { date: string; fromAccountId: string; toAccountId: string; amount: MoneyValue; reference?: string; description?: string }) {
      assertCan(ctx, "money.record");
      if (r.fromAccountId === r.toAccountId) throw new AppError("VALIDATION_FAILED", "Choose two different accounts");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertCurrency(r.amount, farm, "amount");
        if (r.date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        if (!(r.amount.amountMinor > 0)) throw new AppError("VALIDATION_FAILED", "Amount must be more than zero");
        const from = await loadAccount(ctx, r.fromAccountId, tx);
        const to = await loadAccount(ctx, r.toAccountId, tx);
        await assertCanPayOut(ctx, from, r.amount.amountMinor, tx);
        const group = newId();
        const common = { date: r.date, kind: "transfer" as const, amount: r.amount, transferGroupId: group, ...defined({ reference: r.reference, description: r.description ?? `Transfer ${from.name} → ${to.name}` }) };
        const out = await postTransaction(ctx, { ...common, direction: "out", accountId: from.id, counterpartAccountId: to.id }, tx);
        const inn = await postTransaction(ctx, { ...common, direction: "in", accountId: to.id, counterpartAccountId: from.id }, tx);
        await d.audit.record(ctx, { action: "money.transferred", entity: "money_account", entityId: from.id, after: { to: to.id, amountMinor: r.amount.amountMinor } }, tx);
        return { transferGroupId: group, out: strip(out), in: strip(inn) };
      });
    },

    async ledger(ctx: FarmContext, q: { accountId?: string; from?: string; to?: string; limit: number }) {
      assertCan(ctx, "money.read");
      const rows = await repos.transactions.find(ctx.farmId, { ...(q.accountId ? { where: { accountId: q.accountId } } : {}), range: { field: "date", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }, sort: [{ field: "date", dir: -1 }, { field: "createdAt", dir: -1 }], limit: q.limit });
      return rows.map(({ farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, ...t }) => ({ ...t, createdAt: createdAt.toISOString() }));
    },

    // ---- documents

    async createExpense(ctx: FarmContext, i: ExpenseInput) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      return docView(await repos.tx.run((tx) => createDocument(ctx, "expense", i, { sourceType: "manual" }, tx)), todayOf(farm));
    },

    async createIncome(ctx: FarmContext, i: IncomeInput) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      return docView(await repos.tx.run((tx) => createDocument(ctx, "income", i, { sourceType: "manual" }, tx)), todayOf(farm));
    },

    async listDocuments(ctx: FarmContext, type: DocType, q: { status?: Doc["status"]; from?: string; to?: string; flockId?: string; houseId?: string; limit: number }) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const where: Record<string, unknown> = {};
      if (q.status) where["status"] = q.status;
      if (q.flockId) where["flockId"] = q.flockId;
      if (q.houseId) where["houseId"] = q.houseId;
      const rows = await repoOf(type).find(ctx.farmId, { where: where as never, range: { field: "date", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }, sort: [{ field: "date", dir: -1 }], limit: q.limit });
      return rows.map((x) => docView(x, todayOf(farm)));
    },

    async getDocument(ctx: FarmContext, type: DocType, id: string) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const doc = await repoOf(type).findById(ctx.farmId, id);
      if (!doc) throw notFound(type === "expense" ? "Bill" : "Income");
      const payments = await repos.transactions.find(ctx.farmId, { where: { documentId: id }, sort: [{ field: "date", dir: 1 }] });
      return { ...docView(doc, todayOf(farm)), payments: payments.map(({ farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, ...t }) => ({ ...t, createdAt: createdAt.toISOString() })) };
    },

    async pay(ctx: FarmContext, type: DocType, id: string, r: { date: string; amount: MoneyValue; accountId: string; method?: TransactionRecord["paymentMethod"]; reference?: string }) {
      assertCan(ctx, "payment.record");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertCurrency(r.amount, farm, "amount");
        const doc = await repoOf(type).findById(ctx.farmId, id, tx);
        if (doc?.sourceType === "market_order" || doc?.sourceType === "chick_order") throw new AppError("VALIDATION_FAILED", "Record payments for orders on the order, so the order's payment status stays right");
        const out = await settle(ctx, type, id, "payment", { date: r.date, amountMinor: r.amount.amountMinor, accountId: r.accountId, ...defined({ method: r.method, reference: r.reference }) }, tx);
        return { document: docView(out.document, todayOf(farm)), transaction: strip(out.transaction) };
      });
    },

    async refund(ctx: FarmContext, type: DocType, id: string, r: { date: string; amount: MoneyValue; accountId: string; method?: TransactionRecord["paymentMethod"]; reason: string }) {
      assertCan(ctx, "money.record");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertCurrency(r.amount, farm, "amount");
        const doc = await repoOf(type).findById(ctx.farmId, id, tx);
        if (doc?.sourceType === "market_order" || doc?.sourceType === "chick_order") throw new AppError("VALIDATION_FAILED", "Record refunds for orders on the order");
        const out = await settle(ctx, type, id, "refund", { date: r.date, amountMinor: r.amount.amountMinor, accountId: r.accountId, description: r.reason, ...defined({ method: r.method }) }, tx);
        return { document: docView(out.document, todayOf(farm)), transaction: strip(out.transaction) };
      });
    },

    /** Only unpaid, hand-entered documents are cancelled here; automatic ones follow their source. */
    async cancel(ctx: FarmContext, type: DocType, id: string, reason: string) {
      assertCan(ctx, "money.delete");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const doc = await repoOf(type).findById(ctx.farmId, id, tx);
        if (!doc) throw notFound(type === "expense" ? "Bill" : "Income");
        if (doc.sourceType !== "manual" && doc.sourceType !== "recurring_expense") throw new AppError("INVALID_STATE_TRANSITION", `This document was created from a ${doc.sourceType.replace("_", " ")}; change it there`);
        return docView(await cancelDocument(ctx, type, doc, reason, tx), todayOf(farm));
      });
    },

    // ---- recurring expenses

    async createRecurring(ctx: FarmContext, r: Omit<RecurringExpenseRecord, keyof import("../ports/records.js").Editable | "active" | "pauses" | "nextDueDate"> & { pauses?: RecurringExpenseRecord["pauses"] }) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      assertCurrency(r.amount, farm, "amount");
      if (r.supplierId && !(await repos.suppliers.findById(ctx.farmId, r.supplierId))) throw notFound("Supplier");
      if (r.endDate && r.endDate < r.startDate) throw new AppError("VALIDATION_FAILED", "End date is before the start date");
      const now = clock.now();
      const rec: RecurringExpenseRecord = { id: newId(), farmId: ctx.farmId, ...defined(r), pauses: r.pauses ?? [], nextDueDate: r.startDate, active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.recurringExpenses.insert(rec);
      return strip(rec);
    },

    async listRecurring(ctx: FarmContext) {
      assertCan(ctx, "money.read");
      return (await repos.recurringExpenses.find(ctx.farmId, { sort: [{ field: "nextDueDate", dir: 1 }] })).map(strip);
    },

    async pauseRecurring(ctx: FarmContext, id: string, r: { from: string; to?: string }) {
      assertCan(ctx, "money.record");
      const rec = await repos.recurringExpenses.findById(ctx.farmId, id);
      if (!rec) throw notFound("Recurring expense");
      if (r.to && r.to < r.from) throw new AppError("VALIDATION_FAILED", "Pause ends before it starts");
      return strip((await repos.recurringExpenses.update(ctx.farmId, id, { pauses: [...rec.pauses, defined(r)], updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: rec.version }))!);
    },

    generateDue: (ctx: FarmContext) => {
      assertCan(ctx, "money.record");
      return generateDue(ctx);
    },

    // ---- reports

    /** Profit and loss for a period, accrual basis (by document date), amounts excluding tax. */
    async profitAndLoss(ctx: FarmContext, q: { from: string; to: string; flockId?: string; houseId?: string }) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const scope = <T extends Doc>(rows: T[]) => rows.filter((x) => (!q.flockId || x.flockId === q.flockId) && (!q.houseId || x.houseId === q.houseId));
      const incomes = scope(await documentsIn(ctx, "income", q.from, q.to) as IncomeRecord[]);
      const expenses = scope(await documentsIn(ctx, "expense", q.from, q.to) as ExpenseRecord[]);
      const revenue = group(incomes, (x) => x.category, (x) => x.net.amountMinor);
      const costs = group(expenses, (x) => x.category, (x) => x.net.amountMinor);
      const totalRevenue = revenue.reduce((t, x) => t + x.amountMinor, 0);
      const totalExpenses = costs.reduce((t, x) => t + x.amountMinor, 0);
      const monthly = new Map<string, { revenueMinor: number; expensesMinor: number }>();
      for (const x of incomes) { const m = monthly.get(x.date.slice(0, 7)) ?? { revenueMinor: 0, expensesMinor: 0 }; m.revenueMinor += x.net.amountMinor; monthly.set(x.date.slice(0, 7), m); }
      for (const x of expenses) { const m = monthly.get(x.date.slice(0, 7)) ?? { revenueMinor: 0, expensesMinor: 0 }; m.expensesMinor += x.net.amountMinor; monthly.set(x.date.slice(0, 7), m); }
      return {
        from: q.from, to: q.to, currency: farm.settings.currency, basis: "accrual",
        revenue: { byCategory: revenue, totalMinor: totalRevenue },
        expenses: { byCategory: costs, totalMinor: totalExpenses },
        netProfitMinor: totalRevenue - totalExpenses,
        marginPercent: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : null,
        tax: { onSalesMinor: incomes.reduce((t, x) => t + (x.tax?.amountMinor ?? 0), 0), onPurchasesMinor: expenses.reduce((t, x) => t + (x.tax?.amountMinor ?? 0), 0) },
        byMonth: [...monthly.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, v]) => ({ month, ...v, profitMinor: v.revenueMinor - v.expensesMinor })),
      };
    },

    /** Cash in and out of every account for a period, with opening and closing balances. Transfers are shown but not counted. */
    async cashFlow(ctx: FarmContext, q: { from: string; to: string }) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const accounts = await repos.moneyAccounts.find(ctx.farmId);
      const txns = await repos.transactions.find(ctx.farmId, { range: { field: "date", from: q.from, to: q.to } });
      const real = txns.filter((t) => t.kind !== "transfer");
      const sum = (rows: TransactionRecord[]) => rows.reduce((t, x) => t + x.amount.amountMinor, 0);
      const inflows = real.filter((t) => t.direction === "in");
      const outflows = real.filter((t) => t.direction === "out");
      // Opening = balance at the end of the day before the period. An account opened during the period starts at 0
      // and its opening balance shows as money added in the period.
      const accountRows = await Promise.all(
        accounts.map(async (a) => {
          const openingMinor = await balanceOf(ctx, a, addDays(q.from, -1));
          const openedInPeriodMinor = a.openingDate >= q.from && a.openingDate <= q.to ? a.openingBalance.amountMinor : 0;
          const mine = txns.filter((t) => t.accountId === a.id);
          const inMinor = sum(mine.filter((t) => t.direction === "in"));
          const outMinor = sum(mine.filter((t) => t.direction === "out"));
          return { accountId: a.id, name: a.name, type: a.type, openingMinor, openedInPeriodMinor, inMinor, outMinor, closingMinor: openingMinor + openedInPeriodMinor + inMinor - outMinor };
        }),
      );
      return {
        from: q.from, to: q.to, currency: farm.settings.currency, basis: "cash",
        inflows: { byCategory: group(inflows, (t) => t.category ?? t.kind, (t) => t.amount.amountMinor), totalMinor: sum(inflows) },
        outflows: { byCategory: group(outflows, (t) => t.category ?? t.kind, (t) => t.amount.amountMinor), totalMinor: sum(outflows) },
        netCashFlowMinor: sum(inflows) - sum(outflows),
        transfersMinor: sum(txns.filter((t) => t.kind === "transfer" && t.direction === "out")),
        accounts: accountRows,
      };
    },

    async expenseBreakdown(ctx: FarmContext, q: { from: string; to: string }) {
      assertCan(ctx, "money.read");
      const rows = await documentsIn(ctx, "expense", q.from, q.to) as ExpenseRecord[];
      const suppliers = new Map((await repos.suppliers.find(ctx.farmId)).map((s) => [s.id, s.name]));
      const flocks = new Map((await repos.flocks.find(ctx.farmId)).map((f) => [f.id, f.flockCode]));
      const houses = new Map((await repos.houses.find(ctx.farmId)).map((h) => [h.id, h.name]));
      const net = (x: Doc) => x.net.amountMinor;
      return {
        from: q.from, to: q.to,
        totalMinor: rows.reduce((t, x) => t + net(x), 0),
        byCategory: group(rows, (x) => x.category, net),
        byKind: group(rows, (x) => x.kind, net),
        bySupplier: group(rows, (x) => (x.supplierId ? suppliers.get(x.supplierId) : x.vendor), net),
        byFlock: group(rows, (x) => (x.flockId ? flocks.get(x.flockId) : undefined), net),
        byHouse: group(rows, (x) => (x.houseId ? houses.get(x.houseId) : undefined), net),
      };
    },

    async revenueBreakdown(ctx: FarmContext, q: { from: string; to: string }) {
      assertCan(ctx, "money.read");
      const rows = await documentsIn(ctx, "income", q.from, q.to) as IncomeRecord[];
      const buyers = new Map((await repos.buyers.find(ctx.farmId)).map((b) => [b.id, b.name]));
      const flocks = new Map((await repos.flocks.find(ctx.farmId)).map((f) => [f.id, f.flockCode]));
      const net = (x: Doc) => x.net.amountMinor;
      return {
        from: q.from, to: q.to,
        totalMinor: rows.reduce((t, x) => t + net(x), 0),
        byCategory: group(rows, (x) => x.category, net),
        byCustomer: group(rows, (x) => (x.buyerId ? buyers.get(x.buyerId) : x.customerName), net),
        byFlock: group(rows, (x) => (x.flockId ? flocks.get(x.flockId) : undefined), net),
        bySource: group(rows, (x) => x.sourceType, net),
      };
    },

    /** Receivables (owed to the farm) or payables (owed by it), aged by days past due. */
    async openItems(ctx: FarmContext, type: DocType) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const rows = (await repoOf(type).find(ctx.farmId, { where: { status: ["unpaid", "partially_paid"] } as never, sort: [{ field: "dueDate", dir: 1 }] })).map((x) => docView(x, today));
      const buckets: Record<string, number> = { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0 };
      for (const r of rows) buckets[(r as { bucket: string }).bucket] = (buckets[(r as { bucket: string }).bucket] ?? 0) + r.outstandingMinor;
      return { date: today, totalOutstandingMinor: rows.reduce((t, r) => t + r.outstandingMinor, 0), buckets, items: rows };
    },

    /**
     * Flock profitability: revenue and every cost of each flock (chicks, feed eaten and wasted, medicine and vet fees,
     * bills allocated to the flock), profit, margin, cost per bird, per kg produced and per egg. Farm totals across them.
     */
    async flockProfitability(ctx: FarmContext, q: { status?: FlockRecord["status"]; flockId?: string }) {
      assertCan(ctx, "money.read");
      const flocks = q.flockId ? [await d.flocks.ledger.loadFlock(ctx, q.flockId)] : await repos.flocks.find(ctx.farmId, { where: { status: q.status ? q.status : ["active", "closed"] } as never });
      const rows: {
        flockId: string; flockCode: string; type: FlockRecord["type"]; status: FlockRecord["status"]; houseId: string; birdsIn: number; currentBirdCount: number; eggsCollected: number;
        weightProducedKg: number | null; revenueMinor: number; cost: { totalMinor: number } & Record<string, number>; profitMinor: number; marginPercent: number | null;
        costPerBirdMinor: number | null; costPerKgProducedMinor: number | null; costPerEggMinor: number | null; costsComplete: boolean;
      }[] = [];
      for (const f of flocks) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        rows.push({
          flockId: f.id, flockCode: f.flockCode, type: f.type, status: f.status, houseId: f.houseId,
          birdsIn: m.birdsIn, currentBirdCount: m.currentBirdCount, eggsCollected: m.eggsCollected, weightProducedKg: m.weightProducedKg,
          revenueMinor: m.revenueMinor, cost: m.cost, profitMinor: m.profitMinor, marginPercent: m.marginPercent,
          costPerBirdMinor: m.costPerBirdMinor, costPerKgProducedMinor: m.costPerKgProducedMinor,
          costPerEggMinor: m.eggsCollected > 0 ? m.cost.totalMinor / m.eggsCollected : null,
          costsComplete: m.costsComplete,
        });
      }
      const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((t, r) => t + f(r), 0);
      const cost = sum((r) => r.cost.totalMinor);
      const birds = sum((r) => r.birdsIn);
      const layerRows = rows.filter((r) => r.eggsCollected > 0);
      const eggs = layerRows.reduce((t, r) => t + r.eggsCollected, 0);
      const kg = rows.reduce((t, r) => t + (r.weightProducedKg ?? 0), 0);
      const meatRows = rows.filter((r) => (r.weightProducedKg ?? 0) > 0);
      return {
        flocks: rows,
        totals: {
          revenueMinor: sum((r) => r.revenueMinor),
          costMinor: cost,
          profitMinor: sum((r) => r.profitMinor),
          costPerBirdMinor: birds > 0 ? Math.round(cost / birds) : null,
          costPerEggMinor: eggs > 0 ? layerRows.reduce((t, r) => t + r.cost.totalMinor, 0) / eggs : null,
          costPerKgMinor: kg > 0 ? Math.round(meatRows.reduce((t, r) => t + r.cost.totalMinor, 0) / kg) : null,
        },
      };
    },

    /** House-level costing: bills and incomes allocated to the house itself, plus its flocks' costs and revenue. */
    async houseCosting(ctx: FarmContext, q: { from?: string; to?: string }) {
      assertCan(ctx, "money.read");
      const [houses, flocks, expenses, incomes] = await Promise.all([repos.houses.find(ctx.farmId), repos.flocks.find(ctx.farmId, { where: { status: ["active", "closed"] } as never }), documentsIn(ctx, "expense", q.from, q.to), documentsIn(ctx, "income", q.from, q.to)]);
      const out = [];
      for (const h of houses) {
        const direct = expenses.filter((x) => x.houseId === h.id && !x.flockId).reduce((t, x) => t + x.net.amountMinor, 0);
        const directIncome = incomes.filter((x) => x.houseId === h.id && !x.flockId).reduce((t, x) => t + x.net.amountMinor, 0);
        let flockCost = 0;
        let flockRevenue = 0;
        for (const f of flocks.filter((x) => x.houseId === h.id)) {
          const m = await d.flocks.metrics(ctx, f.id, {});
          flockCost += m.cost.totalMinor;
          flockRevenue += m.revenueMinor;
        }
        out.push({ houseId: h.id, name: h.name, directCostMinor: direct, flockCostMinor: flockCost, totalCostMinor: direct + flockCost, revenueMinor: directIncome + flockRevenue, profitMinor: directIncome + flockRevenue - direct - flockCost });
      }
      return { houses: out };
    },

    // ---- postings from other modules (inside their transactions) -------------------------------

    /** FeedWise: a purchase lot becomes an unpaid purchase bill. */
    async onInventoryPurchase(ctx: FarmContext, item: InventoryItemRecord, lot: InventoryLotRecord, supplierId: string | undefined, tx: Tx) {
      await createDocument(ctx, "expense", {
        kind: "purchase", date: lot.receivedDate, category: PURCHASE_CATEGORY[item.category] ?? "stock_purchase",
        description: `${item.name}: ${lot.quantityReceived} ${item.unit}${lot.batchNumber ? ` (batch ${lot.batchNumber})` : ""}`,
        amount: { amountMinor: Math.round(lot.quantityReceived * lot.unitCost.amountMinor), currency: lot.unitCost.currency },
        ...defined({ supplierId, vendor: lot.supplier, invoiceNumber: lot.invoiceNumber }),
      }, { sourceType: "inventory_purchase", sourceId: lot.id }, tx);
    },

    /** FlockHealth: a fee on a health record becomes a vet services bill; removing the record cancels it if unpaid. */
    async onHealthCost(ctx: FarmContext, rec: HealthRecordRecord | null, recordId: string, tx: Tx) {
      const existing = await bySource(ctx, "expense", recordId, tx);
      if (!rec || !rec.cost) {
        if (existing) await cancelDocument(ctx, "expense", existing, "Health record changed", tx);
        return;
      }
      if (existing && existing.status !== "cancelled") {
        if (existing.amount.amountMinor === rec.cost.amountMinor) return;
        await cancelDocument(ctx, "expense", existing, "Health record cost changed", tx);
      }
      await createDocument(ctx, "expense", { kind: "expense", date: rec.date, category: "vet_services", description: `Health: ${rec.title}`, amount: rec.cost, ...defined({ vendor: rec.vetName, flockId: rec.flockId, houseId: rec.houseId }) }, { sourceType: "health_record", sourceId: recordId }, tx);
    },

    /** Flock engine: a bird sale becomes a receivable, unless an order already carries the income. */
    async onFlockSale(ctx: FarmContext, flock: FlockRecord, event: FlockEventRecord, tx: Tx) {
      if (event.orderId || !event.total || event.total.amountMinor <= 0) return;
      await createDocument(ctx, "income", { kind: "sale", date: event.date, dueDate: event.date, category: "bird_sales", description: `${event.birds} birds from ${flock.flockCode}${event.totalLiveWeightKg ? `, ${event.totalLiveWeightKg} kg` : ""}`, amount: event.total, flockId: flock.id, houseId: flock.houseId }, { sourceType: "flock_sale", sourceId: event.id }, tx);
    },

    /** Flock engine: reversing a sale cancels its receivable; once paid, the payment must be refunded first. */
    async onFlockSaleReversed(ctx: FarmContext, saleEventId: string, tx: Tx) {
      const doc = await bySource(ctx, "income", saleEventId, tx);
      if (doc) await cancelDocument(ctx, "income", doc, "Sale reversed", tx);
    },

    /** Orders: acceptance creates the receivable; cancellation cancels it (refund payments first). */
    async onOrderAccepted(ctx: FarmContext, order: OrderRecord, tx: Tx): Promise<IncomeRecord> {
      const line = order.lines[0]!;
      return createDocument(ctx, "income", {
        kind: "sale", date: localDateOf(clock.now(), (await farmOf(ctx, tx)).settings.timezone), category: ORDER_CATEGORY[line.category] ?? "other_income",
        description: `Order ${order.orderNumber}: ${line.quantity} ${line.unit} ${line.description}`.slice(0, 300), amount: order.total,
        ...defined({ dueDate: order.requestedDeliveryDate, buyerId: order.buyerId, customerName: order.buyerName }),
      }, { sourceType: order.listingId ? "market_order" : "chick_order", sourceId: order.id }, tx) as Promise<IncomeRecord>;
    },

    async onOrderCancelled(ctx: FarmContext, order: OrderRecord, tx: Tx) {
      const doc = order.incomeId ? await repos.incomes.findById(ctx.farmId, order.incomeId, tx) : null;
      if (doc) await cancelDocument(ctx, "income", doc, `Order ${order.orderNumber} cancelled`, tx);
    },

    /** Flock engine hooks: bills and other income allocated to a flock that reach it no other way. */
    async flockExtraCostMinor(ctx: FarmContext, flockId: string, asOf: string) {
      const rows = await repos.expenses.find(ctx.farmId, { where: { flockId }, range: { field: "date", to: asOf } });
      return rows.filter((x) => x.status !== "cancelled" && !COSTED_ELSEWHERE.has(x.sourceType)).reduce((t, x) => t + x.net.amountMinor, 0);
    },
    async flockExtraIncomeMinor(ctx: FarmContext, flockId: string, asOf: string) {
      const rows = await repos.incomes.find(ctx.farmId, { where: { flockId }, range: { field: "date", to: asOf } });
      return rows.filter((x) => x.status !== "cancelled" && x.sourceType === "manual").reduce((t, x) => t + x.net.amountMinor, 0);
    },

    /** Hourly job. */
    async runScheduled(ctx: FarmContext, tx: Tx) {
      await generateDue(ctx, tx);
    },
  };
}

export type FinanceService = ReturnType<typeof createFinanceService>;
