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
  const breederHouse = (await call("post", "/houses").send({ name: "Breeder house", type: "breeder" })).body;
  const brooder = (await call("post", "/houses").send({ name: "Brooder 1", type: "broiler" })).body;
  const breeders = (await call("post", "/flocks").send({ name: "Breeders", flockCode: "BR1", type: "breeder", houseId: breederHouse.id, placement: { date: D(-300), count: 2000 } })).body;
  // Hatching eggs in stock: two days' collection.
  for (const n of [-24, -23]) await call("put", `/flocks/${breeders.id}/daily-records/${D(n)}`).send({ eggs: { collected: 600 } });
  return { ctx, owner, call, brooder, breeders };
}
type S = Awaited<ReturnType<typeof setup>>;

const setBatch = (s: S, over: Record<string, unknown> = {}) =>
  s.call("post", "/hatchery/batches").send({ code: "H-101", eggSource: "own_flock", sourceFlockId: s.breeders.id, breed: "Cobb 500", eggsReceived: 1050, rejects: { cracked: 30, dirty: 20 }, setDate: D(-21), ...over });

/** The domain scenario through the API: 1000 set, 810 saleable. */
async function runToGrading(s: S, id: string) {
  await s.call("post", `/hatchery/batches/${id}/candling`).send({ date: D(-14), infertile: 80, deadEmbryo: 20, cracked: 5 });
  await s.call("post", `/hatchery/batches/${id}/candling`).send({ date: D(-7), deadEmbryo: 10 });
  await s.call("post", `/hatchery/batches/${id}/transfer`).send({ date: D(-3), cracked: 5, deadEmbryo: 5 });
  await s.call("post", `/hatchery/batches/${id}/hatch`).send({ date: D(0), hatched: 830 });
  return (await s.call("post", `/hatchery/batches/${id}/grading`).send({ date: D(0), saleable: 810, culled: 20 })).body;
}

describe("hatchery workflow", () => {
  it("egg source → selection → setting draws hatching eggs from stock and schedules transfer and hatch", async () => {
    const s = await setup();
    const res = await setBatch(s);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ eggsReceived: 1050, rejects: { cracked: 30, dirty: 20 }, eggsSet: 1000, incubationDays: 21, expectedTransferDate: D(-3), expectedHatchDate: D(0), status: "incubating", counts: { inIncubation: 1000, stage: "incubating" } });
    expect((await s.call("get", "/inventory/eggs")).body.total).toBe(1200 - 1050);
  });

  it("candling → transfer → hatch → grading tracks every egg and calculates the rates", async () => {
    const s = await setup();
    const b = (await setBatch(s)).body;
    const out = await runToGrading(s, b.id);
    expect(out.batch.counts).toEqual({ eggsSet: 1000, infertile: 80, cracked: 10, deadEmbryo: 35, transferred: 875, hatched: 830, deadInShell: 45, culled: 20, saleable: 810, inIncubation: 0, stage: "graded" });
    expect(out.batch.metrics.fertilityPercent).toBeCloseTo(91.919192, 5); // 910 / 990
    expect(out.batch.metrics.hatchabilityPercent).toBeCloseTo(91.208791, 5); // 830 / 910
    expect(out.batch.metrics).toMatchObject({ fertile: 910, hatchOfSetPercent: 83, saleableChickPercent: 81, lossPercent: 19 });
    expect(out.chickLot).toMatchObject({ source: "own_hatchery", hatcheryBatchId: b.id, breed: "Cobb 500", hatchDate: D(0), quantity: 810, remaining: 810, status: "available" });
    const full = (await s.call("get", `/hatchery/batches/${b.id}`)).body;
    expect(full.events.map((e: { type: string }) => e.type)).toEqual(["set", "candling", "candling", "transfer_to_hatcher", "hatch", "chick_grading"]);
    expect(full.status).toBe("hatched");
  });

  it("purchased eggs: the chick lot is costed per saleable chick", async () => {
    const s = await setup();
    const b = (await setBatch(s, { code: "P-1", eggSource: "purchased", sourceFlockId: undefined, supplier: "Venky's", eggsReceived: 1000, rejects: {}, eggCost: INR(8000), otherCost: INR(1720) })).body;
    await s.call("post", `/hatchery/batches/${b.id}/hatch`).send({ date: D(0), hatched: 820, deadInShell: 180 });
    const g = (await s.call("post", `/hatchery/batches/${b.id}/grading`).send({ date: D(0), saleable: 810, culled: 10 })).body;
    expect(g.chickLot.unitCost).toEqual(INR(12)); // ₹9,720 / 810 chicks
    expect((await s.call("get", "/inventory/eggs")).body.total).toBe(1200);
  });

  it("refuses impossible counts and out-of-order stages", async () => {
    const s = await setup();
    const b = (await setBatch(s)).body;
    const path = (x: string) => `/hatchery/batches/${b.id}/${x}`;
    expect((await s.call("post", path("candling")).send({ date: D(-14), infertile: 1001 })).body.error.message).toMatch(/Only 1000 eggs/);
    expect((await s.call("post", path("candling")).send({ date: D(-22), infertile: 1 })).body.error.message).toMatch(/before the eggs were set/);
    expect((await s.call("post", path("candling")).send({ date: D(1), infertile: 1 })).body.error.message).toMatch(/future/);
    expect((await s.call("post", path("grading")).send({ date: D(-1), saleable: 1 })).body.error.message).toMatch(/after the hatch/);
    await s.call("post", path("transfer")).send({ date: D(-3) });
    expect((await s.call("post", path("candling")).send({ date: D(-2), infertile: 1 })).body.error.code).toBe("INVALID_STATE_TRANSITION");
    expect((await s.call("post", path("hatch")).send({ date: D(0), hatched: 800, deadInShell: 100 })).body.error.message).toMatch(/must equal the 1000 eggs/);
    await s.call("post", path("hatch")).send({ date: D(0), hatched: 900 });
    expect((await s.call("post", path("grading")).send({ date: D(0), saleable: 880, culled: 10 })).body.error.message).toMatch(/must equal the 900 chicks/);
  });

  it("refuses eggs the farm does not have, non-laying source flocks and duplicate codes", async () => {
    const s = await setup();
    expect((await setBatch(s, { eggsReceived: 1201, rejects: {} })).body.error).toMatchObject({ code: "INSUFFICIENT_STOCK", details: { available: 1200 } });
    const broilers = (await s.call("post", "/flocks").send({ name: "B", flockCode: "B", type: "broiler", houseId: s.brooder.id, placement: { date: D(-10), count: 100 } })).body;
    expect((await setBatch(s, { sourceFlockId: broilers.id })).status).toBe(400);
    expect((await setBatch(s, { eggsReceived: 50, rejects: { cracked: 50 } })).body.error.message).toMatch(/nothing to set/);
    await setBatch(s, { eggsReceived: 100, rejects: {} });
    expect((await setBatch(s, { eggsReceived: 100, rejects: {} })).status).toBe(409);
  });

  it("undoes the latest stage; a grading cannot be undone once its chicks are used; cancelling stops the batch", async () => {
    const s = await setup();
    const b = (await setBatch(s)).body;
    const out = await runToGrading(s, b.id);
    const undone = (await s.call("post", `/hatchery/batches/${b.id}/reverse`).send({ reason: "Miscounted culls" })).body;
    expect(undone).toMatchObject({ counts: { stage: "hatched", saleable: 0 } });
    expect(undone.chickLotId).toBeUndefined();
    expect((await s.call("get", "/inventory/chick-lots")).body.items).toHaveLength(0);
    const again = (await s.call("post", `/hatchery/batches/${b.id}/grading`).send({ date: D(0), saleable: 815, culled: 15 })).body;
    await s.call("post", "/flocks").send({ name: "F", flockCode: "F", type: "broiler", houseId: s.brooder.id, placement: { date: D(0), count: 100, chickLotId: again.chickLot.id } });
    expect((await s.call("post", `/hatchery/batches/${b.id}/reverse`).send({ reason: "nope" })).body.error.message).toMatch(/already been placed or sold/);
    void out;
    const b2 = (await setBatch(s, { code: "H-102", eggsReceived: 100, rejects: {} })).body;
    expect((await s.call("post", `/hatchery/batches/${b2.id}/cancel`).send({ reason: "Power failure overnight" })).body).toMatchObject({ status: "cancelled", cancelledReason: "Power failure overnight" });
    expect((await s.call("post", `/hatchery/batches/${b2.id}/candling`).send({ date: D(-14), infertile: 1 })).status).toBe(422);
  });

  it("summary counts only completed batches (prototype bug B27)", async () => {
    const s = await setup();
    const b = (await setBatch(s)).body;
    await runToGrading(s, b.id);
    await setBatch(s, { code: "H-2", eggsReceived: 100, rejects: {}, setDate: D(-5) });
    const sum = (await s.call("get", "/hatchery/summary")).body;
    expect(sum.batches).toEqual({ incubating: 1, hatched: 1, cancelled: 0 });
    expect(sum.eggsIncubating).toBe(100);
    expect(sum.completed).toMatchObject({ eggsSet: 1000, hatched: 830, saleable: 810, hatchOfSetPercent: 83, saleableChickPercent: 81, lossPercent: 19 });
  });
});

describe("chick orders and delivery", () => {
  it("books ahead of the hatch, checks free chicks, and delivery draws the lot", async () => {
    const s = await setup();
    const b = (await setBatch(s)).body;
    const buyer = (await s.call("post", "/buyers").send({ name: "Sharma Poultry", type: "farm", phone: "+91 98765 43210" })).body;
    const booked = (await s.call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 500, unitPrice: INR(38), requestedDeliveryDate: D(1), hatcheryBatchId: b.id })).body;
    expect(booked).toMatchObject({ orderNumber: 1, status: "pending", quantity: 500, total: INR(19_000), buyerName: "Sharma Poultry" });
    expect((await s.call("get", `/hatchery/batches/${b.id}`)).body.chicksBooked).toBe(500);
    expect((await s.call("post", `/chick-orders/${booked.id}/deliver`).send({ date: D(0) })).body.error.message).toMatch(/Confirm the order/);
    await s.call("post", `/chick-orders/${booked.id}/confirm`);
    expect((await s.call("post", `/chick-orders/${booked.id}/deliver`).send({ date: D(0) })).body.error.message).toMatch(/not been graded/);
    const graded = await runToGrading(s, b.id);
    // 810 saleable, 500 booked on the batch: only 310 free for a second order.
    const tooMany = await s.call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 311, unitPrice: INR(38), chickLotId: graded.chickLot.id });
    expect(tooMany.body.error).toMatchObject({ code: "INSUFFICIENT_STOCK", details: { reserved: 500, available: 310 } });
    const second = (await s.call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 300, unitPrice: INR(40), chickLotId: graded.chickLot.id })).body;
    expect(second.orderNumber).toBe(2);
    const delivered = (await s.call("post", `/chick-orders/${booked.id}/deliver`).send({ date: D(0) })).body;
    expect(delivered.order).toMatchObject({ status: "delivered", deliveredDate: D(0) });
    expect(delivered.chickLot).toMatchObject({ remaining: 310 });
    expect((await s.call("post", `/chick-orders/${second.id}/cancel`).send({ reason: "Buyer postponed" })).body.status).toBe("cancelled");
    expect((await s.call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 1, unitPrice: { amountMinor: 100, currency: "USD" }, chickLotId: graded.chickLot.id })).status).toBe(400);
    expect((await s.call("get", "/chick-orders?status=delivered")).body.items).toHaveLength(1);
  });
});

describe("calendar", () => {
  it("shows expected transfers and hatches, chick deliveries, arrivals and vaccinations; exports iCalendar", async () => {
    const s = await setup();
    const b = (await setBatch(s, { setDate: D(-10) })).body; // transfer D(8), hatch D(11)
    const buyer = (await s.call("post", "/buyers").send({ name: "Sharma Poultry" })).body;
    await s.call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 200, unitPrice: INR(38), requestedDeliveryDate: D(12), hatcheryBatchId: b.id });
    await s.call("post", "/chickstart/arrivals").send({ houseId: s.brooder.id, expectedDate: D(12), expectedCount: 600, source: "own_hatchery", hatcheryBatchId: b.id, flockType: "broiler" });
    await s.call("post", "/health/vaccinations").send({ flockId: s.breeders.id, vaccineName: "ND booster", dueDate: D(-2) });
    const cal = (await s.call("get", `/calendar?from=${D(0)}&to=${D(30)}`)).body;
    expect(cal.events.map((e: { type: string; date: string; overdue: boolean }) => `${e.date}:${e.type}:${e.overdue}`)).toEqual([
      `${D(0)}:vaccination_due:true`,
      `${D(8)}:transfer_expected:false`,
      `${D(11)}:hatch_expected:false`,
      `${D(12)}:chick_arrival:false`,
      `${D(12)}:chick_delivery:false`,
    ]);
    expect(cal.events.find((e: { type: string }) => e.type === "chick_delivery").title).toBe("Deliver 200 chicks to Sharma Poultry (order 1)");
    expect(cal.events.find((e: { type: string }) => e.type === "chick_arrival").title).toMatch(/house not yet prepared/);
    expect((await s.call("get", `/calendar?from=${D(0)}&to=${D(30)}&types=hatch_expected`)).body.events).toHaveLength(1);
    const ics = await s.call("get", `/calendar/ics?from=${D(0)}&to=${D(30)}`);
    expect(ics.headers["content-type"]).toMatch(/text\/calendar/);
    expect(ics.text).toMatch(/BEGIN:VCALENDAR/);
    expect(ics.text).toContain(`DTSTART;VALUE=DATE:${D(11).replace(/-/g, "")}`);
    expect(ics.text).toContain("SUMMARY:Batch H-101 hatches (1000 eggs)");
    expect(ics.text.match(/BEGIN:VEVENT/g)).toHaveLength(5);
    expect((await s.call("get", `/calendar?from=${D(0)}&to=${D(400)}`)).status).toBe(400);
  });

  it("the hourly job raises a hatch-due alert; recording the hatch resolves it", async () => {
    const s = await setup();
    const b = (await setBatch(s, { setDate: D(-22) })).body; // due yesterday
    await runAlertJob(s.ctx.container);
    const alert = (await s.call("get", "/alerts?ruleType=hatch_due")).body.items[0];
    expect(alert).toMatchObject({ status: "open", severity: "warning", title: "Hatch overdue: batch H-101" });
    await s.call("post", `/hatchery/batches/${b.id}/hatch`).send({ date: D(0), hatched: 900 });
    expect((await s.call("get", "/alerts?ruleType=hatch_due")).body.items[0].status).toBe("resolved");
  });
});

describe("ChickStart", () => {
  const profile = { name: "Cobb broiler (from breed guide)", flockTypes: ["broiler"], source: "Example values; replace with your breed guide", isDefault: true, bands: [{ fromDay: 0, toDay: 3, tempMinC: 31, tempMaxC: 33, humidityMin: 55, humidityMax: 70, targetWeightG: 60 }, { fromDay: 4, toDay: 7, tempMinC: 29, tempMaxC: 31, targetWeightG: 150 }] };

  it("brooding profiles are the farm's own; bands cannot overlap; one default", async () => {
    const s = await setup();
    expect((await s.call("post", "/chickstart/profiles").send({ ...profile, bands: [{ fromDay: 0, toDay: 3 }, { fromDay: 3, toDay: 7 }] })).body.error.message).toMatch(/overlap/);
    await s.call("post", "/chickstart/profiles").send(profile);
    await s.call("post", "/chickstart/profiles").send({ ...profile, name: "Second" });
    expect((await s.call("get", "/chickstart/profiles")).body.items.filter((p: { isDefault: boolean }) => p.isDefault).map((p: { name: string }) => p.name)).toEqual(["Second"]);
  });

  async function hatchedLot(s: S) {
    const b = (await setBatch(s)).body;
    await runToGrading(s, b.id);
    return b;
  }

  it("prepares the house against a checklist, then the arrival places chicks from the farm's own hatch", async () => {
    const s = await setup();
    const b = (await setBatch(s)).body;
    const tpl = (await s.call("post", "/biosecurity/checklists").send({ name: "House ready for chicks", kind: "arrival_preparation", items: [{ id: "litter", text: "Fresh litter spread?", responseType: "yes_no", failIf: "no" }, { id: "preheat", text: "Brooders pre-heated for 24 hours?", responseType: "yes_no", failIf: "no" }, { id: "temp", text: "Floor temperature (°C)", responseType: "number", required: false }] })).body;
    const plan = (await s.call("post", "/chickstart/arrivals").send({ houseId: s.brooder.id, expectedDate: D(0), expectedCount: 800, source: "own_hatchery", hatcheryBatchId: b.id, flockType: "broiler", breed: "Cobb 500" })).body;
    const prep = (await s.call("post", `/chickstart/arrivals/${plan.id}/preparation`).send({ checklist: { templateId: tpl.id, answers: [{ itemId: "litter", answer: true }, { itemId: "preheat", answer: false }, { itemId: "temp", answer: 29 }] } })).body;
    expect(prep).toMatchObject({ prepared: true, preparation: { checklist: { failedCount: 1 } } });
    expect((await s.call("get", "/biosecurity/corrective-actions")).body.items[0].title).toBe("Fix: Brooders pre-heated for 24 hours?");
    const early = await s.call("post", `/chickstart/arrivals/${plan.id}/arrive`).send({ received: 800, flock: { name: "B-Oct", flockCode: "B-OCT" } });
    expect(early.body.error.message).toMatch(/not been graded/);
    await runToGrading(s, b.id);
    const arrived = await s.call("post", `/chickstart/arrivals/${plan.id}/arrive`).send({ received: 800, deadOnArrival: 4, averageWeightG: 42, sampleSize: 50, qualityNotes: "Active, good navels", flock: { name: "B-Oct", flockCode: "B-OCT" } });
    expect(arrived.status).toBe(201);
    expect(arrived.body.flock).toMatchObject({ flockCode: "B-OCT", status: "active", currentBirdCount: 796, startingWeightG: 42, hatchDate: D(0), breed: "Cobb 500" });
    expect(arrived.body.flock.chickCost).toBeUndefined(); // the batch had no egg cost recorded
    expect(arrived.body.arrival).toMatchObject({ status: "arrived", flockId: arrived.body.flock.id, arrival: { received: 800, deadOnArrival: 4 } });
    expect((await s.call("get", "/inventory/chick-lots")).body.items[0].remaining).toBe(10);
    expect((await s.call("post", `/chickstart/arrivals/${plan.id}/arrive`).send({ received: 1, flock: { name: "x", flockCode: "x" } })).body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("a failed placement leaves the arrival planned and the lot untouched (one transaction)", async () => {
    const s = await setup();
    const b = await hatchedLot(s);
    const plan = (await s.call("post", "/chickstart/arrivals").send({ houseId: s.brooder.id, expectedDate: D(0), expectedCount: 800, source: "own_hatchery", hatcheryBatchId: b.id, flockType: "broiler" })).body;
    const tooMany = await s.call("post", `/chickstart/arrivals/${plan.id}/arrive`).send({ received: 811, flock: { name: "x", flockCode: "X1" } });
    expect(tooMany.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect((await s.call("get", "/chickstart/arrivals")).body.items[0].status).toBe("planned");
    expect((await s.call("get", "/inventory/chick-lots")).body.items[0].remaining).toBe(810);
    expect((await s.call("get", "/flocks?status=active")).body.items.map((f: { flockCode: string }) => f.flockCode)).toEqual(["BR1"]);
  });

  it("brooder checks are judged against the farm's profile for the chicks' age and raise an alert", async () => {
    const s = await setup();
    await s.call("post", "/chickstart/profiles").send(profile);
    const flock = (await s.call("post", "/flocks").send({ name: "C", flockCode: "C1", type: "broiler", houseId: s.brooder.id, placement: { date: D(-2), count: 1000, startingWeightG: 40 } })).body;
    const cold = (await s.call("post", "/chickstart/checks").send({ flockId: flock.id, temperatureC: 29.5, humidityPercent: 50, behaviour: "huddling", feedAvailable: true, waterAvailable: true, cropFill: { sampled: 20, full: 15 } })).body;
    expect(cold).toMatchObject({ dayOfAge: 2, flags: ["temperature_low", "humidity_low", "behaviour"], profile: { name: profile.name, band: { fromDay: 0, toDay: 3 } } });
    const alert = (await s.call("get", "/alerts?ruleType=brooding_conditions")).body.items[0];
    expect(alert.message).toMatch(/temperature 29.5 °C is below 31 °C; humidity 50% is below 55%; chicks are huddling/);
    const ok = (await s.call("post", "/chickstart/checks").send({ flockId: flock.id, temperatureC: 32, behaviour: "comfortable", waterAvailable: true })).body;
    expect(ok.flags).toBeUndefined();
    expect((await s.call("post", "/chickstart/checks").send({ flockId: flock.id, cropFill: { sampled: 5, full: 6 } })).status).toBe(400);
    const thirsty = await s.call("post", "/chickstart/checks").send({ flockId: flock.id, waterAvailable: false });
    expect(thirsty.body.flags).toEqual(["no_water"]);
    expect((await s.call("get", "/alerts?ruleType=brooding_conditions")).body.items[0].severity).toBe("critical");
  });

  it("without a profile, checks are recorded but not judged", async () => {
    const s = await setup();
    const flock = (await s.call("post", "/flocks").send({ name: "C", flockCode: "C1", type: "broiler", houseId: s.brooder.id, placement: { date: D(-1), count: 100 } })).body;
    const c = (await s.call("post", "/chickstart/checks").send({ flockId: flock.id, temperatureC: 20, behaviour: "comfortable" })).body;
    expect(c).toMatchObject({ temperatureC: 20, profile: null });
    expect(c.flags).toBeUndefined();
  });

  it("the brooding view shows each early day: deaths, feed, water, conditions, weight vs target, checks", async () => {
    const s = await setup();
    await s.call("post", "/chickstart/profiles").send(profile);
    const flock = (await s.call("post", "/flocks").send({ name: "C", flockCode: "C1", type: "broiler", houseId: s.brooder.id, placement: { date: D(-2), count: 1000, startingWeightG: 40 } })).body;
    await s.call("put", `/flocks/${flock.id}/daily-records/${D(-1)}`).send({ mortality: [{ cause: "unknown", count: 6 }], feed: [{ quantityKg: 18 }], waterLitres: 40, temperatureMinC: 30, temperatureMaxC: 33, humidityPercent: 60, averageWeight: { averageWeightG: 58, sampleSize: 50 } });
    await s.call("post", "/chickstart/checks").send({ flockId: flock.id, temperatureC: 29, cropFill: { sampled: 20, full: 18 } });
    const v = (await s.call("get", `/chickstart/flocks/${flock.id}?days=7`)).body;
    expect(v.profile).toMatchObject({ name: profile.name });
    expect(v.days.map((d: { date: string; dayOfAge: number }) => [d.date, d.dayOfAge])).toEqual([[D(-2), 0], [D(-1), 1], [D(0), 2]]);
    expect(v.days[1]).toMatchObject({ mortality: 6, feedKg: 18, waterLitres: 40, temperatureMinC: 30, temperatureMaxC: 33, humidityPercent: 60, averageWeightG: 58, targetWeightG: 60, birdsAlive: 994 });
    expect(v.days[2]).toMatchObject({ brooderChecks: 1, flaggedChecks: 1, cropFillPercent: 90 });
    expect(v.totals).toMatchObject({ mortality: 6, mortalityPercent: 0.6, daysRecorded: 1, daysWithChecks: 1, flaggedChecks: 1 });
  });
});

describe("permissions and tenancy", () => {
  it("workers record hatchery stages but cannot set batches or sell chicks; other farms see nothing", async () => {
    const s = await setup();
    const b = (await setBatch(s)).body;
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    expect((await s.call("post", `/hatchery/batches/${b.id}/candling`, worker.access).send({ date: D(-14), infertile: 10 })).status).toBe(201);
    expect((await setBatch(s, { code: "W-1" }).set(bearer(worker.access))).status).toBe(403);
    expect((await s.call("post", "/buyers", worker.access).send({ name: "x" })).status).toBe(403);
    const other = await register(s.ctx, "other@example.com");
    expect((await s.ctx.api().get(`/api/v1/farms/${other.farmId}/hatchery/batches/${b.id}`).set(bearer(other.access))).status).toBe(404);
    expect((await s.ctx.api().post(`/api/v1/farms/${other.farmId}/hatchery/batches/${b.id}/hatch`).set(bearer(other.access)).send({ date: D(0), hatched: 1 })).status).toBe(404);
    expect((await s.ctx.api().get(`/api/v1/farms/${s.owner.farmId}/calendar?from=${D(0)}&to=${D(1)}`).set(bearer(other.access))).status).toBe(404);
  });
});
