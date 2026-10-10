import { CHICK_LOT_STATUSES, CHICK_SOURCES, HATCHERY_BATCH_STATUSES, HATCHERY_EVENT_TYPES, SPECIES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { defineCollection, enumOf, int, localDate, money, num, ref, refs, str, text } from "./base.js";

const D = "Hatchery";

export const HatcheryBatchModel = defineCollection({
  model: "HatcheryBatch",
  collection: "hatchery_batches",
  domain: D,
  ownership: "farm",
  description: "Eggs set together in an incubator. Results are recorded as hatchery_events; hatched chicks become a chick lot.",
  fields: {
    code: str({ required: true, max: 40 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    breed: str({ max: 120 }),
    eggSource: enumOf(["own_flock", "purchased"], { required: true }),
    sourceFlockId: ref("Flock"),
    supplier: str({ max: 120 }),
    incubatorId: ref("Equipment"),
    setDate: localDate({ required: true }),
    incubationDays: int({ required: true, min: 10, max: 40 }),
    expectedHatchDate: localDate({ required: true }),
    eggsSet: int({ required: true, min: 1 }),
    status: enumOf(HATCHERY_BATCH_STATUSES, { required: true, default: "incubating" }),
    /** Latest results, updated in the same transaction as the hatchery_event that changed them. */
    results: {
      type: new Schema({ infertile: int(), earlyDead: int(), fertile: int(), deadInShell: int(), hatched: int(), culled: int() }, { _id: false }),
    },
    eggCost: money(),
    notes: text(1000),
  },
  indexes: [
    { fields: { farmId: 1, status: 1, expectedHatchDate: 1 }, why: "Incubating batches and hatches due (dashboard, calendar)" },
    { fields: { farmId: 1, code: 1 }, options: { unique: true }, why: "Batch codes unique within a farm; lookup by code from egg labels" },
  ],
});

export const HatcheryEventModel = defineCollection({
  model: "HatcheryEvent",
  collection: "hatchery_events",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description: "What happened to a batch: set, candling counts, transfer to hatcher, hatch and grading counts, environment readings.",
  fields: {
    batchId: ref("HatcheryBatch", { required: true }),
    type: enumOf(HATCHERY_EVENT_TYPES, { required: true }),
    date: localDate({ required: true }),
    counts: {
      type: new Schema({ candled: int(), infertile: int(), earlyDead: int(), deadInShell: int(), hatched: int(), gradeA: int(), culled: int() }, { _id: false }),
    },
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
