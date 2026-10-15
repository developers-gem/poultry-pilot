import { describe, expect, it } from "vitest";
import { fakeWeatherProvider } from "../adapters/weather.js";
import { recordingProvider } from "../adapters/notify.js";
import { addDays, localDateOf } from "../domain/index.js";
import { runAlertJob } from "../jobs/alert-job.js";
import { bearer, farmBody, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (rupees: number) => ({ amountMinor: Math.round(rupees * 100), currency: "INR" });

function weather(highs: { past: number; future: number[] }) {
  return fakeWeatherProvider(() => ({
    today: TODAY,
    current: { observedAt: new Date().toISOString(), temperatureC: 31, humidityPercent: 60, rainMm: 0, windKph: 12 },
    daily: [
      ...Array.from({ length: 7 }, (_, i) => ({ date: D(i - 7), tempMaxC: highs.past, tempMinC: 22, rainMm: 0, windMaxKph: 15, humidityMaxPercent: 80, humidityMinPercent: 40 })),
      ...highs.future.map((t, i) => ({ date: D(i), tempMaxC: t, tempMinC: 22, rainMm: 0, windMaxKph: 15 })),
    ],
  }));
}

async function setup(opts: { weather?: ReturnType<typeof weather>; location?: boolean } = {}) {
  const push = recordingProvider("push");
  const email = recordingProvider("email");
  const ctx = makeApp({ notificationProviders: [push, email], ...(opts.weather ? { weatherProvider: opts.weather } : {}) });
  const owner = await register(ctx, "owner@example.com");
  const call = (method: "get" | "post" | "put" | "delete", path: string, token = owner.access) => ctx.api()[method](`/api/v1/farms/${owner.farmId}${path}`).set(bearer(token));
  if (opts.location) {
    const farm = (await call("get", "")).body;
    await call("put", "").send(farmBody(farm, { location: { lat: 28.6692, lng: 77.4538 }, locationLabel: "Ghaziabad" }));
  }
  const house = (await call("post", "/houses").send({ name: "House A", type: "broiler" })).body;
  const evaluate = () => call("post", "/alerts/evaluate");
  return { ctx, owner, call, house, push, email, evaluate };
}
type S = Awaited<ReturnType<typeof setup>>;

/** A broiler flock with `deaths[i]` deaths on D(-n+i) … ending yesterday. */
async function flockWithDeaths(s: S, code: string, deaths: number[], count = 5000) {
  const f = (await s.call("post", "/flocks").send({ name: code, flockCode: code, type: "broiler", houseId: s.house.id, placement: { date: D(-30), count } })).body;
  for (const [i, n] of deaths.entries()) await s.call("put", `/flocks/${f.id}/daily-records/${D(i - deaths.length)}`).send({ mortality: n ? [{ cause: "unknown", count: n }] : [] });
  return f;
}

const openAlerts = async (s: S, ruleType?: string) => (await s.call("get", `/alerts?status=open${ruleType ? `&ruleType=${ruleType}` : ""}`)).body.items as { ruleType: string; title: string; message: string; severity: string; values?: Record<string, number> }[];

describe("alert rules", () => {
  it("lists all 14 rules with the farm's settings; absolute limits are off until the farm sets them", async () => {
    const s = await setup();
    const rules = (await s.call("get", "/alert-rules")).body.items;
    expect(rules.map((r: { key: string }) => r.key)).toEqual(["mortality", "egg_production", "feed_consumption", "water_consumption", "weight_variance", "fcr_variance", "inventory", "medicine_expiry", "vaccination_due", "vet_appointment", "hatch_date", "order_delivery", "payment_overdue", "weather_risk"]);
    const mortality = rules[0];
    expect(mortality).toMatchObject({ enabled: true, baseline: "flock_history", customised: false });
    expect(mortality.parameters.find((p: { key: string }) => p.key === "dailyRatePercentMax")).toMatchObject({ value: null, setByFarm: false });
    expect(mortality.parameters.find((p: { key: string }) => p.key === "deviationPercent")).toMatchObject({ value: 50, setByFarm: false });
  });

  it("validates parameters, keeps in-app, and only supervisors and above change rules", async () => {
    const s = await setup();
    expect((await s.call("put", "/alert-rules/mortality").send({ enabled: true, parameters: { banana: 1 } })).body.error.message).toMatch(/Unknown parameter/);
    expect((await s.call("put", "/alert-rules/mortality").send({ enabled: true, parameters: { deviationPercent: 1 } })).body.error.message).toMatch(/between 5 and 1000/);
    expect((await s.call("put", "/alert-rules/mortality").send({ enabled: true, channels: ["email"] })).body.error.message).toMatch(/In-app is always kept/);
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    expect((await s.call("put", "/alert-rules/mortality", worker.access).send({ enabled: false })).status).toBe(403);
    const set = (await s.call("put", "/alert-rules/mortality").send({ enabled: true, parameters: { deviationPercent: 80, dailyRatePercentMax: 0.3 }, severity: "critical", channels: ["in_app", "push", "email"] })).body;
    expect(set).toMatchObject({ params: { deviationPercent: 80, dailyRatePercentMax: 0.3, windowDays: 7 }, severity: "critical" });
    expect((await s.call("delete", "/alert-rules/mortality")).body.params).toEqual({ windowDays: 7, minBaselineDays: 3, deviationPercent: 50, minExtraBirds: 3 });
  });
});

describe("farm-specific baselines, not universal thresholds", () => {
  it("the same 10 deaths alarm one farm and not another, because each is judged against its own history", async () => {
    const quiet = await setup();
    await flockWithDeaths(quiet, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    await quiet.evaluate();
    const a = await openAlerts(quiet, "mortality_spike");
    expect(a).toHaveLength(1);
    expect(a[0]!.message).toMatch(/10 deaths, \d+% above this flock's recent average of 2.3 a day/);
    expect(a[0]!.values).toMatchObject({ value: 10, baselineDays: 7 });

    const busy = await setup();
    await flockWithDeaths(busy, "B1", [11, 12, 13, 12, 11, 12, 13, 10]);
    await busy.evaluate();
    expect(await openAlerts(busy, "mortality_spike")).toHaveLength(0);
  });

  it("small numbers do not alarm; the farm's own parameters and optional limits decide", async () => {
    const s = await setup();
    await flockWithDeaths(s, "S1", [1, 1, 1, 1, 1, 1, 1, 3], 500);
    await s.evaluate();
    expect(await openAlerts(s, "mortality_spike")).toHaveLength(0); // +200%, but only 2 more birds
    await s.call("put", "/alert-rules/mortality").send({ enabled: true, parameters: { dailyRatePercentMax: 0.5 } });
    await s.evaluate();
    expect((await openAlerts(s, "mortality_spike"))[0]!.message).toMatch(/above the farm's daily limit of 0.5%/);
  });

  it("no alert before the flock has enough history", async () => {
    const s = await setup();
    await flockWithDeaths(s, "N1", [2, 30]);
    await s.evaluate();
    expect(await openAlerts(s, "mortality_spike")).toHaveLength(0);
  });

  it("switching a rule off stops it everywhere and resolves what it raised", async () => {
    const s = await setup();
    await flockWithDeaths(s, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    await s.evaluate();
    await s.call("put", "/alert-rules/mortality").send({ enabled: false });
    await s.evaluate();
    // A rule switched off raises nothing, wherever the alert would come from (here: the stock engine).
    await s.call("put", "/alert-rules/inventory").send({ enabled: false });
    await s.call("post", "/inventory/items").send({ name: "Starter", category: "feed", unit: "kg", feed: { stage: "starter" }, reorderLevel: 100 });
    await s.evaluate();
    expect(await openAlerts(s, "low_feed_stock")).toHaveLength(0);
    expect((await s.evaluate()).body.rules).toMatchObject({ mortality: "off" });
  });
});

describe("production rules", () => {
  it("egg production below the flock's own level", async () => {
    const s = await setup();
    const lh = (await s.call("post", "/houses").send({ name: "LH", type: "layer" })).body;
    const f = (await s.call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: lh.id, placement: { date: D(-200), count: 1000 } })).body;
    for (let i = -8; i <= -2; i++) await s.call("put", `/flocks/${f.id}/daily-records/${D(i)}`).send({ eggs: { collected: 900 } });
    await s.call("put", `/flocks/${f.id}/daily-records/${D(-1)}`).send({ eggs: { collected: 720 } });
    await s.evaluate();
    expect((await openAlerts(s, "egg_drop"))[0]!.message).toMatch(/hen-day production 72%, 20% below this flock's recent 90%/);
  });

  it("feed per bird far from the flock's own recent days", async () => {
    const s = await setup();
    const f = (await s.call("post", "/flocks").send({ name: "F1", flockCode: "F1", type: "broiler", houseId: s.house.id, placement: { date: D(-20), count: 1000 } })).body;
    for (let i = -8; i <= -2; i++) await s.call("put", `/flocks/${f.id}/daily-records/${D(i)}`).send({ feed: [{ quantityKg: 100 }] });
    await s.call("put", `/flocks/${f.id}/daily-records/${D(-1)}`).send({ feed: [{ quantityKg: 60 }] });
    await s.evaluate();
    expect((await openAlerts(s, "feed_change"))[0]!.message).toMatch(/60 g feed per bird, 40% below this flock's recent 100/);
  });

  it("weight below the farm's own target for the age", async () => {
    const s = await setup();
    await s.call("post", "/chickstart/profiles").send({ name: "Our targets", isDefault: true, source: "Farm breed guide", bands: [{ fromDay: 0, toDay: 13, targetWeightG: 300 }, { fromDay: 14, toDay: 20, targetWeightG: 500 }] });
    const f = (await s.call("post", "/flocks").send({ name: "W1", flockCode: "W1", type: "broiler", houseId: s.house.id, placement: { date: D(-15), count: 1000, startingWeightG: 40 } })).body;
    await s.call("post", `/flocks/${f.id}/weighings`).send({ date: D(-1), averageWeightG: 400 });
    await s.evaluate();
    expect((await openAlerts(s, "weight_variance"))[0]!.message).toMatch(/average 400 g at day 14, 20% below the farm's target of 500 g/);
  });

  it("FCR compared with the farm's own past flocks of the same type, or its target", async () => {
    const s = await setup();
    async function closedFlock(code: string, feedKg: number) {
      const f = (await s.call("post", "/flocks").send({ name: code, flockCode: code, type: "broiler", houseId: s.house.id, placement: { date: D(-60), count: 1000, startingWeightG: 40 } })).body;
      await s.call("put", `/flocks/${f.id}/daily-records/${D(-40)}`).send({ feed: [{ quantityKg: feedKg }] });
      await s.call("post", `/flocks/${f.id}/sales`).send({ date: D(-30), birds: 1000, totalLiveWeightKg: 2000, total: INR(100_000) });
      await s.call("post", `/flocks/${f.id}/close`).send({ date: D(-30) });
    }
    await closedFlock("P1", 3200); // FCR 1.6
    const active = (await s.call("post", "/flocks").send({ name: "A1", flockCode: "A1", type: "broiler", houseId: s.house.id, placement: { date: D(-20), count: 1000, startingWeightG: 40 } })).body;
    await s.call("put", `/flocks/${active.id}/daily-records/${D(-2)}`).send({ feed: [{ quantityKg: 2000 }] });
    await s.call("post", `/flocks/${active.id}/weighings`).send({ date: D(-1), averageWeightG: 1000 }); // FCR 2.0
    await s.evaluate();
    expect(await openAlerts(s, "fcr_variance")).toHaveLength(0); // only one past flock; the rule needs 2
    await closedFlock("P2", 3200);
    await s.evaluate();
    expect((await openAlerts(s, "fcr_variance"))[0]!.message).toMatch(/FCR 2, more than 10% above the farm's past broiler flocks \(1.6, 2 flocks\)/);
    await s.call("put", "/alert-rules/fcr_variance").send({ enabled: true, parameters: { targetFcr: 1.7 } });
    await s.evaluate();
    expect((await openAlerts(s, "fcr_variance"))[0]!.message).toMatch(/FCR 2, more than 10% above the farm's target of 1.7/);
    // A target of 1.9 allows up to 2.09: the flock is within range and the alert clears.
    await s.call("put", "/alert-rules/fcr_variance").send({ enabled: true, parameters: { targetFcr: 1.9 } });
    await s.evaluate();
    expect(await openAlerts(s, "fcr_variance")).toHaveLength(0);
  });
});

describe("schedule rules resolve themselves", () => {
  it("vaccinations, vet appointments, hatches, deliveries and overdue payments", async () => {
    const s = await setup();
    const f = (await s.call("post", "/flocks").send({ name: "V1", flockCode: "V1", type: "broiler", houseId: s.house.id, placement: { date: D(-10), count: 1000 } })).body;
    await s.call("post", "/health/vaccinations").send({ flockId: f.id, vaccineName: "IBD", dueDate: D(1) });
    const appt = (await s.call("post", "/health/appointments").send({ date: D(1), title: "Routine flock check", vetName: "Dr. Rao", flockId: f.id })).body;
    await s.call("post", "/hatchery/batches").send({ code: "H1", eggSource: "purchased", eggsReceived: 100, setDate: D(-20) });
    const buyer = (await s.call("post", "/buyers").send({ name: "Sharma" })).body;
    const b2 = (await s.call("post", "/hatchery/batches").send({ code: "H0", eggSource: "purchased", eggsReceived: 100, setDate: D(-21) })).body;
    await s.call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 10, unitPrice: INR(40), hatcheryBatchId: b2.id, requestedDeliveryDate: D(1) });
    const inc = (await s.call("post", "/finance/incomes").send({ kind: "sale", date: D(-20), dueDate: D(-5), category: "egg_sales", description: "Eggs on credit", amount: INR(5000), customerName: "Hotel Raj" })).body;
    await s.evaluate();
    const types = (await openAlerts(s)).map((a) => a.ruleType).sort();
    expect(types).toEqual(expect.arrayContaining(["vaccination_due", "vet_appointment", "hatch_due", "order_delivery", "payment_overdue"]));
    await s.call("post", `/health/appointments/${appt.id}/complete`).send({ notes: "All well" });
    const acct = (await s.call("post", "/finance/accounts").send({ name: "Cash", type: "cash", openingBalance: INR(0), openingDate: D(-30) })).body;
    await s.call("post", `/finance/incomes/${inc.id}/payments`).send({ date: D(0), amount: INR(5000), accountId: acct.id, method: "cash" });
    await s.evaluate();
    const left = (await openAlerts(s)).map((a) => a.ruleType);
    expect(left).not.toContain("vet_appointment");
    expect(left).not.toContain("payment_overdue");
  });
});

describe("weather through the backend", () => {
  it("caches per location, stores history, and judges risk against the farm's own recent weather", async () => {
    const w = weather({ past: 32, future: [38, 33, 32, 31, 30, 30, 30] });
    const s = await setup({ weather: w, location: true });
    const first = (await s.call("get", "/weather")).body;
    expect(first).toMatchObject({ provider: "fake", stale: false, current: { temperatureC: 31, humidityPercent: 60, windKph: 12 }, location: { key: "28.65,77.45", label: "Ghaziabad" } });
    expect(first.forecast).toHaveLength(7);
    expect(first.history).toHaveLength(7);
    expect(first.history[0]).toMatchObject({ tempMaxC: 32, tempMinC: 22, rainMm: 0, windMaxKph: 15, humidityMaxPercent: 80 });
    expect(first.baseline).toEqual({ avgMaxC: 32, avgMinC: 22, days: 7 });
    expect(first.risks).toEqual([expect.objectContaining({ date: TODAY, kind: "heat", value: 38 })]);
    await s.call("get", "/weather");
    await s.call("get", "/dashboard");
    expect(w.calls).toBe(1);
    await s.evaluate();
    expect((await openAlerts(s, "weather_risk"))[0]!.message).toMatch(/6 °C above this farm's recent average high \(32 °C\)/);
  });

  it("falls back to the cached forecast when the provider fails, and explains a missing location", async () => {
    const w = weather({ past: 30, future: [30, 30, 30] });
    const s = await setup({ weather: w, location: true });
    await s.call("get", "/weather");
    s.ctx.store.weatherCache.all().forEach((c) => s.ctx.store.weatherCache.put(c.id, { ...c, expiresAt: new Date(Date.now() - 1000) }));
    w.fail = true;
    expect((await s.call("get", "/weather")).body.stale).toBe(true);
    const nowhere = await setup({ weather: w });
    expect((await nowhere.call("get", "/weather")).body.error.message).toMatch(/Set the farm's location/);
    expect((await nowhere.call("get", "/dashboard")).body.weather).toEqual({ unavailable: "Set the farm's location to see weather" });
  });
});

describe("notifications", () => {
  async function withTeam() {
    const s = await setup();
    const manager = await joinAs(s.ctx, s.owner, "m@example.com", "farm_manager");
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    await s.ctx.api().post("/api/v1/me/push-devices").set(bearer(s.owner.access)).send({ platform: "android", token: "owner-token-1234567890", deviceName: "Pixel" });
    return { ...s, manager, worker };
  }

  it("an alert reaches the rule's roles in-app; push and email are queued and delivered by the worker", async () => {
    const t = await withTeam();
    await t.call("put", "/alert-rules/mortality").send({ enabled: true, channels: ["in_app", "push", "email"] });
    await flockWithDeaths(t, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    await t.evaluate();
    const n = t.ctx.store.notifications.all();
    expect(n.filter((x) => x.channel === "in_app").map((x) => x.userId).sort()).toEqual([t.owner.userId, t.manager.userId].sort()); // workers are not in the mortality rule's roles
    expect(n.filter((x) => x.channel === "push").map((x) => x.userId)).toEqual(expect.arrayContaining([t.owner.userId]));
    expect(n.filter((x) => x.channel === "email" && x.status === "queued")).toHaveLength(2);
    const r = await t.ctx.container.notifications.deliverDue();
    expect(r.sent).toBe(3); // owner push + 2 emails
    expect(r.failed).toBe(1); // manager has no device registered
    expect(t.push.sent[0]).toMatchObject({ userId: t.owner.userId, pushTokens: ["owner-token-1234567890"] });
    expect(t.email.sent.map((m) => m.email).sort()).toEqual(["m@example.com", "owner@example.com"]);
    const inbox = (await t.ctx.api().get("/api/v1/me/notifications").set(bearer(t.owner.access))).body;
    expect(inbox.unread).toBe(1);
    expect(inbox.items[0]).toMatchObject({ channel: "in_app", severity: "warning", link: { entity: "alert" } });
    expect((await t.ctx.api().post("/api/v1/me/notifications/read-all").set(bearer(t.owner.access))).body).toEqual({ marked: 1, unread: 0 });
  });

  it("retries with backoff, disables invalid tokens, and respects preferences and mutes", async () => {
    const t = await withTeam();
    await t.call("put", "/alert-rules/mortality").send({ enabled: true, channels: ["in_app", "push"] });
    t.push.failTimes = 1;
    t.push.invalid = ["owner-token-1234567890"];
    await flockWithDeaths(t, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    await t.evaluate();
    expect(await t.ctx.container.notifications.deliverDue()).toMatchObject({ retrying: 1 });
    const queued = t.ctx.store.notifications.all().find((x) => x.channel === "push" && x.userId === t.owner.userId)!;
    expect(queued).toMatchObject({ status: "queued", attempts: 1, error: "push provider unavailable" });
    t.ctx.store.notifications.put(queued.id, { ...queued, nextAttemptAt: new Date(0) });
    expect(await t.ctx.container.notifications.deliverDue()).toMatchObject({ sent: 1 });
    expect(t.ctx.store.pushDevices.all()[0]!.disabledAt).toBeTruthy();

    const muted = await withTeam();
    await muted.call("put", "/alert-rules/mortality").send({ enabled: true, channels: ["in_app", "push", "email"] });
    await muted.ctx.api().put("/api/v1/me/notification-preferences").set(bearer(muted.owner.access)).send({ pushEnabled: true, emailEnabled: true, pushMinSeverity: "info", emailMinSeverity: "critical", mutedRuleKeys: [] });
    await muted.ctx.api().put("/api/v1/me/notification-preferences").set(bearer(muted.manager.access)).send({ pushEnabled: true, emailEnabled: true, pushMinSeverity: "info", emailMinSeverity: "info", mutedRuleKeys: ["mortality"] });
    await flockWithDeaths(muted, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    await muted.evaluate();
    const sent = muted.ctx.store.notifications.all().map((x) => `${x.userId === muted.owner.userId ? "owner" : "manager"}:${x.channel}`).sort();
    expect(sent).toEqual(["manager:in_app", "owner:in_app", "owner:push"]); // owner email is below their threshold; manager muted mortality
  });

  it("cooldown stops a reopened alert from re-notifying; an escalation always notifies", async () => {
    const t = await withTeam();
    await flockWithDeaths(t, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    await t.evaluate();
    const before = t.ctx.store.notifications.all().length;
    const alert = t.ctx.store.alerts.all().find((a) => a.ruleType === "mortality_spike")!;
    t.ctx.store.alerts.put(alert.id, { ...alert, status: "resolved", resolvedAt: new Date() });
    await t.evaluate();
    expect(t.ctx.store.notifications.all().length).toBe(before);
    await t.call("put", "/alert-rules/mortality").send({ enabled: true, severity: "critical" });
    await t.evaluate();
    expect(t.ctx.store.notifications.all().length).toBeGreaterThan(before);
  });

  it("money alerts go only to people who may see money", async () => {
    const t = await withTeam();
    const acct = await joinAs(t.ctx, t.owner, "acc@example.com", "accountant");
    await t.call("put", "/alert-rules/payment_overdue").send({ enabled: true, notifyRoles: ["owner", "accountant", "worker"] });
    await t.call("post", "/finance/incomes").send({ kind: "sale", date: D(-20), dueDate: D(-5), category: "egg_sales", description: "Eggs", amount: INR(5000) });
    await t.evaluate();
    const who = t.ctx.store.notifications.all().filter((n) => n.ruleKey === "payment_overdue").map((n) => n.userId);
    expect(who).toEqual(expect.arrayContaining([t.owner.userId, acct.userId]));
    expect(who).not.toContain(t.worker.userId);
  });
});

describe("dashboard, analytics and alerts endpoints", () => {
  it("the dashboard shows each person only the sections they may see", async () => {
    const s = await setup();
    await flockWithDeaths(s, "D1", [2, 3]);
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    const own = (await s.call("get", "/dashboard")).body;
    expect(Object.keys(own).sort()).toEqual(["alerts", "date", "farm", "finance", "hatchery", "inventory", "production", "tasks", "upcoming", "weather"]);
    expect(own.production).toMatchObject({ flocksTotal: 1 });
    expect(own.finance).toMatchObject({ cashMinor: 0, receivablesMinor: 0 });
    const w = (await s.call("get", "/dashboard", worker.access)).body;
    expect(w.finance).toBeUndefined();
    expect(w.production).toBeDefined();
  });

  it("analytics: daily series with a baseline band and the anomaly flagged", async () => {
    const s = await setup();
    await flockWithDeaths(s, "Q1", [20, 22, 21, 19, 20, 21, 20, 60], 10_000);
    const a = (await s.call("get", `/analytics?from=${D(-3)}&to=${D(-1)}`)).body;
    const mort = a.series.find((x: { metric: string }) => x.metric === "mortality");
    expect(mort.points.map((p: { date: string }) => p.date)).toEqual([D(-3), D(-2), D(-1)]);
    const spike = mort.points[2];
    expect(spike).toMatchObject({ anomaly: true });
    expect(spike.value).toBeGreaterThan(spike.baselineHigh);
    expect(mort.anomalies).toBe(1);
    expect(a.comparison[0]).toMatchObject({ flockCode: "Q1", pastFlocks: 0, farmPastFcr: null });
    expect((await s.call("get", `/analytics?from=${D(-400)}&to=${D(0)}`)).status).toBe(400);
  });

  it("alerts can be filtered and come with counts", async () => {
    const s = await setup();
    await flockWithDeaths(s, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    await s.call("post", "/inventory/items").send({ name: "Starter", category: "feed", unit: "kg", feed: { stage: "starter" }, reorderLevel: 100 });
    await s.evaluate();
    const all = (await s.call("get", "/alerts")).body;
    expect(all.counts.open).toBeGreaterThanOrEqual(2);
    expect((await s.call("get", "/alerts?ruleKey=mortality")).body.items.map((a: { ruleType: string }) => a.ruleType)).toEqual(["mortality_spike"]);
    expect((await s.call("get", "/alerts?ruleKey=inventory")).body.items.map((a: { ruleType: string }) => a.ruleType)).toEqual(["low_feed_stock"]);
    expect((await s.call("get", "/alerts?severity=critical")).body.items.every((a: { severity: string }) => a.severity === "critical")).toBe(true);
  });

  it("the hourly job refreshes weather and runs every rule for every farm", async () => {
    const w = weather({ past: 30, future: [30, 30, 30] });
    const s = await setup({ weather: w, location: true });
    await flockWithDeaths(s, "Q1", [2, 3, 2, 2, 3, 2, 2, 10]);
    expect(await runAlertJob(s.ctx.container)).toEqual({ farms: 1, failed: 0 });
    expect(w.calls).toBe(1);
    expect(await openAlerts(s, "mortality_spike")).toHaveLength(1);
  });
});
