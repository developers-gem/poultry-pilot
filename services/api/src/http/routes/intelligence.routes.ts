import {
  AlertRuleUpdateRequest,
  AnalyticsQuery,
  AppointmentListQuery,
  AppointmentRequest,
  CompleteAppointmentRequest,
  Id,
  MarkReadRequest,
  NotificationListQuery,
  NotificationPreferencesRequest,
  PushDeviceRequest,
  RuleKey,
  WeatherQuery,
} from "@poultrypilot/validation";
import { Router, type Request } from "express";
import { z } from "zod";
import type { DashboardService } from "../../services/dashboard.service.js";
import type { FarmService } from "../../services/farm.service.js";
import type { HealthService } from "../../services/health.service.js";
import type { NotificationService } from "../../services/notification.service.js";
import type { RulesService } from "../../services/rules.service.js";
import type { WeatherService } from "../../services/weather.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

const q = <T>(req: Request) => req.query as unknown as T;
const p = (req: Request, k: string) => req.params[k] as string;
const ctxOf = (req: Request) => ({ userId: req.auth!.userId, sessionId: req.auth!.sessionId, requestId: req.id as string });

/** /api/v1/farms/:farmId — dashboard, analytics, alert rules, weather. */
export function intelligenceRoutes(s: { dashboard: DashboardService; rules: RulesService; weather: WeatherService }, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const farm = [validate("params", z.object({ farmId: Id }).passthrough()), requireFarm(farms)];
  r.get("/dashboard", ...farm, requirePermission("farm.read"), async (req, res) => res.json(await s.dashboard.overview(req.farmCtx!)));
  r.get("/analytics", ...farm, requirePermission("production.read"), validate("query", AnalyticsQuery), async (req, res) => res.json(await s.dashboard.analytics(req.farmCtx!, q(req))));
  r.get("/weather", ...farm, requirePermission("farm.read"), validate("query", WeatherQuery), async (req, res) => res.json(await s.weather.get(req.farmCtx!, q(req))));
  r.get("/alert-rules", ...farm, requirePermission("farm.read"), async (req, res) => res.json({ items: await s.rules.list(req.farmCtx!) }));
  r.put("/alert-rules/:ruleKey", validate("params", z.object({ farmId: Id, ruleKey: RuleKey })), requireFarm(farms), requirePermission("alert.manage"), validate("body", AlertRuleUpdateRequest), async (req, res) => res.json(await s.rules.update(req.farmCtx!, p(req, "ruleKey") as never, req.body)));
  r.delete("/alert-rules/:ruleKey", validate("params", z.object({ farmId: Id, ruleKey: RuleKey })), requireFarm(farms), requirePermission("alert.manage"), async (req, res) => res.json(await s.rules.reset(req.farmCtx!, p(req, "ruleKey") as never)));
  return r;
}

/** /api/v1/farms/:farmId/health/appointments */
export function appointmentRoutes(health: HealthService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const farm = [validate("params", z.object({ farmId: Id })), requireFarm(farms)];
  r.get("/", ...farm, requirePermission("health.read"), validate("query", AppointmentListQuery), async (req, res) => res.json({ items: await health.listAppointments(req.farmCtx!, q(req)) }));
  r.post("/", ...farm, requirePermission("health.manage"), validate("body", AppointmentRequest), async (req, res) => res.status(201).json(await health.bookAppointment(req.farmCtx!, req.body)));
  r.post("/:id/complete", validate("params", z.object({ farmId: Id, id: Id })), requireFarm(farms), requirePermission("health.manage"), validate("body", CompleteAppointmentRequest), async (req, res) => res.json(await health.completeAppointment(req.farmCtx!, p(req, "id"), req.body.notes)));
  return r;
}

/** The signed-in person's notifications, devices and preferences (across farms). */
export function myNotificationRoutes(n: NotificationService): { inbox: Router; devices: Router; preferences: Router } {
  const inbox = Router();
  inbox.get("/", validate("query", NotificationListQuery), async (req, res) => res.json(await n.inbox(ctxOf(req), q(req))));
  inbox.post("/read", validate("body", MarkReadRequest), async (req, res) => res.json(await n.markRead(ctxOf(req), req.body.ids)));
  inbox.post("/read-all", async (req, res) => res.json(await n.markRead(ctxOf(req), "all")));
  const devices = Router();
  devices.post("/", validate("body", PushDeviceRequest), async (req, res) => res.status(201).json(await n.registerDevice(ctxOf(req), req.body)));
  devices.delete("/:id", validate("params", z.object({ id: Id })), async (req, res) => {
    await n.removeDevice(ctxOf(req), p(req, "id"));
    res.status(204).end();
  });
  const preferences = Router();
  preferences.get("/", async (req, res) => res.json(await n.preferences(ctxOf(req))));
  preferences.put("/", validate("body", NotificationPreferencesRequest), async (req, res) => res.json(await n.setPreferences(ctxOf(req), req.body)));
  return { inbox, devices, preferences };
}
