import { RULE_DEFINITIONS, addDays, averageDailyUseKg, daysOfCover, expiryStatus, isExpired, lastNDates, localDateOf, q3 } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { AlertRecord } from "../ports/records.js";
import { assertCan, type FarmContext } from "./context.js";
import type { EffectiveRule } from "./rules.service.js";

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
/** Wired in the container: the farm's rule settings, and the notifier for new, reopened or escalated alerts. */
export interface AlertHooks {
  ruleFor?: (ctx: FarmContext, alertType: AlertRecord["ruleType"], tx?: Tx) => Promise<EffectiveRule | undefined>;
  onRaised?: (ctx: FarmContext, alert: AlertRecord, rule: EffectiveRule | undefined, reason: "new" | "reopened" | "escalated", tx?: Tx) => Promise<void>;
}

const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 } as const;

export function createAlertService(d: { repos: Repositories; clock: Clock }) {
  const { repos, clock } = d;
  const hooks: AlertHooks = {};

  /**
   * Every alert in PoultryPilot comes through here, so the farm's rule settings always apply: a rule switched off
   * raises nothing (and resolves what it had raised), severity and scope follow the farm, and new, reopened or
   * escalated alerts are handed to the notifier.
   */
  async function raise(ctx: FarmContext, a: RaiseInput, tx?: Tx) {
    const rule = await hooks.ruleFor?.(ctx, a.ruleType, tx);
    if (rule && !rule.enabled) return resolve(ctx, a.dedupKey, tx);
    if (rule?.flockIds && a.flockId && !rule.flockIds.includes(a.flockId)) return;
    if (rule?.houseIds && a.houseId && !rule.houseIds.includes(a.houseId)) return;
    const severity = rule?.severity ?? a.severity;
    const input = { ...a, severity };
    const existing = (await repos.alerts.find(ctx.farmId, { where: { dedupKey: a.dedupKey }, limit: 1 }, tx))[0];
    const now = clock.now();
    if (existing) {
      if (existing.status === "resolved") {
        const next = await repos.alerts.update(ctx.farmId, existing.id, { status: "open", severity, title: a.title, message: a.message, values: a.values, resolvedAt: undefined, acknowledgedAt: undefined, acknowledgedBy: undefined, updatedAt: now }, undefined, tx);
        if (next) await hooks.onRaised?.(ctx, next, rule, "reopened", tx);
      } else if (existing.severity !== severity || existing.message !== a.message) {
        const next = await repos.alerts.update(ctx.farmId, existing.id, { severity, title: a.title, message: a.message, values: a.values, updatedAt: now }, undefined, tx);
        if (next && SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity]) await hooks.onRaised?.(ctx, next, rule, "escalated", tx);
      }
      return;
    }
    const rec: AlertRecord = { id: newId(), farmId: ctx.farmId, status: "open", createdBy: "system", createdAt: now, updatedAt: now, version: 0, ...input };
    await repos.alerts.insert(rec, tx);
    await hooks.onRaised?.(ctx, rec, rule, "new", tx);
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
    hooks,
    raise,
    resolve,
    evaluateInventory,

    /** Alerts with filters (status, type, rule, severity, flock) and counts of what is open. */
    async list(ctx: FarmContext, q: { status?: AlertRecord["status"]; ruleType?: AlertRecord["ruleType"]; ruleKey?: string; severity?: AlertRecord["severity"]; flockId?: string; limit: number }) {
      assertCan(ctx, "farm.read");
      const where: Record<string, unknown> = {};
      if (q.status) where["status"] = q.status;
      if (q.ruleType) where["ruleType"] = q.ruleType;
      else if (q.ruleKey) where["ruleType"] = RULE_DEFINITIONS[q.ruleKey as keyof typeof RULE_DEFINITIONS]?.alertTypes ?? [];
      if (q.severity) where["severity"] = q.severity;
      if (q.flockId) where["flockId"] = q.flockId;
      const items = (await repos.alerts.find(ctx.farmId, { where: where as never, sort: [{ field: "updatedAt", dir: -1 }], limit: q.limit })).map(alertView);
      const open = await repos.alerts.find(ctx.farmId, { where: { status: ["open", "acknowledged"] } as never });
      return {
        items,
        counts: {
          open: open.filter((a) => a.status === "open").length,
          acknowledged: open.filter((a) => a.status === "acknowledged").length,
          bySeverity: { critical: open.filter((a) => a.severity === "critical").length, warning: open.filter((a) => a.severity === "warning").length, info: open.filter((a) => a.severity === "info").length },
        },
      };
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
