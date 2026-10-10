/**
 * Closed value sets for the farm data model (MongoDB collections). Same conventions as enums.ts:
 * lowercase snake_case, defined once, consumed by Mongoose schemas, Zod validation and clients.
 */

// production
/**
 * The flock ledger. Every change to a flock's bird count is one of these events; transfers, splits and merges
 * are stored as a pair (…_out on the source flock, …_in on the destination) sharing a groupId.
 * "transfer_house" moves the whole flock to another house without changing its count.
 */
export const FLOCK_EVENT_TYPES = [
  "placement",
  "mortality",
  "cull",
  "transfer_out",
  "transfer_in",
  "transfer_house",
  "split_out",
  "split_in",
  "merge_out",
  "merge_in",
  "adjustment",
  "sale",
  "weighing",
  "status_change",
] as const;
export const EGG_MOVEMENT_TYPES = ["collected", "sold", "broken", "used", "spoiled", "adjustment", "reversal"] as const;

// feed & inventory
export const FEED_STAGES = ["pre_starter", "starter", "grower", "finisher", "pre_layer", "layer", "breeder", "other"] as const;
export const INVENTORY_CATEGORIES = ["medicine", "vaccine", "disinfectant", "litter", "packaging", "spare_part", "cleaning", "other"] as const;
export const INVENTORY_TRANSACTION_TYPES = ["receipt", "issue", "adjustment", "disposal", "reversal"] as const;
export const STOCK_UNITS = ["kg", "g", "l", "ml", "dose", "piece", "tray", "bag", "box", "bottle"] as const;

// health
export const MEDICINE_TYPES = ["vaccine", "antibiotic", "anticoccidial", "antiparasitic", "vitamin_mineral", "probiotic", "other"] as const;
export const ADMINISTRATION_ROUTES = ["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"] as const;
/** "overdue" is derived (scheduled and past due), never stored. */
export const VACCINATION_STATUSES = ["scheduled", "done", "skipped", "cancelled"] as const;

// hatchery
export const HATCHERY_BATCH_STATUSES = ["incubating", "in_hatcher", "hatched", "cancelled"] as const;
export const HATCHERY_EVENT_TYPES = ["set", "candling", "transfer_to_hatcher", "hatch", "chick_grading", "environment_reading", "note", "cancelled"] as const;
export const CHICK_SOURCES = ["own_hatchery", "purchased"] as const;
export const CHICK_LOT_STATUSES = ["available", "depleted", "closed"] as const;

// biosecurity & equipment
export const VISITOR_TYPES = ["vet", "supplier", "buyer", "worker", "government", "contractor", "other"] as const;
export const CLEANING_SCHEDULES = ["daily", "weekly", "monthly", "between_flocks", "one_off"] as const;
export const EQUIPMENT_TYPES = ["incubator", "hatcher", "feeder", "drinker", "heater", "fan", "generator", "scale", "vehicle", "sprayer", "other"] as const;
export const EQUIPMENT_STATUSES = ["in_service", "maintenance", "retired"] as const;

// money & market
export const EXPENSE_STATUSES = ["unpaid", "partially_paid", "paid", "cancelled"] as const;
export const TRANSACTION_SOURCES = [
  "manual",
  "expense",
  "order_payment",
  "feed_purchase",
  "recurring_expense",
  "opening_balance",
  "reversal",
] as const;
export const ORDER_PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid", "refunded"] as const;
export const ORDER_CHANNELS = ["direct", "marketplace"] as const;
export const LISTING_STATUSES = ["draft", "active", "paused", "sold_out", "closed"] as const;
export const MARKET_PRODUCTS = [
  "live_broiler",
  "dressed_broiler",
  "table_eggs",
  "day_old_chick_broiler",
  "day_old_chick_layer",
  "spent_hen",
  "maize",
  "soybean_meal",
  "broiler_feed",
  "layer_feed",
] as const;
export const PRICE_UNITS = ["per_kg", "per_bird", "per_egg", "per_tray", "per_dozen", "per_tonne", "per_bag"] as const;

// operations
export const TASK_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;
export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const ALERT_STATUSES = ["open", "acknowledged", "resolved"] as const;
export const ALERT_RULE_TYPES = [
  "mortality_spike",
  "egg_drop",
  "feed_change",
  "missing_record",
  "heat_stress",
  "low_feed_stock",
  "low_inventory",
  "vaccination_due",
  "withdrawal_active",
] as const;
export const NOTIFICATION_CHANNELS = ["in_app", "push", "email", "sms", "whatsapp"] as const;
export const NOTIFICATION_STATUSES = ["queued", "sent", "delivered", "failed", "read"] as const;
export const WEATHER_KINDS = ["current", "hourly", "daily"] as const;

// content & system
export const ARTICLE_KINDS = ["fact", "guide", "news", "disease_notice"] as const;
export const CONTENT_STATUSES = ["draft", "in_review", "published", "archived"] as const;
export const SYNC_OPERATION_STATUSES = ["accepted", "rejected", "conflict"] as const;

export type FlockEventType = (typeof FLOCK_EVENT_TYPES)[number];
export type EggMovementType = (typeof EGG_MOVEMENT_TYPES)[number];
export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];
export type VaccinationStatus = (typeof VACCINATION_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export type SyncOperationStatus = (typeof SYNC_OPERATION_STATUSES)[number];
