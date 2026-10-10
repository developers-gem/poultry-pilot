/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VERBATIM copies of the Lovable prototype's calculations (flockfolio-pro, src/lib/farm.ts and
 * inline page formulas), with React/Supabase imports removed. Characterization only:
 * these exist so tests pin down what the prototype does today and every intentional change
 * in services/api/src/domain is a reviewed, named difference (audit IDs B1–B31).
 *
 * NEVER import this package from the API or the apps.
 */

export type Row = any;

// ---- src/lib/farm.ts --------------------------------------------------------

export const num = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(Number.isFinite(n) ? n : 0);

export const sum = (rows: Row[], key: string) => rows.reduce((t, r) => t + Number(r[key] ?? 0), 0);

export function lastDays(count: number) {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function daysBetween(from: string, to = today()) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export function batchLifecycle(flock: Row, opts: { logs: Row[]; weights: Row[]; tx: Row[]; feedPricePerKg: number }) {
  const logs = opts.logs.filter((l) => l.flock_id === flock.id);
  const weights = opts.weights.filter((w) => w.flock_id === flock.id);
  const tx = opts.tx.filter((t) => t.flock_id === flock.id);

  const hatchDate: string = flock.hatch_date || flock.start_date;
  const placed = Number(flock.chicks_received || flock.bird_count || 0);
  const deaths = sum(logs, "mortality");
  const sold = Number(flock.birds_sold || 0);
  const alive = Math.max(0, placed - deaths - sold);
  const survival = placed ? ((placed - deaths) / placed) * 100 : 0;

  const ageDays = daysBetween(hatchDate);
  const closed = Boolean(flock.sale_date) || flock.status === "sold";

  const byDate = new Map<string, number[]>();
  weights.forEach((w) => {
    const list = byDate.get(w.weigh_date) ?? [];
    list.push(Number(w.weight_g ?? 0));
    byDate.set(w.weigh_date, list);
  });
  const sessions = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, list]) => ({ date, count: list.length, avg: list.reduce((t, v) => t + v, 0) / list.length }));
  const firstSession = sessions[0];
  const lastSession = sessions[sessions.length - 1];
  const fallbackG = (() => {
    const withWeight = logs.filter((l) => l.avg_weight_g);
    return withWeight.length ? Number(withWeight[withWeight.length - 1]!.avg_weight_g) : 0;
  })();
  const avgWeightG = lastSession ? lastSession.avg : fallbackG;
  const gainSpan =
    firstSession && lastSession && firstSession.date !== lastSession.date
      ? daysBetween(firstSession.date, lastSession.date)
      : 0;
  const dailyGainG = gainSpan ? (lastSession!.avg - firstSession!.avg) / gainSpan : 0;

  const feedKg = sum(logs, "feed_kg");
  const liveWeightKg = (avgWeightG / 1000) * alive;
  const fcr = liveWeightKg > 0 ? feedKg / liveWeightKg : 0;

  const pricePerKg = Number(flock.sale_price_per_kg || 0);
  const soldWeightKg = Number(flock.sale_weight_kg || 0);
  const saleRevenue = soldWeightKg * pricePerKg;
  const otherSales = sum(tx.filter((t) => t.kind === "sale"), "amount");
  const revenue = saleRevenue + otherSales;
  const projected = closed ? revenue : revenue + liveWeightKg * pricePerKg;

  const stockCost = Number(flock.chick_cost || 0);
  const feedCost = feedKg * opts.feedPricePerKg;
  const otherCost = sum(tx.filter((t) => t.kind === "expense"), "amount");
  const costs = stockCost + feedCost + otherCost;

  const stage = closed ? "Sold" : ageDays <= 14 ? "Brooding" : ageDays <= 35 ? "Grow-out" : "Finishing";

  return {
    hatchDate, ageDays, stage, closed, placed, deaths, sold, alive, survival, sessions, avgWeightG, dailyGainG,
    feedKg, fcr, liveWeightKg, pricePerKg, soldWeightKg, revenue, projected, stockCost, feedCost, otherCost, costs,
    profit: projected - costs,
    costPerBird: placed ? costs / placed : 0,
    margin: projected ? ((projected - costs) / projected) * 100 : 0,
  };
}

export const FREQUENCIES = [
  { value: "daily", label: "Daily", perYear: 365 },
  { value: "weekly", label: "Weekly", perYear: 52 },
  { value: "monthly", label: "Monthly", perYear: 12 },
  { value: "quarterly", label: "Quarterly", perYear: 4 },
  { value: "yearly", label: "Yearly", perYear: 1 },
] as const;

const perYearOf = (f: string) => FREQUENCIES.find((x) => x.value === f)?.perYear ?? 12;

export function monthlyCost(row: Row) {
  return (Number(row.amount ?? 0) * perYearOf(row.frequency)) / 12;
}

export function accruedCost(row: Row, upTo = today()) {
  const start = row.start_date ?? today();
  const end = row.end_date && row.end_date < upTo ? row.end_date : upTo;
  if (end < start) return 0;
  const days = daysBetween(start, end) + 1;
  const cycleDays = 365 / perYearOf(row.frequency);
  return Number(row.amount ?? 0) * Math.max(1, Math.floor(days / cycleDays));
}

export function recurringTotals(rows: Row[]) {
  const live = rows.filter((r) => r.active !== false && (!r.end_date || r.end_date >= today()));
  return {
    live,
    perMonth: live.reduce((t, r) => t + monthlyCost(r), 0),
    toDate: rows.reduce((t, r) => t + accruedCost(r), 0),
  };
}

// ---- inline page formulas ---------------------------------------------------

/** dashboard.tsx / feed.tsx feed badge. */
export function feedBadge(feedLeft: number, dailyFeed: number) {
  const feedDays = dailyFeed ? Math.floor(feedLeft / dailyFeed) : 0;
  return { feedDays, badge: feedDays && feedDays < 7 ? "Low" : "OK" };
}

/** dashboard.tsx birds in production. */
export function dashboardBirds(flocks: Row[], logs: Row[]) {
  const activeFlocks = flocks.filter((f) => f.status === "active");
  return sum(activeFlocks, "bird_count") - sum(logs, "mortality");
}

/** health.tsx upcoming list and "in Nd" label. */
export function healthUpcoming(records: Row[]) {
  return records
    .filter((r) => r.next_due && new Date(r.next_due) >= new Date(today()))
    .sort((a, b) => String(a.next_due).localeCompare(String(b.next_due)))
    .map((r) => ({ id: r.id, label: `in ${Math.abs(daysBetween(String(r.next_due)))}d` }));
}

/** weather.tsx index of "today" in a past_days=7 & forecast_days=7 daily series. */
export function weatherTodayIndex(dailyLength: number) {
  return dailyLength - 8;
}

/** weather.tsx per-day accumulation using num(). */
export function weatherAccumulate(values: number[]) {
  return values.reduce((t, v) => t + Number(num(v)), 0);
}

/** calendar.tsx "next 30 days" filter. */
export function calendarNext30(eventDates: string[]) {
  const todayIso = today();
  return eventDates.filter((d) => d >= todayIso && daysBetween(d) >= -30);
}

/** hatchery.tsx overall hatch rate. */
export function hatcheryRate(batches: Row[]) {
  const eggsSet = sum(batches, "eggs_set");
  const hatched = sum(batches, "chicks_hatched");
  return eggsSet ? (hatched / eggsSet) * 100 : 0;
}

/** Profit as shown on each screen. */
export const profitDefinitions = {
  dashboard(o: { tx: Row[]; feed: Row[]; flocks: Row[]; recurring: Row[] }) {
    const income = sum(o.tx.filter((t) => t.kind === "sale"), "amount");
    const expenses = sum(o.tx.filter((t) => t.kind === "expense"), "amount");
    const feedSpend = o.feed.reduce((t, f) => t + Number(f.quantity_kg) * Number(f.price_per_kg), 0);
    const chickCost = sum(o.flocks, "chick_cost");
    return income - (expenses + feedSpend + chickCost + recurringTotals(o.recurring).toDate);
  },
  money(o: { tx: Row[]; feed: Row[]; flocks: Row[] }) {
    const sales = sum(o.tx.filter((t) => t.kind === "sale"), "amount");
    const expenses = sum(o.tx.filter((t) => t.kind === "expense"), "amount");
    const feedSpend = o.feed.reduce((t, f) => t + Number(f.quantity_kg) * Number(f.price_per_kg), 0);
    return sales - (expenses + feedSpend + sum(o.flocks, "chick_cost"));
  },
  runningCosts(o: { tx: Row[]; recurring: Row[] }) {
    const income = sum(o.tx.filter((t) => t.kind === "sale"), "amount");
    const oneOff = sum(o.tx.filter((t) => t.kind === "expense"), "amount");
    return income - oneOff - recurringTotals(o.recurring).toDate;
  },
};
