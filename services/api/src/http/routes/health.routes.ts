import {
  ActionListQuery,
  AdministerVaccinationRequest,
  ApplyProgrammeRequest,
  ArticleListQuery,
  BiosecurityLogQuery,
  BiosecurityLogRequest,
  ChecklistTemplateQuery,
  CleaningScheduleRequest,
  CompleteActionRequest,
  CompleteCleaningRequest,
  CorrectiveActionRequest,
  CreateChecklistTemplateRequest,
  CreateHealthRecordRequest,
  CreateMedicineRequest,
  CreateProgrammeRequest,
  EquipmentMoveRequest,
  EquipmentRequest,
  HealthRecordListQuery,
  Id,
  RemindersQuery,
  ScheduleVaccinationRequest,
  SkipVaccinationRequest,
  UpdateChecklistTemplateRequest,
  UpdateHealthRecordRequest,
  UpdateMedicineRequest,
  VaccinationListQuery,
  VisitorCheckInRequest,
  VisitorCheckOutRequest,
  VisitorListQuery,
} from "@poultrypilot/validation";
import type { Action } from "@poultrypilot/constants";
import { Router, type Request, type RequestHandler } from "express";
import { z } from "zod";
import type { BiosecurityService } from "../../services/biosecurity.service.js";
import type { ContentService } from "../../services/content.service.js";
import type { FarmService } from "../../services/farm.service.js";
import type { HealthService } from "../../services/health.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

const q = <T>(req: Request) => req.query as unknown as T;
const p = (req: Request, k: string) => req.params[k] as string;

function guard(farms: FarmService) {
  return (action: Action, extra: z.ZodRawShape = {}): RequestHandler[] => [validate("params", z.object({ farmId: Id, ...extra })), requireFarm(farms), requirePermission(action)];
}

/** FlockHealth, mounted at /api/v1/farms/:farmId/health. */
export function healthRoutes(health: HealthService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/medicines", ...g("health.read"), async (req, res) => res.json({ items: await health.listMedicines(req.farmCtx!) }));
  r.post("/medicines", ...g("health.manage"), validate("body", CreateMedicineRequest), async (req, res) => res.status(201).json(await health.createMedicine(req.farmCtx!, req.body)));
  r.put("/medicines/:id", ...g("health.manage", { id: Id }), validate("body", UpdateMedicineRequest), async (req, res) => res.json(await health.updateMedicine(req.farmCtx!, p(req, "id"), req.body)));

  r.get("/records", ...g("health.read"), validate("query", HealthRecordListQuery), async (req, res) => res.json({ items: await health.listRecords(req.farmCtx!, q(req)) }));
  r.post("/records", ...g("health.record_observation"), validate("body", CreateHealthRecordRequest), async (req, res) => res.status(201).json(await health.createRecord(req.farmCtx!, req.body)));
  r.get("/records/:id", ...g("health.read", { id: Id }), async (req, res) => res.json(await health.getRecord(req.farmCtx!, p(req, "id"))));
  r.put("/records/:id", ...g("health.record_observation", { id: Id }), validate("body", UpdateHealthRecordRequest), async (req, res) => res.json(await health.updateRecord(req.farmCtx!, p(req, "id"), req.body)));
  r.delete("/records/:id", ...g("health.manage", { id: Id }), async (req, res) => {
    await health.deleteRecord(req.farmCtx!, p(req, "id"));
    res.status(204).end();
  });
  r.post("/records/:id/follow-up-done", ...g("health.record_observation", { id: Id }), async (req, res) => res.json(await health.completeFollowUp(req.farmCtx!, p(req, "id"))));
  r.get("/reminders", ...g("health.read"), validate("query", RemindersQuery), async (req, res) => res.json(await health.reminders(req.farmCtx!, q(req))));
  r.get("/withdrawals/:flockId", ...g("health.read", { flockId: Id }), async (req, res) => res.json(await health.withdrawals(req.farmCtx!, p(req, "flockId"))));

  r.get("/programmes", ...g("health.read"), async (req, res) => res.json({ items: await health.listProgrammes(req.farmCtx!) }));
  r.post("/programmes", ...g("health.manage"), validate("body", CreateProgrammeRequest), async (req, res) => res.status(201).json(await health.createProgramme(req.farmCtx!, req.body)));
  r.post("/programmes/apply/:flockId", ...g("health.manage", { flockId: Id }), validate("body", ApplyProgrammeRequest), async (req, res) => res.status(201).json(await health.applyProgramme(req.farmCtx!, p(req, "flockId"), req.body)));
  r.get("/vaccinations", ...g("health.read"), validate("query", VaccinationListQuery), async (req, res) => res.json({ items: await health.listVaccinations(req.farmCtx!, q(req)) }));
  r.post("/vaccinations", ...g("health.manage"), validate("body", ScheduleVaccinationRequest), async (req, res) => res.status(201).json(await health.scheduleVaccination(req.farmCtx!, req.body)));
  r.post("/vaccinations/:id/administer", ...g("health.vaccinate", { id: Id }), validate("body", AdministerVaccinationRequest), async (req, res) => res.json(await health.administer(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/vaccinations/:id/skip", ...g("health.manage", { id: Id }), validate("body", SkipVaccinationRequest), async (req, res) => res.json(await health.skipVaccination(req.farmCtx!, p(req, "id"), req.body.reason)));
  return r;
}

/** BioSecure Farm, mounted at /api/v1/farms/:farmId/biosecurity. */
export function biosecurityRoutes(bio: BiosecurityService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/summary", ...g("biosecurity.read"), async (req, res) => res.json(await bio.summary(req.farmCtx!)));
  r.get("/checklists", ...g("biosecurity.read"), validate("query", ChecklistTemplateQuery), async (req, res) => res.json({ items: await bio.listTemplates(req.farmCtx!, q(req)) }));
  r.post("/checklists", ...g("biosecurity.manage"), validate("body", CreateChecklistTemplateRequest), async (req, res) => res.status(201).json(await bio.createTemplate(req.farmCtx!, req.body)));
  r.post("/checklists/starter", ...g("biosecurity.manage"), async (req, res) => res.status(201).json(await bio.addStarterTemplates(req.farmCtx!)));
  r.put("/checklists/:id", ...g("biosecurity.manage", { id: Id }), validate("body", UpdateChecklistTemplateRequest), async (req, res) => res.json(await bio.updateTemplate(req.farmCtx!, p(req, "id"), req.body)));
  r.get("/visitors", ...g("biosecurity.read"), validate("query", VisitorListQuery), async (req, res) => res.json({ items: await bio.listVisitors(req.farmCtx!, q(req)) }));
  r.post("/visitors", ...g("biosecurity.record"), validate("body", VisitorCheckInRequest), async (req, res) => res.status(201).json(await bio.checkIn(req.farmCtx!, req.body)));
  r.post("/visitors/:id/check-out", ...g("biosecurity.record", { id: Id }), validate("body", VisitorCheckOutRequest), async (req, res) => res.json(await bio.checkOut(req.farmCtx!, p(req, "id"), req.body.checkOutAt)));
  r.get("/logs", ...g("biosecurity.read"), validate("query", BiosecurityLogQuery), async (req, res) => res.json({ items: await bio.listLogs(req.farmCtx!, q(req)) }));
  r.post("/logs", ...g("biosecurity.record"), validate("body", BiosecurityLogRequest), async (req, res) => res.status(201).json(await bio.createLog(req.farmCtx!, req.body)));
  r.get("/equipment", ...g("biosecurity.read"), async (req, res) => res.json({ items: await bio.listEquipment(req.farmCtx!) }));
  r.post("/equipment", ...g("biosecurity.manage"), validate("body", EquipmentRequest), async (req, res) => res.status(201).json(await bio.createEquipment(req.farmCtx!, req.body)));
  r.post("/equipment/:id/moves", ...g("biosecurity.record", { id: Id }), validate("body", EquipmentMoveRequest), async (req, res) => res.status(201).json(await bio.moveEquipment(req.farmCtx!, p(req, "id"), req.body)));
  r.get("/cleaning-schedules", ...g("biosecurity.read"), async (req, res) => res.json({ items: await bio.listSchedules(req.farmCtx!) }));
  r.post("/cleaning-schedules", ...g("biosecurity.manage"), validate("body", CleaningScheduleRequest), async (req, res) => res.status(201).json(await bio.createSchedule(req.farmCtx!, req.body)));
  r.post("/cleaning-schedules/:id/complete", ...g("biosecurity.record", { id: Id }), validate("body", CompleteCleaningRequest), async (req, res) => res.status(201).json(await bio.completeSchedule(req.farmCtx!, p(req, "id"), req.body)));
  r.get("/corrective-actions", ...g("biosecurity.read"), validate("query", ActionListQuery), async (req, res) => res.json({ items: await bio.listActions(req.farmCtx!, q(req)) }));
  r.post("/corrective-actions", ...g("biosecurity.record"), validate("body", CorrectiveActionRequest), async (req, res) => res.status(201).json(await bio.createAction(req.farmCtx!, req.body)));
  r.post("/corrective-actions/:id/complete", ...g("biosecurity.record", { id: Id }), validate("body", CompleteActionRequest), async (req, res) => res.json(await bio.completeAction(req.farmCtx!, p(req, "id"), req.body.resolutionNotes)));
  r.post("/corrective-actions/:id/verify", ...g("biosecurity.manage", { id: Id }), async (req, res) => res.json(await bio.verifyAction(req.farmCtx!, p(req, "id"))));
  return r;
}

/** Educational content, mounted at /api/v1/farms/:farmId/content. */
export function contentRoutes(content: ContentService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/articles", ...g("content.read"), validate("query", ArticleListQuery), async (req, res) => res.json({ items: await content.list(req.farmCtx!, q(req)) }));
  r.get("/articles/:slug", ...g("content.read", { slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }), async (req, res) => res.json(await content.get(req.farmCtx!, p(req, "slug"), (req.query["locale"] as string) ?? "en")));
  return r;
}
