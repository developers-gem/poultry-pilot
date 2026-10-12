import {
  ArrivalListQuery,
  ArriveRequest,
  BatchListQuery,
  BrooderCheckRequest,
  BroodingProfileRequest,
  BroodingViewQuery,
  BuyerRequest,
  CalendarQuery,
  CandlingRequest,
  ChickOrderRequest,
  CreateHatcheryBatchRequest,
  DeliverOrderRequest,
  GradingRequest,
  HatchRequest,
  HatcherySummaryQuery,
  Id,
  MachineReadingRequest,
  OrderListQuery,
  PlanArrivalRequest,
  PreparationRequest,
  ReasonRequest,
  TransferToHatcherRequest,
} from "@poultrypilot/validation";
import type { Action } from "@poultrypilot/constants";
import { Router, type Request, type RequestHandler } from "express";
import { z } from "zod";
import type { CalendarService } from "../../services/calendar.service.js";
import type { ChickStartService } from "../../services/chickstart.service.js";
import type { FarmService } from "../../services/farm.service.js";
import type { HatcheryService } from "../../services/hatchery.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

const q = <T>(req: Request) => req.query as unknown as T;
const p = (req: Request, k: string) => req.params[k] as string;
const guard = (farms: FarmService) => (action: Action, extra: z.ZodRawShape = {}): RequestHandler[] => [validate("params", z.object({ farmId: Id, ...extra })), requireFarm(farms), requirePermission(action)];

/** /api/v1/farms/:farmId/hatchery */
export function hatcheryRoutes(h: HatcheryService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/summary", ...g("hatchery.read"), validate("query", HatcherySummaryQuery), async (req, res) => res.json(await h.summary(req.farmCtx!, q(req))));
  r.get("/batches", ...g("hatchery.read"), validate("query", BatchListQuery), async (req, res) => res.json({ items: await h.listBatches(req.farmCtx!, q(req)) }));
  r.post("/batches", ...g("hatchery.manage"), validate("body", CreateHatcheryBatchRequest), async (req, res) => res.status(201).json(await h.createBatch(req.farmCtx!, req.body)));
  r.get("/batches/:id", ...g("hatchery.read", { id: Id }), async (req, res) => res.json(await h.getBatch(req.farmCtx!, p(req, "id"))));
  r.post("/batches/:id/candling", ...g("hatchery.record", { id: Id }), validate("body", CandlingRequest), async (req, res) => res.status(201).json(await h.recordCandling(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/batches/:id/transfer", ...g("hatchery.record", { id: Id }), validate("body", TransferToHatcherRequest), async (req, res) => res.status(201).json(await h.recordTransfer(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/batches/:id/hatch", ...g("hatchery.record", { id: Id }), validate("body", HatchRequest), async (req, res) => res.status(201).json(await h.recordHatch(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/batches/:id/grading", ...g("hatchery.record", { id: Id }), validate("body", GradingRequest), async (req, res) => res.status(201).json(await h.recordGrading(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/batches/:id/readings", ...g("hatchery.record", { id: Id }), validate("body", MachineReadingRequest), async (req, res) => res.status(201).json(await h.recordReading(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/batches/:id/reverse", ...g("hatchery.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.status(201).json(await h.reverseLatest(req.farmCtx!, p(req, "id"), req.body.reason)));
  r.post("/batches/:id/cancel", ...g("hatchery.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await h.cancelBatch(req.farmCtx!, p(req, "id"), req.body.reason)));
  return r;
}

/** /api/v1/farms/:farmId/buyers and /chick-orders */
export function chickOrderRoutes(h: HatcheryService, farms: FarmService): { buyers: Router; orders: Router } {
  const g = guard(farms);
  const buyers = Router({ mergeParams: true });
  buyers.get("/", ...g("market.read"), async (req, res) => res.json({ items: await h.listBuyers(req.farmCtx!) }));
  buyers.post("/", ...g("market.manage"), validate("body", BuyerRequest), async (req, res) => res.status(201).json(await h.createBuyer(req.farmCtx!, req.body)));
  const orders = Router({ mergeParams: true });
  orders.get("/", ...g("market.read"), validate("query", OrderListQuery), async (req, res) => res.json({ items: await h.listOrders(req.farmCtx!, q(req)) }));
  orders.post("/", ...g("market.manage"), validate("body", ChickOrderRequest), async (req, res) => res.status(201).json(await h.createChickOrder(req.farmCtx!, req.body)));
  orders.post("/:id/confirm", ...g("market.manage", { id: Id }), async (req, res) => res.json(await h.confirmOrder(req.farmCtx!, p(req, "id"))));
  orders.post("/:id/cancel", ...g("market.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await h.cancelOrder(req.farmCtx!, p(req, "id"), req.body.reason)));
  orders.post("/:id/deliver", ...g("market.manage", { id: Id }), validate("body", DeliverOrderRequest), async (req, res) => res.json(await h.deliverOrder(req.farmCtx!, p(req, "id"), req.body)));
  return { buyers, orders };
}

/** /api/v1/farms/:farmId/chickstart */
export function chickStartRoutes(c: ChickStartService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/profiles", ...g("production.read"), async (req, res) => res.json({ items: await c.listProfiles(req.farmCtx!) }));
  r.post("/profiles", ...g("flock.manage"), validate("body", BroodingProfileRequest), async (req, res) => res.status(201).json(await c.createProfile(req.farmCtx!, req.body)));
  r.get("/arrivals", ...g("production.read"), validate("query", ArrivalListQuery), async (req, res) => res.json({ items: await c.listArrivals(req.farmCtx!, q(req)) }));
  r.post("/arrivals", ...g("flock.manage"), validate("body", PlanArrivalRequest), async (req, res) => res.status(201).json(await c.planArrival(req.farmCtx!, req.body)));
  r.post("/arrivals/:id/preparation", ...g("production.record", { id: Id }), validate("body", PreparationRequest), async (req, res) => res.json(await c.completePreparation(req.farmCtx!, p(req, "id"), req.body.checklist)));
  r.post("/arrivals/:id/arrive", ...g("flock.manage", { id: Id }), validate("body", ArriveRequest), async (req, res) => res.status(201).json(await c.arrive(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/arrivals/:id/cancel", ...g("flock.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await c.cancelArrival(req.farmCtx!, p(req, "id"), req.body.reason)));
  r.post("/checks", ...g("production.record"), validate("body", BrooderCheckRequest), async (req, res) => res.status(201).json(await c.recordCheck(req.farmCtx!, req.body)));
  r.get("/flocks/:flockId", ...g("production.read", { flockId: Id }), validate("query", BroodingViewQuery), async (req, res) => res.json(await c.broodingView(req.farmCtx!, p(req, "flockId"), q(req))));
  return r;
}

/** /api/v1/farms/:farmId/calendar — JSON for the apps, .ics for phone and desktop calendars. */
export function calendarRoutes(cal: CalendarService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/", ...g("farm.read"), validate("query", CalendarQuery), async (req, res) => res.json(await cal.events(req.farmCtx!, q(req))));
  r.get("/ics", ...g("farm.read"), validate("query", CalendarQuery), async (req, res) => {
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="poultrypilot.ics"');
    res.send(await cal.ics(req.farmCtx!, q(req)));
  });
  return r;
}
