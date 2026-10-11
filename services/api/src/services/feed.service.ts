import { addDays, averageDailyUseKg, daysOfCover, isExpired, lastNDates, q3 } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { FarmRecord, FeedConsumptionRecord, FlockRecord, MoneyValue } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import type { FlockService } from "./flock.service.js";
import type { InventoryService } from "./inventory.service.js";
import type { SyncService } from "./sync.service.js";

export interface FeedLineInput {
  quantityKg: number;
  kind?: "consumption" | "wastage";
  feedItemId?: string;
  unitCostPerKg?: MoneyValue;
  reason?: string;
}

export function createFeedService(d: { repos: Repositories; clock: Clock; audit: AuditService; sync: SyncService; inventory: InventoryService; flocks: FlockService }) {
  const { repos, clock } = d;
  const E = d.inventory.engine;

  /**
   * Records feed eaten or wasted. With a feed item, stock leaves that item's lots FEFO in the same transaction and
   * the entry is costed at those lots' prices; without one, the entry is recorded (optionally with a price) and no
   * stock moves. Shared by daily records and the feed endpoints.
   */
  async function recordFeed(ctx: FarmContext, farm: FarmRecord, flock: FlockRecord | null, date: string, line: FeedLineInput, tx: Tx, link: { dailyRecordId?: string } = {}): Promise<FeedConsumptionRecord> {
    const kind = line.kind ?? "consumption";
    if (kind === "consumption" && !flock) throw new AppError("VALIDATION_FAILED", "Feed eaten must name the flock");
    if (line.feedItemId && line.unitCostPerKg) throw new AppError("VALIDATION_FAILED", "A feed item is costed from its stock; leave out unitCostPerKg");
    E.assertCurrency(line.unitCostPerKg, farm, "unitCostPerKg");
    const id = newId();
    const now = clock.now();
    let allocations: FeedConsumptionRecord["allocations"];
    let cost: MoneyValue | undefined = line.unitCostPerKg ? { amountMinor: Math.round(line.unitCostPerKg.amountMinor * line.quantityKg), currency: farm.settings.currency } : undefined;
    if (line.feedItemId) {
      const item = await E.loadItem(ctx, line.feedItemId, tx);
      if (item.category !== "feed") throw new AppError("VALIDATION_FAILED", `${item.name} is not a feed item`);
      if (!item.active) throw new AppError("VALIDATION_FAILED", `${item.name} is inactive`);
      const out = await E.take(
        ctx, item, line.quantityKg,
        { date, purpose: kind === "wastage" ? "wastage" : "use", type: kind === "wastage" ? "wastage" : "issue", sourceType: "feed_consumption", sourceId: id, ...(flock ? { flockId: flock.id, houseId: flock.houseId } : {}), ...(line.reason ? { reason: line.reason } : {}) },
        farm, tx,
      );
      allocations = out.allocations;
      cost = { amountMinor: out.costMinor, currency: farm.settings.currency };
    }
    const rec: FeedConsumptionRecord = {
      id,
      farmId: ctx.farmId,
      ...(flock ? { flockId: flock.id } : {}),
      kind,
      date,
      quantityKg: q3(line.quantityKg),
      ...(line.feedItemId ? { feedItemId: line.feedItemId } : {}),
      ...(link.dailyRecordId ? { dailyRecordId: link.dailyRecordId } : {}),
      ...(allocations ? { allocations } : {}),
      ...(cost ? { cost } : {}),
      ...(line.reason ? { reason: line.reason } : {}),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    await repos.feedConsumption.insert(rec, tx);
    return rec;
  }

  /** Undoes a feed entry: its stock goes back to the same lots, and the entry is soft-deleted. */
  async function removeFeed(ctx: FarmContext, farm: FarmRecord, rec: FeedConsumptionRecord, tx: Tx) {
    if (rec.allocations?.length) await E.reverseSource(ctx, rec.id, "Feed entry removed", farm, tx);
    const now = clock.now();
    await repos.feedConsumption.update(ctx.farmId, rec.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, undefined, tx);
  }

  const feedView = ({ farmId: _f, deletedAt: _d, deletedBy: _db, updatedBy: _u, ...r }: FeedConsumptionRecord) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });

  return {
    recordFeed,
    removeFeed,

    /** POST /feed/consumption — feed eaten by a flock, or wasted (in a flock's house or in the store). */
    async consume(ctx: FarmContext, r: FeedLineInput & { date: string; flockId?: string }) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        let flock: FlockRecord | null = null;
        if (r.flockId) {
          flock = await d.flocks.ledger.loadFlock(ctx, r.flockId, tx);
          d.flocks.ledger.assertStatus(flock, ["active"], "record feed");
          d.flocks.ledger.assertDate(r.date, farm, flock);
        } else if (r.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        const rec = await recordFeed(ctx, farm, flock, r.date, r, tx);
        await d.audit.record(ctx, { action: `feed.${rec.kind}`, entity: "feed_consumption", entityId: rec.id, after: { flockId: rec.flockId, quantityKg: rec.quantityKg, costMinor: rec.cost?.amountMinor } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "feed_consumption", entityId: rec.id, op: "upsert", version: 0 }, tx);
        return feedView(rec);
      });
    },

    /** DELETE /feed/consumption/:id — entries made through a daily record are changed by editing the record. */
    async removeEntry(ctx: FarmContext, id: string) {
      assertCan(ctx, "inventory.issue");
      await repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const rec = await repos.feedConsumption.findById(ctx.farmId, id, tx);
        if (!rec) throw notFound("Feed entry");
        if (rec.dailyRecordId) throw new AppError("INVALID_STATE_TRANSITION", "This feed entry belongs to a daily record; edit the daily record instead");
        await removeFeed(ctx, farm, rec, tx);
        await d.audit.record(ctx, { action: "feed.removed", entity: "feed_consumption", entityId: id, before: { quantityKg: rec.quantityKg, flockId: rec.flockId } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "feed_consumption", entityId: id, op: "delete", version: rec.version + 1 }, tx);
      });
    },

    async list(ctx: FarmContext, q: { from?: string; to?: string; flockId?: string; feedItemId?: string; kind?: "consumption" | "wastage"; limit: number }) {
      assertCan(ctx, "inventory.read");
      const where: Record<string, unknown> = {};
      if (q.flockId) where["flockId"] = q.flockId;
      if (q.feedItemId) where["feedItemId"] = q.feedItemId;
      if (q.kind) where["kind"] = q.kind;
      const rows = await repos.feedConsumption.find(ctx.farmId, { where: where as never, range: { field: "date", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }, sort: [{ field: "date", dir: -1 }], limit: q.limit });
      return rows.map(feedView);
    },

    /**
     * Feed stock per item: kg in date, value, average daily use over the last 7 complete days (eaten and wasted,
     * averaged over days with entries) and days of feed remaining. Plus the farm total.
     */
    async stock(ctx: FarmContext) {
      assertCan(ctx, "inventory.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const items = await repos.inventoryItems.find(ctx.farmId, { where: { category: "feed", active: true }, sort: [{ field: "name", dir: 1 }] });
      const window = lastNDates(addDays(today, -1), 7);
      const [lots, use] = items.length
        ? await Promise.all([
            repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } as never }),
            repos.feedConsumption.find(ctx.farmId, { where: { feedItemId: items.map((i) => i.id) } as never, range: { field: "date", from: window[0]!, to: window[window.length - 1]! } }),
          ])
        : [[], []];
      const rows = items.map((item) => {
        const open = lots.filter((l) => l.itemId === item.id && l.quantityRemaining > 0);
        const inDate = q3(open.filter((l) => !isExpired(l, today)).reduce((t, l) => t + l.quantityRemaining, 0));
        const avg = averageDailyUseKg(use.filter((u) => u.feedItemId === item.id).map((u) => ({ date: u.date, kg: u.quantityKg })), window);
        const cover = daysOfCover(inDate, avg, item.reorderDays ?? 7);
        return {
          itemId: item.id,
          name: item.name,
          stage: item.feed?.stage,
          quantityKg: inDate,
          expiredKg: q3(open.filter((l) => isExpired(l, today)).reduce((t, l) => t + l.quantityRemaining, 0)),
          valueMinor: item.stock?.valueMinor ?? 0,
          averageDailyUseKg: avg === null ? null : q3(avg),
          daysRemaining: cover.days,
          status: cover.status,
          reorderDays: item.reorderDays ?? 7,
        };
      });
      const totalKg = q3(rows.reduce((t, r) => t + r.quantityKg, 0));
      const totalUse = rows.reduce((t, r) => t + (r.averageDailyUseKg ?? 0), 0);
      return {
        date: today,
        currency: farm.settings.currency,
        items: rows,
        totals: { quantityKg: totalKg, valueMinor: rows.reduce((t, r) => t + r.valueMinor, 0), averageDailyUseKg: q3(totalUse), daysRemaining: totalUse > 0 ? Math.floor(totalKg / totalUse) : null },
      };
    },

    /** Feed performance per flock: feed per bird, per kg gain, FCR, wastage, feed cost per bird and per egg. */
    async analytics(ctx: FarmContext, q: { flockId?: string; status?: FlockRecord["status"]; asOf?: string }) {
      assertCan(ctx, "production.read");
      const flocks = q.flockId ? [await d.flocks.ledger.loadFlock(ctx, q.flockId)] : await repos.flocks.find(ctx.farmId, { where: { status: q.status ?? "active" } });
      const rows = [];
      for (const f of flocks) {
        const m = await d.flocks.metrics(ctx, f.id, q.asOf ? { asOf: q.asOf } : {});
        rows.push({
          flockId: f.id,
          flockCode: f.flockCode,
          type: f.type,
          birdsIn: m.birdsIn,
          currentBirdCount: m.currentBirdCount,
          feedConsumedKg: m.feedConsumedKg,
          feedWastedKg: m.feedWastedKg,
          feedPerBirdKg: m.feedPerBirdKg,
          feedPerKgGainKg: m.feedPerKgGainKg,
          fcr: m.fcr,
          feedCostMinor: m.feedCostMinor,
          feedCostPerBirdMinor: m.feedCostPerBirdMinor,
          eggsCollected: m.eggsCollected,
          feedCostPerEggMinor: m.feedCostPerEggMinor,
          costsComplete: m.costsComplete,
        });
      }
      return { flocks: rows, stock: await this.stock(ctx) };
    },

    async water(ctx: FarmContext, q: { from?: string; to?: string; flockId?: string; abnormal?: boolean; limit: number }) {
      assertCan(ctx, "production.read");
      const rows = await repos.waterRecords.find(ctx.farmId, {
        ...(q.flockId ? { where: { flockId: q.flockId } } : {}),
        ...(q.abnormal ? { exists: { flags: true } } : {}),
        range: { field: "date", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) },
        sort: [{ field: "date", dir: -1 }],
        limit: q.limit,
      });
      return rows
        .filter((r) => !q.abnormal || (r.flags?.length ?? 0) > 0)
        .map(({ farmId: _f, deletedAt: _d, deletedBy: _db, updatedBy: _u, ...r }) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
    },
  };
}

export type FeedService = ReturnType<typeof createFeedService>;
