import { addDays, localDateOf, weatherRisks } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { WeatherProvider, WeatherReport } from "../ports/external.js";
import type { Repositories } from "../ports/repositories.js";
import type { FarmRecord, WeatherObservationRecord } from "../ports/records.js";
import { assertCan, type FarmContext } from "./context.js";
import type { RulesService } from "./rules.service.js";

const CACHE_TTL_MS = 60 * 60_000;
const FORECAST_DAYS = 7;
const PAST_DAYS = 7;

/** Rounded to 0.05° (about 5 km) so neighbouring farms share one cached forecast and one history. */
export const locationKey = (lat: number, lng: number) => `${(Math.round(lat * 20) / 20).toFixed(2)},${(Math.round(lng * 20) / 20).toFixed(2)}`;

/**
 * Weather through the backend only. Forecasts are cached per location for an hour; observed days are kept as
 * history (temperature, humidity, rain, wind), which the weather risk rule uses as the farm's own baseline.
 * If the provider fails, the last cached forecast is returned marked stale.
 */
export function createWeatherService(d: { repos: Repositories; clock: Clock; provider: WeatherProvider; rules: RulesService }) {
  const { repos, clock, provider } = d;

  async function report(lat: number, lng: number): Promise<{ report: WeatherReport; fetchedAt: Date; stale: boolean; key: string }> {
    const key = locationKey(lat, lng);
    const cached = await repos.weather.getCache(provider.name, key, "daily");
    const now = clock.now();
    if (cached && cached.expiresAt > now) return { report: cached.data as WeatherReport, fetchedAt: cached.fetchedAt, stale: false, key };
    try {
      const r = await provider.fetch(Number(key.split(",")[0]), Number(key.split(",")[1]), { forecastDays: FORECAST_DAYS, pastDays: PAST_DAYS });
      await repos.weather.putCache({ id: newId(), provider: provider.name, locationKey: key, kind: "daily", data: r, fetchedAt: now, expiresAt: new Date(now.getTime() + CACHE_TTL_MS), createdAt: now, updatedAt: now });
      const observed: WeatherObservationRecord[] = r.daily
        .filter((x) => x.date < r.today)
        .map((x) => ({ id: newId(), provider: provider.name, locationKey: key, ...x, createdAt: now, updatedAt: now }));
      await repos.weather.upsertObservations(observed);
      return { report: r, fetchedAt: now, stale: false, key };
    } catch (e) {
      if (cached) return { report: cached.data as WeatherReport, fetchedAt: cached.fetchedAt, stale: true, key };
      throw new AppError("WEATHER_UNAVAILABLE", `Weather is not available right now (${(e as Error).message})`);
    }
  }

  function requireLocation(farm: FarmRecord) {
    if (!farm.location) throw new AppError("VALIDATION_FAILED", "Set the farm's location (latitude and longitude) to see weather");
    return farm.location;
  }

  async function forFarm(ctx: FarmContext, opts: { historyDays?: number } = {}) {
    const farm = await repos.farms.findById(ctx.farmId);
    if (!farm) throw notFound("Farm");
    const loc = requireLocation(farm);
    const r = await report(loc.lat, loc.lng);
    const today = localDateOf(clock.now(), farm.settings.timezone);
    const rule = await d.rules.config(ctx, "weather_risk");
    const historyDays = opts.historyDays ?? rule.params["historyDays"] ?? 30;
    const history = await repos.weather.observations(r.key, addDays(today, -historyDays), addDays(today, -1));
    const forecast = r.report.daily.filter((x) => x.date >= today);
    const risk = weatherRisks(forecast, history, rule.params);
    return {
      location: { lat: loc.lat, lng: loc.lng, key: r.key, label: farm.locationLabel ?? null },
      provider: provider.name,
      fetchedAt: r.fetchedAt.toISOString(),
      stale: r.stale,
      current: r.report.current,
      forecast,
      history: history.map(({ id: _i, provider: _p, locationKey: _k, createdAt: _c, updatedAt: _u, ...h }) => h),
      risks: rule.enabled ? risk.risks : [],
      baseline: risk.baseline,
    };
  }

  return {
    forFarm,
    async get(ctx: FarmContext, q: { historyDays?: number }) {
      assertCan(ctx, "farm.read");
      return forFarm(ctx, q);
    },

    /** Hourly: refresh each distinct farm location once (the cache makes repeated farms free). */
    async refreshAll(): Promise<{ locations: number; failed: number }> {
      const seen = new Set<string>();
      let failed = 0;
      for (const id of await repos.farms.listIds()) {
        const f = await repos.farms.findById(id);
        if (!f?.location) continue;
        const key = locationKey(f.location.lat, f.location.lng);
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          const r = await report(f.location.lat, f.location.lng);
          if (r.stale) failed++;
        } catch {
          failed++;
        }
      }
      return { locations: seen.size, failed };
    },
  };
}

export type WeatherService = ReturnType<typeof createWeatherService>;
