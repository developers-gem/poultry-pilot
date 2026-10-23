// ../../packages/constants/src/enums.ts
var SPECIES = ["chicken", "duck", "turkey", "quail", "guinea_fowl"];
var FLOCK_TYPES = ["broiler", "layer", "breeder", "chick", "custom"];
var FLOCK_STATUSES = ["planned", "active", "closed", "cancelled"];
var HOUSE_TYPES = ["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"];
var MORTALITY_CAUSES = [
  "unknown",
  "found_dead",
  "predator",
  "heat_stress",
  "injury",
  "suspected_disease",
  "other"
];
var EGG_GRADES = ["large", "medium", "small", "cracked", "dirty", "double_yolk"];
var HEALTH_RECORD_TYPES = ["treatment", "vet_visit", "observation", "lab_test", "post_mortem"];
var REMINDER_STATUSES = ["scheduled", "done", "skipped", "cancelled"];
var LEDGER_DIRECTIONS = ["income", "expense"];
var LEDGER_CATEGORIES = [
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
  "other_expense"
];
var RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"];
var ORDER_STATUSES = ["pending", "accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"];
var PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"];
var LISTING_CATEGORIES = [
  "live_birds",
  "dressed_birds",
  "eggs",
  "day_old_chicks",
  "hatching_eggs",
  "manure",
  "other"
];
var BIOSECURITY_ENTRY_TYPES = ["cleaning", "disinfection", "footbath", "vehicle", "pest_control", "wild_bird_observation", "audit"];
var ALERT_SEVERITIES = ["info", "warning", "critical"];
var CONTENT_KINDS = ["lesson", "article", "glossary_term", "news", "disease"];
var ROLES = ["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"];
var MEMBERSHIP_STATUSES = ["invited", "active", "revoked"];
var USER_STATUSES = ["active", "disabled"];
var SESSION_PLATFORMS = ["web", "android", "ios", "other"];
var UNIT_SYSTEMS = ["metric", "imperial"];

// ../../packages/constants/src/domain-enums.ts
var FLOCK_EVENT_TYPES = [
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
  "status_change"
];
var EGG_MOVEMENT_TYPES = ["collected", "sold", "broken", "used", "spoiled", "adjustment", "reversal"];
var FEED_STAGES = ["pre_starter", "starter", "grower", "finisher", "pre_layer", "layer", "breeder", "other"];
var INVENTORY_CATEGORIES = ["feed", "medicine", "vaccine", "disinfectant", "litter", "packaging", "equipment", "spare_part", "cleaning", "other"];
var INVENTORY_TRANSACTION_TYPES = ["receipt", "issue", "wastage", "adjustment", "reversal"];
var FEED_CONSUMPTION_KINDS = ["consumption", "wastage"];
var WATER_SOURCES = ["borehole", "municipal", "well", "rainwater", "river", "tanker", "other"];
var WATER_TREATMENTS = ["none", "chlorination", "acidification", "filtration", "uv", "medication", "vitamins", "other"];
var WATER_QUALITY_RATINGS = ["good", "fair", "poor"];
var STOCK_UNITS = ["kg", "g", "l", "ml", "dose", "piece", "tray", "bag", "box", "bottle"];
var MEDICINE_TYPES = ["vaccine", "antibiotic", "anticoccidial", "antiparasitic", "vitamin_mineral", "probiotic", "other"];
var ADMINISTRATION_ROUTES = ["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"];
var VACCINATION_STATUSES = ["scheduled", "done", "skipped", "cancelled"];
var HATCHERY_BATCH_STATUSES = ["incubating", "in_hatcher", "hatched", "cancelled"];
var HATCHERY_EVENT_TYPES = ["set", "candling", "transfer_to_hatcher", "hatch", "chick_grading", "environment_reading", "note", "cancelled", "reversal"];
var EGG_REJECT_REASONS = ["cracked", "dirty", "misshapen", "undersized", "oversized", "thin_shell", "other"];
var BROODER_BEHAVIOURS = ["comfortable", "huddling", "spread_out", "panting", "avoiding_area"];
var ARRIVAL_STATUSES = ["planned", "arrived", "cancelled"];
var CHICK_SOURCES = ["own_hatchery", "purchased"];
var CHICK_LOT_STATUSES = ["available", "depleted", "closed"];
var ASSESSMENT_SOURCES = ["veterinarian", "laboratory", "farm_staff"];
var WITHDRAWAL_SOURCES = ["medicine_label", "veterinarian", "other"];
var CHECKLIST_KINDS = ["visitor_declaration", "ppe", "footbath", "cleaning", "disinfection", "vehicle", "pest_control", "audit", "general", "arrival_preparation", "brooder_check"];
var CHECKLIST_RESPONSE_TYPES = ["yes_no", "text", "number", "choice"];
var PEST_TYPES = ["rodents", "insects", "wild_birds", "other"];
var TASK_KINDS = ["general", "corrective_action", "follow_up", "vet_appointment"];
var VISITOR_TYPES = ["vet", "supplier", "buyer", "worker", "government", "contractor", "other"];
var CLEANING_SCHEDULES = ["daily", "weekly", "monthly", "between_flocks", "one_off"];
var EQUIPMENT_TYPES = ["incubator", "hatcher", "feeder", "drinker", "heater", "fan", "generator", "scale", "vehicle", "sprayer", "other"];
var EQUIPMENT_STATUSES = ["in_service", "maintenance", "retired"];
var EXPENSE_STATUSES = ["unpaid", "partially_paid", "paid", "cancelled"];
var TRANSACTION_KINDS = ["payment", "refund", "transfer", "opening_balance", "adjustment"];
var CASH_DIRECTIONS = ["in", "out"];
var MONEY_ACCOUNT_TYPES = ["cash", "bank", "mobile_money", "other"];
var EXPENSE_KINDS = ["expense", "purchase"];
var INCOME_KINDS = ["sale", "income"];
var INCOME_CATEGORIES = ["bird_sales", "egg_sales", "chick_sales", "manure_sales", "other_income"];
var EXPENSE_CATEGORIES = [
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
  "other_expense"
];
var DOCUMENT_SOURCES = ["manual", "inventory_purchase", "health_record", "recurring_expense", "flock_sale", "chick_order", "market_order"];
var FULFILMENT_METHODS = ["pickup", "seller_delivery", "courier"];
var ORDER_PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid", "refunded"];
var ORDER_CHANNELS = ["direct", "marketplace"];
var LISTING_STATUSES = ["draft", "active", "paused", "sold_out", "closed"];
var MARKET_PRODUCTS = [
  "live_broiler",
  "dressed_broiler",
  "table_eggs",
  "day_old_chick_broiler",
  "day_old_chick_layer",
  "spent_hen",
  "maize",
  "soybean_meal",
  "broiler_feed",
  "layer_feed"
];
var PRICE_UNITS = ["per_kg", "per_bird", "per_egg", "per_tray", "per_dozen", "per_tonne", "per_bag"];
var TASK_STATUSES = ["open", "in_progress", "done", "cancelled"];
var TASK_PRIORITIES = ["low", "normal", "high", "urgent"];
var ALERT_STATUSES = ["open", "acknowledged", "resolved"];
var ALERT_RULE_TYPES = [
  "mortality_spike",
  "egg_drop",
  "feed_change",
  "missing_record",
  "heat_stress",
  "low_feed_stock",
  "low_inventory",
  "vaccination_due",
  "withdrawal_active",
  "expiry_soon",
  "expired_stock",
  "water_abnormal",
  "health_follow_up",
  "biosecurity_breach",
  "wild_bird_contact",
  "checklist_failed",
  "brooding_conditions",
  "hatch_due",
  "weight_variance",
  "fcr_variance",
  "vet_appointment",
  "order_delivery",
  "payment_overdue",
  "weather_risk"
];
var NOTIFICATION_CHANNELS = ["in_app", "push", "email", "sms", "whatsapp"];
var NOTIFICATION_STATUSES = ["queued", "sent", "delivered", "failed", "read"];
var PUSH_PLATFORMS = ["ios", "android", "web"];
var RULE_KEYS = [
  "mortality",
  "egg_production",
  "feed_consumption",
  "water_consumption",
  "weight_variance",
  "fcr_variance",
  "inventory",
  "medicine_expiry",
  "vaccination_due",
  "vet_appointment",
  "hatch_date",
  "order_delivery",
  "payment_overdue",
  "weather_risk"
];
var WEATHER_KINDS = ["current", "hourly", "daily"];
var NOTIFICATION_CATEGORIES = [
  "vaccination_due",
  "task_due",
  "inventory_low",
  "mortality",
  "feed",
  "water",
  "egg_production",
  "weight_variance",
  "hatch_date",
  "order_update",
  "payment_update",
  "weather_risk"
];
var NOTIFICATION_CATEGORY_INFO = {
  vaccination_due: { label: "Vaccinations and vet visits", description: "A vaccination or vet visit is due or overdue" },
  task_due: { label: "Tasks", description: "A task given to you (or to anyone) is due today or overdue" },
  inventory_low: { label: "Stock", description: "Feed, medicine or other stock is low, expiring or expired" },
  mortality: { label: "Deaths", description: "Deaths are higher than this flock's normal" },
  feed: { label: "Feed use", description: "Feed eaten or feed conversion moved away from normal" },
  water: { label: "Water", description: "Water drunk or water quality moved away from normal" },
  egg_production: { label: "Egg production", description: "Eggs collected fell below this flock's normal" },
  weight_variance: { label: "Bird weight", description: "Weights are behind target or uneven" },
  hatch_date: { label: "Hatchery", description: "A transfer or hatch is due" },
  order_update: { label: "Orders", description: "New orders, and changes to orders you sell or buy" },
  payment_update: { label: "Payments", description: "Payments received, refunds, and overdue payments" },
  weather_risk: { label: "Weather", description: "Unusual heat, cold, rain or wind for your farm is forecast" }
};
var CATEGORY_FOR_RULE = {
  mortality: "mortality",
  egg_production: "egg_production",
  feed_consumption: "feed",
  water_consumption: "water",
  weight_variance: "weight_variance",
  fcr_variance: "feed",
  inventory: "inventory_low",
  medicine_expiry: "inventory_low",
  vaccination_due: "vaccination_due",
  vet_appointment: "vaccination_due",
  hatch_date: "hatch_date",
  order_delivery: "order_update",
  payment_overdue: "payment_update",
  weather_risk: "weather_risk"
};
var ARTICLE_KINDS = ["fact", "guide", "news", "disease"];
var ARTICLE_ORIGINS = ["original", "external"];
var CONTENT_CATEGORIES = ["biosecurity", "health", "nutrition", "housing", "management", "hatchery", "welfare", "markets", "policy", "business", "general"];
var PLATFORM_ROLES = ["content_editor", "content_publisher"];
var REPORT_TYPES = ["farm", "flock", "egg", "feed", "health", "hatchery", "biosecurity", "financial", "marketplace"];
var REPORT_FORMATS = ["pdf", "csv", "xlsx", "json"];
var CONTENT_STATUSES = ["draft", "in_review", "published", "archived"];
var SYNC_OPERATION_STATUSES = ["accepted", "rejected", "conflict"];

// src/adapters/mongo/models/identity.ts
import { Schema as Schema2 } from "mongoose";

// src/adapters/mongo/models/base.ts
import mongoose, { Schema } from "mongoose";

// src/adapters/mongo/plugins.ts
function requireFarmScope(schema) {
  const ops = ["find", "findOne", "findOneAndUpdate", "updateOne", "updateMany", "deleteOne", "deleteMany", "countDocuments"];
  for (const op of ops) {
    schema.pre(op, function() {
      const opts = this.getOptions();
      if (opts.crossFarm) return;
      const filter = this.getFilter();
      if (filter["farmId"] === void 0) {
        throw new Error(`Tenancy violation: ${op} on ${this.model.modelName} without farmId`);
      }
    });
  }
}

// src/adapters/mongo/models/base.ts
var registry = [];
var LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
var ref = (model, opts = {}) => ({ type: String, ref: model, required: opts.required ?? false });
var refs = (model) => ({ type: [{ type: String, ref: model }], default: void 0 });
var str = (opts = {}) => ({
  type: String,
  required: opts.required ?? false,
  maxlength: opts.max ?? 500,
  trim: opts.trim ?? true,
  ...opts.lowercase ? { lowercase: true } : {}
});
var text = (max = 4e3) => ({ type: String, maxlength: max, trim: true });
var enumOf = (values, opts = {}) => ({
  type: String,
  enum: values,
  required: opts.required ?? false,
  ...opts.default !== void 0 ? { default: opts.default } : {}
});
var localDate = (opts = {}) => ({ type: String, match: LOCAL_DATE, required: opts.required ?? false });
var instant = (opts = {}) => ({ type: Date, required: opts.required ?? false });
var num = (opts = {}) => ({
  type: Number,
  required: opts.required ?? false,
  min: opts.min ?? 0,
  ...opts.max !== void 0 ? { max: opts.max } : {},
  ...opts.default !== void 0 ? { default: opts.default } : {}
});
var int = (opts = {}) => ({
  ...num(opts),
  validate: { validator: (v) => v === void 0 || v === null || Number.isInteger(v), message: "{PATH} must be a whole number" }
});
var bool = (def = false) => ({ type: Boolean, default: def });
var MoneySchema = new Schema(
  { amountMinor: int({ required: true }), currency: { type: String, required: true, match: /^[A-Z]{3}$/ } },
  { _id: false }
);
var money = (opts = {}) => ({ type: MoneySchema, required: opts.required ?? false });
var GeoPointSchema = new Schema({ lat: num({ required: true, min: -90, max: 90 }), lng: num({ required: true, min: -180, max: 180 }) }, { _id: false });
var GeoJsonPointSchema = new Schema(
  { type: { type: String, enum: ["Point"], required: true }, coordinates: { type: [Number], required: true } },
  { _id: false }
);
var SourceSchema = new Schema({ name: str({ required: true, max: 200 }), url: str({ max: 1e3 }), retrievedAt: instant() }, { _id: false });
var LIVE = { partialFilterExpression: { deletedAt: { $type: "null" } } };
function defineCollection(spec) {
  const farmOwned = spec.ownership === "farm";
  const actor = spec.actor ?? (farmOwned || spec.ownership === "tenant" ? "required" : "optional");
  const versioned = spec.versioned ?? ["farm", "tenant"].includes(spec.ownership);
  const softDelete = spec.softDelete ?? (farmOwned && !spec.appendOnly);
  const standard = {
    _id: { type: String, required: true },
    ...farmOwned ? { farmId: { type: String, ref: "Farm", required: true } } : {},
    ...actor !== "none" ? { createdBy: { type: String, ref: "User", required: actor === "required" }, updatedBy: { type: String, ref: "User" } } : {},
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    ...versioned ? { version: { type: Number, required: true, default: 0, min: 0 } } : {},
    ...softDelete ? { deletedAt: { type: Date, default: null }, deletedBy: { type: String, ref: "User" } } : {}
  };
  const schema = new Schema({ ...standard, ...spec.fields }, { versionKey: false, minimize: false, strict: "throw", collection: spec.collection });
  schema.pre("validate", function() {
    const now = /* @__PURE__ */ new Date();
    if (!this.get("createdAt")) this.set("createdAt", now);
    if (!this.get("updatedAt")) this.set("updatedAt", this.get("createdAt") ?? now);
  });
  if (farmOwned) requireFarmScope(schema);
  for (const ix of spec.indexes ?? []) schema.index(ix.fields, ix.options ?? {});
  spec.configure?.(schema);
  const { fields: _fields, configure: _configure, ...meta } = spec;
  registry.push({ ...meta, actor, versioned, softDelete, schema, model: spec.model });
  return mongoose.models[spec.model] ?? mongoose.model(spec.model, schema, spec.collection);
}

// src/adapters/mongo/models/identity.ts
var D = "Identity and tenancy";
var UserModel = defineCollection({
  model: "User",
  collection: "users",
  domain: D,
  ownership: "user",
  description: "A person who signs in. Belongs to farms through farm_members, never directly.",
  versioned: true,
  fields: {
    email: str({ required: true, max: 254, lowercase: true }),
    fullName: str({ required: true, max: 120 }),
    phone: str({ max: 30 }),
    /** PoultryPilot staff roles for global content; granted by an operator, never by farms. */
    platformRoles: { type: [enumOf(PLATFORM_ROLES)], default: void 0 },
    locale: str({ max: 10 }),
    passwordHash: { type: String },
    googleSub: { type: String },
    emailVerified: bool(false),
    emailVerifiedAt: instant(),
    status: enumOf(USER_STATUSES, { required: true, default: "active" }),
    passwordChangedAt: instant(),
    lastLoginAt: instant(),
    failedLoginCount: int({ default: 0 }),
    lockedUntil: instant()
  },
  indexes: [
    { fields: { email: 1 }, options: { unique: true }, why: "Login and sign-up look users up by email; one account per email" },
    { fields: { googleSub: 1 }, options: { unique: true, sparse: true }, why: "Google sign-in resolves the user by Google subject id" }
  ]
});
var SessionModel = defineCollection({
  model: "Session",
  collection: "sessions",
  domain: D,
  ownership: "user",
  actor: "none",
  description: "One signed-in device. Checked on every authenticated request, so revoking it signs the device out immediately.",
  fields: {
    userId: ref("User", { required: true }),
    platform: enumOf(SESSION_PLATFORMS, { required: true }),
    deviceId: str({ max: 100 }),
    deviceName: str({ max: 100 }),
    userAgent: str({ max: 300 }),
    ipAddress: str({ max: 64 }),
    authMethod: enumOf(["password", "google"], { required: true }),
    lastUsedAt: instant({ required: true }),
    expiresAt: instant({ required: true }),
    revokedAt: instant(),
    revokedReason: enumOf(["logout", "user_revoked", "password_changed", "password_reset", "token_reuse", "account_disabled"])
  },
  indexes: [
    { fields: { userId: 1, revokedAt: 1 }, why: "List a user's active sessions; revoke all of a user's sessions" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 30 * 86400 }, why: "TTL: delete sessions 30 days after they expire" }
  ]
});
var RefreshTokenModel = defineCollection({
  model: "RefreshToken",
  collection: "refresh_tokens",
  domain: D,
  ownership: "user",
  actor: "none",
  description: "Rotating refresh token of a session. Only the SHA-256 hash is stored.",
  fields: {
    sessionId: ref("Session", { required: true }),
    userId: ref("User", { required: true }),
    tokenHash: { type: String, required: true },
    expiresAt: instant({ required: true }),
    replacedById: ref("RefreshToken"),
    revokedAt: instant()
  },
  indexes: [
    { fields: { tokenHash: 1 }, options: { unique: true }, why: "POST /auth/refresh finds the token by hash" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 7 * 86400 }, why: "TTL: delete tokens a week after expiry" }
  ]
});
var OneTimeTokenModel = defineCollection({
  model: "OneTimeToken",
  collection: "one_time_tokens",
  domain: D,
  ownership: "user",
  actor: "none",
  description: "Single-use emailed links (email verification 24 h, password reset 1 h). Hash only.",
  fields: {
    userId: ref("User", { required: true }),
    purpose: enumOf(["email_verification", "password_reset"], { required: true }),
    tokenHash: { type: String, required: true },
    email: str({ required: true, max: 254, lowercase: true }),
    expiresAt: instant({ required: true }),
    usedAt: instant()
  },
  indexes: [
    { fields: { tokenHash: 1 }, options: { unique: true }, why: "Verify-email and reset-password find the token by hash" },
    { fields: { userId: 1, purpose: 1 }, why: "Invalidate a user's outstanding links of one purpose" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 86400 }, why: "TTL: delete links a day after expiry" }
  ]
});
var FarmModel = defineCollection({
  model: "Farm",
  collection: "farms",
  domain: D,
  ownership: "tenant",
  description: "The tenant. Every farm-owned document carries this farm's _id as farmId.",
  softDelete: true,
  fields: {
    name: str({ required: true, max: 120 }),
    description: text(2e3),
    countryCode: { type: String, match: /^[A-Z]{2}$/ },
    locationLabel: str({ max: 200 }),
    location: { type: GeoPointSchema },
    settings: {
      type: new Schema2(
        {
          timezone: { type: String, required: true },
          currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
          unitSystem: enumOf(UNIT_SYSTEMS, { required: true }),
          fcrIncludesMortalityWeight: bool(false),
          workerEditWindowDays: int({ default: 1, max: 7 }),
          /** The farm's own rule for hours between a visitor's last poultry contact and entry. None = not checked. */
          visitorDowntimeHours: num({ max: 1e4 })
        },
        { _id: false }
      ),
      required: true
    }
  }
  // Farms are only read by _id (from memberships); no secondary index is needed.
});
var MembershipModel = defineCollection({
  model: "FarmMember",
  collection: "farm_members",
  domain: D,
  ownership: "farm",
  softDelete: false,
  // lifecycle is the status field: invited → active → revoked
  description: "A user's role on a farm, or a pending invitation by email. The basis of every authorization check.",
  fields: {
    userId: ref("User"),
    email: str({ required: true, max: 254, lowercase: true }),
    role: enumOf(ROLES, { required: true }),
    status: enumOf(MEMBERSHIP_STATUSES, { required: true }),
    inviteTokenHash: { type: String },
    inviteExpiresAt: instant(),
    invitedBy: ref("User"),
    invitedAt: instant(),
    joinedAt: instant(),
    removedAt: instant(),
    removedBy: ref("User")
  },
  indexes: [
    { fields: { farmId: 1, userId: 1 }, why: "requireFarm: is this user an active member of this farm (every farm request)" },
    { fields: { farmId: 1, email: 1 }, why: "Invite: is this email already a member or invited" },
    { fields: { userId: 1, status: 1 }, why: "GET /me and GET /farms: the user's active memberships across farms" },
    { fields: { inviteTokenHash: 1 }, options: { unique: true, sparse: true }, why: "Accept invitation by token hash" }
  ],
  notes: ["Members list (farmId only) is served by the farmId+userId index prefix."]
});

// src/adapters/mongo/models/production.ts
import { Schema as Schema3 } from "mongoose";

// src/domain/errors.ts
var DomainError = class extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "DomainError";
  }
  code;
  details;
};

// ../../packages/validation/src/primitives.ts
import { z } from "zod";
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var Id = z.string().toLowerCase().regex(UUID_RE, "Must be a UUID");
var LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
function isValidLocalDate(value) {
  const m = LOCAL_DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
var LocalDate = z.string().refine(isValidLocalDate, "Must be a valid date in YYYY-MM-DD format");
var Instant = z.string().datetime({ offset: true });
function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
var IanaTimezone = z.string().min(1).refine(isValidTimezone, "Must be an IANA timezone such as Asia/Kolkata");
var SUPPORTED_CURRENCIES = new Set(
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : []
);
function isValidCurrency(code) {
  return /^[A-Z]{3}$/.test(code) && (SUPPORTED_CURRENCIES.size === 0 || SUPPORTED_CURRENCIES.has(code));
}
var CurrencyCode = z.string().toUpperCase().refine(isValidCurrency, "Must be an ISO 4217 currency code");
var CountryCode = z.string().toUpperCase().regex(/^[A-Z]{2}$/);
var Money = z.object({
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: CurrencyCode
});
var Count = z.number().int().nonnegative().max(1e7);
var PositiveCount = z.number().int().positive().max(1e7);
var Grams = z.number().nonnegative().max(5e4);
var Kilograms = z.number().nonnegative().max(1e8);
var Celsius = z.number().min(-60).max(70);
var Percent = z.number().min(0).max(100);
var NonEmptyText = (max = 200) => z.string().trim().min(1).max(max);
var OptionalText = (max = 2e3) => z.string().trim().max(max).optional();
var Email = z.string().trim().toLowerCase().email().max(254);
var Password = z.string().min(10, "Use at least 10 characters").max(200).refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letters and at least one number");
var GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});
var Cursor = z.string().max(500);
var PageQuery = z.object({
  cursor: Cursor.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

// src/domain/dates.ts
var MS_PER_DAY = 864e5;
function assertDate(d) {
  if (!isValidLocalDate(d)) throw new RangeError(`Invalid local date: ${d}`);
}
function localDateOf(instant2, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant2);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function dayNumber(date) {
  assertDate(date);
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}
function fromDayNumber(n) {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  return dayNumber(to) - dayNumber(from);
}
function addDays(date, days) {
  if (!Number.isInteger(days)) throw new RangeError("days must be an integer");
  return fromDayNumber(dayNumber(date) + days);
}
function addMonthsClamped(date, months, anchorDay) {
  assertDate(date);
  const [y, m, d] = date.split("-").map(Number);
  const targetIndex = y * 12 + (m - 1) + months;
  const ty = Math.floor(targetIndex / 12);
  const tm = targetIndex - ty * 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const day = Math.min(anchorDay ?? d, lastDay);
  return `${String(ty).padStart(4, "0")}-${String(tm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function dateRange(from, to) {
  const start = dayNumber(from);
  const end = dayNumber(to);
  const out = [];
  for (let n = start; n <= end; n++) out.push(fromDayNumber(n));
  return out;
}
function lastNDates(endInclusive, count) {
  return dateRange(addDays(endInclusive, -(count - 1)), endInclusive);
}

// src/domain/units.ts
var KG_PER_LB = 0.45359237;
var G_PER_OZ = 28.349523125;
var GRAMS_PER = { g: 1, kg: 1e3, oz: G_PER_OZ, lb: KG_PER_LB * 1e3 };

// src/domain/flock.ts
var IN_TYPES = /* @__PURE__ */ new Set(["transfer_in", "split_in", "merge_in"]);
var OUT_TYPES = /* @__PURE__ */ new Set(["transfer_out", "split_out", "merge_out"]);
var isInbound = (t) => IN_TYPES.has(t);
var isOutbound = (t) => OUT_TYPES.has(t);
function effectiveEvents(events) {
  const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf));
  return events.filter((e) => !e.reversalOf && !reversed.has(e.id));
}
function birdDelta(e) {
  switch (e.type) {
    case "placement":
      return (e.birds ?? 0) - (e.deadOnArrival ?? 0);
    case "transfer_in":
    case "split_in":
    case "merge_in":
      return e.birds ?? 0;
    case "mortality":
    case "cull":
    case "sale":
    case "transfer_out":
    case "split_out":
    case "merge_out":
      return -(e.birds ?? 0);
    case "adjustment":
      return e.delta ?? 0;
    default:
      return 0;
  }
}
function population(events, asOf) {
  const p = { placed: 0, deadOnArrival: 0, transferredIn: 0, birdsIn: 0, mortality: 0, culled: 0, sold: 0, transferredOut: 0, adjustments: 0, alive: 0 };
  for (const e of effectiveEvents(events)) {
    if (asOf && e.date > asOf) continue;
    const n = e.birds ?? 0;
    if (e.type === "placement") {
      p.placed += n - (e.deadOnArrival ?? 0);
      p.deadOnArrival += e.deadOnArrival ?? 0;
    } else if (isInbound(e.type)) p.transferredIn += n;
    else if (e.type === "mortality") p.mortality += n;
    else if (e.type === "cull") p.culled += n;
    else if (e.type === "sale") p.sold += n;
    else if (isOutbound(e.type)) p.transferredOut += n;
    else if (e.type === "adjustment") p.adjustments += e.delta ?? 0;
    p.alive += birdDelta(e);
  }
  p.birdsIn = p.placed + p.transferredIn;
  return p;
}
function assertLedgerValid(events, fromDate) {
  const effective = effectiveEvents(events);
  const dates = [...new Set(effective.map((e) => e.date))].filter((d) => !fromDate || d >= fromDate).sort();
  for (const d of dates) {
    const alive = population(effective, d).alive;
    if (alive < 0) {
      throw new DomainError("INSUFFICIENT_BIRDS", `Not enough birds: this would leave ${alive} birds alive on ${d}.`, { date: d, alive });
    }
  }
}
function assertEventAllowed(existing, next) {
  if (next.type === "placement" && (next.deadOnArrival ?? 0) > (next.birds ?? 0)) {
    throw new DomainError("VALIDATION_FAILED", "Dead on arrival cannot exceed birds received");
  }
  if (next.reversalOf) {
    const target = existing.find((e) => e.id === next.reversalOf);
    if (!target) throw new DomainError("NOT_FOUND", "The event to reverse does not belong to this flock");
    if (target.reversalOf) throw new DomainError("INVALID_STATE_TRANSITION", "A reversal cannot itself be reversed; record a new event instead");
    if (existing.some((e) => e.reversalOf === target.id)) throw new DomainError("INVALID_STATE_TRANSITION", "This event has already been reversed");
    assertLedgerValid([...existing, next], target.date);
    return;
  }
  assertLedgerValid([...existing, next], next.date);
}
function birdsAvailable(events, date) {
  const effective = effectiveEvents(events);
  const dates = [date, ...new Set(effective.map((e) => e.date).filter((d) => d > date))];
  return Math.min(...dates.map((d) => population(effective, d).alive));
}
function acquisitionCostPerBird(events) {
  let cost = 0;
  let birds = 0;
  for (const e of effectiveEvents(events)) {
    if (e.type === "placement") {
      cost += e.costMinor ?? 0;
      birds += (e.birds ?? 0) - (e.deadOnArrival ?? 0);
    } else if (isInbound(e.type)) {
      cost += e.costMinor ?? 0;
      birds += e.birds ?? 0;
    } else if (isOutbound(e.type)) {
      cost -= e.costMinor ?? 0;
      birds -= e.birds ?? 0;
    }
  }
  return birds > 0 ? cost / birds : 0;
}
var TRANSITIONS = {
  planned: ["active", "cancelled"],
  active: ["closed"],
  closed: [],
  cancelled: []
};
function assertTransition(from, to) {
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError("INVALID_STATE_TRANSITION", `A ${from} flock cannot become ${to}`, { from, to });
  }
}
function assertCanClose(events, closeDate) {
  const effective = effectiveEvents(events);
  const later = effective.find((e) => e.date > closeDate);
  if (later) throw new DomainError("INVALID_STATE_TRANSITION", `There are events after ${closeDate} (first on ${later.date}). Close on or after that date.`);
  const p = population(effective, closeDate);
  if (p.alive !== 0) {
    throw new DomainError(
      "INVALID_STATE_TRANSITION",
      `${p.alive} birds are still recorded as alive. Record their sale, transfer or loss, or an adjustment, before closing.`,
      { alive: p.alive }
    );
  }
}
function ageDays(opts, asOf) {
  if (opts.hatchDate) return daysBetween(opts.hatchDate, asOf);
  if (opts.placementDate) return daysBetween(opts.placementDate, asOf) + (opts.ageDaysAtPlacement ?? 0);
  return null;
}
var DEFAULT_STAGES = {
  broiler: [
    { key: "brooding", label: "Brooding", fromDay: 0 },
    { key: "grow_out", label: "Grow-out", fromDay: 15 },
    { key: "finishing", label: "Finishing", fromDay: 36 }
  ],
  layer: [
    { key: "chick", label: "Chick", fromDay: 0 },
    { key: "grower", label: "Grower", fromDay: 43 },
    { key: "pre_lay", label: "Pre-lay", fromDay: 120 },
    { key: "laying", label: "Laying", fromDay: 140 }
  ],
  breeder: [
    { key: "rearing", label: "Rearing", fromDay: 0 },
    { key: "pre_breeding", label: "Pre-breeding", fromDay: 140 },
    { key: "production", label: "Production", fromDay: 168 }
  ],
  chick: [
    { key: "brooding", label: "Brooding", fromDay: 0 },
    { key: "rearing", label: "Rearing", fromDay: 28 }
  ],
  custom: []
};
function stageFor(type, age) {
  if (age === null || age < 0) return null;
  let current = null;
  for (const s of DEFAULT_STAGES[type]) if (age >= s.fromDay) current = s;
  return current;
}

// src/domain/performance.ts
function weighSessionStats(weightsG) {
  const n = weightsG.length;
  if (n === 0) return null;
  const mean = weightsG.reduce((t, w) => t + w, 0) / n;
  const variance = n > 1 ? weightsG.reduce((t, w) => t + (w - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const within = weightsG.filter((w) => Math.abs(w - mean) <= mean * 0.1).length;
  return {
    count: n,
    meanG: mean,
    minG: Math.min(...weightsG),
    maxG: Math.max(...weightsG),
    sdG: sd,
    cvPercent: mean > 0 ? sd / mean * 100 : 0,
    uniformityPercent: within / n * 100
  };
}

// src/domain/eggs.ts
function henDayPercent(eggs, hensPresent) {
  if (hensPresent <= 0) return null;
  return eggs / hensPresent * 100;
}

// src/domain/hatchery.ts
var INCUBATION_DAYS = {
  chicken: 21,
  duck: 28,
  turkey: 28,
  quail: 17,
  guinea_fowl: 27
};
function expectedTransferDate(setDate, incubationDays) {
  return addDays(setDate, Math.max(1, incubationDays - 3));
}
function overallHatchOfSet(batches) {
  const done = batches.filter((b) => b.hatched !== void 0);
  const set = done.reduce((t, b) => t + b.eggsSet, 0);
  const hatched = done.reduce((t, b) => t + (b.hatched ?? 0), 0);
  return set > 0 ? hatched / set * 100 : null;
}
var COUNTED = /* @__PURE__ */ new Set(["candling", "transfer_to_hatcher", "hatch", "chick_grading"]);
function effectiveHatchEvents(events) {
  const reversed = new Set(events.filter((e) => e.type === "reversal" && e.reversalOf).map((e) => e.reversalOf));
  return events.filter((e) => e.type !== "reversal" && !reversed.has(e.id));
}
function batchCounts(eggsSet, events) {
  const c = { eggsSet, infertile: 0, cracked: 0, deadEmbryo: 0, transferred: null, hatched: 0, deadInShell: 0, culled: 0, saleable: 0, inIncubation: eggsSet, stage: "incubating" };
  for (const e of effectiveHatchEvents(events)) {
    const n = e.counts ?? {};
    if (e.type === "candling" || e.type === "transfer_to_hatcher") {
      c.infertile += n.infertile ?? 0;
      c.cracked += n.cracked ?? 0;
      c.deadEmbryo += n.deadEmbryo ?? 0;
      c.inIncubation -= (n.infertile ?? 0) + (n.cracked ?? 0) + (n.deadEmbryo ?? 0);
      if (e.type === "transfer_to_hatcher") {
        c.transferred = c.inIncubation;
        c.stage = "in_hatcher";
      }
    } else if (e.type === "hatch") {
      c.hatched = n.hatched ?? 0;
      c.deadInShell = n.deadInShell ?? 0;
      c.inIncubation -= c.hatched + c.deadInShell;
      c.stage = "hatched";
    } else if (e.type === "chick_grading") {
      c.saleable = n.saleable ?? 0;
      c.culled = n.culled ?? 0;
      c.stage = "graded";
    }
  }
  return c;
}
function assertHatchEventAllowed(eggsSet, events, next) {
  const c = batchCounts(eggsSet, events);
  const n = next.counts ?? {};
  const removed = (n.infertile ?? 0) + (n.cracked ?? 0) + (n.deadEmbryo ?? 0);
  const stageError = (msg) => new DomainError("INVALID_STATE_TRANSITION", msg, { stage: c.stage });
  switch (next.type) {
    case "candling":
      if (c.stage !== "incubating") throw stageError("Candling is done before eggs move to the hatcher");
      if (removed > c.inIncubation) throw new DomainError("VALIDATION_FAILED", `Only ${c.inIncubation} eggs are still incubating; this removes ${removed}`, { inIncubation: c.inIncubation });
      return;
    case "transfer_to_hatcher":
      if (c.stage !== "incubating") throw stageError("This batch has already been transferred");
      if (removed > c.inIncubation) throw new DomainError("VALIDATION_FAILED", `Only ${c.inIncubation} eggs are still incubating; this removes ${removed}`, { inIncubation: c.inIncubation });
      return;
    case "hatch": {
      if (c.stage !== "incubating" && c.stage !== "in_hatcher") throw stageError("This batch has already hatched");
      const total = (n.hatched ?? 0) + (n.deadInShell ?? 0);
      if (total !== c.inIncubation) {
        throw new DomainError("VALIDATION_FAILED", `Hatched plus dead in shell must equal the ${c.inIncubation} eggs in the hatcher (got ${total})`, { inIncubation: c.inIncubation });
      }
      return;
    }
    case "chick_grading": {
      if (c.stage !== "hatched") throw stageError(c.stage === "graded" ? "Chicks from this batch are already graded" : "Grade chicks after the hatch is recorded");
      const total = (n.saleable ?? 0) + (n.culled ?? 0);
      if (total !== c.hatched) throw new DomainError("VALIDATION_FAILED", `Saleable plus culled must equal the ${c.hatched} chicks hatched (got ${total})`, { hatched: c.hatched });
      return;
    }
    default:
      return;
  }
}
function reversibleHatchEvent(events) {
  const effective = effectiveHatchEvents(events).filter((e) => COUNTED.has(e.type));
  return effective[effective.length - 1] ?? null;
}
var pct = (a, b) => b > 0 ? a / b * 100 : null;
function hatcheryMetrics(c) {
  const assessable = c.eggsSet - c.cracked;
  const fertile = assessable - c.infertile;
  const hatched = c.stage === "hatched" || c.stage === "graded";
  const graded = c.stage === "graded";
  return {
    fertile,
    fertilityPercent: pct(fertile, assessable),
    hatchabilityPercent: hatched ? pct(c.hatched, fertile) : null,
    hatchOfSetPercent: hatched ? pct(c.hatched, c.eggsSet) : null,
    saleableChickPercent: graded ? pct(c.saleable, c.eggsSet) : null,
    saleableOfHatchedPercent: graded ? pct(c.saleable, c.hatched) : null,
    lossPercent: graded ? pct(c.eggsSet - c.saleable, c.eggsSet) : null
  };
}
function evaluateBrooderCheck(check, bands) {
  const band = bands?.find((b) => check.dayOfAge >= b.fromDay && check.dayOfAge <= b.toDay) ?? null;
  const flags = [];
  if (band && check.temperatureC !== void 0) {
    if (band.tempMinC !== void 0 && check.temperatureC < band.tempMinC) flags.push("temperature_low");
    if (band.tempMaxC !== void 0 && check.temperatureC > band.tempMaxC) flags.push("temperature_high");
  }
  if (band && check.humidityPercent !== void 0) {
    if (band.humidityMin !== void 0 && check.humidityPercent < band.humidityMin) flags.push("humidity_low");
    if (band.humidityMax !== void 0 && check.humidityPercent > band.humidityMax) flags.push("humidity_high");
  }
  if (check.behaviour && check.behaviour !== "comfortable") flags.push("behaviour");
  if (check.feedAvailable === false) flags.push("no_feed");
  if (check.waterAvailable === false) flags.push("no_water");
  return { band, flags };
}
function assertBands(bands) {
  const sorted = [...bands].sort((a, b) => a.fromDay - b.fromDay);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.toDay < b.fromDay) throw new DomainError("VALIDATION_FAILED", `Band from day ${b.fromDay} ends before it starts`);
    if (b.tempMinC !== void 0 && b.tempMaxC !== void 0 && b.tempMinC > b.tempMaxC) throw new DomainError("VALIDATION_FAILED", `Band from day ${b.fromDay}: minimum temperature above maximum`);
    if (i > 0 && b.fromDay <= sorted[i - 1].toDay) throw new DomainError("VALIDATION_FAILED", `Bands overlap at day ${b.fromDay}`);
  }
}

// src/domain/feed.ts
function averageDailyUseKg(issues, windowDates) {
  const set = new Set(windowDates);
  const byDay = /* @__PURE__ */ new Map();
  for (const i of issues) if (set.has(i.date)) byDay.set(i.date, (byDay.get(i.date) ?? 0) + i.kg);
  if (byDay.size === 0) return null;
  return [...byDay.values()].reduce((t, v) => t + v, 0) / byDay.size;
}
function daysOfCover(balanceKg, avgDailyUseKg, lowThresholdDays = 7) {
  if (balanceKg <= 0) return { days: 0, status: "out" };
  if (!avgDailyUseKg || avgDailyUseKg <= 0) return { days: null, status: "unknown" };
  const days = Math.floor(balanceKg / avgDailyUseKg);
  return { days, status: days < lowThresholdDays ? "low" : "ok" };
}

// src/domain/flock-metrics.ts
var FEED_COVERAGE_FOR_FCR = 0.8;
var pct2 = (part, whole) => whole > 0 ? part / whole * 100 : null;
function weightCurve(startingWeightG, placementDate, events) {
  const points = effectiveEvents(events).filter((e) => e.type === "weighing" && e.averageWeightG).map((e) => ({ date: e.date, g: e.averageWeightG }));
  if (startingWeightG && placementDate) points.push({ date: placementDate, g: startingWeightG });
  points.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const byDate = new Map(points.map((p) => [p.date, p.g]));
  const curve = [...byDate.entries()].map(([date, g]) => ({ date, g }));
  return {
    points: curve,
    at(date) {
      if (!curve.length) return null;
      if (date <= curve[0].date) return curve[0].g;
      const last = curve[curve.length - 1];
      if (date >= last.date) return last.g;
      for (let i = 1; i < curve.length; i++) {
        const b = curve[i];
        if (date <= b.date) {
          const a = curve[i - 1];
          const span = daysBetween(a.date, b.date);
          return a.g + (b.g - a.g) * daysBetween(a.date, date) / span;
        }
      }
      return last.g;
    }
  };
}
function computeFlockMetrics(i) {
  const events = effectiveEvents(i.events).filter((e) => e.date <= i.asOf);
  const feed = i.feed.filter((f) => f.date <= i.asOf);
  const pop = population(events);
  const curve = weightCurve(i.startingWeightG, i.placementDate, events);
  const weighings = events.filter((e) => e.type === "weighing" && e.averageWeightG).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const latest = weighings[weighings.length - 1];
  const averageWeightG = latest?.averageWeightG ?? null;
  let dailyWeightGainG = null;
  if (latest) {
    const start = i.startingWeightG && i.placementDate ? { date: i.placementDate, g: i.startingWeightG } : weighings[0] ? { date: weighings[0].date, g: weighings[0].averageWeightG } : null;
    const days = start ? daysBetween(start.date, latest.date) : 0;
    if (start && days > 0) dailyWeightGainG = (latest.averageWeightG - start.g) / days;
  }
  let recentDailyWeightGainG = null;
  const distinct = curve.points.filter((p) => weighings.some((w) => w.date === p.date));
  if (distinct.length >= 2) {
    const [a, b] = distinct.slice(-2);
    recentDailyWeightGainG = (b.g - a.g) / daysBetween(a.date, b.date);
  }
  const liveWeightKg = pop.alive === 0 ? 0 : averageWeightG !== null ? pop.alive * averageWeightG / 1e3 : null;
  const estimateKg = (birds, date) => {
    const g = curve.at(date);
    return g === null ? 0 : birds * g / 1e3;
  };
  let weightOutKg = 0;
  let weightInKg = 0;
  for (const e of events) {
    const birds = e.birds ?? 0;
    if (e.type === "sale" || isOutbound(e.type)) weightOutKg += e.totalLiveWeightKg ?? estimateKg(birds, e.date);
    else if (e.type === "mortality" && i.includeMortalityWeight) weightOutKg += estimateKg(birds, e.date);
    else if (e.type === "placement") weightInKg += e.totalLiveWeightKg ?? (i.startingWeightG ? (birds - (e.deadOnArrival ?? 0)) * i.startingWeightG / 1e3 : 0);
    else if (isInbound(e.type)) weightInKg += e.totalLiveWeightKg ?? 0;
  }
  const weightProducedKg = liveWeightKg === null ? null : liveWeightKg + weightOutKg - weightInKg;
  const eaten = feed.filter((f) => (f.kind ?? "consumption") === "consumption");
  const feedConsumedKg = Math.round(eaten.reduce((t, f) => t + f.quantityKg, 0) * 1e3) / 1e3;
  const feedWastedKg = Math.round(feed.filter((f) => f.kind === "wastage").reduce((t, f) => t + f.quantityKg, 0) * 1e3) / 1e3;
  const uncostedFeedKg = feed.filter((f) => f.costMinor === void 0).reduce((t, f) => t + f.quantityKg, 0);
  const feedMinor = feed.reduce((t, f) => t + (f.costMinor ?? 0), 0);
  const lastOut = events.filter((e) => e.type === "sale" || e.type === "mortality" || e.type === "cull" || isOutbound(e.type)).map((e) => e.date).sort().at(-1);
  const fcrAsOf = pop.alive > 0 ? latest?.date ?? null : lastOut ?? i.asOf;
  let fcr = null;
  let feedPerKgGainKg = null;
  let feedDaysExpected = 0;
  let feedDaysRecorded = 0;
  let fcrWarning = null;
  const fcrAgeDaysAt = (date) => ageDays({ ...i.hatchDate ? { hatchDate: i.hatchDate } : {}, ...i.placementDate ? { placementDate: i.placementDate } : {}, ...i.ageDaysAtPlacement !== void 0 ? { ageDaysAtPlacement: i.ageDaysAtPlacement } : {} }, date) ?? 0;
  let fcrAgeDays = null;
  let fcrSurvival = null;
  if (fcrAsOf) {
    const evAt = events.filter((e) => e.date <= fcrAsOf);
    const popAt = population(evAt);
    const liveAt = pop.alive > 0 ? popAt.alive * (latest?.averageWeightG ?? 0) / 1e3 : 0;
    let outAt = 0;
    let inAt = 0;
    for (const e of evAt) {
      const birds = e.birds ?? 0;
      if (e.type === "sale" || isOutbound(e.type)) outAt += e.totalLiveWeightKg ?? estimateKg(birds, e.date);
      else if (e.type === "mortality" && i.includeMortalityWeight) outAt += estimateKg(birds, e.date);
      else if (e.type === "placement") inAt += e.totalLiveWeightKg ?? (i.startingWeightG ? (birds - (e.deadOnArrival ?? 0)) * i.startingWeightG / 1e3 : 0);
      else if (isInbound(e.type)) inAt += e.totalLiveWeightKg ?? 0;
    }
    const feedAt = eaten.filter((f) => f.date <= fcrAsOf).reduce((t, f) => t + f.quantityKg, 0);
    const meatBird = i.flockType !== "layer" && i.flockType !== "breeder";
    if (meatBird && liveAt + outAt > 0 && feedAt > 0) fcr = feedAt / (liveAt + outAt);
    if (meatBird && liveAt + outAt - inAt > 0 && feedAt > 0) feedPerKgGainKg = feedAt / (liveAt + outAt - inAt);
    const start = i.placementDate ?? events.filter((e) => e.type === "placement").map((e) => e.date).sort()[0];
    if (start && start <= fcrAsOf) {
      feedDaysExpected = Math.round((Date.parse(`${fcrAsOf}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 864e5) + 1;
      feedDaysRecorded = new Set(eaten.filter((f) => f.date >= start && f.date <= fcrAsOf).map((f) => f.date)).size;
    }
    if (fcr !== null) {
      if (feedDaysExpected >= 3 && feedDaysRecorded / feedDaysExpected < FEED_COVERAGE_FOR_FCR) fcrWarning = "feed_gaps";
      else if (i.flockType === "broiler" && fcrAgeDaysAt(fcrAsOf) >= 14 && fcr < 1) fcrWarning = "implausibly_low";
    }
    fcrAgeDays = ageDays({ ...i.hatchDate ? { hatchDate: i.hatchDate } : {}, ...i.placementDate ? { placementDate: i.placementDate } : {}, ...i.ageDaysAtPlacement !== void 0 ? { ageDaysAtPlacement: i.ageDaysAtPlacement } : {} }, fcrAsOf);
    fcrSurvival = pct2(popAt.birdsIn - popAt.mortality - popAt.culled, popAt.birdsIn);
  }
  const epefWeightKg = pop.alive > 0 ? (latest?.averageWeightG ?? 0) / 1e3 : pop.sold > 0 ? weightOutKg / pop.sold : 0;
  const epef = fcr && fcrWarning !== "implausibly_low" && fcrAgeDays && fcrAgeDays > 0 && fcrSurvival !== null && epefWeightKg > 0 ? Math.round(fcrSurvival * epefWeightKg / (fcrAgeDays * fcr) * 100) : null;
  const eggsCollected = i.eggsCollected ?? 0;
  const sum = (pred, f) => events.filter(pred).reduce((t, e) => t + (f(e) ?? 0), 0);
  const revenueMinor = sum((e) => e.type === "sale", (e) => e.totalMinor) + (i.otherIncomeMinor ?? 0);
  const cost = {
    chickMinor: sum((e) => e.type === "placement", (e) => e.costMinor),
    transferredInMinor: sum((e) => isInbound(e.type), (e) => e.costMinor),
    transferredOutMinor: sum((e) => isOutbound(e.type), (e) => e.costMinor),
    feedMinor,
    otherMinor: i.otherCostMinor ?? 0,
    totalMinor: 0
  };
  cost.totalMinor = cost.chickMinor + cost.transferredInMinor - cost.transferredOutMinor + cost.feedMinor + cost.otherMinor;
  const profitMinor = revenueMinor - cost.totalMinor;
  let liveInventoryValueMinor = null;
  if (pop.alive === 0) liveInventoryValueMinor = 0;
  else if (i.referencePricePerKgMinor !== void 0 && i.referencePricePerKgMinor !== null && liveWeightKg !== null) {
    liveInventoryValueMinor = Math.round(liveWeightKg * i.referencePricePerKgMinor);
  }
  const projectedProfitMinor = liveInventoryValueMinor === null ? null : revenueMinor + liveInventoryValueMinor - cost.totalMinor;
  const projectedValue = liveInventoryValueMinor === null ? null : revenueMinor + liveInventoryValueMinor;
  return {
    ...pop,
    asOf: i.asOf,
    ageDays: ageDays({ ...i.hatchDate ? { hatchDate: i.hatchDate } : {}, ...i.placementDate ? { placementDate: i.placementDate } : {}, ...i.ageDaysAtPlacement !== void 0 ? { ageDaysAtPlacement: i.ageDaysAtPlacement } : {} }, i.asOf),
    currentBirdCount: pop.alive,
    mortalityCount: pop.mortality,
    cullCount: pop.culled,
    mortalityRate: pct2(pop.mortality, pop.birdsIn),
    cullRate: pct2(pop.culled, pop.birdsIn),
    survivalRate: pct2(pop.birdsIn - pop.mortality - pop.culled, pop.birdsIn),
    averageWeightG,
    latestWeighingDate: latest?.date ?? null,
    dailyWeightGainG,
    recentDailyWeightGainG,
    feedConsumedKg,
    feedWastedKg,
    uncostedFeedKg,
    feedPerBirdKg: pop.birdsIn > 0 ? feedConsumedKg / pop.birdsIn : null,
    feedCostMinor: feedMinor,
    feedCostPerBirdMinor: pop.birdsIn > 0 ? Math.round(feedMinor / pop.birdsIn) : null,
    feedCostPerEggMinor: eggsCollected > 0 ? feedMinor / eggsCollected : null,
    eggsCollected,
    liveWeightKg,
    weightOutKg,
    weightInKg,
    weightProducedKg,
    fcr,
    fcrAsOf,
    feedDaysRecorded,
    feedDaysExpected,
    fcrWarning,
    feedPerKgGainKg,
    epef,
    eggsPerHenHoused: eggsCollected > 0 && pop.birdsIn > 0 ? eggsCollected / pop.birdsIn : null,
    feedPerDozenEggsKg: eggsCollected > 0 && feedConsumedKg > 0 ? feedConsumedKg / (eggsCollected / 12) : null,
    revenueMinor,
    cost,
    profitMinor,
    marginPercent: revenueMinor > 0 ? profitMinor / revenueMinor * 100 : null,
    liveInventoryValueMinor,
    projectedProfitMinor,
    projectedMarginPercent: projectedValue && projectedProfitMinor !== null ? projectedProfitMinor / projectedValue * 100 : null,
    costPerBirdMinor: pop.birdsIn > 0 ? Math.round(cost.totalMinor / pop.birdsIn) : null,
    /** Cost per bird that is still alive or was sold (what a farmer means by "cost per bird"); placed birds that died raise it. */
    costPerBirdProducedMinor: pop.alive + pop.sold > 0 ? Math.round(cost.totalMinor / (pop.alive + pop.sold)) : null,
    costPerKgProducedMinor: weightProducedKg !== null && weightProducedKg > 0 ? Math.round(cost.totalMinor / weightProducedKg) : null,
    costsComplete: uncostedFeedKg === 0
  };
}

// src/domain/inventory.ts
var q3 = (n) => Math.round(n * 1e3) / 1e3;
function fefoOrder(lots) {
  return [...lots].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate < b.expiryDate ? -1 : 1;
    }
    if (a.receivedDate !== b.receivedDate) return a.receivedDate < b.receivedDate ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}
var isExpired = (lot, date) => !!lot.expiryDate && lot.expiryDate < date;
function allocate(lots, quantity, date, purpose) {
  if (!(quantity > 0)) throw new DomainError("VALIDATION_FAILED", "Quantity must be more than zero");
  const open = lots.filter((l) => l.quantityRemaining > 0);
  const usable = purpose === "use" ? open.filter((l) => !isExpired(l, date)) : open;
  const ordered = purpose === "wastage" ? [...fefoOrder(usable.filter((l) => isExpired(l, date))), ...fefoOrder(usable.filter((l) => !isExpired(l, date)))] : fefoOrder(usable);
  const available = q3(ordered.reduce((t, l) => t + l.quantityRemaining, 0));
  if (quantity > available + 1e-9) {
    const expired = q3(open.filter((l) => isExpired(l, date)).reduce((t, l) => t + l.quantityRemaining, 0));
    throw new DomainError(
      "INSUFFICIENT_STOCK",
      expired > 0 && purpose === "use" ? `Only ${available} in date stock available (${expired} more is expired and cannot be used)` : `Only ${available} in stock; ${quantity} requested`,
      { available, requested: quantity, expired }
    );
  }
  const out = [];
  let left = quantity;
  for (const lot of ordered) {
    if (left <= 1e-9) break;
    const take = q3(Math.min(lot.quantityRemaining, left));
    out.push({ lotId: lot.id, quantity: take, costMinor: Math.round(take * lot.unitCostMinor) });
    left = q3(left - take);
  }
  return out;
}
function stockTotals(lots) {
  return lots.reduce((t, l) => ({ quantity: q3(t.quantity + l.quantityRemaining), valueMinor: t.valueMinor + Math.round(l.quantityRemaining * l.unitCostMinor) }), { quantity: 0, valueMinor: 0 });
}
function averageUnitCost(lots) {
  const t = stockTotals(lots);
  return t.quantity > 0 ? t.valueMinor / t.quantity : 0;
}
function expiryStatus(expiryDate, today, warnDays, addDays2) {
  if (!expiryDate) return null;
  if (expiryDate < today) return "expired";
  if (expiryDate <= addDays2(today, warnDays)) return "expiring";
  return "ok";
}
var DEFAULT_WATER_RULES = { deviationPercent: 20, minBaselineDays: 3 };
function evaluateWater(i) {
  const r = i.rules ?? DEFAULT_WATER_RULES;
  const flags = [];
  let baseline = null;
  let deviation = null;
  if (i.previousDays.length >= r.minBaselineDays) {
    baseline = i.previousDays.reduce((t, v) => t + v, 0) / i.previousDays.length;
    if (baseline > 0) {
      deviation = (i.litres - baseline) / baseline * 100;
      if (deviation > r.deviationPercent) flags.push("consumption_high");
      if (deviation < -r.deviationPercent) flags.push("consumption_low");
    }
  }
  if (i.ph !== void 0 && r.phMin !== void 0 && i.ph < r.phMin) flags.push("ph_low");
  if (i.ph !== void 0 && r.phMax !== void 0 && i.ph > r.phMax) flags.push("ph_high");
  if (i.tdsPpm !== void 0 && r.tdsMaxPpm !== void 0 && i.tdsPpm > r.tdsMaxPpm) flags.push("tds_high");
  return { flags, baselineLitres: baseline, deviationPercent: deviation };
}

// src/domain/health.ts
function treatmentEndDate(startDate, durationDays) {
  if (!Number.isInteger(durationDays) || durationDays < 1) throw new DomainError("VALIDATION_FAILED", "Duration must be at least 1 day");
  return addDays(startDate, durationDays - 1);
}
function withdrawalUntil(endDate, days) {
  if (!days || days <= 0) return null;
  return addDays(endDate, days);
}
function activeWithdrawal(windows, date, kind) {
  const active = windows.filter((w) => w.kind === kind && w.until >= date);
  return active.sort((a, b) => a.until < b.until ? 1 : -1)[0] ?? null;
}
function vaccinationState(status, dueDate, today, dueSoonDays = 3) {
  if (status !== "scheduled") return status;
  if (dueDate < today) return "overdue";
  if (daysBetween(today, dueDate) <= dueSoonDays) return "due";
  return "scheduled";
}
function scheduleProgramme(items, opts, today) {
  const day0 = opts.hatchDate ?? (opts.placementDate ? addDays(opts.placementDate, -(opts.ageDaysAtPlacement ?? 0)) : null);
  if (!day0) throw new DomainError("VALIDATION_FAILED", "The flock needs a hatch or placement date before a programme can be applied");
  return [...items].sort((a, b) => a.dayOfAge - b.dayOfAge).map((i) => {
    const dueDate = addDays(day0, i.dayOfAge);
    return { ...i, dueDate, past: dueDate < today };
  });
}
function evaluateChecklist(items, answers) {
  const byId = new Map(answers.map((a) => [a.itemId, a]));
  for (const a of answers) if (!items.some((i) => i.id === a.itemId)) throw new DomainError("VALIDATION_FAILED", `Unknown checklist item ${a.itemId}`);
  const missing = items.filter((i) => i.required && !byId.has(i.id));
  if (missing.length) throw new DomainError("CHECKLIST_INCOMPLETE", `Answer every required item: ${missing.map((m) => m.text).join("; ")}`, { missing: missing.map((m) => m.id) });
  const out = [];
  for (const item of items) {
    const a = byId.get(item.id);
    if (!a) continue;
    const v = a.answer;
    if (item.responseType === "yes_no" && typeof v !== "boolean") throw new DomainError("VALIDATION_FAILED", `"${item.text}" needs yes or no`);
    if (item.responseType === "number" && typeof v !== "number") throw new DomainError("VALIDATION_FAILED", `"${item.text}" needs a number`);
    if (item.responseType === "choice" && !item.choices?.includes(String(v))) throw new DomainError("VALIDATION_FAILED", `"${item.text}" must be one of: ${item.choices?.join(", ")}`);
    const normalized = typeof v === "boolean" ? v ? "yes" : "no" : String(v);
    out.push({ itemId: item.id, text: item.text, answer: v, passed: item.failIf === void 0 || normalized !== item.failIf });
  }
  return { answers: out, failed: out.filter((a) => !a.passed) };
}
function visitorDowntime(lastContactAt, checkInAt, requiredHours) {
  if (!lastContactAt) return { hours: null, short: false };
  const hours = Math.round((checkInAt.getTime() - lastContactAt.getTime()) / 36e5 * 10) / 10;
  return { hours, short: requiredHours !== void 0 && hours < requiredHours };
}

// src/domain/orders.ts
var ORDER_TRANSITIONS = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "dispatched", "delivered", "cancelled"],
  preparing: ["dispatched", "delivered", "cancelled"],
  dispatched: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: []
};
var ACTOR_MOVES = {
  seller: ["accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"],
  buyer: ["cancelled", "delivered", "completed"]
};
function assertOrderTransition(o, to, actor) {
  const allowed = ORDER_TRANSITIONS[o.status];
  if (!allowed.includes(to)) {
    throw new DomainError("INVALID_STATE_TRANSITION", `An order that is ${o.status} cannot become ${to}${allowed.length ? ` (next: ${allowed.join(", ")})` : ""}`, { from: o.status, to, allowed });
  }
  if (o.fulfilment === "pickup" && to === "dispatched") throw new DomainError("INVALID_STATE_TRANSITION", "Pickup orders are collected, not dispatched; mark them delivered when collected");
  if (o.fulfilment !== "pickup" && to === "delivered" && o.status !== "dispatched") throw new DomainError("INVALID_STATE_TRANSITION", "Dispatch the order before marking it delivered");
  if (!ACTOR_MOVES[actor].includes(to)) throw new DomainError("FORBIDDEN", `The ${actor} cannot mark an order ${to}`);
  if (actor === "buyer" && to === "cancelled" && o.status !== "pending" && o.status !== "accepted") throw new DomainError("INVALID_STATE_TRANSITION", "The order is already being prepared; ask the seller to cancel it");
  if (actor === "buyer" && to === "delivered" && o.status !== "dispatched") throw new DomainError("INVALID_STATE_TRANSITION", "Only a dispatched order can be confirmed as received by the buyer");
  if (to === "completed" && o.paymentStatus !== "paid") throw new DomainError("INVALID_STATE_TRANSITION", "Record full payment before completing the order");
}
var RESERVING_STATUSES = ["accepted", "preparing", "dispatched"];

// src/domain/finance.ts
function applyTax(amountMinor, tax) {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new DomainError("VALIDATION_FAILED", "Amounts must be whole minor units, not negative");
  if (!tax || tax.ratePercent === 0) return { netMinor: amountMinor, taxMinor: 0, grossMinor: amountMinor };
  if (tax.ratePercent < 0 || tax.ratePercent > 100) throw new DomainError("VALIDATION_FAILED", "Tax rate must be between 0 and 100%");
  if (tax.inclusive) {
    const taxMinor2 = Math.round(amountMinor - amountMinor / (1 + tax.ratePercent / 100));
    return { netMinor: amountMinor - taxMinor2, taxMinor: taxMinor2, grossMinor: amountMinor };
  }
  const taxMinor = Math.round(amountMinor * tax.ratePercent / 100);
  return { netMinor: amountMinor, taxMinor, grossMinor: amountMinor + taxMinor };
}
function paymentStatus(totalMinor, paidMinor) {
  if (paidMinor <= 0) return "unpaid";
  return paidMinor >= totalMinor ? "paid" : "partially_paid";
}
function assertPaymentFits(kind, amountMinor, totalMinor, paidMinor) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new DomainError("VALIDATION_FAILED", "Amount must be more than zero");
  if (kind === "payment" && paidMinor + amountMinor > totalMinor) {
    throw new DomainError("VALIDATION_FAILED", `This would overpay by ${paidMinor + amountMinor - totalMinor} (outstanding ${totalMinor - paidMinor})`, { outstandingMinor: totalMinor - paidMinor });
  }
  if (kind === "refund" && amountMinor > paidMinor) throw new DomainError("VALIDATION_FAILED", `Only ${paidMinor} has been paid; a refund cannot exceed it`, { paidMinor });
}
function ageBucket(dueDate, today) {
  const d = daysBetween(dueDate, today);
  const bucket = d <= 0 ? "current" : d <= 30 ? "1_30" : d <= 60 ? "31_60" : d <= 90 ? "61_90" : "over_90";
  return { daysOverdue: Math.max(0, d), bucket };
}

// src/domain/intelligence.ts
function baselineOf(values, minPoints) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < Math.max(1, minPoints)) return null;
  const mean = v.reduce((t, x) => t + x, 0) / v.length;
  const sd = v.length > 1 ? Math.sqrt(v.reduce((t, x) => t + (x - mean) ** 2, 0) / (v.length - 1)) : 0;
  return { mean, sd, n: v.length, min: Math.min(...v), max: Math.max(...v) };
}
function deviationFrom(value, b, t) {
  const diff = value - b.mean;
  const direction = diff > 0 ? "above" : diff < 0 ? "below" : null;
  const deviationPercent = b.mean !== 0 ? diff / b.mean * 100 : null;
  const z2 = b.sd > 0 ? diff / b.sd : null;
  const wrongWay = t.direction === "above" && diff <= 0 || t.direction === "below" && diff >= 0;
  const bigEnoughPct = t.deviationPercent === void 0 ? false : deviationPercent === null ? diff !== 0 : Math.abs(deviationPercent) > t.deviationPercent;
  const bigEnoughZ = t.zScore === void 0 || z2 === null ? false : Math.abs(z2) > t.zScore;
  const absoluteOk = t.minAbsoluteChange === void 0 || Math.abs(diff) >= t.minAbsoluteChange;
  return { triggered: !wrongWay && (bigEnoughPct || bigEnoughZ) && absoluteOk, direction, deviationPercent, z: z2 };
}
var WINDOW = { key: "windowDays", label: "Days of history for the baseline", unit: "days", default: 7, min: 3, max: 60 };
var MIN_BASE = { key: "minBaselineDays", label: "Days needed before judging", unit: "days", default: 3, min: 2, max: 30 };
var MANAGERS = ["owner", "admin", "farm_manager"];
var FIELD = ["owner", "admin", "farm_manager", "supervisor"];
var RULE_DEFINITIONS = {
  mortality: {
    key: "mortality",
    label: "Mortality",
    alertTypes: ["mortality_spike"],
    baseline: "flock_history",
    description: "A day's deaths well above the flock's own recent average. An absolute daily limit applies only if set.",
    params: [WINDOW, MIN_BASE, { key: "deviationPercent", label: "Above the flock's average by more than", unit: "%", default: 50, min: 5, max: 1e3 }, { key: "minExtraBirds", label: "And at least this many more birds", unit: "birds", default: 3, min: 0, max: 1e5 }, { key: "dailyRatePercentMax", label: "Daily mortality above (optional)", unit: "% of birds", min: 0, max: 100 }],
    defaultSeverity: "warning",
    defaultRoles: FIELD,
    defaultChannels: ["in_app", "push"]
  },
  egg_production: {
    key: "egg_production",
    label: "Egg production",
    alertTypes: ["egg_drop"],
    baseline: "flock_history",
    description: "Hen-day production below the flock's own recent level. A minimum hen-day % applies only if set.",
    params: [WINDOW, MIN_BASE, { key: "dropPercent", label: "Below the flock's average by more than", unit: "%", default: 10, min: 1, max: 100 }, { key: "henDayPercentMin", label: "Hen-day production below (optional)", unit: "%", min: 0, max: 100 }],
    defaultSeverity: "warning",
    defaultRoles: FIELD,
    defaultChannels: ["in_app", "push"]
  },
  feed_consumption: {
    key: "feed_consumption",
    label: "Feed consumption",
    alertTypes: ["feed_change"],
    baseline: "flock_history",
    description: "Feed eaten per bird far from the flock's own recent days, up or down.",
    params: [WINDOW, MIN_BASE, { key: "deviationPercent", label: "Different from the flock's average by more than", unit: "%", default: 20, min: 1, max: 500 }],
    defaultSeverity: "warning",
    defaultRoles: FIELD,
    defaultChannels: ["in_app", "push"]
  },
  water_consumption: {
    key: "water_consumption",
    label: "Water consumption and quality",
    alertTypes: ["water_abnormal"],
    baseline: "flock_history",
    description: "Water drunk far from the flock's own recent days. pH and dissolved-solids limits apply only if set.",
    params: [WINDOW, MIN_BASE, { key: "deviationPercent", label: "Different from the flock's average by more than", unit: "%", default: 20, min: 1, max: 500 }, { key: "phMin", label: "pH below (optional)", min: 0, max: 14 }, { key: "phMax", label: "pH above (optional)", min: 0, max: 14 }, { key: "tdsMaxPpm", label: "Dissolved solids above (optional)", unit: "ppm", min: 0, max: 1e5 }],
    defaultSeverity: "warning",
    defaultRoles: FIELD,
    defaultChannels: ["in_app", "push"]
  },
  weight_variance: {
    key: "weight_variance",
    label: "Weight variance",
    alertTypes: ["weight_variance"],
    baseline: "target",
    description: "Average weight below the farm's target for the age (brooding profile), or recent daily gain well below the flock's own.",
    params: [{ key: "belowTargetPercent", label: "Below the target weight by more than", unit: "%", default: 10, min: 1, max: 90 }, { key: "gainDropPercent", label: "Recent daily gain below the flock's own by more than", unit: "%", default: 25, min: 1, max: 100 }],
    defaultSeverity: "warning",
    defaultRoles: FIELD,
    defaultChannels: ["in_app", "push"]
  },
  fcr_variance: {
    key: "fcr_variance",
    label: "FCR variance",
    alertTypes: ["fcr_variance"],
    baseline: "farm_history",
    description: "A flock's FCR above the farm's own past flocks of the same type (at least 2), or above a target FCR if set.",
    params: [{ key: "abovePercent", label: "Above the farm's past flocks by more than", unit: "%", default: 10, min: 1, max: 200 }, { key: "minPastFlocks", label: "Past flocks needed", default: 2, min: 1, max: 50 }, { key: "targetFcr", label: "Target FCR (optional)", min: 0.5, max: 10 }],
    defaultSeverity: "info",
    defaultRoles: MANAGERS,
    defaultChannels: ["in_app", "push"]
  },
  inventory: {
    key: "inventory",
    label: "Low stock",
    alertTypes: ["low_inventory", "low_feed_stock"],
    baseline: "stock",
    description: "Stock at or below each item's own reorder level, or feed for fewer than the item's reorder days.",
    params: [],
    defaultSeverity: "warning",
    defaultRoles: MANAGERS,
    defaultChannels: ["in_app", "push", "email"]
  },
  medicine_expiry: {
    key: "medicine_expiry",
    label: "Expiry",
    alertTypes: ["expiry_soon", "expired_stock"],
    baseline: "stock",
    description: "Lots expiring within each item's own warning window, and expired stock still on hand.",
    params: [],
    defaultSeverity: "warning",
    defaultRoles: MANAGERS,
    defaultChannels: ["in_app", "push", "email"]
  },
  vaccination_due: {
    key: "vaccination_due",
    label: "Vaccination due",
    alertTypes: ["vaccination_due"],
    baseline: "schedule",
    description: "Vaccinations due soon or overdue, from the farm's own programmes.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 30 }],
    defaultSeverity: "warning",
    defaultRoles: FIELD,
    defaultChannels: ["in_app", "push"]
  },
  vet_appointment: {
    key: "vet_appointment",
    label: "Vet appointment",
    alertTypes: ["vet_appointment", "health_follow_up"],
    baseline: "schedule",
    description: "Booked vet appointments and health follow-ups coming up or overdue.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 30 }],
    defaultSeverity: "info",
    defaultRoles: MANAGERS,
    defaultChannels: ["in_app", "push"]
  },
  hatch_date: {
    key: "hatch_date",
    label: "Hatch date",
    alertTypes: ["hatch_due"],
    baseline: "schedule",
    description: "Hatches expected soon, due today or overdue.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 10 }],
    defaultSeverity: "info",
    defaultRoles: MANAGERS,
    defaultChannels: ["in_app", "push"]
  },
  order_delivery: {
    key: "order_delivery",
    label: "Order delivery",
    alertTypes: ["order_delivery"],
    baseline: "schedule",
    description: "Open orders with a delivery date coming up or passed.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 14 }],
    defaultSeverity: "info",
    defaultRoles: MANAGERS,
    defaultChannels: ["in_app", "push", "email"]
  },
  payment_overdue: {
    key: "payment_overdue",
    label: "Payment overdue",
    alertTypes: ["payment_overdue"],
    baseline: "schedule",
    description: "Receivables (and, if chosen, payables) past their due date plus a grace period.",
    params: [{ key: "graceDays", label: "Days after the due date", unit: "days", default: 0, min: 0, max: 90 }, { key: "includePayables", label: "Also bills the farm owes (1 = yes)", default: 1, min: 0, max: 1 }],
    defaultSeverity: "warning",
    defaultRoles: ["owner", "admin", "accountant"],
    defaultChannels: ["in_app", "push", "email"]
  },
  weather_risk: {
    key: "weather_risk",
    label: "Weather risk",
    alertTypes: ["weather_risk"],
    baseline: "weather_history",
    description: "Forecast temperatures well above or below the farm's own recent weather. Fixed heat, cold, rain and wind limits apply only if set.",
    params: [
      { key: "forecastDays", label: "Days of forecast to check", unit: "days", default: 3, min: 1, max: 7 },
      { key: "historyDays", label: "Days of past weather for the baseline", unit: "days", default: 30, min: 7, max: 120 },
      { key: "minHistoryDays", label: "Days of history needed", unit: "days", default: 7, min: 3, max: 60 },
      { key: "aboveRecentMaxC", label: "Hotter than the recent average high by more than", unit: "\xB0C", default: 4, min: 1, max: 20 },
      { key: "belowRecentMinC", label: "Colder than the recent average low by more than", unit: "\xB0C", default: 4, min: 1, max: 20 },
      { key: "heatMaxC", label: "Forecast high above (optional)", unit: "\xB0C", min: -20, max: 60 },
      { key: "coldMinC", label: "Forecast low below (optional)", unit: "\xB0C", min: -50, max: 40 },
      { key: "rainMm", label: "Daily rain above (optional)", unit: "mm", min: 0, max: 1e3 },
      { key: "windKph", label: "Wind above (optional)", unit: "km/h", min: 0, max: 300 }
    ],
    defaultSeverity: "warning",
    defaultRoles: FIELD,
    defaultChannels: ["in_app", "push"]
  }
};
var RULE_FOR_ALERT = Object.fromEntries(
  Object.values(RULE_DEFINITIONS).flatMap((r) => r.alertTypes.map((t) => [t, r.key]))
);
function validateRuleParams(key, params) {
  const defs = new Map(RULE_DEFINITIONS[key].params.map((p) => [p.key, p]));
  for (const [k, v] of Object.entries(params)) {
    const d = defs.get(k);
    if (!d) throw new Error(`Unknown parameter "${k}" for ${key}`);
    if (!Number.isFinite(v) || v < d.min || v > d.max) throw new Error(`${d.label} must be between ${d.min} and ${d.max}`);
  }
}
function effectiveParams(key, farm) {
  const out = {};
  for (const p of RULE_DEFINITIONS[key].params) {
    const v = farm?.[p.key] ?? p.default;
    if (v !== void 0) out[p.key] = v;
  }
  return out;
}
function weatherRisks(forecast, history, p) {
  const highs = baselineOf(history.map((h) => h.tempMaxC ?? NaN), p["minHistoryDays"] ?? 7);
  const lows = baselineOf(history.map((h) => h.tempMinC ?? NaN), p["minHistoryDays"] ?? 7);
  const risks = [];
  for (const d of forecast.slice(0, p["forecastDays"] ?? 3)) {
    if (d.tempMaxC !== void 0) {
      if (highs && p["aboveRecentMaxC"] !== void 0 && d.tempMaxC - highs.mean > p["aboveRecentMaxC"]) risks.push({ date: d.date, kind: "heat", value: d.tempMaxC, reason: `high of ${d.tempMaxC} \xB0C, ${round1(d.tempMaxC - highs.mean)} \xB0C above this farm's recent average high (${round1(highs.mean)} \xB0C)` });
      else if (p["heatMaxC"] !== void 0 && d.tempMaxC > p["heatMaxC"]) risks.push({ date: d.date, kind: "heat", value: d.tempMaxC, reason: `high of ${d.tempMaxC} \xB0C, above the farm's limit of ${p["heatMaxC"]} \xB0C` });
    }
    if (d.tempMinC !== void 0) {
      if (lows && p["belowRecentMinC"] !== void 0 && lows.mean - d.tempMinC > p["belowRecentMinC"]) risks.push({ date: d.date, kind: "cold", value: d.tempMinC, reason: `low of ${d.tempMinC} \xB0C, ${round1(lows.mean - d.tempMinC)} \xB0C below this farm's recent average low (${round1(lows.mean)} \xB0C)` });
      else if (p["coldMinC"] !== void 0 && d.tempMinC < p["coldMinC"]) risks.push({ date: d.date, kind: "cold", value: d.tempMinC, reason: `low of ${d.tempMinC} \xB0C, below the farm's limit of ${p["coldMinC"]} \xB0C` });
    }
    if (d.rainMm !== void 0 && p["rainMm"] !== void 0 && d.rainMm > p["rainMm"]) risks.push({ date: d.date, kind: "rain", value: d.rainMm, reason: `${d.rainMm} mm of rain, above the farm's limit of ${p["rainMm"]} mm` });
    if (d.windMaxKph !== void 0 && p["windKph"] !== void 0 && d.windMaxKph > p["windKph"]) risks.push({ date: d.date, kind: "wind", value: d.windMaxKph, reason: `wind up to ${d.windMaxKph} km/h, above the farm's limit of ${p["windKph"]} km/h` });
  }
  return { risks, baseline: { avgMaxC: highs ? round1(highs.mean) : null, avgMinC: lows ? round1(lows.mean) : null, days: highs?.n ?? 0 } };
}
var round1 = (n) => Math.round(n * 10) / 10;

// src/domain/report.ts
function formatCell(v, type, currency, decimals) {
  if (v === null || v === void 0 || v === "") return "\u2014";
  if (typeof v === "string") return v;
  const n = (x, dp) => x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  switch (type) {
    case "money":
      return `${currency} ${n(v / 100, 2)}`;
    case "percent":
      return `${n(v, decimals ?? 1)}%`;
    case "number":
      return n(v, decimals ?? (Number.isInteger(v) ? 0 : 2));
    default:
      return String(v);
  }
}
function sheetValue(v, type) {
  if (v === null || v === void 0) return null;
  if (type === "money" && typeof v === "number") return Math.round(v) / 100;
  return v;
}
function safeText(s) {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

// src/adapters/mongo/models/production.ts
var D2 = "Production";
var HouseModel = defineCollection({
  model: "House",
  collection: "houses",
  domain: D2,
  ownership: "farm",
  description: "A shed, pen or brooder room. Flocks are placed in houses; equipment and cleaning tasks can be tied to them.",
  fields: {
    name: str({ required: true, max: 80 }),
    type: enumOf(HOUSE_TYPES, { required: true }),
    capacityBirds: int({ min: 1 }),
    floorAreaM2: num(),
    status: enumOf(["active", "inactive"], { required: true, default: "active" }),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "House list per farm (prefix); house names are unique within a farm" }]
});
var PopulationSchema = new Schema3(
  {
    placed: int({ required: true }),
    transferredIn: int({ required: true }),
    mortality: int({ required: true }),
    culled: int({ required: true }),
    sold: int({ required: true }),
    transferredOut: int({ required: true }),
    adjustments: int({ required: true, min: -1e7 }),
    alive: int({ required: true }),
    asOf: localDate({ required: true })
  },
  { _id: false }
);
var FlockModel = defineCollection({
  model: "Flock",
  collection: "flocks",
  domain: D2,
  ownership: "farm",
  description: "A group of birds managed together from placement to closure: broiler batch, layer or breeder flock, chick-rearing group, or a custom poultry type.",
  fields: {
    houseId: ref("House", { required: true }),
    name: str({ required: true, max: 120 }),
    flockCode: str({ required: true, max: 40 }),
    type: enumOf(FLOCK_TYPES, { required: true }),
    customTypeName: str({ max: 60 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    breed: str({ max: 120 }),
    strain: str({ max: 120 }),
    source: str({ max: 200 }),
    status: enumOf(FLOCK_STATUSES, { required: true, default: "planned" }),
    hatchDate: localDate(),
    /** Initial placement, copied from the placement event when the flock is placed. Immutable afterwards. */
    placementDate: localDate(),
    placementCount: int({ min: 1 }),
    deadOnArrival: int(),
    ageDaysAtPlacement: int({ max: 2e3 }),
    startingWeightG: num({ max: 5e4 }),
    chickCost: money(),
    targetSaleDate: localDate(),
    closedDate: localDate(),
    splitFromFlockId: ref("Flock"),
    mergedIntoFlockId: ref("Flock"),
    hatcheryBatchId: ref("HatcheryBatch"),
    notes: text(2e3),
    /**
     * Derived snapshot of the ledger, maintained by FlockService in the same transaction as every flock_event.
     * Rebuildable from flock_events; never edited directly.
     */
    population: { type: PopulationSchema }
  },
  indexes: [
    { fields: { farmId: 1, status: 1, placementDate: -1 }, why: "Flock list and dashboard: active (or closed) flocks of a farm, newest first" },
    { fields: { farmId: 1, houseId: 1, status: 1 }, why: "House occupancy and capacity check for placements and transfers" },
    { fields: { farmId: 1, flockCode: 1 }, options: { unique: true, ...LIVE }, why: "Flock codes are unique within a farm; lookup by code" }
  ],
  configure: (schema) => schema.pre("validate", function() {
    if (this.get("type") === "custom" && !this.get("customTypeName")) this.invalidate("customTypeName", "Name the custom poultry type");
  })
});
var FlockEventModel = defineCollection({
  model: "FlockEvent",
  collection: "flock_events",
  domain: D2,
  ownership: "farm",
  appendOnly: true,
  description: "The flock ledger: every placement, death, cull, transfer, split, merge, adjustment, sale and weighing. A flock's bird count is the sum of these. Append-only; mistakes are corrected with a reversal event.",
  fields: {
    flockId: ref("Flock", { required: true }),
    type: enumOf(FLOCK_EVENT_TYPES, { required: true }),
    date: localDate({ required: true }),
    birds: int({ min: 1 }),
    deadOnArrival: int(),
    /** Adjustment only: signed. */
    delta: int({ min: -1e7 }),
    cause: enumOf(MORTALITY_CAUSES),
    totalLiveWeightKg: num(),
    averageWeightG: num({ max: 5e4 }),
    sampleSize: int({ min: 1 }),
    birdWeightId: ref("BirdWeight"),
    /** Sale revenue. */
    total: money(),
    /** Placement purchase cost, or acquisition cost moved with transferred birds. */
    cost: money(),
    counterpartFlockId: ref("Flock"),
    fromHouseId: ref("House"),
    toHouseId: ref("House"),
    /** Links the two halves of a transfer, split or merge. */
    groupId: { type: String },
    dailyRecordId: ref("DailyRecord"),
    chickLotId: ref("ChickLot"),
    buyerId: ref("Buyer"),
    orderId: ref("Order"),
    fromStatus: enumOf(FLOCK_STATUSES),
    toStatus: enumOf(FLOCK_STATUSES),
    reason: str({ max: 500 }),
    reversalOf: ref("FlockEvent"),
    note: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, date: 1 }, why: "A flock's ledger: population, calculations, day views, event history" }]
});
var DailyRecordModel = defineCollection({
  model: "DailyRecord",
  collection: "daily_records",
  domain: D2,
  ownership: "farm",
  description: "One record per flock per farm-local day, entered from web or mobile. Holds conditions, headcount, notes and photo references; its other sections are written to their source collections and linked by dailyRecordId: deaths, culls and average weight (flock_events), feed (feed_consumption), water (water_records), eggs (egg_records), health observations (health_records).",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    /** The flock's house on this day (flocks can move), for filtering by house. */
    houseId: ref("House", { required: true }),
    /** Copied from the flock (immutable there), for filtering by type without a join. */
    flockType: enumOf(FLOCK_TYPES, { required: true }),
    /** Headcount taken in the house; compared with the ledger, never applied to it. */
    observedBirdCount: int(),
    temperatureMinC: num({ min: -60, max: 70 }),
    temperatureMaxC: num({ min: -60, max: 70 }),
    humidityPercent: num({ max: 100 }),
    lightingHours: num({ max: 24 }),
    notes: text(2e3),
    photos: {
      type: [new Schema3({ assetId: ref("MediaAsset", { required: true }), caption: str({ max: 200 }) }, { _id: false })],
      default: [],
      validate: { validator: (v) => v.length <= 10, message: "At most 10 photos" }
    },
    /**
     * Derived: totals of what this record wrote to its source collections, rewritten in the same transaction.
     * Lets lists show a day at a glance without reading five collections. Dashboards aggregate the sources.
     */
    summary: {
      type: new Schema3(
        {
          mortality: int({ default: 0 }),
          culls: int({ default: 0 }),
          feedKg: num({ default: 0 }),
          waterLitres: num(),
          eggsCollected: int(),
          eggsBroken: int(),
          averageWeightG: num({ max: 5e4 }),
          observations: int({ default: 0 }),
          photos: int({ default: 0 })
        },
        { _id: false }
      )
    }
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; also serves a flock's date-range history" },
    { fields: { farmId: 1, date: 1 }, why: "Dashboard and nightly alert job: all flocks' records for a day; missing-record detection" }
  ]
});
var BirdWeightModel = defineCollection({
  model: "BirdWeight",
  collection: "bird_weights",
  domain: D2,
  ownership: "farm",
  description: "A weigh session: individual sample weights of one flock on one day, with statistics computed from those weights.",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    weightsG: {
      type: [{ type: Number, min: 1, max: 5e4 }],
      required: true,
      validate: { validator: (v) => v.length >= 1 && v.length <= 2e3, message: "1 to 2000 weights per session" }
    },
    /** Computed by the domain function weighSessionStats from weightsG on save. */
    stats: {
      type: new Schema3(
        { count: int(), meanG: num(), minG: num(), maxG: num(), sdG: num(), cvPercent: num(), uniformityPercent: num({ max: 100 }) },
        { _id: false }
      )
    },
    scaleEquipmentId: ref("Equipment"),
    note: text(500)
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, date: -1 }, why: "Growth curve and latest weight of a flock" }],
  configure: (schema) => schema.pre("validate", function() {
    const w = this.get("weightsG") ?? [];
    if (w.length) this.set("stats", weighSessionStats([...w]));
  }),
  notes: ["Sample weights are embedded: they are always read with their session and are bounded (\u2264 2000)."]
});
var EggRecordModel = defineCollection({
  model: "EggRecord",
  collection: "egg_records",
  domain: D2,
  ownership: "farm",
  description: "Eggs collected from one flock on one day, by grade. Saving it posts a 'collected' movement to egg_inventory.",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    collected: int({ required: true }),
    byGrade: { type: Map, of: { type: Number, min: 0 }, default: void 0 },
    broken: int({ default: 0 }),
    averageEggWeightG: num({ max: 150 }),
    qualityNotes: str({ max: 500 }),
    /** Laid during an egg withdrawal period: must not be sold. The date is the withdrawal's last day. */
    withheldUntil: localDate(),
    dailyRecordId: ref("DailyRecord"),
    notes: text(1e3)
  },
  indexes: [
    { fields: { farmId: 1, dailyRecordId: 1 }, options: { partialFilterExpression: { dailyRecordId: { $type: "string" } } }, why: "A day's own egg record (every day save and day view)" },
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; flock production chart and hen-day %" },
    { fields: { farmId: 1, date: 1 }, why: "Farm egg totals per day (dashboard, 14-day chart, egg-drop alerts)" }
  ],
  configure: (schema) => schema.path("byGrade").validate(function(v) {
    return !v || [...v.keys()].every((k) => EGG_GRADES.includes(k));
  }, "byGrade keys must be egg grades")
});
var EggInventoryModel = defineCollection({
  model: "EggInventory",
  collection: "egg_inventory",
  domain: D2,
  ownership: "farm",
  appendOnly: true,
  description: "Egg stock ledger. Each movement adds (collected, positive adjustment) or removes (sold, broken, used, spoiled) eggs; stock per grade is the sum of quantityDelta.",
  fields: {
    date: localDate({ required: true }),
    type: enumOf(EGG_MOVEMENT_TYPES, { required: true }),
    grade: enumOf(EGG_GRADES),
    quantityDelta: int({ required: true, min: -1e7 }),
    flockId: ref("Flock"),
    sourceType: enumOf(["egg_record", "order", "manual", "hatchery_batch"], { required: true }),
    sourceId: { type: String },
    reversalOf: ref("EggInventory"),
    note: text(500)
  },
  indexes: [
    { fields: { farmId: 1, grade: 1, date: 1 }, why: "Current stock per grade (sum) and movement history" },
    { fields: { farmId: 1, sourceId: 1 }, why: "Find the postings of an egg record or order to reverse them when it changes" }
  ],
  relations: [{ field: "sourceId", to: "EggRecord | Order", cardinality: "many-to-one", note: "Polymorphic by sourceType" }]
});
var WaterRecordModel = defineCollection({
  model: "WaterRecord",
  collection: "water_records",
  domain: D2,
  ownership: "farm",
  description: "Water drunk by one flock on one day, with source, quality (pH, dissolved solids, chlorine), treatment and abnormal-consumption flags. Falling intake is often the first sign of illness or heat stress.",
  fields: {
    flockId: ref("Flock", { required: true }),
    date: localDate({ required: true }),
    litres: num({ required: true, max: 1e7 }),
    meterReading: num(),
    dailyRecordId: ref("DailyRecord"),
    source: enumOf(WATER_SOURCES),
    ph: num({ max: 14 }),
    tdsPpm: num({ max: 1e5 }),
    chlorinePpm: num({ max: 100 }),
    qualityRating: enumOf(WATER_QUALITY_RATINGS),
    treatment: enumOf(WATER_TREATMENTS),
    treatmentNotes: str({ max: 300 }),
    /** Derived on save: consumption against the flock's recent average, pH and dissolved solids against the farm's limits. */
    flags: { type: [enumOf(["consumption_high", "consumption_low", "ph_low", "ph_high", "tds_high"])], default: void 0 },
    baselineLitres: num(),
    medicated: { type: Boolean, default: false },
    healthRecordId: ref("HealthRecord"),
    notes: text(500)
  },
  indexes: [
    { fields: { farmId: 1, dailyRecordId: 1 }, options: { partialFilterExpression: { dailyRecordId: { $type: "string" } } }, why: "A day's own water record (every day save and day view)" },
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { unique: true, ...LIVE }, why: "One record per flock per day; water-to-feed ratio chart" }
  ]
});

// src/adapters/mongo/models/feed.ts
import { Schema as Schema4 } from "mongoose";
var D3 = "Feed";
var StockSnapshotSchema = new Schema4(
  {
    quantity: num({ required: true, min: -1e9 }),
    valueMinor: int({ required: true, min: -1e12 }),
    currency: { type: String, match: /^[A-Z]{3}$/ },
    asOf: localDate({ required: true })
  },
  { _id: false }
);
var FeedConsumptionModel = defineCollection({
  model: "FeedConsumption",
  collection: "feed_consumption",
  domain: D3,
  ownership: "farm",
  description: "Feed eaten by, or wasted in, a flock's house on a day. When it names a feed item, stock is drawn FEFO from that item's lots in the same transaction and the entry is costed at those lots' prices; the sum per flock feeds FCR and feed cost.",
  fields: {
    flockId: ref("Flock"),
    /** The feed item (an inventory item of category feed). Without it the entry is recorded but no stock moves. */
    feedItemId: ref("InventoryItem"),
    kind: enumOf(FEED_CONSUMPTION_KINDS, { required: true, default: "consumption" }),
    date: localDate({ required: true }),
    quantityKg: num({ required: true, min: 1e-3 }),
    dailyRecordId: ref("DailyRecord"),
    /** Lots the feed came from (FEFO), with each lot's cost. */
    allocations: {
      type: [new Schema4({ lotId: ref("InventoryLot", { required: true }), quantity: num({ required: true }), costMinor: int({ required: true }) }, { _id: false })],
      default: void 0
    },
    /** Lot cost when stock moved; otherwise the price entered with the feed. */
    cost: money(),
    reason: str({ max: 300 }),
    notes: text(500)
  },
  indexes: [
    { fields: { farmId: 1, dailyRecordId: 1 }, options: { partialFilterExpression: { dailyRecordId: { $type: "string" } } }, why: "A day's own feed lines (every day save and day view)" },
    { fields: { farmId: 1, flockId: 1, date: 1 }, why: "FCR, daily feed per flock, feed-change alerts" },
    { fields: { farmId: 1, feedItemId: 1, date: 1 }, options: { partialFilterExpression: { feedItemId: { $exists: true } } }, why: "Average daily use per feed item for days of feed remaining" }
  ]
});

// src/adapters/mongo/models/inventory.ts
import { Schema as Schema5 } from "mongoose";
var D4 = "Inventory";
var InventoryItemModel = defineCollection({
  model: "InventoryItem",
  collection: "inventory_items",
  domain: D4,
  ownership: "farm",
  description: "The stock catalog: feed, medicine, vaccines, disinfectant, litter, packaging, equipment supplies, spare parts and other consumables. Feed items carry feed details. Stock is held in lots; the item keeps a derived total.",
  fields: {
    name: str({ required: true, max: 120 }),
    category: enumOf(INVENTORY_CATEGORIES, { required: true }),
    unit: enumOf(STOCK_UNITS, { required: true }),
    sku: str({ max: 60 }),
    medicineId: ref("Medicine"),
    feed: {
      type: new Schema5({ stage: enumOf(FEED_STAGES, { required: true }), form: enumOf(["mash", "crumble", "pellet", "other"]), bagSizeKg: num() }, { _id: false })
    },
    defaultSupplier: str({ max: 120 }),
    defaultStorageLocation: str({ max: 120 }),
    /** Low-stock alert when the quantity in date falls to or below this. */
    reorderLevel: num(),
    /** Feed only: low-stock alert when fewer days of feed remain. */
    reorderDays: num({ max: 365 }),
    /** Expiry alert this many days before a lot expires. */
    expiryWarningDays: int({ default: 30, max: 365 }),
    active: bool(true),
    notes: text(1e3),
    /** Derived from lots, in the same transaction as each movement. Rebuildable from inventory_transactions. */
    stock: { type: StockSnapshotSchema }
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Inventory list (prefix); names unique within a farm" }]
});
var InventoryLotModel = defineCollection({
  model: "InventoryLot",
  collection: "inventory_lots",
  domain: D4,
  ownership: "farm",
  description: "A batch received into stock (a purchase, or a positive stock-count correction): supplier, batch number, expiry, storage location, unit cost and what remains. Stock leaves lots FEFO.",
  fields: {
    itemId: ref("InventoryItem", { required: true }),
    receivedDate: localDate({ required: true }),
    supplier: str({ max: 120 }),
    batchNumber: str({ max: 60 }),
    invoiceNumber: str({ max: 60 }),
    expiryDate: localDate(),
    storageLocation: str({ max: 120 }),
    quantityReceived: num({ required: true, min: 1e-3 }),
    /** Derived: received minus what has left, updated in the same transaction as each movement. */
    quantityRemaining: num({ required: true }),
    unitCost: money({ required: true }),
    expenseId: ref("Expense")
  },
  indexes: [
    { fields: { farmId: 1, itemId: 1, receivedDate: 1 }, why: "An item's lots for FEFO picking and its stock view" },
    { fields: { farmId: 1, expiryDate: 1 }, options: { partialFilterExpression: { expiryDate: { $exists: true } } }, why: "Expiry alerts: lots expiring soon across the farm" }
  ]
});
var InventoryTransactionModel = defineCollection({
  model: "InventoryTransaction",
  collection: "inventory_transactions",
  domain: D4,
  ownership: "farm",
  appendOnly: true,
  description: "The stock ledger: receipts, issues, wastage, stock-count adjustments and reversals, each against one lot. quantityDelta is signed; valueMinor is the cost moved. Written automatically by purchases, feed use, daily records and manual issues.",
  fields: {
    itemId: ref("InventoryItem", { required: true }),
    lotId: ref("InventoryLot", { required: true }),
    type: enumOf(INVENTORY_TRANSACTION_TYPES, { required: true }),
    date: localDate({ required: true }),
    quantityDelta: num({ required: true, min: -1e9 }),
    valueMinor: int({ required: true, min: -1e12 }),
    currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
    flockId: ref("Flock"),
    houseId: ref("House"),
    sourceType: enumOf(["purchase", "feed_consumption", "manual", "stock_count", "vaccination", "health_record"], { required: true }),
    sourceId: { type: String },
    reason: str({ max: 300 }),
    reversalOf: ref("InventoryTransaction")
  },
  indexes: [
    { fields: { farmId: 1, itemId: 1, date: 1 }, why: "An item's movement history and ledger replay" },
    { fields: { farmId: 1, sourceId: 1 }, why: "Find the movements of a feed entry or purchase to reverse them" }
  ]
});

// src/adapters/mongo/models/health.ts
import { Schema as Schema6 } from "mongoose";
var D5 = "Health";
var Attachment = new Schema6({ assetId: ref("MediaAsset", { required: true }), name: str({ max: 200 }) }, { _id: false });
var MedicineModel = defineCollection({
  model: "Medicine",
  collection: "medicines",
  domain: D5,
  ownership: "farm",
  description: "The farm's catalog of vaccines and medicines with default withdrawal periods taken from the product label or the farm's veterinarian. PoultryPilot ships no country rules; stock lives in inventory_items.",
  fields: {
    name: str({ required: true, max: 120 }),
    type: enumOf(MEDICINE_TYPES, { required: true }),
    activeIngredient: str({ max: 200 }),
    manufacturer: str({ max: 120 }),
    defaultRoute: enumOf(ADMINISTRATION_ROUTES),
    doseUnit: enumOf(STOCK_UNITS),
    /** Days after the last dose before birds may be sold for meat, as on the label or set by the vet. */
    withdrawalMeatDays: int({ max: 365 }),
    /** Days after the last dose before eggs may be sold. */
    withdrawalEggDays: int({ max: 365 }),
    withdrawalSource: enumOf(WITHDRAWAL_SOURCES),
    prescriptionRequired: bool(false),
    label: { type: SourceSchema },
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Medicine picker (prefix); names unique within a farm" }]
});
var TreatmentSchema = new Schema6(
  {
    id: { type: String, required: true },
    medicineId: ref("Medicine"),
    /** Name at the time of treatment (kept if the catalog entry changes). */
    medicineName: str({ required: true, max: 120 }),
    inventoryItemId: ref("InventoryItem"),
    /** Quantity drawn from stock, in the inventory item's unit. */
    quantityUsed: num(),
    dose: str({ max: 120 }),
    route: enumOf(ADMINISTRATION_ROUTES),
    frequency: str({ max: 120 }),
    startDate: localDate({ required: true }),
    durationDays: int({ required: true, min: 1, max: 365 }),
    endDate: localDate({ required: true }),
    withdrawalMeatDays: int({ max: 365 }),
    withdrawalEggDays: int({ max: 365 }),
    withdrawalSource: enumOf(WITHDRAWAL_SOURCES),
    /** Derived: last day of each withdrawal period. Bird sales are refused through this date. */
    withdrawalMeatUntil: localDate(),
    withdrawalEggsUntil: localDate(),
    prescribedBy: str({ max: 120 }),
    prescriptionReference: str({ max: 80 }),
    /** Cost of the stock used (lots, FEFO). */
    stockCostMinor: int()
  },
  { _id: false }
);
var HealthRecordModel = defineCollection({
  model: "HealthRecord",
  collection: "health_records",
  domain: D5,
  ownership: "farm",
  description: "Farm health records: observations, veterinary visits, treatments, lab tests and post-mortems. Holds what people saw and what a named veterinarian, laboratory or staff member assessed; PoultryPilot never diagnoses or prescribes.",
  fields: {
    flockId: ref("Flock"),
    houseId: ref("House"),
    type: enumOf(HEALTH_RECORD_TYPES, { required: true }),
    date: localDate({ required: true }),
    title: str({ required: true, max: 200 }),
    /** Free-text symptom tags chosen by the farm (e.g. "watery droppings", "reduced feed intake"). */
    symptoms: { type: [str({ max: 60, lowercase: true })], default: void 0 },
    observedSigns: text(2e3),
    affectedBirds: int(),
    deadBirds: int(),
    vetName: str({ max: 120 }),
    vetUserId: ref("User"),
    /** Diagnosis or assessment as entered by the person named in `by`; never generated by the system. */
    assessment: {
      type: new Schema6({ text: text(2e3), by: str({ required: true, max: 120 }), source: enumOf(ASSESSMENT_SOURCES, { required: true }) }, { _id: false })
    },
    lab: { type: new Schema6({ name: str({ max: 120 }), reference: str({ max: 60 }), result: text(4e3) }, { _id: false }) },
    treatments: {
      type: [TreatmentSchema],
      default: void 0,
      validate: { validator: (v) => !v || v.length <= 5, message: "At most 5 treatments per record" }
    },
    /** Fees and other costs entered by hand (stock cost of treatments is in treatments[].stockCostMinor). */
    cost: money(),
    followUpDate: localDate(),
    followUpDone: bool(false),
    attachments: { type: [Attachment], default: void 0 },
    dailyRecordId: ref("DailyRecord")
  },
  indexes: [
    { fields: { farmId: 1, dailyRecordId: 1 }, options: { partialFilterExpression: { dailyRecordId: { $type: "string" } } }, why: "A day's own health observations (every day save and day view)" },
    { fields: { farmId: 1, flockId: 1, date: -1 }, why: "Flock health history; active withdrawal check before a sale" },
    { fields: { farmId: 1, date: -1 }, why: "Farm-wide health log for vets and managers" },
    { fields: { farmId: 1, followUpDone: 1, followUpDate: 1 }, options: { partialFilterExpression: { followUpDate: { $exists: true } } }, why: "Follow-ups due (reminders, alert job)" }
  ]
});
var VaccinationProgrammeModel = defineCollection({
  model: "VaccinationProgramme",
  collection: "vaccination_programmes",
  domain: D5,
  ownership: "farm",
  description: "A farm's own vaccination programme (from its veterinarian or hatchery), by bird age. Applying it to a flock creates scheduled vaccinations. No country programme is built in.",
  fields: {
    name: str({ required: true, max: 120 }),
    flockTypes: { type: [enumOf(FLOCK_TYPES)], default: void 0 },
    items: {
      type: [
        new Schema6(
          {
            dayOfAge: int({ required: true, max: 2e3 }),
            vaccineName: str({ required: true, max: 120 }),
            medicineId: ref("Medicine"),
            targetDisease: str({ max: 120 }),
            route: enumOf(ADMINISTRATION_ROUTES),
            notes: str({ max: 300 })
          },
          { _id: false }
        )
      ],
      required: true,
      validate: { validator: (v) => v.length >= 1 && v.length <= 60, message: "1 to 60 items" }
    },
    /** Who the programme came from, e.g. "Dr. Rao, district veterinary officer, 2026" or the hatchery's sheet. */
    source: str({ max: 300 }),
    active: bool(true)
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Programme list (prefix); names unique within a farm" }]
});
var VaccinationModel = defineCollection({
  model: "Vaccination",
  collection: "vaccinations",
  domain: D5,
  ownership: "farm",
  description: "A vaccination planned for a flock and, once given, how: batch numbers and expiry, doses used from stock, route, who gave it. Overdue = scheduled and past due (derived).",
  fields: {
    flockId: ref("Flock", { required: true }),
    programmeId: ref("VaccinationProgramme"),
    dayOfAge: int({ max: 2e3 }),
    medicineId: ref("Medicine"),
    vaccineName: str({ required: true, max: 120 }),
    targetDisease: str({ max: 120 }),
    status: enumOf(VACCINATION_STATUSES, { required: true, default: "scheduled" }),
    dueDate: localDate({ required: true }),
    administeredDate: localDate(),
    administeredBy: str({ max: 120 }),
    route: enumOf(ADMINISTRATION_ROUTES),
    birdsVaccinated: int(),
    inventoryItemId: ref("InventoryItem"),
    dosesUsed: num(),
    /** Vaccine batches used: from inventory lots (FEFO) or entered by hand. */
    batches: {
      type: [new Schema6({ lotId: ref("InventoryLot"), batchNumber: str({ max: 60 }), expiryDate: localDate(), doses: num() }, { _id: false })],
      default: void 0
    },
    stockCostMinor: int(),
    skipReason: text(500),
    notes: text(1e3)
  },
  indexes: [
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Upcoming and overdue vaccinations across the farm (calendar, reminder job)" },
    { fields: { farmId: 1, flockId: 1, dueDate: 1 }, why: "A flock's vaccination programme" }
  ]
});

// src/adapters/mongo/models/hatchery.ts
import { Schema as Schema8 } from "mongoose";

// src/adapters/mongo/models/biosecurity.ts
import { Schema as Schema7 } from "mongoose";
var D6 = "Biosecurity and equipment";
var ChecklistResultSchema = new Schema7(
  {
    templateId: ref("ChecklistTemplate", { required: true }),
    templateVersion: int({ required: true }),
    answers: {
      type: [new Schema7({ itemId: str({ required: true, max: 60 }), text: str({ required: true, max: 300 }), answer: { type: Schema7.Types.Mixed, required: true }, passed: { type: Boolean, required: true } }, { _id: false })],
      default: []
    },
    failedCount: int({ default: 0 })
  },
  { _id: false }
);
var ChecklistTemplateModel = defineCollection({
  model: "ChecklistTemplate",
  collection: "checklist_templates",
  domain: D6,
  ownership: "farm",
  description: "A farm's own checklist (visitor declaration, PPE, footbath, cleaning, disinfection, vehicle, pest control, audit). Items say which answer counts as a failure; failures create corrective actions. Editing bumps the version; records keep the version they used.",
  fields: {
    name: str({ required: true, max: 120 }),
    kind: enumOf(CHECKLIST_KINDS, { required: true }),
    items: {
      type: [
        new Schema7(
          {
            id: str({ required: true, max: 60 }),
            text: str({ required: true, max: 300 }),
            required: bool(true),
            responseType: enumOf(CHECKLIST_RESPONSE_TYPES, { required: true }),
            choices: { type: [str({ max: 60 })], default: void 0 },
            failIf: str({ max: 60 }),
            /** Raise a corrective action automatically when this item fails. */
            createActionOnFail: bool(true)
          },
          { _id: false }
        )
      ],
      required: true,
      validate: { validator: (v) => v.length >= 1 && v.length <= 60, message: "1 to 60 items" }
    },
    active: bool(true),
    /** Where the checklist came from (a veterinarian, a certification scheme, the farm itself). */
    source: str({ max: 300 })
  },
  indexes: [{ fields: { farmId: 1, kind: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Templates by kind for each form; names unique per kind" }]
});
var BiosecurityLogModel = defineCollection({
  model: "BiosecurityLog",
  collection: "biosecurity_logs",
  domain: D6,
  ownership: "farm",
  description: "Evidence that a biosecurity activity happened: cleaning, disinfection, footbath change or check, vehicle movement, pest control, wild bird observation, or an audit. Each type has its own section; any type can carry checklist answers.",
  fields: {
    type: enumOf(BIOSECURITY_ENTRY_TYPES, { required: true }),
    date: localDate({ required: true }),
    houseId: ref("House"),
    cleaningTaskId: ref("CleaningTask"),
    performedBy: str({ max: 120 }),
    /** Product used (disinfectant, rodenticide…). With an inventory item, stock moves automatically. */
    product: {
      type: new Schema7({ inventoryItemId: ref("InventoryItem"), name: str({ max: 120 }), quantityUsed: num(), concentration: str({ max: 60 }), stockCostMinor: int() }, { _id: false })
    },
    footbath: { type: new Schema7({ action: enumOf(["changed", "checked", "topped_up"], { required: true }), disinfectant: str({ max: 120 }), concentration: str({ max: 60 }) }, { _id: false }) },
    vehicle: {
      type: new Schema7(
        { registration: str({ required: true, max: 30 }), driver: str({ max: 120 }), company: str({ max: 120 }), purpose: str({ max: 200 }), disinfected: bool(false), entryAt: instant(), exitAt: instant(), lastPoultryContactAt: instant() },
        { _id: false }
      )
    },
    pest: {
      type: new Schema7({ pestType: enumOf(PEST_TYPES, { required: true }), method: str({ max: 120 }), stationsChecked: int(), activityFound: bool(false) }, { _id: false })
    },
    wildBird: {
      type: new Schema7(
        {
          description: str({ required: true, max: 200 }),
          count: int(),
          location: str({ max: 200 }),
          contactWithPoultry: bool(false),
          contactWithFeedOrWater: bool(false),
          deadWildBirdsFound: int()
        },
        { _id: false }
      )
    },
    checklist: { type: ChecklistResultSchema },
    attachments: { type: [new Schema7({ assetId: ref("MediaAsset", { required: true }), name: str({ max: 200 }) }, { _id: false })], default: void 0 },
    details: text(2e3)
  },
  indexes: [
    { fields: { farmId: 1, type: 1, date: -1 }, why: "Latest log of a type (biosecurity summary: last footbath check)" },
    { fields: { farmId: 1, date: -1 }, why: "Biosecurity log list and audits by period" }
  ]
});
var VisitorModel = defineCollection({
  model: "Visitor",
  collection: "visitors",
  domain: D6,
  ownership: "farm",
  description: "Visitor register: who entered, why, which houses, their declaration, last contact with other poultry and the downtime since, PPE and footbath use. Supports trace-back.",
  fields: {
    name: str({ required: true, max: 120 }),
    company: str({ max: 120 }),
    type: enumOf(VISITOR_TYPES, { required: true }),
    phone: str({ max: 30 }),
    purpose: str({ max: 200 }),
    vehicleRegistration: str({ max: 30 }),
    housesVisited: refs("House"),
    previousPoultryContact: {
      type: new Schema7({ hadContact: { type: Boolean, required: true }, lastContactAt: instant(), description: str({ max: 300 }) }, { _id: false })
    },
    /** Derived: hours from last poultry contact to check-in. */
    downtimeHours: num({ max: 1e5 }),
    /** The farm's own required downtime at the time of the visit (none = not checked). */
    requiredDowntimeHours: num({ max: 1e4 }),
    declaration: {
      type: new Schema7({ declaredName: str({ required: true, max: 120 }), declaredAt: instant({ required: true }), signatureAssetId: ref("MediaAsset"), checklist: { type: ChecklistResultSchema } }, { _id: false })
    },
    ppeUsed: { type: [str({ max: 60 })], default: void 0 },
    footbathUsed: bool(false),
    disinfected: bool(false),
    flags: { type: [enumOf(["downtime_short", "declaration_failed"])], default: void 0 },
    checkInAt: instant({ required: true }),
    checkOutAt: instant(),
    hostUserId: ref("User"),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, checkInAt: -1 }, why: "Visitor register by date; trace-back of who visited in a period" }]
});
var CleaningTaskModel = defineCollection({
  model: "CleaningTask",
  collection: "cleaning_tasks",
  domain: D6,
  ownership: "farm",
  description: "A recurring cleaning or disinfection routine, optionally with a checklist template. Completing it writes a biosecurity_log (with the checklist answers) and moves nextDueDate.",
  fields: {
    title: str({ required: true, max: 200 }),
    activity: enumOf(["cleaning", "disinfection"], { required: true, default: "cleaning" }),
    schedule: enumOf(CLEANING_SCHEDULES, { required: true }),
    houseIds: refs("House"),
    checklistTemplateId: ref("ChecklistTemplate"),
    assigneeUserId: ref("User"),
    nextDueDate: localDate(),
    lastDoneDate: localDate(),
    active: bool(true),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, active: 1, nextDueDate: 1 }, why: "Due and overdue cleaning (calendar, reminders)" }]
});
var EquipmentModel = defineCollection({
  model: "Equipment",
  collection: "equipment",
  domain: D6,
  ownership: "farm",
  description: "Assets: incubators, feeders, heaters, generators, scales, vehicles. Location is the house it is currently in.",
  fields: {
    name: str({ required: true, max: 120 }),
    type: enumOf(EQUIPMENT_TYPES, { required: true }),
    serialNumber: str({ max: 80 }),
    houseId: ref("House"),
    status: enumOf(EQUIPMENT_STATUSES, { required: true, default: "in_service" }),
    purchaseDate: localDate(),
    purchaseCost: money(),
    nextMaintenanceDate: localDate(),
    capacity: int(),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, status: 1, nextMaintenanceDate: 1 }, why: "Equipment list by status; maintenance due" }]
});
var EquipmentMovementModel = defineCollection({
  model: "EquipmentMovement",
  collection: "equipment_movements",
  domain: D6,
  ownership: "farm",
  appendOnly: true,
  description: "Equipment moving between houses or off the farm, with whether it was disinfected (a common disease route).",
  fields: {
    equipmentId: ref("Equipment", { required: true }),
    date: localDate({ required: true }),
    fromHouseId: ref("House"),
    toHouseId: ref("House"),
    offFarmDestination: str({ max: 200 }),
    disinfected: bool(false),
    movedBy: str({ max: 120 }),
    reversalOf: ref("EquipmentMovement"),
    note: text(500)
  },
  indexes: [{ fields: { farmId: 1, equipmentId: 1, date: -1 }, why: "Movement history of one item (trace-back)" }]
});

// src/adapters/mongo/models/hatchery.ts
var D7 = "Hatchery";
var CountsSchema = new Schema8(
  { infertile: int(), cracked: int(), deadEmbryo: int(), hatched: int(), deadInShell: int(), saleable: int(), culled: int() },
  { _id: false }
);
var HatcheryBatchModel = defineCollection({
  model: "HatcheryBatch",
  collection: "hatchery_batches",
  domain: D7,
  ownership: "farm",
  description: "Eggs selected and set together. Holds the egg source, selection rejects and setting details; counts and rates are derived from hatchery_events. Grading creates a chick lot.",
  fields: {
    code: str({ required: true, max: 40 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    breed: str({ max: 120 }),
    eggSource: enumOf(["own_flock", "purchased"], { required: true }),
    sourceFlockId: ref("Flock"),
    /** Own-flock eggs are drawn from egg stock (this grade, or ungraded). */
    eggGrade: enumOf(EGG_GRADES),
    supplier: str({ max: 120 }),
    eggsReceived: int({ required: true, min: 1 }),
    /** Eggs not set at selection, by reason. */
    rejects: { type: Map, of: { type: Number, min: 0 }, default: void 0 },
    eggsSet: int({ required: true, min: 1 }),
    incubatorId: ref("Equipment"),
    hatcherId: ref("Equipment"),
    setDate: localDate({ required: true }),
    incubationDays: int({ required: true, min: 10, max: 40 }),
    expectedTransferDate: localDate({ required: true }),
    expectedHatchDate: localDate({ required: true }),
    status: enumOf(HATCHERY_BATCH_STATUSES, { required: true, default: "incubating" }),
    /** Derived from hatchery_events in the same transaction as each event. */
    results: {
      type: new Schema8(
        {
          infertile: int(),
          cracked: int(),
          deadEmbryo: int(),
          transferred: int(),
          hatched: int(),
          deadInShell: int(),
          culled: int(),
          saleable: int(),
          inIncubation: int(),
          fertilityPercent: num({ max: 100 }),
          hatchabilityPercent: num({ max: 100 }),
          saleableChickPercent: num({ max: 100 }),
          lossPercent: num({ max: 100 })
        },
        { _id: false }
      )
    },
    eggCost: money(),
    otherCost: money(),
    chickLotId: ref("ChickLot"),
    cancelledReason: str({ max: 300 }),
    notes: text(1e3)
  },
  indexes: [
    { fields: { farmId: 1, status: 1, expectedHatchDate: 1 }, why: "Incubating batches and hatches due (dashboard, calendar)" },
    { fields: { farmId: 1, code: 1 }, options: { unique: true, ...LIVE }, why: "Batch codes unique within a farm; lookup by code from egg trays" }
  ]
});
var HatcheryEventModel = defineCollection({
  model: "HatcheryEvent",
  collection: "hatchery_events",
  domain: D7,
  ownership: "farm",
  appendOnly: true,
  description: "The hatchery ledger: setting, candling, transfer to the hatcher, hatch, chick grading, machine readings and notes. Counts move only through these; a reversal cancels the latest counted event.",
  fields: {
    batchId: ref("HatcheryBatch", { required: true }),
    type: enumOf(HATCHERY_EVENT_TYPES, { required: true }),
    date: localDate({ required: true }),
    counts: { type: CountsSchema },
    machine: enumOf(["setter", "hatcher"]),
    temperatureC: num({ min: 0, max: 50 }),
    humidityPercent: num({ max: 100 }),
    chickLotId: ref("ChickLot"),
    reversalOf: ref("HatcheryEvent"),
    note: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, batchId: 1, date: 1 }, why: "Timeline of one batch" }]
});
var ChickLotModel = defineCollection({
  model: "ChickLot",
  collection: "chicks",
  domain: D7,
  ownership: "farm",
  description: "A lot of day-old chicks available to place or sell, from the farm's hatchery or bought in. Placements (flock_events) and chick sales (orders) draw it down.",
  fields: {
    source: enumOf(CHICK_SOURCES, { required: true }),
    hatcheryBatchId: ref("HatcheryBatch"),
    supplier: str({ max: 120 }),
    species: enumOf(SPECIES, { required: true, default: "chicken" }),
    breed: str({ max: 120 }),
    hatchDate: localDate({ required: true }),
    quantity: int({ required: true, min: 1 }),
    /** Derived: quantity minus placements and sales, updated in the same transaction as each draw-down. */
    remaining: int({ required: true }),
    status: enumOf(CHICK_LOT_STATUSES, { required: true, default: "available" }),
    vaccinationsAtHatch: { type: [str({ max: 120 })], default: void 0 },
    placedFlockIds: refs("Flock"),
    unitCost: money(),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, status: 1, hatchDate: -1 }, why: "Available chick lots for placement or sale" }]
});
var BroodingProfileModel = defineCollection({
  model: "BroodingProfile",
  collection: "brooding_profiles",
  domain: "ChickStart",
  ownership: "farm",
  description: "The farm's brooding targets by day of age (temperature at chick level, humidity, target weight), taken from its breed guide or veterinarian. Brooder checks are compared with it. No targets are built in.",
  fields: {
    name: str({ required: true, max: 120 }),
    flockTypes: { type: [enumOf(FLOCK_TYPES)], default: void 0 },
    bands: {
      type: [
        new Schema8(
          { fromDay: int({ required: true, max: 120 }), toDay: int({ required: true, max: 120 }), tempMinC: num({ min: 0, max: 45 }), tempMaxC: num({ min: 0, max: 45 }), humidityMin: num({ max: 100 }), humidityMax: num({ max: 100 }), targetWeightG: num({ max: 1e4 }) },
          { _id: false }
        )
      ],
      required: true,
      validate: { validator: (v) => v.length >= 1 && v.length <= 60, message: "1 to 60 bands" }
    },
    /** Where the targets come from, e.g. "Cobb 500 broiler management guide, 2024". */
    source: str({ max: 300 }),
    isDefault: bool(false)
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Profile list (prefix); names unique within a farm" }]
});
var ChickArrivalModel = defineCollection({
  model: "ChickArrival",
  collection: "chick_arrivals",
  domain: "ChickStart",
  ownership: "farm",
  description: "A planned delivery of chicks into a house: preparation checklist, then the arrival itself (count, dead on arrival, chick weight and quality). Arrival places the chicks into a flock.",
  fields: {
    houseId: ref("House", { required: true }),
    expectedDate: localDate({ required: true }),
    expectedCount: int({ required: true, min: 1 }),
    source: enumOf(["own_hatchery", "chick_lot", "supplier"], { required: true }),
    hatcheryBatchId: ref("HatcheryBatch"),
    chickLotId: ref("ChickLot"),
    supplier: str({ max: 120 }),
    flockType: enumOf(FLOCK_TYPES, { required: true }),
    breed: str({ max: 120 }),
    broodingProfileId: ref("BroodingProfile"),
    status: enumOf(ARRIVAL_STATUSES, { required: true, default: "planned" }),
    preparation: {
      type: new Schema8({ checklist: { type: ChecklistResultSchema, required: true }, completedAt: instant({ required: true }), completedBy: ref("User") }, { _id: false })
    },
    arrival: {
      type: new Schema8(
        {
          arrivedAt: instant({ required: true }),
          received: int({ required: true, min: 1 }),
          deadOnArrival: int({ default: 0 }),
          averageWeightG: num({ max: 200 }),
          sampleSize: int(),
          qualityNotes: str({ max: 500 }),
          checklist: { type: ChecklistResultSchema }
        },
        { _id: false }
      )
    },
    flockId: ref("Flock"),
    cancelledReason: str({ max: 300 }),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, status: 1, expectedDate: 1 }, why: "Upcoming arrivals (calendar, preparation reminders)" }]
});
var BrooderCheckModel = defineCollection({
  model: "BrooderCheck",
  collection: "brooder_checks",
  domain: "ChickStart",
  ownership: "farm",
  description: "A check of young chicks: temperature at chick level, humidity, behaviour, feed and water, crop fill, with optional checklist answers. Flags come from the farm's brooding profile for that day of age.",
  fields: {
    flockId: ref("Flock", { required: true }),
    houseId: ref("House"),
    checkedAt: instant({ required: true }),
    date: localDate({ required: true }),
    dayOfAge: int({ required: true, max: 2e3 }),
    temperatureC: num({ min: -10, max: 60 }),
    humidityPercent: num({ max: 100 }),
    behaviour: enumOf(BROODER_BEHAVIOURS),
    feedAvailable: { type: Boolean },
    waterAvailable: { type: Boolean },
    /** Of chicks sampled, how many had full crops (checked in the first days). */
    cropFill: { type: new Schema8({ sampled: int({ required: true, min: 1 }), full: int({ required: true }) }, { _id: false }) },
    checklist: { type: ChecklistResultSchema },
    flags: { type: [enumOf(["temperature_low", "temperature_high", "humidity_low", "humidity_high", "behaviour", "no_feed", "no_water"])], default: void 0 },
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, flockId: 1, checkedAt: -1 }, why: "A flock's brooder checks, newest first (brooding view)" }]
});

// src/adapters/mongo/models/finance.ts
import { Schema as Schema9 } from "mongoose";
var D8 = "Money";
var TaxSchema = new Schema9(
  { label: str({ max: 30 }), ratePercent: num({ required: true, max: 100 }), inclusive: { type: Boolean, required: true }, amountMinor: int({ required: true }) },
  { _id: false }
);
var Attachments = { type: [new Schema9({ assetId: ref("MediaAsset", { required: true }), name: str({ max: 200 }) }, { _id: false })], default: void 0 };
var SupplierModel = defineCollection({
  model: "Supplier",
  collection: "suppliers",
  domain: D8,
  ownership: "farm",
  description: "The farm's suppliers (feed mills, hatcheries, vets, utilities). Linked from bills, purchases and payments.",
  fields: {
    name: str({ required: true, max: 120 }),
    phone: str({ max: 30 }),
    email: str({ max: 254, lowercase: true }),
    taxId: str({ max: 40 }),
    address: str({ max: 300 }),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, why: "Supplier list by name and name search" }]
});
var MoneyAccountModel = defineCollection({
  model: "MoneyAccount",
  collection: "money_accounts",
  domain: D8,
  ownership: "farm",
  description: "Where the farm keeps money: cash box, bank account, mobile money wallet. Balance = opening balance + its ledger entries.",
  fields: {
    name: str({ required: true, max: 80 }),
    type: enumOf(MONEY_ACCOUNT_TYPES, { required: true }),
    openingBalance: money({ required: true }),
    openingDate: localDate({ required: true }),
    active: bool(true),
    notes: text(500)
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Account list (prefix); names unique within a farm" }]
});
var ExpenseModel = defineCollection({
  model: "Expense",
  collection: "expenses",
  domain: D8,
  ownership: "farm",
  description: "A bill: an expense or a purchase the farm owes. Unpaid bills are payables; payments are ledger entries in `transactions`. Purchases of stock and vet fees are created automatically by FeedWise and FlockHealth.",
  fields: {
    kind: enumOf(EXPENSE_KINDS, { required: true, default: "expense" }),
    date: localDate({ required: true }),
    dueDate: localDate(),
    category: enumOf(EXPENSE_CATEGORIES, { required: true }),
    description: str({ required: true, max: 300 }),
    supplierId: ref("Supplier"),
    vendor: str({ max: 120 }),
    /** Gross amount owed (including tax). */
    amount: money({ required: true }),
    /** Amount excluding tax. */
    net: money({ required: true }),
    tax: { type: TaxSchema },
    /** Derived: payments minus refunds posted against this bill. */
    amountPaid: money({ required: true }),
    status: enumOf(EXPENSE_STATUSES, { required: true, default: "unpaid" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    recurringExpenseId: ref("RecurringExpense"),
    sourceType: enumOf(DOCUMENT_SOURCES, { required: true, default: "manual" }),
    sourceId: { type: String },
    invoiceNumber: str({ max: 60 }),
    attachments: Attachments,
    notes: text(1e3)
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { partialFilterExpression: { flockId: { $type: "string" } } }, why: "Costs charged to a flock (flock metrics and profitability)" },
    { fields: { farmId: 1, date: -1 }, why: "Expense list, P&L and breakdowns by period" },
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Payables: unpaid and overdue bills" },
    { fields: { farmId: 1, recurringExpenseId: 1, dueDate: 1 }, options: { unique: true, partialFilterExpression: { recurringExpenseId: { $exists: true } } }, why: "Bill generation is idempotent: one bill per recurring expense per due date" },
    { fields: { farmId: 1, sourceId: 1 }, options: { partialFilterExpression: { sourceId: { $exists: true } } }, why: "The bill created from a purchase lot or health record" }
  ],
  relations: [{ field: "sourceId", to: "InventoryLot | HealthRecord", cardinality: "one-to-one", note: "Polymorphic by sourceType" }]
});
var IncomeModel = defineCollection({
  model: "Income",
  collection: "incomes",
  domain: D8,
  ownership: "farm",
  description: "A sale or other income the farm is owed. Unpaid incomes are receivables. Bird sales, chick orders and marketplace orders create them automatically.",
  fields: {
    kind: enumOf(INCOME_KINDS, { required: true, default: "sale" }),
    date: localDate({ required: true }),
    dueDate: localDate(),
    category: enumOf(INCOME_CATEGORIES, { required: true }),
    description: str({ required: true, max: 300 }),
    buyerId: ref("Buyer"),
    customerName: str({ max: 120 }),
    amount: money({ required: true }),
    net: money({ required: true }),
    tax: { type: TaxSchema },
    amountPaid: money({ required: true }),
    status: enumOf(EXPENSE_STATUSES, { required: true, default: "unpaid" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    sourceType: enumOf(DOCUMENT_SOURCES, { required: true, default: "manual" }),
    sourceId: { type: String },
    invoiceNumber: str({ max: 60 }),
    attachments: Attachments,
    notes: text(1e3)
  },
  indexes: [
    { fields: { farmId: 1, flockId: 1, date: 1 }, options: { partialFilterExpression: { flockId: { $type: "string" } } }, why: "Income from a flock (flock metrics and profitability)" },
    { fields: { farmId: 1, date: -1 }, why: "Income list, P&L and breakdowns by period" },
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Receivables: unpaid and overdue incomes" },
    { fields: { farmId: 1, sourceId: 1 }, options: { partialFilterExpression: { sourceId: { $exists: true } } }, why: "The income created from a sale event or order" }
  ],
  relations: [{ field: "sourceId", to: "FlockEvent | Order", cardinality: "one-to-one", note: "Polymorphic by sourceType" }]
});
var RecurringExpenseModel = defineCollection({
  model: "RecurringExpense",
  collection: "recurring_expenses",
  domain: D8,
  ownership: "farm",
  description: "A repeating bill (electricity, wages, rent). The scheduler creates an expense on each due date; pauses stop that.",
  fields: {
    name: str({ required: true, max: 120 }),
    category: enumOf(EXPENSE_CATEGORIES, { required: true }),
    supplierId: ref("Supplier"),
    vendor: str({ max: 120 }),
    amount: money({ required: true }),
    tax: { type: TaxSchema },
    frequency: enumOf(RECURRING_FREQUENCIES, { required: true }),
    startDate: localDate({ required: true }),
    endDate: localDate(),
    pauses: { type: [new Schema9({ from: localDate({ required: true }), to: localDate() }, { _id: false })], default: [] },
    nextDueDate: localDate(),
    active: bool(true),
    flockId: ref("Flock"),
    houseId: ref("House"),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, active: 1, nextDueDate: 1 }, why: "Scheduler finds bills due; running-costs list" }]
});
var TransactionModel = defineCollection({
  model: "Transaction",
  collection: "transactions",
  domain: D8,
  ownership: "farm",
  appendOnly: true,
  description: "The cash ledger: money in or out of one of the farm's accounts. Payments and refunds against bills and incomes, transfers between accounts (a pair sharing transferGroupId) and opening balances. Cash flow is built from it. Corrections are reversal entries.",
  fields: {
    date: localDate({ required: true }),
    kind: enumOf(TRANSACTION_KINDS, { required: true }),
    direction: enumOf(CASH_DIRECTIONS, { required: true }),
    accountId: ref("MoneyAccount", { required: true }),
    amount: money({ required: true }),
    category: enumOf(LEDGER_CATEGORIES),
    documentType: enumOf(["expense", "income"]),
    documentId: { type: String },
    orderId: ref("Order"),
    transferGroupId: { type: String },
    counterpartAccountId: ref("MoneyAccount"),
    supplierId: ref("Supplier"),
    buyerId: ref("Buyer"),
    flockId: ref("Flock"),
    houseId: ref("House"),
    paymentMethod: enumOf(PAYMENT_METHODS),
    reference: str({ max: 80 }),
    description: str({ max: 300 }),
    attachments: Attachments,
    reversalOf: ref("Transaction")
  },
  indexes: [
    { fields: { farmId: 1, date: 1 }, why: "Cash flow for a period" },
    { fields: { farmId: 1, accountId: 1, date: 1 }, why: "Account balances and statements" },
    { fields: { farmId: 1, documentId: 1 }, options: { partialFilterExpression: { documentId: { $exists: true } } }, why: "Payments and refunds of one bill or income" }
  ],
  relations: [{ field: "documentId", to: "Expense | Income", cardinality: "many-to-one", note: "Polymorphic by documentType" }]
});

// src/adapters/mongo/models/market.ts
import { Schema as Schema10 } from "mongoose";
var D9 = "Market";
var BuyerModel = defineCollection({
  model: "Buyer",
  collection: "buyers",
  domain: D9,
  ownership: "farm",
  description: "The farm's own customer book. A buyer may also be another PoultryPilot farm (linkedFarmId).",
  fields: {
    name: str({ required: true, max: 120 }),
    type: enumOf(["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"], { required: true, default: "other" }),
    phone: str({ max: 30 }),
    email: str({ max: 254, lowercase: true }),
    locationLabel: str({ max: 200 }),
    linkedFarmId: ref("Farm"),
    notes: text(1e3)
  },
  indexes: [{ fields: { farmId: 1, name: 1 }, why: "Buyer list sorted by name and name search" }]
});
var MarketListingModel = defineCollection({
  model: "MarketListing",
  collection: "market_listings",
  domain: D9,
  ownership: "farm",
  description: "Something a farm offers on the marketplace. quantityAvailable is what is not yet reserved by accepted orders. Seller contact details are never in a listing; a buyer sees them once the seller accepts the order. An optional stock source makes delivery move stock automatically.",
  fields: {
    title: str({ required: true, max: 150 }),
    category: enumOf(LISTING_CATEGORIES, { required: true }),
    product: enumOf(MARKET_PRODUCTS),
    description: text(2e3),
    /** Unreserved quantity, in `unit`. Decreases when an order is accepted, increases if it is cancelled. */
    quantityAvailable: num({ required: true }),
    minOrderQuantity: num(),
    unit: str({ required: true, max: 20 }),
    /** Price per `unit`, set by the seller. Orders always use this price. */
    price: money({ required: true }),
    priceUnit: enumOf(PRICE_UNITS, { required: true }),
    regionCode: { type: String, required: true, match: /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/ },
    locationLabel: str({ max: 200 }),
    location: { type: GeoJsonPointSchema },
    availableFrom: localDate(),
    availableUntil: localDate(),
    fulfilmentOptions: { type: [enumOf(FULFILMENT_METHODS)], required: true, validate: { validator: (v) => v.length >= 1, message: "At least one fulfilment option" } },
    status: enumOf(LISTING_STATUSES, { required: true, default: "draft" }),
    photos: { type: [ref("MediaAsset")], default: void 0 },
    source: {
      type: new Schema10({ kind: enumOf(["eggs", "chick_lot", "flock"], { required: true }), eggGrade: enumOf(EGG_GRADES), chickLotId: ref("ChickLot"), flockId: ref("Flock") }, { _id: false })
    }
  },
  indexes: [
    { fields: { farmId: 1, status: 1 }, why: "Seller's own listings" },
    { fields: { status: 1, category: 1, createdAt: -1 }, why: "Marketplace browse by category, newest first (cross-farm read)" },
    { fields: { location: "2dsphere", status: 1 }, why: "Marketplace near me: active listings within a distance (cross-farm read)" }
  ],
  notes: ["Browse queries span farms by design and use setOptions({ crossFarm: true }); they only ever return listings with status active."]
});
var OrderLineSchema = new Schema10(
  {
    category: enumOf(LISTING_CATEGORIES, { required: true }),
    description: str({ required: true, max: 200 }),
    flockId: ref("Flock"),
    chickLotId: ref("ChickLot"),
    eggGrade: enumOf(EGG_GRADES),
    quantity: num({ required: true, min: 1e-3 }),
    unit: str({ required: true, max: 20 }),
    unitPrice: money({ required: true }),
    total: money({ required: true })
  },
  { _id: false }
);
var OrderModel = defineCollection({
  model: "Order",
  collection: "orders",
  domain: D9,
  ownership: "farm",
  description: "A sale by the farm (farmId = seller), recorded directly or placed by a marketplace buyer. Prices come from the server, never the buyer. Delivery posts egg/bird/chick stock movements.",
  fields: {
    orderNumber: int({ required: true, min: 1 }),
    channel: enumOf(ORDER_CHANNELS, { required: true }),
    buyerId: ref("Buyer"),
    buyerUserId: ref("User"),
    buyerFarmId: ref("Farm"),
    listingId: ref("MarketListing"),
    /** A booking against a hatch not yet graded; delivery draws from that batch's chick lot. */
    hatcheryBatchId: ref("HatcheryBatch"),
    /** Marketplace buyer details, shared with the seller when the order is placed. */
    buyerName: str({ max: 120 }),
    buyerPhone: str({ max: 30 }),
    fulfilment: enumOf(FULFILMENT_METHODS, { required: true, default: "pickup" }),
    delivery: {
      type: new Schema10(
        {
          address: str({ max: 300 }),
          expectedDate: localDate(),
          vehicle: str({ max: 60 }),
          driver: str({ max: 120 }),
          trackingReference: str({ max: 80 }),
          dispatchedAt: instant(),
          deliveredAt: instant(),
          receivedBy: str({ max: 120 }),
          proofAssetId: ref("MediaAsset")
        },
        { _id: false }
      )
    },
    /** The receivable created when the order is accepted. */
    incomeId: ref("Income"),
    cancelReason: str({ max: 300 }),
    cancelledBy: enumOf(["seller", "buyer"]),
    lines: {
      type: [OrderLineSchema],
      required: true,
      validate: { validator: (v) => v.length >= 1 && v.length <= 50, message: "1 to 50 lines" }
    },
    subtotal: money({ required: true }),
    discount: money(),
    total: money({ required: true }),
    status: enumOf(ORDER_STATUSES, { required: true, default: "pending" }),
    statusHistory: {
      type: [new Schema10({ status: enumOf(ORDER_STATUSES, { required: true }), at: instant({ required: true }), by: ref("User") }, { _id: false })],
      default: []
    },
    paymentStatus: enumOf(ORDER_PAYMENT_STATUSES, { required: true, default: "unpaid" }),
    /** Derived: sum of order_payments, updated in the same transaction as each payment. */
    amountPaid: money(),
    requestedDeliveryDate: localDate(),
    deliveredDate: localDate(),
    deliveryAddress: str({ max: 300 }),
    notes: text(1e3)
  },
  indexes: [
    { fields: { farmId: 1, hatcheryBatchId: 1 }, options: { partialFilterExpression: { hatcheryBatchId: { $type: "string" } } }, why: "Chicks booked against a hatchery batch" },
    { fields: { farmId: 1, orderNumber: 1 }, options: { unique: true }, why: "Order numbers unique per seller farm; lookup by number" },
    { fields: { farmId: 1, status: 1, createdAt: -1 }, why: "Seller's order board by status" },
    { fields: { farmId: 1, buyerId: 1, createdAt: -1 }, why: "A buyer's order history and outstanding balance" },
    {
      fields: { buyerUserId: 1, createdAt: -1 },
      options: { partialFilterExpression: { buyerUserId: { $exists: true } } },
      why: "Marketplace buyer's purchases across sellers (cross-farm read)"
    }
  ],
  notes: ["Lines and status history are embedded: always read with the order and bounded in size."]
});
var OrderPaymentModel = defineCollection({
  model: "OrderPayment",
  collection: "order_payments",
  domain: D9,
  ownership: "farm",
  appendOnly: true,
  description: "Money received against an order (or refunded). Posts an income transaction; overpayment is refused unless recorded as credit.",
  fields: {
    orderId: ref("Order", { required: true }),
    kind: enumOf(["payment", "refund"], { required: true, default: "payment" }),
    date: localDate({ required: true }),
    amount: money({ required: true }),
    method: enumOf(PAYMENT_METHODS, { required: true }),
    reference: str({ max: 80 }),
    transactionId: ref("Transaction"),
    reversalOf: ref("OrderPayment"),
    accountId: ref("MoneyAccount"),
    note: text(500)
  },
  indexes: [{ fields: { farmId: 1, orderId: 1, date: 1 }, why: "Payments of one order (balance, receipt)" }]
});
var MarketPriceModel = defineCollection({
  model: "MarketPrice",
  collection: "market_prices",
  domain: D9,
  ownership: "global",
  description: "Reference prices by region, product and date from a named source (fetched behind the API). Shared by all farms.",
  fields: {
    product: enumOf(MARKET_PRODUCTS, { required: true }),
    countryCode: { type: String, required: true, match: /^[A-Z]{2}$/ },
    regionKey: str({ required: true, max: 80 }),
    date: localDate({ required: true }),
    price: money({ required: true }),
    priceMin: money(),
    priceMax: money(),
    unit: enumOf(PRICE_UNITS, { required: true }),
    source: { type: SourceSchema, required: true }
  },
  indexes: [
    {
      fields: { countryCode: 1, regionKey: 1, product: 1, date: -1, "source.name": 1 },
      options: { unique: true },
      why: "Latest prices for a region and product; one price per source per day (import is idempotent)"
    }
  ]
});

// src/adapters/mongo/models/operations.ts
import { Schema as Schema11 } from "mongoose";
var D10 = "Operations";
var TaskModel = defineCollection({
  model: "Task",
  collection: "tasks",
  domain: D10,
  ownership: "farm",
  description: "A piece of work assigned to someone on the farm, optionally linked to a flock, house or other record.",
  fields: {
    kind: enumOf(TASK_KINDS, { required: true, default: "general" }),
    title: str({ required: true, max: 200 }),
    description: text(2e3),
    assigneeUserId: ref("User"),
    dueDate: localDate(),
    status: enumOf(TASK_STATUSES, { required: true, default: "open" }),
    priority: enumOf(TASK_PRIORITIES, { required: true, default: "normal" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    related: { type: new Schema11({ entity: str({ required: true, max: 40 }), id: { type: String, required: true } }, { _id: false }) },
    completedAt: instant(),
    completedBy: ref("User"),
    resolutionNotes: text(2e3),
    verifiedAt: instant(),
    verifiedBy: ref("User")
  },
  indexes: [
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Farm task board by status and due date" },
    { fields: { farmId: 1, assigneeUserId: 1, status: 1, dueDate: 1 }, why: "My tasks (worker home screen)" }
  ],
  relations: [{ field: "related.id", to: "any farm record", cardinality: "many-to-one", note: "Polymorphic by related.entity" }]
});
var AlertRuleModel = defineCollection({
  model: "AlertRule",
  collection: "alert_rules",
  domain: D10,
  ownership: "farm",
  description: "A farm's settings for one rule from the catalog (mortality, egg production, feed, water, weight, FCR, stock, expiry, vaccination, vet appointment, hatch, delivery, payment, weather): on or off, parameters, scope, severity, who is told and how. Absent = catalog defaults, which compare with the farm's own history.",
  fields: {
    ruleKey: enumOf(RULE_KEYS, { required: true }),
    enabled: bool(true),
    parameters: { type: Map, of: Number, default: void 0 },
    flockIds: refs("Flock"),
    houseIds: refs("House"),
    severity: enumOf(ALERT_SEVERITIES),
    notifyRoles: { type: [enumOf(ROLES)], default: void 0 },
    channels: { type: [enumOf(NOTIFICATION_CHANNELS)], default: void 0 },
    cooldownHours: int({ default: 24, max: 720 })
  },
  indexes: [{ fields: { farmId: 1, ruleKey: 1 }, options: { unique: true }, why: "Load a farm's rule settings; one per rule per farm" }]
});
var AlertModel = defineCollection({
  model: "Alert",
  collection: "alerts",
  domain: D10,
  ownership: "farm",
  actor: "optional",
  // created by the alert job (createdBy "system")
  description: "Something that needs attention, raised by the server-side alert job. States facts (never a diagnosis). Deduplicated by dedupKey.",
  fields: {
    ruleType: enumOf(ALERT_RULE_TYPES, { required: true }),
    severity: enumOf(ALERT_SEVERITIES, { required: true }),
    status: enumOf(ALERT_STATUSES, { required: true, default: "open" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    date: localDate({ required: true }),
    title: str({ required: true, max: 200 }),
    message: text(2e3),
    values: { type: Map, of: Number, default: void 0 },
    dedupKey: str({ required: true, max: 200 }),
    acknowledgedBy: ref("User"),
    acknowledgedAt: instant(),
    resolvedAt: instant()
  },
  indexes: [
    { fields: { farmId: 1, dedupKey: 1 }, options: { unique: true }, why: "The alert job is idempotent: an alert is raised once per rule, flock and day" },
    { fields: { farmId: 1, status: 1, createdAt: -1 }, why: "Open alerts badge and alert list" }
  ]
});
var NotificationModel = defineCollection({
  model: "Notification",
  collection: "notifications",
  domain: D10,
  ownership: "user",
  actor: "none",
  description: "A message to one person on one channel (in-app, push, email) with delivery state. Push and email are queued and sent by the delivery worker through replaceable providers, with retries. Kept 180 days.",
  fields: {
    userId: ref("User", { required: true }),
    farmId: ref("Farm"),
    channel: enumOf(NOTIFICATION_CHANNELS, { required: true }),
    status: enumOf(NOTIFICATION_STATUSES, { required: true, default: "queued" }),
    title: str({ required: true, max: 200 }),
    body: text(2e3),
    link: { type: new Schema11({ entity: str({ max: 40 }), id: { type: String }, path: str({ max: 300 }) }, { _id: false }) },
    alertId: ref("Alert"),
    ruleKey: enumOf(RULE_KEYS),
    category: enumOf(NOTIFICATION_CATEGORIES),
    dedupeKey: str({ max: 300, trim: false }),
    sentTokens: { type: [str({ max: 4096, trim: false })], default: void 0 },
    severity: enumOf(ALERT_SEVERITIES),
    sentAt: instant(),
    deliveredAt: instant(),
    readAt: instant(),
    attempts: int({ default: 0, max: 20 }),
    nextAttemptAt: instant(),
    providerMessageId: str({ max: 200 }),
    error: str({ max: 500 })
  },
  indexes: [
    { fields: { userId: 1, createdAt: -1 }, why: "A person's notification inbox, newest first; unread count" },
    { fields: { status: 1, nextAttemptAt: 1 }, options: { partialFilterExpression: { status: "queued" } }, why: "Delivery queue: queued push and email notifications due for an attempt" },
    { fields: { createdAt: 1 }, options: { expireAfterSeconds: 180 * 86400 }, why: "TTL: delete notifications after 180 days" },
    { fields: { dedupeKey: 1 }, options: { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }, why: "No duplicates: one notification per person, channel and event" }
  ]
});
var PushDeviceModel = defineCollection({
  model: "PushDevice",
  collection: "push_devices",
  domain: D10,
  ownership: "user",
  description: "A phone or browser registered for push notifications. Tokens the provider reports as invalid are disabled.",
  fields: {
    userId: ref("User", { required: true }),
    platform: enumOf(PUSH_PLATFORMS, { required: true }),
    token: str({ required: true, max: 4096, trim: false }),
    deviceName: str({ max: 100 }),
    lastSeenAt: instant({ required: true }),
    disabledAt: instant()
  },
  indexes: [
    { fields: { token: 1 }, options: { unique: true }, why: "One registration per token (re-registering moves it to the signed-in user)" },
    { fields: { userId: 1 }, why: "A person's devices when sending a push" }
  ]
});
var NotificationPreferenceModel = defineCollection({
  model: "NotificationPreference",
  collection: "notification_preferences",
  domain: D10,
  ownership: "user",
  description: "How a person wants to be told: push and email on or off, the lowest severity for each, and rules they have muted. In-app notifications are always kept.",
  fields: {
    userId: ref("User", { required: true }),
    pushEnabled: bool(true),
    emailEnabled: bool(true),
    pushMinSeverity: enumOf(ALERT_SEVERITIES, { required: true, default: "warning" }),
    emailMinSeverity: enumOf(ALERT_SEVERITIES, { required: true, default: "warning" }),
    mutedRuleKeys: { type: [enumOf(RULE_KEYS)], default: void 0 },
    categories: { type: Schema11.Types.Mixed, default: void 0 },
    quietHours: { type: new Schema11({ start: str({ required: true, max: 5 }), end: str({ required: true, max: 5 }), timezone: str({ required: true, max: 60 }) }, { _id: false }), default: void 0 }
  },
  indexes: [{ fields: { userId: 1 }, options: { unique: true }, why: "One preference document per person" }]
});
var WeatherObservationModel = defineCollection({
  model: "WeatherObservation",
  collection: "weather_observations",
  domain: D10,
  ownership: "global",
  actor: "none",
  description: "Observed daily weather for a location (temperature, humidity, rain, wind), kept as history. Shared by every farm near that point; weather rules use it as the farm's own baseline.",
  fields: {
    provider: str({ required: true, max: 40 }),
    locationKey: str({ required: true, max: 40 }),
    date: localDate({ required: true }),
    tempMaxC: num({ min: -90, max: 70 }),
    tempMinC: num({ min: -90, max: 70 }),
    humidityMaxPercent: num({ max: 100 }),
    humidityMinPercent: num({ max: 100 }),
    rainMm: num({ max: 2e3 }),
    windMaxKph: num({ max: 500 })
  },
  indexes: [{ fields: { locationKey: 1, date: 1 }, options: { unique: true }, why: "History for a location over a date range; one row per day" }]
});
var WeatherCacheModel = defineCollection({
  model: "WeatherCache",
  collection: "weather_cache",
  domain: D10,
  ownership: "global",
  actor: "none",
  description: "Provider responses cached per rounded location (about 1 km) and kind, shared by every farm near that point. Clients never call the provider.",
  fields: {
    provider: str({ required: true, max: 40 }),
    locationKey: str({ required: true, max: 40 }),
    kind: enumOf(WEATHER_KINDS, { required: true }),
    data: { type: Schema11.Types.Mixed, required: true },
    fetchedAt: instant({ required: true }),
    expiresAt: instant({ required: true })
  },
  indexes: [
    { fields: { provider: 1, locationKey: 1, kind: 1 }, options: { unique: true }, why: "Cache lookup for a farm's location" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0 }, why: "TTL: drop stale weather" }
  ]
});

// src/adapters/mongo/models/content.ts
import { Schema as Schema12 } from "mongoose";
var D11 = "Content";
var regionCode = { type: String, required: true, match: /^(GLOBAL|[A-Z]{2}(-[A-Z0-9]{1,3})?)$/, default: "GLOBAL" };
var sources = { type: [SourceSchema], default: [] };
var TrainingCourseModel = defineCollection({
  model: "TrainingCourse",
  collection: "training_courses",
  domain: D11,
  ownership: "global",
  versioned: true,
  description: "A course and its lessons (embedded: always read together, a few lessons each). Health lessons need expert review before publishing.",
  fields: {
    slug: str({ required: true, max: 80, lowercase: true }),
    locale: str({ required: true, max: 10 }),
    title: str({ required: true, max: 150 }),
    summary: text(500),
    level: enumOf(["beginner", "intermediate", "advanced"], { required: true, default: "beginner" }),
    order: int({ default: 0 }),
    lessons: {
      type: [
        new Schema12(
          { lessonId: str({ required: true, max: 80 }), title: str({ required: true, max: 150 }), content: text(2e4), minutes: int({ max: 120 }), order: int({ default: 0 }) },
          { _id: false }
        )
      ],
      default: []
    },
    category: enumOf(CONTENT_CATEGORIES, { required: true, default: "management" }),
    regionCode,
    author: str({ max: 120 }),
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    publishedAt: instant(),
    reviewedBy: str({ max: 120 }),
    reviewedAt: instant(),
    sources
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open a course by slug in the reader's language" },
    { fields: { status: 1, locale: 1, order: 1 }, why: "Published course catalog in display order" }
  ]
});
var TrainingProgressModel = defineCollection({
  model: "TrainingProgress",
  collection: "training_progress",
  domain: D11,
  ownership: "user",
  description: "A lesson a person has completed. Personal, not farm-owned: progress follows the person across farms.",
  fields: {
    userId: ref("User", { required: true }),
    courseId: ref("TrainingCourse", { required: true }),
    lessonId: str({ required: true, max: 80 }),
    completedAt: instant({ required: true })
  },
  indexes: [{ fields: { userId: 1, lessonId: 1 }, options: { unique: true }, why: "A person's progress (prefix); a lesson is completed once" }],
  relations: [{ field: "lessonId", to: "TrainingCourse.lessons.lessonId", cardinality: "many-to-one", note: "Embedded lesson id" }]
});
var ArticleModel = defineCollection({
  model: "Article",
  collection: "articles",
  domain: D11,
  ownership: "global",
  versioned: true,
  description: "Facts, poultry management guides, news and disease information. External articles carry title, summary, content, source, source URL, publication date, region, category, author and status; they cannot be published without source, URL and date. Health, biosecurity and disease articles must cite references.",
  fields: {
    kind: enumOf(ARTICLE_KINDS, { required: true }),
    origin: enumOf(ARTICLE_ORIGINS, { required: true, default: "original" }),
    slug: str({ required: true, max: 120, lowercase: true }),
    locale: str({ required: true, max: 10 }),
    title: str({ required: true, max: 200 }),
    summary: text(600),
    /** The article text. For external items, PoultryPilot's own summary or commentary, never a copy of the source. */
    content: text(5e4),
    category: enumOf(CONTENT_CATEGORIES, { required: true, default: "general" }),
    author: str({ max: 120 }),
    /** External articles: the publisher and the original URL and date. */
    source: str({ max: 160 }),
    sourceUrl: { type: String, maxlength: 2e3, match: /^https?:\/\/\S+$/ },
    publicationDate: localDate(),
    regionCode,
    tags: { type: [str({ max: 40, lowercase: true })], default: void 0 },
    /** Disease information: structured so the apps can show it consistently. Never dosing or treatment instructions. */
    disease: {
      type: new Schema12(
        {
          species: { type: [str({ max: 40 })], default: void 0 },
          signs: { type: [str({ max: 200 })], default: void 0 },
          transmission: text(2e3),
          prevention: text(2e3),
          /** e.g. "Notifiable in many countries: report suspected cases to your veterinary authority." */
          reportingNote: text(500)
        },
        { _id: false }
      )
    },
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    publishedAt: instant(),
    submittedBy: ref("User"),
    reviewedBy: str({ max: 120 }),
    reviewedAt: instant(),
    expiresAt: instant(),
    /** References (additional sources). */
    sources
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open an article by slug" },
    { fields: { status: 1, kind: 1, locale: 1, regionCode: 1, publicationDate: -1 }, why: "Feed for a kind in my language and region (regionCode $in [mine, GLOBAL]), newest first" },
    { fields: { sourceUrl: 1 }, options: { unique: true, partialFilterExpression: { sourceUrl: { $type: "string" } } }, why: "Import de-duplication: one article per external URL" }
  ],
  configure: (schema) => schema.pre("validate", function() {
    if (this.get("status") !== "published") return;
    const kind = this.get("kind");
    const refs2 = this.get("sources")?.length ?? 0;
    if (!this.get("summary")) this.invalidate("summary", "Published articles need a summary");
    if (this.get("origin") === "external") {
      if (!this.get("source")) this.invalidate("source", "External articles need the source's name");
      if (!this.get("sourceUrl")) this.invalidate("sourceUrl", "External articles need the source URL");
      if (!this.get("publicationDate")) this.invalidate("publicationDate", "External articles need the publication date");
    }
    if (kind === "news" && !this.get("publicationDate")) this.invalidate("publicationDate", "News needs a publication date");
    const tags = this.get("tags") ?? [];
    const healthy = kind === "disease" || ["health", "biosecurity"].includes(this.get("category")) || tags.includes("health") || tags.includes("biosecurity");
    if (healthy && !refs2 && this.get("origin") !== "external") this.invalidate("sources", "Published health and biosecurity articles need at least one source");
  })
});
var GlossaryTermModel = defineCollection({
  model: "GlossaryTerm",
  collection: "glossary_terms",
  domain: D11,
  ownership: "global",
  versioned: true,
  description: "Plain-language definitions of poultry terms, searchable.",
  fields: {
    slug: str({ required: true, max: 80, lowercase: true }),
    locale: str({ required: true, max: 10 }),
    term: str({ required: true, max: 120 }),
    definition: text(2e3),
    category: str({ required: true, max: 60 }),
    relatedSlugs: { type: [str({ max: 80 })], default: void 0 },
    regionCode,
    status: enumOf(CONTENT_STATUSES, { required: true, default: "draft" }),
    sources
  },
  indexes: [
    { fields: { slug: 1, locale: 1 }, options: { unique: true }, why: "Open a term by slug in a language" },
    { fields: { term: "text", definition: "text" }, options: { weights: { term: 5, definition: 1 }, default_language: "none" }, why: "Glossary search" }
  ]
});

// src/adapters/mongo/models/system.ts
import { Schema as Schema13 } from "mongoose";
var D12 = "System";
var AuditLogModel = defineCollection({
  model: "AuditLog",
  collection: "audit_logs",
  domain: D12,
  ownership: "system",
  actor: "none",
  description: "Who changed what, when, from which device. Written in the same transaction as the change. farmId is absent for account-level events (sign-in, password change).",
  fields: {
    farmId: ref("Farm"),
    actorUserId: ref("User", { required: true }),
    action: str({ required: true, max: 80 }),
    entity: str({ required: true, max: 40 }),
    entityId: { type: String, required: true },
    changes: { type: Schema13.Types.Mixed },
    requestId: str({ max: 100 }),
    mutationId: str({ max: 100 }),
    deviceId: str({ max: 100 }),
    at: instant({ required: true })
  },
  indexes: [
    { fields: { farmId: 1, _id: -1 }, why: "Farm audit log, newest first (UUIDv7 ids sort by time); cursor pagination" },
    { fields: { farmId: 1, entity: 1, entityId: 1, _id: -1 }, why: "History of one record" },
    { fields: { actorUserId: 1, _id: -1 }, why: "A person's account activity (sign-ins, password changes)" }
  ],
  relations: [{ field: "entityId", to: "any record", cardinality: "many-to-one", note: "Polymorphic by entity" }]
});
var SyncOperationModel = defineCollection({
  model: "SyncOperation",
  collection: "sync_operations",
  domain: D12,
  ownership: "farm",
  actor: "none",
  versioned: false,
  softDelete: false,
  description: "Each offline mutation a device pushed, with its outcome. _id = farmId:mutationId makes processing exactly-once: a resent mutation returns the stored result.",
  fields: {
    mutationId: { type: String, required: true },
    userId: ref("User", { required: true }),
    deviceId: str({ required: true, max: 100 }),
    command: str({ required: true, max: 80 }),
    entityId: { type: String },
    baseVersion: int(),
    status: enumOf(SYNC_OPERATION_STATUSES, { required: true }),
    result: { type: Schema13.Types.Mixed, required: true },
    receivedAt: instant({ required: true })
  },
  indexes: [{ fields: { createdAt: 1 }, options: { expireAfterSeconds: 90 * 86400 }, why: "TTL: forget processed mutations after 90 days (devices resend within days)" }],
  notes: ["Lookups are by _id (farmId:mutationId), so no secondary index on mutationId is needed."]
});
var SyncChangeModel = defineCollection({
  model: "SyncChange",
  collection: "sync_changes",
  domain: D12,
  ownership: "farm",
  actor: "none",
  versioned: false,
  appendOnly: true,
  description: "Outbound change feed for offline clients: every change to a synced record gets the farm's next sequence number. Devices pull changes after their last seq.",
  fields: {
    seq: int({ required: true, min: 1 }),
    entity: str({ required: true, max: 40 }),
    entityId: { type: String, required: true },
    op: enumOf(["upsert", "delete"], { required: true }),
    version: int({ required: true }),
    document: { type: Schema13.Types.Mixed },
    at: instant({ required: true })
  },
  indexes: [{ fields: { farmId: 1, seq: 1 }, options: { unique: true }, why: "GET /sync/pull: changes after a sequence number" }]
});
var IdempotencyModel = defineCollection({
  model: "IdempotencyKey",
  collection: "idempotency_keys",
  domain: D12,
  ownership: "system",
  actor: "none",
  description: "Stored responses for Idempotency-Key writes, so a retried request is answered without running twice. _id = userId:key.",
  fields: {
    requestHash: { type: String, required: true },
    status: enumOf(["processing", "done"], { required: true }),
    responseStatus: int({ min: 100, max: 599 }),
    responseBody: { type: Schema13.Types.Mixed }
  },
  indexes: [{ fields: { createdAt: 1 }, options: { expireAfterSeconds: 7 * 86400 }, why: "TTL: keys expire after 7 days" }]
});
var CounterModel = defineCollection({
  model: "Counter",
  collection: "counters",
  domain: D12,
  ownership: "system",
  actor: "none",
  description: "Atomic per-farm sequences (sync change seq, order numbers). _id = purpose:farmId.",
  fields: { value: int({ required: true, default: 0 }) }
});
var MediaAssetModel = defineCollection({
  model: "MediaAsset",
  collection: "media_assets",
  domain: D12,
  ownership: "farm",
  description: "A photo uploaded by a farm member (daily records, health records). The bytes live in object storage under storageKey; this document is the farm-scoped index and access check.",
  fields: {
    contentType: enumOf(["image/jpeg", "image/png", "image/webp", "application/pdf"], { required: true }),
    sizeBytes: int({ required: true, min: 1, max: 1e7 }),
    sha256: str({ required: true, max: 64 }),
    storageKey: str({ required: true, max: 300 })
  },
  notes: ["Read by _id within the farm only; no secondary index. Linked from daily_records.photos[].assetId."]
});

export {
  SPECIES,
  FLOCK_TYPES,
  FLOCK_STATUSES,
  HOUSE_TYPES,
  MORTALITY_CAUSES,
  EGG_GRADES,
  HEALTH_RECORD_TYPES,
  REMINDER_STATUSES,
  LEDGER_DIRECTIONS,
  LEDGER_CATEGORIES,
  RECURRING_FREQUENCIES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  LISTING_CATEGORIES,
  BIOSECURITY_ENTRY_TYPES,
  ALERT_SEVERITIES,
  CONTENT_KINDS,
  ROLES,
  MEMBERSHIP_STATUSES,
  USER_STATUSES,
  SESSION_PLATFORMS,
  UNIT_SYSTEMS,
  FLOCK_EVENT_TYPES,
  FEED_STAGES,
  INVENTORY_CATEGORIES,
  FEED_CONSUMPTION_KINDS,
  WATER_SOURCES,
  WATER_TREATMENTS,
  WATER_QUALITY_RATINGS,
  STOCK_UNITS,
  MEDICINE_TYPES,
  ADMINISTRATION_ROUTES,
  HATCHERY_BATCH_STATUSES,
  EGG_REJECT_REASONS,
  BROODER_BEHAVIOURS,
  ARRIVAL_STATUSES,
  ASSESSMENT_SOURCES,
  WITHDRAWAL_SOURCES,
  CHECKLIST_KINDS,
  CHECKLIST_RESPONSE_TYPES,
  PEST_TYPES,
  VISITOR_TYPES,
  CLEANING_SCHEDULES,
  EQUIPMENT_TYPES,
  EQUIPMENT_STATUSES,
  EXPENSE_STATUSES,
  MONEY_ACCOUNT_TYPES,
  EXPENSE_KINDS,
  INCOME_KINDS,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  FULFILMENT_METHODS,
  LISTING_STATUSES,
  MARKET_PRODUCTS,
  PRICE_UNITS,
  TASK_STATUSES,
  TASK_PRIORITIES,
  ALERT_STATUSES,
  ALERT_RULE_TYPES,
  PUSH_PLATFORMS,
  RULE_KEYS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_INFO,
  CATEGORY_FOR_RULE,
  ARTICLE_KINDS,
  ARTICLE_ORIGINS,
  CONTENT_CATEGORIES,
  REPORT_TYPES,
  REPORT_FORMATS,
  CONTENT_STATUSES,
  UserModel,
  SessionModel,
  RefreshTokenModel,
  OneTimeTokenModel,
  FarmModel,
  MembershipModel,
  DomainError,
  Id,
  LocalDate,
  Instant,
  IanaTimezone,
  CurrencyCode,
  CountryCode,
  Money,
  Count,
  PositiveCount,
  Grams,
  Kilograms,
  Celsius,
  NonEmptyText,
  OptionalText,
  Email,
  Password,
  GeoPoint,
  Cursor,
  PageQuery,
  localDateOf,
  daysBetween,
  addDays,
  addMonthsClamped,
  dateRange,
  lastNDates,
  effectiveEvents,
  population,
  assertEventAllowed,
  birdsAvailable,
  acquisitionCostPerBird,
  assertTransition,
  assertCanClose,
  ageDays,
  stageFor,
  weighSessionStats,
  henDayPercent,
  INCUBATION_DAYS,
  expectedTransferDate,
  overallHatchOfSet,
  effectiveHatchEvents,
  batchCounts,
  assertHatchEventAllowed,
  reversibleHatchEvent,
  hatcheryMetrics,
  evaluateBrooderCheck,
  assertBands,
  averageDailyUseKg,
  daysOfCover,
  weightCurve,
  computeFlockMetrics,
  q3,
  isExpired,
  allocate,
  stockTotals,
  averageUnitCost,
  expiryStatus,
  evaluateWater,
  treatmentEndDate,
  withdrawalUntil,
  activeWithdrawal,
  vaccinationState,
  scheduleProgramme,
  evaluateChecklist,
  visitorDowntime,
  ORDER_TRANSITIONS,
  assertOrderTransition,
  RESERVING_STATUSES,
  applyTax,
  paymentStatus,
  assertPaymentFits,
  ageBucket,
  baselineOf,
  deviationFrom,
  RULE_DEFINITIONS,
  RULE_FOR_ALERT,
  validateRuleParams,
  effectiveParams,
  weatherRisks,
  formatCell,
  sheetValue,
  safeText,
  HouseModel,
  FlockModel,
  FlockEventModel,
  DailyRecordModel,
  BirdWeightModel,
  EggRecordModel,
  EggInventoryModel,
  WaterRecordModel,
  FeedConsumptionModel,
  InventoryItemModel,
  InventoryLotModel,
  InventoryTransactionModel,
  MedicineModel,
  HealthRecordModel,
  VaccinationProgrammeModel,
  VaccinationModel,
  ChecklistTemplateModel,
  BiosecurityLogModel,
  VisitorModel,
  CleaningTaskModel,
  EquipmentModel,
  EquipmentMovementModel,
  HatcheryBatchModel,
  HatcheryEventModel,
  ChickLotModel,
  BroodingProfileModel,
  ChickArrivalModel,
  BrooderCheckModel,
  SupplierModel,
  MoneyAccountModel,
  ExpenseModel,
  IncomeModel,
  RecurringExpenseModel,
  TransactionModel,
  BuyerModel,
  MarketListingModel,
  OrderModel,
  OrderPaymentModel,
  TaskModel,
  AlertRuleModel,
  AlertModel,
  NotificationModel,
  PushDeviceModel,
  NotificationPreferenceModel,
  WeatherObservationModel,
  WeatherCacheModel,
  TrainingCourseModel,
  TrainingProgressModel,
  ArticleModel,
  GlossaryTermModel,
  AuditLogModel,
  SyncOperationModel,
  SyncChangeModel,
  IdempotencyModel,
  CounterModel,
  MediaAssetModel
};
//# sourceMappingURL=chunk-6YTPLJIP.js.map