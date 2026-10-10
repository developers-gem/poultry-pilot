import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { newId } from "../lib/util.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (rupees: number) => ({ amountMinor: Math.round(rupees * 100), currency: "INR" });
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);

async function setup() {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const farm = (path: string) => `/api/v1/farms/${owner.farmId}${path}`;
  const call = (method: "get" | "post" | "put" | "delete", path: string, token = owner.access) => ctx.api()[method](path.startsWith("/api") ? path : farm(path)).set(bearer(token));
  const houseA = (await call("post", "/houses").send({ name: "Layer house", type: "layer" })).body;
  const houseB = (await call("post", "/houses").send({ name: "Broiler house", type: "broiler" })).body;
  const layer = (await call("post", "/flocks").send({ name: "Layers 1", flockCode: "L1", type: "layer", houseId: houseA.id, placement: { date: D(-200), count: 1000, startingWeightG: 1400 } })).body;
  const broiler = (await call("post", "/flocks").send({ name: "Broilers 7", flockCode: "B7", type: "broiler", houseId: houseB.id, placement: { date: D(-20), count: 2000, startingWeightG: 40 } })).body;
  const photo = (await ctx.api().post(farm("/media")).set(bearer(owner.access)).set("Content-Type", "image/png").send(PNG)).body;
  return { ctx, owner, call, farm, houseA, houseB, layer, broiler, photo };
}

type S = Awaited<ReturnType<typeof setup>>;

const fullDay = (s: S, over: Record<string, unknown> = {}) => ({
  flockId: s.layer.id,
  date: D(-1),
  observedBirdCount: 990,
  mortality: [{ cause: "unknown", count: 3 }, { cause: "predator", count: 1 }],
  culls: 2,
  feed: [{ quantityKg: 115, unitCostPerKg: INR(28) }],
  waterLitres: 230,
  temperatureMinC: 22,
  temperatureMaxC: 31,
  humidityPercent: 65,
  eggs: { collected: 880, broken: 12, byGrade: { large: 500, medium: 300, cracked: 20 }, averageEggWeightG: 58.5, qualityNotes: "Thin shells in row 3" },
  averageWeight: { averageWeightG: 1620, sampleSize: 30 },
  healthObservations: [{ signs: "Two birds with watery droppings", affectedBirds: 2 }],
  notes: "Fan 2 noisy",
  photos: [{ assetId: s.photo.id, caption: "Droppings" }],
  ...over,
});

describe("create: one record, every section in its source collection", () => {
  it("records birds, mortality, culls, feed, water, conditions, eggs, quality, weight, observations, notes and photos", async () => {
    const s = await setup();
    const res = await s.call("post", "/daily-records").send(fullDay(s));
    expect(res.status).toBe(201);
    const v = res.body;
    expect(v).toMatchObject({
      flockId: s.layer.id, flockCode: "L1", houseId: s.houseA.id, flockType: "layer", date: D(-1),
      observedBirdCount: 990, birdsAliveEndOfDay: 994, countDifference: -4,
      mortalityTotal: 4, culls: 2, feedKg: 115, waterLitres: 230, temperatureMinC: 22, temperatureMaxC: 31, humidityPercent: 65,
      eggs: { collected: 880, broken: 12, byGrade: { large: 500, medium: 300, cracked: 20 }, averageEggWeightG: 58.5, qualityNotes: "Thin shells in row 3" },
      averageWeight: { averageWeightG: 1620, sampleSize: 30 },
      healthObservations: [expect.objectContaining({ signs: "Two birds with watery droppings", affectedBirds: 2 })],
      notes: "Fan 2 noisy", version: 0,
    });
    expect(v.eggs.henDayPercent).toBeCloseTo(88, 6); // 880 eggs / 1000 hens at the start of the day
    expect(v.photos).toEqual([{ assetId: s.photo.id, caption: "Droppings", url: `/api/v1/farms/${s.owner.farmId}/media/${s.photo.id}` }]);
    expect(v.feed[0].cost).toEqual(INR(3220));

    const st = s.ctx.store;
    expect(st.flockEvents.all().filter((e) => e.dailyRecordId === v.id).map((e) => e.type).sort()).toEqual(["cull", "mortality", "mortality", "weighing"]);
    expect(st.feedConsumption.all()).toHaveLength(1);
    expect(st.waterRecords.all()[0]).toMatchObject({ litres: 230, dailyRecordId: v.id });
    expect(st.eggRecords.all()[0]).toMatchObject({ collected: 880, broken: 12, dailyRecordId: v.id });
    expect(st.healthRecords.all()[0]).toMatchObject({ type: "observation", observedSigns: "Two birds with watery droppings" });
    // Egg stock: graded eggs by grade + 48 ungraded (880 − 12 broken − 820 graded); broken eggs never enter stock.
    const stock = st.eggInventory.all().reduce((t, m) => t + m.quantityDelta, 0);
    expect(stock).toBe(868);
    expect(st.eggInventory.all().map((m) => `${m.grade ?? "ungraded"}:${m.quantityDelta}`).sort()).toEqual(["cracked:20", "large:500", "medium:300", "ungraded:48"]);
    expect(st.dailyRecords.get(v.id)!.summary).toEqual({ mortality: 4, culls: 2, feedKg: 115, waterLitres: 230, eggsCollected: 880, eggsBroken: 12, averageWeightG: 1620, observations: 1, photos: 1 });
  });

  it("returns only id, version and summary with Prefer: return=minimal", async () => {
    const s = await setup();
    const res = await s.call("post", "/daily-records").set("Prefer", "return=minimal").send({ flockId: s.broiler.id, date: D(0), mortality: [{ cause: "unknown", count: 5 }], feed: [{ quantityKg: 180 }] });
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(["id", "summary", "version"]);
    expect(res.body.summary).toMatchObject({ mortality: 5, feedKg: 180, eggsCollected: null });
  });

  it("refuses impossible or inconsistent input", async () => {
    const s = await setup();
    await s.call("post", "/daily-records").send(fullDay(s));
    const dup = await s.call("post", "/daily-records").send(fullDay(s));
    expect(dup.status).toBe(409);
    expect(dup.body.error.details).toMatchObject({ existingId: expect.any(String), version: 0 });
    expect((await s.call("post", "/daily-records").send({ flockId: s.broiler.id, date: D(0), eggs: { collected: 10 } })).body.error.message).toMatch(/broiler flock/);
    expect((await s.call("post", "/daily-records").send(fullDay(s, { date: D(-2), eggs: { collected: 10, broken: 11 } }))).status).toBe(400);
    expect((await s.call("post", "/daily-records").send(fullDay(s, { date: D(-2), eggs: { collected: 10, broken: 2, byGrade: { large: 9 } } }))).status).toBe(400);
    expect((await s.call("post", "/daily-records").send(fullDay(s, { date: D(-2), mortality: [{ cause: "unknown", count: 5000 }] }))).body.error.code).toBe("INSUFFICIENT_BIRDS");
    expect((await s.call("post", "/daily-records").send(fullDay(s, { date: D(1) }))).status).toBe(400);
    expect((await s.call("post", "/daily-records").send(fullDay(s, { date: D(-2), temperatureMinC: 35, temperatureMaxC: 20 }))).status).toBe(400);
    expect((await s.call("post", "/daily-records").send(fullDay(s, { date: D(-2), photos: [{ assetId: newId() }] }))).body.error.message).toMatch(/Photo .* not found/);
    // Nothing from the refused requests was written.
    expect(s.ctx.store.dailyRecords.all()).toHaveLength(1);
  });
});

describe("update and delete through /daily-records/:id", () => {
  it("replaces sections, rewriting only what changed, with version checks", async () => {
    const s = await setup();
    const v0 = (await s.call("post", "/daily-records").send(fullDay(s))).body;
    const eventsBefore = s.ctx.store.flockEvents.all().length;
    const postingsBefore = s.ctx.store.eggInventory.all().length;
    // Same deaths, culls and weight; eggs changed.
    const v1 = await s.call("put", `/api/v1/daily-records/${v0.id}`).send({ ...fullDay(s), flockId: undefined, date: undefined, eggs: { collected: 900, broken: 10 }, version: 0 });
    expect(v1.status).toBe(200);
    expect(v1.body).toMatchObject({ version: 1, eggs: { collected: 900, broken: 10 } });
    expect(s.ctx.store.flockEvents.all().length).toBe(eventsBefore);
    // Old postings reversed (4) and new ungraded posting (1).
    expect(s.ctx.store.eggInventory.all().length).toBe(postingsBefore + 5);
    expect(s.ctx.store.eggInventory.all().reduce((t, m) => t + m.quantityDelta, 0)).toBe(890);

    const v2 = await s.call("put", `/api/v1/daily-records/${v0.id}`).send({ mortality: [{ cause: "unknown", count: 1 }], version: 1 });
    expect(v2.body).toMatchObject({ mortalityTotal: 1, culls: 0, birdsAliveEndOfDay: 999, healthObservations: [], photos: [] });
    expect(v2.body.eggs).toBeUndefined();
    expect(s.ctx.store.eggInventory.all().reduce((t, m) => t + m.quantityDelta, 0)).toBe(0);
    expect((await s.call("put", `/api/v1/daily-records/${v0.id}`).send({ version: 1 })).status).toBe(409);
  });

  it("delete undoes everything the record wrote", async () => {
    const s = await setup();
    const v = (await s.call("post", "/daily-records").send(fullDay(s))).body;
    expect((await s.call("delete", `/api/v1/daily-records/${v.id}`)).status).toBe(204);
    expect((await s.call("get", `/api/v1/daily-records/${v.id}`)).status).toBe(404);
    expect((await s.call("get", `/flocks/${s.layer.id}`)).body.currentBirdCount).toBe(1000);
    const st = s.ctx.store;
    expect(st.eggInventory.all().reduce((t, m) => t + m.quantityDelta, 0)).toBe(0);
    for (const t of [st.feedConsumption, st.waterRecords, st.eggRecords, st.healthRecords]) expect(t.all().every((r) => (r as { deletedAt?: Date }).deletedAt)).toBe(true);
    // The day can be recorded again.
    expect((await s.call("post", "/daily-records").send(fullDay(s))).status).toBe(201);
  });

  it("a record on another farm is not found for GET, PUT or DELETE", async () => {
    const s = await setup();
    const v = (await s.call("post", "/daily-records").send(fullDay(s))).body;
    const other = await register(s.ctx, "other@example.com");
    for (const req of [
      s.call("get", `/api/v1/daily-records/${v.id}`, other.access),
      s.call("put", `/api/v1/daily-records/${v.id}`, other.access).send({ version: 0 }),
      s.call("delete", `/api/v1/daily-records/${v.id}`, other.access),
    ]) {
      const res = await req;
      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe("Daily record not found");
    }
    expect((await s.call("get", `/api/v1/daily-records/${newId()}`, other.access)).body.error.message).toBe("Daily record not found");
    expect(s.ctx.store.dailyRecords.get(v.id)!.version).toBe(0);
  });
});

describe("permissions", () => {
  it("workers write within the edit window and only their own records; managers can delete any", async () => {
    const s = await setup();
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    const vet = await joinAs(s.ctx, s.owner, "vet@example.com", "vet");
    const mine = (await s.call("post", "/daily-records", worker.access).send({ flockId: s.broiler.id, date: D(0), feed: [{ quantityKg: 100 }] })).body;
    expect(mine.version).toBe(0);
    expect((await s.call("post", "/daily-records", worker.access).send({ flockId: s.broiler.id, date: D(-5) })).status).toBe(403);
    const ownersRecord = (await s.call("post", "/daily-records").send({ flockId: s.layer.id, date: D(0) })).body;
    expect((await s.call("put", `/api/v1/daily-records/${ownersRecord.id}`, worker.access).send({ version: 0 })).status).toBe(403);
    expect((await s.call("delete", `/api/v1/daily-records/${ownersRecord.id}`, worker.access)).status).toBe(403);
    expect((await s.call("delete", `/api/v1/daily-records/${mine.id}`, worker.access)).status).toBe(204);
    expect((await s.call("get", `/api/v1/daily-records/${ownersRecord.id}`, vet.access)).status).toBe(200);
    expect((await s.call("post", "/daily-records", vet.access).send({ flockId: s.layer.id, date: D(-1) })).status).toBe(403);
    expect((await s.call("delete", `/api/v1/daily-records/${ownersRecord.id}`)).status).toBe(204);
  });
});

describe("list with filters and pagination", () => {
  it("filters by date, range, house, flock and type; pages newest first", async () => {
    const s = await setup();
    for (const n of [-4, -3, -2, -1]) {
      await s.call("post", "/daily-records").send({ flockId: s.layer.id, date: D(n), eggs: { collected: 800 + n } });
      await s.call("post", "/daily-records").send({ flockId: s.broiler.id, date: D(n), feed: [{ quantityKg: 150 }] });
    }
    const all = (await s.call("get", "/daily-records")).body;
    expect(all.items).toHaveLength(8);
    expect(all.items[0]).toMatchObject({ date: D(-1), summary: expect.any(Object) });
    expect(Object.keys(all.items[0]).sort()).toEqual(["createdBy", "date", "flockCode", "flockId", "flockType", "houseId", "id", "summary", "updatedAt", "version"]);
    expect((await s.call("get", `/daily-records?date=${D(-2)}`)).body.items).toHaveLength(2);
    expect((await s.call("get", `/daily-records?from=${D(-3)}&to=${D(-2)}`)).body.items).toHaveLength(4);
    expect((await s.call("get", `/daily-records?houseId=${s.houseB.id}`)).body.items.every((i: { flockCode: string }) => i.flockCode === "B7")).toBe(true);
    expect((await s.call("get", `/daily-records?flockId=${s.layer.id}`)).body.items).toHaveLength(4);
    expect((await s.call("get", "/daily-records?type=layer")).body.items.map((i: { summary: { eggsCollected: number } }) => i.summary.eggsCollected)).toEqual([799, 798, 797, 796]);

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: { items: { id: string }[]; nextCursor: string | null } = (await s.call("get", `/daily-records?limit=3${cursor ? `&cursor=${cursor}` : ""}`)).body;
      seen.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(8);
    expect(new Set(seen).size).toBe(8);
    expect(seen).toEqual(all.items.map((i: { id: string }) => i.id));
    expect((await s.call("get", "/daily-records?cursor=garbage")).status).toBe(400);
  });
});

describe("entry sheet for fast mobile entry", () => {
  it("returns every active flock with expected birds, today's record and yesterday's figures in one call", async () => {
    const s = await setup();
    await s.call("post", "/daily-records").send({ flockId: s.layer.id, date: D(-1), mortality: [{ cause: "unknown", count: 2 }], eggs: { collected: 850 } });
    await s.call("post", "/daily-records").send({ flockId: s.layer.id, date: D(0), feed: [{ quantityKg: 110 }] });
    const sheet = (await s.call("get", "/daily-records/sheet")).body;
    expect(sheet).toMatchObject({ date: TODAY, today: TODAY, editWindowStart: D(-1) });
    expect(sheet.flocks.map((f: { flockCode: string }) => f.flockCode)).toEqual(["B7", "L1"]); // by house name
    const l1 = sheet.flocks.find((f: { flockCode: string }) => f.flockCode === "L1");
    expect(l1).toMatchObject({ expectedBirds: 998, laying: true, record: { version: 0, summary: { feedKg: 110 } }, previous: { mortality: 2, eggsCollected: 850 } });
    expect(sheet.flocks.find((f: { flockCode: string }) => f.flockCode === "B7")).toMatchObject({ expectedBirds: 2000, laying: false, record: null, previous: null });
    const past = (await s.call("get", `/daily-records/sheet?date=${D(-1)}`)).body;
    expect(past.flocks.find((f: { flockCode: string }) => f.flockCode === "L1").expectedBirds).toBe(998);
  });
});

describe("dashboards aggregate on the server", () => {
  it("day view: per flock and totals, including separate death entries and reversed ones", async () => {
    const s = await setup();
    await s.call("post", "/daily-records").send(fullDay(s));
    await s.call("post", "/daily-records").send({ flockId: s.broiler.id, date: D(-1), mortality: [{ cause: "heat_stress", count: 10 }], feed: [{ quantityKg: 200 }], waterLitres: 400 });
    await s.call("post", `/flocks/${s.broiler.id}/mortality`).send({ date: D(-1), count: 5 });
    const wrong = (await s.call("post", `/flocks/${s.broiler.id}/mortality`).send({ date: D(-1), count: 50 })).body;
    await s.call("post", `/flocks/${s.broiler.id}/events/${wrong.id}/reverse`).send({ reason: "Typo" });

    const day = (await s.call("get", `/dashboard/day?date=${D(-1)}`)).body;
    expect(day).toMatchObject({ date: D(-1), flocksTotal: 2, flocksRecorded: 2 });
    const b7 = day.flocks.find((f: { flockCode: string }) => f.flockCode === "B7");
    expect(b7).toMatchObject({ birdsAlive: 1985, mortality: 15, feedKg: 200, waterLitres: 400, henDayPercent: null, waterToFeedRatio: 2 });
    expect(b7.mortalityRatePercent).toBeCloseTo(0.75, 6);
    const l1 = day.flocks.find((f: { flockCode: string }) => f.flockCode === "L1");
    expect(l1).toMatchObject({ birdsAlive: 994, mortality: 4, culls: 2, eggsCollected: 880, eggsBroken: 12, latestAverageWeightG: 1620 });
    expect(l1.henDayPercent).toBeCloseTo(88, 6);
    expect(day.totals).toMatchObject({ birdsAlive: 2979, mortality: 19, culls: 2, feedKg: 315, waterLitres: 630, eggsCollected: 880 });
    expect(day.totals.henDayPercent).toBeCloseTo(88, 6);

    const layersOnly = (await s.call("get", `/dashboard/day?date=${D(-1)}&type=layer`)).body;
    expect(layersOnly.flocks.map((f: { flockCode: string }) => f.flockCode)).toEqual(["L1"]);
    const today = (await s.call("get", "/dashboard/day")).body;
    expect(today).toMatchObject({ date: TODAY, flocksRecorded: 0, flocksTotal: 2 });
  });

  it("trends: one row per day with zeros where nothing was recorded, filterable", async () => {
    const s = await setup();
    await s.call("post", "/daily-records").send({ flockId: s.layer.id, date: D(-3), eggs: { collected: 870, broken: 5 }, feed: [{ quantityKg: 110 }] });
    await s.call("post", "/daily-records").send({ flockId: s.broiler.id, date: D(-3), mortality: [{ cause: "unknown", count: 7 }], feed: [{ quantityKg: 190 }] });
    await s.call("post", "/daily-records").send({ flockId: s.layer.id, date: D(-1), eggs: { collected: 860 }, waterLitres: 220 });
    const t = (await s.call("get", `/dashboard/trends?from=${D(-3)}&to=${D(0)}`)).body;
    expect(t.days.map((d: { date: string }) => d.date)).toEqual([D(-3), D(-2), D(-1), D(0)]);
    expect(t.days[0]).toMatchObject({ mortality: 7, feedKg: 300, eggsCollected: 870, eggsBroken: 5, records: 2 });
    expect(t.days[1]).toMatchObject({ mortality: 0, feedKg: 0, eggsCollected: 0, records: 0 });
    expect(t.totals).toMatchObject({ mortality: 7, feedKg: 300, eggsCollected: 1730, waterLitres: 220, records: 3 });
    const broilers = (await s.call("get", `/dashboard/trends?from=${D(-3)}&to=${D(0)}&houseId=${s.houseB.id}`)).body;
    expect(broilers.totals).toMatchObject({ mortality: 7, feedKg: 190, eggsCollected: 0, records: 1 });
    expect((await s.call("get", `/dashboard/trends?from=${D(0)}&to=${D(-1)}`)).status).toBe(400);
    expect((await s.call("get", `/dashboard/trends?from=${D(-400)}&to=${D(0)}`)).status).toBe(400);
  });
});

describe("photos", () => {
  it("uploads by content, not by declared type, and serves only to the farm", async () => {
    const s = await setup();
    expect(s.photo).toMatchObject({ contentType: "image/png", sizeBytes: PNG.length });
    const got = await s.ctx.api().get(s.photo.url).set(bearer(s.owner.access)).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(got.status).toBe(200);
    expect(got.headers["content-type"]).toBe("image/png");
    expect(Buffer.compare(got.body as Buffer, PNG)).toBe(0);

    const fake = await s.ctx.api().post(s.farm("/media")).set(bearer(s.owner.access)).set("Content-Type", "image/jpeg").send(Buffer.from("<script>alert(1)</script>"));
    expect(fake.status).toBe(400);
    const big = await s.ctx.api().post(s.farm("/media")).set(bearer(s.owner.access)).set("Content-Type", "image/png").send(Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]));
    expect(big.status).toBe(413);

    const other = await register(s.ctx, "other@example.com");
    expect((await s.ctx.api().get(s.photo.url).set(bearer(other.access))).status).toBe(404);
    const theirs = (await s.ctx.api().post(`/api/v1/farms/${other.farmId}/media`).set(bearer(other.access)).set("Content-Type", "image/png").send(PNG)).body;
    const res = await s.call("post", "/daily-records").send(fullDay(s, { photos: [{ assetId: theirs.id }] }));
    expect(res.body.error.message).toMatch(/not found on this farm/);
  });
});

describe("offline", () => {
  it("the same day pushed through sync is applied once, with eggs and observations", async () => {
    const s = await setup();
    const mutationId = newId();
    const body = { farmId: s.owner.farmId, deviceId: "phone", mutations: [{ mutationId, command: "daily_record.put", payload: { flockId: s.layer.id, date: D(0), record: { eggs: { collected: 870, broken: 4 }, healthObservations: [{ signs: "One lame bird" }] } }, clientCreatedAt: new Date().toISOString() }] };
    const first = (await s.ctx.api().post("/api/v1/sync/push").set(bearer(s.owner.access)).send(body)).body.results[0];
    expect(first).toMatchObject({ status: "accepted", version: 0 });
    expect((await s.ctx.api().post("/api/v1/sync/push").set(bearer(s.owner.access)).send(body)).body.results[0]).toEqual(first);
    expect(s.ctx.store.eggRecords.all()).toHaveLength(1);
    expect(s.ctx.store.eggInventory.all().reduce((t, m) => t + m.quantityDelta, 0)).toBe(866);
  });
});
