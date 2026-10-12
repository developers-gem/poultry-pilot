import type { ProviderDay, WeatherProvider, WeatherReport } from "../ports/external.js";

/**
 * Open-Meteo (https://open-meteo.com): free, no API key. Daily values include the past days requested, which feed the
 * history. Behind the WeatherProvider port, so it can be swapped for another service.
 * Note: not exercised from the development sandbox (no outbound access to the service); tests use fakeWeatherProvider.
 */
export function openMeteoProvider(opts: { baseUrl?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {}): WeatherProvider {
  const base = opts.baseUrl ?? "https://api.open-meteo.com/v1/forecast";
  const f = opts.fetchImpl ?? fetch;
  return {
    name: "open-meteo",
    async fetch(lat, lng, o): Promise<WeatherReport> {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max,relative_humidity_2m_min",
        timezone: "auto",
        forecast_days: String(o.forecastDays),
        past_days: String(o.pastDays),
        wind_speed_unit: "kmh",
      });
      const res = await f(`${base}?${params}`, { signal: AbortSignal.timeout(opts.timeoutMs ?? 8000) });
      if (!res.ok) throw new Error(`Weather provider returned ${res.status}`);
      const j = (await res.json()) as {
        current?: { time: string; temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; wind_speed_10m?: number };
        daily?: Record<string, (number | string | null)[]>;
      };
      const d = j.daily ?? {};
      const dates = (d["time"] ?? []) as string[];
      const num = (k: string, i: number) => {
        const v = d[k]?.[i];
        return typeof v === "number" ? v : undefined;
      };
      const daily: ProviderDay[] = dates.map((date, i) => {
        const day: ProviderDay = { date };
        const set = (key: keyof ProviderDay, k: string) => {
          const v = num(k, i);
          if (v !== undefined) (day as unknown as Record<string, number>)[key] = v;
        };
        set("tempMaxC", "temperature_2m_max");
        set("tempMinC", "temperature_2m_min");
        set("rainMm", "precipitation_sum");
        set("windMaxKph", "wind_speed_10m_max");
        set("humidityMaxPercent", "relative_humidity_2m_max");
        set("humidityMinPercent", "relative_humidity_2m_min");
        return day;
      });
      const c = j.current;
      return {
        current: { observedAt: c?.time ?? new Date().toISOString(), ...(c?.temperature_2m !== undefined ? { temperatureC: c.temperature_2m } : {}), ...(c?.relative_humidity_2m !== undefined ? { humidityPercent: c.relative_humidity_2m } : {}), ...(c?.precipitation !== undefined ? { rainMm: c.precipitation } : {}), ...(c?.wind_speed_10m !== undefined ? { windKph: c.wind_speed_10m } : {}) },
        daily,
        today: dates[o.pastDays] ?? new Date().toISOString().slice(0, 10),
      };
    },
  };
}

/** Test and offline provider: returns what it is given and counts calls (to prove caching). */
export function fakeWeatherProvider(report: (lat: number, lng: number) => WeatherReport): WeatherProvider & { calls: number; fail: boolean } {
  const p = {
    name: "fake",
    calls: 0,
    fail: false,
    async fetch(lat: number, lng: number) {
      p.calls++;
      if (p.fail) throw new Error("provider down");
      return report(lat, lng);
    },
  };
  return p;
}
