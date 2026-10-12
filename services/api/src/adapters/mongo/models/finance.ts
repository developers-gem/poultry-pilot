import {
  CASH_DIRECTIONS,
  DOCUMENT_SOURCES,
  EXPENSE_CATEGORIES,
  EXPENSE_KINDS,
  EXPENSE_STATUSES,
  INCOME_CATEGORIES,
  INCOME_KINDS,
  LEDGER_CATEGORIES,
  MONEY_ACCOUNT_TYPES,
  PAYMENT_METHODS,
  RECURRING_FREQUENCIES,
  TRANSACTION_KINDS,
} from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { LIVE, bool, defineCollection, enumOf, int, localDate, money, num, ref, str, text } from "./base.js";

const D = "Money";

const TaxSchema = new Schema(
  { label: str({ max: 30 }), ratePercent: num({ required: true, max: 100 }), inclusive: { type: Boolean, required: true }, amountMinor: int({ required: true }) },
  { _id: false },
);
const Attachments = { type: [new Schema({ assetId: ref("MediaAsset", { required: true }), name: str({ max: 200 }) }, { _id: false })], default: undefined };

export const SupplierModel = defineCollection({
  model: "Supplier",
  collection: "suppliers",
  domain: D,
  ownership: "farm",
  description: "The farm's suppliers (feed mills, hatcheries, vets, utilities). Linked from bills, purchases and payments.",
  fields: {
    name: str({ required: true, max: 120 }),
    phone: str({ max: 30 }),
    email: str({ max: 254, lowercase: true }),
    taxId: str({ max: 40 }),
    address: str({ max: 300 }),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, why: "Supplier list by name and name search" }],
});

export const MoneyAccountModel = defineCollection({
  model: "MoneyAccount",
  collection: "money_accounts",
  domain: D,
  ownership: "farm",
  description: "Where the farm keeps money: cash box, bank account, mobile money wallet. Balance = opening balance + its ledger entries.",
  fields: {
    name: str({ required: true, max: 80 }),
    type: enumOf(MONEY_ACCOUNT_TYPES, { required: true }),
    openingBalance: money({ required: true }),
    openingDate: localDate({ required: true }),
    active: bool(true),
    notes: text(500),
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Account list (prefix); names unique within a farm" }],
});

export const ExpenseModel = defineCollection({
  model: "Expense",
  collection: "expenses",
  domain: D,
  ownership: "farm",
  description:
    "A bill: an expense or a purchase the farm owes. Unpaid bills are payables; payments are ledger entries in `transactions`. Purchases of stock and vet fees are created automatically by FeedWise and FlockHealth.",
  fields: {
    kind: enumOf(EXPENSE_KINDS, { required: true, default: "expense" }),
    date: localDate({ required: true }),
    dueDate: localDate(),
    category: enumOf(EXPENSE_CATEGORIES, { required: true }),
    description: str({ required: true, max: 300 }),
    supplierId: ref("Supplier"),
    vendor: str({ max: 120 }),
    /** Gross amount owed (including tax). */
    amount: money({ required: true }),
    /** Amount excluding tax. */
    net: money({ required: true }),
    tax: { type: TaxSchema },
    /** Derived: payments minus refunds posted against this bill. */
    amountPaid: money({ required: true }),
    status: enumOf(EXPENSE_STATUSES, { required: true, default: "unpaid" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    recurringExpenseId: ref("RecurringExpense"),
    sourceType: enumOf(DOCUMENT_SOURCES, { required: true, default: "manual" }),
    sourceId: { type: String },
    invoiceNumber: str({ max: 60 }),
    attachments: Attachments,
    notes: text(1000),
  },
  indexes: [
    { fields: { farmId: 1, date: -1 }, why: "Expense list, P&L and breakdowns by period" },
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Payables: unpaid and overdue bills" },
    { fields: { farmId: 1, recurringExpenseId: 1, dueDate: 1 }, options: { unique: true, partialFilterExpression: { recurringExpenseId: { $exists: true } } }, why: "Bill generation is idempotent: one bill per recurring expense per due date" },
    { fields: { farmId: 1, sourceId: 1 }, options: { partialFilterExpression: { sourceId: { $exists: true } } }, why: "The bill created from a purchase lot or health record" },
  ],
  relations: [{ field: "sourceId", to: "InventoryLot | HealthRecord", cardinality: "one-to-one", note: "Polymorphic by sourceType" }],
});

export const IncomeModel = defineCollection({
  model: "Income",
  collection: "incomes",
  domain: D,
  ownership: "farm",
  description:
    "A sale or other income the farm is owed. Unpaid incomes are receivables. Bird sales, chick orders and marketplace orders create them automatically.",
  fields: {
    kind: enumOf(INCOME_KINDS, { required: true, default: "sale" }),
    date: localDate({ required: true }),
    dueDate: localDate(),
    category: enumOf(INCOME_CATEGORIES, { required: true }),
    description: str({ required: true, max: 300 }),
    buyerId: ref("Buyer"),
    customerName: str({ max: 120 }),
    amount: money({ required: true }),
    net: money({ required: true }),
    tax: { type: TaxSchema },
    amountPaid: money({ required: true }),
    status: enumOf(EXPENSE_STATUSES, { required: true, default: "unpaid" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    sourceType: enumOf(DOCUMENT_SOURCES, { required: true, default: "manual" }),
    sourceId: { type: String },
    invoiceNumber: str({ max: 60 }),
    attachments: Attachments,
    notes: text(1000),
  },
  indexes: [
    { fields: { farmId: 1, date: -1 }, why: "Income list, P&L and breakdowns by period" },
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Receivables: unpaid and overdue incomes" },
    { fields: { farmId: 1, sourceId: 1 }, options: { partialFilterExpression: { sourceId: { $exists: true } } }, why: "The income created from a sale event or order" },
  ],
  relations: [{ field: "sourceId", to: "FlockEvent | Order", cardinality: "one-to-one", note: "Polymorphic by sourceType" }],
});

export const RecurringExpenseModel = defineCollection({
  model: "RecurringExpense",
  collection: "recurring_expenses",
  domain: D,
  ownership: "farm",
  description: "A repeating bill (electricity, wages, rent). The scheduler creates an expense on each due date; pauses stop that.",
  fields: {
    name: str({ required: true, max: 120 }),
    category: enumOf(EXPENSE_CATEGORIES, { required: true }),
    supplierId: ref("Supplier"),
    vendor: str({ max: 120 }),
    amount: money({ required: true }),
    tax: { type: TaxSchema },
    frequency: enumOf(RECURRING_FREQUENCIES, { required: true }),
    startDate: localDate({ required: true }),
    endDate: localDate(),
    pauses: { type: [new Schema({ from: localDate({ required: true }), to: localDate() }, { _id: false })], default: [] },
    nextDueDate: localDate(),
    active: bool(true),
    flockId: ref("Flock"),
    houseId: ref("House"),
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
    "The cash ledger: money in or out of one of the farm's accounts. Payments and refunds against bills and incomes, transfers between accounts (a pair sharing transferGroupId) and opening balances. Cash flow is built from it. Corrections are reversal entries.",
  fields: {
    date: localDate({ required: true }),
    kind: enumOf(TRANSACTION_KINDS, { required: true }),
    direction: enumOf(CASH_DIRECTIONS, { required: true }),
    accountId: ref("MoneyAccount", { required: true }),
    amount: money({ required: true }),
    category: enumOf(LEDGER_CATEGORIES),
    documentType: enumOf(["expense", "income"]),
    documentId: { type: String },
    orderId: ref("Order"),
    transferGroupId: { type: String },
    counterpartAccountId: ref("MoneyAccount"),
    supplierId: ref("Supplier"),
    buyerId: ref("Buyer"),
    flockId: ref("Flock"),
    houseId: ref("House"),
    paymentMethod: enumOf(PAYMENT_METHODS),
    reference: str({ max: 80 }),
    description: str({ max: 300 }),
    attachments: Attachments,
    reversalOf: ref("Transaction"),
  },
  indexes: [
    { fields: { farmId: 1, date: 1 }, why: "Cash flow for a period" },
    { fields: { farmId: 1, accountId: 1, date: 1 }, why: "Account balances and statements" },
    { fields: { farmId: 1, documentId: 1 }, options: { partialFilterExpression: { documentId: { $exists: true } } }, why: "Payments and refunds of one bill or income" },
  ],
  relations: [{ field: "documentId", to: "Expense | Income", cardinality: "many-to-one", note: "Polymorphic by documentType" }],
});
