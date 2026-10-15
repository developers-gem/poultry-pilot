import { can } from "@poultrypilot/constants";
import { addDays, baselineOf, dateRange, deviationFrom, localDateOf } from "../domain/index.js";
import { AppError } from "../lib/errors.js";
import type { Clock } from "../lib/util.js";
import type { Repositories } from "../ports/repositories.js";
import type { FlockRecord } from "../ports/records.js";
import type { CalendarService } from "./calendar.service.js";
import { assertCan, type FarmContext } from "./context.js";
import type { DailyRecordService } from "./daily-record.service.js";
import type { FeedService } from "./feed.service.js";
import type { FinanceService } from "./finance.service.js";
import type { FlockService } from "./flock.service.js";
import type { HatcheryService } from "./hatchery.service.js";
import type { IntelligenceService } from "./intelligence.service.js";
import type { InventoryService } from "./inventory.service.js";
import type { RulesService } from "./rules.service.js";
import type { TaskService } from "./task.service.js";
import type { WeatherService } from "./weather.service.js";

const LAYING = new Set(["layer", "breeder", "custom"]);
const SEVERITIES = ["critical", "warning", "info"] as const;

/** The home screen and the analytics view: one request each, built on the server from every module. */
export function createDashboardService(d: {
  repos: Repositories; clock: Clock; dailyRecords: DailyRecordService; weather: WeatherService; calendar: CalendarService; inventory: InventoryService; feed: FeedService;
  hatchery: HatcheryService; finance: FinanceService; flocks: FlockService; intelligence: IntelligenceService; rules: RulesService; tasks: TaskService;
}) {
  const { repos, clock } = d;
  /** A section never breaks the dashboard: failures become { unavailable: reason }. */
  const safe = async <T>(fn: () => Promise<T>): Promise<T | { unavailable: string }> => {
    try {
      return await fn();
    } catch (e) {
      return { unavailable: (e as Error).message };
    }
  };

  return {
    /**
     * GET /dashboard. Sections the person may see: production today, alerts, weather, the coming week, stock,
     * hatchery, money. Each is computed from source records (nothing is cached on the client).
     */
    async overview(ctx: FarmContext) {
      assertCan(ctx, "farm.read");
      const farm = await repos.farms.findById(ctx.farmId);
      const today = localDateOf(clock.now(), farm!.settings.timezone);
      const openAlerts = (await repos.alerts.find(ctx.farmId, { where: { status: ["open", "acknowledged"] } as never, sort: [{ field: "updatedAt", dir: -1 }] }));
      const out: Record<string, unknown> = { date: today, farm: { id: farm!.id, name: farm!.name, currency: farm!.settings.currency } };
      out["alerts"] = {
        open: openAlerts.length,
        bySeverity: Object.fromEntries(SEVERITIES.map((s) => [s, openAlerts.filter((a) => a.severity === s).length])),
        latest: openAlerts.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5).map((a) => ({ id: a.id, ruleType: a.ruleType, severity: a.severity, status: a.status, title: a.title, flockId: a.flockId ?? null, date: a.date })),
      };
      if (can(ctx.role, "production.read")) {
        out["production"] = await safe(async () => {
          const day = await d.dailyRecords.dashboardDay(ctx, {});
          const weighings = await repos.flockEvents.find(ctx.farmId, { where: { flockId: day.flocks.map((f) => f.flockId), type: "weighing" } as never, sort: [{ field: "date", dir: -1 }] });
          const reversed = new Set(weighings.filter((w) => w.reversalOf).map((w) => w.reversalOf!));
          const lastWeighed = new Map<string, string>();
          for (const w of weighings) if (!w.reversalOf && !reversed.has(w.id) && !lastWeighed.has(w.flockId)) lastWeighed.set(w.flockId, w.date);
          // Average weight across weighed flocks, weighted by the birds alive in each.
          const weighed = day.flocks.filter((f) => f.latestAverageWeightG && f.birdsAlive > 0);
          const weighedBirds = weighed.reduce((t, f) => t + f.birdsAlive, 0);
          const averageWeightG = weighedBirds ? Math.round(weighed.reduce((t, f) => t + f.latestAverageWeightG! * f.birdsAlive, 0) / weighedBirds) : null;
          const latestWeighingDate = [...lastWeighed.values()].sort().at(-1) ?? null;
          return {
            totals: { ...day.totals, averageWeightG, latestWeighingDate },
            flocksTotal: day.flocksTotal,
            flocksRecorded: day.flocksRecorded,
            flocks: day.flocks.map((f) => ({
              flockId: f.flockId, flockCode: f.flockCode, type: f.type, houseId: f.houseId, birdsAlive: f.birdsAlive, mortality: f.mortality, culls: f.culls,
              feedKg: f.feedKg, waterLitres: f.waterLitres, eggsCollected: f.eggsCollected, eggsBroken: f.eggsBroken,
              averageWeightG: f.latestAverageWeightG, latestWeighingDate: lastWeighed.get(f.flockId) ?? null, recorded: f.recorded,
            })),
          };
        });
      }
      out["weather"] = farm!.location
        ? await safe(async () => {
            const w = await d.weather.forFarm(ctx, { historyDays: 7 });
            return { current: w.current, today: w.forecast[0] ?? null, next: w.forecast.slice(1, 3), risks: w.risks, stale: w.stale, fetchedAt: w.fetchedAt };
          })
        : { unavailable: "Set the farm's location to see weather" };
      out["upcoming"] = await safe(async () => (await d.calendar.events(ctx, { from: today, to: addDays(today, 7) })).events.slice(0, 10));
      if (can(ctx.role, "inventory.read")) {
        out["inventory"] = await safe(async () => {
          const [o, f] = await Promise.all([d.inventory.overview(ctx), d.feed.stock(ctx)]);
          return {
            totalValueMinor: o.totalValueMinor,
            lowStockItems: Object.values(o.categories).reduce((t, c) => t + c.lowStock, 0),
            lotsExpiringSoon: Object.values(o.categories).reduce((t, c) => t + c.lotsExpiringSoon, 0),
            feedDaysRemaining: f.totals.daysRemaining,
            eggsInStock: o.eggs.total,
            chicksAvailable: o.chicks.available,
          };
        });
      }
      if (can(ctx.role, "hatchery.read")) {
        out["hatchery"] = await safe(async () => {
          const batches = await repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] } as never, sort: [{ field: "expectedHatchDate", dir: 1 }] });
          return { incubating: batches.length, eggsIncubating: batches.reduce((t, b) => t + (b.results?.inIncubation ?? b.eggsSet), 0), nextHatch: batches[0] ? { batchId: batches[0].id, code: batches[0].code, date: batches[0].expectedHatchDate } : null };
        });
      }
      if (can(ctx.role, "task.read")) out["tasks"] = await safe(() => d.tasks.summary(ctx));
      if (can(ctx.role, "money.read")) {
        out["finance"] = await safe(async () => {
          const monthStart = `${today.slice(0, 8)}01`;
          const [accounts, recv, pay, pnl] = await Promise.all([d.finance.listAccounts(ctx), d.finance.openItems(ctx, "income"), d.finance.openItems(ctx, "expense"), d.finance.profitAndLoss(ctx, { from: monthStart, to: today })]);
          return { cashMinor: accounts.reduce((t, a) => t + a.balanceMinor, 0), receivablesMinor: recv.totalOutstandingMinor, payablesMinor: pay.totalOutstandingMinor, monthToDate: { revenueMinor: pnl.revenue.totalMinor, expensesMinor: pnl.expenses.totalMinor, profitMinor: pnl.netProfitMinor } };
        });
      }
      return out;
    },

    /**
     * GET /analytics. Daily series (mortality %, hen-day %, feed and water per bird) for the chosen flocks, each day with
     * a baseline band from the preceding days and an anomaly flag using the farm's own rule parameters; flocks compared
     * with the farm's past flocks of the same type; alert counts for the period.
     */
    async analytics(ctx: FarmContext, q: { from: string; to: string; flockId?: string; type?: FlockRecord["type"] }) {
      assertCan(ctx, "production.read");
      if (q.from > q.to) throw new AppError("VALIDATION_FAILED", "from must be on or before to");
      if (dateRange(q.from, q.to).length > 366) throw new AppError("VALIDATION_FAILED", "Ask for at most 366 days at a time");
      const all = q.flockId ? [await d.flocks.ledger.loadFlock(ctx, q.flockId)] : await repos.flocks.find(ctx.farmId, { where: { status: ["active", "closed"] } as never });
      const flocks = all.filter((f) => (!q.type || f.type === q.type) && f.placementDate && f.placementDate <= q.to && (f.status === "active" || (f.closedDate ?? "9999") >= q.from));
      const rules = {
        mortality: await d.rules.config(ctx, "mortality"),
        egg_production: await d.rules.config(ctx, "egg_production"),
        feed_consumption: await d.rules.config(ctx, "feed_consumption"),
        water_consumption: await d.rules.config(ctx, "water_consumption"),
      };
      const maxWindow = Math.max(...Object.values(rules).map((r) => r.params["windowDays"] ?? 7));
      const perFlock = await Promise.all(flocks.map(async (f) => ({ f, days: await d.intelligence.flockDays(ctx, f, addDays(q.from, -maxWindow), q.to) })));
      const allDates = dateRange(addDays(q.from, -maxWindow), q.to);
      // Farm totals per day across the chosen flocks.
      const totals = allDates.map((date) => {
        let alive = 0, layingAlive = 0, deaths = 0, deathsKnown = false, eggs = 0, eggsKnown = false, feed = 0, feedAlive = 0, water = 0, waterAlive = 0;
        for (const { f, days } of perFlock) {
          const x = days.find((y) => y.date === date);
          if (!x) continue;
          alive += x.aliveStart;
          if (x.deaths !== null) { deaths += x.deaths; deathsKnown = true; }
          if (LAYING.has(f.type) && x.henDayPercent !== null) { layingAlive += x.aliveStart; eggs += (x.henDayPercent * x.aliveStart) / 100; eggsKnown = true; }
          if (x.feedGPerBird !== null) { feed += x.feedGPerBird * x.aliveStart; feedAlive += x.aliveStart; }
          if (x.waterMlPerBird !== null) { water += x.waterMlPerBird * x.aliveStart; waterAlive += x.aliveStart; }
        }
        return {
          date,
          mortality: deathsKnown && alive > 0 ? (deaths / alive) * 100 : null,
          egg_production: eggsKnown && layingAlive > 0 ? (eggs / layingAlive) * 100 : null,
          feed_consumption: feedAlive > 0 ? feed / feedAlive : null,
          water_consumption: waterAlive > 0 ? water / waterAlive : null,
        };
      });
      const series = (Object.keys(rules) as (keyof typeof rules)[]).map((metric) => {
        const rule = rules[metric];
        const test = metric === "mortality" ? { direction: "above" as const, deviationPercent: rule.params["deviationPercent"] ?? 50 } : metric === "egg_production" ? { direction: "below" as const, deviationPercent: rule.params["dropPercent"] ?? 10 } : { direction: "both" as const, deviationPercent: rule.params["deviationPercent"] ?? 20 };
        const points = totals.filter((t) => t.date >= q.from).map((t) => {
          const prior = totals.filter((x) => x.date < t.date && x.date >= addDays(t.date, -(rule.params["windowDays"] ?? 7))).map((x) => x[metric]).filter((v): v is number => v !== null);
          const b = baselineOf(prior, rule.params["minBaselineDays"] ?? 3);
          const v = t[metric];
          const r3 = (n: number) => Math.round(n * 1000) / 1000;
          return { date: t.date, value: v === null ? null : r3(v), baselineMean: b ? r3(b.mean) : null, baselineLow: b ? r3(b.mean - b.sd) : null, baselineHigh: b ? r3(b.mean + b.sd) : null, anomaly: v !== null && b !== null && deviationFrom(v, b, test).triggered };
        });
        return { metric, unit: metric === "mortality" ? "% of birds per day" : metric === "egg_production" ? "% hen-day" : metric === "feed_consumption" ? "g per bird per day" : "ml per bird per day", ruleEnabled: rule.enabled, windowDays: rule.params["windowDays"] ?? 7, points, anomalies: points.filter((p) => p.anomaly).length };
      });
      // Flock comparison against the farm's own past flocks of the same type.
      const closed = (await repos.flocks.find(ctx.farmId, { where: { status: "closed" }, sort: [{ field: "closedDate", dir: -1 }] })).slice(0, 20);
      const past = new Map<string, { fcr: number[]; mortality: number[] }>();
      for (const f of closed) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        const e = past.get(f.type) ?? { fcr: [], mortality: [] };
        if (m.fcr !== null) e.fcr.push(m.fcr);
        if (m.mortalityRate !== null) e.mortality.push(m.mortalityRate);
        past.set(f.type, e);
      }
      const comparison = [];
      for (const { f, days } of perFlock) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        const p = past.get(f.type);
        const fcrBase = baselineOf(p?.fcr ?? [], 1);
        const mortBase = baselineOf(p?.mortality ?? [], 1);
        const hd = days.filter((x) => x.date >= q.from && x.henDayPercent !== null).map((x) => x.henDayPercent!);
        comparison.push({
          flockId: f.id, flockCode: f.flockCode, type: f.type, status: f.status, ageDays: m.ageDays,
          mortalityRate: m.mortalityRate, farmPastMortalityRate: mortBase?.mean ?? null,
          fcr: m.fcr, farmPastFcr: fcrBase?.mean ?? null, pastFlocks: fcrBase?.n ?? mortBase?.n ?? 0,
          dailyWeightGainG: m.dailyWeightGainG, averageHenDayPercent: hd.length ? hd.reduce((t, v) => t + v, 0) / hd.length : null,
        });
      }
      const alertRows = (await repos.alerts.find(ctx.farmId, { range: { field: "date", from: q.from, to: q.to } }));
      const alertCounts: Record<string, number> = {};
      for (const a of alertRows) alertCounts[a.ruleType] = (alertCounts[a.ruleType] ?? 0) + 1;
      return { from: q.from, to: q.to, flocks: flocks.map((f) => ({ id: f.id, flockCode: f.flockCode, type: f.type })), series, comparison, alerts: { total: alertRows.length, byType: alertCounts } };
    },
  };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
