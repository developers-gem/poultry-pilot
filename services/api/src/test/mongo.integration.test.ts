import { pino } from "pino";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createMongo } from "../db/mongo.js";
import { makeApp } from "./harness.js";

/**
 * Real-database checks. Runs only when MONGODB_TEST_URI is set, e.g.
 *   MONGODB_TEST_URI="mongodb://localhost:27017/pp_test?replicaSet=rs0" pnpm test
 * CI sets it against a MongoDB service container.
 */
const uri = process.env["MONGODB_TEST_URI"];
const logger = pino({ level: "silent" });

describe.skipIf(!uri)("MongoDB connectivity (real server)", () => {
  const mongo = createMongo({ uri: uri!, serverSelectionTimeoutMS: 3000, maxPoolSize: 5, retries: 0, autoIndex: false }, logger);
  afterAll(() => mongo.disconnect());

  it("connects and the health check pings successfully", async () => {
    await mongo.connect();
    const status = await mongo.check();
    expect(status.status).toBe("up");
    expect(status.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/v1/health reports MongoDB up through the real check", async () => {
    const { app } = makeApp({ health: { mongodb: mongo.check } });
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.checks.mongodb.status).toBe("up");
  });

  it("reports down after disconnecting", async () => {
    await mongo.disconnect();
    const { app } = makeApp({ health: { mongodb: mongo.check } });
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(503);
    expect(res.body.checks.mongodb).toMatchObject({ status: "down", error: expect.stringContaining("not connected") });
  });
});

describe("MongoDB connectivity failure", () => {
  it("gives up after the configured retries when nothing is listening", async () => {
    const dead = createMongo({ uri: "mongodb://127.0.0.1:1/none", serverSelectionTimeoutMS: 500, maxPoolSize: 1, retries: 1, autoIndex: false }, logger);
    await expect(dead.connect()).rejects.toThrow();
    expect((await dead.check()).status).toBe("down");
    await dead.disconnect();
  }, 10_000);
});
