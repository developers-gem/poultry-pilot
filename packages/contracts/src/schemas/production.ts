import { z } from "zod";
import {
  Celsius,
  Count,
  Grams,
  Id,
  Kilograms,
  LocalDate,
  NonEmptyText,
  OptionalText,
  PositiveCount,
  Money,
} from "../primitives.js";
import { EggGrade, FlockPurpose, MortalityCause, Species } from "../enums.js";

/** Phase 2 contracts. Defined now so domain calculations and Flutter models share shapes from day one. */

export const CreateFlockRequest = z.object({
  id: Id,
  name: NonEmptyText(120),
  species: Species.default("chicken"),
  purpose: FlockPurpose,
  breed: OptionalText(120),
  houseId: Id.optional(),
  hatchDate: LocalDate.optional(),
  plannedPlacementDate: LocalDate.optional(),
  targetEndDate: LocalDate.optional(),
  productionProfileId: Id.optional(),
});

export const PlacementCommand = z.object({
  id: Id,
  date: LocalDate,
  birdsReceived: PositiveCount,
  deadOnArrival: Count.default(0),
  ageDaysAtPlacement: z.number().int().min(0).max(1000).default(0),
  source: OptionalText(200),
  hatcheryBatchId: Id.optional(),
  cost: Money.optional(),
});

export const SaleCommand = z.object({
  id: Id,
  date: LocalDate,
  birds: PositiveCount,
  totalLiveWeightKg: Kilograms.positive(),
  pricePerKg: Money.optional(),
  total: Money,
  buyerId: Id.optional(),
  orderId: Id.optional(),
  note: OptionalText(500),
});

export const MortalityEntry = z.object({ count: PositiveCount, cause: MortalityCause.default("unknown") });

/** One record per flock per farm-local date. Upserted; edits are versioned and audited. */
export const DailyRecordUpsert = z.object({
  id: Id,
  flockId: Id,
  date: LocalDate,
  mortality: z.array(MortalityEntry).max(10).default([]),
  culled: Count.default(0),
  feedIssued: z.array(z.object({ feedItemId: Id, kg: Kilograms.positive() })).max(10).default([]),
  waterLitres: z.number().nonnegative().max(10_000_000).optional(),
  eggs: z
    .object({
      collected: Count,
      byGrade: z.record(EggGrade, Count).optional(),
    })
    .optional(),
  temperatureMinC: Celsius.optional(),
  temperatureMaxC: Celsius.optional(),
  notes: OptionalText(1000),
  baseVersion: z.number().int().nonnegative().optional(),
});
export type DailyRecordUpsert = z.infer<typeof DailyRecordUpsert>;

export const WeighSessionCreate = z.object({
  id: Id,
  flockId: Id,
  date: LocalDate,
  weightsG: z.array(Grams.positive()).min(1).max(2000),
  note: OptionalText(500),
});
export type WeighSessionCreate = z.infer<typeof WeighSessionCreate>;
