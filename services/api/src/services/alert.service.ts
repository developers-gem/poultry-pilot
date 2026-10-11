import { addDays, averageDailyUseKg, daysOfCover, expiryStatus, isExpired, lastNDates, localDateOf, q3 } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { AlertRecord } from "../ports/records.js";
import { assertCan, type FarmContext } from "./context.js";

export interface RaiseInput {
  ruleType: AlertRecord["ruleType"];
  severity: AlertRecord["severity"];
  title: string;
  message: string;
  dedupKey: string;
  date: string;
  flockId?: string;
  houseId?: string;
  values?: Record<string, number>;
}

const alertView = ({ farmId: _f, updatedBy: _u, ...a }: AlertRecord) => ({
  ...a,
  createdAt: a.createdAt.toISOString(),
  updatedAt: a.updatedAt.toISOString(),
  ...(a.acknowledgedAt ? { acknowledgedAt: a.acknowledgedAt.toISOString() } : {}),
  ...(a.resolvedAt ? { resolvedAt: a.resolvedAt.toISOString() } : {}),
});

/**
 * Alerts are keyed by dedupKey: raising the same condition again does nothing while it is open, reopens it if it
 * had been resolved, and resolve() closes it when the condition clears (e.g. after restocking).
 */
export function createAlertService(d: { repos: Repositories; clock: Clock }) {
  const { repos, clock } = d;

  async function raise(ctx: FarmContext, a: RaiseInput, tx?: Tx) {
    const existing = (await repos.alerts.find(ctx.farmId, { where: { dedupKey: a.dedupKey }, limit: 1 }, tx))[0];
    const now = clock.now();
    if (existing) {
      if (existing.status === "resolved") {
        await repos.alerts.update(ctx.farmId, existing.id, { status: "open", severity: a.severity, title: a.title, message: a.message, values: a.values, resolvedAt: undefined, acknowledgedAt: undefined, acknowledgedBy: undefined, updatedAt: now }, undefined, tx);
      } else if (existing.severity !== a.severity || existing.message !== a.message) {
        await repos.alerts.update(ctx.farmId, existing.id, { severity: a.severity, title: a.title, message: a.message, values: a.values, updatedAt: now }, undefined, tx);
      }
      return;
    }
    await repos.alerts.insert({ id: newId(), farmId: ctx.farmId, status: "open", createdBy: "system", createdAt: now, updatedAt: now, version: 0, ...a }, tx);
  }

  async function resolve(ctx: FarmContext, dedupKey: string, tx?: Tx) {
    const existing = (await repos.alerts.find(ctx.farmId, { where: { dedupKey }, limit: 1 }, tx))[0];
    if (existing && existing.status !== "resolved") await repos.alerts.update(ctx.farmId, existing.id, { status: "resolved", resolvedAt: clock.now(), updatedAt: clock.now() }, undefined, tx);
  }

  /**
   * Stock alerts for the whole farm: low stock (in-date quantity at or below the reorder level), feed running out
   * (fewer days left than the item's reorderDays), lots expiring within the item's warning window, and expired stock
   * still on hand. Runs inside every stock movement's transaction, on demand, and from the hourly job.
   */
  async function evaluateInventory(ctx: FarmContext, tx?: Tx) {
    const farm = await repos.farms.findById(ctx.farmId, tx);
    if (!farm) throw notFound("Farm");
    const today = localDateOf(clock.now(), farm.settings.timezone);
    const items = await repos.inventoryItems.find(ctx.farmId, { where: { active: true } }, tx);
    if (!items.length) return;
    const lots = await repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } as never }, tx);
    const window = lastNDates(addDays(today, -1), 7);
    for (const item of items) {
      const mine = lots.filter((l) => l.itemId === item.id);
      const open = mine.filter((l) => l.quantityRemaining > 0);
      const inDate = q3(open.filter((l) => !isExpired(l, today)).reduce((t, l) => t + l.quantityRemaining, 0));
      const unit = item.unit;

      const lowKey = `low_stock:${item.id}`;
      let low = item.reorderLevel !== undefined && inDate <= item.reorderLevel;
      let message = `${item.name}: ${inDate} ${unit} in date stock, at or below the reorder level of ${item.reorderLevel} ${unit}.`;
      let ruleType: AlertRecord["ruleType"] = item.category === "feed" ? "low_feed_stock" : "low_inventory";
      let values: Record<string, number> = { quantity: inDate, ...(item.reorderLevel !== undefined ? { reorderLevel: item.reorderLevel } : {}) };
      if (item.category === "feed") {
        const use = await repos.feedConsumption.find(ctx.farmId, { where: { feedItemId: item.id }, range: { field: "date", from: window[0]!, to: window[window.length - 1]! } }, tx);
        const avg = averageDailyUseKg(use.map((u) => ({ date: u.date, kg: u.quantityKg })), window);
        const cover = daysOfCover(inDate, avg, item.reorderDays ?? 7);
        if (cover.days !== null) values = { ...values, daysRemaining: cover.days, averageDailyUseKg: q3(avg!) };
        if (cover.status === "out" || (item.reorderDays !== undefined && cover.status === "low")) {
          low = true;
          message = cover.status === "out" ? `${item.name} is out of stock.` : `${item.name}: about ${cover.days} days of feed left at ${q3(avg!)} kg a day (${inDate} kg in stock).`;
        }
      }
      if (low) await raise(ctx, { ruleType, severity: inDate <= 0 ? "critical" : "warning", title: `Low stock: ${item.name}`, message, dedupKey: lowKey, date: today, values }, tx);
      else await resolve(ctx, lowKey, tx);

      for (const lot of mine) {
        const status = lot.quantityRemaining > 0 ? expiryStatus(lot.expiryDate, today, item.expiryWarningDays, addDays) : null;
        const label = `${item.name}${lot.batchNumber ? ` batch ${lot.batchNumber}` : ""}`;
        if (status === "expired") {
          await raise(ctx, { ruleType: "expired_stock", severity: "critical", title: `Expired: ${label}`, message: `${lot.quantityRemaining} ${unit} of ${label} expired on ${lot.expiryDate}. Do not use it; record it as wastage.`, dedupKey: `expired:${lot.id}`, date: today, values: { quantity: lot.quantityRemaining } }, tx);
          await resolve(ctx, `expiry_soon:${lot.id}`, tx);
        } else if (status === "expiring") {
          await raise(ctx, { ruleType: "expiry_soon", severity: "warning", title: `Expiring soon: ${label}`, message: `${lot.quantityRemaining} ${unit} of ${label} expires on ${lot.expiryDate}.`, dedupKey: `expiry_soon:${lot.id}`, date: today, values: { quantity: lot.quantityRemaining } }, tx);
        } else {
          await resolve(ctx, `expiry_soon:${lot.id}`, tx);
          await resolve(ctx, `expired:${lot.id}`, tx);
        }
      }
    }
  }

  return {
    raise,
    resolve,
    evaluateInventory,

    async list(ctx: FarmContext, q: { status?: AlertRecord["status"]; ruleType?: AlertRecord["ruleType"]; limit: number }) {
      assertCan(ctx, "farm.read");
      const where: Record<string, unknown> = {};
      if (q.status) where["status"] = q.status;
      if (q.ruleType) where["ruleType"] = q.ruleType;
      return (await repos.alerts.find(ctx.farmId, { where: where as never, sort: [{ field: "updatedAt", dir: -1 }], limit: q.limit })).map(alertView);
    },

    async acknowledge(ctx: FarmContext, id: string) {
      assertCan(ctx, "alert.manage");
      const a = await repos.alerts.findById(ctx.farmId, id);
      if (!a) throw notFound("Alert");
      if (a.status === "resolved") throw new AppError("INVALID_STATE_TRANSITION", "This alert is already resolved");
      const next = await repos.alerts.update(ctx.farmId, id, { status: "acknowledged", acknowledgedBy: ctx.userId, acknowledgedAt: clock.now(), updatedAt: clock.now() });
      return alertView(next!);
    },

    async evaluate(ctx: FarmContext) {
      assertCan(ctx, "alert.manage");
      await repos.tx.run((tx) => evaluateInventory(ctx, tx));
      return { evaluatedAt: clock.now().toISOString() };
    },
  };
}

export type AlertService = ReturnType<typeof createAlertService>;
