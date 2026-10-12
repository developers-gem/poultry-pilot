import type { OrderStatus } from "@poultrypilot/types";
import { ORDER_TRANSITIONS, RESERVING_STATUSES, assertOrderTransition, localDateOf, q3, type OrderActor } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { FarmRecord, MarketListingRecord, MoneyValue, OrderPaymentRecord, OrderRecord, TransactionRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext, type RequestContext } from "./context.js";
import type { FinanceService } from "./finance.service.js";
import type { FlockService } from "./flock.service.js";
import type { HatcheryService } from "./hatchery.service.js";
import type { InventoryService } from "./inventory.service.js";
import type { SyncService } from "./sync.service.js";

const EGG_UNITS: Record<string, number> = { egg: 1, eggs: 1, dozen: 12, tray: 30 };

export interface ListingInput {
  title: string;
  category: MarketListingRecord["category"];
  product?: MarketListingRecord["product"];
  description?: string;
  quantityAvailable: number;
  minOrderQuantity?: number;
  unit: string;
  price: MoneyValue;
  priceUnit: MarketListingRecord["priceUnit"];
  regionCode: string;
  locationLabel?: string;
  availableFrom?: string;
  availableUntil?: string;
  fulfilmentOptions: OrderRecord["fulfilment"][];
  photos?: string[];
  source?: MarketListingRecord["source"];
}

/**
 * PoultryMarket. Sellers are farms; buyers are signed-in users (optionally buying for one of their farms).
 * Prices always come from the listing. Seller contact is shown to a buyer only after the seller accepts the order.
 * Every status change goes through assertOrderTransition; accepted orders reserve listing quantity; delivery moves
 * stock; acceptance creates the receivable in Finance and payments settle it.
 */
export function createMarketService(d: { repos: Repositories; clock: Clock; audit: AuditService; sync: SyncService; finance: FinanceService; flocks: FlockService; inventory: InventoryService; hatchery: HatcheryService }) {
  const { repos, clock } = d;
  const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
  const strip = <T extends { farmId: string; deletedAt?: Date; deletedBy?: string; createdAt: Date; updatedAt: Date }>({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }: T) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  });

  async function farmOf(farmId: string, tx?: Tx): Promise<FarmRecord> {
    const f = await repos.farms.findById(farmId, tx);
    if (!f) throw notFound("Farm");
    return f;
  }
  const todayOf = (farm: FarmRecord) => localDateOf(clock.now(), farm.settings.timezone);

  async function validateListing(ctx: FarmContext, farm: FarmRecord, i: ListingInput, tx?: Tx) {
    if (i.price.currency !== farm.settings.currency) throw new AppError("VALIDATION_FAILED", `Price must be in the farm currency (${farm.settings.currency})`);
    if (!(i.price.amountMinor > 0)) throw new AppError("VALIDATION_FAILED", "Price must be more than zero");
    for (const p of i.photos ?? []) if (!(await repos.mediaAssets.findById(ctx.farmId, p, tx))) throw new AppError("NOT_FOUND", `Photo ${p} not found on this farm`);
    const s = i.source;
    if (!s) return;
    if (s.kind === "eggs") {
      if (i.category !== "eggs" && i.category !== "hatching_eggs") throw new AppError("VALIDATION_FAILED", "An egg stock source needs an egg listing");
      if (!EGG_UNITS[i.unit.toLowerCase()]) throw new AppError("VALIDATION_FAILED", `Egg listings are sold per ${Object.keys(EGG_UNITS).join(", ")}`);
    }
    if (s.kind === "chick_lot") {
      if (!s.chickLotId || !(await repos.chickLots.findById(ctx.farmId, s.chickLotId, tx))) throw notFound("Chick lot");
      if (i.category !== "day_old_chicks") throw new AppError("VALIDATION_FAILED", "A chick lot source needs a day-old chicks listing");
    }
    if (s.kind === "flock") {
      const f = s.flockId ? await repos.flocks.findById(ctx.farmId, s.flockId, tx) : null;
      if (!f) throw notFound("Flock");
      if (i.category !== "live_birds") throw new AppError("VALIDATION_FAILED", "A flock source needs a live birds listing");
    }
  }

  const listingView = (l: MarketListingRecord) => strip(l);

  /** What a buyer may see: the listing and the seller's farm name and area, never contact details. */
  async function publicListing(l: MarketListingRecord) {
    const farm = await repos.farms.findById(l.farmId);
    const { source: _s, ...rest } = strip(l);
    return { ...rest, seller: { farmId: l.farmId, name: farm?.name ?? "", locationLabel: farm?.locationLabel ?? null, countryCode: farm?.countryCode ?? null } };
  }

  function orderView(o: OrderRecord, viewer: OrderActor, sellerContact?: { name: string; email: string; phone?: string } | null) {
    const base = strip(o);
    const shareContact = viewer === "seller" || !["pending", "cancelled"].includes(o.status);
    return {
      ...base,
      quantity: o.lines.reduce((t, l) => t + l.quantity, 0),
      outstandingMinor: o.total.amountMinor - (o.amountPaid?.amountMinor ?? 0),
      ...(viewer === "buyer" ? { sellerContact: shareContact ? sellerContact ?? null : null } : {}),
      /** Moves the state machine allows from here (for the apps' buttons). */
      nextStatuses: ORDER_TRANSITIONS[o.status].filter((s) => !(o.fulfilment === "pickup" && s === "dispatched") && !(o.fulfilment !== "pickup" && s === "delivered" && o.status !== "dispatched")),
    };
  }

  async function sellerContact(farmId: string) {
    const owners = (await repos.memberships.findByFarm(farmId)).filter((m) => m.role === "owner" && m.status === "active");
    const user = owners[0]?.userId ? await repos.users.findById(owners[0].userId) : null;
    return user ? defined({ name: user.fullName, email: user.email, phone: user.phone }) : null;
  }

  // ---- the state machine and its side effects -----------------------------------------------

  async function drawStock(ctx: FarmContext, o: OrderRecord, listing: MarketListingRecord | null, date: string, tx: Tx): Promise<Partial<OrderRecord>> {
    const line = o.lines[0]!;
    const lotId = line.chickLotId ?? (listing?.source?.kind === "chick_lot" ? listing.source.chickLotId : undefined) ?? (o.hatcheryBatchId ? (await repos.hatcheryBatches.findById(ctx.farmId, o.hatcheryBatchId, tx))?.chickLotId : undefined);
    if (lotId || o.hatcheryBatchId) {
      if (!lotId) throw new AppError("VALIDATION_FAILED", "The batch for this order has not been graded yet; there are no chicks to deliver");
      const lot = await repos.chickLots.findById(ctx.farmId, lotId, tx);
      if (!lot) throw notFound("Chick lot");
      const a = await d.hatchery.lotAvailability(ctx, lot, o.id, tx);
      if (line.quantity > a.available) throw new AppError("INSUFFICIENT_STOCK", `Only ${Math.max(0, a.available)} chicks are free in the lot (${lot.remaining} remaining, ${a.reserved} booked by other orders)`, a);
      const remaining = lot.remaining - line.quantity;
      const next = await repos.chickLots.update(ctx.farmId, lot.id, { remaining, status: remaining === 0 ? "depleted" : "available", updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: lot.version }, tx);
      if (!next) throw new AppError("VERSION_CONFLICT", "That chick lot changed at the same time elsewhere. Try again.");
      return { lines: [{ ...line, chickLotId: lot.id }] };
    }
    if (listing?.source?.kind === "eggs") {
      const eggs = Math.round(line.quantity * EGG_UNITS[listing.unit.toLowerCase()]!);
      const stock = await d.inventory.eggStock(ctx, tx);
      const bucket = listing.source.eggGrade ?? "ungraded";
      const available = stock.byGrade[bucket] ?? 0;
      if (eggs > available) throw new AppError("INSUFFICIENT_STOCK", `Only ${available} ${bucket} eggs in stock for this order of ${eggs}`, { available, requested: eggs });
      const now = clock.now();
      await repos.eggInventory.insert({ id: newId(), farmId: ctx.farmId, date, type: "sold", ...(listing.source.eggGrade ? { grade: listing.source.eggGrade } : {}), quantityDelta: -eggs, sourceType: "order", sourceId: o.id, note: `Order ${o.orderNumber}`, createdBy: ctx.userId, createdAt: now, updatedAt: now }, tx);
    }
    if (listing?.source?.kind === "flock") {
      // Through the flock engine, so bird counts, withdrawal periods and FCR all apply; the order carries the income.
      await d.flocks.sell(ctx, listing.source.flockId!, { date, birds: Math.round(line.quantity), total: line.total, notes: `Order ${o.orderNumber}` }, { orderId: o.id });
    }
    return {};
  }

  /**
   * Moves an order to `to`, enforcing the state machine and who may make the move, with every side effect in the same
   * transaction: reservations on accept and cancel, the receivable on accept, stock on delivery.
   */
  async function transition(ctx: FarmContext, actor: OrderActor, id: string, to: OrderStatus, extra: { reason?: string; delivery?: OrderRecord["delivery"]; date?: string } = {}) {
    return repos.tx.run(async (tx) => {
      const farm = await farmOf(ctx.farmId, tx);
      const o = await repos.orders.findById(ctx.farmId, id, tx);
      if (!o) throw notFound("Order");
      assertOrderTransition(o, to, actor);
      const listing = o.listingId ? await repos.listings.findById(ctx.farmId, o.listingId, tx) : null;
      const line = o.lines[0]!;
      let patch: Partial<OrderRecord> = {};

      if (to === "accepted") {
        if (listing) {
          if (listing.status !== "active" && listing.status !== "sold_out") throw new AppError("INVALID_STATE_TRANSITION", `The listing is ${listing.status}`);
          if (line.quantity > listing.quantityAvailable) throw new AppError("INSUFFICIENT_STOCK", `Only ${listing.quantityAvailable} ${listing.unit} left on the listing`, { available: listing.quantityAvailable });
          const left = q3(listing.quantityAvailable - line.quantity);
          const ok = await repos.listings.update(ctx.farmId, listing.id, { quantityAvailable: left, status: left <= 0 ? "sold_out" : listing.status, updatedAt: clock.now() }, { expectedVersion: listing.version }, tx);
          if (!ok) throw new AppError("VERSION_CONFLICT", "The listing changed at the same time elsewhere. Try again.");
        }
        const income = await d.finance.onOrderAccepted(ctx, o, tx);
        patch = { incomeId: income.id };
      }
      if (to === "cancelled") {
        if ((o.amountPaid?.amountMinor ?? 0) > 0) throw new AppError("INVALID_STATE_TRANSITION", `Payments of ${o.amountPaid!.amountMinor} are recorded on this order; refund them before cancelling`);
        if (listing && RESERVING_STATUSES.includes(o.status)) {
          const back = q3(listing.quantityAvailable + line.quantity);
          await repos.listings.update(ctx.farmId, listing.id, { quantityAvailable: back, status: listing.status === "sold_out" ? "active" : listing.status, updatedAt: clock.now() }, { expectedVersion: listing.version }, tx);
        }
        await d.finance.onOrderCancelled(ctx, o, tx);
        patch = { cancelReason: extra.reason ?? "", cancelledBy: actor };
      }
      if (to === "dispatched") patch = { delivery: defined({ ...o.delivery, ...extra.delivery, dispatchedAt: clock.now() }) };
      if (to === "delivered") {
        const date = extra.date ?? todayOf(farm);
        if (date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${date} is in the future for this farm`);
        if (extra.delivery?.proofAssetId && !(await repos.mediaAssets.findById(ctx.farmId, extra.delivery.proofAssetId, tx))) throw new AppError("NOT_FOUND", "Proof of delivery image not found");
        patch = { ...(await drawStock(ctx, o, listing, date, tx)), deliveredDate: date, delivery: defined({ ...o.delivery, ...extra.delivery, deliveredAt: clock.now() }) };
      }
      const now = clock.now();
      const fresh = (await repos.orders.findById(ctx.farmId, id, tx))!;
      const next = await repos.orders.update(ctx.farmId, id, { ...patch, status: to, statusHistory: [...fresh.statusHistory, { status: to, at: now, by: ctx.userId }], updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: fresh.version }, tx);
      if (!next) throw new AppError("VERSION_CONFLICT", "This order was changed at the same time. Reload and try again.");
      await d.audit.record(ctx, { action: `order.${to}`, entity: "order", entityId: id, before: { status: o.status }, after: { status: to, by: actor, ...(extra.reason ? { reason: extra.reason } : {}) } }, tx);
      await d.sync.recordChange(ctx.farmId, { entity: "order", entityId: id, op: "upsert", version: next.version }, tx);
      return next;
    });
  }

  /** The buyer acts on the seller's order; their identity is checked against the order, not a farm role. */
  async function asBuyer(ctx: RequestContext, id: string): Promise<{ order: OrderRecord; sellerCtx: FarmContext }> {
    const o = await repos.market.orderById(id);
    if (!o || o.buyerUserId !== ctx.userId) throw notFound("Order");
    return { order: o, sellerCtx: { ...ctx, farmId: o.farmId, role: "worker", membershipId: "buyer" } };
  }

  async function recordMoney(ctx: FarmContext, id: string, kind: "payment" | "refund", r: { date: string; amount: MoneyValue; accountId: string; method: TransactionRecord["paymentMethod"]; reference?: string; note?: string }) {
    return repos.tx.run(async (tx) => {
      const o = await repos.orders.findById(ctx.farmId, id, tx);
      if (!o) throw notFound("Order");
      if (!o.incomeId) throw new AppError("INVALID_STATE_TRANSITION", "Accept the order before recording payments");
      if (o.status === "cancelled" && kind === "payment") throw new AppError("INVALID_STATE_TRANSITION", "This order is cancelled");
      const out = await d.finance.settle(ctx, "income", o.incomeId, kind, { date: r.date, amountMinor: r.amount.amountMinor, accountId: r.accountId, ...defined({ method: r.method, reference: r.reference, description: r.note, orderId: o.id }) }, tx);
      const now = clock.now();
      const pay: OrderPaymentRecord = { id: newId(), farmId: ctx.farmId, orderId: o.id, kind, date: r.date, amount: r.amount, method: r.method!, transactionId: out.transaction.id, accountId: r.accountId, ...defined({ reference: r.reference, note: r.note }), createdBy: ctx.userId, createdAt: now, updatedAt: now };
      await repos.orderPayments.insert(pay, tx);
      const paid = out.document.amountPaid;
      const status: OrderRecord["paymentStatus"] = paid.amountMinor <= 0 ? (kind === "refund" ? "refunded" : "unpaid") : paid.amountMinor >= o.total.amountMinor ? "paid" : "partially_paid";
      const next = await repos.orders.update(ctx.farmId, o.id, { amountPaid: paid, paymentStatus: status, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: o.version }, tx);
      await d.audit.record(ctx, { action: `order.${kind}`, entity: "order", entityId: o.id, after: { amountMinor: r.amount.amountMinor, paymentStatus: status } }, tx);
      return { order: orderView(next!, "seller"), payment: strip(pay) };
    });
  }

  return {
    // ---- seller: listings

    async createListing(ctx: FarmContext, i: ListingInput) {
      assertCan(ctx, "market.manage");
      const farm = await farmOf(ctx.farmId);
      await validateListing(ctx, farm, i);
      const now = clock.now();
      const rec: MarketListingRecord = { id: newId(), farmId: ctx.farmId, ...defined(i), quantityAvailable: q3(i.quantityAvailable), status: "draft", createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.listings.insert(rec, tx);
        await d.audit.record(ctx, { action: "listing.created", entity: "market_listing", entityId: rec.id, after: { title: rec.title, priceMinor: rec.price.amountMinor } }, tx);
      });
      return listingView(rec);
    },

    async updateListing(ctx: FarmContext, id: string, i: ListingInput & { version: number }) {
      assertCan(ctx, "market.manage");
      const farm = await farmOf(ctx.farmId);
      const cur = await repos.listings.findById(ctx.farmId, id);
      if (!cur) throw notFound("Listing");
      if (cur.status === "closed") throw new AppError("INVALID_STATE_TRANSITION", "A closed listing cannot be edited");
      await validateListing(ctx, farm, i);
      const { version, ...fields } = i;
      const next = await repos.listings.update(ctx.farmId, id, { ...fields, quantityAvailable: q3(i.quantityAvailable), updatedBy: ctx.userId, updatedAt: clock.now() } as never, { expectedVersion: version });
      if (!next) throw new AppError("VERSION_CONFLICT", "This listing was changed by someone else", { serverVersion: cur.version });
      return listingView(next);
    },

    /** draft → active ⇄ paused; any → closed. Sold-out listings come back when an order is cancelled or quantity is added. */
    async setListingStatus(ctx: FarmContext, id: string, status: "active" | "paused" | "closed") {
      assertCan(ctx, "market.manage");
      const cur = await repos.listings.findById(ctx.farmId, id);
      if (!cur) throw notFound("Listing");
      if (cur.status === "closed") throw new AppError("INVALID_STATE_TRANSITION", "This listing is closed");
      if (status === "active" && cur.quantityAvailable <= 0) throw new AppError("VALIDATION_FAILED", "Add quantity before activating the listing");
      const next = await repos.listings.update(ctx.farmId, id, { status, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: cur.version });
      return listingView(next!);
    },

    async myListings(ctx: FarmContext, q: { status?: MarketListingRecord["status"] }) {
      assertCan(ctx, "market.read");
      return (await repos.listings.find(ctx.farmId, { ...(q.status ? { where: { status: q.status } } : {}), sort: [{ field: "createdAt", dir: -1 }] })).map(listingView);
    },

    // ---- buyer: browse and order

    async browse(_ctx: RequestContext, q: { category?: string; region?: string; q?: string; limit: number }) {
      const rows = await repos.market.activeListings({ ...(q.category ? { category: q.category } : {}), ...(q.region ? { regionCode: q.region } : {}), ...(q.q ? { text: q.q } : {}), limit: q.limit });
      return Promise.all(rows.map(publicListing));
    },

    async listing(_ctx: RequestContext, id: string) {
      const l = await repos.market.listingById(id);
      if (!l || l.status !== "active") throw notFound("Listing");
      return publicListing(l);
    },

    /** A buyer places an order. Price comes from the listing; quantity is reserved when the seller accepts. */
    async placeOrder(ctx: RequestContext, r: { listingId: string; quantity: number; fulfilment: OrderRecord["fulfilment"]; deliveryAddress?: string; buyerName: string; buyerPhone?: string; buyerFarmId?: string; notes?: string }) {
      const listing = await repos.market.listingById(r.listingId);
      if (!listing || listing.status !== "active") throw notFound("Listing");
      const sellerMembership = await repos.memberships.findActive(listing.farmId, ctx.userId);
      if (sellerMembership) throw new AppError("VALIDATION_FAILED", "You cannot order from your own farm's listing");
      if (r.buyerFarmId && !(await repos.memberships.findActive(r.buyerFarmId, ctx.userId))) throw notFound("Farm");
      if (!listing.fulfilmentOptions.includes(r.fulfilment)) throw new AppError("VALIDATION_FAILED", `This seller offers ${listing.fulfilmentOptions.join(" or ")}`);
      if (r.fulfilment !== "pickup" && !r.deliveryAddress) throw new AppError("VALIDATION_FAILED", "Give a delivery address");
      if (listing.minOrderQuantity && r.quantity < listing.minOrderQuantity) throw new AppError("VALIDATION_FAILED", `The minimum order is ${listing.minOrderQuantity} ${listing.unit}`);
      if (r.quantity > listing.quantityAvailable) throw new AppError("INSUFFICIENT_STOCK", `Only ${listing.quantityAvailable} ${listing.unit} available`, { available: listing.quantityAvailable });
      const sellerCtx: FarmContext = { ...ctx, farmId: listing.farmId, role: "worker", membershipId: "buyer" };
      return repos.tx.run(async (tx) => {
        const now = clock.now();
        const total = { amountMinor: Math.round(listing.price.amountMinor * r.quantity), currency: listing.price.currency };
        const order: OrderRecord = {
          id: newId(),
          farmId: listing.farmId,
          orderNumber: await repos.counters.next("order", listing.farmId, tx),
          channel: "marketplace",
          listingId: listing.id,
          buyerUserId: ctx.userId,
          ...defined({ buyerFarmId: r.buyerFarmId, buyerName: r.buyerName, buyerPhone: r.buyerPhone, deliveryAddress: r.deliveryAddress, notes: r.notes }),
          fulfilment: r.fulfilment,
          lines: [{ category: listing.category, description: listing.title, quantity: r.quantity, unit: listing.unit, unitPrice: listing.price, total }],
          subtotal: total,
          total,
          status: "pending",
          statusHistory: [{ status: "pending", at: now, by: ctx.userId }],
          paymentStatus: "unpaid",
          amountPaid: { amountMinor: 0, currency: total.currency },
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.orders.insert(order, tx);
        await d.audit.record(sellerCtx, { action: "order.placed", entity: "order", entityId: order.id, after: { listingId: listing.id, quantity: r.quantity, totalMinor: total.amountMinor } }, tx);
        return orderView(order, "buyer", null);
      });
    },

    async myPurchases(ctx: RequestContext) {
      const rows = await repos.market.ordersForBuyer(ctx.userId);
      return Promise.all(rows.map(async (o) => orderView(o, "buyer", ["pending", "cancelled"].includes(o.status) ? null : await sellerContact(o.farmId))));
    },

    async buyerOrder(ctx: RequestContext, id: string) {
      const { order } = await asBuyer(ctx, id);
      return orderView(order, "buyer", ["pending", "cancelled"].includes(order.status) ? null : await sellerContact(order.farmId));
    },

    async buyerAct(ctx: RequestContext, id: string, to: "cancelled" | "delivered" | "completed", reason?: string) {
      const { sellerCtx } = await asBuyer(ctx, id);
      const next = await transition(sellerCtx, "buyer", id, to, reason ? { reason } : {});
      return orderView(next, "buyer", await sellerContact(next.farmId));
    },

    // ---- seller: orders

    async sellerOrders(ctx: FarmContext, q: { status?: OrderStatus; channel?: OrderRecord["channel"] }) {
      assertCan(ctx, "market.read");
      const where: Record<string, unknown> = {};
      if (q.status) where["status"] = q.status;
      if (q.channel) where["channel"] = q.channel;
      return (await repos.orders.find(ctx.farmId, { where: where as never, sort: [{ field: "createdAt", dir: -1 }] })).map((o) => orderView(o, "seller"));
    },

    async sellerOrder(ctx: FarmContext, id: string) {
      assertCan(ctx, "market.read");
      const o = await repos.orders.findById(ctx.farmId, id);
      if (!o) throw notFound("Order");
      const payments = await repos.orderPayments.find(ctx.farmId, { where: { orderId: id }, sort: [{ field: "date", dir: 1 }] });
      return { ...orderView(o, "seller"), payments: payments.map(strip) };
    },

    async sellerAct(ctx: FarmContext, id: string, to: OrderStatus, extra: { reason?: string; delivery?: OrderRecord["delivery"]; date?: string } = {}) {
      assertCan(ctx, "market.manage");
      return orderView(await transition(ctx, "seller", id, to, extra), "seller");
    },

    recordPayment(ctx: FarmContext, id: string, r: Parameters<typeof recordMoney>[3]) {
      assertCan(ctx, "payment.record");
      return recordMoney(ctx, id, "payment", r);
    },

    recordRefund(ctx: FarmContext, id: string, r: Parameters<typeof recordMoney>[3]) {
      assertCan(ctx, "money.record");
      return recordMoney(ctx, id, "refund", r);
    },

    // ---- buyer management

    async buyerDetail(ctx: FarmContext, id: string) {
      assertCan(ctx, "market.read");
      const b = await repos.buyers.findById(ctx.farmId, id);
      if (!b) throw notFound("Buyer");
      const [orders, incomes] = await Promise.all([repos.orders.find(ctx.farmId, { where: { buyerId: id }, sort: [{ field: "createdAt", dir: -1 }] }), repos.incomes.find(ctx.farmId, { where: { buyerId: id } })]);
      const open = incomes.filter((x) => x.status === "unpaid" || x.status === "partially_paid");
      return {
        buyer: strip(b),
        orders: orders.map((o) => orderView(o, "seller")),
        totals: {
          orders: orders.length,
          deliveredOrders: orders.filter((o) => o.status === "delivered" || o.status === "completed").length,
          salesMinor: incomes.filter((x) => x.status !== "cancelled").reduce((t, x) => t + x.amount.amountMinor, 0),
          outstandingMinor: open.reduce((t, x) => t + x.amount.amountMinor - x.amountPaid.amountMinor, 0),
        },
      };
    },

    async updateBuyer(ctx: FarmContext, id: string, r: { name: string; type: import("../ports/records.js").BuyerRecord["type"]; phone?: string; email?: string; locationLabel?: string; notes?: string; version: number }) {
      assertCan(ctx, "market.manage");
      const cur = await repos.buyers.findById(ctx.farmId, id);
      if (!cur) throw notFound("Buyer");
      const { version, ...fields } = r;
      const next = await repos.buyers.update(ctx.farmId, id, { ...fields, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version });
      if (!next) throw new AppError("VERSION_CONFLICT", "This buyer was changed by someone else");
      return strip(next);
    },
  };
}

export type MarketService = ReturnType<typeof createMarketService>;
