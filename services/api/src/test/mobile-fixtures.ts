import { addDays, localDateOf } from "../domain/index.js";
import { fakeWeatherProvider } from "../adapters/weather.js";
import { bearer, joinAs, makeApp } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (r: number) => ({ amountMinor: Math.round(r * 100), currency: "INR" });
const DEVICE = { deviceId: "pixel-7-abc", name: "Pixel 7", platform: "android" };

/**
 * Everything the mobile app reads from the API, captured from the real routes. Volatile values (ids, tokens,
 * timestamps) are kept as real values in the files; the contract test compares structure and types, not values.
 */
export async function captureMobileFixtures(): Promise<Record<string, unknown>> {
  const weather = fakeWeatherProvider(() => ({
    today: TODAY,
    current: { observedAt: "2026-10-14T06:00:00Z", temperatureC: 31.5, humidityPercent: 58, rainMm: 0, windKph: 12 },
    daily: [...Array.from({ length: 7 }, (_, i) => ({ date: D(i - 7), tempMaxC: 31, tempMinC: 22, rainMm: 0, windMaxKph: 14 })), ...[37, 32, 31].map((t, i) => ({ date: D(i), tempMaxC: t, tempMinC: 23, rainMm: 0, windMaxKph: 15 }))],
  }));
  const ctx = makeApp({ weatherProvider: weather });
  const out: Record<string, unknown> = {};
  const reg = await ctx.api().post("/api/v1/auth/register").send({ email: "asha@example.com", password: "goodpass123", fullName: "Asha Verma", farm: { name: "Green Valley Poultry", timezone: "Asia/Kolkata", currency: "INR" }, device: DEVICE });
  out["auth_register"] = reg.body;
  const login = await ctx.api().post("/api/v1/auth/login").send({ email: "asha@example.com", password: "goodpass123", device: DEVICE });
  out["auth_login"] = login.body;
  const access = login.body.tokens.accessToken as string;
  const farmId = reg.body.farm.id as string;
  const refreshed = await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: login.body.tokens.refreshToken });
  out["auth_refresh"] = refreshed.body;
  out["error_invalid_credentials"] = (await ctx.api().post("/api/v1/auth/login").send({ email: "asha@example.com", password: "wrong-password1" })).body;
  out["error_validation"] = (await ctx.api().post("/api/v1/auth/register").send({ email: "not-an-email", password: "short", fullName: "", farm: { name: "", timezone: "Asia/Kolkata", currency: "INR" } })).body;
  const token = refreshed.body.accessToken as string;
  const call = (m: "get" | "post" | "put", p: string, body?: object) => ctx.api()[m](`/api/v1${p}`).set(bearer(token)).send(body ?? {});
  await call("put", "/me", { fullName: "Asha Verma", phone: "+91 98765 43210" });
  const f0 = (await call("get", `/farms/${farmId}`)).body;
  await call("put", `/farms/${farmId}`, { name: f0.name, countryCode: "IN", locationLabel: "Ghaziabad", location: { lat: 28.67, lng: 77.45 }, timezone: "Asia/Kolkata", currency: "INR", unitSystem: "metric", fcrIncludesMortalityWeight: false, workerEditWindowDays: 1, version: f0.version });
  // A small working farm so the dashboard has every section filled in.
  const house = (await call("post", `/farms/${farmId}/houses`, { name: "House A", type: "layer" })).body;
  const flock = (await call("post", `/farms/${farmId}/flocks`, { name: "Layers", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-120), count: 1000 } })).body;
  for (let i = 3; i >= 0; i--) await call("put", `/farms/${farmId}/flocks/${flock.id}/daily-records/${D(-i)}`, { eggs: { collected: 900 - i * 5, broken: 8 }, mortality: [{ cause: "unknown", count: 1 }] });
  const item = (await call("post", `/farms/${farmId}/inventory/items`, { name: "Layer mash", category: "feed", unit: "kg", feed: { stage: "layer" }, reorderLevel: 100 })).body;
  await call("post", `/farms/${farmId}/inventory/items/${item.id}/purchases`, { date: D(-5), quantity: 1000, unitCost: INR(28) });
  await call("post", `/farms/${farmId}/health/vaccinations`, { flockId: flock.id, vaccineName: "ND booster", dueDate: D(2) });
  await call("post", `/farms/${farmId}/finance/accounts`, { name: "Cash", type: "cash", openingBalance: INR(5000), openingDate: D(-30) });
  await call("post", `/farms/${farmId}/alerts/evaluate`);
  out["me"] = (await call("get", "/me")).body;
  out["farm"] = (await call("get", `/farms/${farmId}`)).body;
  out["dashboard"] = (await call("get", `/farms/${farmId}/dashboard`)).body;
  out["sessions"] = (await call("get", "/me/sessions")).body;
  out["notification_preferences"] = (await call("get", "/me/notification-preferences")).body;
  out["farm_created"] = (await call("post", "/farms", { name: "Second Farm", timezone: "Asia/Kolkata", currency: "INR" })).body;
  // A brand-new farm: every section empty, weather unavailable (no location yet).
  out["dashboard_new_farm"] = (await call("get", `/farms/${(out["farm_created"] as { id: string }).id}/dashboard`)).body;
  out["profile_updated"] = (await call("put", "/me", { fullName: "Asha Verma", phone: "+91 98765 43210" })).body;
  // Unconfirmed email blocks some actions; the app shows a "confirm your email" prompt.
  out["error_email_not_verified"] = (await call("post", `/farms/${farmId}/members`, { email: "worker@example.com", role: "worker" })).body;
  const verifyToken = ctx.email.outbox.find((m) => m.kind === "email_verification")?.token;
  await ctx.api().post("/api/v1/auth/verify-email").send({ token: verifyToken });
  out["me_verified"] = (await call("get", "/me")).body;
  // A worker sees a dashboard without money sections: the app must handle missing sections.
  const owner = { userId: reg.body.user.id, email: "asha@example.com", farmId, access: token, refresh: "", sessionId: "", body: {} };
  const worker = await joinAs(ctx, owner, "worker@example.com", "worker");
  out["dashboard_worker"] = (await ctx.api().get(`/api/v1/farms/${farmId}/dashboard`).set(bearer(worker.access))).body;
  out["error_unauthenticated"] = (await ctx.api().get("/api/v1/me")).body;
  return out;
}
