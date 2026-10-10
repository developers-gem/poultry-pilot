import type { AlertSeverity } from "@poultrypilot/types";
import { addDays, lastNDates } from "./dates.js";

/**
 * Server-side alert rules evaluated per flock on the last COMPLETE farm-local day.
 * Fixes audit B13–B15: browser-only evaluation, partial-day comparisons, farm-wide absolute thresholds.
 * Messages state what changed and suggest contacting a vet; they never name a disease.
 */

export interface DayFigures {
  mortality: number;
  birdsAliveStartOfDay: number;
  eggs?: number;
  feedKg?: number;
}

export interface AlertRuleConfig {
  baselineDays: number;
  minBaselineDays: number;
  mortalityMultiplier: number;
  mortalityMinPercent: number;
  mortalityMinCount: number;
  eggDropPercent: number;
  feedChangePercent: number;
}

export const DEFAULT_ALERT_RULES: AlertRuleConfig = {
  baselineDays: 7,
  minBaselineDays: 4,
  mortalityMultiplier: 2,
  mortalityMinPercent: 0.1,
  mortalityMinCount: 3,
  eggDropPercent: 10,
  feedChangePercent: 20,
};

export interface AlertFinding {
  rule: "mortality_spike" | "egg_drop" | "feed_change" | "missing_record";
  severity: AlertSeverity;
  flockId: string;
  date: string;
  dedupKey: string;
  message: string;
  values: Record<string, number>;
}

const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length;

export function evaluateFlockAlerts(opts: {
  flockId: string;
  flockName: string;
  /** Records keyed by farm-local date. A missing key means nothing was recorded. */
  days: Record<string, DayFigures>;
  /** Farm-local "today". Evaluation runs on yesterday, the last complete day. */
  today: string;
  laying: boolean;
  config?: AlertRuleConfig;
}): AlertFinding[] {
  const cfg = opts.config ?? DEFAULT_ALERT_RULES;
  const day = addDays(opts.today, -1);
  const baselineDates = lastNDates(addDays(day, -1), cfg.baselineDays);
  const rec = opts.days[day];
  const base = baselineDates.map((d) => opts.days[d]).filter((d): d is DayFigures => d !== undefined);
  const out: AlertFinding[] = [];
  const key = (rule: AlertFinding["rule"]) => `${rule}:${opts.flockId}:${day}`;

  if (!rec) {
    out.push({
      rule: "missing_record",
      severity: "info",
      flockId: opts.flockId,
      date: day,
      dedupKey: key("missing_record"),
      message: `No daily record was saved for ${opts.flockName} on ${day}.`,
      values: {},
    });
    return out;
  }

  // Mortality: relative to flock size AND to the flock's own recent baseline.
  if (rec.birdsAliveStartOfDay > 0) {
    const pct = (rec.mortality / rec.birdsAliveStartOfDay) * 100;
    const basePcts = base.filter((b) => b.birdsAliveStartOfDay > 0).map((b) => (b.mortality / b.birdsAliveStartOfDay) * 100);
    const basePct = basePcts.length >= cfg.minBaselineDays ? mean(basePcts) : 0;
    const threshold = Math.max(cfg.mortalityMinPercent, basePct * cfg.mortalityMultiplier);
    if (rec.mortality >= cfg.mortalityMinCount && pct > threshold) {
      out.push({
        rule: "mortality_spike",
        severity: pct > threshold * 2 ? "critical" : "warning",
        flockId: opts.flockId,
        date: day,
        dedupKey: key("mortality_spike"),
        message:
          `${rec.mortality} birds died in ${opts.flockName} on ${day} (${pct.toFixed(2)}% of the flock), ` +
          `above the ${threshold.toFixed(2)}% alert level. Inspect the flock and contact your veterinarian if losses continue.`,
        values: { mortality: rec.mortality, percent: pct, thresholdPercent: threshold, baselinePercent: basePct },
      });
    }
  }

  // Egg drop: only for laying flocks, only with enough baseline days that recorded eggs.
  if (opts.laying && rec.eggs !== undefined) {
    const eggBase = base.filter((b) => b.eggs !== undefined).map((b) => b.eggs as number);
    if (eggBase.length >= cfg.minBaselineDays) {
      const avg = mean(eggBase);
      if (avg > 0 && rec.eggs < avg * (1 - cfg.eggDropPercent / 100)) {
        const drop = ((avg - rec.eggs) / avg) * 100;
        out.push({
          rule: "egg_drop",
          severity: drop >= cfg.eggDropPercent * 2 ? "critical" : "warning",
          flockId: opts.flockId,
          date: day,
          dedupKey: key("egg_drop"),
          message:
            `${opts.flockName} produced ${rec.eggs} eggs on ${day}, ${drop.toFixed(0)}% below its ${eggBase.length}-day average of ${avg.toFixed(0)}. ` +
            `Check water, feed, lighting and heat; contact your veterinarian if the drop continues.`,
          values: { eggs: rec.eggs, baseline: avg, dropPercent: drop },
        });
      }
    }
  }

  // Feed change: only when feed was actually recorded for the day.
  if (rec.feedKg !== undefined) {
    const feedBase = base.filter((b) => b.feedKg !== undefined).map((b) => b.feedKg as number);
    if (feedBase.length >= cfg.minBaselineDays) {
      const avg = mean(feedBase);
      if (avg > 0 && Math.abs(rec.feedKg - avg) > avg * (cfg.feedChangePercent / 100)) {
        const change = ((rec.feedKg - avg) / avg) * 100;
        out.push({
          rule: "feed_change",
          severity: "warning",
          flockId: opts.flockId,
          date: day,
          dedupKey: key("feed_change"),
          message:
            `Feed recorded for ${opts.flockName} on ${day} was ${rec.feedKg.toFixed(1)} kg, ` +
            `${change > 0 ? "+" : ""}${change.toFixed(0)}% against its recent average of ${avg.toFixed(1)} kg.`,
          values: { feedKg: rec.feedKg, baseline: avg, changePercent: change },
        });
      }
    }
  }
  return out;
}
