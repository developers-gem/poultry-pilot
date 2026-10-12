import * as C from "@poultrypilot/constants";
import { z } from "zod";
import { EggGrade, FlockType, Species } from "../enums.js";
import { Count, Id, Instant, LocalDate, Money, NonEmptyText, OptionalText, PositiveCount } from "../primitives.js";
import { ChecklistAnswers } from "./biosecurity.js";

/** HatcheryHub (egg source → delivery), chick orders, ChickStart and the farm calendar. */

export const CreateHatcheryBatchRequest = z
  .object({
    id: Id.optional(),
    code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._\-/ ]+$/, "Letters, digits, spaces and . _ - / only"),
    species: Species.default("chicken"),
    breed: OptionalText(120),
    eggSource: z.enum(["own_flock", "purchased"]),
    sourceFlockId: Id.optional(),
    /** Own-flock eggs are drawn from this egg grade in stock (default: ungraded). */
    eggGrade: EggGrade.optional(),
    supplier: OptionalText(120),
    eggsReceived: PositiveCount,
    /** Eggs not set at selection, by reason. */
    rejects: z.record(z.enum(C.EGG_REJECT_REASONS), Count).optional(),
    setDate: LocalDate,
    /** Defaults to the species' typical period (chicken 21, duck and turkey 28, quail 17, guinea fowl 27). */
    incubationDays: z.number().int().min(10).max(40).optional(),
    incubatorId: Id.optional(),
    eggCost: Money.optional(),
    otherCost: Money.optional(),
    notes: OptionalText(1000),
  })
  .strict()
  .refine((b) => b.eggSource !== "own_flock" || !!b.sourceFlockId, { message: "Name the flock the eggs came from", path: ["sourceFlockId"] });

export const CandlingRequest = z.object({ date: LocalDate, infertile: Count.default(0), deadEmbryo: Count.default(0), cracked: Count.default(0), note: OptionalText(500) }).strict();
export const TransferToHatcherRequest = z.object({ date: LocalDate, cracked: Count.default(0), deadEmbryo: Count.default(0), hatcherId: Id.optional(), note: OptionalText(500) }).strict();
/** deadInShell defaults to every egg in the hatcher that did not hatch. */
export const HatchRequest = z.object({ date: LocalDate, hatched: Count, deadInShell: Count.optional(), note: OptionalText(500) }).strict();
export const GradingRequest = z.object({ date: LocalDate, saleable: Count, culled: Count.default(0), note: OptionalText(500) }).strict();
export const MachineReadingRequest = z
  .object({ date: LocalDate, machine: z.enum(["setter", "hatcher"]), temperatureC: z.number().min(0).max(50).optional(), humidityPercent: z.number().min(0).max(100).optional(), note: OptionalText(500) })
  .strict()
  .refine((r) => r.temperatureC !== undefined || r.humidityPercent !== undefined || !!r.note, { message: "Give a reading or a note", path: ["note"] });
export const ReasonRequest = z.object({ reason: z.string().trim().min(3).max(300) }).strict();
export const BatchListQuery = z.object({ status: z.enum(C.HATCHERY_BATCH_STATUSES).optional() });
export const HatcherySummaryQuery = z.object({ from: LocalDate.optional(), to: LocalDate.optional() });

// ---- buyers and chick orders ----------------------------------------------------

export const BuyerRequest = z
  .object({ name: NonEmptyText(120), type: z.enum(["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"]).default("other"), phone: OptionalText(30), email: z.string().email().max(254).optional(), locationLabel: OptionalText(200), notes: OptionalText(1000) })
  .strict();

export const ChickOrderRequest = z
  .object({
    buyerId: Id,
    quantity: PositiveCount,
    unitPrice: Money,
    requestedDeliveryDate: LocalDate.optional(),
    /** Order from chicks in stock... */
    chickLotId: Id.optional(),
    /** ...or book against a batch still incubating. */
    hatcheryBatchId: Id.optional(),
    deliveryAddress: OptionalText(300),
    notes: OptionalText(1000),
  })
  .strict()
  .refine((o) => !!o.chickLotId !== !!o.hatcheryBatchId, { message: "Give either chickLotId or hatcheryBatchId", path: ["chickLotId"] });

export const DeliverOrderRequest = z.object({ date: LocalDate, chickLotId: Id.optional() }).strict();
export const OrderListQuery = z.object({ status: z.enum(C.ORDER_STATUSES).optional(), from: LocalDate.optional(), to: LocalDate.optional() });

// ---- ChickStart ----------------------------------------------------------------

const Band = z
  .object({
    fromDay: z.number().int().min(0).max(120),
    toDay: z.number().int().min(0).max(120),
    tempMinC: z.number().min(0).max(45).optional(),
    tempMaxC: z.number().min(0).max(45).optional(),
    humidityMin: z.number().min(0).max(100).optional(),
    humidityMax: z.number().min(0).max(100).optional(),
    targetWeightG: z.number().positive().max(10_000).optional(),
  })
  .strict();

export const BroodingProfileRequest = z
  .object({
    name: NonEmptyText(120),
    flockTypes: z.array(FlockType).max(5).optional(),
    bands: z.array(Band).min(1).max(60),
    /** Where the targets come from: the breed's management guide or the farm's veterinarian. */
    source: OptionalText(300),
    isDefault: z.boolean().default(false),
  })
  .strict();

export const PlanArrivalRequest = z
  .object({
    houseId: Id,
    expectedDate: LocalDate,
    expectedCount: PositiveCount,
    source: z.enum(["own_hatchery", "chick_lot", "supplier"]),
    hatcheryBatchId: Id.optional(),
    chickLotId: Id.optional(),
    supplier: OptionalText(120),
    flockType: FlockType,
    breed: OptionalText(120),
    broodingProfileId: Id.optional(),
    notes: OptionalText(1000),
  })
  .strict();

export const ArrivalListQuery = z.object({ status: z.enum(C.ARRIVAL_STATUSES).optional() });
export const PreparationRequest = z.object({ checklist: ChecklistAnswers }).strict();

export const ArriveRequest = z
  .object({
    arrivedAt: Instant.optional(),
    received: PositiveCount,
    deadOnArrival: Count.default(0),
    averageWeightG: z.number().positive().max(200).optional(),
    sampleSize: PositiveCount.optional(),
    qualityNotes: OptionalText(500),
    checklist: ChecklistAnswers.optional(),
    flock: z.object({ name: NonEmptyText(120), flockCode: z.string().trim().min(1).max(40), chickCost: Money.optional() }).strict(),
  })
  .strict()
  .refine((a) => a.deadOnArrival <= a.received, { message: "Dead on arrival cannot exceed chicks received", path: ["deadOnArrival"] });

export const BrooderCheckRequest = z
  .object({
    flockId: Id,
    checkedAt: Instant.optional(),
    /** Measured at chick height. */
    temperatureC: z.number().min(-10).max(60).optional(),
    humidityPercent: z.number().min(0).max(100).optional(),
    behaviour: z.enum(C.BROODER_BEHAVIOURS).optional(),
    feedAvailable: z.boolean().optional(),
    waterAvailable: z.boolean().optional(),
    cropFill: z.object({ sampled: PositiveCount, full: Count }).strict().optional(),
    checklist: ChecklistAnswers.optional(),
    notes: OptionalText(1000),
  })
  .strict();

export const BroodingViewQuery = z.object({ days: z.coerce.number().int().min(1).max(60).default(14) });

export const CalendarQuery = z
  .object({
    from: LocalDate,
    to: LocalDate,
    types: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").map((t) => t.trim()).filter(Boolean) : undefined))
      .pipe(z.array(z.enum(["transfer_expected", "hatch_expected", "chick_delivery", "chick_arrival", "vaccination_due", "cleaning_due", "health_follow_up"])).optional()),
  })
  .refine((q) => q.from <= q.to, { message: "from must be on or before to", path: ["from"] });
