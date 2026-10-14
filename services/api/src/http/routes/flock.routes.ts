import {
  AdjustmentRequest,
  CloseFlockRequest,
  CreateFlockRequest,
  CullRequest,
  DateRangeQuery,
  FlockListQuery,
  Id,
  LocalDate,
  MergeRequest,
  MetricsQuery,
  MortalityRequest,
  PlaceFlockRequest,
  ReplaceFlockRequest,
  ReverseEventRequest,
  SaleRequest,
  SplitRequest,
  TransferRequest,
  UpsertDailyRecordRequest,
  PatchDailyRecordRequest,
  WeighingRequest,
} from "@poultrypilot/validation";
import type { Action } from "@poultrypilot/constants";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Repositories } from "../../ports/repositories.js";
import type { FarmService } from "../../services/farm.service.js";
import type { DailyRecordService } from "../../services/daily-record.service.js";
import type { FlockService } from "../../services/flock.service.js";
import { requireFarm, requireFarmResource, requirePermission, validate } from "../middleware/core.js";

/**
 * /api/v1/farms/:farmId/flocks — mounted behind authenticate.
 * Chain per route: validate params → requireFarm → requirePermission → requireFarmResource (flock belongs to farm).
 */
export function flockRoutes(flocks: FlockService, farms: FarmService, repos: Repositories, daily: DailyRecordService): Router {
  const r = Router({ mergeParams: true });
  const farm = [validate("params", z.object({ farmId: Id })), requireFarm(farms)];
  const flock = (action: Action, extra: z.ZodRawShape = {}): RequestHandler[] => [
    validate("params", z.object({ farmId: Id, flockId: Id, ...extra })),
    requireFarm(farms),
    requirePermission(action),
    requireFarmResource("flock", "flockId", (farmId, id) => repos.flocks.findById(farmId, id), "Flock"),
  ];
  const fid = (req: { params: Record<string, unknown> }) => req.params["flockId"] as string;
  const q = <T>(req: { query: unknown }) => req.query as T;

  r.get("/", ...farm, requirePermission("production.read"), validate("query", FlockListQuery), async (req, res) => {
    res.json({ items: await flocks.list(req.farmCtx!, q(req)) });
  });
  r.post("/", ...farm, requirePermission("flock.manage"), validate("body", CreateFlockRequest), async (req, res) => {
    res.status(201).json(await flocks.create(req.farmCtx!, req.body));
  });
  r.get("/:flockId", ...flock("production.read"), validate("query", MetricsQuery), async (req, res) => {
    res.json(await flocks.get(req.farmCtx!, fid(req), q(req)));
  });
  r.put("/:flockId", ...flock("flock.manage"), validate("body", ReplaceFlockRequest), async (req, res) => {
    res.json(await flocks.replace(req.farmCtx!, fid(req), req.body));
  });
  r.delete("/:flockId", ...flock("flock.manage"), async (req, res) => {
    await flocks.remove(req.farmCtx!, fid(req));
    res.status(204).end();
  });

  r.get("/:flockId/metrics", ...flock("production.read"), validate("query", MetricsQuery), async (req, res) => {
    res.json(await flocks.metrics(req.farmCtx!, fid(req), q(req)));
  });
  r.get("/:flockId/events", ...flock("production.read"), async (req, res) => {
    res.json({ items: await flocks.listEvents(req.farmCtx!, fid(req)) });
  });

  r.post("/:flockId/placement", ...flock("flock.manage"), validate("body", PlaceFlockRequest), async (req, res) => {
    res.status(201).json(await flocks.place(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/mortality", ...flock("production.record"), validate("body", MortalityRequest), async (req, res) => {
    res.status(201).json(await flocks.recordMortality(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/culls", ...flock("production.record"), validate("body", CullRequest), async (req, res) => {
    res.status(201).json(await flocks.recordCull(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/transfers", ...flock("flock.manage"), validate("body", TransferRequest), async (req, res) => {
    res.status(201).json(await flocks.transfer(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/splits", ...flock("flock.manage"), validate("body", SplitRequest), async (req, res) => {
    res.status(201).json(await flocks.split(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/merge", ...flock("flock.manage"), validate("body", MergeRequest), async (req, res) => {
    res.status(201).json(await flocks.merge(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/sales", ...flock("flock.sell"), validate("body", SaleRequest), async (req, res) => {
    res.status(201).json(await flocks.sell(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/adjustments", ...flock("production.edit_any"), validate("body", AdjustmentRequest), async (req, res) => {
    res.status(201).json(await flocks.adjust(req.farmCtx!, fid(req), req.body));
  });
  r.get("/:flockId/weighings", ...flock("production.read"), async (req, res) => res.json({ items: await flocks.weighings(req.farmCtx!, req.params["flockId"] as string) }));
  r.post("/:flockId/weighings", ...flock("production.record"), validate("body", WeighingRequest), async (req, res) => {
    res.status(201).json(await flocks.weigh(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/close", ...flock("flock.manage"), validate("body", CloseFlockRequest), async (req, res) => {
    res.json(await flocks.close(req.farmCtx!, fid(req), req.body));
  });
  r.post("/:flockId/events/:eventId/reverse", ...flock("production.edit_any", { eventId: Id }), validate("body", ReverseEventRequest), async (req, res) => {
    res.status(201).json(await flocks.reverse(req.farmCtx!, fid(req), req.params["eventId"] as string, req.body.reason));
  });

  // Per-flock shortcuts onto the daily records module (same service, same rules).
  r.get("/:flockId/daily-records", ...flock("production.read"), validate("query", DateRangeQuery.extend({ cursor: z.string().max(500).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) })), async (req, res) => {
    const query = q<{ from?: string; to?: string; cursor?: string; limit: number }>(req);
    res.json(await daily.list(req.farmCtx!, { ...query, flockId: fid(req) }));
  });
  r.get("/:flockId/daily-records/:date", ...flock("production.read", { date: LocalDate }), async (req, res) => {
    res.json(await daily.getByFlockDate(req.farmCtx!, fid(req), req.params["date"] as string));
  });
  // Only the sections sent are changed; the rest of the day stays as recorded.
  r.patch("/:flockId/daily-records/:date", ...flock("production.record", { date: LocalDate }), validate("body", PatchDailyRecordRequest), async (req, res) =>
    res.json(await daily.patchByFlockDate(req.farmCtx!, req.params["flockId"] as string, req.params["date"] as string, req.body)),
  );
  r.put("/:flockId/daily-records/:date", ...flock("production.record", { date: LocalDate }), validate("body", UpsertDailyRecordRequest), async (req, res) => {
    const minimal = /\breturn=minimal\b/i.test(req.header("prefer") ?? "");
    res.json(await daily.upsertByFlockDate(req.farmCtx!, fid(req), req.params["date"] as string, req.body, { minimal }));
  });
  return r;
}
