import { EXPENSE_STATUSES, LEDGER_CATEGORIES, LEDGER_DIRECTIONS, PAYMENT_METHODS, RECURRING_FREQUENCIES, TRANSACTION_SOURCES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { bool, defineCollection, enumOf, localDate, money, ref, str, text } from "./base.js";

const D = "Money";

export const ExpenseModel = defineCollection({
  model: "Expense",
  collection: "expenses",
  domain: D,
  ownership: "farm",
  description:
    "A bill or cost owed (accrual document). It can be unpaid; paying it posts transactions. Feed purchases, treatments and recurring bills create expenses.",
  fields: {
    date: localDate({ required: true }),
    dueDate: localDate(),
    category: enumOf(LEDGER_CATEGORIES, { required: true }),
    description: str({ required: true, max: 300 }),
    vendor: str({ max: 120 }),
    amount: money({ required: true }),
    /** Derived: sum of transactions posted against this expense. */
    amountPaid: money(),
    status: enumOf(EXPENSE_STATUSES, { required: true, default: "unpaid" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    recurringExpenseId: ref("RecurringExpense"),
    sourceType: enumOf(["manual", "feed_purchase", "health_record", "inventory_transaction", "recurring_expense"], { required: true, default: "manual" }),
    sourceId: { type: String },
    invoiceNumber: str({ max: 60 }),
    attachments: { type: [new Schema({ name: str({ max: 200 }), assetUrl: str({ required: true, max: 1000 }) }, { _id: false })], default: undefined },
    notes: text(1000),
  },
  indexes: [
    { fields: { farmId: 1, date: -1 }, why: "Expense list and spend by period" },
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Unpaid and overdue bills" },
    {
      fields: { farmId: 1, recurringExpenseId: 1, dueDate: 1 },
      options: { unique: true, partialFilterExpression: { recurringExpenseId: { $exists: true } } },
      why: "Bill generation is idempotent: one expense per recurring bill per due date",
    },
  ],
  relations: [{ field: "sourceId", to: "FeedPurchase | HealthRecord | InventoryTransaction", cardinality: "one-to-one", note: "Polymorphic by sourceType" }],
});

export const RecurringExpenseModel = defineCollection({
  model: "RecurringExpense",
  collection: "recurring_expenses",
  domain: D,
  ownership: "farm",
  description: "A repeating bill (electricity, wages, rent). The scheduler creates an expense on each due date; pauses stop that.",
  fields: {
    name: str({ required: true, max: 120 }),
    category: enumOf(LEDGER_CATEGORIES, { required: true }),
    vendor: str({ max: 120 }),
    amount: money({ required: true }),
    frequency: enumOf(RECURRING_FREQUENCIES, { required: true }),
    startDate: localDate({ required: true }),
    endDate: localDate(),
    pauses: { type: [new Schema({ from: localDate({ required: true }), to: localDate() }, { _id: false })], default: [] },
    nextDueDate: localDate(),
    active: bool(true),
    flockId: ref("Flock"),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, active: 1, nextDueDate: 1 }, why: "Scheduler finds bills due; running-costs list" }],
});

export const TransactionModel = defineCollection({
  model: "Transaction",
  collection: "transactions",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description:
    "The cash ledger: money actually received or paid. Farm profit for a period = income − expense here. Corrections are reversal entries.",
  fields: {
    date: localDate({ required: true }),
    direction: enumOf(LEDGER_DIRECTIONS, { required: true }),
    category: enumOf(LEDGER_CATEGORIES, { required: true }),
    amount: money({ required: true }),
    description: str({ max: 300 }),
    source: enumOf(TRANSACTION_SOURCES, { required: true }),
    sourceId: { type: String },
    flockId: ref("Flock"),
    houseId: ref("House"),
    paymentMethod: enumOf(PAYMENT_METHODS),
    reference: str({ max: 80 }),
    counterparty: str({ max: 120 }),
    reversalOf: ref("Transaction"),
  },
  indexes: [
    { fields: { farmId: 1, date: 1 }, why: "Profit and category totals for a period (Money, Dashboard)" },
    { fields: { farmId: 1, flockId: 1, date: 1 }, why: "Batch economics: income and direct costs of one flock" },
    { fields: { farmId: 1, sourceId: 1 }, why: "Find the postings of an expense or payment to reverse or reconcile them" },
  ],
  relations: [{ field: "sourceId", to: "Expense | OrderPayment | FeedPurchase | RecurringExpense", cardinality: "many-to-one", note: "Polymorphic by source" }],
});
