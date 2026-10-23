import { z } from "zod";
import { FlockEventType, FlockStatus, FlockType, HouseType, MortalityCause, Species } from "../enums.js";
import { Count, Grams, Id, Kilograms, LocalDate, Money, NonEmptyText, OptionalText, PositiveCount } from "../primitives.js";
/** Flock engine contracts: houses, flocks, lifecycle events, daily records and calculations. */
// ---- houses -----------------------------------------------------------------
export const CreateHouseRequest = z
    .object({
    id: Id.optional(),
    name: NonEmptyText(80),
    type: HouseType,
    capacityBirds: PositiveCount.optional(),
    floorAreaM2: z.number().positive().max(1_000_000).optional(),
    notes: OptionalText(1000),
})
    .strict();
export const ReplaceHouseRequest = CreateHouseRequest.omit({ id: true })
    .extend({ status: z.enum(["active", "inactive"]), version: z.number().int().nonnegative() })
    .strict();
export const HouseView = z.object({
    id: z.string(),
    name: z.string(),
    type: HouseType,
    capacityBirds: z.number().optional(),
    floorAreaM2: z.number().optional(),
    status: z.enum(["active", "inactive"]),
    notes: z.string().optional(),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
// ---- flocks -----------------------------------------------------------------
export const Placement = z
    .object({
    date: LocalDate,
    count: PositiveCount,
    deadOnArrival: Count.default(0),
    /** Average weight per bird at placement, grams (e.g. 40 for day-old broiler chicks). */
    startingWeightG: Grams.positive().optional(),
    /** Total cost of the birds placed. */
    chickCost: Money.optional(),
    ageDaysAtPlacement: z.number().int().min(0).max(2000).default(0),
    /** Place from a chick lot in inventory: the lot is drawn down, and its unit cost is used if chickCost is not given. */
    chickLotId: Id.optional(),
})
    .strict()
    .refine((p) => p.deadOnArrival <= p.count, { message: "Dead on arrival cannot exceed birds placed", path: ["deadOnArrival"] });
const FlockBase = z.object({
    name: NonEmptyText(120),
    flockCode: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._\-/ ]+$/, "Letters, digits, spaces and . _ - / only"),
    type: FlockType,
    /** Required when type is custom, e.g. "Kadaknath", "Geese". */
    customTypeName: NonEmptyText(60).optional(),
    species: Species.default("chicken"),
    breed: OptionalText(120),
    strain: OptionalText(120),
    /** Where the birds came from: hatchery or supplier name. */
    source: OptionalText(200),
    houseId: Id,
    hatchDate: LocalDate.optional(),
    targetSaleDate: LocalDate.optional(),
    notes: OptionalText(2000),
});
const customNeedsName = (f) => f.type !== "custom" || !!f.customTypeName;
/** Creating with `placement` places the birds at once (status active); without it the flock is planned. */
/** flockCode is optional on create: left out, the farm numbers it (e.g. B-2610-1 for the first broiler batch of Oct 2026). */
export const CreateFlockRequest = FlockBase.extend({ id: Id.optional(), flockCode: FlockBase.shape.flockCode.optional(), placement: Placement.optional() })
    .strict()
    .refine(customNeedsName, { message: "Name the custom poultry type", path: ["customTypeName"] });
/** PUT: descriptive fields only. Type, house and placement change through their own commands. */
export const ReplaceFlockRequest = FlockBase.omit({ type: true, species: true, houseId: true })
    .extend({ version: z.number().int().nonnegative() })
    .strict();
export const FlockListQuery = z.object({
    status: FlockStatus.optional(),
    houseId: Id.optional(),
    type: FlockType.optional(),
});
// ---- lifecycle commands -----------------------------------------------------
const note = OptionalText(1000);
export const PlaceFlockRequest = Placement;
export const MortalityRequest = z.object({ date: LocalDate, count: PositiveCount, cause: MortalityCause.default("unknown"), notes: note }).strict();
export const CullRequest = z.object({ date: LocalDate, count: PositiveCount, reason: OptionalText(200), notes: note }).strict();
export const TransferRequest = z.discriminatedUnion("mode", [
    /** Move the whole flock to another house. The bird count does not change. */
    z.object({ mode: z.literal("house"), date: LocalDate, toHouseId: Id, notes: note }).strict(),
    /** Move some birds into another active flock. */
    z.object({ mode: z.literal("flock"), date: LocalDate, toFlockId: Id, birds: PositiveCount, totalLiveWeightKg: Kilograms.positive().optional(), notes: note }).strict(),
]);
/** Move some birds out into a NEW flock, which inherits type, species, breed, strain and source. */
export const SplitRequest = z
    .object({
    date: LocalDate,
    birds: PositiveCount,
    totalLiveWeightKg: Kilograms.positive().optional(),
    newFlock: z.object({ id: Id.optional(), name: NonEmptyText(120), flockCode: FlockBase.shape.flockCode, houseId: Id }).strict(),
    notes: note,
})
    .strict();
/** Move every remaining bird into another flock of the same type and species; this flock then closes. */
export const MergeRequest = z.object({ date: LocalDate, intoFlockId: Id, totalLiveWeightKg: Kilograms.positive().optional(), notes: note }).strict();
export const SaleRequest = z
    .object({
    date: LocalDate,
    birds: PositiveCount,
    totalLiveWeightKg: Kilograms.positive().optional(),
    pricePerKg: Money.optional(),
    pricePerBird: Money.optional(),
    total: Money.optional(),
    // buyerId is added with the buyers module, so the server can check the buyer belongs to this farm.
    notes: note,
})
    .strict()
    .refine((s) => [s.pricePerKg, s.pricePerBird, s.total].filter(Boolean).length === 1, { message: "Give exactly one of pricePerKg, pricePerBird or total", path: ["total"] })
    .refine((s) => !s.pricePerKg || s.totalLiveWeightKg, { message: "A price per kg needs the total live weight sold", path: ["totalLiveWeightKg"] });
export const AdjustmentRequest = z
    .object({ date: LocalDate, delta: z.number().int().min(-10_000_000).max(10_000_000).refine((d) => d !== 0, "Adjustment cannot be zero"), reason: z.string().trim().min(3).max(500) })
    .strict();
export const WeighingRequest = z
    .object({
    date: LocalDate,
    /** Individual bird weights in grams (preferred: gives uniformity and CV). */
    weightsG: z.array(Grams.positive()).min(1).max(2000).optional(),
    /** Or just the average and how many birds were weighed. */
    averageWeightG: Grams.positive().optional(),
    sampleSize: PositiveCount.optional(),
    notes: OptionalText(500),
})
    .strict()
    .refine((w) => !!w.weightsG !== !!w.averageWeightG, { message: "Give either weightsG or averageWeightG", path: ["weightsG"] });
export const CloseFlockRequest = z.object({ date: LocalDate, notes: note }).strict();
export const ReverseEventRequest = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
export const DateRangeQuery = z.object({ from: LocalDate.optional(), to: LocalDate.optional() });
export const MetricsQuery = z.object({
    asOf: LocalDate.optional(),
    /** Live price per kg in minor units, to value birds still on the farm. */
    referencePricePerKgMinor: z.coerce.number().int().nonnegative().optional(),
});
// ---- views ------------------------------------------------------------------
export const FlockMetricsView = z.object({
    asOf: z.string(),
    ageDays: z.number().nullable(),
    stage: z.string().nullable(),
    currentBirdCount: z.number(),
    placed: z.number(),
    deadOnArrival: z.number(),
    transferredIn: z.number(),
    birdsIn: z.number(),
    mortalityCount: z.number(),
    cullCount: z.number(),
    sold: z.number(),
    transferredOut: z.number(),
    adjustments: z.number(),
    mortalityRate: z.number().nullable(),
    cullRate: z.number().nullable(),
    survivalRate: z.number().nullable(),
    averageWeightG: z.number().nullable(),
    latestWeighingDate: z.string().nullable(),
    dailyWeightGainG: z.number().nullable(),
    recentDailyWeightGainG: z.number().nullable(),
    feedConsumedKg: z.number(),
    feedWastedKg: z.number(),
    uncostedFeedKg: z.number(),
    feedPerBirdKg: z.number().nullable(),
    feedCostMinor: z.number(),
    feedCostPerBirdMinor: z.number().nullable(),
    /** Minor units per egg; can be fractional (e.g. 252.4 paise). */
    feedCostPerEggMinor: z.number().nullable(),
    eggsCollected: z.number(),
    liveWeightKg: z.number().nullable(),
    weightProducedKg: z.number().nullable(),
    /** Liveweight FCR: feed eaten ÷ (live weight + weight sold or moved out). */
    fcr: z.number().nullable(),
    /** Days with feed recorded out of the flock's days so far; FCR is flagged below 80%. */
    feedDaysRecorded: z.number().int(),
    feedDaysExpected: z.number().int(),
    /** FCR in doubt: "feed_gaps" (a caution: entries missing or recorded in bulk) or "implausibly_low" (feed or weight wrong; EPEF withheld, not benchmarked). */
    fcrWarning: z.enum(["feed_gaps", "implausibly_low"]).nullable(),
    /** Feed eaten ÷ weight gained on this farm (excludes the weight birds arrived with). */
    feedPerKgGainKg: z.number().nullable(),
    currency: z.string(),
    revenueMinor: z.number(),
    cost: z.object({ chickMinor: z.number(), transferredInMinor: z.number(), transferredOutMinor: z.number(), feedMinor: z.number(), otherMinor: z.number(), totalMinor: z.number() }),
    profitMinor: z.number(),
    marginPercent: z.number().nullable(),
    liveInventoryValueMinor: z.number().nullable(),
    projectedProfitMinor: z.number().nullable(),
    projectedMarginPercent: z.number().nullable(),
    costPerBirdMinor: z.number().nullable(),
    costPerKgProducedMinor: z.number().nullable(),
    costsComplete: z.boolean(),
    fcrIncludesMortalityWeight: z.boolean(),
});
export const FlockView = z.object({
    id: z.string(),
    farmId: z.string(),
    houseId: z.string(),
    name: z.string(),
    flockCode: z.string(),
    type: FlockType,
    customTypeName: z.string().optional(),
    species: Species,
    breed: z.string().optional(),
    strain: z.string().optional(),
    source: z.string().optional(),
    hatchDate: z.string().optional(),
    placementDate: z.string().optional(),
    placementCount: z.number().optional(),
    startingWeightG: z.number().optional(),
    chickCost: Money.optional(),
    targetSaleDate: z.string().optional(),
    closedDate: z.string().optional(),
    status: FlockStatus,
    splitFromFlockId: z.string().optional(),
    notes: z.string().optional(),
    currentBirdCount: z.number(),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    metrics: FlockMetricsView.optional(),
});
export const FlockEventView = z.object({
    id: z.string(),
    flockId: z.string(),
    type: FlockEventType,
    date: z.string(),
    birds: z.number().optional(),
    deadOnArrival: z.number().optional(),
    delta: z.number().optional(),
    cause: MortalityCause.optional(),
    totalLiveWeightKg: z.number().optional(),
    averageWeightG: z.number().optional(),
    sampleSize: z.number().optional(),
    total: Money.optional(),
    cost: Money.optional(),
    counterpartFlockId: z.string().optional(),
    fromHouseId: z.string().optional(),
    toHouseId: z.string().optional(),
    groupId: z.string().optional(),
    dailyRecordId: z.string().optional(),
    reason: z.string().optional(),
    reversalOf: z.string().optional(),
    reversed: z.boolean(),
    createdBy: z.string(),
    createdAt: z.string(),
});
//# sourceMappingURL=flock.js.map