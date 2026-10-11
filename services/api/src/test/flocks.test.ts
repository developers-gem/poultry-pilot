import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { newId } from "../lib/util.js";
import { bearer, joinAs, makeApp, register, type Ctx } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n); // D(-40) = 40 days ago
const INR = (rupees: number) => ({ amountMinor: Math.round(rupees * 100), currency: "INR" });

async function setup(opts: { capacity?: number } = {}) {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const api = (method: "get" | "post" | "put" | "delete", path: string, token = owner.access) => ctx.api()[method](`/api/v1/farms/${owner.farmId}${path}`).set(bearer(token));
  const house = (await api("post", "/houses").send({ name: "House A", type: "broiler", ...(opts.capacity ? { capacityBirds: opts.capacity } : {}) })).body;
  const house2 = (await api("post", "/houses").send({ name: "House B", type: "broiler" })).body;
  return { ctx, owner, api, house, house2 };
}

async function placedFlock(s: Awaited<ReturnType<typeof setup>>, over: Record<string, unknown> = {}) {
  const res = await s
    .api("post", "/flocks")
    .send({
      name: "Batch 14",
      flockCode: "B14",
      type: "broiler",
      breed: "Cobb",
      strain: "500",
      source: "Venky's hatchery",
      houseId: s.house.id,
      targetSaleDate: D(2),
      placement: { date: D(-40), count: 1000, deadOnArrival: 10, startingWeightG: 40, chickCost: INR(40_000) },
      ...over,
    });
  if (res.status !== 201) throw new Error(`create flock failed ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

describe("flock CRUD", () => {
  it("creates a placed flock with all its fields and the placement event", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    expect(f).toMatchObject({
      flockCode: "B14", type: "broiler", breed: "Cobb", strain: "500", source: "Venky's hatchery", houseId: s.house.id,
      status: "active", placementDate: D(-40), placementCount: 1000, startingWeightG: 40, chickCost: INR(40_000), targetSaleDate: D(2), currentBirdCount: 990,
    });
    const events = (await s.api("get", `/flocks/${f.id}/events`)).body.items;
    expect(events).toEqual([expect.objectContaining({ type: "placement", birds: 1000, deadOnArrival: 10, cost: INR(40_000), totalLiveWeightKg: 39.6 })]);
  });

  it("supports every flock type; custom needs a name", async () => {
    const s = await setup();
    for (const [i, type] of ["layer", "breeder", "chick"].entries()) {
      expect((await s.api("post", "/flocks").send({ name: type, flockCode: `T${i}`, type, houseId: s.house.id })).status).toBe(201);
    }
    expect((await s.api("post", "/flocks").send({ name: "Geese", flockCode: "G1", type: "custom", houseId: s.house.id })).status).toBe(400);
    const g = await s.api("post", "/flocks").send({ name: "Geese", flockCode: "G1", type: "custom", customTypeName: "Geese", species: "duck", houseId: s.house.id });
    expect(g.body).toMatchObject({ type: "custom", customTypeName: "Geese", status: "planned", currentBirdCount: 0 });
  });

  it("flock codes are unique per farm", async () => {
    const s = await setup();
    await placedFlock(s);
    const dup = await s.api("post", "/flocks").send({ name: "Other", flockCode: "B14", type: "broiler", houseId: s.house.id });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("DUPLICATE");
  });

  it("PUT changes descriptive fields only, with version checks", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const ok = await s.api("put", `/flocks/${f.id}`).send({ name: "Batch 14 (Cobb)", flockCode: "B14", breed: "Cobb", strain: "500", targetSaleDate: D(5), version: f.version });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ name: "Batch 14 (Cobb)", targetSaleDate: D(5), placementCount: 1000, houseId: s.house.id });
    expect((await s.api("put", `/flocks/${f.id}`).send({ name: "x", flockCode: "B14", version: f.version })).status).toBe(409);
    expect((await s.api("put", `/flocks/${f.id}`).send({ name: "x", flockCode: "B14", houseId: s.house2.id, version: ok.body.version })).status).toBe(400);
  });

  it("only a planned flock can be deleted; flocks with records are closed instead", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    expect((await s.api("delete", `/flocks/${f.id}`)).body.error.code).toBe("INVALID_STATE_TRANSITION");
    const planned = (await s.api("post", "/flocks").send({ name: "Next", flockCode: "B15", type: "broiler", houseId: s.house.id })).body;
    expect((await s.api("delete", `/flocks/${planned.id}`)).status).toBe(204);
    expect((await s.api("get", `/flocks/${planned.id}`)).status).toBe(404);
  });

  it("lists flocks with filters", async () => {
    const s = await setup();
    await placedFlock(s);
    await s.api("post", "/flocks").send({ name: "L", flockCode: "L1", type: "layer", houseId: s.house2.id });
    expect((await s.api("get", "/flocks?status=active")).body.items.map((f: { flockCode: string }) => f.flockCode)).toEqual(["B14"]);
    expect((await s.api("get", "/flocks?type=layer")).body.items).toHaveLength(1);
    expect((await s.api("get", `/flocks?houseId=${s.house2.id}`)).body.items[0].flockCode).toBe("L1");
  });
});

describe("placement", () => {
  it("places a planned flock once; respects house capacity", async () => {
    const s = await setup({ capacity: 1500 });
    const planned = (await s.api("post", "/flocks").send({ name: "P", flockCode: "P1", type: "broiler", houseId: s.house.id })).body;
    const over = await s.api("post", `/flocks/${planned.id}/placement`).send({ date: D(-5), count: 1600 });
    expect(over.body.error.code).toBe("CAPACITY_EXCEEDED");
    const ok = await s.api("post", `/flocks/${planned.id}/placement`).send({ date: D(-5), count: 1500 });
    expect(ok.body).toMatchObject({ status: "active", currentBirdCount: 1500 });
    expect((await s.api("post", `/flocks/${planned.id}/placement`).send({ date: D(-4), count: 10 })).body.error.code).toBe("INVALID_STATE_TRANSITION");
    // A second flock no longer fits in the full house.
    const second = await s.api("post", "/flocks").send({ name: "Q", flockCode: "Q1", type: "broiler", houseId: s.house.id, placement: { date: D(-1), count: 1 } });
    expect(second.body.error.code).toBe("CAPACITY_EXCEEDED");
  });

  it("refuses future dates and a cost in another currency", async () => {
    const s = await setup();
    const a = await s.api("post", "/flocks").send({ name: "F", flockCode: "F1", type: "broiler", houseId: s.house.id, placement: { date: D(1), count: 10 } });
    expect(a.status).toBe(400);
    expect(a.body.error.message).toMatch(/future/);
    const b = await s.api("post", "/flocks").send({ name: "F", flockCode: "F1", type: "broiler", houseId: s.house.id, placement: { date: D(-1), count: 10, chickCost: { amountMinor: 100, currency: "USD" } } });
    expect(b.body.error.message).toMatch(/farm currency \(INR\)/);
  });
});

describe("mortality, culls and impossible operations", () => {
  it("records deaths and culls and keeps the count", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    expect((await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-35), count: 15, cause: "heat_stress" })).status).toBe(201);
    expect((await s.api("post", `/flocks/${f.id}/culls`).send({ date: D(-30), count: 5, reason: "Leg problems" })).status).toBe(201);
    expect((await s.api("get", `/flocks/${f.id}`)).body).toMatchObject({ currentBirdCount: 970, metrics: { mortalityCount: 15, cullCount: 5 } });
  });

  it("cannot record more deaths than birds, or deaths before placement or in the future", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const tooMany = await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-35), count: 991 });
    expect(tooMany.status).toBe(422);
    expect(tooMany.body.error.code).toBe("INSUFFICIENT_BIRDS");
    expect((await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-41), count: 1 })).body.error.message).toMatch(/before the flock was placed/);
    expect((await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(1), count: 1 })).status).toBe(400);
    expect((await s.api("get", `/flocks/${f.id}`)).body.currentBirdCount).toBe(990);
  });

  it("cannot sell more birds than are available, including birds already sold on a later date", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const tooMany = await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 991, total: INR(100_000) });
    expect(tooMany.status).toBe(422);
    expect(tooMany.body.error).toMatchObject({ code: "INSUFFICIENT_BIRDS", details: { available: 990, requested: 991 } });
    await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 900, totalLiveWeightKg: 1980, pricePerKg: INR(110) });
    // 990 alive on D(-5), but 900 of them are already sold on D(-1): only 90 can go on D(-5).
    const backdated = await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-5), birds: 91, total: INR(10_000) });
    expect(backdated.body.error.details).toMatchObject({ available: 90 });
    const lateDeath = await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-20), count: 91 });
    expect(lateDeath.body.error.code).toBe("INSUFFICIENT_BIRDS");
    expect((await s.api("get", `/flocks/${f.id}`)).body.currentBirdCount).toBe(90);
  });

  it("sale price per kg × weight becomes revenue; foreign currency is refused", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const sale = await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 400, totalLiveWeightKg: 880, pricePerKg: INR(110) });
    expect(sale.body).toMatchObject({ type: "sale", birds: 400, totalLiveWeightKg: 880, total: INR(96_800) });
    const perBird = await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 10, pricePerBird: INR(250) });
    expect(perBird.body.total).toEqual(INR(2500));
    expect((await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 1, total: { amountMinor: 100, currency: "USD" } })).status).toBe(400);
    expect((await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 1, pricePerKg: INR(110) })).status).toBe(400);
  });
});

describe("transfers, splits and merges", () => {
  it("moves a whole flock to another house", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const res = await s.api("post", `/flocks/${f.id}/transfers`).send({ mode: "house", date: D(-20), toHouseId: s.house2.id });
    expect(res.body.flock).toMatchObject({ houseId: s.house2.id, currentBirdCount: 990 });
    expect((await s.api("post", `/flocks/${f.id}/transfers`).send({ mode: "house", date: D(-19), toHouseId: s.house2.id })).status).toBe(400);
  });

  it("moves birds into another flock with their share of chick cost", async () => {
    const s = await setup();
    const a = await placedFlock(s);
    const b = await placedFlock(s, { flockCode: "B15", name: "Batch 15", houseId: s.house2.id, placement: { date: D(-40), count: 500, chickCost: INR(20_000) } });
    const res = await s.api("post", `/flocks/${a.id}/transfers`).send({ mode: "flock", date: D(-20), toFlockId: b.id, birds: 99 });
    expect(res.status).toBe(201);
    expect(res.body.flock.currentBirdCount).toBe(891);
    expect(res.body.destination.currentBirdCount).toBe(599);
    const out = (await s.api("get", `/flocks/${a.id}/events`)).body.items.find((e: { type: string }) => e.type === "transfer_out");
    // ₹40,000 / 990 birds × 99 = ₹4,000
    expect(out).toMatchObject({ birds: 99, cost: INR(4000), counterpartFlockId: b.id });
    const ma = (await s.api("get", `/flocks/${a.id}/metrics`)).body;
    const mb = (await s.api("get", `/flocks/${b.id}/metrics`)).body;
    expect(ma.cost.totalMinor).toBe(3_600_000);
    expect(mb.cost.totalMinor).toBe(2_400_000);
    expect((await s.api("post", `/flocks/${a.id}/transfers`).send({ mode: "flock", date: D(-19), toFlockId: b.id, birds: 892 })).body.error.code).toBe("INSUFFICIENT_BIRDS");
  });

  it("splits birds into a new flock that inherits the bird details", async () => {
    const s = await setup();
    const a = await placedFlock(s);
    const res = await s.api("post", `/flocks/${a.id}/splits`).send({ date: D(-20), birds: 300, newFlock: { name: "Batch 14B", flockCode: "B14B", houseId: s.house2.id } });
    expect(res.status).toBe(201);
    expect(res.body.newFlock).toMatchObject({ flockCode: "B14B", type: "broiler", breed: "Cobb", strain: "500", status: "active", currentBirdCount: 300, splitFromFlockId: a.id, placementDate: D(-20) });
    expect(res.body.flock.currentBirdCount).toBe(690);
    const child = (await s.api("get", `/flocks/${res.body.newFlock.id}`)).body.metrics;
    // The birds were placed 40 days ago: the new flock keeps their real age, not the split date.
    expect(child).toMatchObject({ birdsIn: 300, transferredIn: 300, ageDays: 40 });
  });

  it("a failed split changes nothing (duplicate code)", async () => {
    const s = await setup();
    const a = await placedFlock(s);
    const res = await s.api("post", `/flocks/${a.id}/splits`).send({ date: D(-20), birds: 300, newFlock: { name: "Dup", flockCode: "B14", houseId: s.house2.id } });
    expect(res.status).toBe(409);
    expect((await s.api("get", `/flocks/${a.id}`)).body.currentBirdCount).toBe(990);
    expect((await s.api("get", `/flocks/${a.id}/events`)).body.items).toHaveLength(1);
    expect((await s.api("get", "/flocks")).body.items).toHaveLength(1);
  });

  it("merges every bird into a flock of the same type and closes the source", async () => {
    const s = await setup();
    const a = await placedFlock(s);
    const b = await placedFlock(s, { flockCode: "B15", houseId: s.house2.id, placement: { date: D(-40), count: 500 } });
    const layer = (await s.api("post", "/flocks").send({ name: "L", flockCode: "L1", type: "layer", houseId: s.house2.id, placement: { date: D(-40), count: 10 } })).body;
    expect((await s.api("post", `/flocks/${a.id}/merge`).send({ date: D(-10), intoFlockId: layer.id })).status).toBe(400);
    const res = await s.api("post", `/flocks/${a.id}/merge`).send({ date: D(-10), intoFlockId: b.id });
    expect(res.status).toBe(201);
    expect(res.body.flock).toMatchObject({ status: "closed", closedDate: D(-10), currentBirdCount: 0 });
    expect(res.body.target.currentBirdCount).toBe(1490);
    expect((await s.api("post", `/flocks/${a.id}/mortality`).send({ date: D(-5), count: 1 })).body.error.code).toBe("INVALID_STATE_TRANSITION");
  });
});

describe("adjustments, weighing, reversal and closure", () => {
  it("adjustments need a reason and a supervisor-level role", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    expect((await s.api("post", `/flocks/${f.id}/adjustments`, worker.access).send({ date: D(-1), delta: -2, reason: "Recount" })).status).toBe(403);
    expect((await s.api("post", `/flocks/${f.id}/adjustments`).send({ date: D(-1), delta: -2 })).status).toBe(400);
    expect((await s.api("post", `/flocks/${f.id}/adjustments`).send({ date: D(-1), delta: -2, reason: "Recount found 2 fewer" })).status).toBe(201);
    expect((await s.api("get", `/flocks/${f.id}`)).body.currentBirdCount).toBe(988);
  });

  it("weighing individual birds stores the session and sets the average weight", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const w = await s.api("post", `/flocks/${f.id}/weighings`).send({ date: D(-5), weightsG: [1800, 1900, 2000, 2100, 2200] });
    expect(w.body).toMatchObject({ type: "weighing", averageWeightG: 2000, sampleSize: 5 });
    expect(s.ctx.store.birdWeights.all()[0]).toMatchObject({ stats: { uniformityPercent: 100 } });
    expect((await s.api("get", `/flocks/${f.id}/metrics`)).body).toMatchObject({ averageWeightG: 2000, liveWeightKg: 1980 });
    expect((await s.api("post", `/flocks/${f.id}/weighings`).send({ date: D(-4), weightsG: [1], averageWeightG: 2 })).status).toBe(400);
  });

  it("reverses a wrong entry once; daily-record and paired entries cannot be reversed here", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const wrong = (await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-3), count: 100 })).body;
    const rev = await s.api("post", `/flocks/${f.id}/events/${wrong.id}/reverse`).send({ reason: "Typed 100 instead of 10" });
    expect(rev.status).toBe(201);
    expect((await s.api("get", `/flocks/${f.id}`)).body.currentBirdCount).toBe(990);
    expect((await s.api("post", `/flocks/${f.id}/events/${wrong.id}/reverse`).send({ reason: "again" })).body.error.message).toMatch(/already been reversed/);
    const events = (await s.api("get", `/flocks/${f.id}/events`)).body.items;
    expect(events.find((e: { id: string }) => e.id === wrong.id).reversed).toBe(true);

    const b = await placedFlock(s, { flockCode: "B15", houseId: s.house2.id });
    await s.api("post", `/flocks/${f.id}/transfers`).send({ mode: "flock", date: D(-2), toFlockId: b.id, birds: 10 });
    const out = (await s.api("get", `/flocks/${f.id}/events`)).body.items.find((e: { type: string }) => e.type === "transfer_out");
    expect((await s.api("post", `/flocks/${f.id}/events/${out.id}/reverse`).send({ reason: "wrong" })).body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("closes only when every bird is accounted for", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    expect((await s.api("post", `/flocks/${f.id}/close`).send({ date: D(0) })).body.error.message).toMatch(/990 birds are still recorded as alive/);
    await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 990, totalLiveWeightKg: 2178, pricePerKg: INR(110) });
    const closed = await s.api("post", `/flocks/${f.id}/close`).send({ date: D(0), notes: "Cleared" });
    expect(closed.status).toBe(200);
    expect(closed.body).toMatchObject({ status: "closed", closedDate: D(0), currentBirdCount: 0, metrics: { revenueMinor: 23_958_000 } });
    expect((await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(0), birds: 1, total: INR(1) })).body.error.code).toBe("INVALID_STATE_TRANSITION");
  });
});

describe("daily records", () => {
  it("one PUT records deaths by cause, culls, feed, water and conditions; the day view also shows separate entries", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-3), count: 2, cause: "predator" });
    const put = await s.api("put", `/flocks/${f.id}/daily-records/${D(-3)}`).send({
      mortality: [{ cause: "unknown", count: 4 }, { cause: "heat_stress", count: 1 }],
      culls: 3,
      feed: [{ quantityKg: 120, unitCostPerKg: INR(32) }],
      waterLitres: 240,
      temperatureMinC: 26,
      temperatureMaxC: 34,
      notes: "Hot afternoon",
    });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({ mortalityTotal: 7, culls: 3, feedKg: 120, waterLitres: 240, temperatureMaxC: 34, birdsAliveEndOfDay: 980, version: 0 });
    expect(put.body.mortality).toEqual(expect.arrayContaining([expect.objectContaining({ cause: "predator", count: 2, fromDailyRecord: false })]));
    expect(put.body.feed[0].cost).toEqual(INR(3840));
  });

  it("editing reverses the record's old deaths and posts the new ones; unchanged figures post nothing", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const first = (await s.api("put", `/flocks/${f.id}/daily-records/${D(-2)}`).send({ mortality: [{ cause: "unknown", count: 5 }] })).body;
    const countEvents = async () => (await s.api("get", `/flocks/${f.id}/events`)).body.items.length;
    const before = await countEvents();
    const same = (await s.api("put", `/flocks/${f.id}/daily-records/${D(-2)}`).send({ mortality: [{ cause: "unknown", count: 5 }], notes: "checked", version: first.version })).body;
    expect(await countEvents()).toBe(before);
    const changed = await s.api("put", `/flocks/${f.id}/daily-records/${D(-2)}`).send({ mortality: [{ cause: "unknown", count: 3 }], version: same.version });
    expect(changed.body).toMatchObject({ mortalityTotal: 3, birdsAliveEndOfDay: 987 });
    expect(await countEvents()).toBe(before + 2); // one reversal + one new
    expect((await s.api("put", `/flocks/${f.id}/daily-records/${D(-2)}`).send({ mortality: [] })).status).toBe(409);
    const ev = (await s.api("get", `/flocks/${f.id}/events`)).body.items.find((e: { dailyRecordId?: string; reversed: boolean; birds?: number }) => e.dailyRecordId && !e.reversed && e.birds === 3);
    expect((await s.api("post", `/flocks/${f.id}/events/${ev.id}/reverse`).send({ reason: "x x x" })).body.error.message).toMatch(/edit the daily record/);
  });

  it("workers record within the edit window and edit only their own records; supervisors can do more", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    const sup = await joinAs(s.ctx, s.owner, "s@example.com", "supervisor");
    const path = (d: string) => `/flocks/${f.id}/daily-records/${d}`;
    expect((await s.api("put", path(D(-1)), worker.access).send({ mortality: [{ cause: "unknown", count: 1 }] })).status).toBe(200);
    expect((await s.api("put", path(D(-5)), worker.access).send({ mortality: [] })).status).toBe(403);
    const mine = (await s.api("put", path(D(0)), sup.access).send({ culls: 1 })).body;
    expect((await s.api("put", path(D(0)), worker.access).send({ culls: 2, version: mine.version })).body.error.message).toMatch(/only edit daily records you created/);
    expect((await s.api("put", path(D(-5)), sup.access).send({ culls: 1 })).status).toBe(200);
    expect((await s.api("post", `/flocks/${f.id}/sales`, worker.access).send({ date: D(0), birds: 1, total: INR(1) })).status).toBe(403);
  });

  it("lists days in a range, newest first", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    for (const n of [-3, -2, -1]) await s.api("put", `/flocks/${f.id}/daily-records/${D(n)}`).send({ feed: [{ quantityKg: 100 }] });
    await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-10), count: 1 });
    const list = (await s.api("get", `/flocks/${f.id}/daily-records?from=${D(-3)}&to=${D(-2)}`)).body.items;
    expect(list.map((d: { date: string }) => d.date)).toEqual([D(-2), D(-3)]);
    // The list holds daily records; a day with only a separate death entry is not a record (its view is per date).
    expect((await s.api("get", `/flocks/${f.id}/daily-records`)).body.items).toHaveLength(3);
    expect((await s.api("get", `/flocks/${f.id}/daily-records/${D(-10)}`)).body).toMatchObject({ id: null, mortalityTotal: 1 });
  });
});

describe("server-side calculations end to end", () => {
  it("matches the hand-computed broiler scenario", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const id = f.id;
    await s.api("post", `/flocks/${id}/mortality`).send({ date: D(-36), count: 15 });
    await s.api("put", `/flocks/${id}/daily-records/${D(-30)}`).send({ feed: [{ quantityKg: 500, unitCostPerKg: INR(30) }] });
    await s.api("post", `/flocks/${id}/weighings`).send({ date: D(-26), averageWeightG: 500, sampleSize: 50 });
    await s.api("post", `/flocks/${id}/mortality`).send({ date: D(-21), count: 10 });
    await s.api("put", `/flocks/${id}/daily-records/${D(-15)}`).send({ culls: 5, feed: [{ quantityKg: 1500, unitCostPerKg: INR(32) }] });
    await s.api("post", `/flocks/${id}/weighings`).send({ date: D(-12), averageWeightG: 1500, sampleSize: 50 });
    await s.api("put", `/flocks/${id}/daily-records/${D(-6)}`).send({ feed: [{ quantityKg: 1400 }] });
    await s.api("post", `/flocks/${id}/weighings`).send({ date: D(-5), averageWeightG: 2000, sampleSize: 50 });
    await s.api("post", `/flocks/${id}/sales`).send({ date: D(-3), birds: 400, totalLiveWeightKg: 880, pricePerKg: INR(110) });

    const m = (await s.api("get", `/flocks/${id}/metrics?asOf=${D(-1)}&referencePricePerKgMinor=10500`)).body;
    expect(m).toMatchObject({
      currentBirdCount: 560, mortalityCount: 25, cullCount: 5, averageWeightG: 2000, liveWeightKg: 1120,
      feedConsumedKg: 3400, uncostedFeedKg: 1400, revenueMinor: 9_680_000, profitMinor: -620_000, costPerBirdMinor: 10_404,
      liveInventoryValueMinor: 11_760_000, projectedProfitMinor: 11_140_000, currency: "INR", costsComplete: false, stage: "finishing",
    });
    expect(m.mortalityRate).toBeCloseTo(2.525252, 5);
    expect(m.survivalRate).toBeCloseTo(96.969697, 5);
    expect(m.dailyWeightGainG).toBeCloseTo(56, 6);
    expect(m.fcr).toBeCloseTo(3400 / 2000, 6); // liveweight FCR: 1120 kg live + 880 kg sold
    expect(m.feedPerKgGainKg).toBeCloseTo(3400 / 1960.4, 6); // net of the 39.6 kg the chicks arrived with
    expect(m.feedCostPerBirdMinor).toBe(6364); // ₹63,000 of costed feed / 990 birds
    expect(m.marginPercent).toBeCloseTo(-6.404959, 5);
    expect(m.cost.totalMinor).toBe(10_300_000);
  });
});

describe("concurrency", () => {
  it("if the flock changes during a command, the command fails with 409 and writes nothing", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    // Simulate another request saving the flock between this command's read and its write.
    const original = s.ctx.repos.flocks.findById;
    s.ctx.repos.flocks.findById = async (farmId, id, tx) => {
      const rec = await original(farmId, id, tx);
      return rec ? { ...rec, version: rec.version - 1 } : rec;
    };
    const res = await s.api("post", `/flocks/${f.id}/sales`).send({ date: D(-1), birds: 500, total: INR(50_000) });
    s.ctx.repos.flocks.findById = original;
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("VERSION_CONFLICT");
    expect((await s.api("get", `/flocks/${f.id}/events`)).body.items).toHaveLength(1);
    expect((await s.api("get", `/flocks/${f.id}`)).body.currentBirdCount).toBe(990);
  });
});

describe("tenancy and audit", () => {
  it("another farm's flock is not found, and nothing changes", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const other = await register(s.ctx, "other@example.com");
    const theirs = (p: string) => s.ctx.api().post(`/api/v1/farms/${other.farmId}${p}`).set(bearer(other.access));
    expect((await s.ctx.api().get(`/api/v1/farms/${other.farmId}/flocks/${f.id}`).set(bearer(other.access))).status).toBe(404);
    expect((await theirs(`/flocks/${f.id}/sales`).send({ date: D(-1), birds: 1, total: INR(1) })).status).toBe(404);
    expect((await s.ctx.api().get(`/api/v1/farms/${s.owner.farmId}/flocks/${f.id}`).set(bearer(other.access))).status).toBe(404);
    const otherHouse = (await theirs("/houses").send({ name: "Theirs", type: "broiler" })).body;
    expect((await s.api("post", "/flocks").send({ name: "X", flockCode: "X1", type: "broiler", houseId: otherHouse.id })).status).toBe(404);
    expect((await s.api("post", `/flocks/${f.id}/transfers`).send({ mode: "house", date: D(-1), toHouseId: otherHouse.id })).status).toBe(404);
    expect((await s.api("get", `/flocks/${f.id}`)).body.currentBirdCount).toBe(990);
  });

  it("every lifecycle event is audited and queued for offline sync", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    await s.api("post", `/flocks/${f.id}/mortality`).send({ date: D(-3), count: 2 });
    const actions = s.ctx.store.audit.all().map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["flock.created", "flock.placement", "flock.placed", "flock.mortality", "flock.mortality_recorded"]));
    const entities = s.ctx.store.syncChanges.all().map((c) => c.entity);
    expect(entities.filter((e) => e === "flock_event")).toHaveLength(2);
  });

  it("offline: a daily record pushed through sync is applied exactly once", async () => {
    const s = await setup();
    const f = await placedFlock(s);
    const mutationId = newId();
    const push = () =>
      s.ctx
        .api()
        .post("/api/v1/sync/push")
        .set(bearer(s.owner.access))
        .send({ farmId: s.owner.farmId, deviceId: "phone", mutations: [{ mutationId, command: "daily_record.put", payload: { flockId: f.id, date: D(-1), record: { mortality: [{ cause: "unknown", count: 3 }] } }, clientCreatedAt: new Date().toISOString() }] });
    expect((await push()).body.results[0]).toMatchObject({ status: "accepted", version: 0 });
    expect((await push()).body.results[0]).toMatchObject({ status: "accepted" });
    expect((await s.api("get", `/flocks/${f.id}`)).body.currentBirdCount).toBe(987);
  });
});
