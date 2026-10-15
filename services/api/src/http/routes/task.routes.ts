import { CancelTaskRequest, CompleteTaskRequest, CreateTaskRequest, Id, TaskListQuery, UpdateTaskRequest } from "@poultrypilot/validation";
import { Router } from "express";
import { z } from "zod";
import type { FarmService } from "../../services/farm.service.js";
import type { TaskService } from "../../services/task.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

/** /api/v1/farms/:farmId/tasks */
export function taskRoutes(tasks: TaskService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const farm = [validate("params", z.object({ farmId: Id })), requireFarm(farms)] as const;
  const one = [validate("params", z.object({ farmId: Id, taskId: Id })), requireFarm(farms)] as const;
  const id = (req: { params: Record<string, unknown> }) => req.params["taskId"] as string;

  r.get("/", ...farm, requirePermission("task.read"), validate("query", TaskListQuery), async (req, res) => res.json(await tasks.list(req.farmCtx!, req.query as never)));
  r.get("/today", ...farm, requirePermission("task.read"), async (req, res) => res.json(await tasks.today(req.farmCtx!)));
  r.post("/", ...farm, requirePermission("task.manage"), validate("body", CreateTaskRequest), async (req, res) => res.status(201).json(await tasks.create(req.farmCtx!, req.body)));
  r.get("/:taskId", ...one, requirePermission("task.read"), async (req, res) => res.json(await tasks.get(req.farmCtx!, id(req))));
  r.put("/:taskId", ...one, requirePermission("task.manage"), validate("body", UpdateTaskRequest), async (req, res) => res.json(await tasks.update(req.farmCtx!, id(req), req.body)));
  r.post("/:taskId/start", ...one, requirePermission("task.complete"), async (req, res) => res.json(await tasks.start(req.farmCtx!, id(req))));
  r.post("/:taskId/complete", ...one, requirePermission("task.complete"), validate("body", CompleteTaskRequest), async (req, res) => res.json(await tasks.complete(req.farmCtx!, id(req), req.body)));
  r.post("/:taskId/cancel", ...one, requirePermission("task.manage"), validate("body", CancelTaskRequest), async (req, res) => res.json(await tasks.cancel(req.farmCtx!, id(req), req.body.reason)));
  r.post("/:taskId/reopen", ...one, requirePermission("task.manage"), async (req, res) => res.json(await tasks.reopen(req.farmCtx!, id(req))));
  return r;
}
