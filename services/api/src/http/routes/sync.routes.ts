import { SyncPullQuery, SyncPushRequest } from "@poultrypilot/validation";
import { Router } from "express";
import type { z } from "zod";
import type { FarmService } from "../../services/farm.service.js";
import type { SyncService } from "../../services/sync.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

export function syncRoutes(sync: SyncService, farms: FarmService): Router {
  const r = Router();
  r.get("/pull", validate("query", SyncPullQuery), requireFarm(farms, "query"), requirePermission("farm.read"), async (req, res) => {
    const q = req.query as unknown as z.infer<typeof SyncPullQuery>;
    res.json(await sync.pull(req.farmCtx!.farmId, q.since, q.limit));
  });
  r.post("/push", validate("body", SyncPushRequest), requireFarm(farms, "body"), async (req, res) => {
    res.json({ results: await sync.push(req.farmCtx!, req.body) });
  });
  return r;
}
