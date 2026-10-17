import {
  FULFILMENT_METHODS,
  EGG_GRADES,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  MARKET_PRODUCTS,
  ORDER_CHANNELS,
  ORDER_PAYMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRICE_UNITS,
} from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { GeoJsonPointSchema, SourceSchema, defineCollection, enumOf, instant, int, localDate, money, num, ref, str, text } from "./base.js";

const D = "Market";

export const BuyerModel = defineCollection({
  model: "Buyer",
  collection: "buyers",
  domain: D,
  ownership: "farm",
  description: "The farm's own customer book. A buyer may also be another PoultryPilot farm (linkedFarmId).",
  fields: {
    name: str({ required: true, max: 120 }),
    type: enumOf(["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"], { required: true, default: "other" }),
    phone: str({ max: 30 }),
    email: str({ max: 254, lowercase: true }),
    locationLabel: str({ max: 200 }),
    linkedFarmId: ref("Farm"),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, why: "Buyer list sorted by name and name search" }],
});

export const MarketListingModel = defineCollection({
  model: "MarketListing",
  collection: "market_listings",
  domain: D,
  ownership: "farm",
  description:
    "Something a farm offers on the marketplace. quantityAvailable is what is not yet reserved by accepted orders. Seller contact details are never in a listing; a buyer sees them once the seller accepts the order. An optional stock source makes delivery move stock automatically.",
  fields: {
    title: str({ required: true, max: 150 }),
    category: enumOf(LISTING_CATEGORIES, { required: true }),
    product: enumOf(MARKET_PRODUCTS),
    description: text(2000),
    /** Unreserved quantity, in `unit`. Decreases when an order is accepted, increases if it is cancelled. */
    quantityAvailable: num({ required: true }),
    minOrderQuantity: num(),
    unit: str({ required: true, max: 20 }),
    /** Price per `unit`, set by the seller. Orders always use this price. */
    price: money({ required: true }),
    priceUnit: enumOf(PRICE_UNITS, { required: true }),
    regionCode: { type: String, required: true, match: /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/ },
    locationLabel: str({ max: 200 }),
    location: { type: GeoJsonPointSchema },
    availableFrom: localDate(),
    availableUntil: localDate(),
    fulfilmentOptions: { type: [enumOf(FULFILMENT_METHODS)], required: true, validate: { validator: (v: unknown[]) => v.length >= 1, message: "At least one fulfilment option" } },
    status: enumOf(LISTING_STATUSES, { required: true, default: "draft" }),
    photos: { type: [ref("MediaAsset")], default: undefined },
    source: {
      type: new Schema({ kind: enumOf(["eggs", "chick_lot", "flock"], { required: true }), eggGrade: enumOf(EGG_GRADES), chickLotId: ref("ChickLot"), flockId: ref("Flock") }, { _id: false }),
    },
  },
  indexes: [
    { fields: { farmId: 1, status: 1 }, why: "Seller's own listings" },
    { fields: { status: 1, category: 1, createdAt: -1 }, why: "Marketplace browse by category, newest first (cross-farm read)" },
    { fields: { location: "2dsphere", status: 1 }, why: "Marketplace near me: active listings within a distance (cross-farm read)" },
  ],
  notes: ["Browse queries span farms by design and use setOptions({ crossFarm: true }); they only ever return listings with status active."],
});

const OrderLineSchema = new Schema(
  {
    category: enumOf(LISTING_CATEGORIES, { required: true }),
    description: str({ required: true, max: 200 }),
    flockId: ref("Flock"),
    chickLotId: ref("ChickLot"),
    eggGrade: enumOf(EGG_GRADES),
    quantity: num({ required: true, min: 0.001 }),
    unit: str({ required: true, max: 20 }),
    unitPrice: money({ required: true }),
    total: money({ required: true }),
  },
  { _id: false },
);

export const OrderModel = defineCollection({
  model: "Order",
  collection: "orders",
  domain: D,
  ownership: "farm",
  description:
    "A sale by the farm (farmId = seller), recorded directly or placed by a marketplace buyer. Prices come from the server, never the buyer. Delivery posts egg/bird/chick stock movements.",
  fields: {
    orderNumber: int({ required: true, min: 1 }),
    channel: enumOf(ORDER_CHANNELS, { required: true }),
    buyerId: ref("Buyer"),
    buyerUserId: ref("User"),
    buyerFarmId: ref("Farm"),
    listingId: ref("MarketListing"),
    /** A booking against a hatch not yet graded; delivery draws from that batch's chick lot. */
    hatcheryBatchId: ref("HatcheryBatch"),
    /** Marketplace buyer details, shared with the seller when the order is placed. */
    buyerName: str({ max: 120 }),
    buyerPhone: str({ max: 30 }),
    fulfilment: enumOf(FULFILMENT_METHODS, { required: true, default: "pickup" }),
    delivery: {
      type: new Schema(
        {
          address: str({ max: 300 }),
          expectedDate: localDate(),
          vehicle: str({ max: 60 }),
          driver: str({ max: 120 }),
          trackingReference: str({ max: 80 }),
          dispatchedAt: instant(),
          deliveredAt: instant(),
          receivedBy: str({ max: 120 }),
          proofAssetId: ref("MediaAsset"),
        },
        { _id: false },
      ),
    },
    /** The receivable created when the order is accepted. */
    incomeId: ref("Income"),
    cancelReason: str({ max: 300 }),
    cancelledBy: enumOf(["seller", "buyer"]),
    lines: {
      type: [OrderLineSchema],
      required: true,
      validate: { validator: (v: unknown[]) => v.length >= 1 && v.length <= 50, message: "1 to 50 lines" },
    },
    subtotal: money({ required: true }),
    discount: money(),
    total: money({ required: true }),
    status: enumOf(ORDER_STATUSES, { required: true, default: "pending" }),
    statusHistory: {
      type: [new Schema({ status: enumOf(ORDER_STATUSES, { required: true }), at: instant({ required: true }), by: ref("User") }, { _id: false })],
      default: [],
    },
    paymentStatus: enumOf(ORDER_PAYMENT_STATUSES, { required: true, default: "unpaid" }),
    /** Derived: sum of order_payments, updated in the same transaction as each payment. */
    amountPaid: money(),
    requestedDeliveryDate: localDate(),
    deliveredDate: localDate(),
    deliveryAddress: str({ max: 300 }),
    notes: text(1000),
  },
  indexes: [
    { fields: { farmId: 1, hatcheryBatchId: 1 }, options: { partialFilterExpression: { hatcheryBatchId: { $type: "string" } } }, why: "Chicks booked against a hatchery batch" },
    { fields: { farmId: 1, orderNumber: 1 }, options: { unique: true }, why: "Order numbers unique per seller farm; lookup by number" },
    { fields: { farmId: 1, status: 1, createdAt: -1 }, why: "Seller's order board by status" },
    { fields: { farmId: 1, buyerId: 1, createdAt: -1 }, why: "A buyer's order history and outstanding balance" },
    {
      fields: { buyerUserId: 1, createdAt: -1 },
      options: { partialFilterExpression: { buyerUserId: { $exists: true } } },
      why: "Marketplace buyer's purchases across sellers (cross-farm read)",
    },
  ],
  notes: ["Lines and status history are embedded: always read with the order and bounded in size."],
});

export const OrderPaymentModel = defineCollection({
  model: "OrderPayment",
  collection: "order_payments",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description: "Money received against an order (or refunded). Posts an income transaction; overpayment is refused unless recorded as credit.",
  fields: {
    orderId: ref("Order", { required: true }),
    kind: enumOf(["payment", "refund"], { required: true, default: "payment" }),
    date: localDate({ required: true }),
    amount: money({ required: true }),
    method: enumOf(PAYMENT_METHODS, { required: true }),
    reference: str({ max: 80 }),
    transactionId: ref("Transaction"),
    reversalOf: ref("OrderPayment"),
    accountId: ref("MoneyAccount"),
    note: text(500),
  },
  indexes: [{ fields: { farmId: 1, orderId: 1, date: 1 }, why: "Payments of one order (balance, receipt)" }],
});

export const MarketPriceModel = defineCollection({
  model: "MarketPrice",
  collection: "market_prices",
  domain: D,
  ownership: "global",
  description: "Reference prices by region, product and date from a named source (fetched behind the API). Shared by all farms.",
  fields: {
    product: enumOf(MARKET_PRODUCTS, { required: true }),
    countryCode: { type: String, required: true, match: /^[A-Z]{2}$/ },
    regionKey: str({ required: true, max: 80 }),
    date: localDate({ required: true }),
    price: money({ required: true }),
    priceMin: money(),
    priceMax: money(),
    unit: enumOf(PRICE_UNITS, { required: true }),
    source: { type: SourceSchema, required: true },
  },
  indexes: [
    {
      fields: { countryCode: 1, regionKey: 1, product: 1, date: -1, "source.name": 1 },
      options: { unique: true },
      why: "Latest prices for a region and product; one price per source per day (import is idempotent)",
    },
  ],
});
