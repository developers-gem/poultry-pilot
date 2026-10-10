import {
  EGG_GRADES,
  EGG_MOVEMENT_TYPES,
  FLOCK_EVENT_TYPES,
  FLOCK_PURPOSES,
  FLOCK_STATUSES,
  HOUSE_TYPES,
  MORTALITY_CAUSES,
  SPECIES,
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
    mortality: int({ required: true }),
    culled: int({ required: true }),
    sold: int({ required: true }),
    transferredOut: int({ required: true }),
    alive: int({ required: true, min: -1_000_000 }),
    asOf: localDate({ required: true }),
  },
  { _id: false },
);

export const FlockModel = defineCollection({
  model: "Flock",
  collection: "flocks",
  domain: D,
  ownership: "farm",
  description: "A batch of birds managed together from placement to closure (broiler batch, layer flock, breeder flock).",
  fields: {
    name: str({ required: true, max: 120 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    purpose: enumOf(FLOCK_PURPOSES, { required: true }),
    breed: str({ max: 120 }),
    houseId: ref("House"),
    status: enumOf(FLOCK_STATUSES, { required: true, default: "planned" }),
    hatchDate: localDate(),
    plannedPlacementDate: localDate(),
    placementDate: localDate(),
    targetEndDate: localDate(),
    closedDate: localDate(),
    productionProfileKey: str({ max: 60 }),
    hatcheryBatchId: ref("HatcheryBatch"),
    notes: text(2000),
    /**
     * Derived snapshot of birds by cause, maintained by FlockService in the same transaction as every
     * flock_event and daily_record change. Rebuildable from those collections; never edited directly.
     */
    population: { type: PopulationSchema },
  },
  indexes: [
    { fields: { farmId: 1, status: 1, placementDate: -1 }, why: "Flock list and dashboard: active (or closed) flocks of a farm, newest first" },
    { fields: { farmId: 1, houseId: 1, status: 1 }, why: "House occupancy: is there an active flock in this house (placement capacity check)" },
  ],
});

export const FlockEventModel = defineCollection({
  model: "FlockEvent",
  collection: "flock_events",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description:
    "Population-changing events other than daily mortality and culls: placement, transfer, sale, depopulation, status change. Append-only; a mistake is corrected by an event with reversalOf.",
  fields: {
    flockId: ref("Flock", { required: true }),
    type: enumOf(FLOCK_EVENT_TYPES, { required: true }),
    date: localDate({ required: true }),
    birds: int({ min: 0 }),
    deadOnArrival: int(),
    ageDaysAtPlacement: int({ max: 2000 }),
    source: str({ max: 200 }),
    chickLotId: ref("ChickLot"),
    counterpartFlockId: ref("Flock"),
    toHouseId: ref("House"),
    totalLiveWeightKg: num(),
    orderId: ref("Order"),
    buyerId: ref("Buyer"),
    total: money(),
    cost: money(),
    fromStatus: enumOf(FLOCK_STATUSES),
    toStatus: enumOf(FLOCK_STATUSES),
    reversalOf: ref("FlockEvent"),
    note: text(1000),
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, date: 1 }, why: "Population timeline of one flock (rebuild snapshot, lifecycle view)" }],
});

export const DailyRecordModel = defineCollection({
  model: "DailyRecord",
  collection: "daily_records",
  domain: D,
  ownership: "farm",
  description:
    "One record per flock per farm-local day: deaths by cause, culls and house conditions. Eggs, feed and water have their own collections and reference the same flock and date.",
  fields: {
    flockId: ref("Flock", { required: true }),
    houseId: ref("House"),
    date: localDate({ required: true }),
    mortality: {
      type: [new Schema({ cause: enumOf(MORTALITY_CAUSES, { required: true }), count: int({ required: true, min: 1 }) }, { _id: false })],
      default: [],
    },
    /** Sum of mortality[].count, computed on save from the same document (cannot drift). */
    mortalityTotal: int({ default: 0 }),
    culls: int({ default: 0 }),
    temperatureMinC: num({ min: -60, max: 70 }),
    temperatureMaxC: num({ min: -60, max: 70 }),
    humidityPercent: num({ max: 100 }),
    lightingHours: num({ max: 24 }),
    notes: text(2000),
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; also serves a flock's date-range history" },
    { fields: { farmId: 1, date: 1 }, why: "Dashboard and nightly alert job: all flocks' records for a day; missing-record detection" },
  ],
  configure: (schema) =>
    schema.pre("validate", function () {
      const m = (this.get("mortality") ?? []) as { count: number }[];
      this.set("mortalityTotal", m.reduce((t, x) => t + x.count, 0));
    }),
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
    sourceType: enumOf(["egg_record", "order", "manual"], { required: true }),
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
  description: "Water drunk by one flock on one day (a leading indicator of illness and heat stress).",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    litres: num({ required: true, max: 10_000_000 }),
    meterReading: num(),
    medicated: { type: Boolean, default: false },
    healthRecordId: ref("HealthRecord"),
    notes: text(500),
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; water-to-feed ratio chart" }],
});
