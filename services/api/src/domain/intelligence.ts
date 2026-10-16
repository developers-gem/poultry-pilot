import type { RULE_KEYS, ALERT_RULE_TYPES, ROLES, NOTIFICATION_CHANNELS } from "@poultrypilot/constants";

/**
 * The intelligence layer's arithmetic: baselines from a farm's own history, deviation tests, the rule catalog and
 * weather risk. No universal poultry threshold is assumed: production rules compare a flock with its own recent days
 * (or the farm's own past flocks); absolute limits and targets apply only when the farm sets them.
 */

export type RuleKey = (typeof RULE_KEYS)[number];
type AlertType = (typeof ALERT_RULE_TYPES)[number];
type Role = (typeof ROLES)[number];
type Channel = (typeof NOTIFICATION_CHANNELS)[number];

export interface Baseline {
  mean: number;
  sd: number;
  n: number;
  min: number;
  max: number;
}

/** Mean and standard deviation of past values; null until there are at least `minPoints`. */
export function baselineOf(values: number[], minPoints: number): Baseline | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < Math.max(1, minPoints)) return null;
  const mean = v.reduce((t, x) => t + x, 0) / v.length;
  const sd = v.length > 1 ? Math.sqrt(v.reduce((t, x) => t + (x - mean) ** 2, 0) / (v.length - 1)) : 0;
  return { mean, sd, n: v.length, min: Math.min(...v), max: Math.max(...v) };
}

export interface DeviationTest {
  direction: "above" | "below" | "both";
  /** Trigger when the value differs from the baseline mean by more than this percentage. */
  deviationPercent?: number;
  /** Or by more than this many standard deviations. */
  zScore?: number;
  /** And by at least this much in absolute terms (keeps small numbers from alarming: 2 deaths vs 1 is +100%). */
  minAbsoluteChange?: number;
}

export interface DeviationResult {
  triggered: boolean;
  direction: "above" | "below" | null;
  deviationPercent: number | null;
  z: number | null;
}

export function deviationFrom(value: number, b: Baseline, t: DeviationTest): DeviationResult {
  const diff = value - b.mean;
  const direction = diff > 0 ? "above" : diff < 0 ? "below" : null;
  const deviationPercent = b.mean !== 0 ? (diff / b.mean) * 100 : null;
  const z = b.sd > 0 ? diff / b.sd : null;
  const wrongWay = (t.direction === "above" && diff <= 0) || (t.direction === "below" && diff >= 0);
  const bigEnoughPct = t.deviationPercent === undefined ? false : deviationPercent === null ? diff !== 0 : Math.abs(deviationPercent) > t.deviationPercent;
  const bigEnoughZ = t.zScore === undefined || z === null ? false : Math.abs(z) > t.zScore;
  const absoluteOk = t.minAbsoluteChange === undefined || Math.abs(diff) >= t.minAbsoluteChange;
  return { triggered: !wrongWay && (bigEnoughPct || bigEnoughZ) && absoluteOk, direction, deviationPercent, z };
}

// ---- rule catalog -------------------------------------------------------------------

export interface ParamDef {
  key: string;
  label: string;
  unit?: string;
  /** Applied when the farm has not set the parameter. Undefined: the check is off until the farm sets it. */
  default?: number;
  min: number;
  max: number;
}

export interface RuleDefinition {
  key: RuleKey;
  label: string;
  description: string;
  alertTypes: AlertType[];
  baseline: "flock_history" | "farm_history" | "target" | "schedule" | "stock" | "weather_history";
  params: ParamDef[];
  defaultSeverity: "info" | "warning" | "critical";
  defaultRoles: Role[];
  defaultChannels: Channel[];
}

const WINDOW: ParamDef = { key: "windowDays", label: "Days of history for the baseline", unit: "days", default: 7, min: 3, max: 60 };
const MIN_BASE: ParamDef = { key: "minBaselineDays", label: "Days needed before judging", unit: "days", default: 3, min: 2, max: 30 };
const MANAGERS: Role[] = ["owner", "admin", "farm_manager"];
const FIELD: Role[] = ["owner", "admin", "farm_manager", "supervisor"];

export const RULE_DEFINITIONS: Record<RuleKey, RuleDefinition> = {
  mortality: {
    key: "mortality", label: "Mortality", alertTypes: ["mortality_spike"], baseline: "flock_history",
    description: "A day's deaths well above the flock's own recent average. An absolute daily limit applies only if set.",
    params: [WINDOW, MIN_BASE, { key: "deviationPercent", label: "Above the flock's average by more than", unit: "%", default: 50, min: 5, max: 1000 }, { key: "minExtraBirds", label: "And at least this many more birds", unit: "birds", default: 3, min: 0, max: 100_000 }, { key: "dailyRatePercentMax", label: "Daily mortality above (optional)", unit: "% of birds", min: 0, max: 100 }],
    defaultSeverity: "warning", defaultRoles: FIELD, defaultChannels: ["in_app", "push"],
  },
  egg_production: {
    key: "egg_production", label: "Egg production", alertTypes: ["egg_drop"], baseline: "flock_history",
    description: "Hen-day production below the flock's own recent level. A minimum hen-day % applies only if set.",
    params: [WINDOW, MIN_BASE, { key: "dropPercent", label: "Below the flock's average by more than", unit: "%", default: 10, min: 1, max: 100 }, { key: "henDayPercentMin", label: "Hen-day production below (optional)", unit: "%", min: 0, max: 100 }],
    defaultSeverity: "warning", defaultRoles: FIELD, defaultChannels: ["in_app", "push"],
  },
  feed_consumption: {
    key: "feed_consumption", label: "Feed consumption", alertTypes: ["feed_change"], baseline: "flock_history",
    description: "Feed eaten per bird far from the flock's own recent days, up or down.",
    params: [WINDOW, MIN_BASE, { key: "deviationPercent", label: "Different from the flock's average by more than", unit: "%", default: 20, min: 1, max: 500 }],
    defaultSeverity: "warning", defaultRoles: FIELD, defaultChannels: ["in_app", "push"],
  },
  water_consumption: {
    key: "water_consumption", label: "Water consumption and quality", alertTypes: ["water_abnormal"], baseline: "flock_history",
    description: "Water drunk far from the flock's own recent days. pH and dissolved-solids limits apply only if set.",
    params: [WINDOW, MIN_BASE, { key: "deviationPercent", label: "Different from the flock's average by more than", unit: "%", default: 20, min: 1, max: 500 }, { key: "phMin", label: "pH below (optional)", min: 0, max: 14 }, { key: "phMax", label: "pH above (optional)", min: 0, max: 14 }, { key: "tdsMaxPpm", label: "Dissolved solids above (optional)", unit: "ppm", min: 0, max: 100_000 }],
    defaultSeverity: "warning", defaultRoles: FIELD, defaultChannels: ["in_app", "push"],
  },
  weight_variance: {
    key: "weight_variance", label: "Weight variance", alertTypes: ["weight_variance"], baseline: "target",
    description: "Average weight below the farm's target for the age (brooding profile), or recent daily gain well below the flock's own.",
    params: [{ key: "belowTargetPercent", label: "Below the target weight by more than", unit: "%", default: 10, min: 1, max: 90 }, { key: "gainDropPercent", label: "Recent daily gain below the flock's own by more than", unit: "%", default: 25, min: 1, max: 100 }],
    defaultSeverity: "warning", defaultRoles: FIELD, defaultChannels: ["in_app", "push"],
  },
  fcr_variance: {
    key: "fcr_variance", label: "FCR variance", alertTypes: ["fcr_variance"], baseline: "farm_history",
    description: "A flock's FCR above the farm's own past flocks of the same type (at least 2), or above a target FCR if set.",
    params: [{ key: "abovePercent", label: "Above the farm's past flocks by more than", unit: "%", default: 10, min: 1, max: 200 }, { key: "minPastFlocks", label: "Past flocks needed", default: 2, min: 1, max: 50 }, { key: "targetFcr", label: "Target FCR (optional)", min: 0.5, max: 10 }],
    defaultSeverity: "info", defaultRoles: MANAGERS, defaultChannels: ["in_app", "push"],
  },
  inventory: {
    key: "inventory", label: "Low stock", alertTypes: ["low_inventory", "low_feed_stock"], baseline: "stock",
    description: "Stock at or below each item's own reorder level, or feed for fewer than the item's reorder days.",
    params: [], defaultSeverity: "warning", defaultRoles: MANAGERS, defaultChannels: ["in_app", "push", "email"],
  },
  medicine_expiry: {
    key: "medicine_expiry", label: "Expiry", alertTypes: ["expiry_soon", "expired_stock"], baseline: "stock",
    description: "Lots expiring within each item's own warning window, and expired stock still on hand.",
    params: [], defaultSeverity: "warning", defaultRoles: MANAGERS, defaultChannels: ["in_app", "push", "email"],
  },
  vaccination_due: {
    key: "vaccination_due", label: "Vaccination due", alertTypes: ["vaccination_due"], baseline: "schedule",
    description: "Vaccinations due soon or overdue, from the farm's own programmes.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 30 }],
    defaultSeverity: "warning", defaultRoles: FIELD, defaultChannels: ["in_app", "push"],
  },
  vet_appointment: {
    key: "vet_appointment", label: "Vet appointment", alertTypes: ["vet_appointment", "health_follow_up"], baseline: "schedule",
    description: "Booked vet appointments and health follow-ups coming up or overdue.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 30 }],
    defaultSeverity: "info", defaultRoles: MANAGERS, defaultChannels: ["in_app", "push"],
  },
  hatch_date: {
    key: "hatch_date", label: "Hatch date", alertTypes: ["hatch_due"], baseline: "schedule",
    description: "Hatches expected soon, due today or overdue.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 10 }],
    defaultSeverity: "info", defaultRoles: MANAGERS, defaultChannels: ["in_app", "push"],
  },
  order_delivery: {
    key: "order_delivery", label: "Order delivery", alertTypes: ["order_delivery"], baseline: "schedule",
    description: "Open orders with a delivery date coming up or passed.",
    params: [{ key: "daysAhead", label: "Remind this many days before", unit: "days", default: 1, min: 0, max: 14 }],
    defaultSeverity: "info", defaultRoles: MANAGERS, defaultChannels: ["in_app", "push", "email"],
  },
  payment_overdue: {
    key: "payment_overdue", label: "Payment overdue", alertTypes: ["payment_overdue"], baseline: "schedule",
    description: "Receivables (and, if chosen, payables) past their due date plus a grace period.",
    params: [{ key: "graceDays", label: "Days after the due date", unit: "days", default: 0, min: 0, max: 90 }, { key: "includePayables", label: "Also bills the farm owes (1 = yes)", default: 1, min: 0, max: 1 }],
    defaultSeverity: "warning", defaultRoles: ["owner", "admin", "accountant"], defaultChannels: ["in_app", "push", "email"],
  },
  weather_risk: {
    key: "weather_risk", label: "Weather risk", alertTypes: ["weather_risk"], baseline: "weather_history",
    description: "Forecast temperatures well above or below the farm's own recent weather. Fixed heat, cold, rain and wind limits apply only if set.",
    params: [
      { key: "forecastDays", label: "Days of forecast to check", unit: "days", default: 3, min: 1, max: 7 },
      { key: "historyDays", label: "Days of past weather for the baseline", unit: "days", default: 30, min: 7, max: 120 },
      { key: "minHistoryDays", label: "Days of history needed", unit: "days", default: 7, min: 3, max: 60 },
      { key: "aboveRecentMaxC", label: "Hotter than the recent average high by more than", unit: "°C", default: 4, min: 1, max: 20 },
      { key: "belowRecentMinC", label: "Colder than the recent average low by more than", unit: "°C", default: 4, min: 1, max: 20 },
      { key: "heatMaxC", label: "Forecast high above (optional)", unit: "°C", min: -20, max: 60 },
      { key: "coldMinC", label: "Forecast low below (optional)", unit: "°C", min: -50, max: 40 },
      { key: "rainMm", label: "Daily rain above (optional)", unit: "mm", min: 0, max: 1000 },
      { key: "windKph", label: "Wind above (optional)", unit: "km/h", min: 0, max: 300 },
    ],
    defaultSeverity: "warning", defaultRoles: FIELD, defaultChannels: ["in_app", "push"],
  },
};

/** Which rule governs an alert type. */
export const RULE_FOR_ALERT: Partial<Record<AlertType, RuleKey>> = Object.fromEntries(
  Object.values(RULE_DEFINITIONS).flatMap((r) => r.alertTypes.map((t) => [t, r.key])),
) as Partial<Record<AlertType, RuleKey>>;

/** Validates farm parameters against the catalog: known keys, within range. */
export function validateRuleParams(key: RuleKey, params: Record<string, number>): void {
  const defs = new Map(RULE_DEFINITIONS[key].params.map((p) => [p.key, p]));
  for (const [k, v] of Object.entries(params)) {
    const d = defs.get(k);
    if (!d) throw new Error(`Unknown parameter "${k}" for ${key}`);
    if (!Number.isFinite(v) || v < d.min || v > d.max) throw new Error(`${d.label} must be between ${d.min} and ${d.max}`);
  }
}

/** Farm values over catalog defaults; parameters with no default and no farm value are absent (check off). */
export function effectiveParams(key: RuleKey, farm: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of RULE_DEFINITIONS[key].params) {
    const v = farm?.[p.key] ?? p.default;
    if (v !== undefined) out[p.key] = v;
  }
  return out;
}

// ---- weather risk ----------------------------------------------------------------------

export interface DailyWeather {
  date: string;
  tempMaxC?: number;
  tempMinC?: number;
  rainMm?: number;
  windMaxKph?: number;
  humidityMaxPercent?: number;
  humidityMinPercent?: number;
}

export type WeatherRiskKind = "heat" | "cold" | "rain" | "wind";

export interface WeatherRisk {
  date: string;
  kind: WeatherRiskKind;
  value: number;
  reason: string;
}

/** Forecast days that are unusual for this farm (vs its own recent weather) or past limits the farm set. */
export function weatherRisks(forecast: DailyWeather[], history: DailyWeather[], p: Record<string, number>): { risks: WeatherRisk[]; baseline: { avgMaxC: number | null; avgMinC: number | null; days: number } } {
  const highs = baselineOf(history.map((h) => h.tempMaxC ?? NaN), p["minHistoryDays"] ?? 7);
  const lows = baselineOf(history.map((h) => h.tempMinC ?? NaN), p["minHistoryDays"] ?? 7);
  const risks: WeatherRisk[] = [];
  for (const d of forecast.slice(0, p["forecastDays"] ?? 3)) {
    if (d.tempMaxC !== undefined) {
      if (highs && p["aboveRecentMaxC"] !== undefined && d.tempMaxC - highs.mean > p["aboveRecentMaxC"]) risks.push({ date: d.date, kind: "heat", value: d.tempMaxC, reason: `high of ${d.tempMaxC} °C, ${round1(d.tempMaxC - highs.mean)} °C above this farm's recent average high (${round1(highs.mean)} °C)` });
      else if (p["heatMaxC"] !== undefined && d.tempMaxC > p["heatMaxC"]) risks.push({ date: d.date, kind: "heat", value: d.tempMaxC, reason: `high of ${d.tempMaxC} °C, above the farm's limit of ${p["heatMaxC"]} °C` });
    }
    if (d.tempMinC !== undefined) {
      if (lows && p["belowRecentMinC"] !== undefined && lows.mean - d.tempMinC > p["belowRecentMinC"]) risks.push({ date: d.date, kind: "cold", value: d.tempMinC, reason: `low of ${d.tempMinC} °C, ${round1(lows.mean - d.tempMinC)} °C below this farm's recent average low (${round1(lows.mean)} °C)` });
      else if (p["coldMinC"] !== undefined && d.tempMinC < p["coldMinC"]) risks.push({ date: d.date, kind: "cold", value: d.tempMinC, reason: `low of ${d.tempMinC} °C, below the farm's limit of ${p["coldMinC"]} °C` });
    }
    if (d.rainMm !== undefined && p["rainMm"] !== undefined && d.rainMm > p["rainMm"]) risks.push({ date: d.date, kind: "rain", value: d.rainMm, reason: `${d.rainMm} mm of rain, above the farm's limit of ${p["rainMm"]} mm` });
    if (d.windMaxKph !== undefined && p["windKph"] !== undefined && d.windMaxKph > p["windKph"]) risks.push({ date: d.date, kind: "wind", value: d.windMaxKph, reason: `wind up to ${d.windMaxKph} km/h, above the farm's limit of ${p["windKph"]} km/h` });
  }
  return { risks, baseline: { avgMaxC: highs ? round1(highs.mean) : null, avgMinC: lows ? round1(lows.mean) : null, days: highs?.n ?? 0 } };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
