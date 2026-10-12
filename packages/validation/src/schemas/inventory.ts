import { z } from "zod";
import { EggGrade, FeedConsumptionKind, FeedStage, FlockStatus, InventoryCategory, Species, StockUnit, AlertRuleType, AlertStatus } from "../enums.js";
import { Count, Id, LocalDate, Money, NonEmptyText, OptionalText, PositiveCount } from "../primitives.js";

/** FeedWise and inventory: catalog, purchases (lots), use, wastage, stock counts, eggs, chicks, feed and alerts. */

const Quantity = z.number().positive().max(100_000_000);

const FeedDetails = z.object({ stage: FeedStage, form: z.enum(["mash", "crumble", "pellet", "other"]).optional(), bagSizeKg: z.number().positive().max(1000).optional() }).strict();

const ItemFields = {
  name: NonEmptyText(120),
  sku: OptionalText(60),
  defaultSupplier: OptionalText(120),
  defaultStorageLocation: OptionalText(120),
  /** Low-stock alert at or below this quantity (in date). */
  reorderLevel: z.number().nonnegative().max(100_000_000).optional(),
  /** Feed only: low-stock alert when fewer days of feed remain. */
  reorderDays: z.number().int().min(1).max(365).optional(),
  /** Expiry alert this many days before a lot expires (default 30). */
  expiryWarningDays: z.number().int().min(0).max(365).optional(),
  notes: OptionalText(1000),
  feed: FeedDetails.optional(),
};

export const CreateInventoryItemRequest = z
  .object({ id: Id.optional(), category: InventoryCategory, unit: StockUnit, medicineId: Id.optional(), ...ItemFields })
  .strict()
  .refine((i) => i.category !== "feed" || (i.unit === "kg" && !!i.feed), { message: "Feed items are stocked in kg and need feed details (stage)", path: ["feed"] });

export const UpdateInventoryItemRequest = z
  .object({ ...ItemFields, expiryWarningDays: z.number().int().min(0).max(365), active: z.boolean(), version: z.number().int().nonnegative() })
  .strict();

export const InventoryListQuery = z.object({
  category: InventoryCategory.optional(),
  lowStock: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  includeInactive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

/** A purchase: one lot with supplier, batch number, expiry, storage location and unit cost. */
export const PurchaseRequest = z
  .object({
    date: LocalDate,
    quantity: Quantity,
    unitCost: Money,
    /** A supplier from the farm's list; the purchase becomes a bill owed to them. */
    supplierId: Id.optional(),
    supplier: OptionalText(120),
    batchNumber: OptionalText(60),
    invoiceNumber: OptionalText(60),
    expiryDate: LocalDate.optional(),
    storageLocation: OptionalText(120),
  })
  .strict()
  .refine((p) => !p.expiryDate || p.expiryDate >= p.date, { message: "Expiry date is before the date received", path: ["expiryDate"] });

export const IssueRequest = z.object({ date: LocalDate, quantity: Quantity, flockId: Id.optional(), houseId: Id.optional(), reason: OptionalText(300) }).strict();
export const WastageRequest = z.object({ date: LocalDate, quantity: Quantity, reason: z.string().trim().min(3).max(300) }).strict();
export const StockCountRequest = z.object({ date: LocalDate, countedQuantity: z.number().nonnegative().max(100_000_000), reason: OptionalText(300) }).strict();
export const LotsQuery = z.object({ expiring: z.enum(["true", "false"]).transform((v) => v === "true").optional(), category: InventoryCategory.optional() });
export const TransactionsQuery = z.object({ from: LocalDate.optional(), to: LocalDate.optional(), limit: z.coerce.number().int().min(1).max(500).default(100) });

export const EggMovementRequest = z
  .object({
    date: LocalDate,
    type: z.enum(["used", "spoiled", "adjustment"]),
    /** Positive for used/spoiled; signed for an adjustment (count correction). */
    quantity: z.number().int().min(-10_000_000).max(10_000_000).refine((n) => n !== 0, "Quantity cannot be zero"),
    grade: EggGrade.optional(),
    reason: OptionalText(300),
  })
  .strict()
  .refine((m) => m.type === "adjustment" || m.quantity > 0, { message: "Used and spoiled quantities are positive", path: ["quantity"] });

export const ReceiveChicksRequest = z
  .object({ date: LocalDate, quantity: PositiveCount, species: Species.default("chicken"), breed: OptionalText(120), supplier: OptionalText(120), hatchDate: LocalDate.optional(), unitCost: Money.optional(), notes: OptionalText(1000) })
  .strict();
export const ChickLotsQuery = z.object({ status: z.enum(["available", "depleted", "closed"]).optional() });

// ---- feed --------------------------------------------------------------------

export const FeedConsumptionRequest = z
  .object({
    date: LocalDate,
    quantityKg: Quantity,
    kind: FeedConsumptionKind.default("consumption"),
    /** Required for consumption; optional for wastage (omit for wastage in the store). */
    flockId: Id.optional(),
    feedItemId: Id.optional(),
    unitCostPerKg: Money.optional(),
    reason: OptionalText(300),
  })
  .strict()
  .refine((f) => f.kind === "wastage" || !!f.flockId, { message: "Feed eaten must name the flock", path: ["flockId"] })
  .refine((f) => !(f.feedItemId && f.unitCostPerKg), { message: "A feed item is costed from its stock; leave out unitCostPerKg", path: ["unitCostPerKg"] });

export const FeedListQuery = z.object({
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  flockId: Id.optional(),
  feedItemId: Id.optional(),
  kind: FeedConsumptionKind.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const FeedAnalyticsQuery = z.object({ flockId: Id.optional(), status: FlockStatus.optional(), asOf: LocalDate.optional() });

export const WaterListQuery = z.object({
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  flockId: Id.optional(),
  abnormal: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});


