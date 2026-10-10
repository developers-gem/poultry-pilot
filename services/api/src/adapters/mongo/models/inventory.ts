import { INVENTORY_CATEGORIES, INVENTORY_TRANSACTION_TYPES, STOCK_UNITS } from "@poultrypilot/constants";
import { LIVE, bool, defineCollection, enumOf, localDate, money, num, ref, str, text } from "./base.js";
import { StockSnapshotSchema } from "./feed.js";

const D = "Inventory";

export const InventoryItemModel = defineCollection({
  model: "InventoryItem",
  collection: "inventory_items",
  domain: D,
  ownership: "farm",
  description: "Non-feed stock: medicines and vaccines (linked to the medicines catalog), disinfectant, litter, egg trays, spare parts.",
  fields: {
    name: str({ required: true, max: 120 }),
    category: enumOf(INVENTORY_CATEGORIES, { required: true }),
    unit: enumOf(STOCK_UNITS, { required: true }),
    medicineId: ref("Medicine"),
    reorderLevel: num(),
    storageLocation: str({ max: 120 }),
    active: bool(true),
    /** Derived from inventory_transactions in the same transaction as each movement. */
    stock: { type: StockSnapshotSchema },
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Inventory list (prefix); names unique within a farm" }],
});

export const InventoryTransactionModel = defineCollection({
  model: "InventoryTransaction",
  collection: "inventory_transactions",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description: "Stock movements for inventory items. quantityDelta is signed; lot number and expiry are kept for vaccines and medicines.",
  fields: {
    itemId: ref("InventoryItem", { required: true }),
    type: enumOf(INVENTORY_TRANSACTION_TYPES, { required: true }),
    date: localDate({ required: true }),
    quantityDelta: num({ required: true, min: -1_000_000_000 }),
    unitCost: money(),
    lotNumber: str({ max: 60 }),
    expiryDate: localDate(),
    flockId: ref("Flock"),
    houseId: ref("House"),
    healthRecordId: ref("HealthRecord"),
    vaccinationId: ref("Vaccination"),
    supplier: str({ max: 120 }),
    expenseId: ref("Expense"),
    reversalOf: ref("InventoryTransaction"),
    note: text(500),
  },
  indexes: [{ fields: { farmId: 1, itemId: 1, date: 1 }, why: "Stock history and ledger replay per item; lot/expiry lookup" }],
});
