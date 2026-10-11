import { FEED_CONSUMPTION_KINDS } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { defineCollection, enumOf, int, localDate, money, num, ref, str, text } from "./base.js";

const D = "Feed";

/** Derived stock snapshot on an item, maintained in the same transaction as each movement. */
export const StockSnapshotSchema = new Schema(
  {
    quantity: num({ required: true, min: -1_000_000_000 }),
    valueMinor: int({ required: true, min: -1_000_000_000_000 }),
    currency: { type: String, match: /^[A-Z]{3}$/ },
    asOf: localDate({ required: true }),
  },
  { _id: false },
);

export const FeedConsumptionModel = defineCollection({
  model: "FeedConsumption",
  collection: "feed_consumption",
  domain: D,
  ownership: "farm",
  description:
    "Feed eaten by, or wasted in, a flock's house on a day. When it names a feed item, stock is drawn FEFO from that item's lots in the same transaction and the entry is costed at those lots' prices; the sum per flock feeds FCR and feed cost.",
  fields: {
    flockId: ref("Flock"),
    /** The feed item (an inventory item of category feed). Without it the entry is recorded but no stock moves. */
    feedItemId: ref("InventoryItem"),
    kind: enumOf(FEED_CONSUMPTION_KINDS, { required: true, default: "consumption" }),
    date: localDate({ required: true }),
    quantityKg: num({ required: true, min: 0.001 }),
    dailyRecordId: ref("DailyRecord"),
    /** Lots the feed came from (FEFO), with each lot's cost. */
    allocations: {
      type: [new Schema({ lotId: ref("InventoryLot", { required: true }), quantity: num({ required: true }), costMinor: int({ required: true }) }, { _id: false })],
      default: undefined,
    },
    /** Lot cost when stock moved; otherwise the price entered with the feed. */
    cost: money(),
    reason: str({ max: 300 }),
    notes: text(500),
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, why: "FCR, daily feed per flock, feed-change alerts" },
    { fields: { farmId: 1, feedItemId: 1, date: 1 }, options: { partialFilterExpression: { feedItemId: { $exists: true } } }, why: "Average daily use per feed item for days of feed remaining" },
  ],
});
