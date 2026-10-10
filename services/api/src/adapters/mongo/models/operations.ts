import {
  ALERT_RULE_TYPES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  ROLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  WEATHER_KINDS,
} from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { bool, defineCollection, enumOf, instant, int, localDate, ref, refs, str, text } from "./base.js";

const D = "Operations";

export const TaskModel = defineCollection({
  model: "Task",
  collection: "tasks",
  domain: D,
  ownership: "farm",
  description: "A piece of work assigned to someone on the farm, optionally linked to a flock, house or other record.",
  fields: {
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
  description: "A farm's configuration of one alert type: on/off, thresholds, scope and who is notified. Defaults apply when absent.",
  fields: {
    ruleType: enumOf(ALERT_RULE_TYPES, { required: true }),
    enabled: bool(true),
    parameters: { type: Map, of: Number, default: undefined },
    flockIds: refs("Flock"),
    houseIds: refs("House"),
    notifyRoles: { type: [enumOf(ROLES)], default: undefined },
    channels: { type: [enumOf(NOTIFICATION_CHANNELS)], default: undefined },
    cooldownHours: int({ default: 24, max: 720 }),
  },
  indexes: [{ fields: { farmId: 1, ruleType: 1 }, options: { unique: true }, why: "Load a farm's rules for the alert job; one rule per type per farm" }],
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
  description: "A message to one person (in-app, push, email, SMS, WhatsApp) with delivery state. Kept 180 days.",
  fields: {
    userId: ref("User", { required: true }),
    farmId: ref("Farm"),
    channel: enumOf(NOTIFICATION_CHANNELS, { required: true }),
    status: enumOf(NOTIFICATION_STATUSES, { required: true, default: "queued" }),
    title: str({ required: true, max: 200 }),
    body: text(2000),
    link: { type: new Schema({ entity: str({ max: 40 }), id: { type: String }, path: str({ max: 300 }) }, { _id: false }) },
    alertId: ref("Alert"),
    sentAt: instant(),
    deliveredAt: instant(),
    readAt: instant(),
    error: str({ max: 500 }),
  },
  indexes: [
    { fields: { userId: 1, createdAt: -1 }, why: "A person's notification inbox, newest first; unread count" },
    { fields: { createdAt: 1 }, options: { expireAfterSeconds: 180 * 86_400 }, why: "TTL: delete notifications after 180 days" },
  ],
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
