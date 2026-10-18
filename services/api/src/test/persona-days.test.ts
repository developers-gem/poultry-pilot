import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

/** A working day for each kind of user, through the API, checking what the farm would actually see. */
const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (r: number) => ({ amountMinor: Math.round(r * 100), currency: "INR" });

async function farm() {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const call = (m: "get" | "post" | "put" | "patch", p: string, body?: object, who = owner) => ctx.api()[m](`/api/v1/farms/${owner.farmId}${p}`).set(bearer(who.access)).send(body ?? {});
  return { ctx, owner, call };
}

describe("small broiler farmer", () => {
  it("adds batches without inventing codes: the farm numbers them", async () => {
    const { call } = await farm();
    const house = (await call("post", "/houses", { name: "Shed", type: "broiler" })).body;
    const a = (await call("post", "/flocks", { name: "October batch", type: "broiler", houseId: house.id, placement: { date: "2026-10-02", count: 1500 } })).body;
    const b = (await call("post", "/flocks", { name: "Second batch", type: "broiler", houseId: house.id, placement: { date: "2026-10-09", count: 800 } })).body;
    expect(a.flockCode).toBe("B-2610-1");
    expect(b.flockCode).toBe("B-2610-2");
  });
});

describe("commercial broiler manager", () => {
  it("sees FCR as of the last weigh-in (with its date) and the batch's EPEF", async () => {
    const { call } = await farm();
    const house = (await call("post", "/houses", { name: "H1", type: "broiler" })).body;
    const f = (await call("post", "/flocks", { name: "B", flockCode: "B1", type: "broiler", houseId: house.id, placement: { date: D(-28), count: 1000, startingWeightG: 42 } })).body;
    for (let d = 27; d >= 8; d--) await call("put", `/flocks/${f.id}/daily-records/${D(-d)}`, { feed: [{ quantityKg: 1150 / 20 }] }); // 1,150 kg by day 21
    await call("post", `/flocks/${f.id}/weighings`, { date: D(-7), averageWeightG: 900, sampleSize: 50 });
    for (let d = 6; d >= 0; d--) await call("put", `/flocks/${f.id}/daily-records/${D(-d)}`, { feed: [{ quantityKg: 120 }] }); // feed since
    const m = (await call("get", `/flocks/${f.id}/metrics`)).body;
    expect(m.fcrAsOf).toBe(D(-7));
    expect(m.fcr).toBeCloseTo(1150 / 900, 2);
    expect(m.epef).toBeGreaterThan(0);
  });
});

describe("layer manager", () => {
  it("sees hen age including age at placement, eggs per hen housed and feed per dozen", async () => {
    const { call } = await farm();
    const house = (await call("post", "/houses", { name: "Layer shed", type: "layer" })).body;
    const f = (await call("post", "/flocks", { name: "ISA", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-10), count: 1000, ageDaysAtPlacement: 126 } })).body;
    for (let d = 10; d >= 1; d--) await call("put", `/flocks/${f.id}/daily-records/${D(-d)}`, { eggs: { collected: 880, broken: 6 }, feed: [{ quantityKg: 110 }] });
    const m = (await call("get", `/flocks/${f.id}/metrics`)).body;
    expect(m.ageDays).toBe(136); // 18 weeks + 10 days, not "day 10"
    expect(m.eggsPerHenHoused).toBeCloseTo(8.8, 6);
    expect(m.feedPerDozenEggsKg).toBeCloseTo(1100 / (8800 / 12), 6);
  });
});

describe("accountant", () => {
  it("is warned before entering a feed bill the stock purchase already created (no double-counted cost)", async () => {
    const { call } = await farm();
    const item = (await call("post", "/inventory/items", { name: "Starter", category: "feed", unit: "kg", feed: { stage: "starter" } })).body;
    await call("post", `/inventory/items/${item.id}/purchases`, { date: D(-1), quantity: 1000, unitCost: INR(32), supplier: "Godrej" });
    const dup = await call("post", "/finance/expenses", { date: D(0), category: "feed", description: "Godrej feed invoice", amount: INR(32000) });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("POSSIBLE_DUPLICATE");
    expect(dup.body.error.message).toMatch(/created automatically from a stock purchase/);
    const pnl = (await call("get", `/finance/reports/pnl?from=${D(-5)}&to=${D(0)}`)).body;
    expect(pnl.expenses.totalMinor).toBe(3_200_000); // counted once
    // A genuinely different bill of the same amount can still be saved, deliberately.
    expect((await call("post", "/finance/expenses", { date: D(0), category: "labour", description: "Contract labour", amount: INR(32000), allowDuplicate: true })).status).toBe(201);
  });
});

describe("farm supervisor", () => {
  it("sees who recorded each flock's day on the entry sheet", async () => {
    const { ctx, owner, call } = await farm();
    const worker = await joinAs(ctx, owner, "ravi@example.com", "worker");
    const house = (await call("post", "/houses", { name: "H1", type: "layer" })).body;
    const f = (await call("post", "/flocks", { name: "L", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-100), count: 500 } })).body;
    await call("patch", `/flocks/${f.id}/daily-records/${D(0)}`, { eggs: { collected: 430 } }, worker);
    const sheet = (await call("get", "/daily-records/sheet")).body;
    expect(sheet.flocks[0].record).toMatchObject({ recordedByName: ctx.store.users.get(worker.userId)!.fullName });
  });
});

describe("poultry buyer and seller", () => {
  it("the buyer does not retype their name; the seller does not need ISO region codes", async () => {
    const { ctx, owner, call } = await farm();
    const f0 = (await call("get", "")).body;
    await call("put", "", { name: f0.name, countryCode: "IN", timezone: "Asia/Kolkata", currency: "INR", unitSystem: "metric", fcrIncludesMortalityWeight: false, workerEditWindowDays: 1, version: f0.version });
    const listing = await call("post", "/market/listings", { title: "Broilers, 2.2 kg", category: "live_birds", quantityAvailable: 500, unit: "bird", price: INR(240), priceUnit: "per_bird", fulfilmentOptions: ["pickup"] });
    expect(listing.status).toBe(201);
    expect(listing.body.regionCode).toBe("IN");
    await call("post", `/market/listings/${listing.body.id}/status`, { status: "active" });
    const buyer = await register(ctx, "trader@example.com");
    const order = await ctx.api().post("/api/v1/market/orders").set(bearer(buyer.access)).send({ listingId: listing.body.id, quantity: 100, fulfilment: "pickup" });
    expect(order.status).toBe(201);
    expect(order.body.buyerName).toBe(ctx.store.users.get(buyer.userId)!.fullName);
    // A farm with no country gets a plain answer, not a regex error.
    const other = await register(ctx, "nocountry@example.com");
    const r = await ctx.api().post(`/api/v1/farms/${other.farmId}/market/listings`).set(bearer(other.access)).send({ title: "Eggs", category: "eggs", quantityAvailable: 10, unit: "tray", price: INR(180), priceUnit: "per_tray", fulfilmentOptions: ["pickup"] });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/Set your farm's country/);
    void owner;
  });
});

describe("domain checks on the figures farmers rely on", () => {
  it("a broiler FCR from patchy feed records is flagged (and EPEF withheld) instead of looking world-class", async () => {
    const { call } = await farm();
    const h = (await call("post", "/houses", { name: "Shed", type: "broiler" })).body;
    const b = (await call("post", "/flocks", { name: "B", type: "broiler", houseId: h.id, placement: { date: D(-24), count: 1000, startingWeightG: 42 } })).body;
    for (let d = 10; d >= 1; d--) await call("patch", `/flocks/${b.id}/daily-records/${D(-d)}`, { feed: [{ quantityKg: 85 }] }); // 14 of 24 days missing
    await call("post", `/flocks/${b.id}/weighings`, { date: D(-1), averageWeightG: 1200, sampleSize: 30 });
    const m = (await call("get", `/flocks/${b.id}/metrics`)).body;
    expect(m.fcr).toBeLessThan(1); // what the records say...
    expect(m.fcrWarning).toBe("feed_gaps"); // ...flagged: feed on 10 of 24 days
    expect([m.feedDaysRecorded, m.feedDaysExpected]).toEqual([10, 24]);
    // Complete the feed record: the gap warning gives way to the plausibility check.
    for (let d = 23; d >= 11; d--) await call("patch", `/flocks/${b.id}/daily-records/${D(-d)}`, { feed: [{ quantityKg: 10 }] });
    const m2 = (await call("get", `/flocks/${b.id}/metrics`)).body;
    expect(m2.fcrWarning).toBe("implausibly_low"); // still far below 1.0 at day 23: feed or weight is wrong
    expect(m2.epef).toBeNull();
  });

  it("layers get feed per dozen eggs and eggs per hen housed, never a weight-based FCR or EPEF", async () => {
    const { call } = await farm();
    const h = (await call("post", "/houses", { name: "LH", type: "layer" })).body;
    const l = (await call("post", "/flocks", { name: "L", type: "layer", houseId: h.id, placement: { date: D(-150), count: 2000 } })).body;
    await call("patch", `/flocks/${l.id}/daily-records/${D(-1)}`, { eggs: { collected: 1700, broken: 10 }, feed: [{ quantityKg: 230 }] });
    await call("post", `/flocks/${l.id}/weighings`, { date: D(-1), averageWeightG: 1650, sampleSize: 20 });
    const m = (await call("get", `/flocks/${l.id}/metrics`)).body;
    expect(m.fcr).toBeNull();
    expect(m.epef).toBeNull();
    expect(m.feedPerDozenEggsKg).toBeCloseTo(230 / (1700 / 12), 3);
    expect(m.eggsPerHenHoused).toBeCloseTo(1700 / 2000, 2);
  });
});
