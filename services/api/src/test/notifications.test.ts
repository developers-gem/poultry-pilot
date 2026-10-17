import { NOTIFICATION_CATEGORIES } from "@poultrypilot/constants";
import { describe, expect, it } from "vitest";
import { fcmMessage, fcmPushProvider } from "../adapters/fcm.js";
import { addDays, localDateOf } from "../domain/index.js";
import { systemContext } from "../jobs/alert-job.js";
import type { NotificationProvider } from "../ports/external.js";
import type { AlertRecord } from "../ports/records.js";
import { quietUntil } from "../services/notification.service.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);

/** A push provider that records what it was asked to send and answers per device as scripted. */
function scriptedPush(answer: (token: string, call: number) => "sent" | "retry" | "gone" = () => "sent") {
  const calls: { notificationId: string; tokens: string[] }[] = [];
  const provider: NotificationProvider = {
    channel: "push",
    name: "test",
    async send(m) {
      calls.push({ notificationId: m.notificationId, tokens: m.pushTokens ?? [] });
      const r = { sentTokens: [] as string[], retryTokens: [] as string[], invalidTokens: [] as string[] };
      for (const t of m.pushTokens ?? []) {
        const a = answer(t, calls.length);
        (a === "sent" ? r.sentTokens : a === "retry" ? r.retryTokens : r.invalidTokens).push(t);
      }
      return r;
    },
  };
  return { provider, calls };
}

async function farm(push = scriptedPush()) {
  const ctx = makeApp({ notificationProviders: [push.provider] });
  const owner = await register(ctx, "owner@example.com");
  const worker = await joinAs(ctx, owner, "worker@example.com", "worker");
  const call = (who: { access: string }, m: "get" | "post" | "put", p: string) => ctx.api()[m](`/api/v1${p}`).set(bearer(who.access));
  const notes = (userId?: string) => ctx.store.notifications.all().filter((n) => !userId || n.userId === userId);
  const n = ctx.container.notifications;
  const alert = (ruleType: AlertRecord["ruleType"], severity: AlertRecord["severity"] = "warning"): AlertRecord =>
    ({ id: `01a30000-0000-7000-8000-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`, farmId: owner.farmId, ruleType, severity, status: "open", title: `Test ${ruleType}`, date: TODAY, createdAt: new Date(), updatedAt: new Date(), version: 0 }) as unknown as AlertRecord;
  const fieldRule = { notifyRoles: ["owner", "worker"], channels: ["in_app", "push"], cooldownHours: 24 } as never;
  return { ctx, owner, worker, call, notes, n, alert, fieldRule, push };
}

describe("notification preferences", () => {
  it("list all twelve categories with labels; push can be switched off per category; quiet hours are validated", async () => {
    const { owner, call } = await farm();
    const p = (await call(owner, "get", "/me/notification-preferences")).body;
    expect(p.categories.map((c: { key: string }) => c.key)).toEqual([...NOTIFICATION_CATEGORIES]);
    expect(p.categories.every((c: { push: boolean; label: string }) => c.push && c.label)).toBe(true);
    const saved = await call(owner, "put", "/me/notification-preferences").send({ pushEnabled: true, emailEnabled: false, pushMinSeverity: "warning", emailMinSeverity: "warning", categories: { feed: { push: false } }, quietHours: { start: "21:30", end: "05:30", timezone: "Asia/Kolkata" } });
    expect(saved.status).toBe(200);
    expect(saved.body.categories.find((c: { key: string }) => c.key === "feed")).toMatchObject({ push: false, email: true });
    expect(saved.body.quietHours).toEqual({ start: "21:30", end: "05:30", timezone: "Asia/Kolkata" });
    expect((await call(owner, "put", "/me/notification-preferences").send({ pushEnabled: true, emailEnabled: false, pushMinSeverity: "warning", emailMinSeverity: "warning", quietHours: { start: "25:00", end: "05:00", timezone: "Asia/Kolkata" } })).status).toBe(400);
    expect((await call(owner, "put", "/me/notification-preferences").send({ pushEnabled: true, emailEnabled: false, pushMinSeverity: "warning", emailMinSeverity: "warning", quietHours: { start: "22:00", end: "05:00", timezone: "Mars/Olympus" } })).status).toBe(400);
    const cleared = (await call(owner, "put", "/me/notification-preferences").send({ pushEnabled: true, emailEnabled: false, pushMinSeverity: "warning", emailMinSeverity: "warning", quietHours: null })).body;
    expect(cleared.quietHours).toBeNull();
    expect(cleared.categories.find((c: { key: string }) => c.key === "feed").push).toBe(false); // left as set
  });
});

describe("alerts become notifications under their category", () => {
  it("each rule's alert carries its category; a category switched off skips push but keeps the in-app record", async () => {
    const { ctx, owner, worker, call, notes, n, alert, fieldRule } = await farm();
    await call(worker, "put", "/me/notification-preferences").send({ pushEnabled: true, emailEnabled: true, pushMinSeverity: "info", emailMinSeverity: "critical", categories: { mortality: { push: false } } });
    const ctxFarm = systemContext(owner.farmId);
    const types: [AlertRecord["ruleType"], string][] = [["mortality_spike", "mortality"], ["egg_drop", "egg_production"], ["feed_change", "feed"], ["water_abnormal", "water"], ["weight_variance", "weight_variance"], ["low_feed_stock", "inventory_low"], ["vaccination_due", "vaccination_due"], ["hatch_due", "hatch_date"], ["order_delivery", "order_update"], ["weather_risk", "weather_risk"]];
    for (const [type] of types) await n.onAlert(ctxFarm, alert(type), fieldRule, "new");
    for (const [type, category] of types) expect(notes(worker.userId).find((x) => x.title === `Test ${type}`)!.category).toBe(category);
    const mortality = notes(worker.userId).filter((x) => x.category === "mortality");
    expect(mortality.map((x) => x.channel)).toEqual(["in_app"]); // push off for deaths only
    expect(notes(worker.userId).filter((x) => x.category === "egg_production").map((x) => x.channel).sort()).toEqual(["in_app", "push"]);
    expect(ctx.store.notifications.all().every((x) => x.dedupeKey)).toBe(true);
  });
});

describe("no duplicate notifications", () => {
  it("the same event notified again (job re-run, retry) stores nothing new; escalation is a new event", async () => {
    const { notes, n, alert, owner, worker, fieldRule } = await farm();
    const a = alert("mortality_spike");
    const first = await n.onAlert(systemContext(owner.farmId), a, fieldRule, "new");
    expect(first.length).toBeGreaterThan(0);
    expect(await n.onAlert(systemContext(owner.farmId), a, fieldRule, "new")).toEqual([]);
    expect(await n.onAlert(systemContext(owner.farmId), a, fieldRule, "reopened")).toEqual([]); // within the cooldown
    const escalated = await n.onAlert(systemContext(owner.farmId), { ...a, severity: "critical" }, fieldRule, "escalated");
    expect(escalated.length).toBeGreaterThan(0);
    expect(await n.onAlert(systemContext(owner.farmId), { ...a, severity: "critical" }, fieldRule, "escalated")).toEqual([]);
    expect(notes(worker.userId).filter((x) => x.alertId === a.id && x.channel === "in_app")).toHaveLength(2); // new + escalated
  });

  it("the database refuses a second copy even if the check before insert is bypassed (two servers at once)", async () => {
    const { ctx, n, owner } = await farm();
    const [stored] = await n.notify({ farmId: owner.farmId, category: "task_due", eventKey: "task:x:due", userIds: [owner.userId], title: "Due", severity: "info", channels: ["in_app"] });
    await expect(ctx.container.repos.notifications.insertMany([{ ...stored!, id: "another-id" }])).rejects.toThrow(/already exists/);
  });

  it("tasks due today and overdue tasks are told once each, however often the hourly job runs", async () => {
    const { call, notes, n, owner, worker } = await farm();
    await call(owner, "post", `/farms/${owner.farmId}/tasks`).send({ title: "Clean drinkers", dueDate: D(0), assigneeUserId: worker.userId });
    await call(owner, "post", `/farms/${owner.farmId}/tasks`).send({ title: "Order litter", dueDate: D(-2) });
    for (let i = 0; i < 3; i++) await n.notifyTasksDue(systemContext(owner.farmId));
    const mine = notes(worker.userId).filter((x) => x.category === "task_due" && x.channel === "in_app");
    expect(mine.map((x) => x.title).sort()).toEqual(["Due today: Clean drinkers", "Overdue: Order litter"]);
    expect(notes(owner.userId).filter((x) => x.category === "task_due" && x.channel === "in_app").map((x) => x.title)).toEqual(["Overdue: Order litter"]); // the assigned task goes to its assignee only
  });
});

describe("order and payment updates", () => {
  it("tell the other side, never the person who made the change", async () => {
    const { ctx, call, notes, owner } = await farm();
    const buyer = await register(ctx, "buyer@example.com");
    const listing = (await call(owner, "post", `/farms/${owner.farmId}/market/listings`).send({ title: "Eggs", category: "eggs", quantityAvailable: 50, unit: "tray", price: { amountMinor: 18000, currency: "INR" }, priceUnit: "per_tray", regionCode: "IN-UP", fulfilmentOptions: ["pickup"] })).body;
    await call(owner, "post", `/farms/${owner.farmId}/market/listings/${listing.id}/status`).send({ status: "active" });
    const order = (await call(buyer, "post", "/market/orders").send({ listingId: listing.id, quantity: 4, fulfilment: "pickup", buyerName: "Ravi" })).body;
    expect(notes(owner.userId).find((x) => x.title === `New order #${order.orderNumber}`)).toMatchObject({ category: "order_update" });
    await call(owner, "post", `/farms/${owner.farmId}/market/orders/${order.id}/accept`);
    expect(notes(buyer.userId).filter((x) => x.channel === "in_app").map((x) => x.title)).toEqual([`Your order #${order.orderNumber} is accepted`]);
    expect(notes(owner.userId).some((x) => x.title.includes("accepted"))).toBe(false); // not told of their own action
    const cash = (await call(owner, "post", `/farms/${owner.farmId}/finance/accounts`).send({ name: "Cash", type: "cash", openingBalance: { amountMinor: 0, currency: "INR" }, openingDate: D(-1) })).body;
    await call(owner, "post", `/farms/${owner.farmId}/market/orders/${order.id}/payments`).send({ date: D(0), amount: { amountMinor: 72000, currency: "INR" }, accountId: cash.id, method: "cash" });
    expect(notes(buyer.userId).find((x) => x.category === "payment_update")!.title).toBe(`Payment of 720.00 INR on order #${order.orderNumber}`);
    expect(notes(owner.userId).some((x) => x.category === "payment_update")).toBe(false);
  });
});

describe("delivery", () => {
  it("a retry goes only to the devices that did not get the push; a gone device is disabled", async () => {
    const push = scriptedPush((token, call) => (token === "fcm-token-phone-b" && call === 1 ? "retry" : token === "fcm-token-old-tablet" ? "gone" : "sent"));
    const { ctx, call, n, owner } = await farm(push);
    for (const token of ["fcm-token-phone-a", "fcm-token-phone-b", "fcm-token-old-tablet"]) await call(owner, "post", "/me/push-devices").send({ platform: "android", token });
    await n.notify({ farmId: owner.farmId, category: "weather_risk", eventKey: "weather:x", userIds: [owner.userId], title: "Heat tomorrow", severity: "warning" });
    expect(await n.deliverDue()).toMatchObject({ retrying: 1 });
    const queued = ctx.store.notifications.all().find((x) => x.channel === "push")!;
    expect(queued.sentTokens).toEqual(["fcm-token-phone-a"]);
    ctx.store.notifications.put(queued.id, { ...ctx.store.notifications.get(queued.id)!, nextAttemptAt: new Date(0) });
    expect(await n.deliverDue()).toMatchObject({ sent: 1 });
    expect(push.calls.map((c) => c.tokens)).toEqual([["fcm-token-phone-a", "fcm-token-phone-b", "fcm-token-old-tablet"], ["fcm-token-phone-b"]]); // never phone-a twice
    expect((await ctx.container.repos.pushDevices.activeForUser(owner.userId)).map((d) => d.token).sort()).toEqual(["fcm-token-phone-a", "fcm-token-phone-b"]);
  });

  it("quiet hours delay push (nothing dropped); critical alerts still go at once", async () => {
    const { ctx, call, n, owner } = await farm();
    await call(owner, "post", "/me/push-devices").send({ platform: "ios", token: "fcm-token-iphone" });
    const now = new Date();
    const hh = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
    await call(owner, "put", "/me/notification-preferences").send({ pushEnabled: true, emailEnabled: false, pushMinSeverity: "info", emailMinSeverity: "warning", quietHours: { start: hh(new Date(now.getTime() - 3_600_000)), end: hh(new Date(now.getTime() + 2 * 3_600_000)), timezone: "UTC" } });
    await n.notify({ farmId: owner.farmId, category: "egg_production", eventKey: "egg:1", userIds: [owner.userId], title: "Eggs down", severity: "warning" });
    await n.notify({ farmId: owner.farmId, category: "mortality", eventKey: "mort:1", userIds: [owner.userId], title: "Many deaths", severity: "critical" });
    const pushes = ctx.store.notifications.all().filter((x) => x.channel === "push");
    expect(pushes.find((x) => x.title === "Eggs down")!.nextAttemptAt!.getTime()).toBeGreaterThan(now.getTime() + 60 * 60_000);
    expect(pushes.find((x) => x.title === "Many deaths")!.nextAttemptAt!.getTime()).toBeLessThanOrEqual(Date.now());
    expect(await n.deliverDue()).toMatchObject({ sent: 1 }); // only the critical one now
  });

  it("quiet hours across midnight", () => {
    const q = { start: "22:00", end: "06:00", timezone: "UTC" };
    expect(quietUntil(new Date("2026-10-16T23:30:00Z"), q)?.toISOString()).toBe("2026-10-17T06:00:00.000Z");
    expect(quietUntil(new Date("2026-10-17T05:59:00Z"), q)?.toISOString()).toBe("2026-10-17T06:00:00.000Z");
    expect(quietUntil(new Date("2026-10-17T12:00:00Z"), q)).toBeNull();
  });

  it("a phone moved to another account no longer receives the first account's notifications", async () => {
    const { ctx, call, owner, worker } = await farm();
    await call(owner, "post", "/me/push-devices").send({ platform: "android", token: "shared-phone" });
    await call(worker, "post", "/me/push-devices").send({ platform: "android", token: "shared-phone" });
    expect(await ctx.container.repos.pushDevices.activeForUser(owner.userId)).toHaveLength(0);
    expect((await ctx.container.repos.pushDevices.activeForUser(worker.userId)).map((d) => d.token)).toEqual(["shared-phone"]);
  });
});

describe("FCM provider", () => {
  const msg = { notificationId: "n-1", userId: "u", title: "Heat tomorrow", body: "Up to 39 °C", severity: "warning" as const, category: "weather_risk", link: { path: "/home" } };

  it("builds a message the phone shows once: the notification id is the Android tag/collapse key and the iOS collapse id", () => {
    const m = fcmMessage(msg, "tok").message;
    expect(m.android).toMatchObject({ priority: "high", collapse_key: "n-1", notification: { tag: "n-1" } });
    expect(m.apns.headers["apns-collapse-id"]).toBe("n-1");
    expect(m.data).toEqual({ notificationId: "n-1", category: "weather_risk", severity: "warning", path: "/home" });
  });

  it("sorts each device: sent, try again, gone, dropped; refused credentials stop with a non-retryable error", async () => {
    const replies: Record<string, [number, object]> = {
      ok: [200, { name: "projects/p/messages/1" }],
      busy: [503, { error: { status: "UNAVAILABLE" } }],
      gone: [404, { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }],
      bad: [400, { error: { status: "INVALID_ARGUMENT", details: [{ errorCode: "INVALID_ARGUMENT" }] } }],
    };
    const fetchImpl = (async (_url: string, init: { body: string }) => {
      const token = JSON.parse(init.body).message.token as string;
      const [status, body] = replies[token]!;
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    const fcm = fcmPushProvider({ projectId: "p", clientEmail: "x@p.iam.gserviceaccount.com", privateKey: "unused" }, { fetchImpl, accessToken: async () => "t" });
    const r = await fcm.send({ ...msg, pushTokens: ["ok", "busy", "gone", "bad"] });
    expect(r).toMatchObject({ sentTokens: ["ok"], retryTokens: ["busy"], invalidTokens: ["gone"], providerMessageId: "projects/p/messages/1" });
    const denied = fcmPushProvider({ projectId: "p", clientEmail: "x@p.iam.gserviceaccount.com", privateKey: "unused" }, { fetchImpl: (async () => new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED" } }), { status: 403 })) as unknown as typeof fetch, accessToken: async () => "t" });
    await expect(denied.send({ ...msg, pushTokens: ["ok"] })).rejects.toMatchObject({ retryable: false });
  });
});

describe("several API instances", () => {
  it("two delivery workers running at once send each notification once", async () => {
    const push = scriptedPush();
    const { call, n, owner } = await farm(push);
    await call(owner, "post", "/me/push-devices").send({ platform: "android", token: "fcm-token-only-phone" });
    for (let i = 0; i < 5; i++) await n.notify({ farmId: owner.farmId, category: "weather_risk", eventKey: `w:${i}`, userIds: [owner.userId], title: `Heat ${i}`, severity: "warning" });
    const [a, b] = await Promise.all([n.deliverDue(), n.deliverDue()]);
    expect(a.sent + b.sent).toBe(5);
    expect(push.calls).toHaveLength(5);
    expect(new Set(push.calls.map((c) => c.notificationId)).size).toBe(5);
  });
});
