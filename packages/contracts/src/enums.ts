import { z } from "zod";

/**
 * Every closed set of values in PoultryPilot is defined here, once.
 * Stored values are lowercase snake_case strings. Web and Flutter clients
 * consume these through the generated OpenAPI document — never re-declare them.
 */

export const Species = z.enum(["chicken", "duck", "turkey", "quail", "guinea_fowl"]);
export type Species = z.infer<typeof Species>;

export const FlockPurpose = z.enum(["broiler", "layer", "breeder", "pullet", "dual_purpose"]);
export type FlockPurpose = z.infer<typeof FlockPurpose>;

/** Server-enforced lifecycle. Transitions live in @poultrypilot/domain flock.ts. */
export const FlockStatus = z.enum(["planned", "active", "closed", "cancelled"]);
export type FlockStatus = z.infer<typeof FlockStatus>;

export const HouseType = z.enum(["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"]);
export type HouseType = z.infer<typeof HouseType>;

export const MortalityCause = z.enum([
  "unknown",
  "found_dead",
  "culled",
  "predator",
  "heat_stress",
  "injury",
  "suspected_disease",
  "other",
]);
export type MortalityCause = z.infer<typeof MortalityCause>;

export const EggGrade = z.enum(["large", "medium", "small", "cracked", "dirty", "double_yolk"]);
export type EggGrade = z.infer<typeof EggGrade>;

export const HealthRecordType = z.enum(["vaccination", "treatment", "vet_visit", "observation", "lab_test"]);
export type HealthRecordType = z.infer<typeof HealthRecordType>;

export const ReminderStatus = z.enum(["scheduled", "done", "skipped", "cancelled"]);
export type ReminderStatus = z.infer<typeof ReminderStatus>;

export const LedgerDirection = z.enum(["income", "expense"]);
export type LedgerDirection = z.infer<typeof LedgerDirection>;

export const LedgerCategory = z.enum([
  "bird_sales",
  "egg_sales",
  "chick_sales",
  "manure_sales",
  "other_income",
  "stock_purchase",
  "feed",
  "medicine_vaccine",
  "vet_services",
  "labour",
  "electricity",
  "water",
  "fuel_transport",
  "litter_bedding",
  "rent",
  "maintenance",
  "licences_fees",
  "equipment",
  "other_expense",
]);
export type LedgerCategory = z.infer<typeof LedgerCategory>;

export const RecurringFrequency = z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]);
export type RecurringFrequency = z.infer<typeof RecurringFrequency>;

export const OrderStatus = z.enum(["pending", "confirmed", "delivered", "closed", "cancelled"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PaymentMethod = z.enum(["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const ListingCategory = z.enum(["live_birds", "dressed_birds", "eggs", "day_old_chicks", "hatching_eggs", "manure", "other"]);
export type ListingCategory = z.infer<typeof ListingCategory>;

export const BiosecurityEntryType = z.enum(["cleaning", "disinfection", "visitor", "vehicle", "equipment", "pest_control", "footbath"]);
export type BiosecurityEntryType = z.infer<typeof BiosecurityEntryType>;

export const AlertSeverity = z.enum(["info", "warning", "critical"]);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const ContentKind = z.enum(["lesson", "article", "glossary_term", "news", "disease_notice"]);
export type ContentKind = z.infer<typeof ContentKind>;

export const Role = z.enum(["owner", "manager", "worker", "veterinarian", "accountant"]);
export type Role = z.infer<typeof Role>;

export const MembershipStatus = z.enum(["invited", "active", "revoked"]);
export type MembershipStatus = z.infer<typeof MembershipStatus>;

export const UnitSystem = z.enum(["metric", "imperial"]);
export type UnitSystem = z.infer<typeof UnitSystem>;
