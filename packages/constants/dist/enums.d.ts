/**
 * Every closed set of values in PoultryPilot, defined once as readonly tuples.
 * Stored values are lowercase snake_case. Zod schemas (packages/validation), TypeScript types
 * (packages/types) and the OpenAPI document (packages/contracts) are all derived from these.
 * Flutter receives them through the generated OpenAPI document — never re-declare them by hand.
 */
export declare const SPECIES: readonly ["chicken", "duck", "turkey", "quail", "guinea_fowl"];
/** What a flock is kept for. "chick" = rearing young birds before they join a laying or breeding flock; "custom" needs customTypeName. */
export declare const FLOCK_TYPES: readonly ["broiler", "layer", "breeder", "chick", "custom"];
export declare const FLOCK_STATUSES: readonly ["planned", "active", "closed", "cancelled"];
export declare const HOUSE_TYPES: readonly ["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"];
/** Causes of death. Culls are recorded separately (daily_records.culls), so "culled" is not a cause. */
export declare const MORTALITY_CAUSES: readonly ["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"];
export declare const EGG_GRADES: readonly ["large", "medium", "small", "cracked", "dirty", "double_yolk"];
/** Vaccinations have their own collection (schedule + administration), so they are not a health record type. */
export declare const HEALTH_RECORD_TYPES: readonly ["treatment", "vet_visit", "observation", "lab_test", "post_mortem"];
export declare const REMINDER_STATUSES: readonly ["scheduled", "done", "skipped", "cancelled"];
export declare const LEDGER_DIRECTIONS: readonly ["income", "expense"];
export declare const LEDGER_CATEGORIES: readonly ["bird_sales", "egg_sales", "chick_sales", "manure_sales", "other_income", "stock_purchase", "feed", "medicine_vaccine", "vet_services", "labour", "electricity", "water", "fuel_transport", "litter_bedding", "rent", "maintenance", "licences_fees", "equipment", "other_expense"];
export declare const RECURRING_FREQUENCIES: readonly ["daily", "weekly", "monthly", "quarterly", "yearly"];
/** Order lifecycle. Allowed moves are defined once in services/api/src/domain/orders.ts. */
export declare const ORDER_STATUSES: readonly ["pending", "accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"];
export declare const PAYMENT_METHODS: readonly ["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"];
export declare const LISTING_CATEGORIES: readonly ["live_birds", "dressed_birds", "eggs", "day_old_chicks", "hatching_eggs", "manure", "other"];
/** Biosecurity log entries. Visitors and equipment movements have their own collections. */
export declare const BIOSECURITY_ENTRY_TYPES: readonly ["cleaning", "disinfection", "footbath", "vehicle", "pest_control", "wild_bird_observation", "audit"];
export declare const ALERT_SEVERITIES: readonly ["info", "warning", "critical"];
export declare const CONTENT_KINDS: readonly ["lesson", "article", "glossary_term", "news", "disease"];
/** Farm roles, highest authority first. Display names: Owner, Admin, Farm manager, Supervisor, Worker, Accountant, Vet. */
export declare const ROLES: readonly ["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"];
export declare const MEMBERSHIP_STATUSES: readonly ["invited", "active", "revoked"];
export declare const USER_STATUSES: readonly ["active", "disabled"];
export declare const SESSION_PLATFORMS: readonly ["web", "android", "ios", "other"];
export declare const UNIT_SYSTEMS: readonly ["metric", "imperial"];
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
