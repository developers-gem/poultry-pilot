import {
  AlertsQuery,
  ChickLotsQuery,
  CreateInventoryItemRequest,
  EggMovementRequest,
  FeedAnalyticsQuery,
  FeedConsumptionRequest,
  FeedListQuery,
  Id,
  InventoryListQuery,
  IssueRequest,
  LotsQuery,
  PurchaseRequest,
  ReceiveChicksRequest,
  StockCountRequest,
  TransactionsQuery,
  UpdateInventoryItemRequest,
  WastageRequest,
  WaterListQuery,
} from "@poultrypilot/validation";
import type { Action } from "@poultrypilot/constants";
import { Router, type Request, type RequestHandler } from "express";
import { z } from "zod";
import type { Repositories } from "../../ports/repositories.js";
import type { AlertService } from "../../services/alert.service.js";
import type { FarmService } from "../../services/farm.service.js";
import type { FeedService } from "../../services/feed.service.js";
import type { InventoryService } from "../../services/inventory.service.js";
import { requireFarm, requireFarmResource, requirePermission, validate } from "../middleware/core.js";

const q = <T>(req: Request) => req.query as unknown as T;

/** /api/v1/farms/:farmId/inventory */
export function inventoryRoutes(inv: InventoryService, farms: FarmService, repos: Repositories): Router {
  const r = Router({ mergeParams: true });
  const farm = (a: Action): RequestHandler[] => [validate("params", z.object({ farmId: Id })), requireFarm(farms), requirePermission(a)];
  const item = (a: Action): RequestHandler[] => [
    validate("params", z.object({ farmId: Id, itemId: Id })),
    requireFarm(farms),
    requirePermission(a),
    requireFarmResource("item", "itemId", (farmId, id) => repos.inventoryItems.findById(farmId, id), "Inventory item"),
  ];
  const iid = (req: Request) => req.params["itemId"] as string;

  r.get("/overview", ...farm("inventory.read"), async (req, res) => res.json(await inv.overview(req.farmCtx!)));
  r.get("/items", ...farm("inventory.read"), validate("query", InventoryListQuery), async (req, res) => res.json({ items: await inv.listItems(req.farmCtx!, q(req)) }));
  r.post("/items", ...farm("inventory.manage"), validate("body", CreateInventoryItemRequest), async (req, res) => res.status(201).json(await inv.createItem(req.farmCtx!, req.body)));
  r.get("/items/:itemId", ...item("inventory.read"), async (req, res) => res.json(await inv.getItem(req.farmCtx!, iid(req))));
  r.put("/items/:itemId", ...item("inventory.manage"), validate("body", UpdateInventoryItemRequest), async (req, res) => res.json(await inv.updateItem(req.farmCtx!, iid(req), req.body)));
  r.post("/items/:itemId/purchases", ...item("inventory.manage"), validate("body", PurchaseRequest), async (req, res) => res.status(201).json(await inv.receivePurchase(req.farmCtx!, iid(req), req.body)));
  r.post("/items/:itemId/issues", ...item("inventory.issue"), validate("body", IssueRequest), async (req, res) => res.status(201).json(await inv.issue(req.farmCtx!, iid(req), req.body)));
  r.post("/items/:itemId/wastage", ...item("inventory.issue"), validate("body", WastageRequest), async (req, res) => res.status(201).json(await inv.wastage(req.farmCtx!, iid(req), req.body)));
  r.post("/items/:itemId/counts", ...item("inventory.manage"), validate("body", StockCountRequest), async (req, res) => res.status(201).json(await inv.stockCount(req.farmCtx!, iid(req), req.body)));
  r.get("/items/:itemId/transactions", ...item("inventory.read"), validate("query", TransactionsQuery), async (req, res) => res.json({ items: await inv.transactions(req.farmCtx!, iid(req), q(req)) }));
  r.get("/lots", ...farm("inventory.read"), validate("query", LotsQuery), async (req, res) => res.json({ items: await inv.lots(req.farmCtx!, q(req)) }));
  r.get("/eggs", ...farm("inventory.read"), async (req, res) => res.json(await inv.eggStock(req.farmCtx!)));
  r.post("/eggs/movements", ...farm("inventory.issue"), validate("body", EggMovementRequest), async (req, res) => res.status(201).json(await inv.eggMovement(req.farmCtx!, req.body)));
  r.get("/chick-lots", ...farm("inventory.read"), validate("query", ChickLotsQuery), async (req, res) => res.json({ items: await inv.chickLots(req.farmCtx!, q(req)) }));
  r.post("/chick-lots", ...farm("inventory.manage"), validate("body", ReceiveChicksRequest), async (req, res) => res.status(201).json(await inv.receiveChicks(req.farmCtx!, req.body)));
  return r;
}

/** /api/v1/farms/:farmId/feed and /water-records */
export function feedRoutes(feed: FeedService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const farm = (a: Action): RequestHandler[] => [validate("params", z.object({ farmId: Id })), requireFarm(farms), requirePermission(a)];
  r.post("/consumption", ...farm("inventory.issue"), validate("body", FeedConsumptionRequest), async (req, res) => res.status(201).json(await feed.consume(req.farmCtx!, req.body)));
  r.get("/consumption", ...farm("inventory.read"), validate("query", FeedListQuery), async (req, res) => res.json({ items: await feed.list(req.farmCtx!, q(req)) }));
  r.delete("/consumption/:id", validate("params", z.object({ farmId: Id, id: Id })), requireFarm(farms), requirePermission("inventory.issue"), async (req, res) => {
    await feed.removeEntry(req.farmCtx!, req.params["id"] as string);
    res.status(204).end();
  });
  r.get("/stock", ...farm("inventory.read"), async (req, res) => res.json(await feed.stock(req.farmCtx!)));
  r.get("/analytics", ...farm("production.read"), validate("query", FeedAnalyticsQuery), async (req, res) => res.json(await feed.analytics(req.farmCtx!, q(req))));
  return r;
}

export function waterRoutes(feed: FeedService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  r.get("/", validate("params", z.object({ farmId: Id })), requireFarm(farms), requirePermission("production.read"), validate("query", WaterListQuery), async (req, res) => res.json({ items: await feed.water(req.farmCtx!, q(req)) }));
  return r;
}

/** /api/v1/farms/:farmId/alerts */
export function alertRoutes(alerts: AlertService, farms: FarmService, evaluate: (ctx: import("../../services/context.js").FarmContext) => Promise<unknown>): Router {
  const r = Router({ mergeParams: true });
  const farm = [validate("params", z.object({ farmId: Id })), requireFarm(farms)];
  r.get("/", ...farm, requirePermission("farm.read"), validate("query", AlertsQuery), async (req, res) => res.json(await alerts.list(req.farmCtx!, q(req))));
  r.post("/evaluate", ...farm, requirePermission("alert.manage"), async (req, res) => res.json({ evaluatedAt: new Date().toISOString(), rules: await evaluate(req.farmCtx!) }));
  r.post("/:alertId/acknowledge", validate("params", z.object({ farmId: Id, alertId: Id })), requireFarm(farms), requirePermission("alert.manage"), async (req, res) => {
    res.json(await alerts.acknowledge(req.farmCtx!, req.params["alertId"] as string));
  });
  return r;
}
