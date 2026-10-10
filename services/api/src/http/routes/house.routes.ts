import { CreateHouseRequest, Id, ReplaceHouseRequest } from "@poultrypilot/validation";
import { Router } from "express";
import { z } from "zod";
import type { FarmService } from "../../services/farm.service.js";
import type { HouseService } from "../../services/house.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

/** /api/v1/farms/:farmId/houses — mounted behind authenticate. */
export function houseRoutes(houses: HouseService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const farm = [validate("params", z.object({ farmId: Id }).passthrough()), requireFarm(farms)];
  const one = [validate("params", z.object({ farmId: Id, houseId: Id })), requireFarm(farms)];
  r.get("/", ...farm, requirePermission("production.read"), async (req, res) => {
    res.json({ items: await houses.list(req.farmCtx!) });
  });
  r.post("/", ...farm, requirePermission("flock.manage"), validate("body", CreateHouseRequest), async (req, res) => {
    res.status(201).json(await houses.create(req.farmCtx!, req.body));
  });
  r.get("/:houseId", ...one, requirePermission("production.read"), async (req, res) => {
    res.json(await houses.get(req.farmCtx!, req.params["houseId"] as string));
  });
  r.put("/:houseId", ...one, requirePermission("flock.manage"), validate("body", ReplaceHouseRequest), async (req, res) => {
    res.json(await houses.replace(req.farmCtx!, req.params["houseId"] as string, req.body));
  });
  r.delete("/:houseId", ...one, requirePermission("flock.manage"), async (req, res) => {
    await houses.remove(req.farmCtx!, req.params["houseId"] as string);
    res.status(204).end();
  });
  return r;
}
