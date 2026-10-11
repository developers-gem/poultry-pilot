import { z } from "zod";
import { EggGrade, FeedConsumptionKind, FlockType, MortalityCause, WaterQualityRating, WaterSource, WaterTreatment } from "../enums.js";
import { Celsius, Count, Cursor, Grams, Id, Kilograms, LocalDate, Money, OptionalText, PositiveCount } from "../primitives.js";

/**
 * Daily farm operations: one record per flock per farm-local day, entered from web or mobile with the same shapes.
 * Each section is written to its source collection in one transaction:
 *   mortality, culls, averageWeight → flock_events · feed → feed_consumption · water → water_records
 *   eggs → egg_records (+ egg_inventory) · healthObservations → health_records · photos → media_assets
 */

const MortalityLine = z.object({ cause: MortalityCause, count: PositiveCount }).strict();

const FeedLine = z
  .object({
    quantityKg: Kilograms.positive(),
    /** consumption (eaten, counts in FCR) or wastage (spilled or spoiled in the house). */
    kind: FeedConsumptionKind.default("consumption"),
    /** A feed item from inventory: stock moves automatically and the feed is costed at its lots' prices. */
    feedItemId: Id.optional(),
    /** For feed not tracked in inventory: the price per kg. Not allowed together with feedItemId. */
    unitCostPerKg: Money.optional(),
    reason: OptionalText(300),
  })
  .strict()
  .refine((f) => !(f.feedItemId && f.unitCostPerKg), { message: "A feed item is costed from its stock; leave out unitCostPerKg", path: ["unitCostPerKg"] });

const WaterQuality = z
  .object({
    source: WaterSource.optional(),
    ph: z.number().min(0).max(14).optional(),
    tdsPpm: z.number().nonnegative().max(100_000).optional(),
    chlorinePpm: z.number().nonnegative().max(100).optional(),
    qualityRating: WaterQualityRating.optional(),
    treatment: WaterTreatment.optional(),
    treatmentNotes: OptionalText(300),
  })
  .strict();

const Eggs = z
  .object({
    /** Every egg gathered, including broken ones. */
    collected: Count,
    /** Broken eggs (part of collected). Removed from stock. */
    broken: Count.default(0),
    /** Unbroken eggs by grade; the sum cannot exceed collected − broken. Ungraded eggs are the remainder. */
    byGrade: z.record(EggGrade, Count).optional(),
    averageEggWeightG: z.number().positive().max(150).optional(),
    qualityNotes: OptionalText(500),
  })
  .strict()
  .refine((e) => e.broken <= e.collected, { message: "Broken eggs cannot exceed eggs collected", path: ["broken"] })
  .refine((e) => !e.byGrade || Object.values(e.byGrade).reduce((t, n) => t + (n ?? 0), 0) <= e.collected - e.broken, {
    message: "Graded eggs cannot exceed unbroken eggs (collected − broken)",
    path: ["byGrade"],
  });

const AverageWeight = z.object({ averageWeightG: Grams.positive(), sampleSize: PositiveCount.optional() }).strict();

const HealthObservation = z
  .object({
    /** What was seen, in the farmer's words. PoultryPilot records observations; it does not diagnose. */
    signs: z.string().trim().min(2).max(1000),
    affectedBirds: Count.optional(),
  })
  .strict();

const Photo = z.object({ assetId: Id, caption: OptionalText(200) }).strict();

/** Every section of a daily record. Omitted optional sections are empty; arrays default to empty. */
export const DailyRecordFields = z
  .object({
    /** Birds counted in the house today (a headcount). Compared with the ledger; differences are shown, not applied. */
    observedBirdCount: Count.optional(),
    mortality: z.array(MortalityLine).max(10).default([]),
    culls: Count.default(0),
    feed: z.array(FeedLine).max(10).default([]),
    waterLitres: z.number().nonnegative().max(10_000_000).optional(),
    /** Source, quality and treatment of the day's water. Needs waterLitres. */
    waterQuality: WaterQuality.optional(),
    temperatureMinC: Celsius.optional(),
    temperatureMaxC: Celsius.optional(),
    humidityPercent: z.number().min(0).max(100).optional(),
    lightingHours: z.number().min(0).max(24).optional(),
    eggs: Eggs.optional(),
    averageWeight: AverageWeight.optional(),
    healthObservations: z.array(HealthObservation).max(5).default([]),
    notes: OptionalText(2000),
    photos: z.array(Photo).max(10).default([]),
  })
  .strict();

const tempOrder = <T extends { temperatureMinC?: number; temperatureMaxC?: number }>(r: T) =>
  r.temperatureMinC === undefined || r.temperatureMaxC === undefined || r.temperatureMinC <= r.temperatureMaxC;
const tempMsg = { message: "Minimum temperature is above the maximum", path: ["temperatureMinC"] };
const waterNeedsLitres = <T extends { waterQuality?: unknown; waterLitres?: number }>(r: T) => !r.waterQuality || r.waterLitres !== undefined;
const waterMsg = { message: "Give waterLitres with waterQuality", path: ["waterLitres"] };

/** POST /farms/:farmId/daily-records. `id` may be generated on the device (offline). */
export const CreateDailyRecordRequest = DailyRecordFields.extend({ id: Id.optional(), flockId: Id, date: LocalDate }).strict().refine(tempOrder, tempMsg).refine(waterNeedsLitres, waterMsg);

/** PUT /daily-records/:id — replaces every section. `version` must match (optimistic concurrency). */
export const UpdateDailyRecordRequest = DailyRecordFields.extend({ version: z.number().int().nonnegative() }).strict().refine(tempOrder, tempMsg).refine(waterNeedsLitres, waterMsg);

/** PUT /farms/:farmId/flocks/:flockId/daily-records/:date — create or replace by flock and date (offline-friendly). */
export const UpsertDailyRecordRequest = DailyRecordFields.extend({ version: z.number().int().nonnegative().optional() }).strict().refine(tempOrder, tempMsg).refine(waterNeedsLitres, waterMsg);

export const DailyRecordListQuery = z.object({
  date: LocalDate.optional(),
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  houseId: Id.optional(),
  flockId: Id.optional(),
  /** Flock type: broiler, layer, breeder, chick or custom. */
  type: FlockType.optional(),
  cursor: Cursor.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ---- views ------------------------------------------------------------------

/** Totals of what this record itself recorded. Stored on the record for fast lists. */
export const DailyRecordSummary = z.object({
  mortality: z.number(),
  culls: z.number(),
  feedKg: z.number(),
  waterLitres: z.number().nullable(),
  eggsCollected: z.number().nullable(),
  eggsBroken: z.number().nullable(),
  averageWeightG: z.number().nullable(),
  observations: z.number(),
  photos: z.number(),
});

export const DailyRecordListItem = z.object({
  id: z.string(),
  flockId: z.string(),
  flockCode: z.string(),
  houseId: z.string(),
  flockType: FlockType,
  date: z.string(),
  summary: DailyRecordSummary,
  version: z.number(),
  createdBy: z.string(),
  updatedAt: z.string(),
});

export const DailyRecordView = z.object({
  id: z.string().nullable(),
  flockId: z.string(),
  flockCode: z.string().optional(),
  houseId: z.string().optional(),
  flockType: FlockType.optional(),
  date: z.string(),
  observedBirdCount: z.number().optional(),
  /** Birds alive at the end of the day according to the flock ledger. */
  birdsAliveEndOfDay: z.number(),
  /** observedBirdCount − birdsAliveEndOfDay, when a headcount was entered. */
  countDifference: z.number().optional(),
  /** Every death recorded for the day: from this record and from separate mortality entries. */
  mortality: z.array(z.object({ cause: MortalityCause, count: z.number(), eventId: z.string(), fromDailyRecord: z.boolean() })),
  mortalityTotal: z.number(),
  culls: z.number(),
  feed: z.array(z.object({ id: z.string(), kind: FeedConsumptionKind, quantityKg: z.number(), feedItemId: z.string().optional(), cost: Money.optional() })),
  feedKg: z.number(),
  waterLitres: z.number().optional(),
  water: z
    .object({
      source: WaterSource.optional(),
      ph: z.number().optional(),
      tdsPpm: z.number().optional(),
      chlorinePpm: z.number().optional(),
      qualityRating: WaterQualityRating.optional(),
      treatment: WaterTreatment.optional(),
      treatmentNotes: z.string().optional(),
      flags: z.array(z.string()),
      baselineLitres: z.number().nullable(),
    })
    .optional(),
  temperatureMinC: z.number().optional(),
  temperatureMaxC: z.number().optional(),
  humidityPercent: z.number().optional(),
  lightingHours: z.number().optional(),
  eggs: z
    .object({ collected: z.number(), broken: z.number(), byGrade: z.record(z.number()).optional(), averageEggWeightG: z.number().optional(), qualityNotes: z.string().optional(), henDayPercent: z.number().nullable() })
    .optional(),
  averageWeight: z.object({ averageWeightG: z.number(), sampleSize: z.number().optional(), eventId: z.string() }).optional(),
  healthObservations: z.array(z.object({ id: z.string(), signs: z.string(), affectedBirds: z.number().optional() })),
  notes: z.string().optional(),
  photos: z.array(z.object({ assetId: z.string(), caption: z.string().optional(), url: z.string() })),
  version: z.number().nullable(),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** Returned instead of the full view when the client sends `Prefer: return=minimal` (saves mobile data). */
export const DailyRecordMinimal = z.object({ id: z.string(), version: z.number(), summary: DailyRecordSummary });

/** GET /farms/:farmId/daily-records/sheet — everything a phone needs to enter a day, in one call. */
export const DailyEntrySheet = z.object({
  date: z.string(),
  today: z.string(),
  editWindowStart: z.string(),
  flocks: z.array(
    z.object({
      flockId: z.string(),
      flockCode: z.string(),
      name: z.string(),
      type: FlockType,
      houseId: z.string(),
      houseName: z.string(),
      expectedBirds: z.number(),
      laying: z.boolean(),
      record: z.object({ id: z.string(), version: z.number(), summary: DailyRecordSummary }).nullable(),
      /** Yesterday's figures, to pre-fill or compare. */
      previous: DailyRecordSummary.nullable(),
    }),
  ),
});

export const MediaAssetView = z.object({ id: z.string(), contentType: z.string(), sizeBytes: z.number(), url: z.string(), createdAt: z.string() });

// ---- dashboards ---------------------------------------------------------------

export const DashboardDayQuery = z.object({ date: LocalDate.optional(), houseId: Id.optional(), type: FlockType.optional() });

const DayTotals = z.object({
  birdsAlive: z.number(),
  mortality: z.number(),
  culls: z.number(),
  feedKg: z.number(),
  waterLitres: z.number(),
  eggsCollected: z.number(),
  eggsBroken: z.number(),
  henDayPercent: z.number().nullable(),
  mortalityRatePercent: z.number().nullable(),
});

export const DashboardDayView = z.object({
  date: z.string(),
  totals: DayTotals,
  flocksTotal: z.number(),
  flocksRecorded: z.number(),
  flocks: z.array(
    DayTotals.extend({
      flockId: z.string(),
      flockCode: z.string(),
      type: FlockType,
      houseId: z.string(),
      recorded: z.boolean(),
      recordId: z.string().nullable(),
      latestAverageWeightG: z.number().nullable(),
      waterToFeedRatio: z.number().nullable(),
    }),
  ),
});

export const TrendsQuery = z
  .object({ from: LocalDate, to: LocalDate, flockId: Id.optional(), houseId: Id.optional(), type: FlockType.optional() })
  .refine((q) => q.from <= q.to, { message: "from must be on or before to", path: ["from"] });

export const TrendsView = z.object({
  from: z.string(),
  to: z.string(),
  flockIds: z.array(z.string()),
  days: z.array(z.object({ date: z.string(), mortality: z.number(), culls: z.number(), feedKg: z.number(), waterLitres: z.number(), eggsCollected: z.number(), eggsBroken: z.number(), records: z.number() })),
  totals: z.object({ mortality: z.number(), culls: z.number(), feedKg: z.number(), waterLitres: z.number(), eggsCollected: z.number(), eggsBroken: z.number(), records: z.number() }),
});
