import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { runAlertJob } from "../jobs/alert-job.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (rupees: number) => ({ amountMinor: Math.round(rupees * 100), currency: "INR" });

async function setup() {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const call = (method: "get" | "post" | "put" | "delete", path: string, token = owner.access) => ctx.api()[method](`/api/v1/farms/${owner.farmId}${path}`).set(bearer(token));
  const house = (await call("post", "/houses").send({ name: "House A", type: "broiler" })).body;
  const flock = (await call("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: house.id, placement: { date: D(-30), count: 1000, startingWeightG: 40 } })).body;
  const starter = (await call("post", "/inventory/items").send({ name: "Broiler starter", category: "feed", unit: "kg", feed: { stage: "starter", form: "crumble", bagSizeKg: 50 }, reorderLevel: 200, defaultStorageLocation: "Feed store" })).body;
  return { ctx, owner, call, house, flock, starter };
}
type S = Awaited<ReturnType<typeof setup>>;

const buy = (s: S, itemId: string, body: Record<string, unknown>) => s.call("post", `/inventory/items/${itemId}/purchases`).send(body);
const stockOf = async (s: S, itemId: string) => (await s.call("get", `/inventory/items/${itemId}`)).body;

describe("catalog and purchases", () => {
  it("feed catalog items are stocked in kg with feed details; names are unique", async () => {
    const s = await setup();
    expect(s.starter).toMatchObject({ category: "feed", unit: "kg", feed: { stage: "starter", form: "crumble", bagSizeKg: 50 }, quantity: 0, lowStock: true });
    expect((await s.call("post", "/inventory/items").send({ name: "Grower", category: "feed", unit: "bag", feed: { stage: "grower" } })).status).toBe(400);
    expect((await s.call("post", "/inventory/items").send({ name: "Grower", category: "feed", unit: "kg" })).status).toBe(400);
    expect((await s.call("post", "/inventory/items").send({ name: "Broiler starter", category: "feed", unit: "kg", feed: { stage: "starter" } })).status).toBe(409);
    for (const [name, category, unit] of [["ND vaccine", "vaccine", "dose"], ["Amoxicillin", "medicine", "g"], ["Egg trays", "packaging", "tray"], ["Rice husk", "litter", "bag"], ["Drinkers", "equipment", "piece"], ["Gloves", "other", "box"]]) {
      expect((await s.call("post", "/inventory/items").send({ name, category, unit })).status, name).toBe(201);
    }
  });

  it("a purchase creates a lot with supplier, batch, expiry, location and cost; stock and value follow", async () => {
    const s = await setup();
    const lot = (await buy(s, s.starter.id, { date: D(-20), quantity: 1000, unitCost: INR(30), supplier: "Godrej Agrovet", batchNumber: "GA-2291", invoiceNumber: "INV-77", expiryDate: D(70) })).body;
    expect(lot).toMatchObject({ supplier: "Godrej Agrovet", batchNumber: "GA-2291", storageLocation: "Feed store", quantityReceived: 1000, quantityRemaining: 1000, unitCost: INR(30), expiry: "ok" });
    await buy(s, s.starter.id, { date: D(-10), quantity: 500, unitCost: INR(32), expiryDate: D(40) });
    expect(await stockOf(s, s.starter.id)).toMatchObject({ quantity: 1500, valueMinor: 4_600_000, lowStock: false, nextExpiryDate: D(40) });
    expect((await buy(s, s.starter.id, { date: D(-1), quantity: 10, unitCost: INR(30), expiryDate: D(-2) })).status).toBe(400);
    expect((await buy(s, s.starter.id, { date: D(-1), quantity: 10, unitCost: { amountMinor: 10, currency: "USD" } })).status).toBe(400);
    expect((await buy(s, s.starter.id, { date: D(1), quantity: 10, unitCost: INR(30) })).status).toBe(400);
  });
});

describe("automatic stock movement", () => {
  it("a daily record's feed draws stock FEFO and is costed at the lots' prices; edits and deletes put it back", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-20), quantity: 1000, unitCost: INR(30), expiryDate: D(70) });
    await buy(s, s.starter.id, { date: D(-10), quantity: 500, unitCost: INR(32), expiryDate: D(40) });
    const day = (await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(-1)}`).send({ feed: [{ feedItemId: s.starter.id, quantityKg: 600 }] })).body;
    // 500 kg from the lot expiring first (₹32) + 100 kg from the next (₹30) = ₹19,000
    expect(day.feed[0]).toMatchObject({ quantityKg: 600, cost: INR(19_000) });
    expect(await stockOf(s, s.starter.id)).toMatchObject({ quantity: 900, valueMinor: 2_700_000 });

    await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(-1)}`).send({ feed: [{ feedItemId: s.starter.id, quantityKg: 100 }], version: day.version });
    expect((await stockOf(s, s.starter.id)).quantity).toBe(1400);
    const del = await s.ctx.api().delete(`/api/v1/daily-records/${day.id}`).set(bearer(s.owner.access));
    expect(del.status).toBe(204);
    expect(await stockOf(s, s.starter.id)).toMatchObject({ quantity: 1500, valueMinor: 4_600_000 });
  });

  it("not enough feed in stock refuses the whole daily record", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-20), quantity: 100, unitCost: INR(30) });
    const res = await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(-1)}`).send({ mortality: [{ cause: "unknown", count: 2 }], feed: [{ feedItemId: s.starter.id, quantityKg: 150 }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: "INSUFFICIENT_STOCK", details: { available: 100 } });
    expect((await s.call("get", `/flocks/${s.flock.id}`)).body.currentBirdCount).toBe(1000);
    expect(s.ctx.store.dailyRecords.all()).toHaveLength(0);
    expect((await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(-1)}`).send({ feed: [{ feedItemId: s.starter.id, quantityKg: 10, unitCostPerKg: INR(30) }] })).status).toBe(400);
  });

  it("feed consumption and wastage entries; deleting one restores the lots", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-20), quantity: 500, unitCost: INR(30) });
    const eaten = (await s.call("post", "/feed/consumption").send({ date: D(-2), flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 120 })).body;
    expect(eaten).toMatchObject({ kind: "consumption", cost: INR(3600) });
    const spilled = (await s.call("post", "/feed/consumption").send({ date: D(-2), kind: "wastage", flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 5, reason: "Feeder overflow" })).body;
    const store = (await s.call("post", "/feed/consumption").send({ date: D(-2), kind: "wastage", feedItemId: s.starter.id, quantityKg: 25, reason: "Wet bag" })).body;
    expect(store.flockId).toBeUndefined();
    expect((await s.call("post", "/feed/consumption").send({ date: D(-2), feedItemId: s.starter.id, quantityKg: 5 })).status).toBe(400);
    expect((await stockOf(s, s.starter.id)).quantity).toBe(350);
    expect((await s.call("delete", `/feed/consumption/${eaten.id}`)).status).toBe(204);
    expect((await stockOf(s, s.starter.id)).quantity).toBe(470);
    expect(spilled.kind).toBe("wastage");
    const ledger = (await s.call("get", `/inventory/items/${s.starter.id}/transactions`)).body.items.map((t: { type: string }) => t.type);
    expect(ledger).toEqual(expect.arrayContaining(["receipt", "issue", "wastage", "reversal"]));
  });

  it("placing a flock from a chick lot draws the lot down and takes its cost", async () => {
    const s = await setup();
    const lot = (await s.call("post", "/inventory/chick-lots").send({ date: D(-1), quantity: 3000, breed: "Cobb 500", supplier: "Venky's", unitCost: INR(38) })).body;
    const house2 = (await s.call("post", "/houses").send({ name: "House B", type: "broiler" })).body;
    const f = (await s.call("post", "/flocks").send({ name: "B2", flockCode: "B2", type: "broiler", houseId: house2.id, placement: { date: D(0), count: 2000, chickLotId: lot.id } })).body;
    expect(f).toMatchObject({ currentBirdCount: 2000, chickCost: INR(76_000) });
    const lots = (await s.call("get", "/inventory/chick-lots")).body.items;
    expect(lots[0]).toMatchObject({ remaining: 1000, status: "available", placedFlockIds: [f.id] });
    const over = await s.call("post", "/flocks").send({ name: "B3", flockCode: "B3", type: "broiler", houseId: house2.id, placement: { date: D(0), count: 1001, chickLotId: lot.id } });
    expect(over.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect((await s.call("get", "/inventory/overview")).body.chicks).toEqual({ available: 1000, lots: 1 });
  });
});

describe("issues, wastage and stock counts", () => {
  it("medicine is issued FEFO; expired stock is never used but is written off first as wastage", async () => {
    const s = await setup();
    const vac = (await s.call("post", "/inventory/items").send({ name: "ND LaSota", category: "vaccine", unit: "dose", expiryWarningDays: 15 })).body;
    await buy(s, vac.id, { date: D(-90), quantity: 1000, unitCost: INR(0.5), batchNumber: "OLD", expiryDate: D(-1) });
    await buy(s, vac.id, { date: D(-10), quantity: 2000, unitCost: INR(0.6), batchNumber: "NEW", expiryDate: D(120) });
    const use = await s.call("post", `/inventory/items/${vac.id}/issues`).send({ date: D(0), quantity: 1000, flockId: s.flock.id, reason: "Day 7 vaccination" });
    expect(use.body).toMatchObject({ quantity: 1000, cost: INR(600), remaining: 2000 });
    expect((await s.call("post", `/inventory/items/${vac.id}/issues`).send({ date: D(0), quantity: 1001 })).body.error.message).toMatch(/1000 more is expired/);
    const waste = await s.call("post", `/inventory/items/${vac.id}/wastage`).send({ date: D(0), quantity: 1000, reason: "Expired" });
    expect(waste.body.allocations).toEqual([expect.objectContaining({ quantity: 1000, costMinor: 50_000 })]);
    expect(await stockOf(s, vac.id)).toMatchObject({ quantity: 1000, quantityExpired: 0 });
  });

  it("a stock count removes a shortfall and adds a surplus at average cost", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-5), quantity: 400, unitCost: INR(30) });
    const short = (await s.call("post", `/inventory/items/${s.starter.id}/counts`).send({ date: D(0), countedQuantity: 380 })).body;
    expect(short).toEqual({ bookQuantity: 400, countedQuantity: 380, difference: -20 });
    const surplus = (await s.call("post", `/inventory/items/${s.starter.id}/counts`).send({ date: D(0), countedQuantity: 390, reason: "Found 10 kg" })).body;
    expect(surplus.difference).toBe(10);
    expect(await stockOf(s, s.starter.id)).toMatchObject({ quantity: 390, valueMinor: 1_170_000 });
  });
});

describe("feed calculations", () => {
  it("feed per bird, per kg gain, FCR, feed cost per bird and days of feed remaining", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-29), quantity: 4000, unitCost: INR(30) });
    for (const n of [-7, -6, -5, -4, -3, -2, -1]) await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(n)}`).send({ feed: [{ feedItemId: s.starter.id, quantityKg: 200 }] });
    await s.call("post", `/flocks/${s.flock.id}/weighings`).send({ date: D(-1), averageWeightG: 1440, sampleSize: 50 });
    const a = (await s.call("get", "/feed/analytics")).body;
    const row = a.flocks[0];
    // 1400 kg eaten by 1000 birds weighing 1.44 kg (1440 kg live; 40 kg arrived as chicks)
    expect(row).toMatchObject({ feedConsumedKg: 1400, feedWastedKg: 0, feedPerBirdKg: 1.4, feedCostMinor: 4_200_000, feedCostPerBirdMinor: 4200, costsComplete: true });
    expect(row.fcr).toBeCloseTo(1400 / 1440, 6);
    expect(row.feedPerKgGainKg).toBeCloseTo(1400 / 1400, 6);
    expect(row.feedCostPerEggMinor).toBeNull();
    // 2600 kg left at 200 kg a day = 13 days
    expect(a.stock.items[0]).toMatchObject({ quantityKg: 2600, averageDailyUseKg: 200, daysRemaining: 13, status: "ok" });
    expect(a.stock.totals).toMatchObject({ quantityKg: 2600, daysRemaining: 13 });
  });

  it("feed cost per egg for a layer flock", async () => {
    const s = await setup();
    const lh = (await s.call("post", "/houses").send({ name: "Layer house", type: "layer" })).body;
    const layers = (await s.call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: lh.id, placement: { date: D(-200), count: 1000 } })).body;
    const lf = (await s.call("post", "/inventory/items").send({ name: "Layer mash", category: "feed", unit: "kg", feed: { stage: "layer" } })).body;
    await buy(s, lf.id, { date: D(-5), quantity: 1000, unitCost: INR(28) });
    for (const n of [-2, -1]) await s.call("put", `/flocks/${layers.id}/daily-records/${D(n)}`).send({ feed: [{ feedItemId: lf.id, quantityKg: 115 }], eggs: { collected: 900, broken: 10 } });
    const row = (await s.call("get", `/feed/analytics?flockId=${layers.id}`)).body.flocks[0];
    // ₹6,440 of feed / 1800 eggs = 357.8 paise (₹3.58) per egg
    expect(row.eggsCollected).toBe(1800);
    expect(row.feedCostPerEggMinor).toBeCloseTo(644_000 / 1800, 6);
  });
});

describe("alerts", () => {
  it("low stock is raised when stock falls to the reorder level and resolved after a purchase", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-5), quantity: 300, unitCost: INR(30) });
    expect((await s.call("get", "/alerts?status=open")).body.items).toHaveLength(0);
    await s.call("post", "/feed/consumption").send({ date: D(-1), flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 150 });
    const open = (await s.call("get", "/alerts?status=open")).body.items;
    expect(open).toEqual([expect.objectContaining({ ruleType: "low_feed_stock", severity: "warning", title: "Low stock: Broiler starter" })]);
    await buy(s, s.starter.id, { date: D(0), quantity: 1000, unitCost: INR(31) });
    expect((await s.call("get", "/alerts?status=open")).body.items).toHaveLength(0);
    expect((await s.call("get", "/alerts?status=resolved")).body.items[0].ruleType).toBe("low_feed_stock");
  });

  it("feed running out by days remaining, and out of stock is critical", async () => {
    const s = await setup();
    await s.call("put", `/inventory/items/${s.starter.id}`).send({ name: "Broiler starter", reorderDays: 5, expiryWarningDays: 30, active: true, feed: { stage: "starter" }, version: s.starter.version });
    await buy(s, s.starter.id, { date: D(-10), quantity: 2000, unitCost: INR(30) });
    for (const n of [-3, -2, -1]) await s.call("post", "/feed/consumption").send({ date: D(n), flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 450 });
    const a = (await s.call("get", "/alerts?status=open")).body.items[0];
    expect(a.message).toMatch(/about 1 days of feed left at 450 kg a day/);
    await s.call("post", "/feed/consumption").send({ date: D(0), flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 650 });
    expect((await s.call("get", "/alerts?status=open")).body.items[0]).toMatchObject({ severity: "critical", message: "Broiler starter is out of stock." });
  });

  it("expiry alerts: expiring soon and expired; the hourly job raises them; writing off resolves them", async () => {
    const s = await setup();
    const med = (await s.call("post", "/inventory/items").send({ name: "Vitamin AD3E", category: "medicine", unit: "ml", expiryWarningDays: 30 })).body;
    await buy(s, med.id, { date: D(-100), quantity: 500, unitCost: INR(1), batchNumber: "V1", expiryDate: D(-1) });
    await buy(s, med.id, { date: D(-10), quantity: 500, unitCost: INR(1), batchNumber: "V2", expiryDate: D(20) });
    s.ctx.store.alerts.rows.clear();
    expect(await runAlertJob(s.ctx.container)).toEqual({ farms: 1, failed: 0 });
    const open = (await s.call("get", "/alerts?status=open")).body.items as { ruleType: string; title: string }[];
    // The empty starter feed (reorder level 200 kg) is correctly low on stock too; this test looks at expiry.
    expect(open.map((a) => a.ruleType)).toContain("low_feed_stock");
    const types = open.filter((a) => a.ruleType !== "low_feed_stock").map((a) => `${a.ruleType}:${a.title}`).sort();
    expect(types).toEqual(["expired_stock:Expired: Vitamin AD3E batch V1", "expiry_soon:Expiring soon: Vitamin AD3E batch V2"]);
    expect((await s.call("get", "/inventory/lots?expiring=true")).body.items.map((l: { expiry: string }) => l.expiry)).toEqual(["expired", "expiring"]);
    await s.call("post", `/inventory/items/${med.id}/wastage`).send({ date: D(0), quantity: 500, reason: "Expired" });
    expect((await s.call("get", "/alerts?status=open")).body.items.map((a: { ruleType: string }) => a.ruleType).filter((t: string) => t !== "low_feed_stock")).toEqual(["expiry_soon"]);
  });

  it("alerts can be acknowledged by supervisors and above", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-5), quantity: 100, unitCost: INR(30) });
    const alert = (await s.call("get", "/alerts?status=open")).body.items[0];
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    expect((await s.call("post", `/alerts/${alert.id}/acknowledge`, worker.access)).status).toBe(403);
    expect((await s.call("post", `/alerts/${alert.id}/acknowledge`)).body).toMatchObject({ status: "acknowledged", acknowledgedBy: s.owner.userId });
  });
});

describe("water", () => {
  it("records source, quality and treatment; flags abnormal consumption and pH (against the farm's own limit), and alerts", async () => {
    const s = await setup();
    // No pH limit is assumed: the farm sets its own on the water rule.
    await s.call("put", "/alert-rules/water_consumption").send({ enabled: true, parameters: { phMin: 6, phMax: 8 } });
    for (const n of [-4, -3, -2]) await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(n)}`).send({ waterLitres: 400 });
    const day = (
      await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(-1)}`).send({
        waterLitres: 300,
        waterQuality: { source: "borehole", ph: 5.4, tdsPpm: 450, chlorinePpm: 3, qualityRating: "fair", treatment: "chlorination" },
      })
    ).body;
    expect(day.water).toMatchObject({ source: "borehole", ph: 5.4, treatment: "chlorination", flags: ["consumption_low", "ph_low"], baselineLitres: 400 });
    const alert = (await s.call("get", "/alerts?ruleType=water_abnormal")).body.items[0];
    expect(alert).toMatchObject({ severity: "critical", flockId: s.flock.id });
    expect(alert.message).toMatch(/25% below the recent average of 400 L; pH 5.4 is below the limit/);
    expect((await s.call("get", "/water-records?abnormal=true")).body.items).toHaveLength(1);
    // Corrected reading clears the flags and resolves the alert.
    await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(-1)}`).send({ waterLitres: 390, waterQuality: { ph: 6.8 }, version: day.version });
    expect((await s.call("get", "/alerts?ruleType=water_abnormal")).body.items[0].status).toBe("resolved");
    expect((await s.call("put", `/flocks/${s.flock.id}/daily-records/${D(0)}`).send({ waterQuality: { ph: 7 } })).status).toBe(400);
  });
});

describe("overview, eggs, permissions, tenancy and concurrency", () => {
  it("overview covers every category plus eggs and chicks; egg movements cannot go below zero", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-5), quantity: 1000, unitCost: INR(30) });
    const trays = (await s.call("post", "/inventory/items").send({ name: "Egg trays", category: "packaging", unit: "tray", reorderLevel: 50 })).body;
    await buy(s, trays.id, { date: D(-5), quantity: 40, unitCost: INR(4) });
    const lh = (await s.call("post", "/houses").send({ name: "LH", type: "layer" })).body;
    const layers = (await s.call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: lh.id, placement: { date: D(-200), count: 500 } })).body;
    await s.call("put", `/flocks/${layers.id}/daily-records/${D(-1)}`).send({ eggs: { collected: 450, broken: 5, byGrade: { large: 300 } } });
    expect((await s.call("post", "/inventory/eggs/movements").send({ date: D(0), type: "used", quantity: 20, grade: "large" })).status).toBe(201);
    expect((await s.call("post", "/inventory/eggs/movements").send({ date: D(0), type: "spoiled", quantity: 500 })).body.error.code).toBe("INSUFFICIENT_STOCK");
    const o = (await s.call("get", "/inventory/overview")).body;
    expect(o.categories.feed).toMatchObject({ items: 1, valueMinor: 3_000_000, lowStock: 0 });
    expect(o.categories.packaging).toMatchObject({ items: 1, lowStock: 1 });
    expect(o.eggs).toEqual({ total: 425, byGrade: { large: 280, ungraded: 145 } });
    expect(o.totalValueMinor).toBe(3_016_000);
  });

  it("workers use stock but cannot buy; accountants buy but cannot use; vets use medicine", async () => {
    const s = await setup();
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    const acct = await joinAs(s.ctx, s.owner, "a@example.com", "accountant");
    const vet = await joinAs(s.ctx, s.owner, "v@example.com", "vet");
    expect((await s.call("post", `/inventory/items/${s.starter.id}/purchases`, worker.access).send({ date: D(0), quantity: 10, unitCost: INR(30) })).status).toBe(403);
    expect((await s.call("post", `/inventory/items/${s.starter.id}/purchases`, acct.access).send({ date: D(0), quantity: 100, unitCost: INR(30) })).status).toBe(201);
    expect((await s.call("post", "/feed/consumption", acct.access).send({ date: D(0), flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 1 })).status).toBe(403);
    expect((await s.call("post", "/feed/consumption", worker.access).send({ date: D(0), flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 1 })).status).toBe(201);
    const med = (await s.call("post", "/inventory/items").send({ name: "Tylosin", category: "medicine", unit: "g" })).body;
    await buy(s, med.id, { date: D(0), quantity: 100, unitCost: INR(5) });
    expect((await s.call("post", `/inventory/items/${med.id}/issues`, vet.access).send({ date: D(0), quantity: 10, flockId: s.flock.id })).status).toBe(201);
    expect((await s.call("post", "/inventory/items", vet.access).send({ name: "X", category: "other", unit: "piece" })).status).toBe(403);
  });

  it("another farm's item is not found, and nothing moves", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-5), quantity: 100, unitCost: INR(30) });
    const other = await register(s.ctx, "other@example.com");
    const theirs = (p: string) => s.ctx.api().post(`/api/v1/farms/${other.farmId}${p}`).set(bearer(other.access));
    expect((await theirs(`/inventory/items/${s.starter.id}/issues`).send({ date: D(0), quantity: 10 })).status).toBe(404);
    expect((await theirs("/feed/consumption").send({ date: D(0), kind: "wastage", feedItemId: s.starter.id, quantityKg: 10 })).status).toBe(404);
    expect((await s.ctx.api().get(`/api/v1/farms/${s.owner.farmId}/inventory/items`).set(bearer(other.access))).status).toBe(404);
    expect((await stockOf(s, s.starter.id)).quantity).toBe(100);
  });

  it("if an item changes during a movement, the movement fails with 409 and writes nothing", async () => {
    const s = await setup();
    await buy(s, s.starter.id, { date: D(-5), quantity: 100, unitCost: INR(30) });
    const original = s.ctx.repos.inventoryItems.findById;
    s.ctx.repos.inventoryItems.findById = async (farmId, id, tx) => {
      const rec = await original(farmId, id, tx);
      return rec ? { ...rec, version: rec.version - 1 } : rec;
    };
    const res = await s.call("post", "/feed/consumption").send({ date: D(0), flockId: s.flock.id, feedItemId: s.starter.id, quantityKg: 60 });
    s.ctx.repos.inventoryItems.findById = original;
    expect(res.status).toBe(409);
    expect((await stockOf(s, s.starter.id)).quantity).toBe(100);
    expect(s.ctx.store.feedConsumption.all()).toHaveLength(0);
  });
});
