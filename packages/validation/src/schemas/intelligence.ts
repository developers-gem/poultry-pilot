import * as C from "@poultrypilot/constants";
import { z } from "zod";
import { Id, LocalDate, NonEmptyText, OptionalText } from "../primitives.js";

/** Intelligence layer: alert rules, analytics, weather, notifications. */

export const RuleKey = z.enum(C.RULE_KEYS);
const Severity = z.enum(C.ALERT_SEVERITIES);

export const AlertRuleUpdateRequest = z
  .object({
    enabled: z.boolean(),
    /** Parameter values from the rule's catalog entry (GET /alert-rules lists them with ranges). */
    parameters: z.record(z.string().max(40), z.number()).optional(),
    severity: Severity.optional(),
    channels: z.array(z.enum(["in_app", "push", "email"])).min(1).max(3).optional(),
    notifyRoles: z.array(z.enum(C.ROLES)).min(1).max(7).optional(),
    cooldownHours: z.number().int().min(0).max(720).optional(),
    flockIds: z.array(Id).max(100).optional(),
    houseIds: z.array(Id).max(100).optional(),
  })
  .strict();

export const AlertsQuery = z.object({
  status: z.enum(C.ALERT_STATUSES).optional(),
  ruleType: z.enum(C.ALERT_RULE_TYPES).optional(),
  ruleKey: RuleKey.optional(),
  severity: Severity.optional(),
  flockId: Id.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const AnalyticsQuery = z
  .object({ from: LocalDate, to: LocalDate, flockId: Id.optional(), type: z.enum(C.FLOCK_TYPES).optional() })
  .refine((q) => q.from <= q.to, { message: "from must be on or before to", path: ["from"] });

export const WeatherQuery = z.object({ historyDays: z.coerce.number().int().min(1).max(365).optional() });

export const NotificationListQuery = z.object({
  unreadOnly: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const MarkReadRequest = z.object({ ids: z.array(Id).min(1).max(200) }).strict();
export const PushDeviceRequest = z.object({ platform: z.enum(C.PUSH_PLATFORMS), token: z.string().min(10).max(4096), deviceName: OptionalText(100) }).strict();
export const NotificationPreferencesRequest = z
  .object({ pushEnabled: z.boolean(), emailEnabled: z.boolean(), pushMinSeverity: Severity, emailMinSeverity: Severity, mutedRuleKeys: z.array(RuleKey).max(14).optional() })
  .strict();

export const AppointmentRequest = z.object({ date: LocalDate, title: NonEmptyText(200), vetName: OptionalText(120), flockId: Id.optional(), houseId: Id.optional(), notes: OptionalText(1000) }).strict();
export const AppointmentListQuery = z.object({ includeDone: z.enum(["true", "false"]).transform((v) => v === "true").optional() });
export const CompleteAppointmentRequest = z.object({ notes: OptionalText(1000) }).strict();
