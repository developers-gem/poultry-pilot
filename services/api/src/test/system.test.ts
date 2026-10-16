import { HealthResponse } from "@poultrypilot/validation";
import { describe, expect, it } from "vitest";
import { loadEnv, redactMongoUri } from "../config/env.js";
import { makeApp } from "./harness.js";

describe("GET /api/v1/health", () => {
  it("returns 200 with MongoDB up, matching the published schema", async () => {
    const { api } = makeApp();
    const res = await api().get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(() => HealthResponse.parse(res.body)).not.toThrow();
    expect(res.body).toMatchObject({ status: "ok", version: "0.1.0-test", environment: "test", checks: { mongodb: { status: "up" } } });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("returns 503 'degraded' when MongoDB is down, without throwing", async () => {
    const { api } = makeApp({ health: { mongodb: async () => ({ status: "down", error: "not connected (state 0)" }) } });
    const res = await api().get("/api/v1/health");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "degraded", checks: { mongodb: { status: "down", error: "not connected (state 0)" } } });
  });

  it("liveness never touches dependencies", async () => {
    let called = false;
    const { api } = makeApp({ health: { mongodb: async () => ((called = true), { status: "down" }) } });
    const res = await api().get("/api/v1/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(called).toBe(false);
  });

  it("is never rate limited", async () => {
    const { api } = makeApp({ globalRateLimit: 2 });
    for (let i = 0; i < 5; i++) expect((await api().get("/api/v1/health")).status).toBe(200);
    await api().get("/api/v1/farms");
    await api().get("/api/v1/farms");
    expect((await api().get("/api/v1/farms")).status).toBe(429);
  });
});

describe("cross-cutting middleware", () => {
  it("echoes or creates a request id and sets security headers", async () => {
    const { api } = makeApp();
    const mine = await api().get("/api/v1/health/live").set("X-Request-Id", "client-trace-12345");
    expect(mine.headers["x-request-id"]).toBe("client-trace-12345");
    const generated = await api().get("/api/v1/health/live");
    expect(generated.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(generated.headers["x-content-type-options"]).toBe("nosniff");
    expect(generated.headers["strict-transport-security"]).toBeDefined();
    expect(generated.headers["x-powered-by"]).toBeUndefined();
  });

  it("allows configured origins only", async () => {
    const { api } = makeApp();
    const ok = await api().options("/api/v1/farms").set("Origin", "http://localhost:5173").set("Access-Control-Request-Method", "POST");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    const evil = await api().options("/api/v1/farms").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "POST");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("returns the error envelope for unknown routes and oversized bodies", async () => {
    const { api } = makeApp({ bodyLimit: "1kb" });
    const missing = await api().get("/api/v1/nope");
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatchObject({ code: "NOT_FOUND", requestId: expect.any(String) });
    const big = await api().post("/api/v1/auth/login").send({ email: "a@b.co", password: "x".repeat(5000) });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("only serves API routes under the versioned prefix", async () => {
    const { api } = makeApp();
    expect((await api().get("/health")).status).toBe(404);
    expect((await api().get("/api/v2/health")).status).toBe(404);
  });
});

describe("GET /api/v1/openapi.json", () => {
  it("publishes an OpenAPI 3.1 contract including the health endpoint", async () => {
    const { api } = makeApp();
    const res = await api().get("/api/v1/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(Object.keys(res.body.paths)).toEqual(expect.arrayContaining(["/api/v1/health", "/api/v1/auth/register", "/api/v1/farms/{farmId}"]));
    expect(res.body.paths["/api/v1/health"].get.responses).toHaveProperty("503");
    expect(res.body.components.schemas.HealthResponse.properties.checks).toBeDefined();
  });
});

describe("environment configuration", () => {
  const base = { MONGODB_URI: "mongodb://localhost:27017/pp", JWT_ACCESS_SECRET: "x".repeat(40) };

  it("applies defaults", () => {
    const env = loadEnv(base);
    expect(env).toMatchObject({ PORT: 4000, NODE_ENV: "development", CORS_ORIGINS: ["http://localhost:5173"] });
    expect(env.OPENAPI_ENABLED).toBeUndefined(); // unset: on outside production, off in production (server.ts)
  });

  it("lists every problem at once", () => {
    expect(() => loadEnv({ MONGODB_URI: "postgres://x", JWT_ACCESS_SECRET: "short", PORT: "99999" })).toThrow(
      /MONGODB_URI[\s\S]*JWT_ACCESS_SECRET|JWT_ACCESS_SECRET[\s\S]*MONGODB_URI/,
    );
  });

  it("refuses unsafe production settings", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production", CORS_ORIGINS: "*" })).toThrow(/Wildcard origin/);
    expect(() => loadEnv({ ...base, NODE_ENV: "production", JWT_ACCESS_SECRET: "replace-with-a-random-string-of-at-least-32" })).toThrow(/Placeholder/);
  });

  it("redacts credentials in connection strings", () => {
    expect(redactMongoUri("mongodb+srv://user:p%40ss@cluster0.x.mongodb.net/pp")).toBe("mongodb+srv://***:***@cluster0.x.mongodb.net/pp");
  });
});
