import { FEED_STAGES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { LIVE, bool, defineCollection, enumOf, int, localDate, money, num, ref, str, text } from "./base.js";

const D = "Feed";

/** Derived stock snapshot maintained by the service in the same transaction as each purchase/consumption. */
export const StockSnapshotSchema = new Schema(
  {
    quantity: num({ required: true, min: -1_000_000_000 }),
    valueMinor: int({ required: true, min: -1_000_000_000_000 }),
    currency: { type: String, match: /^[A-Z]{3}$/ },
    asOf: localDate({ required: true }),
  },
  { _id: false },
);

export const FeedItemModel = defineCollection({
  model: "FeedItem",
  collection: "feed_items",
  domain: D,
  ownership: "farm",
  description: "A feed product the farm buys and issues (e.g. broiler starter crumble). Holds a derived stock snapshot in kg.",
  fields: {
    name: str({ required: true, max: 120 }),
    stage: enumOf(FEED_STAGES, { required: true }),
    form: enumOf(["mash", "crumble", "pellet", "other"]),
    defaultSupplier: str({ max: 120 }),
    bagSizeKg: num(),
    reorderLevelKg: num(),
    active: bool(true),
    /** Derived: quantity in kg and moving-average value. Rebuildable from feed_purchases and feed_consumption. */
    stock: { type: StockSnapshotSchema },
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Feed item list (prefix); names unique within a farm" }],
});

export const FeedPurchaseModel = defineCollection({
  model: "FeedPurchase",
  collection: "feed_purchases",
  domain: D,
  ownership: "farm",
  description: "Feed received into stock. Creates or links an expense for payment tracking.",
  fields: {
    feedItemId: ref("FeedItem", { required: true }),
    date: localDate({ required: true }),
    supplier: str({ max: 120 }),
    quantityKg: num({ required: true, min: 0.001 }),
    bags: int(),
    unitPricePerKg: money(),
    total: money({ required: true }),
    invoiceNumber: str({ max: 60 }),
    expenseId: ref("Expense"),
    notes: text(500),
  },
  indexes: [
    { fields: { farmId: 1, feedItemId: 1, date: 1 }, why: "Ledger replay for moving-average cost and item purchase history" },
    { fields: { farmId: 1, date: -1 }, why: "Purchases list and spend by period across all items" },
  ],
});

export const FeedConsumptionModel = defineCollection({
  model: "FeedConsumption",
  collection: "feed_consumption",
  domain: D,
  ownership: "farm",
  description: "Feed issued to a flock on a day, costed at the moving average at the time of issue. Sum per flock is the FCR numerator.",
  fields: {
    flockId: ref("Flock", { required: true }),
    feedItemId: ref("FeedItem", { required: true }),
    date: localDate({ required: true }),
    quantityKg: num({ required: true, min: 0.001 }),
    /** Derived from the feed item's moving-average cost when the issue was recorded. */
    cost: money(),
    notes: text(500),
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, why: "FCR, daily feed per flock, feed-change alerts" },
    { fields: { farmId: 1, feedItemId: 1, date: 1 }, why: "Days of cover per item and ledger replay" },
  ],
});
