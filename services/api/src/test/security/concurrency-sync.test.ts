import { describe, expect, it } from "vitest";
import { bearer, makeApp, register } from "../harness.js";
import { D } from "./seed.js";

/**
 * Concurrent updates and duplicate synchronization. These run on the in-memory store, so they prove what the
 * application guarantees (version checks, never-negative rules, per-mutation de-duplication); database-level
 * isolation under real parallelism is MongoDB's job (see docs/security.md, assumptions).
 */
async function farm() {
  const ctx = makeApp();
  const o = await register(ctx, "owner@example.com");
  const call = (m: "get" | "post" | "put" | "patch", p: string, body?: object, headers: Record<string, string> = {}) => {
    const r = ctx.api()[m](`/api/v1/farms/${o.farmId}${p}`).set(bearer(o.access));
    for (const [k, v] of Object.entries(headers)) r.set(k, v);
    return r.send(body ?? {});
  };
  const house = (await call("post", "/houses", { name: "H", type: "broiler" })).body;
  const flock = (await call("post", "/flocks", { name: "F", flockCode: "F", type: "broiler", houseId: house.id, placement: { date: D(-20), count: 10 } })).body;
  return { ctx, o, call, house, flock };
}

describe("concurrent updates", () => {
  it("two edits with the same version: exactly one wins, the other gets 409 (no lost update)", async () => {
    const { call, house } = await farm();
    const v = (await call("get", `/houses/${house.id}`)).body.version;
    const [a, b] = await Promise.all([call("put", `/houses/${house.id}`, { name: "North", type: "broiler", status: "active", version: v }), call("put", `/houses/${house.id}`, { name: "South", type: "broiler", status: "active", version: v })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? "North" : "South";
    expect((await call("get", `/houses/${house.id}`)).body.name).toBe(winner);
  });

  it("two saves of the same day on the same version: one wins, one gets 409", async () => {
    const { call, flock } = await farm();
    await call("patch", `/flocks/${flock.id}/daily-records/${D(0)}`, { waterLitres: 10 });
    const v = (await call("get", `/flocks/${flock.id}/daily-records/${D(0)}`)).body.version;
    const [a, b] = await Promise.all([call("patch", `/flocks/${flock.id}/daily-records/${D(0)}`, { waterLitres: 20, version: v }), call("patch", `/flocks/${flock.id}/daily-records/${D(0)}`, { waterLitres: 30, version: v })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it("many deaths recorded at once never take a flock below zero", async () => {
    const { call, flock } = await farm();
    const results = await Promise.all(Array.from({ length: 6 }, () => call("post", `/flocks/${flock.id}/mortality`, { date: D(0), count: 3, cause: "unknown" })));
    const ok = results.filter((r) => r.status < 300).length;
    const alive = (await call("get", `/flocks/${flock.id}`)).body.currentBirdCount;
    expect(alive).toBeGreaterThanOrEqual(0);
    expect(alive).toBe(10 - 3 * ok);
    expect(ok).toBeLessThanOrEqual(3);
    for (const r of results) expect(r.status).not.toBe(500);
  });

  it("feed taken by several people at once never takes stock below zero", async () => {
    const { call, flock } = await farm();
    const item = (await call("post", "/inventory/items", { name: "Starter", category: "feed", unit: "kg", feed: { stage: "starter" } })).body;
    await call("post", `/inventory/items/${item.id}/purchases`, { date: D(-5), quantity: 100, unitCost: { amountMinor: 3000, currency: "INR" } });
    const results = await Promise.all(Array.from({ length: 5 }, () => call("post", "/feed/consumption", { date: D(0), flockId: flock.id, feedItemId: item.id, quantityKg: 30 })));
    const ok = results.filter((r) => r.status < 300).length;
    const left = (await call("get", "/feed/stock")).body.items.find((i: { itemId: string }) => i.itemId === item.id).quantityKg;
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left).toBeCloseTo(100 - 30 * ok, 6);
  });

  it("the same Idempotency-Key sent twice at once creates one record", async () => {
    const { ctx, call, o } = await farm();
    const send = () => call("post", "/houses", { name: "Same", type: "layer" }, { "Idempotency-Key": "house-create-0001" });
    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status].some((s) => s === 201)).toBe(true);
    for (const r of [a, b]) expect(r.status).not.toBe(500);
    expect(ctx.store.houses.all().filter((h) => h.farmId === o.farmId && h.name === "Same")).toHaveLength(1);
    // A different body under the same key is refused, not silently replayed.
    expect((await call("post", "/houses", { name: "Other", type: "layer" }, { "Idempotency-Key": "house-create-0001" })).status).toBe(422);
  });
});

describe("duplicate sync operations", () => {
  const at = new Date().toISOString();
  const deaths = (id: string, flockId: string, count = 1) => ({ mutationId: id, command: "flock.mortality", payload: { flockId, date: D(0), count, cause: "unknown" }, clientCreatedAt: at });

  it("the same mutation twice in one batch, in two batches, and in two pushes at once is applied once", async () => {
    const { ctx, o, call, flock } = await farm();
    const push = (mutations: object[]) => ctx.api().post("/api/v1/sync/push").set(bearer(o.access)).send({ farmId: o.farmId, deviceId: "phone", mutations });
    const m1 = deaths("01a20000-0000-7000-8000-00000000a001", flock.id);
    const sameBatch = await push([m1, m1]);
    expect(sameBatch.body.results[0]).toEqual(sameBatch.body.results[1]);
    await push([m1]);
    const m2 = deaths("01a20000-0000-7000-8000-00000000a002", flock.id);
    const parallel = await Promise.all([push([m2]), push([m2])]);
    for (const r of parallel) expect(r.status).toBe(200);
    expect((await call("get", `/flocks/${flock.id}`)).body.currentBirdCount).toBe(8); // m1 and m2 once each
  });

  it("a mutation id is per farm: another farm reusing the same id gets its own result, not this farm's", async () => {
    const { ctx, o, flock } = await farm();
    const other = await register(ctx, "other@example.com");
    const oh = (await ctx.api().post(`/api/v1/farms/${other.farmId}/houses`).set(bearer(other.access)).send({ name: "H", type: "broiler" })).body;
    const of = (await ctx.api().post(`/api/v1/farms/${other.farmId}/flocks`).set(bearer(other.access)).send({ name: "F", flockCode: "F", type: "broiler", houseId: oh.id, placement: { date: D(-5), count: 50 } })).body;
    const id = "01a20000-0000-7000-8000-00000000b001";
    const mine = await ctx.api().post("/api/v1/sync/push").set(bearer(o.access)).send({ farmId: o.farmId, deviceId: "p", mutations: [deaths(id, flock.id)] });
    const theirs = await ctx.api().post("/api/v1/sync/push").set(bearer(other.access)).send({ farmId: other.farmId, deviceId: "p", mutations: [deaths(id, of.id, 2)] });
    expect(mine.body.results[0].status).toBe("accepted");
    expect(theirs.body.results[0].status).toBe("accepted");
    expect(theirs.body.results[0].entityId).not.toBe(mine.body.results[0].entityId);
  });

  it("a member removed from the farm can no longer sync to it (their queued changes are refused, not applied)", async () => {
    const { ctx, o, flock } = await farm();
    const { joinAs } = await import("../harness.js");
    const w = await joinAs(ctx, o, "worker@example.com", "worker");
    const members = (await ctx.api().get(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access))).body.items;
    await ctx.api().delete(`/api/v1/farms/${o.farmId}/members/${members.find((m: { email: string }) => m.email === "worker@example.com").id}`).set(bearer(o.access));
    const r = await ctx.api().post("/api/v1/sync/push").set(bearer(w.access)).send({ farmId: o.farmId, deviceId: "p", mutations: [deaths("01a20000-0000-7000-8000-00000000c001", flock.id)] });
    expect(r.status).toBe(404);
  });
});
