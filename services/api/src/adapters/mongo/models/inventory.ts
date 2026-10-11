import { FEED_STAGES, INVENTORY_CATEGORIES, INVENTORY_TRANSACTION_TYPES, STOCK_UNITS } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { LIVE, bool, defineCollection, enumOf, int, localDate, money, num, ref, str, text } from "./base.js";
import { StockSnapshotSchema } from "./feed.js";

const D = "Inventory";

export const InventoryItemModel = defineCollection({
  model: "InventoryItem",
  collection: "inventory_items",
  domain: D,
  ownership: "farm",
  description:
    "The stock catalog: feed, medicine, vaccines, disinfectant, litter, packaging, equipment supplies, spare parts and other consumables. Feed items carry feed details. Stock is held in lots; the item keeps a derived total.",
  fields: {
    name: str({ required: true, max: 120 }),
    category: enumOf(INVENTORY_CATEGORIES, { required: true }),
    unit: enumOf(STOCK_UNITS, { required: true }),
    sku: str({ max: 60 }),
    medicineId: ref("Medicine"),
    feed: {
      type: new Schema({ stage: enumOf(FEED_STAGES, { required: true }), form: enumOf(["mash", "crumble", "pellet", "other"]), bagSizeKg: num() }, { _id: false }),
    },
    defaultSupplier: str({ max: 120 }),
    defaultStorageLocation: str({ max: 120 }),
    /** Low-stock alert when the quantity in date falls to or below this. */
    reorderLevel: num(),
    /** Feed only: low-stock alert when fewer days of feed remain. */
    reorderDays: num({ max: 365 }),
    /** Expiry alert this many days before a lot expires. */
    expiryWarningDays: int({ default: 30, max: 365 }),
    active: bool(true),
    notes: text(1000),
    /** Derived from lots, in the same transaction as each movement. Rebuildable from inventory_transactions. */
    stock: { type: StockSnapshotSchema },
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Inventory list (prefix); names unique within a farm" }],
});

export const InventoryLotModel = defineCollection({
  model: "InventoryLot",
  collection: "inventory_lots",
  domain: D,
  ownership: "farm",
  description:
    "A batch received into stock (a purchase, or a positive stock-count correction): supplier, batch number, expiry, storage location, unit cost and what remains. Stock leaves lots FEFO.",
  fields: {
    itemId: ref("InventoryItem", { required: true }),
    receivedDate: localDate({ required: true }),
    supplier: str({ max: 120 }),
    batchNumber: str({ max: 60 }),
    invoiceNumber: str({ max: 60 }),
    expiryDate: localDate(),
    storageLocation: str({ max: 120 }),
    quantityReceived: num({ required: true, min: 0.001 }),
    /** Derived: received minus what has left, updated in the same transaction as each movement. */
    quantityRemaining: num({ required: true }),
    unitCost: money({ required: true }),
    expenseId: ref("Expense"),
  },
  indexes: [
    { fields: { farmId: 1, itemId: 1, receivedDate: 1 }, why: "An item's lots for FEFO picking and its stock view" },
    { fields: { farmId: 1, expiryDate: 1 }, options: { partialFilterExpression: { expiryDate: { $exists: true } } }, why: "Expiry alerts: lots expiring soon across the farm" },
  ],
});

export const InventoryTransactionModel = defineCollection({
  model: "InventoryTransaction",
  collection: "inventory_transactions",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description:
    "The stock ledger: receipts, issues, wastage, stock-count adjustments and reversals, each against one lot. quantityDelta is signed; valueMinor is the cost moved. Written automatically by purchases, feed use, daily records and manual issues.",
  fields: {
    itemId: ref("InventoryItem", { required: true }),
    lotId: ref("InventoryLot", { required: true }),
    type: enumOf(INVENTORY_TRANSACTION_TYPES, { required: true }),
    date: localDate({ required: true }),
    quantityDelta: num({ required: true, min: -1_000_000_000 }),
    valueMinor: int({ required: true, min: -1_000_000_000_000 }),
    currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
    flockId: ref("Flock"),
    houseId: ref("House"),
    sourceType: enumOf(["purchase", "feed_consumption", "manual", "stock_count", "vaccination", "health_record"], { required: true }),
    sourceId: { type: String },
    reason: str({ max: 300 }),
    reversalOf: ref("InventoryTransaction"),
  },
  indexes: [
    { fields: { farmId: 1, itemId: 1, date: 1 }, why: "An item's movement history and ledger replay" },
    { fields: { farmId: 1, sourceId: 1 }, why: "Find the movements of a feed entry or purchase to reverse them" },
  ],
});
