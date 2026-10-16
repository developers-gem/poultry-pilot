import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { bearer } from "../harness.js";
import { securityWorld, TODAY } from "./seed.js";

/**
 * OWASP API1 (broken object level authorization) and API2 (broken authentication), checked on EVERY documented
 * operation (from packages/contracts/openapi.json, so a new route is covered automatically).
 */
const spec = JSON.parse(readFileSync(join(__dirname, "../../../../../packages/contracts/openapi.json"), "utf8")) as { paths: Record<string, Record<string, { security?: unknown[] }>> };
const ops = Object.entries(spec.paths).flatMap(([path, methods]) => Object.entries(methods).filter(([m]) => ["get", "post", "put", "patch", "delete"].includes(m)).map(([method, op]) => ({ path, method: method as "get" | "post" | "put" | "patch" | "delete", secured: !!op.security?.length })));
const SECRET = "test-secret-test-secret-test-secret-123";
const ISSUER = "poultrypilot-test"; // the test container's issuer: forged tokens must fail for the intended reason, not the issuer

/** Which table holds the record a path segment names (to fill {id} with a REAL record of the victim). */
const TABLE_FOR_SEGMENT: Record<string, string> = {
  records: "healthRecords", vaccinations: "vaccinations", medicines: "medicines", programmes: "vaccinationProgrammes", appointments: "healthRecords",
  batches: "hatcheryBatches", "chick-orders": "orders", orders: "orders", listings: "listings", buyers: "buyers", accounts: "moneyAccounts", incomes: "incomes",
  expenses: "expenses", recurring: "recurringExpenses", suppliers: "suppliers", transactions: "transactions", payments: "orderPayments", tasks: "tasks", alerts: "alerts",
  visitors: "visitors", logs: "biosecurityLogs", "cleaning-schedules": "cleaningTasks", "corrective-actions": "tasks", checklists: "checklistTemplates", equipment: "equipment",
  arrivals: "chickArrivals", profiles: "broodingProfiles", checks: "brooderChecks", media: "mediaAssets", items: "inventoryItems", lots: "inventoryLots", consumption: "feedConsumption",
  members: "memberships", "daily-records": "dailyRecords", houses: "houses", flocks: "flocks", events: "flockEvents", "push-devices": "pushDevices", movements: "equipmentMovements",
};
const TABLE_FOR_PARAM: Record<string, string> = { flockId: "flocks", houseId: "houses", itemId: "inventoryItems", memberId: "memberships", taskId: "tasks", alertId: "alerts", assetId: "mediaAssets", eventId: "flockEvents" };
const LEAK = /\bat [\w$.<>]+ \(|node_modules|\.ts:\d+:\d+|test-secret-test-secret/;

describe("every operation, every attacker", () => {
  let w: Awaited<ReturnType<typeof securityWorld>>;
  const idIn = (table: string, farmId: string): string | undefined => {
    const t = (w.ctx.store as unknown as Record<string, { all(): { id: string; farmId?: string }[] }>)[table];
    return t?.all().find((r) => r.farmId === farmId)?.id;
  };
  /** Fills a path: farmId as given; every other parameter with a real record of `owner` where one exists. */
  const fill = (path: string, farmId: string, owner: string) =>
    path.replace(/\{(\w+)\}/g, (_, name: string, offset: number) => {
      if (name === "farmId") return farmId;
      if (name === "date") return TODAY;
      if (name === "ruleKey") return "mortality";
      if (name === "type") return "flock";
      if (name === "slug" || name === "lessonId") return "none";
      if (name === "sessionId") return [...w.ctx.store.sessions.all()].find((s) => s.userId === w.victim.userId)?.id ?? "00000000-0000-4000-8000-000000000000";
      const segment = path.slice(0, offset).split("/").filter(Boolean).pop() ?? "";
      const table = TABLE_FOR_PARAM[name] ?? TABLE_FOR_SEGMENT[segment];
      return (table && idIn(table, owner)) ?? "01a00000-0000-7000-8000-000000000001";
    });
  const send = (method: string, url: string, token?: string) => {
    const r = (w.ctx.api() as unknown as Record<string, (u: string) => any>)[method]!(url);
    if (token) r.set("Authorization", `Bearer ${token}`);
    return method === "get" || method === "delete" ? r : r.send({});
  };
  const noLeak = (r: { status: number; body: unknown; text?: string }, what: string) => {
    expect(r.status, `${what} answered 500`).not.toBe(500);
    expect(LEAK.test(JSON.stringify(r.body) + (r.text ?? "")), `${what} leaked internals`).toBe(false);
  };

  beforeAll(async () => {
    w = await securityWorld();
  }, 60_000);

  it(`covers ${ops.length} operations`, () => {
    expect(ops.length).toBeGreaterThan(250);
  });

  it("no secured operation answers without a valid token (none, garbage, wrong secret, alg=none, expired, tampered)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const wrongSecret = await new SignJWT({ sid: "x" }).setProtectedHeader({ alg: "HS256" }).setSubject(w.victim.userId).setJti("j").setIssuer(ISSUER).setAudience("poultrypilot").setIssuedAt(now).setExpirationTime(now + 600).sign(new TextEncoder().encode("another-secret-another-secret-12345678"));
    const unsigned = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: w.victim.userId, sid: "x", iss: ISSUER, aud: "poultrypilot", exp: now + 600 })).toString("base64url")}.`;
    const session = [...w.ctx.store.sessions.all()].find((s) => s.userId === w.victim.userId)!;
    const expired = await new SignJWT({ sid: session.id }).setProtectedHeader({ alg: "HS256" }).setSubject(w.victim.userId).setJti("j2").setIssuer(ISSUER).setAudience("poultrypilot").setIssuedAt(now - 7200).setExpirationTime(now - 3600).sign(new TextEncoder().encode(SECRET));
    const [h, , s] = w.attacker.access.split(".");
    const tampered = `${h}.${Buffer.from(JSON.stringify({ sub: w.victim.userId, sid: session.id, iss: ISSUER, aud: "poultrypilot", exp: now + 600, jti: "t" })).toString("base64url")}.${s}`;
    for (const op of ops.filter((o) => o.secured)) {
      const url = fill(op.path, w.victim.farmId, w.victim.farmId);
      for (const [label, token] of [["no token", undefined], ["garbage", "abc.def.ghi"], ["wrong secret", wrongSecret], ["alg none", unsigned], ["expired", expired], ["tampered", tampered]] as const) {
        const r = await send(op.method, url, token);
        expect(r.status, `${op.method.toUpperCase()} ${op.path} with ${label}`).toBe(401);
        noLeak(r, `${op.method} ${op.path}`);
      }
      const r = await send(op.method, url, expired);
      expect(r.body.error.code).toBe("TOKEN_EXPIRED");
    }
  }, 120_000);

  it("another farm's owner gets nothing from any /farms/{farmId} operation of the victim (never trusts the farmId)", async () => {
    const failures: string[] = [];
    for (const op of ops.filter((o) => o.path.startsWith("/api/v1/farms/{farmId}"))) {
      const r = await send(op.method, fill(op.path, w.victim.farmId, w.victim.farmId), w.attacker.access);
      noLeak(r, `${op.method} ${op.path}`);
      const allowed = op.method === "get" ? [403, 404] : [400, 403, 404];
      if (!allowed.includes(r.status)) failures.push(`${op.method.toUpperCase()} ${op.path} → ${r.status}`);
    }
    expect(failures).toEqual([]);
  }, 120_000);

  it("IDOR: the attacker's own farm paths with the victim's record ids never reach the victim's records", async () => {
    const failures: string[] = [];
    for (const op of ops.filter((o) => o.path.startsWith("/api/v1/farms/{farmId}/") && /\{(?!farmId)\w+\}/.test(o.path) && !/\{date\}$/.test(o.path))) {
      const url = fill(op.path, w.attacker.farmId, w.victim.farmId); // attacker's farm, victim's ids
      if (!/[0-9a-f-]{36}/.test(url.replace(w.attacker.farmId, ""))) continue;
      const r = await send(op.method, url, w.attacker.access);
      noLeak(r, `${op.method} ${op.path}`);
      if (r.status >= 200 && r.status < 300) failures.push(`${op.method.toUpperCase()} ${op.path} → ${r.status}`);
    }
    expect(failures).toEqual([]);
  }, 120_000);

  it("root-level routes: the victim's day records, orders, sessions, devices and sync data stay theirs", async () => {
    const day = w.ctx.store.dailyRecords.all().find((d) => d.farmId === w.victim.farmId)!;
    const order = w.ids.order;
    const session = [...w.ctx.store.sessions.all()].find((s) => s.userId === w.victim.userId)!;
    const asAttacker = (m: "get" | "put" | "delete" | "post", url: string, body?: object) => w.ctx.api()[m](url).set(bearer(w.attacker.access)).send(body ?? {});
    expect((await asAttacker("get", `/api/v1/daily-records/${day.id}`)).status).toBe(404);
    expect((await asAttacker("delete", `/api/v1/daily-records/${day.id}`)).status).toBe(404);
    expect((await asAttacker("get", `/api/v1/market/orders/${order}`)).status).toBe(404); // not their order
    expect((await asAttacker("post", `/api/v1/market/orders/${order}/cancel`, { reason: "Not my order" })).status).toBe(404);
    expect((await asAttacker("delete", `/api/v1/me/sessions/${session.id}`)).status).toBe(404);
    expect((await asAttacker("get", `/api/v1/sync/pull?farmId=${w.victim.farmId}`)).status).toBe(404);
    expect((await asAttacker("post", "/api/v1/sync/push", { farmId: w.victim.farmId, deviceId: "x", mutations: [{ mutationId: "01a20000-0000-7000-8000-000000000001", command: "flock.mortality", payload: { flockId: w.ids.flock, date: TODAY, count: 1 }, clientCreatedAt: new Date().toISOString() }] })).status).toBe(404);
    // Pushing to their OWN farm but naming the victim's flock: refused, and the victim's birds are untouched.
    const own = await asAttacker("post", "/api/v1/sync/push", { farmId: w.attacker.farmId, deviceId: "x", mutations: [{ mutationId: "01a20000-0000-7000-8000-000000000002", command: "flock.mortality", payload: { flockId: w.ids.flock, date: TODAY, count: 1 }, clientCreatedAt: new Date().toISOString() }] });
    expect(own.body.results[0]).toMatchObject({ status: "rejected", code: "NOT_FOUND" });
    expect((await w.ctx.api().get(`/api/v1/farms/${w.victim.farmId}/flocks/${w.ids.flock}`).set(bearer(w.victim.access))).body.currentBirdCount).toBe(998);
    // Ordering on behalf of a farm they do not belong to.
    expect((await asAttacker("post", "/api/v1/market/orders", { listingId: w.ids.listing, quantity: 1, fulfilment: "pickup", buyerName: "X", buyerFarmId: w.victim.farmId })).status).toBe(404);
    // Editorial endpoints need a platform role.
    expect((await asAttacker("post", "/api/v1/admin/content/articles", { kind: "fact", slug: "x", title: "x", category: "management" })).status).toBe(403);
  });

  it("a worker on the victim's farm cannot reach the attacker's farm either (membership, not role)", async () => {
    const r = await w.ctx.api().get(`/api/v1/farms/${w.attacker.farmId}/flocks`).set(bearer(w.worker.access));
    expect(r.status).toBe(404);
  });
});
