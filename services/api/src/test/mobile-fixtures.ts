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
  const call = (m: "get" | "post" | "put" | "patch", p: string, body?: object) => ctx.api()[m](`/api/v1${p}`).set(bearer(token)).send(body ?? {});
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
  // Daily entry: the sheet (with yesterday's values to repeat), a day's record, a partial save, a photo.
  await call("post", `/farms/${farmId}/flocks/${flock.id}/weighings`, { date: D(-1), weightsG: [1720, 1810, 1765, 1790] });
  await call("post", `/farms/${farmId}/tasks`, { title: "Clean the drinkers", dueDate: D(0), priority: "high", flockId: flock.id });
  await call("post", `/farms/${farmId}/health/vaccinations`, { flockId: flock.id, vaccineName: "IB spray", dueDate: D(-1) }); // overdue: shows in today's work
  await call("post", `/farms/${farmId}/tasks`, { title: "Order litter", dueDate: D(-1) });
  // Feed for the day: one line in the record, one entered separately (FeedWise), to show both kinds.
  await call("patch", `/farms/${farmId}/flocks/${flock.id}/daily-records/${D(-1)}`, { feed: [{ feedItemId: item.id, quantityKg: 110 }], version: 0 });
  await call("post", `/farms/${farmId}/feed/consumption`, { date: D(-1), flockId: flock.id, feedItemId: item.id, quantityKg: 5, kind: "wastage", reason: "Spilled" });
  out["feed_stock"] = (await call("get", `/farms/${farmId}/feed/stock`)).body;
  out["daily_sheet"] = (await call("get", `/farms/${farmId}/daily-records/sheet`)).body;
  out["daily_record_day"] = (await call("get", `/farms/${farmId}/flocks/${flock.id}/daily-records/${D(-1)}`)).body;
  out["daily_record_empty"] = (await call("get", `/farms/${farmId}/flocks/${flock.id}/daily-records/${D(1)}`)).body;
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]), Buffer.alloc(64, 1), Buffer.from([0xff, 0xd9])]);
  const media = await ctx.api().post(`/api/v1/farms/${farmId}/media`).set(bearer(token)).set("Content-Type", "image/jpeg").send(jpeg);
  out["media_uploaded"] = media.body;
  const todayRec = (await call("get", `/farms/${farmId}/flocks/${flock.id}/daily-records/${D(0)}`)).body;
  out["daily_record_patched"] = (await ctx.api().patch(`/api/v1/farms/${farmId}/flocks/${flock.id}/daily-records/${D(0)}`).set(bearer(token)).send({
    waterLitres: 210, temperatureMinC: 24, temperatureMaxC: 33, humidityPercent: 61, averageWeight: { averageWeightG: 1780, sampleSize: 10 },
    healthObservations: [{ signs: "Two birds coughing", affectedBirds: 2 }], photos: [{ assetId: media.body.id, caption: "Drinker line" }], version: todayRec.version,
  })).body;
  out["error_version_conflict"] = (await ctx.api().patch(`/api/v1/farms/${farmId}/flocks/${flock.id}/daily-records/${D(0)}`).set(bearer(token)).send({ waterLitres: 1, version: 0 })).body;
  // Flocks, production trends, health and tasks.
  out["houses"] = (await call("get", `/farms/${farmId}/houses`)).body;
  out["flocks"] = (await call("get", `/farms/${farmId}/flocks`)).body;
  out["flock_detail"] = (await call("get", `/farms/${farmId}/flocks/${flock.id}`)).body;
  out["flock_weighings"] = (await call("get", `/farms/${farmId}/flocks/${flock.id}/weighings`)).body;
  out["trends"] = (await call("get", `/farms/${farmId}/dashboard/trends?from=${D(-13)}&to=${D(0)}`)).body;
  out["health_record_created"] = (await call("post", `/farms/${farmId}/health/records`, { type: "observation", date: D(0), flockId: flock.id, title: "Coughing in house A", symptoms: ["coughing"], affectedBirds: 3 })).body;
  out["health_records"] = (await call("get", `/farms/${farmId}/health/records`)).body;
  out["vaccinations"] = (await call("get", `/farms/${farmId}/health/vaccinations`)).body;
  out["tasks_today"] = (await call("get", `/farms/${farmId}/tasks/today`)).body;
  out["tasks"] = (await call("get", `/farms/${farmId}/tasks`)).body;
  const created = (await call("post", `/farms/${farmId}/tasks`, { title: "Check fans", dueDate: D(1) })).body;
  out["task_created"] = created;
  out["task_completed"] = (await call("post", `/farms/${farmId}/tasks/${created.id}/complete`, { notes: "All running" })).body;
  // Offline sync: one push answering accepted, rejected and conflict (with the server's day to merge against).
  const at = new Date().toISOString();
  const mid = (n: number) => `01a20000-0000-7000-8000-${String(n).padStart(12, "0")}`;
  const today = (await call("get", `/farms/${farmId}/flocks/${flock.id}/daily-records/${D(0)}`)).body;
  out["sync_push"] = (await ctx.api().post("/api/v1/sync/push").set(bearer(token)).send({
    farmId,
    deviceId: "pixel-7-abc",
    mutations: [
      { mutationId: mid(1), command: "daily_record.patch", payload: { flockId: flock.id, date: D(0), patch: { waterLitres: 215 } }, baseVersion: today.version, clientCreatedAt: at },
      { mutationId: mid(2), command: "flock.mortality", payload: { flockId: flock.id, date: D(9), count: 1, cause: "unknown" }, clientCreatedAt: at },
      { mutationId: mid(3), command: "daily_record.patch", payload: { flockId: flock.id, date: D(0), patch: { eggs: { collected: 1, broken: 0 } } }, baseVersion: 0, clientCreatedAt: at },
    ],
  })).body;
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
