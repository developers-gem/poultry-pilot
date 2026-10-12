import {
  BrowseQuery,
  BuyerUpdateRequest,
  DeliverOrderRequest,
  DeliveredRequest,
  DispatchRequest,
  DocumentListQuery,
  ExpenseRequest,
  Id,
  IncomeRequest,
  LedgerQuery,
  ListingRequest,
  ListingStatusRequest,
  MoneyAccountRequest,
  MyListingsQuery,
  OptionalPeriodQuery,
  OrderListQueryMarket,
  PauseRequest,
  PaymentRequest,
  PeriodQuery,
  PlaceOrderRequest,
  ProfitabilityQuery,
  ReasonRequest,
  RecurringExpenseRequest,
  RefundRequest,
  SupplierRequest,
  TransferRequestMoney,
  UpdateListingRequest,
} from "@poultrypilot/validation";
import type { Action } from "@poultrypilot/constants";
import { Router, type Request, type RequestHandler } from "express";
import { z } from "zod";
import type { FarmService } from "../../services/farm.service.js";
import type { FinanceService } from "../../services/finance.service.js";
import type { MarketService } from "../../services/market.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

const q = <T>(req: Request) => req.query as unknown as T;
const p = (req: Request, k: string) => req.params[k] as string;
const guard = (farms: FarmService) => (action: Action, extra: z.ZodRawShape = {}): RequestHandler[] => [validate("params", z.object({ farmId: Id, ...extra })), requireFarm(farms), requirePermission(action)];
const ctxOf = (req: Request) => ({ userId: req.auth!.userId, sessionId: req.auth!.sessionId, requestId: req.id as string });

/** /api/v1/farms/:farmId/finance */
export function financeRoutes(f: FinanceService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/suppliers", ...g("money.read"), async (req, res) => res.json({ items: await f.listSuppliers(req.farmCtx!) }));
  r.post("/suppliers", ...g("money.record"), validate("body", SupplierRequest), async (req, res) => res.status(201).json(await f.createSupplier(req.farmCtx!, req.body)));
  r.get("/suppliers/:id", ...g("money.read", { id: Id }), async (req, res) => res.json(await f.supplierStatement(req.farmCtx!, p(req, "id"))));
  r.get("/accounts", ...g("money.read"), async (req, res) => res.json({ items: await f.listAccounts(req.farmCtx!) }));
  r.post("/accounts", ...g("money.record"), validate("body", MoneyAccountRequest), async (req, res) => res.status(201).json(await f.createAccount(req.farmCtx!, req.body)));
  r.post("/transfers", ...g("money.record"), validate("body", TransferRequestMoney), async (req, res) => res.status(201).json(await f.transfer(req.farmCtx!, req.body)));
  r.get("/ledger", ...g("money.read"), validate("query", LedgerQuery), async (req, res) => res.json({ items: await f.ledger(req.farmCtx!, q(req)) }));

  for (const [path, type, schema] of [["expenses", "expense", ExpenseRequest], ["incomes", "income", IncomeRequest]] as const) {
    r.get(`/${path}`, ...g("money.read"), validate("query", DocumentListQuery), async (req, res) => res.json({ items: await f.listDocuments(req.farmCtx!, type, q(req)) }));
    r.post(`/${path}`, ...g("money.record"), validate("body", schema), async (req, res) => res.status(201).json(type === "expense" ? await f.createExpense(req.farmCtx!, req.body) : await f.createIncome(req.farmCtx!, req.body)));
    r.get(`/${path}/:id`, ...g("money.read", { id: Id }), async (req, res) => res.json(await f.getDocument(req.farmCtx!, type, p(req, "id"))));
    r.post(`/${path}/:id/payments`, ...g("payment.record", { id: Id }), validate("body", PaymentRequest), async (req, res) => res.status(201).json(await f.pay(req.farmCtx!, type, p(req, "id"), req.body)));
    r.post(`/${path}/:id/refunds`, ...g("money.record", { id: Id }), validate("body", RefundRequest), async (req, res) => res.status(201).json(await f.refund(req.farmCtx!, type, p(req, "id"), req.body)));
    r.post(`/${path}/:id/cancel`, ...g("money.delete", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await f.cancel(req.farmCtx!, type, p(req, "id"), req.body.reason)));
  }

  r.get("/recurring", ...g("money.read"), async (req, res) => res.json({ items: await f.listRecurring(req.farmCtx!) }));
  r.post("/recurring", ...g("money.record"), validate("body", RecurringExpenseRequest), async (req, res) => res.status(201).json(await f.createRecurring(req.farmCtx!, req.body)));
  r.post("/recurring/generate", ...g("money.record"), async (req, res) => res.json(await f.generateDue(req.farmCtx!)));
  r.post("/recurring/:id/pause", ...g("money.record", { id: Id }), validate("body", PauseRequest), async (req, res) => res.json(await f.pauseRecurring(req.farmCtx!, p(req, "id"), req.body)));

  r.get("/reports/pnl", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.profitAndLoss(req.farmCtx!, q(req))));
  r.get("/reports/cash-flow", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.cashFlow(req.farmCtx!, q(req))));
  r.get("/reports/expenses", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.expenseBreakdown(req.farmCtx!, q(req))));
  r.get("/reports/revenue", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.revenueBreakdown(req.farmCtx!, q(req))));
  r.get("/reports/receivables", ...g("money.read"), async (req, res) => res.json(await f.openItems(req.farmCtx!, "income")));
  r.get("/reports/payables", ...g("money.read"), async (req, res) => res.json(await f.openItems(req.farmCtx!, "expense")));
  r.get("/reports/flock-profitability", ...g("money.read"), validate("query", ProfitabilityQuery), async (req, res) => res.json(await f.flockProfitability(req.farmCtx!, q(req))));
  r.get("/reports/house-costing", ...g("money.read"), validate("query", OptionalPeriodQuery), async (req, res) => res.json(await f.houseCosting(req.farmCtx!, q(req))));
  return r;
}

/** Seller side: /api/v1/farms/:farmId/market */
export function sellerMarketRoutes(m: MarketService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  const g = guard(farms);
  r.get("/listings", ...g("market.read"), validate("query", MyListingsQuery), async (req, res) => res.json({ items: await m.myListings(req.farmCtx!, q(req)) }));
  r.post("/listings", ...g("market.manage"), validate("body", ListingRequest), async (req, res) => res.status(201).json(await m.createListing(req.farmCtx!, req.body)));
  r.put("/listings/:id", ...g("market.manage", { id: Id }), validate("body", UpdateListingRequest), async (req, res) => res.json(await m.updateListing(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/listings/:id/status", ...g("market.manage", { id: Id }), validate("body", ListingStatusRequest), async (req, res) => res.json(await m.setListingStatus(req.farmCtx!, p(req, "id"), req.body.status)));
  r.get("/orders", ...g("market.read"), validate("query", OrderListQueryMarket), async (req, res) => res.json({ items: await m.sellerOrders(req.farmCtx!, q(req)) }));
  r.get("/orders/:id", ...g("market.read", { id: Id }), async (req, res) => res.json(await m.sellerOrder(req.farmCtx!, p(req, "id"))));
  r.post("/orders/:id/accept", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "accepted")));
  r.post("/orders/:id/prepare", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "preparing")));
  r.post("/orders/:id/dispatch", ...g("market.manage", { id: Id }), validate("body", DispatchRequest), async (req, res) => res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "dispatched", { delivery: req.body })));
  r.post("/orders/:id/deliver", ...g("market.manage", { id: Id }), validate("body", DeliveredRequest), async (req, res) => {
    const { date, ...delivery } = req.body as { date?: string; receivedBy?: string; proofAssetId?: string };
    res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "delivered", { delivery, ...(date ? { date } : {}) }));
  });
  r.post("/orders/:id/complete", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "completed")));
  r.post("/orders/:id/cancel", ...g("market.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "cancelled", { reason: req.body.reason })));
  r.post("/orders/:id/payments", ...g("payment.record", { id: Id }), validate("body", PaymentRequest), async (req, res) => res.status(201).json(await m.recordPayment(req.farmCtx!, p(req, "id"), req.body)));
  r.post("/orders/:id/refunds", ...g("money.record", { id: Id }), validate("body", RefundRequest), async (req, res) => {
    const { reason, ...rest } = req.body as z.infer<typeof RefundRequest>;
    res.status(201).json(await m.recordRefund(req.farmCtx!, p(req, "id"), { ...rest, note: reason }));
  });
  return r;
}

/** Chick-order status moves and buyer management, through the marketplace state machine. */
export function chickOrderActions(m: MarketService, farms: FarmService): { orders: Router; buyers: Router } {
  const g = guard(farms);
  const orders = Router({ mergeParams: true });
  orders.post("/:id/confirm", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "accepted")));
  orders.post("/:id/cancel", ...g("market.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await m.sellerAct(req.farmCtx!, p(req, "id"), "cancelled", { reason: req.body.reason })));
  orders.post("/:id/deliver", ...g("market.manage", { id: Id }), validate("body", DeliverOrderRequest), async (req, res) => {
    const order = await m.sellerAct(req.farmCtx!, p(req, "id"), "delivered", { date: req.body.date });
    res.json({ order });
  });
  orders.post("/:id/payments", ...g("payment.record", { id: Id }), validate("body", PaymentRequest), async (req, res) => res.status(201).json(await m.recordPayment(req.farmCtx!, p(req, "id"), req.body)));
  const buyers = Router({ mergeParams: true });
  buyers.get("/:id", ...g("market.read", { id: Id }), async (req, res) => res.json(await m.buyerDetail(req.farmCtx!, p(req, "id"))));
  buyers.put("/:id", ...g("market.manage", { id: Id }), validate("body", BuyerUpdateRequest), async (req, res) => res.json(await m.updateBuyer(req.farmCtx!, p(req, "id"), req.body)));
  return { orders, buyers };
}

/** Buyer side: /api/v1/market (any signed-in user). */
export function buyerMarketRoutes(m: MarketService): Router {
  const r = Router();
  r.get("/listings", validate("query", BrowseQuery), async (req, res) => res.json({ items: await m.browse(ctxOf(req), q(req)) }));
  r.get("/listings/:id", validate("params", z.object({ id: Id })), async (req, res) => res.json(await m.listing(ctxOf(req), p(req, "id"))));
  r.post("/orders", validate("body", PlaceOrderRequest), async (req, res) => res.status(201).json(await m.placeOrder(ctxOf(req), req.body)));
  r.get("/orders", async (req, res) => res.json({ items: await m.myPurchases(ctxOf(req)) }));
  r.get("/orders/:id", validate("params", z.object({ id: Id })), async (req, res) => res.json(await m.buyerOrder(ctxOf(req), p(req, "id"))));
  r.post("/orders/:id/cancel", validate("params", z.object({ id: Id })), validate("body", ReasonRequest), async (req, res) => res.json(await m.buyerAct(ctxOf(req), p(req, "id"), "cancelled", req.body.reason)));
  r.post("/orders/:id/received", validate("params", z.object({ id: Id })), async (req, res) => res.json(await m.buyerAct(ctxOf(req), p(req, "id"), "delivered")));
  r.post("/orders/:id/complete", validate("params", z.object({ id: Id })), async (req, res) => res.json(await m.buyerAct(ctxOf(req), p(req, "id"), "completed")));
  return r;
}
