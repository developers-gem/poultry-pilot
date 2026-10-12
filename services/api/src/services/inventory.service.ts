import type { EggGrade } from "@poultrypilot/types";
import { addDays, allocate, averageUnitCost, expiryStatus, isExpired, localDateOf, q3, stockTotals, type Allocation, type StockLot } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { ChickLotRecord, FarmRecord, InventoryItemRecord, InventoryLotRecord, InventoryTransactionRecord, MoneyValue } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import { duplicate } from "./house.service.js";
import type { SyncService } from "./sync.service.js";

export interface InventoryDeps {
  repos: Repositories;
  clock: Clock;
  audit: AuditService;
  sync: SyncService;
  /** Re-evaluates stock alerts inside the same transaction after every movement. */
  onStockChanged?: (ctx: FarmContext, tx: Tx) => Promise<void>;
}

export interface TakeOptions {
  date: string;
  purpose: "use" | "wastage";
  type: "issue" | "wastage" | "adjustment";
  sourceType: InventoryTransactionRecord["sourceType"];
  sourceId?: string;
  flockId?: string;
  houseId?: string;
  reason?: string;
}

export interface ReceiveInput {
  date: string;
  quantity: number;
  unitCost: MoneyValue;
  supplier?: string;
  batchNumber?: string;
  invoiceNumber?: string;
  expiryDate?: string;
  storageLocation?: string;
}

const toStockLot = (l: InventoryLotRecord): StockLot => ({
  id: l.id,
  receivedDate: l.receivedDate,
  ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
  quantityRemaining: l.quantityRemaining,
  unitCostMinor: l.unitCost.amountMinor,
});

export function createInventoryService(d: InventoryDeps) {
  const { repos, clock } = d;
  /** Finance: a purchase becomes a bill. */
  const hooks: { afterPurchase: ((ctx: FarmContext, item: InventoryItemRecord, lot: InventoryLotRecord, supplierId: string | undefined, tx: Tx) => Promise<void>)[] } = { afterPurchase: [] };

  // ---- engine (usable inside other services' transactions) -------------------------

  async function farmOf(ctx: FarmContext, tx?: Tx): Promise<FarmRecord> {
    const f = await repos.farms.findById(ctx.farmId, tx);
    if (!f) throw notFound("Farm");
    return f;
  }
  const todayOf = (farm: FarmRecord) => localDateOf(clock.now(), farm.settings.timezone);

  async function loadItem(ctx: FarmContext, id: string, tx?: Tx): Promise<InventoryItemRecord> {
    const item = await repos.inventoryItems.findById(ctx.farmId, id, tx);
    if (!item) throw notFound("Inventory item");
    return item;
  }

  const lotsOf = (ctx: FarmContext, itemId: string, tx?: Tx) => repos.inventoryLots.find(ctx.farmId, { where: { itemId }, sort: [{ field: "receivedDate", dir: 1 }] }, tx);

  /** Rewrites the item's stock total from its lots, under an optimistic lock on the item. */
  async function refreshItem(ctx: FarmContext, item: InventoryItemRecord, farm: FarmRecord, tx: Tx): Promise<InventoryItemRecord> {
    const lots = await lotsOf(ctx, item.id, tx);
    const t = stockTotals(lots.map(toStockLot));
    const next = await repos.inventoryItems.update(
      ctx.farmId,
      item.id,
      { stock: { quantity: t.quantity, valueMinor: t.valueMinor, currency: farm.settings.currency, asOf: todayOf(farm) }, updatedAt: clock.now() },
      { expectedVersion: item.version },
      tx,
    );
    if (!next) throw new AppError("VERSION_CONFLICT", `${item.name} stock changed at the same time elsewhere. Try again.`);
    return next;
  }

  function assertDate(date: string, farm: FarmRecord) {
    if (date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${date} is in the future for this farm`);
  }

  function assertCurrency(m: MoneyValue | undefined, farm: FarmRecord, field: string) {
    if (m && m.currency !== farm.settings.currency) throw new AppError("VALIDATION_FAILED", `${field} must be in the farm currency (${farm.settings.currency})`);
  }

  async function receive(ctx: FarmContext, item: InventoryItemRecord, r: ReceiveInput, sourceType: "purchase" | "stock_count", farm: FarmRecord, tx: Tx, reason?: string) {
    assertDate(r.date, farm);
    assertCurrency(r.unitCost, farm, "unitCost");
    if (r.expiryDate && r.expiryDate < r.date) throw new AppError("VALIDATION_FAILED", "Expiry date is before the date received");
    const now = clock.now();
    const lot: InventoryLotRecord = {
      id: newId(),
      farmId: ctx.farmId,
      itemId: item.id,
      receivedDate: r.date,
      ...(r.supplier ?? item.defaultSupplier ? { supplier: r.supplier ?? item.defaultSupplier! } : {}),
      ...(r.batchNumber ? { batchNumber: r.batchNumber } : {}),
      ...(r.invoiceNumber ? { invoiceNumber: r.invoiceNumber } : {}),
      ...(r.expiryDate ? { expiryDate: r.expiryDate } : {}),
      ...(r.storageLocation ?? item.defaultStorageLocation ? { storageLocation: r.storageLocation ?? item.defaultStorageLocation! } : {}),
      quantityReceived: q3(r.quantity),
      quantityRemaining: q3(r.quantity),
      unitCost: r.unitCost,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    const txn: InventoryTransactionRecord = {
      id: newId(),
      farmId: ctx.farmId,
      itemId: item.id,
      lotId: lot.id,
      type: sourceType === "purchase" ? "receipt" : "adjustment",
      date: r.date,
      quantityDelta: lot.quantityReceived,
      valueMinor: Math.round(lot.quantityReceived * r.unitCost.amountMinor),
      currency: farm.settings.currency,
      sourceType,
      sourceId: lot.id,
      ...(reason ? { reason } : {}),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    };
    await repos.inventoryLots.insert(lot, tx);
    await repos.inventoryTransactions.insert(txn, tx);
    const next = await refreshItem(ctx, item, farm, tx);
    await d.audit.record(ctx, { action: sourceType === "purchase" ? "inventory.received" : "inventory.count_added", entity: "inventory_item", entityId: item.id, after: { quantity: lot.quantityReceived, lotId: lot.id, expiryDate: lot.expiryDate } }, tx);
    await d.onStockChanged?.(ctx, tx);
    return { lot, transaction: txn, item: next };
  }

  /** Removes stock FEFO and records one ledger entry per lot used. Returns the allocations and their cost. */
  async function take(ctx: FarmContext, item: InventoryItemRecord, quantity: number, o: TakeOptions, farm: FarmRecord, tx: Tx): Promise<{ allocations: Allocation[]; costMinor: number; item: InventoryItemRecord }> {
    assertDate(o.date, farm);
    const lots = await lotsOf(ctx, item.id, tx);
    const allocations = allocate(lots.map(toStockLot), q3(quantity), o.date, o.purpose);
    const now = clock.now();
    const byId = new Map(lots.map((l) => [l.id, l]));
    for (const a of allocations) {
      const lot = byId.get(a.lotId)!;
      await repos.inventoryLots.update(ctx.farmId, lot.id, { quantityRemaining: q3(lot.quantityRemaining - a.quantity), updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: lot.version }, tx);
    }
    await repos.inventoryTransactions.insertMany(
      allocations.map((a) => ({
        id: newId(),
        farmId: ctx.farmId,
        itemId: item.id,
        lotId: a.lotId,
        type: o.type,
        date: o.date,
        quantityDelta: -a.quantity,
        valueMinor: -a.costMinor,
        currency: farm.settings.currency,
        sourceType: o.sourceType,
        ...(o.sourceId ? { sourceId: o.sourceId } : {}),
        ...(o.flockId ? { flockId: o.flockId } : {}),
        ...(o.houseId ? { houseId: o.houseId } : {}),
        ...(o.reason ? { reason: o.reason } : {}),
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
      })),
      tx,
    );
    const next = await refreshItem(ctx, item, farm, tx);
    await d.onStockChanged?.(ctx, tx);
    return { allocations, costMinor: allocations.reduce((t, a) => t + a.costMinor, 0), item: next };
  }

  /** Puts back everything a source (e.g. a feed entry) took, into the same lots, as reversal entries. */
  async function reverseSource(ctx: FarmContext, sourceId: string, reason: string, farm: FarmRecord, tx: Tx) {
    const txns = await repos.inventoryTransactions.find(ctx.farmId, { where: { sourceId } }, tx);
    const reversed = new Set(txns.filter((t) => t.reversalOf).map((t) => t.reversalOf!));
    const live = txns.filter((t) => !t.reversalOf && !reversed.has(t.id));
    if (!live.length) return;
    const now = clock.now();
    for (const t of live) {
      const lot = await repos.inventoryLots.findById(ctx.farmId, t.lotId, tx);
      if (lot) await repos.inventoryLots.update(ctx.farmId, lot.id, { quantityRemaining: q3(lot.quantityRemaining - t.quantityDelta), updatedAt: now }, { expectedVersion: lot.version }, tx);
    }
    await repos.inventoryTransactions.insertMany(
      live.map((t) => ({
        id: newId(), farmId: ctx.farmId, itemId: t.itemId, lotId: t.lotId, type: "reversal" as const, date: t.date, quantityDelta: -t.quantityDelta, valueMinor: -t.valueMinor,
        currency: t.currency, sourceType: t.sourceType, sourceId, reason, reversalOf: t.id, createdBy: ctx.userId, createdAt: now, updatedAt: now,
      })),
      tx,
    );
    for (const itemId of new Set(live.map((t) => t.itemId))) await refreshItem(ctx, await loadItem(ctx, itemId, tx), farm, tx);
    await d.onStockChanged?.(ctx, tx);
  }

  // ---- views ----------------------------------------------------------------------

  function itemView(item: InventoryItemRecord, lots: InventoryLotRecord[], today: string) {
    const open = lots.filter((l) => l.quantityRemaining > 0);
    const inDate = q3(open.filter((l) => !isExpired(toStockLot(l), today)).reduce((t, l) => t + l.quantityRemaining, 0));
    const expired = q3(open.filter((l) => isExpired(toStockLot(l), today)).reduce((t, l) => t + l.quantityRemaining, 0));
    const expiring = open.filter((l) => expiryStatus(l.expiryDate, today, item.expiryWarningDays, addDays) === "expiring");
    const { farmId: _f, deletedAt: _d, deletedBy: _db, createdBy: _c, updatedBy: _u, ...rest } = item;
    return {
      ...rest,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      quantity: item.stock?.quantity ?? 0,
      valueMinor: item.stock?.valueMinor ?? 0,
      quantityInDate: inDate,
      quantityExpired: expired,
      lowStock: item.reorderLevel !== undefined && inDate <= item.reorderLevel,
      lotsExpiringSoon: expiring.length,
      nextExpiryDate: open.filter((l) => l.expiryDate && l.expiryDate >= today).map((l) => l.expiryDate!).sort()[0] ?? null,
    };
  }

  const lotView = (l: InventoryLotRecord, item: InventoryItemRecord, today: string) => ({
    id: l.id,
    itemId: l.itemId,
    itemName: item.name,
    receivedDate: l.receivedDate,
    supplier: l.supplier,
    batchNumber: l.batchNumber,
    invoiceNumber: l.invoiceNumber,
    expiryDate: l.expiryDate,
    storageLocation: l.storageLocation,
    quantityReceived: l.quantityReceived,
    quantityRemaining: l.quantityRemaining,
    unitCost: l.unitCost,
    expiry: expiryStatus(l.expiryDate, today, item.expiryWarningDays, addDays),
  });

  // ---- eggs and chicks --------------------------------------------------------------

  async function eggStock(ctx: FarmContext, tx?: Tx): Promise<{ total: number; byGrade: Record<string, number> }> {
    const rows = await repos.eggInventory.aggregate(ctx.farmId, {}, ["grade"], ["quantityDelta"]);
    void tx;
    const byGrade: Record<string, number> = {};
    for (const r of rows) byGrade[(r.key["grade"] as string | null) ?? "ungraded"] = r.sums["quantityDelta"] ?? 0;
    return { total: Object.values(byGrade).reduce((t, n) => t + n, 0), byGrade };
  }

  return {
    engine: { farmOf, todayOf, loadItem, take, receive, reverseSource, assertCurrency },
    hooks,

    async createItem(ctx: FarmContext, input: Omit<InventoryItemRecord, keyof import("../ports/records.js").Editable | "stock" | "active" | "expiryWarningDays"> & { id?: string; expiryWarningDays?: number }) {
      assertCan(ctx, "inventory.manage");
      if (input.category === "feed" && input.unit !== "kg") throw new AppError("VALIDATION_FAILED", "Feed is stocked in kg");
      if (input.category === "feed" && !input.feed) throw new AppError("VALIDATION_FAILED", "Give the feed stage for a feed item");
      if (input.category !== "feed" && (input.feed || input.reorderDays !== undefined)) throw new AppError("VALIDATION_FAILED", "Feed details and reorderDays apply to feed items only");
      const farm = await farmOf(ctx);
      const now = clock.now();
      const { id, ...fields } = input;
      const item: InventoryItemRecord = {
        id: id ?? newId(),
        farmId: ctx.farmId,
        ...fields,
        expiryWarningDays: input.expiryWarningDays ?? 30,
        active: true,
        stock: { quantity: 0, valueMinor: 0, currency: farm.settings.currency, asOf: todayOf(farm) },
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0,
      };
      await repos.tx.run(async (tx) => {
        await repos.inventoryItems.insert(item, tx).catch(duplicate(`An item named "${item.name}"`));
        await d.audit.record(ctx, { action: "inventory.item_created", entity: "inventory_item", entityId: item.id, after: { name: item.name, category: item.category } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "inventory_item", entityId: item.id, op: "upsert", version: 0 }, tx);
      });
      return itemView(item, [], todayOf(farm));
    },

    async updateItem(ctx: FarmContext, id: string, input: { name: string; sku?: string; defaultSupplier?: string; defaultStorageLocation?: string; reorderLevel?: number; reorderDays?: number; expiryWarningDays: number; active: boolean; notes?: string; feed?: InventoryItemRecord["feed"]; version: number }) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const cur = await loadItem(ctx, id, tx);
        if (cur.version !== input.version) throw new AppError("VERSION_CONFLICT", "This item was changed by someone else", { serverVersion: cur.version });
        if (cur.category !== "feed" && (input.feed || input.reorderDays !== undefined)) throw new AppError("VALIDATION_FAILED", "Feed details and reorderDays apply to feed items only");
        const { version, ...fields } = input;
        const next = await repos.inventoryItems
          .update(ctx.farmId, id, { ...fields, feed: cur.category === "feed" ? input.feed ?? cur.feed : undefined, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version }, tx)
          .catch(duplicate(`An item named "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This item was changed by someone else");
        await d.audit.record(ctx, { action: "inventory.item_updated", entity: "inventory_item", entityId: id, before: cur as unknown as Record<string, unknown>, after: next as unknown as Record<string, unknown> }, tx);
        await d.onStockChanged?.(ctx, tx);
        return itemView(next, await lotsOf(ctx, id, tx), todayOf(farm));
      });
    },

    async listItems(ctx: FarmContext, q: { category?: InventoryItemRecord["category"]; lowStock?: boolean; includeInactive?: boolean }) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const where: Record<string, unknown> = {};
      if (q.category) where["category"] = q.category;
      if (!q.includeInactive) where["active"] = true;
      const items = await repos.inventoryItems.find(ctx.farmId, { where: where as never, sort: [{ field: "name", dir: 1 }] });
      const lots = items.length ? await repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } as never }) : [];
      const views = items.map((i) => itemView(i, lots.filter((l) => l.itemId === i.id), today));
      return q.lowStock ? views.filter((v) => v.lowStock) : views;
    },

    async getItem(ctx: FarmContext, id: string) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const item = await loadItem(ctx, id);
      const lots = await lotsOf(ctx, id);
      return { ...itemView(item, lots, today), lots: lots.filter((l) => l.quantityRemaining > 0).map((l) => lotView(l, item, today)) };
    },

    /** A purchase: creates a lot (batch, expiry, location, unit cost) and a receipt in the ledger. */
    async receivePurchase(ctx: FarmContext, itemId: string, r: ReceiveInput & { supplierId?: string }) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        if (!item.active) throw new AppError("VALIDATION_FAILED", `${item.name} is inactive`);
        const supplier = r.supplierId ? await repos.suppliers.findById(ctx.farmId, r.supplierId, tx) : null;
        if (r.supplierId && !supplier) throw notFound("Supplier");
        const { supplierId: _s, ...rest } = r;
        const out = await receive(ctx, item, { ...rest, ...(supplier && !r.supplier ? { supplier: supplier.name } : {}) }, "purchase", farm, tx);
        for (const h of hooks.afterPurchase) await h(ctx, item, out.lot, r.supplierId, tx);
        return lotView(out.lot, out.item, todayOf(farm));
      });
    },

    /** Use stock (e.g. a medicine dose, litter for a house). FEFO; expired stock is never used. */
    async issue(ctx: FarmContext, itemId: string, r: { date: string; quantity: number; flockId?: string; houseId?: string; reason?: string }) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        if (item.category === "feed" && r.flockId) throw new AppError("VALIDATION_FAILED", "Record feed eaten by a flock as feed consumption, so it counts in FCR");
        if (r.flockId && !(await repos.flocks.findById(ctx.farmId, r.flockId, tx))) throw notFound("Flock");
        if (r.houseId && !(await repos.houses.findById(ctx.farmId, r.houseId, tx))) throw notFound("House");
        const sourceId = newId();
        const out = await take(ctx, item, r.quantity, { date: r.date, purpose: "use", type: "issue", sourceType: "manual", sourceId, ...(r.flockId ? { flockId: r.flockId } : {}), ...(r.houseId ? { houseId: r.houseId } : {}), ...(r.reason ? { reason: r.reason } : {}) }, farm, tx);
        await d.audit.record(ctx, { action: "inventory.issued", entity: "inventory_item", entityId: item.id, after: { quantity: r.quantity, costMinor: out.costMinor } }, tx);
        return { sourceId, quantity: q3(r.quantity), cost: { amountMinor: out.costMinor, currency: farm.settings.currency }, allocations: out.allocations, remaining: out.item.stock?.quantity ?? 0 };
      });
    },

    /** Stock lost, spoiled or expired. Expired lots are written off first. */
    async wastage(ctx: FarmContext, itemId: string, r: { date: string; quantity: number; reason: string }) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        const sourceId = newId();
        const out = await take(ctx, item, r.quantity, { date: r.date, purpose: "wastage", type: "wastage", sourceType: "manual", sourceId, reason: r.reason }, farm, tx);
        await d.audit.record(ctx, { action: "inventory.wasted", entity: "inventory_item", entityId: item.id, after: { quantity: r.quantity, costMinor: out.costMinor, reason: r.reason } }, tx);
        return { sourceId, quantity: q3(r.quantity), cost: { amountMinor: out.costMinor, currency: farm.settings.currency }, allocations: out.allocations, remaining: out.item.stock?.quantity ?? 0 };
      });
    },

    /**
     * Stock count: the counted quantity replaces the book quantity. A shortfall is removed (oldest expiry first, as
     * an adjustment); a surplus becomes a new lot valued at the current average cost.
     */
    async stockCount(ctx: FarmContext, itemId: string, r: { date: string; countedQuantity: number; reason?: string }) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        const lots = await lotsOf(ctx, itemId, tx);
        const book = stockTotals(lots.map(toStockLot)).quantity;
        const diff = q3(r.countedQuantity - book);
        const reason = r.reason ?? "Stock count";
        if (diff < 0) await take(ctx, item, -diff, { date: r.date, purpose: "wastage", type: "adjustment", sourceType: "stock_count", sourceId: newId(), reason }, farm, tx);
        if (diff > 0) {
          await receive(ctx, item, { date: r.date, quantity: diff, unitCost: { amountMinor: Math.round(averageUnitCost(lots.map(toStockLot))), currency: farm.settings.currency } }, "stock_count", farm, tx, reason);
        }
        await d.audit.record(ctx, { action: "inventory.counted", entity: "inventory_item", entityId: item.id, after: { book, counted: r.countedQuantity, difference: diff } }, tx);
        return { bookQuantity: book, countedQuantity: q3(r.countedQuantity), difference: diff };
      });
    },

    async transactions(ctx: FarmContext, itemId: string, q: { from?: string; to?: string; limit: number }) {
      assertCan(ctx, "inventory.read");
      await loadItem(ctx, itemId);
      const rows = await repos.inventoryTransactions.find(ctx.farmId, {
        where: { itemId },
        range: { field: "date", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) },
        sort: [{ field: "date", dir: -1 }, { field: "createdAt", dir: -1 }],
        limit: q.limit,
      });
      return rows.map(({ farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, ...t }) => ({ ...t, createdAt: createdAt.toISOString() }));
    },

    /** Lots with stock, optionally only those expired or expiring within each item's warning window. */
    async lots(ctx: FarmContext, q: { expiring?: boolean; category?: InventoryItemRecord["category"] }) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const items = await repos.inventoryItems.find(ctx.farmId, q.category ? { where: { category: q.category } } : {});
      const byId = new Map(items.map((i) => [i.id, i]));
      const lots = (await repos.inventoryLots.find(ctx.farmId, { where: { itemId: [...byId.keys()] } as never, sort: [{ field: "receivedDate", dir: 1 }] })).filter((l) => l.quantityRemaining > 0);
      const views = lots.map((l) => lotView(l, byId.get(l.itemId)!, today));
      return (q.expiring ? views.filter((v) => v.expiry === "expired" || v.expiry === "expiring") : views).sort((a, b) => (a.expiryDate ?? "9999") < (b.expiryDate ?? "9999") ? -1 : 1);
    },

    /** Every kind of stock on the farm in one view: catalog categories, eggs by grade and chick lots. */
    async overview(ctx: FarmContext) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const items = await repos.inventoryItems.find(ctx.farmId, { where: { active: true } });
      const lots = items.length ? await repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } as never }) : [];
      const views = items.map((i) => itemView(i, lots.filter((l) => l.itemId === i.id), today));
      const categories: Record<string, { items: number; valueMinor: number; lowStock: number; lotsExpiringSoon: number; quantityExpired: number }> = {};
      for (const v of views) {
        const c = (categories[v.category] ??= { items: 0, valueMinor: 0, lowStock: 0, lotsExpiringSoon: 0, quantityExpired: 0 });
        c.items++;
        c.valueMinor += v.valueMinor;
        c.lowStock += v.lowStock ? 1 : 0;
        c.lotsExpiringSoon += v.lotsExpiringSoon;
        c.quantityExpired = q3(c.quantityExpired + v.quantityExpired);
      }
      const chickLots = await repos.chickLots.find(ctx.farmId, { where: { status: "available" } });
      return {
        date: today,
        currency: farm.settings.currency,
        totalValueMinor: views.reduce((t, v) => t + v.valueMinor, 0),
        categories,
        eggs: await eggStock(ctx),
        chicks: { available: chickLots.reduce((t, l) => t + l.remaining, 0), lots: chickLots.length },
      };
    },

    eggStock,

    /** Manual egg movements: eggs used on the farm, spoiled, or a count correction. Sales post through orders. */
    async eggMovement(ctx: FarmContext, r: { date: string; type: "used" | "spoiled" | "adjustment"; quantity: number; grade?: EggGrade; reason?: string }) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertDate(r.date, farm);
        const delta = r.type === "adjustment" ? r.quantity : -Math.abs(r.quantity);
        if (delta < 0) {
          const stock = await eggStock(ctx, tx);
          const available = r.grade ? stock.byGrade[r.grade] ?? 0 : stock.total;
          if (-delta > available) throw new AppError("INSUFFICIENT_STOCK", `Only ${available} ${r.grade ?? ""} eggs in stock`.replace("  ", " "), { available, requested: -delta });
        }
        const now = clock.now();
        const rec = { id: newId(), farmId: ctx.farmId, date: r.date, type: r.type, ...(r.grade ? { grade: r.grade } : {}), quantityDelta: delta, sourceType: "manual" as const, ...(r.reason ? { note: r.reason } : {}), createdBy: ctx.userId, createdAt: now, updatedAt: now };
        await repos.eggInventory.insert(rec, tx);
        await d.audit.record(ctx, { action: "eggs.moved", entity: "egg_inventory", entityId: rec.id, after: { type: r.type, quantityDelta: delta, grade: r.grade } }, tx);
        return { id: rec.id, quantityDelta: delta, stock: await eggStock(ctx, tx) };
      });
    },

    async receiveChicks(ctx: FarmContext, r: { date: string; quantity: number; species: ChickLotRecord["species"]; breed?: string; supplier?: string; hatchDate?: string; unitCost?: MoneyValue; notes?: string }) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertDate(r.date, farm);
        assertCurrency(r.unitCost, farm, "unitCost");
        const now = clock.now();
        const lot: ChickLotRecord = {
          id: newId(), farmId: ctx.farmId, source: "purchased", species: r.species, ...(r.breed ? { breed: r.breed } : {}), ...(r.supplier ? { supplier: r.supplier } : {}),
          hatchDate: r.hatchDate ?? r.date, quantity: r.quantity, remaining: r.quantity, status: "available", ...(r.unitCost ? { unitCost: r.unitCost } : {}), ...(r.notes ? { notes: r.notes } : {}),
          createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0,
        };
        await repos.chickLots.insert(lot, tx);
        await d.audit.record(ctx, { action: "chicks.received", entity: "chick_lot", entityId: lot.id, after: { quantity: lot.quantity } }, tx);
        return lot;
      });
    },

    async chickLots(ctx: FarmContext, q: { status?: ChickLotRecord["status"] }) {
      assertCan(ctx, "inventory.read");
      return repos.chickLots.find(ctx.farmId, { ...(q.status ? { where: { status: q.status } } : {}), sort: [{ field: "hatchDate", dir: -1 }] });
    },
  };
}

export type InventoryService = ReturnType<typeof createInventoryService>;
