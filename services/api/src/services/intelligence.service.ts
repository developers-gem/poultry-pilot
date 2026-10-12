import { addDays, ageDays, baselineOf, dateRange, deviationFrom, effectiveEvents, localDateOf, population, type Baseline, type RuleKey } from "../domain/index.js";
import type { Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { AlertRecord, FarmRecord, FlockRecord } from "../ports/records.js";
import type { AlertService } from "./alert.service.js";
import type { FarmContext } from "./context.js";
import { toLedger, type FlockService } from "./flock.service.js";
import type { EffectiveRule, RulesService } from "./rules.service.js";
import type { WeatherService } from "./weather.service.js";

const LAYING = new Set(["layer", "breeder", "custom"]);
type Metric = "mortality" | "egg_production" | "feed_consumption" | "water_consumption";

export interface FlockDay {
  date: string;
  aliveStart: number;
  deaths: number | null;
  henDayPercent: number | null;
  feedGPerBird: number | null;
  waterMlPerBird: number | null;
}

/**
 * The rule engine. Production rules compare a flock with its own preceding days; FCR with the farm's own past flocks;
 * weight with the farm's target for the age (or the flock's own gain); schedules with their dates; weather with the
 * farm's own recent weather. Schedule and condition alerts resolve themselves when the condition clears.
 */
export function createIntelligenceService(d: { repos: Repositories; clock: Clock; alerts: AlertService; rules: RulesService; flocks: FlockService; weather: WeatherService }) {
  const { repos, clock, alerts } = d;
  const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

  /** Daily per-flock figures for a range, from the source collections. Days without any record have nulls. */
  async function flockDays(ctx: FarmContext, flock: FlockRecord, from: string, to: string, tx?: Tx): Promise<FlockDay[]> {
    const start = flock.placementDate && flock.placementDate > from ? flock.placementDate : from;
    if (start > to) return [];
    const range = { field: "date" as const, from: start, to };
    const [events, records, eggs, feed, water] = await Promise.all([
      d.flocks.ledger.loadEvents(ctx, flock.id, tx),
      repos.dailyRecords.find(ctx.farmId, { where: { flockId: flock.id }, range }, tx),
      repos.eggRecords.find(ctx.farmId, { where: { flockId: flock.id }, range }, tx),
      repos.feedConsumption.find(ctx.farmId, { where: { flockId: flock.id, kind: "consumption" }, range }, tx),
      repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id }, range }, tx),
    ]);
    const ledger = events.map(toLedger);
    const live = effectiveEvents(ledger);
    return dateRange(start, to).map((date) => {
      const aliveStart = population(ledger, addDays(date, -1)).alive;
      const dayDeaths = live.filter((e) => e.type === "mortality" && e.date === date);
      const recorded = records.some((r) => r.date === date) || dayDeaths.length > 0;
      const egg = eggs.find((e) => e.date === date);
      const dayFeed = feed.filter((f) => f.date === date);
      const w = water.find((x) => x.date === date);
      return {
        date,
        aliveStart,
        deaths: recorded ? dayDeaths.reduce((t, e) => t + (e.birds ?? 0), 0) : null,
        henDayPercent: egg && aliveStart > 0 ? (egg.collected / aliveStart) * 100 : null,
        feedGPerBird: dayFeed.length && aliveStart > 0 ? (dayFeed.reduce((t, f) => t + f.quantityKg, 0) * 1000) / aliveStart : null,
        waterMlPerBird: w && aliveStart > 0 ? (w.litres * 1000) / aliveStart : null,
      };
    });
  }

  const valueOf = (m: Metric, day: FlockDay) => (m === "mortality" ? day.deaths : m === "egg_production" ? day.henDayPercent : m === "feed_consumption" ? day.feedGPerBird : day.waterMlPerBird);

  const ALERT_TYPE: Record<Metric, AlertRecord["ruleType"]> = { mortality: "mortality_spike", egg_production: "egg_drop", feed_consumption: "feed_change", water_consumption: "water_abnormal" };
  const UNIT: Record<Metric, string> = { mortality: "deaths", egg_production: "% hen-day", feed_consumption: "g feed per bird", water_consumption: "ml water per bird" };

  /** A flock's day against its own baseline (the window of days before it), per the farm's parameters. */
  function judgeDay(m: Metric, days: FlockDay[], date: string, p: Record<string, number>): { triggered: boolean; value: number; baseline: Baseline; reason: string } | null {
    const day = days.find((x) => x.date === date);
    const value = day ? valueOf(m, day) : null;
    if (value === null || value === undefined || !day) return null;
    const window = days.filter((x) => x.date < date && x.date >= addDays(date, -(p["windowDays"] ?? 7))).map((x) => valueOf(m, x)).filter((v): v is number => v !== null);
    const b = baselineOf(window, p["minBaselineDays"] ?? 3);
    if (!b) return null;
    const avg = round(b.mean, m === "mortality" ? 1 : 1);
    if (m === "mortality") {
      const dev = deviationFrom(value, b, { direction: "above", deviationPercent: p["deviationPercent"] ?? 50, ...(p["minExtraBirds"] !== undefined ? { minAbsoluteChange: p["minExtraBirds"] } : {}) });
      const rate = day.aliveStart > 0 ? (value / day.aliveStart) * 100 : 0;
      const overLimit = p["dailyRatePercentMax"] !== undefined && rate > p["dailyRatePercentMax"];
      return { triggered: dev.triggered || overLimit, value, baseline: b, reason: dev.triggered ? `${value} deaths, ${round(dev.deviationPercent ?? 0, 0)}% above this flock's recent average of ${avg} a day` : `${value} deaths (${round(rate, 2)}% of birds), above the farm's daily limit of ${p["dailyRatePercentMax"]}%` };
    }
    if (m === "egg_production") {
      const dev = deviationFrom(value, b, { direction: "below", deviationPercent: p["dropPercent"] ?? 10 });
      const underMin = p["henDayPercentMin"] !== undefined && value < p["henDayPercentMin"];
      return { triggered: dev.triggered || underMin, value, baseline: b, reason: dev.triggered ? `hen-day production ${round(value)}%, ${round(-(dev.deviationPercent ?? 0), 0)}% below this flock's recent ${avg}%` : `hen-day production ${round(value)}%, below the farm's minimum of ${p["henDayPercentMin"]}%` };
    }
    const dev = deviationFrom(value, b, { direction: "both", deviationPercent: p["deviationPercent"] ?? 20 });
    return { triggered: dev.triggered, value, baseline: b, reason: `${round(value, 0)} ${UNIT[m]}, ${round(Math.abs(dev.deviationPercent ?? 0), 0)}% ${dev.direction === "above" ? "above" : "below"} this flock's recent ${round(b.mean, 0)}` };
  }

  async function resolveMissing(ctx: FarmContext, ruleType: AlertRecord["ruleType"], keep: Set<string>, tx: Tx, prefix?: string) {
    for (const a of await repos.alerts.find(ctx.farmId, { where: { ruleType, status: ["open", "acknowledged"] } as never }, tx)) {
      if ((!prefix || a.dedupKey.startsWith(prefix)) && !keep.has(a.dedupKey)) await alerts.resolve(ctx, a.dedupKey, tx);
    }
  }

  async function evaluateProduction(ctx: FarmContext, farm: FarmRecord, m: Metric, rule: EffectiveRule, tx: Tx) {
    const today = localDateOf(clock.now(), farm.settings.timezone);
    let raised = 0;
    for (const flock of await repos.flocks.find(ctx.farmId, { where: { status: "active" } }, tx)) {
      if (m === "egg_production" && !LAYING.has(flock.type)) continue;
      const days = await flockDays(ctx, flock, addDays(today, -((rule.params["windowDays"] ?? 7) + 1)), today, tx);
      // Yesterday is a complete day; today counts once its daily record exists.
      const hasToday = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId: flock.id, date: today }, limit: 1 }, tx)).length > 0;
      for (const date of hasToday ? [addDays(today, -1), today] : [addDays(today, -1)]) {
        const j = judgeDay(m, days, date, rule.params);
        if (!j?.triggered) continue;
        raised++;
        await alerts.raise(ctx, { ruleType: ALERT_TYPE[m], severity: "warning", title: `${flock.flockCode}: ${m.replace("_", " ")} on ${date}`, message: `${flock.flockCode} on ${date}: ${j.reason}. Check the birds and the house; contact your veterinarian if it continues.`, dedupKey: `${m}:${flock.id}:${date}`, date, flockId: flock.id, houseId: flock.houseId, values: { value: round(j.value, 2), baselineMean: round(j.baseline.mean, 2), baselineDays: j.baseline.n } }, tx);
      }
    }
    return raised;
  }

  async function profileTarget(ctx: FarmContext, flock: FlockRecord, age: number, tx: Tx) {
    const profiles = await repos.broodingProfiles.find(ctx.farmId, { where: { isDefault: true } }, tx);
    const p = profiles.find((x) => !x.flockTypes?.length || x.flockTypes.includes(flock.type));
    return p?.bands.find((b) => age >= b.fromDay && age <= b.toDay)?.targetWeightG;
  }

  const evaluators: Record<RuleKey, ((ctx: FarmContext, farm: FarmRecord, rule: EffectiveRule, tx: Tx) => Promise<number>) | null> = {
    mortality: (c, f, r, t) => evaluateProduction(c, f, "mortality", r, t),
    egg_production: (c, f, r, t) => evaluateProduction(c, f, "egg_production", r, t),
    feed_consumption: (c, f, r, t) => evaluateProduction(c, f, "feed_consumption", r, t),
    water_consumption: null, // judged when the daily record is saved (same rule parameters), so it is not raised twice

    async weight_variance(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      let raised = 0;
      for (const flock of await repos.flocks.find(ctx.farmId, { where: { status: "active" } }, tx)) {
        const m = await d.flocks.metrics(ctx, flock.id, {});
        if (!m.latestWeighingDate || m.latestWeighingDate < addDays(today, -7) || m.averageWeightG === null) continue;
        const age = ageDays({ ...(flock.hatchDate ? { hatchDate: flock.hatchDate } : {}), ...(flock.placementDate ? { placementDate: flock.placementDate } : {}), ...(flock.ageDaysAtPlacement !== undefined ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {}) }, m.latestWeighingDate) ?? 0;
        const target = await profileTarget(ctx, flock, age, tx);
        let reason: string | null = null;
        if (target && rule.params["belowTargetPercent"] !== undefined && m.averageWeightG < target * (1 - rule.params["belowTargetPercent"] / 100)) {
          reason = `average ${round(m.averageWeightG, 0)} g at day ${age}, ${round(((target - m.averageWeightG) / target) * 100, 0)}% below the farm's target of ${target} g`;
        } else if (!target && m.recentDailyWeightGainG !== null && m.dailyWeightGainG && rule.params["gainDropPercent"] !== undefined && m.recentDailyWeightGainG < m.dailyWeightGainG * (1 - rule.params["gainDropPercent"] / 100)) {
          reason = `recent gain ${round(m.recentDailyWeightGainG, 0)} g a day, ${round(((m.dailyWeightGainG - m.recentDailyWeightGainG) / m.dailyWeightGainG) * 100, 0)}% below this flock's own ${round(m.dailyWeightGainG, 0)} g a day`;
        }
        if (!reason) continue;
        raised++;
        await alerts.raise(ctx, { ruleType: "weight_variance", severity: "warning", title: `${flock.flockCode}: weight behind`, message: `${flock.flockCode}: ${reason}.`, dedupKey: `weight:${flock.id}:${m.latestWeighingDate}`, date: m.latestWeighingDate, flockId: flock.id, houseId: flock.houseId, values: { averageWeightG: m.averageWeightG, ...(target ? { targetWeightG: target } : {}) } }, tx);
      }
      return raised;
    },

    async fcr_variance(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const closed = (await repos.flocks.find(ctx.farmId, { where: { status: "closed" }, sort: [{ field: "closedDate", dir: -1 }] }, tx)).slice(0, 20);
      const pastFcr = new Map<string, number[]>();
      for (const f of closed) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        if (m.fcr !== null) pastFcr.set(f.type, [...(pastFcr.get(f.type) ?? []), m.fcr]);
      }
      const keep = new Set<string>();
      for (const flock of await repos.flocks.find(ctx.farmId, { where: { status: "active" } }, tx)) {
        const m = await d.flocks.metrics(ctx, flock.id, {});
        if (m.fcr === null) continue;
        const past = baselineOf(pastFcr.get(flock.type) ?? [], rule.params["minPastFlocks"] ?? 2);
        const ref = rule.params["targetFcr"] ?? past?.mean;
        if (ref === undefined) continue;
        const limit = ref * (1 + (rule.params["abovePercent"] ?? 10) / 100);
        if (m.fcr <= limit) continue;
        keep.add(`fcr:${flock.id}`);
        const basis = rule.params["targetFcr"] !== undefined ? `the farm's target of ${ref}` : `the farm's past ${flock.type} flocks (${round(ref, 2)}, ${past!.n} flocks)`;
        await alerts.raise(ctx, { ruleType: "fcr_variance", severity: "info", title: `${flock.flockCode}: FCR above the farm's usual`, message: `${flock.flockCode}: FCR ${round(m.fcr, 2)}, more than ${rule.params["abovePercent"] ?? 10}% above ${basis}.`, dedupKey: `fcr:${flock.id}`, date: today, flockId: flock.id, houseId: flock.houseId, values: { fcr: round(m.fcr, 3), reference: round(ref, 3) } }, tx);
      }
      // FCR is a condition, not a one-day event: the alert clears when the flock is back within range.
      await resolveMissing(ctx, "fcr_variance", keep, tx);
      return keep.size;
    },

    inventory: null, // stock alerts are raised in every stock transaction and by the hourly job (governed by this rule)
    medicine_expiry: null,

    async vaccination_due(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const code = new Map((await repos.flocks.find(ctx.farmId, {}, tx)).map((f) => [f.id, f.flockCode]));
      const keep = new Set<string>();
      for (const v of await repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `vaccination:${v.id}`;
        keep.add(key);
        const overdue = v.dueDate < today;
        await alerts.raise(ctx, { ruleType: "vaccination_due", severity: overdue ? "warning" : "info", title: `Vaccination ${overdue ? "overdue" : "due"}: ${code.get(v.flockId) ?? "flock"}`, message: `${v.vaccineName} for ${code.get(v.flockId) ?? "the flock"} ${overdue ? `was due on ${v.dueDate}` : `is due on ${v.dueDate}`}.`, dedupKey: key, date: today, flockId: v.flockId }, tx);
      }
      await resolveMissing(ctx, "vaccination_due", keep, tx);
      return keep.size;
    },

    async vet_appointment(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = new Set<string>();
      for (const t of await repos.tasks.find(ctx.farmId, { where: { kind: "vet_appointment", status: ["open", "in_progress"] } as never, range: { field: "dueDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `vet_appointment:${t.id}`;
        keep.add(key);
        await alerts.raise(ctx, { ruleType: "vet_appointment", severity: t.dueDate! < today ? "warning" : "info", title: `Vet appointment ${t.dueDate! < today ? "missed?" : "coming up"}: ${t.title}`, message: `${t.title} on ${t.dueDate}.`, dedupKey: key, date: today, ...(t.flockId ? { flockId: t.flockId } : {}) }, tx);
      }
      await resolveMissing(ctx, "vet_appointment", keep, tx);
      return keep.size;
    },

    async hatch_date(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = new Set<string>();
      for (const b of await repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] } as never, range: { field: "expectedHatchDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `hatch_due:${b.id}`;
        keep.add(key);
        const when = b.expectedHatchDate < today ? "overdue" : b.expectedHatchDate === today ? "due today" : `due ${b.expectedHatchDate}`;
        await alerts.raise(ctx, { ruleType: "hatch_due", severity: b.expectedHatchDate < today ? "warning" : "info", title: `Hatch ${when}: batch ${b.code}`, message: `Batch ${b.code} (${b.eggsSet} eggs set on ${b.setDate}) is expected to hatch on ${b.expectedHatchDate}.`, dedupKey: key, date: today }, tx);
      }
      await resolveMissing(ctx, "hatch_due", keep, tx);
      return keep.size;
    },

    async order_delivery(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = new Set<string>();
      for (const o of await repos.orders.find(ctx.farmId, { where: { status: ["pending", "accepted", "preparing", "dispatched"] } as never, range: { field: "requestedDeliveryDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `order_delivery:${o.id}`;
        keep.add(key);
        const late = o.requestedDeliveryDate! < today;
        await alerts.raise(ctx, { ruleType: "order_delivery", severity: late ? "warning" : "info", title: `Order ${o.orderNumber} delivery ${late ? "overdue" : "due"}`, message: `Order ${o.orderNumber} (${o.lines[0]?.quantity} ${o.lines[0]?.unit} ${o.lines[0]?.description ?? ""}) is ${o.status} and due for delivery on ${o.requestedDeliveryDate}.`, dedupKey: key, date: today }, tx);
      }
      await resolveMissing(ctx, "order_delivery", keep, tx);
      return keep.size;
    },

    async payment_overdue(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const cutoff = addDays(today, -(rule.params["graceDays"] ?? 0) - 1);
      const keep = new Set<string>();
      const open = { where: { status: ["unpaid", "partially_paid"] } as never };
      const docs = [
        ...(await repos.incomes.find(ctx.farmId, open, tx)).map((x) => ({ ...x, side: "receivable" as const, who: x.customerName })),
        ...(rule.params["includePayables"] === 0 ? [] : (await repos.expenses.find(ctx.farmId, open, tx)).map((x) => ({ ...x, side: "payable" as const, who: x.vendor }))),
      ];
      for (const doc of docs) {
        // Overdue needs a due date someone set; documents without one (e.g. cash purchases) are aged, not alerted.
        if (!doc.dueDate) continue;
        const due = doc.dueDate;
        if (due > cutoff) continue;
        const key = `payment_overdue:${doc.id}`;
        keep.add(key);
        const owed = doc.amount.amountMinor - doc.amountPaid.amountMinor;
        await alerts.raise(ctx, { ruleType: "payment_overdue", severity: "warning", title: doc.side === "receivable" ? `Payment overdue from ${doc.who ?? "a customer"}` : `Bill overdue: ${doc.description}`, message: `${doc.description}: ${owed / 100} ${doc.amount.currency} ${doc.side === "receivable" ? "still owed to the farm" : "still owed by the farm"}, due ${due}.`, dedupKey: key, date: today, values: { outstandingMinor: owed } }, tx);
      }
      await resolveMissing(ctx, "payment_overdue", keep, tx);
      return keep.size;
    },

    async weather_risk(ctx, farm, rule, tx) {
      if (!farm.location) return 0;
      let w;
      try {
        w = await d.weather.forFarm(ctx);
      } catch {
        return 0; // weather unavailable: leave existing alerts as they are
      }
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = new Set<string>();
      for (const r of w.risks) {
        const key = `weather:${r.date}:${r.kind}`;
        keep.add(key);
        await alerts.raise(ctx, { ruleType: "weather_risk", severity: r.kind === "heat" || r.kind === "cold" ? "warning" : "info", title: `Weather: ${r.kind} on ${r.date}`, message: `Forecast for ${r.date}: ${r.reason}. Plan ventilation, water and feeding times accordingly.`, dedupKey: key, date: today, values: { value: r.value } }, tx);
      }
      void rule;
      await resolveMissing(ctx, "weather_risk", keep, tx);
      return keep.size;
    },
  };

  return {
    flockDays,
    judgeDay,

    /** Evaluate every enabled rule for the farm. One failing rule does not stop the others. */
    async evaluate(ctx: FarmContext, tx: Tx): Promise<Record<string, number | string>> {
      const farm = await repos.farms.findById(ctx.farmId, tx);
      if (!farm) return {};
      const out: Record<string, number | string> = {};
      for (const [key, fn] of Object.entries(evaluators) as [RuleKey, (typeof evaluators)[RuleKey]][]) {
        if (!fn) continue;
        const rule = await d.rules.config(ctx, key, tx);
        if (!rule.enabled) {
          out[key] = "off";
          continue;
        }
        try {
          out[key] = await fn(ctx, farm, rule, tx);
        } catch (e) {
          out[key] = `error: ${(e as Error).message}`;
        }
      }
      return out;
    },
  };
}

export type IntelligenceService = ReturnType<typeof createIntelligenceService>;
