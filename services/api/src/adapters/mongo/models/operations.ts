import {
  ALERT_RULE_TYPES,
  ALERT_SEVERITIES,
  PUSH_PLATFORMS,
  RULE_KEYS,
  ALERT_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  ROLES,
  TASK_KINDS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  WEATHER_KINDS,
} from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { bool, defineCollection, enumOf, instant, int, localDate, num, ref, refs, str, text } from "./base.js";

const D = "Operations";

export const TaskModel = defineCollection({
  model: "Task",
  collection: "tasks",
  domain: D,
  ownership: "farm",
  description: "A piece of work assigned to someone on the farm, optionally linked to a flock, house or other record.",
  fields: {
    kind: enumOf(TASK_KINDS, { required: true, default: "general" }),
    title: str({ required: true, max: 200 }),
    description: text(2000),
    assigneeUserId: ref("User"),
    dueDate: localDate(),
    status: enumOf(TASK_STATUSES, { required: true, default: "open" }),
    priority: enumOf(TASK_PRIORITIES, { required: true, default: "normal" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    related: { type: new Schema({ entity: str({ required: true, max: 40 }), id: { type: String, required: true } }, { _id: false }) },
    completedAt: instant(),
    completedBy: ref("User"),
    resolutionNotes: text(2000),
    verifiedAt: instant(),
    verifiedBy: ref("User"),
  },
  indexes: [
    { fields: { farmId: 1, status: 1, dueDate: 1 }, why: "Farm task board by status and due date" },
    { fields: { farmId: 1, assigneeUserId: 1, status: 1, dueDate: 1 }, why: "My tasks (worker home screen)" },
  ],
  relations: [{ field: "related.id", to: "any farm record", cardinality: "many-to-one", note: "Polymorphic by related.entity" }],
});

export const AlertRuleModel = defineCollection({
  model: "AlertRule",
  collection: "alert_rules",
  domain: D,
  ownership: "farm",
  description:
    "A farm's settings for one rule from the catalog (mortality, egg production, feed, water, weight, FCR, stock, expiry, vaccination, vet appointment, hatch, delivery, payment, weather): on or off, parameters, scope, severity, who is told and how. Absent = catalog defaults, which compare with the farm's own history.",
  fields: {
    ruleKey: enumOf(RULE_KEYS, { required: true }),
    enabled: bool(true),
    parameters: { type: Map, of: Number, default: undefined },
    flockIds: refs("Flock"),
    houseIds: refs("House"),
    severity: enumOf(ALERT_SEVERITIES),
    notifyRoles: { type: [enumOf(ROLES)], default: undefined },
    channels: { type: [enumOf(NOTIFICATION_CHANNELS)], default: undefined },
    cooldownHours: int({ default: 24, max: 720 }),
  },
  indexes: [{ fields: { farmId: 1, ruleKey: 1 }, options: { unique: true }, why: "Load a farm's rule settings; one per rule per farm" }],
});

export const AlertModel = defineCollection({
  model: "Alert",
  collection: "alerts",
  domain: D,
  ownership: "farm",
  actor: "optional", // created by the alert job (createdBy "system")
  description: "Something that needs attention, raised by the server-side alert job. States facts (never a diagnosis). Deduplicated by dedupKey.",
  fields: {
    ruleType: enumOf(ALERT_RULE_TYPES, { required: true }),
    severity: enumOf(ALERT_SEVERITIES, { required: true }),
    status: enumOf(ALERT_STATUSES, { required: true, default: "open" }),
    flockId: ref("Flock"),
    houseId: ref("House"),
    date: localDate({ required: true }),
    title: str({ required: true, max: 200 }),
    message: text(2000),
    values: { type: Map, of: Number, default: undefined },
    dedupKey: str({ required: true, max: 200 }),
    acknowledgedBy: ref("User"),
    acknowledgedAt: instant(),
    resolvedAt: instant(),
  },
  indexes: [
    { fields: { farmId: 1, dedupKey: 1 }, options: { unique: true }, why: "The alert job is idempotent: an alert is raised once per rule, flock and day" },
    { fields: { farmId: 1, status: 1, createdAt: -1 }, why: "Open alerts badge and alert list" },
  ],
});

export const NotificationModel = defineCollection({
  model: "Notification",
  collection: "notifications",
  domain: D,
  ownership: "user",
  actor: "none",
  description:
    "A message to one person on one channel (in-app, push, email) with delivery state. Push and email are queued and sent by the delivery worker through replaceable providers, with retries. Kept 180 days.",
  fields: {
    userId: ref("User", { required: true }),
    farmId: ref("Farm"),
    channel: enumOf(NOTIFICATION_CHANNELS, { required: true }),
    status: enumOf(NOTIFICATION_STATUSES, { required: true, default: "queued" }),
    title: str({ required: true, max: 200 }),
    body: text(2000),
    link: { type: new Schema({ entity: str({ max: 40 }), id: { type: String }, path: str({ max: 300 }) }, { _id: false }) },
    alertId: ref("Alert"),
    ruleKey: enumOf(RULE_KEYS),
    severity: enumOf(ALERT_SEVERITIES),
    sentAt: instant(),
    deliveredAt: instant(),
    readAt: instant(),
    attempts: int({ default: 0, max: 20 }),
    nextAttemptAt: instant(),
    providerMessageId: str({ max: 200 }),
    error: str({ max: 500 }),
  },
  indexes: [
    { fields: { userId: 1, createdAt: -1 }, why: "A person's notification inbox, newest first; unread count" },
    { fields: { status: 1, nextAttemptAt: 1 }, options: { partialFilterExpression: { status: "queued" } }, why: "Delivery queue: queued push and email notifications due for an attempt" },
    { fields: { createdAt: 1 }, options: { expireAfterSeconds: 180 * 86_400 }, why: "TTL: delete notifications after 180 days" },
  ],
});

export const PushDeviceModel = defineCollection({
  model: "PushDevice",
  collection: "push_devices",
  domain: D,
  ownership: "user",
  description: "A phone or browser registered for push notifications. Tokens the provider reports as invalid are disabled.",
  fields: {
    userId: ref("User", { required: true }),
    platform: enumOf(PUSH_PLATFORMS, { required: true }),
    token: str({ required: true, max: 4096, trim: false }),
    deviceName: str({ max: 100 }),
    lastSeenAt: instant({ required: true }),
    disabledAt: instant(),
  },
  indexes: [
    { fields: { token: 1 }, options: { unique: true }, why: "One registration per token (re-registering moves it to the signed-in user)" },
    { fields: { userId: 1 }, why: "A person's devices when sending a push" },
  ],
});

export const NotificationPreferenceModel = defineCollection({
  model: "NotificationPreference",
  collection: "notification_preferences",
  domain: D,
  ownership: "user",
  description: "How a person wants to be told: push and email on or off, the lowest severity for each, and rules they have muted. In-app notifications are always kept.",
  fields: {
    userId: ref("User", { required: true }),
    pushEnabled: bool(true),
    emailEnabled: bool(true),
    pushMinSeverity: enumOf(ALERT_SEVERITIES, { required: true, default: "warning" }),
    emailMinSeverity: enumOf(ALERT_SEVERITIES, { required: true, default: "warning" }),
    mutedRuleKeys: { type: [enumOf(RULE_KEYS)], default: undefined },
  },
  indexes: [{ fields: { userId: 1 }, options: { unique: true }, why: "One preference document per person" }],
});

export const WeatherObservationModel = defineCollection({
  model: "WeatherObservation",
  collection: "weather_observations",
  domain: D,
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
    rainMm: num({ max: 2000 }),
    windMaxKph: num({ max: 500 }),
  },
  indexes: [{ fields: { locationKey: 1, date: 1 }, options: { unique: true }, why: "History for a location over a date range; one row per day" }],
});

export const WeatherCacheModel = defineCollection({
  model: "WeatherCache",
  collection: "weather_cache",
  domain: D,
  ownership: "global",
  actor: "none",
  description:
    "Provider responses cached per rounded location (about 1 km) and kind, shared by every farm near that point. Clients never call the provider.",
  fields: {
    provider: str({ required: true, max: 40 }),
    locationKey: str({ required: true, max: 40 }),
    kind: enumOf(WEATHER_KINDS, { required: true }),
    data: { type: Schema.Types.Mixed, required: true },
    fetchedAt: instant({ required: true }),
    expiresAt: instant({ required: true }),
  },
  indexes: [
    { fields: { provider: 1, locationKey: 1, kind: 1 }, options: { unique: true }, why: "Cache lookup for a farm's location" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0 }, why: "TTL: drop stale weather" },
  ],
});
