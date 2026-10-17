import { describe, expect, it } from "vitest";
import { openMeteoProvider } from "../adapters/weather.js";

describe("Open-Meteo licensing", () => {
  const urls: string[] = [];
  const fetchImpl = (async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify({ current: {}, daily: { time: [] }, hourly: { time: [] } }), { status: 200 });
  }) as unknown as typeof fetch;

  it("uses the commercial endpoint with the key when one is set, the free endpoint otherwise", async () => {
    await openMeteoProvider({ fetchImpl }).fetch(28.6, 77.4, { pastDays: 1, forecastDays: 1 } as never).catch(() => undefined);
    await openMeteoProvider({ fetchImpl, apiKey: "k-123" }).fetch(28.6, 77.4, { pastDays: 1, forecastDays: 1 } as never).catch(() => undefined);
    expect(urls[0]).toMatch(/^https:\/\/api\.open-meteo\.com\//);
    expect(urls[0]).not.toContain("apikey");
    expect(urls[1]).toMatch(/^https:\/\/customer-api\.open-meteo\.com\//);
    expect(urls[1]).toContain("apikey=k-123");
  });
});
