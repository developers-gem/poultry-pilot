import { CreateDailyRecordRequest, DailyRecordListQuery, DashboardDayQuery, Id, LocalDate, TrendsQuery, UpdateDailyRecordRequest } from "@poultrypilot/validation";
import express, { Router, type Request } from "express";
import { z } from "zod";
import type { Repositories } from "../../ports/repositories.js";
import type { DailyRecordService } from "../../services/daily-record.service.js";
import type { FarmService } from "../../services/farm.service.js";
import { MAX_PHOTO_BYTES, type MediaService } from "../../services/media.service.js";
import { requireFarm, requireFarmOf, requirePermission, validate } from "../middleware/core.js";

/** `Prefer: return=minimal` → respond with id, version and summary only (saves mobile data). */
const wantsMinimal = (req: Request) => /\breturn=minimal\b/i.test(req.header("prefer") ?? "");
const farmParams = [validate("params", z.object({ farmId: Id }))];

/** /api/v1/farms/:farmId/daily-records */
export function farmDailyRecordRoutes(daily: DailyRecordService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const farm = [...farmParams, requireFarm(farms)];
  r.post("/", ...farm, requirePermission("production.record"), validate("body", CreateDailyRecordRequest), async (req, res) => {
    res.status(201).json(await daily.create(req.farmCtx!, req.body, { minimal: wantsMinimal(req) }));
  });
  r.get("/", ...farm, requirePermission("production.read"), validate("query", DailyRecordListQuery), async (req, res) => {
    res.json(await daily.list(req.farmCtx!, req.query as unknown as z.infer<typeof DailyRecordListQuery>));
  });
  r.get("/sheet", ...farm, requirePermission("production.read"), validate("query", z.object({ date: LocalDate.optional() })), async (req, res) => {
    res.json(await daily.sheet(req.farmCtx!, req.query as { date?: string }));
  });
  return r;
}

/** /api/v1/daily-records/:id — the farm is found from the record, then membership and permission are checked. */
export function dailyRecordRoutes(daily: DailyRecordService, farms: FarmService, repos: Repositories): Router {
  const r = Router();
  const one = [validate("params", z.object({ id: Id })), requireFarmOf((id) => repos.locateDailyRecord(id), farms, "id", "Daily record")];
  const id = (req: Request) => req.params["id"] as string;
  r.get("/:id", ...one, requirePermission("production.read"), async (req, res) => {
    res.json(await daily.get(req.farmCtx!, id(req)));
  });
  r.put("/:id", ...one, requirePermission("production.record"), validate("body", UpdateDailyRecordRequest), async (req, res) => {
    res.json(await daily.update(req.farmCtx!, id(req), req.body, { minimal: wantsMinimal(req) }));
  });
  r.delete("/:id", ...one, requirePermission("production.record"), async (req, res) => {
    await daily.remove(req.farmCtx!, id(req));
    res.status(204).end();
  });
  return r;
}

/** /api/v1/farms/:farmId/dashboard — aggregated on the server so clients never download raw records. */
export function dashboardRoutes(daily: DailyRecordService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const farm = [...farmParams, requireFarm(farms), requirePermission("production.read")];
  r.get("/day", ...farm, validate("query", DashboardDayQuery), async (req, res) => {
    res.json(await daily.dashboardDay(req.farmCtx!, req.query as z.infer<typeof DashboardDayQuery>));
  });
  r.get("/trends", ...farm, validate("query", TrendsQuery), async (req, res) => {
    res.json(await daily.trends(req.farmCtx!, req.query as unknown as z.infer<typeof TrendsQuery>));
  });
  return r;
}

/** /api/v1/farms/:farmId/media — photo upload (raw image body) and farm-scoped download. */
export function mediaRoutes(media: MediaService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const raw = express.raw({ type: () => true, limit: MAX_PHOTO_BYTES });
  r.post("/", ...farmParams, requireFarm(farms), requirePermission("production.record"), raw, async (req, res) => {
    res.status(201).json(await media.upload(req.farmCtx!, req.body as Buffer));
  });
  r.get("/:assetId", validate("params", z.object({ farmId: Id, assetId: Id })), requireFarm(farms), requirePermission("production.read"), async (req, res) => {
    const obj = await media.read(req.farmCtx!, req.params["assetId"] as string);
    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Cache-Control", "private, max-age=86400, immutable");
    res.send(obj.bytes);
  });
  return r;
}
