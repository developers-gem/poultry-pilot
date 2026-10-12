/**
 * Every closed set of values in PoultryPilot, defined once as readonly tuples.
 * Stored values are lowercase snake_case. Zod schemas (packages/validation), TypeScript types
 * (packages/types) and the OpenAPI document (packages/contracts) are all derived from these.
 * Flutter receives them through the generated OpenAPI document — never re-declare them by hand.
 */

export const SPECIES = ["chicken", "duck", "turkey", "quail", "guinea_fowl"] as const;
/** What a flock is kept for. "chick" = rearing young birds before they join a laying or breeding flock; "custom" needs customTypeName. */
export const FLOCK_TYPES = ["broiler", "layer", "breeder", "chick", "custom"] as const;
export const FLOCK_STATUSES = ["planned", "active", "closed", "cancelled"] as const;
export const HOUSE_TYPES = ["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"] as const;
/** Causes of death. Culls are recorded separately (daily_records.culls), so "culled" is not a cause. */
export const MORTALITY_CAUSES = [
  "unknown",
  "found_dead",
  "predator",
  "heat_stress",
  "injury",
  "suspected_disease",
  "other",
] as const;
export const EGG_GRADES = ["large", "medium", "small", "cracked", "dirty", "double_yolk"] as const;
/** Vaccinations have their own collection (schedule + administration), so they are not a health record type. */
export const HEALTH_RECORD_TYPES = ["treatment", "vet_visit", "observation", "lab_test", "post_mortem"] as const;
export const REMINDER_STATUSES = ["scheduled", "done", "skipped", "cancelled"] as const;
export const LEDGER_DIRECTIONS = ["income", "expense"] as const;
export const LEDGER_CATEGORIES = [
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
] as const;
export const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;
/** Order lifecycle. Allowed moves are defined once in services/api/src/domain/orders.ts. */
export const ORDER_STATUSES = ["pending", "accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"] as const;
export const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"] as const;
export const LISTING_CATEGORIES = [
  "live_birds",
  "dressed_birds",
  "eggs",
  "day_old_chicks",
  "hatching_eggs",
  "manure",
  "other",
] as const;
/** Biosecurity log entries. Visitors and equipment movements have their own collections. */
export const BIOSECURITY_ENTRY_TYPES = ["cleaning", "disinfection", "footbath", "vehicle", "pest_control", "wild_bird_observation", "audit"] as const;
export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const;
export const CONTENT_KINDS = ["lesson", "article", "glossary_term", "news", "disease"] as const;
/** Farm roles, highest authority first. Display names: Owner, Admin, Farm manager, Supervisor, Worker, Accountant, Vet. */
export const ROLES = ["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"] as const;
export const MEMBERSHIP_STATUSES = ["invited", "active", "revoked"] as const;
export const USER_STATUSES = ["active", "disabled"] as const;
export const SESSION_PLATFORMS = ["web", "android", "ios", "other"] as const;
export const UNIT_SYSTEMS = ["metric", "imperial"] as const;

export type Species = (typeof SPECIES)[number];
export type FlockType = (typeof FLOCK_TYPES)[number];
export type FlockStatus = (typeof FLOCK_STATUSES)[number];
export type HouseType = (typeof HOUSE_TYPES)[number];
export type MortalityCause = (typeof MORTALITY_CAUSES)[number];
export type EggGrade = (typeof EGG_GRADES)[number];
export type HealthRecordType = (typeof HEALTH_RECORD_TYPES)[number];
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];
export type BiosecurityEntryType = (typeof BIOSECURITY_ENTRY_TYPES)[number];
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
export type ContentKind = (typeof CONTENT_KINDS)[number];
export type Role = (typeof ROLES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type SessionPlatform = (typeof SESSION_PLATFORMS)[number];
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];
