import {
  EGG_GRADES,
  EGG_MOVEMENT_TYPES,
  FLOCK_EVENT_TYPES,
  FLOCK_TYPES,
  FLOCK_STATUSES,
  HOUSE_TYPES,
  MORTALITY_CAUSES,
  SPECIES,
  WATER_QUALITY_RATINGS,
  WATER_SOURCES,
  WATER_TREATMENTS,
} from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { weighSessionStats } from "../../../domain/index.js";
import { LIVE, defineCollection, enumOf, int, localDate, money, num, ref, str, text } from "./base.js";

const D = "Production";

export const HouseModel = defineCollection({
  model: "House",
  collection: "houses",
  domain: D,
  ownership: "farm",
  description: "A shed, pen or brooder room. Flocks are placed in houses; equipment and cleaning tasks can be tied to them.",
  fields: {
    name: str({ required: true, max: 80 }),
    type: enumOf(HOUSE_TYPES, { required: true }),
    capacityBirds: int({ min: 1 }),
    floorAreaM2: num(),
    status: enumOf(["active", "inactive"], { required: true, default: "active" }),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "House list per farm (prefix); house names are unique within a farm" }],
});

const PopulationSchema = new Schema(
  {
    placed: int({ required: true }),
    transferredIn: int({ required: true }),
    mortality: int({ required: true }),
    culled: int({ required: true }),
    sold: int({ required: true }),
    transferredOut: int({ required: true }),
    adjustments: int({ required: true, min: -10_000_000 }),
    alive: int({ required: true }),
    asOf: localDate({ required: true }),
  },
  { _id: false },
);

export const FlockModel = defineCollection({
  model: "Flock",
  collection: "flocks",
  domain: D,
  ownership: "farm",
  description:
    "A group of birds managed together from placement to closure: broiler batch, layer or breeder flock, chick-rearing group, or a custom poultry type.",
  fields: {
    houseId: ref("House", { required: true }),
    name: str({ required: true, max: 120 }),
    flockCode: str({ required: true, max: 40 }),
    type: enumOf(FLOCK_TYPES, { required: true }),
    customTypeName: str({ max: 60 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    breed: str({ max: 120 }),
    strain: str({ max: 120 }),
    source: str({ max: 200 }),
    status: enumOf(FLOCK_STATUSES, { required: true, default: "planned" }),
    hatchDate: localDate(),
    /** Initial placement, copied from the placement event when the flock is placed. Immutable afterwards. */
    placementDate: localDate(),
    placementCount: int({ min: 1 }),
    deadOnArrival: int(),
    ageDaysAtPlacement: int({ max: 2000 }),
    startingWeightG: num({ max: 50_000 }),
    chickCost: money(),
    targetSaleDate: localDate(),
    closedDate: localDate(),
    splitFromFlockId: ref("Flock"),
    mergedIntoFlockId: ref("Flock"),
    hatcheryBatchId: ref("HatcheryBatch"),
    notes: text(2000),
    /**
     * Derived snapshot of the ledger, maintained by FlockService in the same transaction as every flock_event.
     * Rebuildable from flock_events; never edited directly.
     */
    population: { type: PopulationSchema },
  },
  indexes: [
    { fields: { farmId: 1, status: 1, placementDate: -1 }, why: "Flock list and dashboard: active (or closed) flocks of a farm, newest first" },
    { fields: { farmId: 1, houseId: 1, status: 1 }, why: "House occupancy and capacity check for placements and transfers" },
    { fields: { farmId: 1, flockCode: 1 }, options: { unique: true, ...LIVE }, why: "Flock codes are unique within a farm; lookup by code" },
  ],
  configure: (schema) =>
    schema.pre("validate", function () {
      if (this.get("type") === "custom" && !this.get("customTypeName")) this.invalidate("customTypeName", "Name the custom poultry type");
    }),
});

export const FlockEventModel = defineCollection({
  model: "FlockEvent",
  collection: "flock_events",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description:
    "The flock ledger: every placement, death, cull, transfer, split, merge, adjustment, sale and weighing. A flock's bird count is the sum of these. Append-only; mistakes are corrected with a reversal event.",
  fields: {
    flockId: ref("Flock", { required: true }),
    type: enumOf(FLOCK_EVENT_TYPES, { required: true }),
    date: localDate({ required: true }),
    birds: int({ min: 1 }),
    deadOnArrival: int(),
    /** Adjustment only: signed. */
    delta: int({ min: -10_000_000 }),
    cause: enumOf(MORTALITY_CAUSES),
    totalLiveWeightKg: num(),
    averageWeightG: num({ max: 50_000 }),
    sampleSize: int({ min: 1 }),
    birdWeightId: ref("BirdWeight"),
    /** Sale revenue. */
    total: money(),
    /** Placement purchase cost, or acquisition cost moved with transferred birds. */
    cost: money(),
    counterpartFlockId: ref("Flock"),
    fromHouseId: ref("House"),
    toHouseId: ref("House"),
    /** Links the two halves of a transfer, split or merge. */
    groupId: { type: String },
    dailyRecordId: ref("DailyRecord"),
    chickLotId: ref("ChickLot"),
    buyerId: ref("Buyer"),
    orderId: ref("Order"),
    fromStatus: enumOf(FLOCK_STATUSES),
    toStatus: enumOf(FLOCK_STATUSES),
    reason: str({ max: 500 }),
    reversalOf: ref("FlockEvent"),
    note: text(1000),
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, date: 1 }, why: "A flock's ledger: population, calculations, day views, event history" }],
});

export const DailyRecordModel = defineCollection({
  model: "DailyRecord",
  collection: "daily_records",
  domain: D,
  ownership: "farm",
  description:
    "One record per flock per farm-local day, entered from web or mobile. Holds conditions, headcount, notes and photo references; its other sections are written to their source collections and linked by dailyRecordId: deaths, culls and average weight (flock_events), feed (feed_consumption), water (water_records), eggs (egg_records), health observations (health_records).",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    /** The flock's house on this day (flocks can move), for filtering by house. */
    houseId: ref("House", { required: true }),
    /** Copied from the flock (immutable there), for filtering by type without a join. */
    flockType: enumOf(FLOCK_TYPES, { required: true }),
    /** Headcount taken in the house; compared with the ledger, never applied to it. */
    observedBirdCount: int(),
    temperatureMinC: num({ min: -60, max: 70 }),
    temperatureMaxC: num({ min: -60, max: 70 }),
    humidityPercent: num({ max: 100 }),
    lightingHours: num({ max: 24 }),
    notes: text(2000),
    photos: {
      type: [new Schema({ assetId: ref("MediaAsset", { required: true }), caption: str({ max: 200 }) }, { _id: false })],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= 10, message: "At most 10 photos" },
    },
    /**
     * Derived: totals of what this record wrote to its source collections, rewritten in the same transaction.
     * Lets lists show a day at a glance without reading five collections. Dashboards aggregate the sources.
     */
    summary: {
      type: new Schema(
        {
          mortality: int({ default: 0 }),
          culls: int({ default: 0 }),
          feedKg: num({ default: 0 }),
          waterLitres: num(),
          eggsCollected: int(),
          eggsBroken: int(),
          averageWeightG: num({ max: 50_000 }),
          observations: int({ default: 0 }),
          photos: int({ default: 0 }),
        },
        { _id: false },
      ),
    },
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; also serves a flock's date-range history" },
    { fields: { farmId: 1, date: 1 }, why: "Dashboard and nightly alert job: all flocks' records for a day; missing-record detection" },
  ],
});

export const BirdWeightModel = defineCollection({
  model: "BirdWeight",
  collection: "bird_weights",
  domain: D,
  ownership: "farm",
  description: "A weigh session: individual sample weights of one flock on one day, with statistics computed from those weights.",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    weightsG: {
      type: [{ type: Number, min: 1, max: 50_000 }],
      required: true,
      validate: { validator: (v: number[]) => v.length >= 1 && v.length <= 2000, message: "1 to 2000 weights per session" },
    },
    /** Computed by the domain function weighSessionStats from weightsG on save. */
    stats: {
      type: new Schema(
        { count: int(), meanG: num(), minG: num(), maxG: num(), sdG: num(), cvPercent: num(), uniformityPercent: num({ max: 100 }) },
        { _id: false },
      ),
    },
    scaleEquipmentId: ref("Equipment"),
    note: text(500),
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, date: -1 }, why: "Growth curve and latest weight of a flock" }],
  configure: (schema) =>
    schema.pre("validate", function () {
      const w = (this.get("weightsG") ?? []) as number[];
      if (w.length) this.set("stats", weighSessionStats([...w]));
    }),
  notes: ["Sample weights are embedded: they are always read with their session and are bounded (≤ 2000)."],
});

export const EggRecordModel = defineCollection({
  model: "EggRecord",
  collection: "egg_records",
  domain: D,
  ownership: "farm",
  description: "Eggs collected from one flock on one day, by grade. Saving it posts a 'collected' movement to egg_inventory.",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    collected: int({ required: true }),
    byGrade: { type: Map, of: { type: Number, min: 0 }, default: undefined },
    broken: int({ default: 0 }),
    averageEggWeightG: num({ max: 150 }),
    qualityNotes: str({ max: 500 }),
    /** Laid during an egg withdrawal period: must not be sold. The date is the withdrawal's last day. */
    withheldUntil: localDate(),
    dailyRecordId: ref("DailyRecord"),
    notes: text(1000),
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; flock production chart and hen-day %" },
    { fields: { farmId: 1, date: 1 }, why: "Farm egg totals per day (dashboard, 14-day chart, egg-drop alerts)" },
  ],
  configure: (schema) =>
    schema.path("byGrade").validate(function (v: Map<string, number> | undefined) {
      return !v || [...v.keys()].every((k) => (EGG_GRADES as readonly string[]).includes(k));
    }, "byGrade keys must be egg grades"),
});

export const EggInventoryModel = defineCollection({
  model: "EggInventory",
  collection: "egg_inventory",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description:
    "Egg stock ledger. Each movement adds (collected, positive adjustment) or removes (sold, broken, used, spoiled) eggs; stock per grade is the sum of quantityDelta.",
  fields: {
    date: localDate({ required: true }),
    type: enumOf(EGG_MOVEMENT_TYPES, { required: true }),
    grade: enumOf(EGG_GRADES),
    quantityDelta: int({ required: true, min: -10_000_000 }),
    flockId: ref("Flock"),
    sourceType: enumOf(["egg_record", "order", "manual", "hatchery_batch"], { required: true }),
    sourceId: { type: String },
    reversalOf: ref("EggInventory"),
    note: text(500),
  },
  indexes: [
    { fields: { farmId: 1, grade: 1, date: 1 }, why: "Current stock per grade (sum) and movement history" },
    { fields: { farmId: 1, sourceId: 1 }, why: "Find the postings of an egg record or order to reverse them when it changes" },
  ],
  relations: [{ field: "sourceId", to: "EggRecord | Order", cardinality: "many-to-one", note: "Polymorphic by sourceType" }],
});

export const WaterRecordModel = defineCollection({
  model: "WaterRecord",
  collection: "water_records",
  domain: D,
  ownership: "farm",
  description:
    "Water drunk by one flock on one day, with source, quality (pH, dissolved solids, chlorine), treatment and abnormal-consumption flags. Falling intake is often the first sign of illness or heat stress.",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    litres: num({ required: true, max: 10_000_000 }),
    meterReading: num(),
    dailyRecordId: ref("DailyRecord"),
    source: enumOf(WATER_SOURCES),
    ph: num({ max: 14 }),
    tdsPpm: num({ max: 100_000 }),
    chlorinePpm: num({ max: 100 }),
    qualityRating: enumOf(WATER_QUALITY_RATINGS),
    treatment: enumOf(WATER_TREATMENTS),
    treatmentNotes: str({ max: 300 }),
    /** Derived on save: consumption against the flock's recent average, pH and dissolved solids against the farm's limits. */
    flags: { type: [enumOf(["consumption_high", "consumption_low", "ph_low", "ph_high", "tds_high"])], default: undefined },
    baselineLitres: num(),
    medicated: { type: Boolean, default: false },
    healthRecordId: ref("HealthRecord"),
    notes: text(500),
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; water-to-feed ratio chart" }],
});
