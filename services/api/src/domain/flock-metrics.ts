import { daysBetween } from "./dates.js";
import { ageDays, effectiveEvents, isInbound, isOutbound, population, type LedgerEvent, type Population } from "./flock.js";

/**
 * Server-side flock calculations. Every figure is computed here and nowhere else; screens only display it.
 * A value that cannot be computed honestly is null, never 0.
 */

export interface FeedEntry {
  date: string;
  quantityKg: number;
  /** Cost in minor units, or undefined when the feed was not costed. */
  costMinor?: number;
  /** consumption (default) counts towards FCR; wastage in the flock's house costs money but is not eaten. */
  kind?: "consumption" | "wastage";
}

export interface FlockMetricsInput {
  placementDate?: string;
  hatchDate?: string;
  ageDaysAtPlacement?: number;
  /** Average weight per bird at placement, grams. */
  startingWeightG?: number;
  events: LedgerEvent[];
  feed: FeedEntry[];
  asOf: string;
  /** Farm setting: include estimated weight of dead birds in the FCR denominator. */
  includeMortalityWeight: boolean;
  /** Live price per kg used to value birds still on the farm. null = do not project. */
  referencePricePerKgMinor?: number | null;
  /** Flock-tagged costs and income from the money ledger. */
  otherCostMinor?: number;
  otherIncomeMinor?: number;
  /** Eggs collected up to asOf (layers and breeders), for feed cost per egg. */
  eggsCollected?: number;
}

export interface FlockMetrics extends Population {
  asOf: string;
  ageDays: number | null;
  currentBirdCount: number;
  mortalityCount: number;
  cullCount: number;
  /** % of birds received that died. */
  mortalityRate: number | null;
  cullRate: number | null;
  /** % of birds received not lost to death or culling (livability). Sold and moved birds are not losses. */
  survivalRate: number | null;
  /** Latest measured average, grams. */
  averageWeightG: number | null;
  latestWeighingDate: string | null;
  /** Average daily gain over the flock's life: from placement weight (or first weighing) to latest weighing. */
  dailyWeightGainG: number | null;
  /** Gain between the two most recent weighings. */
  recentDailyWeightGainG: number | null;
  /** Feed eaten (consumption entries). */
  feedConsumedKg: number;
  /** Feed wasted in the flock's house (spilled, spoiled): costs money, not counted in FCR. */
  feedWastedKg: number;
  uncostedFeedKg: number;
  /** feedConsumed ÷ birds received. */
  feedPerBirdKg: number | null;
  /** Cost of feed eaten and wasted. */
  feedCostMinor: number;
  feedCostPerBirdMinor: number | null;
  feedCostPerEggMinor: number | null;
  eggsCollected: number;
  /** Birds alive × latest average weight. */
  liveWeightKg: number | null;
  /** Weight that left the flock: sold, moved out, and (if the farm setting is on) estimated dead weight. */
  weightOutKg: number;
  /** Weight that arrived: placement weight plus weight moved in. */
  weightInKg: number;
  /** liveWeight + weightOut − weightIn: the weight the birds gained on this farm. */
  weightProducedKg: number | null;
  /** Feed conversion ratio on a liveweight basis: feedConsumed ÷ (liveWeight + weightOut). The industry-standard FCR. */
  fcr: number | null;
  /** feedConsumed ÷ weight gained (weightProduced): excludes the weight birds arrived with. */
  feedPerKgGainKg: number | null;
  revenueMinor: number;
  cost: {
    chickMinor: number;
    transferredInMinor: number;
    transferredOutMinor: number;
    feedMinor: number;
    otherMinor: number;
    totalMinor: number;
  };
  /** revenue − cost (realised). */
  profitMinor: number;
  /** profit / revenue × 100. null with no revenue yet. */
  marginPercent: number | null;
  /** live weight × reference price; 0 when no birds remain; null without a price or a weight. */
  liveInventoryValueMinor: number | null;
  projectedProfitMinor: number | null;
  projectedMarginPercent: number | null;
  /** total cost / birds received. */
  costPerBirdMinor: number | null;
  costPerKgProducedMinor: number | null;
  /** false when some feed has no cost, so cost and profit are understated. */
  costsComplete: boolean;
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);

/**
 * Average weight per bird on a date, from the growth curve made of the placement weight and every weighing.
 * Interpolates linearly between points; holds the nearest point outside them (never extrapolates).
 */
export function weightCurve(startingWeightG: number | undefined, placementDate: string | undefined, events: LedgerEvent[]) {
  const points = effectiveEvents(events)
    .filter((e) => e.type === "weighing" && e.averageWeightG)
    .map((e) => ({ date: e.date, g: e.averageWeightG! }));
  if (startingWeightG && placementDate) points.push({ date: placementDate, g: startingWeightG });
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  // Several weighings on one day: keep the last.
  const byDate = new Map(points.map((p) => [p.date, p.g]));
  const curve = [...byDate.entries()].map(([date, g]) => ({ date, g }));
  return {
    points: curve,
    at(date: string): number | null {
      if (!curve.length) return null;
      if (date <= curve[0]!.date) return curve[0]!.g;
      const last = curve[curve.length - 1]!;
      if (date >= last.date) return last.g;
      for (let i = 1; i < curve.length; i++) {
        const b = curve[i]!;
        if (date <= b.date) {
          const a = curve[i - 1]!;
          const span = daysBetween(a.date, b.date);
          return a.g + ((b.g - a.g) * daysBetween(a.date, date)) / span;
        }
      }
      return last.g;
    },
  };
}

export function computeFlockMetrics(i: FlockMetricsInput): FlockMetrics {
  const events = effectiveEvents(i.events).filter((e) => e.date <= i.asOf);
  const feed = i.feed.filter((f) => f.date <= i.asOf);
  const pop = population(events);
  const curve = weightCurve(i.startingWeightG, i.placementDate, events);

  // ---- weights
  const weighings = events.filter((e) => e.type === "weighing" && e.averageWeightG).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const latest = weighings[weighings.length - 1];
  const averageWeightG = latest?.averageWeightG ?? null;

  let dailyWeightGainG: number | null = null;
  if (latest) {
    const start = i.startingWeightG && i.placementDate ? { date: i.placementDate, g: i.startingWeightG } : weighings[0] ? { date: weighings[0].date, g: weighings[0].averageWeightG! } : null;
    const days = start ? daysBetween(start.date, latest.date) : 0;
    if (start && days > 0) dailyWeightGainG = (latest.averageWeightG! - start.g) / days;
  }
  let recentDailyWeightGainG: number | null = null;
  const distinct = curve.points.filter((p) => weighings.some((w) => w.date === p.date));
  if (distinct.length >= 2) {
    const [a, b] = distinct.slice(-2) as [{ date: string; g: number }, { date: string; g: number }];
    recentDailyWeightGainG = (b.g - a.g) / daysBetween(a.date, b.date);
  }

  const liveWeightKg = pop.alive === 0 ? 0 : averageWeightG !== null ? (pop.alive * averageWeightG) / 1000 : null;
  const estimateKg = (birds: number, date: string) => {
    const g = curve.at(date);
    return g === null ? 0 : (birds * g) / 1000;
  };

  let weightOutKg = 0;
  let weightInKg = 0;
  for (const e of events) {
    const birds = e.birds ?? 0;
    if (e.type === "sale" || isOutbound(e.type)) weightOutKg += e.totalLiveWeightKg ?? estimateKg(birds, e.date);
    else if (e.type === "mortality" && i.includeMortalityWeight) weightOutKg += estimateKg(birds, e.date);
    else if (e.type === "placement") weightInKg += e.totalLiveWeightKg ?? (i.startingWeightG ? ((birds - (e.deadOnArrival ?? 0)) * i.startingWeightG) / 1000 : 0);
    else if (isInbound(e.type)) weightInKg += e.totalLiveWeightKg ?? 0;
  }
  const weightProducedKg = liveWeightKg === null ? null : liveWeightKg + weightOutKg - weightInKg;

  // ---- feed
  const eaten = feed.filter((f) => (f.kind ?? "consumption") === "consumption");
  const feedConsumedKg = Math.round(eaten.reduce((t, f) => t + f.quantityKg, 0) * 1000) / 1000;
  const feedWastedKg = Math.round(feed.filter((f) => f.kind === "wastage").reduce((t, f) => t + f.quantityKg, 0) * 1000) / 1000;
  const uncostedFeedKg = feed.filter((f) => f.costMinor === undefined).reduce((t, f) => t + f.quantityKg, 0);
  const feedMinor = feed.reduce((t, f) => t + (f.costMinor ?? 0), 0);
  const liveBasisKg = liveWeightKg === null ? null : liveWeightKg + weightOutKg;
  const fcr = liveBasisKg !== null && liveBasisKg > 0 && feedConsumedKg > 0 ? feedConsumedKg / liveBasisKg : null;
  const feedPerKgGainKg = weightProducedKg !== null && weightProducedKg > 0 && feedConsumedKg > 0 ? feedConsumedKg / weightProducedKg : null;
  const eggsCollected = i.eggsCollected ?? 0;

  // ---- money
  const sum = (pred: (e: LedgerEvent) => boolean, f: (e: LedgerEvent) => number | undefined) => events.filter(pred).reduce((t, e) => t + (f(e) ?? 0), 0);
  const revenueMinor = sum((e) => e.type === "sale", (e) => e.totalMinor) + (i.otherIncomeMinor ?? 0);
  const cost = {
    chickMinor: sum((e) => e.type === "placement", (e) => e.costMinor),
    transferredInMinor: sum((e) => isInbound(e.type), (e) => e.costMinor),
    transferredOutMinor: sum((e) => isOutbound(e.type), (e) => e.costMinor),
    feedMinor,
    otherMinor: i.otherCostMinor ?? 0,
    totalMinor: 0,
  };
  cost.totalMinor = cost.chickMinor + cost.transferredInMinor - cost.transferredOutMinor + cost.feedMinor + cost.otherMinor;
  const profitMinor = revenueMinor - cost.totalMinor;

  let liveInventoryValueMinor: number | null = null;
  if (pop.alive === 0) liveInventoryValueMinor = 0;
  else if (i.referencePricePerKgMinor !== undefined && i.referencePricePerKgMinor !== null && liveWeightKg !== null) {
    liveInventoryValueMinor = Math.round(liveWeightKg * i.referencePricePerKgMinor);
  }
  const projectedProfitMinor = liveInventoryValueMinor === null ? null : revenueMinor + liveInventoryValueMinor - cost.totalMinor;
  const projectedValue = liveInventoryValueMinor === null ? null : revenueMinor + liveInventoryValueMinor;

  return {
    ...pop,
    asOf: i.asOf,
    ageDays: ageDays({ ...(i.hatchDate ? { hatchDate: i.hatchDate } : {}), ...(i.placementDate ? { placementDate: i.placementDate } : {}), ...(i.ageDaysAtPlacement !== undefined ? { ageDaysAtPlacement: i.ageDaysAtPlacement } : {}) }, i.asOf),
    currentBirdCount: pop.alive,
    mortalityCount: pop.mortality,
    cullCount: pop.culled,
    mortalityRate: pct(pop.mortality, pop.birdsIn),
    cullRate: pct(pop.culled, pop.birdsIn),
    survivalRate: pct(pop.birdsIn - pop.mortality - pop.culled, pop.birdsIn),
    averageWeightG,
    latestWeighingDate: latest?.date ?? null,
    dailyWeightGainG,
    recentDailyWeightGainG,
    feedConsumedKg,
    feedWastedKg,
    uncostedFeedKg,
    feedPerBirdKg: pop.birdsIn > 0 ? feedConsumedKg / pop.birdsIn : null,
    feedCostMinor: feedMinor,
    feedCostPerBirdMinor: pop.birdsIn > 0 ? Math.round(feedMinor / pop.birdsIn) : null,
    feedCostPerEggMinor: eggsCollected > 0 ? feedMinor / eggsCollected : null,
    eggsCollected,
    liveWeightKg,
    weightOutKg,
    weightInKg,
    weightProducedKg,
    fcr,
    feedPerKgGainKg,
    revenueMinor,
    cost,
    profitMinor,
    marginPercent: revenueMinor > 0 ? (profitMinor / revenueMinor) * 100 : null,
    liveInventoryValueMinor,
    projectedProfitMinor,
    projectedMarginPercent: projectedValue && projectedProfitMinor !== null ? (projectedProfitMinor / projectedValue) * 100 : null,
    costPerBirdMinor: pop.birdsIn > 0 ? Math.round(cost.totalMinor / pop.birdsIn) : null,
    costPerKgProducedMinor: weightProducedKg !== null && weightProducedKg > 0 ? Math.round(cost.totalMinor / weightProducedKg) : null,
    costsComplete: uncostedFeedKg === 0,
  };
}
