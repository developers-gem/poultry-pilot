import { ARRIVAL_STATUSES, BROODER_BEHAVIOURS, CHICK_LOT_STATUSES, CHICK_SOURCES, EGG_GRADES, FLOCK_TYPES, HATCHERY_BATCH_STATUSES, HATCHERY_EVENT_TYPES, SPECIES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { LIVE, bool, defineCollection, enumOf, instant, int, localDate, money, num, ref, refs, str, text } from "./base.js";
import { ChecklistResultSchema } from "./biosecurity.js";

const D = "Hatchery";

const CountsSchema = new Schema(
  { infertile: int(), cracked: int(), deadEmbryo: int(), hatched: int(), deadInShell: int(), saleable: int(), culled: int() },
  { _id: false },
);

export const HatcheryBatchModel = defineCollection({
  model: "HatcheryBatch",
  collection: "hatchery_batches",
  domain: D,
  ownership: "farm",
  description:
    "Eggs selected and set together. Holds the egg source, selection rejects and setting details; counts and rates are derived from hatchery_events. Grading creates a chick lot.",
  fields: {
    code: str({ required: true, max: 40 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    breed: str({ max: 120 }),
    eggSource: enumOf(["own_flock", "purchased"], { required: true }),
    sourceFlockId: ref("Flock"),
    /** Own-flock eggs are drawn from egg stock (this grade, or ungraded). */
    eggGrade: enumOf(EGG_GRADES),
    supplier: str({ max: 120 }),
    eggsReceived: int({ required: true, min: 1 }),
    /** Eggs not set at selection, by reason. */
    rejects: { type: Map, of: { type: Number, min: 0 }, default: undefined },
    eggsSet: int({ required: true, min: 1 }),
    incubatorId: ref("Equipment"),
    hatcherId: ref("Equipment"),
    setDate: localDate({ required: true }),
    incubationDays: int({ required: true, min: 10, max: 40 }),
    expectedTransferDate: localDate({ required: true }),
    expectedHatchDate: localDate({ required: true }),
    status: enumOf(HATCHERY_BATCH_STATUSES, { required: true, default: "incubating" }),
    /** Derived from hatchery_events in the same transaction as each event. */
    results: {
      type: new Schema(
        {
          infertile: int(), cracked: int(), deadEmbryo: int(), transferred: int(), hatched: int(), deadInShell: int(), culled: int(), saleable: int(), inIncubation: int(),
          fertilityPercent: num({ max: 100 }), hatchabilityPercent: num({ max: 100 }), saleableChickPercent: num({ max: 100 }), lossPercent: num({ max: 100 }),
        },
        { _id: false },
      ),
    },
    eggCost: money(),
    otherCost: money(),
    chickLotId: ref("ChickLot"),
    cancelledReason: str({ max: 300 }),
    notes: text(1000),
  },
  indexes: [
    { fields: { farmId: 1, status: 1, expectedHatchDate: 1 }, why: "Incubating batches and hatches due (dashboard, calendar)" },
    { fields: { farmId: 1, code: 1 }, options: { unique: true, ...LIVE }, why: "Batch codes unique within a farm; lookup by code from egg trays" },
  ],
});

export const HatcheryEventModel = defineCollection({
  model: "HatcheryEvent",
  collection: "hatchery_events",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description:
    "The hatchery ledger: setting, candling, transfer to the hatcher, hatch, chick grading, machine readings and notes. Counts move only through these; a reversal cancels the latest counted event.",
  fields: {
    batchId: ref("HatcheryBatch", { required: true }),
    type: enumOf(HATCHERY_EVENT_TYPES, { required: true }),
    date: localDate({ required: true }),
    counts: { type: CountsSchema },
    machine: enumOf(["setter", "hatcher"]),
    temperatureC: num({ min: 0, max: 50 }),
    humidityPercent: num({ max: 100 }),
    chickLotId: ref("ChickLot"),
    reversalOf: ref("HatcheryEvent"),
    note: text(1000),
  },
  indexes: [{ fields: { farmId: 1, batchId: 1, date: 1 }, why: "Timeline of one batch" }],
});

export const ChickLotModel = defineCollection({
  model: "ChickLot",
  collection: "chicks",
  domain: D,
  ownership: "farm",
  description:
    "A lot of day-old chicks available to place or sell, from the farm's hatchery or bought in. Placements (flock_events) and chick sales (orders) draw it down.",
  fields: {
    source: enumOf(CHICK_SOURCES, { required: true }),
    hatcheryBatchId: ref("HatcheryBatch"),
    supplier: str({ max: 120 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    breed: str({ max: 120 }),
    hatchDate: localDate({ required: true }),
    quantity: int({ required: true, min: 1 }),
    /** Derived: quantity minus placements and sales, updated in the same transaction as each draw-down. */
    remaining: int({ required: true }),
    status: enumOf(CHICK_LOT_STATUSES, { required: true, default: "available" }),
    vaccinationsAtHatch: { type: [str({ max: 120 })], default: undefined },
    placedFlockIds: refs("Flock"),
    unitCost: money(),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, status: 1, hatchDate: -1 }, why: "Available chick lots for placement or sale" }],
});

// ---- ChickStart ---------------------------------------------------------------

export const BroodingProfileModel = defineCollection({
  model: "BroodingProfile",
  collection: "brooding_profiles",
  domain: "ChickStart",
  ownership: "farm",
  description:
    "The farm's brooding targets by day of age (temperature at chick level, humidity, target weight), taken from its breed guide or veterinarian. Brooder checks are compared with it. No targets are built in.",
  fields: {
    name: str({ required: true, max: 120 }),
    flockTypes: { type: [enumOf(FLOCK_TYPES)], default: undefined },
    bands: {
      type: [
        new Schema(
          { fromDay: int({ required: true, max: 120 }), toDay: int({ required: true, max: 120 }), tempMinC: num({ min: 0, max: 45 }), tempMaxC: num({ min: 0, max: 45 }), humidityMin: num({ max: 100 }), humidityMax: num({ max: 100 }), targetWeightG: num({ max: 10_000 }) },
          { _id: false },
        ),
      ],
      required: true,
      validate: { validator: (v: unknown[]) => v.length >= 1 && v.length <= 60, message: "1 to 60 bands" },
    },
    /** Where the targets come from, e.g. "Cobb 500 broiler management guide, 2024". */
    source: str({ max: 300 }),
    isDefault: bool(false),
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Profile list (prefix); names unique within a farm" }],
});

export const ChickArrivalModel = defineCollection({
  model: "ChickArrival",
  collection: "chick_arrivals",
  domain: "ChickStart",
  ownership: "farm",
  description:
    "A planned delivery of chicks into a house: preparation checklist, then the arrival itself (count, dead on arrival, chick weight and quality). Arrival places the chicks into a flock.",
  fields: {
    houseId: ref("House", { required: true }),
    expectedDate: localDate({ required: true }),
    expectedCount: int({ required: true, min: 1 }),
    source: enumOf(["own_hatchery", "chick_lot", "supplier"], { required: true }),
    hatcheryBatchId: ref("HatcheryBatch"),
    chickLotId: ref("ChickLot"),
    supplier: str({ max: 120 }),
    flockType: enumOf(FLOCK_TYPES, { required: true }),
    breed: str({ max: 120 }),
    broodingProfileId: ref("BroodingProfile"),
    status: enumOf(ARRIVAL_STATUSES, { required: true, default: "planned" }),
    preparation: {
      type: new Schema({ checklist: { type: ChecklistResultSchema, required: true }, completedAt: instant({ required: true }), completedBy: ref("User") }, { _id: false }),
    },
    arrival: {
      type: new Schema(
        {
          arrivedAt: instant({ required: true }),
          received: int({ required: true, min: 1 }),
          deadOnArrival: int({ default: 0 }),
          averageWeightG: num({ max: 200 }),
          sampleSize: int(),
          qualityNotes: str({ max: 500 }),
          checklist: { type: ChecklistResultSchema },
        },
        { _id: false },
      ),
    },
    flockId: ref("Flock"),
    cancelledReason: str({ max: 300 }),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, status: 1, expectedDate: 1 }, why: "Upcoming arrivals (calendar, preparation reminders)" }],
});

export const BrooderCheckModel = defineCollection({
  model: "BrooderCheck",
  collection: "brooder_checks",
  domain: "ChickStart",
  ownership: "farm",
  description:
    "A check of young chicks: temperature at chick level, humidity, behaviour, feed and water, crop fill, with optional checklist answers. Flags come from the farm's brooding profile for that day of age.",
  fields: {
    flockId: ref("Flock", { required: true }),
    houseId: ref("House"),
    checkedAt: instant({ required: true }),
    date: localDate({ required: true }),
    dayOfAge: int({ required: true, max: 2000 }),
    temperatureC: num({ min: -10, max: 60 }),
    humidityPercent: num({ max: 100 }),
    behaviour: enumOf(BROODER_BEHAVIOURS),
    feedAvailable: { type: Boolean },
    waterAvailable: { type: Boolean },
    /** Of chicks sampled, how many had full crops (checked in the first days). */
    cropFill: { type: new Schema({ sampled: int({ required: true, min: 1 }), full: int({ required: true }) }, { _id: false }) },
    checklist: { type: ChecklistResultSchema },
    flags: { type: [enumOf(["temperature_low", "temperature_high", "humidity_low", "humidity_high", "behaviour", "no_feed", "no_water"])], default: undefined },
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, checkedAt: -1 }, why: "A flock's brooder checks, newest first (brooding view)" }],
});
