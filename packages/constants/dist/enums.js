/**
 * Every closed set of values in PoultryPilot, defined once as readonly tuples.
 * Stored values are lowercase snake_case. Zod schemas (packages/validation), TypeScript types
 * (packages/types) and the OpenAPI document (packages/contracts) are all derived from these.
 * Flutter receives them through the generated OpenAPI document — never re-declare them by hand.
 */
export const SPECIES = ["chicken", "duck", "turkey", "quail", "guinea_fowl"];
/** What a flock is kept for. "chick" = rearing young birds before they join a laying or breeding flock; "custom" needs customTypeName. */
export const FLOCK_TYPES = ["broiler", "layer", "breeder", "chick", "custom"];
export const FLOCK_STATUSES = ["planned", "active", "closed", "cancelled"];
export const HOUSE_TYPES = ["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"];
/** Causes of death. Culls are recorded separately (daily_records.culls), so "culled" is not a cause. */
export const MORTALITY_CAUSES = [
    "unknown",
    "found_dead",
    "predator",
    "heat_stress",
    "injury",
    "suspected_disease",
    "other",
];
export const EGG_GRADES = ["large", "medium", "small", "cracked", "dirty", "double_yolk"];
/** Vaccinations have their own collection (schedule + administration), so they are not a health record type. */
export const HEALTH_RECORD_TYPES = ["treatment", "vet_visit", "observation", "lab_test", "post_mortem"];
export const REMINDER_STATUSES = ["scheduled", "done", "skipped", "cancelled"];
export const LEDGER_DIRECTIONS = ["income", "expense"];
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
];
export const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"];
/** Order lifecycle. Allowed moves are defined once in services/api/src/domain/orders.ts. */
export const ORDER_STATUSES = ["pending", "accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"];
export const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"];
export const LISTING_CATEGORIES = [
    "live_birds",
    "dressed_birds",
    "eggs",
    "day_old_chicks",
    "hatching_eggs",
    "manure",
    "other",
];
/** Biosecurity log entries. Visitors and equipment movements have their own collections. */
export const BIOSECURITY_ENTRY_TYPES = ["cleaning", "disinfection", "footbath", "vehicle", "pest_control", "wild_bird_observation", "audit"];
export const ALERT_SEVERITIES = ["info", "warning", "critical"];
export const CONTENT_KINDS = ["lesson", "article", "glossary_term", "news", "disease"];
/** Farm roles, highest authority first. Display names: Owner, Admin, Farm manager, Supervisor, Worker, Accountant, Vet. */
export const ROLES = ["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"];
export const MEMBERSHIP_STATUSES = ["invited", "active", "revoked"];
export const USER_STATUSES = ["active", "disabled"];
export const SESSION_PLATFORMS = ["web", "android", "ios", "other"];
export const UNIT_SYSTEMS = ["metric", "imperial"];
//# sourceMappingURL=enums.js.map