import express from "express";
import pino from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AppError } from "../../lib/errors.js";
import { bearer, makeApp, register } from "../harness.js";

const LEAK = /\bat [\w$.<>]+ \(|node_modules|\.ts:\d+:\d+|secret|boom/i;

async function farm() {
  const ctx = makeApp();
  const o = await register(ctx, "owner@example.com");
  const call = (m: "get" | "post" | "put", p: string) => ctx.api()[m](`/api/v1/farms/${o.farmId}${p}`).set(bearer(o.access));
  return { ctx, o, call };
}

describe("OWASP API8/API3: input validation and mass assignment", () => {
  it("NoSQL operators in bodies and query strings are refused, never passed to the database", async () => {
    const { ctx, call } = await farm();
    const login = await ctx.api().post("/api/v1/auth/login").send({ email: { $gt: "" }, password: { $gt: "" } });
    expect(login.status).toBe(400);
    const q = await call("get", "/flocks?status[$ne]=closed");
    expect([200, 400]).toContain(q.status);
    if (q.status === 200) expect(q.body.items).toEqual([]); // treated as an unknown status, not an operator
    // Flat query parsing: the operator never becomes an object, so it cannot change the query.
    const t = await call("get", "/tasks?status[$ne]=done");
    expect(t.status).toBe(200);
    expect(t.body.items.every((x: { status: string }) => x.status !== "done" || false)).toBe(true);
  });

  it("prototype pollution through __proto__ or constructor is refused and pollutes nothing", async () => {
    const { ctx, o } = await farm();
    const r = await ctx.api().post(`/api/v1/farms/${o.farmId}/houses`).set(bearer(o.access)).set("Content-Type", "application/json").send('{"name":"H","type":"layer","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}');
    expect(r.status).toBe(400);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("mass assignment: unknown fields are refused (no setting another farm, versions, audit fields or platform roles)", async () => {
    const { ctx, o, call } = await farm();
    expect((await call("post", "/houses").send({ name: "H", type: "layer", farmId: "01a00000-0000-7000-8000-000000000001" })).status).toBe(400);
    expect((await call("post", "/houses").send({ name: "H", type: "layer", createdBy: "someone-else", version: 99 })).status).toBe(400);
    const me = await ctx.api().put("/api/v1/me").set(bearer(o.access)).send({ fullName: "Me", platformRoles: ["content_publisher"], emailVerified: true });
    expect(me.status).toBe(400);
    expect(ctx.store.users.get(o.userId)!.platformRoles ?? []).toEqual([]);
  });

  it("bad shapes are 400s with field messages, never 500s: ids, dates, numbers, sizes, JSON, content type", async () => {
    const { ctx, o, call } = await farm();
    const house = (await call("post", "/houses").send({ name: "H", type: "layer" })).body;
    const flock = (await call("post", "/flocks").send({ name: "L", flockCode: "L", type: "layer", houseId: house.id, placement: { date: "2026-01-01", count: 100 } })).body;
    const cases: [string, Promise<{ status: number; body: unknown }>][] = [
      ["not a uuid", call("get", "/flocks/not-a-uuid")],
      ["path traversal", call("get", "/media/..%2F..%2Fetc%2Fpasswd")],
      ["impossible date", call("put", `/flocks/${flock.id}/daily-records/2026-02-30`).send({ eggs: { collected: 1 } })],
      ["negative count", call("post", `/flocks/${flock.id}/mortality`).send({ date: "2026-01-02", count: -5, cause: "unknown" })],
      ["absurd count", call("post", `/flocks/${flock.id}/mortality`).send({ date: "2026-01-02", count: 1e12, cause: "unknown" })],
      ["huge string", call("post", "/houses").send({ name: "x".repeat(10_000), type: "layer" })],
      ["wrong enum", call("post", "/houses").send({ name: "H", type: "spaceship" })],
      ["text body", ctx.api().post(`/api/v1/farms/${o.farmId}/houses`).set(bearer(o.access)).set("Content-Type", "text/plain").send("name=H")],
      ["malformed JSON", ctx.api().post(`/api/v1/farms/${o.farmId}/houses`).set(bearer(o.access)).set("Content-Type", "application/json").send('{"name": "H",')],
    ];
    for (const [label, p] of cases) {
      const r = await p;
      expect(r.status, label).toBeGreaterThanOrEqual(400);
      expect(r.status, label).toBeLessThan(500);
      expect(LEAK.test(JSON.stringify(r.body)), `${label} leaked`).toBe(false);
    }
    const big = await ctx.api().post(`/api/v1/farms/${o.farmId}/houses`).set(bearer(o.access)).set("Content-Type", "application/json").send(JSON.stringify({ name: "H", type: "layer", notes: "x".repeat(2 * 1024 * 1024) }));
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("stored text comes back as JSON, never as HTML (no stored XSS from the API)", async () => {
    const { call } = await farm();
    const h = await call("post", "/houses").send({ name: "<script>alert(1)</script>", type: "layer" });
    const r = await call("get", `/houses/${h.body.id}`);
    expect(r.headers["content-type"]).toMatch(/^application\/json/);
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("OWASP API7/API8: errors, headers and CORS", () => {
  it("an unexpected failure answers 500 with a reference only: no message, stack, path or secret", async () => {
    const { ctx, call } = await farm();
    ctx.container.repos.houses.find = async () => {
      throw new Error("boom: connection string mongodb://admin:secret@db/prod at /srv/app/x.ts:12:3");
    };
    const r = await call("get", "/houses");
    expect(r.status).toBe(500);
    expect(r.body.error).toMatchObject({ code: "INTERNAL", message: "Something went wrong. Please try again." });
    expect(r.body.error.requestId).toBeTruthy();
    expect(LEAK.test(JSON.stringify(r.body))).toBe(false);
  });

  it("even our own 5xx errors are generic to the client (details stay in the log)", async () => {
    const { errorHandler } = await import("../../http/middleware/core.js");
    const app = express();
    app.get("/x", () => {
      throw new AppError("INTERNAL", "authenticate must run before requireFarm (internal wiring)");
    });
    app.use(errorHandler(pino({ level: "silent" })));
    const r = await request(app).get("/x");
    expect(r.status).toBe(500);
    expect(r.body.error.message).toBe("Something went wrong. Please try again.");
  });

  it("unknown routes are JSON 404s; security headers are set; nothing advertises the server", async () => {
    const { ctx } = await farm();
    const r = await ctx.api().get("/api/v1/nothing-here");
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("NOT_FOUND");
    for (const h of ["x-content-type-options", "x-frame-options", "strict-transport-security", "referrer-policy", "content-security-policy"]) expect(r.headers[h], h).toBeTruthy();
    expect(r.headers["x-powered-by"]).toBeUndefined();
  });

  it("CORS: only the configured web origin is allowed; credentials are never allowed", async () => {
    const { ctx } = await farm();
    const evil = await ctx.api().options("/api/v1/me").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "GET");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
    const good = await ctx.api().options("/api/v1/me").set("Origin", "http://localhost:5173").set("Access-Control-Request-Method", "GET");
    expect(good.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(good.headers["access-control-allow-credentials"]).toBeUndefined();
  });
});

describe("OWASP API4/upload handling", () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7), Buffer.from([0xff, 0xd9])]);
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</OpenAction<</S/JavaScript/JS(app.alert(1))>>>>endobj\n%%EOF");

  it("the type is decided from the bytes: HTML, SVG and empty files are refused whatever they claim to be", async () => {
    const { ctx, o } = await farm();
    const up = (body: Buffer | string, type: string) => ctx.api().post(`/api/v1/farms/${o.farmId}/media`).set(bearer(o.access)).set("Content-Type", type).send(body);
    expect((await up("<html><script>alert(1)</script></html>", "image/jpeg")).status).toBe(400);
    expect((await up('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', "image/svg+xml")).status).toBe(400);
    expect((await up(Buffer.alloc(0), "image/jpeg")).status).toBe(400);
    const ok = await up(jpeg, "text/html"); // a real JPEG labelled as HTML: stored as a JPEG
    expect(ok.status).toBe(201);
    expect(ok.body.contentType).toBe("image/jpeg");
  });

  it("files over 5 MB are refused before they are stored", async () => {
    const { ctx, o } = await farm();
    const r = await ctx.api().post(`/api/v1/farms/${o.farmId}/media`).set(bearer(o.access)).set("Content-Type", "image/jpeg").send(Buffer.concat([jpeg, Buffer.alloc(5 * 1024 * 1024)]));
    expect(r.status).toBe(413);
    expect(ctx.store.mediaAssets.all()).toHaveLength(0);
  });

  it("downloads cannot run script: sandboxed, no sniffing, PDFs as attachments; another farm gets 404", async () => {
    const { ctx, o } = await farm();
    const img = (await ctx.api().post(`/api/v1/farms/${o.farmId}/media`).set(bearer(o.access)).set("Content-Type", "image/jpeg").send(jpeg)).body;
    const doc = (await ctx.api().post(`/api/v1/farms/${o.farmId}/media`).set(bearer(o.access)).set("Content-Type", "application/pdf").send(pdf)).body;
    const a = await ctx.api().get(`/api/v1/farms/${o.farmId}/media/${img.id}`).set(bearer(o.access));
    expect(a.headers["content-type"]).toBe("image/jpeg");
    expect(a.headers["content-security-policy"]).toContain("sandbox");
    expect(a.headers["x-content-type-options"]).toBe("nosniff");
    const p = await ctx.api().get(`/api/v1/farms/${o.farmId}/media/${doc.id}`).set(bearer(o.access));
    expect(p.headers["content-disposition"]).toMatch(/^attachment/);
    const stranger = await register(ctx, "stranger@example.com");
    expect((await ctx.api().get(`/api/v1/farms/${o.farmId}/media/${img.id}`).set(bearer(stranger.access))).status).toBe(404);
    expect((await ctx.api().get(`/api/v1/farms/${stranger.farmId}/media/${img.id}`).set(bearer(stranger.access))).status).toBe(404);
  });
});
