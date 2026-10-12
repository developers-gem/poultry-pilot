import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { runAlertJob } from "../jobs/alert-job.js";
import { bearer, farmBody, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (rupees: number) => ({ amountMinor: Math.round(rupees * 100), currency: "INR" });
const PDF = Buffer.from("%PDF-1.4\n% lab report\n");

async function setup() {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const call = (method: "get" | "post" | "put" | "delete", path: string, token = owner.access) => ctx.api()[method](`/api/v1/farms/${owner.farmId}${path}`).set(bearer(token));
  const house = (await call("post", "/houses").send({ name: "House A", type: "broiler" })).body;
  const house2 = (await call("post", "/houses").send({ name: "House B", type: "broiler" })).body;
  const flock = (await call("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: house.id, placement: { date: D(-30), count: 1000, startingWeightG: 40, chickCost: INR(40_000) } })).body;
  const amox = (await call("post", "/health/medicines").send({ name: "Amoxicillin 50%", type: "antibiotic", defaultRoute: "drinking_water", withdrawalMeatDays: 7, withdrawalEggDays: 10, withdrawalSource: "medicine_label", label: { name: "Product label", url: "https://example.com/label.pdf" } })).body;
  const amoxStock = (await call("post", "/inventory/items").send({ name: "Amoxicillin 50% powder", category: "medicine", unit: "g", medicineId: amox.id })).body;
  await call("post", `/inventory/items/${amoxStock.id}/purchases`).send({ date: D(-40), quantity: 1000, unitCost: INR(4), batchNumber: "AMX-1", expiryDate: D(300) });
  return { ctx, owner, call, house, house2, flock, amox, amoxStock };
}
type S = Awaited<ReturnType<typeof setup>>;

const treatment = (s: S, over: Record<string, unknown> = {}) => ({
  type: "treatment",
  date: D(-3),
  flockId: s.flock.id,
  title: "Respiratory signs in house A",
  symptoms: ["Coughing", "watery eyes"],
  observedSigns: "About 30 birds coughing at night",
  affectedBirds: 30,
  vetName: "Dr. Rao",
  assessment: { text: "Suspected bacterial respiratory infection; samples sent", by: "Dr. Rao", source: "veterinarian" },
  treatments: [{ medicineId: s.amox.id, inventoryItemId: s.amoxStock.id, quantityUsed: 250, dose: "1 g per 2 L drinking water", frequency: "Daily", startDate: D(-3), durationDays: 5, prescribedBy: "Dr. Rao", prescriptionReference: "RX-2210" }],
  cost: INR(1500),
  followUpDate: D(2),
  ...over,
});

describe("health records and treatments", () => {
  it("records what was observed and the vet's attributed assessment; computes dates; draws medicine from stock", async () => {
    const s = await setup();
    const r = await s.call("post", "/health/records").send(treatment(s));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      symptoms: ["coughing", "watery eyes"],
      assessment: { text: "Suspected bacterial respiratory infection; samples sent", by: "Dr. Rao", source: "veterinarian" },
      followUpDate: D(2),
      followUpDone: false,
    });
    // 5-day course from D(-3) ends D(1); 7 days' meat withdrawal ends D(8); 10 days' egg withdrawal ends D(11)
    expect(r.body.treatments[0]).toMatchObject({ medicineName: "Amoxicillin 50%", route: "drinking_water", endDate: D(1), withdrawalMeatDays: 7, withdrawalMeatUntil: D(8), withdrawalEggsUntil: D(11), withdrawalSource: "medicine_label", stockCostMinor: 100_000 });
    expect((await s.call("get", `/inventory/items/${s.amoxStock.id}`)).body.quantity).toBe(750);
    // Nothing the system invented: no diagnosis or recommendation fields.
    expect(Object.keys(r.body)).not.toEqual(expect.arrayContaining(["diagnosis", "recommendation", "suggestedTreatment"]));
  });

  it("does not invent a withdrawal period when none was recorded", async () => {
    const s = await setup();
    const vit = (await s.call("post", "/health/medicines").send({ name: "Vitamin AD3E", type: "vitamin_mineral" })).body;
    const r = (await s.call("post", "/health/records").send(treatment(s, { treatments: [{ medicineId: vit.id, startDate: D(-1), durationDays: 3 }] }))).body;
    expect(r.treatments[0].withdrawalMeatUntil).toBeUndefined();
    expect((await s.call("get", `/health/withdrawals/${s.flock.id}`)).body).toMatchObject({ meat: null, eggs: null });
  });

  it("a meat withdrawal blocks bird sales and moves into other flocks until it has passed", async () => {
    const s = await setup();
    await s.call("post", "/health/records").send(treatment(s));
    const sale = await s.call("post", `/flocks/${s.flock.id}/sales`).send({ date: D(0), birds: 100, total: INR(20_000) });
    expect(sale.status).toBe(422);
    expect(sale.body.error).toMatchObject({ code: "WITHDRAWAL_ACTIVE", details: { until: D(8), medicine: "Amoxicillin 50%" } });
    expect(sale.body.error.message).toMatch(new RegExp(`cannot be sold before ${D(9)}`));
    const split = await s.call("post", `/flocks/${s.flock.id}/splits`).send({ date: D(0), birds: 100, newFlock: { name: "B1b", flockCode: "B1b", houseId: s.house2.id } });
    expect(split.body.error.code).toBe("WITHDRAWAL_ACTIVE");
    expect((await s.call("get", `/health/withdrawals/${s.flock.id}`)).body.meat).toEqual({ until: D(8), medicine: "Amoxicillin 50%", birdsMaySellFrom: D(9) });
    // A course that finished long ago no longer blocks.
    const old = await setup();
    await old.call("post", "/health/records").send(treatment(old, { date: D(-20), treatments: [{ medicineId: old.amox.id, startDate: D(-20), durationDays: 5 }] }));
    expect((await old.call("post", `/flocks/${old.flock.id}/sales`).send({ date: D(0), birds: 100, total: INR(20_000) })).status).toBe(201);
  });

  it("a veterinarian's instruction can override the label period", async () => {
    const s = await setup();
    const r = (await s.call("post", "/health/records").send(treatment(s, { treatments: [{ medicineId: s.amox.id, startDate: D(-3), durationDays: 5, withdrawalMeatDays: 14, withdrawalSource: "veterinarian" }] }))).body;
    expect(r.treatments[0]).toMatchObject({ withdrawalMeatDays: 14, withdrawalMeatUntil: D(15), withdrawalSource: "veterinarian", withdrawalEggsUntil: D(11) });
  });

  it("editing reverses and re-draws medicine only when the treatment changed; deleting returns it", async () => {
    const s = await setup();
    const r = (await s.call("post", "/health/records").send(treatment(s))).body;
    const same = (await s.call("put", `/health/records/${r.id}`).send({ ...treatment(s), notes: undefined, title: "Respiratory signs (house A)", version: 0 })).body;
    expect(same.treatments[0].id).toBe(r.treatments[0].id);
    expect((await s.call("get", `/inventory/items/${s.amoxStock.id}`)).body.quantity).toBe(750);
    const t2 = treatment(s);
    t2.treatments[0]!.quantityUsed = 100;
    await s.call("put", `/health/records/${r.id}`).send({ ...t2, version: same.version });
    expect((await s.call("get", `/inventory/items/${s.amoxStock.id}`)).body.quantity).toBe(900);
    expect((await s.call("delete", `/health/records/${r.id}`)).status).toBe(204);
    expect((await s.call("get", `/inventory/items/${s.amoxStock.id}`)).body.quantity).toBe(1000);
    expect((await s.call("post", `/flocks/${s.flock.id}/sales`).send({ date: D(0), birds: 1, total: INR(200) })).status).toBe(201);
  });

  it("eggs laid during an egg withdrawal are marked withheld, and cleared if the treatment is removed", async () => {
    const s = await setup();
    const lh = (await s.call("post", "/houses").send({ name: "Layer house", type: "layer" })).body;
    const layers = (await s.call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: lh.id, placement: { date: D(-200), count: 500 } })).body;
    await s.call("put", `/flocks/${layers.id}/daily-records/${D(-5)}`).send({ eggs: { collected: 450 } });
    const r = (await s.call("post", "/health/records").send(treatment(s, { flockId: layers.id, affectedBirds: 10 }))).body;
    const day = (await s.call("put", `/flocks/${layers.id}/daily-records/${D(-1)}`).send({ eggs: { collected: 440 } })).body;
    expect(day.eggs.withheldUntil).toBe(D(11));
    expect(s.ctx.store.eggRecords.all().find((e) => e.date === D(-5))!.withheldUntil).toBeUndefined();
    await s.call("delete", `/health/records/${r.id}`);
    expect(s.ctx.store.eggRecords.all().find((e) => e.date === D(-1))!.withheldUntil).toBeUndefined();
  });

  it("vet fees and medicine used count in the flock's costs", async () => {
    const s = await setup();
    await s.call("post", "/health/records").send(treatment(s));
    const m = (await s.call("get", `/flocks/${s.flock.id}/metrics`)).body;
    expect(m.cost.otherMinor).toBe(150_000 + 100_000);
    expect(m.cost.totalMinor).toBe(4_000_000 + 250_000);
  });

  it("attachments (PDF lab reports) must belong to the farm; observations are open to workers, treatments are not", async () => {
    const s = await setup();
    const pdf = (await s.ctx.api().post(`/api/v1/farms/${s.owner.farmId}/media`).set(bearer(s.owner.access)).set("Content-Type", "application/pdf").send(PDF)).body;
    expect(pdf.contentType).toBe("application/pdf");
    const lab = (await s.call("post", "/health/records").send({ type: "lab_test", date: D(-1), flockId: s.flock.id, title: "Swab results", lab: { name: "District lab", reference: "L-55", result: "See report" }, attachments: [{ assetId: pdf.id, name: "report.pdf" }] })).body;
    expect((await s.call("get", `/health/records/${lab.id}`)).body.attachments[0].url).toBe(pdf.url);
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    expect((await s.call("post", "/health/records", worker.access).send({ type: "observation", date: D(0), flockId: s.flock.id, title: "Two lame birds", symptoms: ["lameness"] })).status).toBe(201);
    expect((await s.call("post", "/health/records", worker.access).send(treatment(s))).status).toBe(403);
    const vet = await joinAs(s.ctx, s.owner, "vet@example.com", "vet");
    expect((await s.call("post", "/health/records", vet.access).send(treatment(s))).status).toBe(201);
    expect((await s.call("post", "/health/records").send({ type: "observation", date: D(0), title: "x", treatments: [{ medicineName: "X", startDate: D(0), durationDays: 1 }] })).status).toBe(400);
  });
});

describe("vaccination", () => {
  async function vaccineStock(s: S) {
    const nd = (await s.call("post", "/health/medicines").send({ name: "ND LaSota", type: "vaccine", defaultRoute: "eye_drop" })).body;
    const item = (await s.call("post", "/inventory/items").send({ name: "ND LaSota 1000-dose vial", category: "vaccine", unit: "dose", medicineId: nd.id })).body;
    return { nd, item };
  }

  it("applies the farm's own programme by bird age, without duplicates", async () => {
    const s = await setup();
    const prog = (await s.call("post", "/health/programmes").send({ name: "Broiler programme", flockTypes: ["broiler"], source: "Dr. Rao, 2026", items: [{ dayOfAge: 7, vaccineName: "ND LaSota", route: "eye_drop" }, { dayOfAge: 14, vaccineName: "IBD" }, { dayOfAge: 35, vaccineName: "ND booster" }] })).body;
    const applied = (await s.call("post", `/health/programmes/apply/${s.flock.id}`).send({ programmeId: prog.id })).body;
    // Flock placed 30 days ago at day 0: day 7 and 14 are past (skipped), day 35 is due in 5 days.
    expect(applied.scheduled.map((v: { vaccineName: string; dueDate: string }) => [v.vaccineName, v.dueDate])).toEqual([["ND booster", D(5)]]);
    expect(applied.skipped).toBe(2);
    const withPast = (await s.call("post", `/health/programmes/apply/${s.flock.id}`).send({ programmeId: prog.id, includePast: true })).body;
    expect(withPast.scheduled.map((v: { state: string }) => v.state)).toEqual(["overdue", "overdue"]);
    expect((await s.call("post", `/health/programmes/apply/${s.flock.id}`).send({ programmeId: prog.id, includePast: true })).body.scheduled).toHaveLength(0);
    const lh = (await s.call("post", "/houses").send({ name: "LH", type: "layer" })).body;
    const layers = (await s.call("post", "/flocks").send({ name: "L", flockCode: "L", type: "layer", houseId: lh.id, placement: { date: D(-10), count: 10 } })).body;
    expect((await s.call("post", `/health/programmes/apply/${layers.id}`).send({ programmeId: prog.id })).status).toBe(400);
  });

  it("giving a vaccine from stock records each batch and expiry; expired batches are refused", async () => {
    const s = await setup();
    const { nd, item } = await vaccineStock(s);
    await s.call("post", `/inventory/items/${item.id}/purchases`).send({ date: D(-100), quantity: 1000, unitCost: INR(0.5), batchNumber: "OLD-9", expiryDate: D(-1) });
    const v = (await s.call("post", "/health/vaccinations").send({ flockId: s.flock.id, vaccineName: "ND LaSota", medicineId: nd.id, dueDate: D(0) })).body;
    const refused = await s.call("post", `/health/vaccinations/${v.id}/administer`).send({ date: D(0), inventoryItemId: item.id, dosesUsed: 1000, birdsVaccinated: 1000 });
    expect(refused.body.error).toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(refused.body.error.message).toMatch(/1000 more is expired/);
    await s.call("post", `/inventory/items/${item.id}/purchases`).send({ date: D(-5), quantity: 2000, unitCost: INR(0.6), batchNumber: "ND-2210", expiryDate: D(200) });
    const given = await s.call("post", `/health/vaccinations/${v.id}/administer`).send({ date: D(0), inventoryItemId: item.id, dosesUsed: 1000, birdsVaccinated: 1000, administeredBy: "Ravi" });
    expect(given.status).toBe(200);
    expect(given.body).toMatchObject({ status: "done", state: "done", batches: [{ batchNumber: "ND-2210", expiryDate: D(200), doses: 1000 }], stockCostMinor: 60_000 });
    expect((await s.call("post", `/health/vaccinations/${v.id}/administer`).send({ date: D(0) })).body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("hand-entered batches cannot be expired; vaccinated birds cannot exceed the flock; supervisors vaccinate, workers do not", async () => {
    const s = await setup();
    const v = (await s.call("post", "/health/vaccinations").send({ flockId: s.flock.id, vaccineName: "IBD", dueDate: D(-2) })).body;
    expect(v.state).toBe("overdue");
    expect((await s.call("post", `/health/vaccinations/${v.id}/administer`).send({ date: D(0), batches: [{ batchNumber: "X1", expiryDate: D(-1) }] })).body.error.message).toMatch(/expired/);
    expect((await s.call("post", `/health/vaccinations/${v.id}/administer`).send({ date: D(0), birdsVaccinated: 1001 })).status).toBe(400);
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    const sup = await joinAs(s.ctx, s.owner, "s@example.com", "supervisor");
    expect((await s.call("post", `/health/vaccinations/${v.id}/administer`, worker.access).send({ date: D(0) })).status).toBe(403);
    expect((await s.call("post", `/health/vaccinations/${v.id}/administer`, sup.access).send({ date: D(0), batches: [{ batchNumber: "X2", expiryDate: D(90) }] })).body.status).toBe("done");
    const v2 = (await s.call("post", "/health/vaccinations").send({ flockId: s.flock.id, vaccineName: "IB", dueDate: D(1) })).body;
    expect((await s.call("post", `/health/vaccinations/${v2.id}/skip`).send({ reason: "Vet advised against it this cycle" })).body).toMatchObject({ status: "skipped", skipReason: "Vet advised against it this cycle" });
  });
});

describe("reminders and alerts", () => {
  it("lists vaccinations, follow-ups and withdrawal end dates; the alert job raises overdue items", async () => {
    const s = await setup();
    const rec = (await s.call("post", "/health/records").send(treatment(s, { followUpDate: D(-1) }))).body;
    await s.call("post", "/health/vaccinations").send({ flockId: s.flock.id, vaccineName: "ND booster", dueDate: D(-2) });
    await s.call("post", "/health/vaccinations").send({ flockId: s.flock.id, vaccineName: "IB", dueDate: D(4) });
    const rem = (await s.call("get", "/health/reminders?days=14")).body.items.map((i: { kind: string; overdue: boolean }) => `${i.kind}:${i.overdue}`);
    expect(rem).toEqual(["vaccination:true", "follow_up:true", "vaccination:false", "withdrawal_meat_ends:false", "withdrawal_eggs_ends:false"]);
    await runAlertJob(s.ctx.container);
    const open = (await s.call("get", "/alerts?status=open")).body.items.map((a: { ruleType: string }) => a.ruleType).sort();
    expect(open).toEqual(expect.arrayContaining(["health_follow_up", "vaccination_due", "withdrawal_active"]));
    await s.call("post", `/health/records/${rec.id}/follow-up-done`);
    expect((await s.call("get", "/alerts?ruleType=health_follow_up")).body.items[0].status).toBe("resolved");
  });
});

describe("biosecurity checklists and visitors", () => {
  it("adds generic starter checklists once; editing bumps the version", async () => {
    const s = await setup();
    const first = (await s.call("post", "/biosecurity/checklists/starter")).body.added;
    expect(first.map((t: { kind: string }) => t.kind).sort()).toEqual(["audit", "cleaning", "footbath", "visitor_declaration"]);
    expect((await s.call("post", "/biosecurity/checklists/starter")).body.added).toHaveLength(0);
    const decl = first.find((t: { kind: string }) => t.kind === "visitor_declaration");
    const upd = await s.call("put", `/biosecurity/checklists/${decl.id}`).send({ name: decl.name, kind: decl.kind, items: [...decl.items, { id: "symptoms", text: "Do you have flu-like symptoms?", required: false, responseType: "yes_no", failIf: "yes" }], active: true, version: 0 });
    expect(upd.body.version).toBe(1);
    expect((await s.call("post", "/biosecurity/checklists").send({ name: "Bad", kind: "general", items: [{ id: "q", text: "Q?", responseType: "yes_no", failIf: "maybe" }] })).status).toBe(400);
  });

  it("a visitor's failed declaration and short downtime (by the farm's own rule) flag the visit, raise alerts and create actions", async () => {
    const s = await setup();
    const farm = (await s.call("get", "")).body;
    await s.call("put", "").send(farmBody(farm, { visitorDowntimeHours: 48 }));
    const decl = (await s.call("post", "/biosecurity/checklists/starter")).body.added.find((t: { kind: string }) => t.kind === "visitor_declaration");
    const answers = [{ itemId: "sick_birds_contact", answer: false }, { itemId: "other_farm_today", answer: true }, { itemId: "farm_clothing", answer: true }, { itemId: "follow_rules", answer: true }];
    const checkIn = new Date();
    const v = await s.call("post", "/biosecurity/visitors").send({
      name: "Feed rep",
      company: "Godrej",
      type: "supplier",
      vehicleRegistration: "UP14 AB 1234",
      housesVisited: [s.house.id],
      previousPoultryContact: { hadContact: true, lastContactAt: new Date(checkIn.getTime() - 12 * 3_600_000).toISOString(), description: "Visited a broiler farm this morning" },
      declaration: { declaredName: "Amit Kumar", checklist: { templateId: decl.id, answers } },
      ppeUsed: ["boots", "overalls"],
      footbathUsed: true,
      checkInAt: checkIn.toISOString(),
    });
    expect(v.status).toBe(201);
    expect(v.body).toMatchObject({ downtimeHours: 12, requiredDowntimeHours: 48, flags: ["downtime_short", "declaration_failed"], declaration: { declaredName: "Amit Kumar", checklist: { failedCount: 1 } } });
    const alerts = (await s.call("get", "/alerts?status=open")).body.items.map((a: { ruleType: string }) => a.ruleType);
    expect(alerts).toEqual(expect.arrayContaining(["biosecurity_breach", "checklist_failed"]));
    const actions = (await s.call("get", "/biosecurity/corrective-actions")).body.items;
    expect(actions.map((a: { title: string }) => a.title)).toEqual(["Fix: Have you visited another poultry farm, market or hatchery today?"]);
    const incomplete = await s.call("post", "/biosecurity/visitors").send({ name: "X", type: "other", previousPoultryContact: { hadContact: false }, declaration: { declaredName: "X", checklist: { templateId: decl.id, answers: [answers[0]] } } });
    expect(incomplete.body.error.code).toBe("CHECKLIST_INCOMPLETE");
    expect((await s.call("post", `/biosecurity/visitors/${v.body.id}/check-out`).send({})).body.checkOutAt).toBeTruthy();
    expect((await s.call("get", "/biosecurity/visitors?flagged=true")).body.items).toHaveLength(1);
  });

  it("without a farm downtime rule, nothing is flagged for downtime", async () => {
    const s = await setup();
    const v = (await s.call("post", "/biosecurity/visitors").send({ name: "Vet", type: "vet", previousPoultryContact: { hadContact: true, lastContactAt: new Date(Date.now() - 3_600_000).toISOString() } })).body;
    expect(v.downtimeHours).toBeCloseTo(1, 0);
    expect(v.flags).toBeUndefined();
  });
});

describe("biosecurity logs, equipment, cleaning and corrective actions", () => {
  it("each log type keeps its own details; problems create actions and alerts; products come out of stock", async () => {
    const s = await setup();
    const dis = (await s.call("post", "/inventory/items").send({ name: "Virkon S", category: "disinfectant", unit: "kg" })).body;
    await s.call("post", `/inventory/items/${dis.id}/purchases`).send({ date: D(-10), quantity: 10, unitCost: INR(900) });
    const disinfection = await s.call("post", "/biosecurity/logs").send({ type: "disinfection", date: D(0), houseId: s.house.id, product: { inventoryItemId: dis.id, quantityUsed: 0.5, concentration: "1%" } });
    expect(disinfection.body.product).toMatchObject({ name: "Virkon S", quantityUsed: 0.5, stockCostMinor: 45_000 });
    expect((await s.call("get", `/inventory/items/${dis.id}`)).body.quantity).toBe(9.5);
    expect((await s.call("post", "/biosecurity/logs").send({ type: "footbath", date: D(0), footbath: { action: "changed", disinfectant: "Virkon S", concentration: "1%" } })).status).toBe(201);
    expect((await s.call("post", "/biosecurity/logs").send({ type: "footbath", date: D(0) })).status).toBe(400);
    await s.call("post", "/biosecurity/logs").send({ type: "vehicle", date: D(0), vehicle: { registration: "UP14 CD 9", purpose: "Feed delivery", disinfected: false } });
    await s.call("post", "/biosecurity/logs").send({ type: "pest_control", date: D(0), pest: { pestType: "rodents", method: "Bait station check", stationsChecked: 12, activityFound: true } });
    const wild = await s.call("post", "/biosecurity/logs").send({ type: "wild_bird_observation", date: D(0), wildBird: { description: "Crows near the feed store", count: 6, location: "Feed store", contactWithFeedOrWater: true, deadWildBirdsFound: 2 } });
    expect(wild.status).toBe(201);
    const alert = (await s.call("get", "/alerts?ruleType=wild_bird_contact")).body.items[0];
    expect(alert).toMatchObject({ severity: "critical", title: "Dead wild birds found (2)" });
    expect(alert.message).toMatch(/follow your local reporting requirements/);
    const titles = (await s.call("get", "/biosecurity/corrective-actions")).body.items.map((a: { title: string }) => a.title).sort();
    expect(titles).toEqual(["Pest activity found (rodents)", "Vehicle UP14 CD 9 entered without disinfection"]);
  });

  it("equipment moves are traced; moving without disinfection creates an action", async () => {
    const s = await setup();
    const scale = (await s.call("post", "/biosecurity/equipment").send({ name: "Weighing scale", type: "scale", houseId: s.house.id })).body;
    const move = (await s.call("post", `/biosecurity/equipment/${scale.id}/moves`).send({ date: D(0), toHouseId: s.house2.id, disinfected: false, movedBy: "Ravi" })).body;
    expect(move).toMatchObject({ fromHouseId: s.house.id, toHouseId: s.house2.id, disinfected: false });
    expect((await s.call("get", "/biosecurity/equipment")).body.items[0].houseId).toBe(s.house2.id);
    expect((await s.call("get", "/biosecurity/corrective-actions")).body.items[0].title).toBe("Disinfect Weighing scale after its move");
    expect((await s.call("post", `/biosecurity/equipment/${scale.id}/moves`).send({ date: D(0), toHouseId: s.house2.id, disinfected: true })).status).toBe(400);
  });

  it("completing a cleaning schedule needs its checklist, writes the log and moves the next due date", async () => {
    const s = await setup();
    const tpl = (await s.call("post", "/biosecurity/checklists/starter")).body.added.find((t: { kind: string }) => t.kind === "cleaning");
    const sched = (await s.call("post", "/biosecurity/cleaning-schedules").send({ title: "Weekly drinker clean", schedule: "weekly", houseIds: [s.house.id], checklistTemplateId: tpl.id, nextDueDate: D(-1) })).body;
    expect((await s.call("get", "/biosecurity/cleaning-schedules")).body.items[0].overdue).toBe(true);
    expect((await s.call("post", `/biosecurity/cleaning-schedules/${sched.id}/complete`).send({ date: D(0) })).body.error.code).toBe("CHECKLIST_INCOMPLETE");
    const answers = tpl.items.map((i: { id: string }) => ({ itemId: i.id, answer: true }));
    const done = (await s.call("post", `/biosecurity/cleaning-schedules/${sched.id}/complete`).send({ date: D(0), checklist: { templateId: tpl.id, answers } })).body;
    expect(done).toMatchObject({ nextDueDate: D(7), log: { type: "cleaning", houseId: s.house.id, cleaningTaskId: sched.id, checklist: { failedCount: 0 } } });
  });

  it("corrective actions are completed by staff and verified by someone else", async () => {
    const s = await setup();
    const worker = await joinAs(s.ctx, s.owner, "w@example.com", "worker");
    const act = (await s.call("post", "/biosecurity/corrective-actions").send({ title: "Repair gap in house A netting", assigneeUserId: worker.userId, dueDate: D(1), houseId: s.house.id })).body;
    expect((await s.call("post", `/biosecurity/corrective-actions/${act.id}/verify`)).body.error.code).toBe("INVALID_STATE_TRANSITION");
    expect((await s.call("post", `/biosecurity/corrective-actions/${act.id}/complete`, worker.access).send({ resolutionNotes: "Netting patched and tied" })).body.status).toBe("done");
    expect((await s.call("post", `/biosecurity/corrective-actions/${act.id}/verify`, worker.access)).status).toBe(403);
    expect((await s.call("post", `/biosecurity/corrective-actions/${act.id}/verify`)).body.verifiedBy).toBe(s.owner.userId);
    const mine = (await s.call("post", "/biosecurity/corrective-actions").send({ title: "Self check" })).body;
    await s.call("post", `/biosecurity/corrective-actions/${mine.id}/complete`).send({ resolutionNotes: "Done myself" });
    expect((await s.call("post", `/biosecurity/corrective-actions/${mine.id}/verify`)).body.error.message).toMatch(/Someone other than/);
    expect((await s.call("post", "/biosecurity/corrective-actions").send({ title: "x", assigneeUserId: "0192a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b" })).status).toBe(400);
  });

  it("summary counts visitors, actions, cleaning and recent checks", async () => {
    const s = await setup();
    await s.call("post", "/biosecurity/visitors").send({ name: "Vet", type: "vet", previousPoultryContact: { hadContact: false } });
    await s.call("post", "/biosecurity/logs").send({ type: "footbath", date: D(0), footbath: { action: "checked" } });
    await s.call("post", "/biosecurity/corrective-actions").send({ title: "Overdue fix", dueDate: D(-1) });
    expect((await s.call("get", "/biosecurity/summary")).body).toMatchObject({ visitorsToday: 1, visitorsOnSite: 1, openCorrectiveActions: 1, overdueCorrectiveActions: 1, lastFootbathCheck: D(0) });
  });
});

describe("educational content and tenancy", () => {
  it("articles carry their sources and are global, not country rules", async () => {
    const s = await setup();
    await s.ctx.container.content.seed();
    await s.ctx.container.content.seed(); // idempotent
    const list = (await s.call("get", "/content/articles?tag=health")).body.items;
    expect(list.map((a: { slug: string }) => a.slug).sort()).toEqual(["when-to-call-your-veterinarian", "withdrawal-periods"]);
    const one = (await s.call("get", "/content/articles/withdrawal-periods")).body;
    expect(one.references.length).toBeGreaterThan(0);
    expect(one.content).toMatch(/does not supply withdrawal periods/);
    expect(one.content).toMatch(/not veterinary advice/);
    expect(one.region).toBe("GLOBAL");
    expect((await s.call("get", "/content/articles/nope")).status).toBe(404);
  });

  it("another farm's health records, vaccinations and visitors are not found", async () => {
    const s = await setup();
    const rec = (await s.call("post", "/health/records").send(treatment(s))).body;
    const vacc = (await s.call("post", "/health/vaccinations").send({ flockId: s.flock.id, vaccineName: "IB", dueDate: D(1) })).body;
    const visitor = (await s.call("post", "/biosecurity/visitors").send({ name: "V", type: "other", previousPoultryContact: { hadContact: false } })).body;
    const other = await register(s.ctx, "other@example.com");
    const theirs = (m: "get" | "post" | "put" | "delete", p: string) => s.ctx.api()[m](`/api/v1/farms/${other.farmId}${p}`).set(bearer(other.access));
    expect((await theirs("get", `/health/records/${rec.id}`)).status).toBe(404);
    expect((await theirs("post", `/health/vaccinations/${vacc.id}/skip`).send({ reason: "nope nope" })).status).toBe(404);
    expect((await theirs("post", `/biosecurity/visitors/${visitor.id}/check-out`).send({})).status).toBe(404);
    expect((await theirs("post", "/health/records").send(treatment(s))).status).toBe(404); // the flock is not theirs
    expect((await s.ctx.api().get(`/api/v1/farms/${s.owner.farmId}/health/records`).set(bearer(other.access))).status).toBe(404);
  });
});
