import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (rupees: number) => ({ amountMinor: Math.round(rupees * 100), currency: "INR" });
const HOSTILE = "=HYPERLINK(\"http://evil.example\",\"click\")";

/** One farm with something in every module. */
async function farm() {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const call = (method: "get" | "post" | "put", path: string, token = owner.access) => ctx.api()[method](`/api/v1/farms/${owner.farmId}${path}`).set(bearer(token));
  const bh = (await call("post", "/houses").send({ name: "Broiler house", type: "broiler" })).body;
  const lh = (await call("post", "/houses").send({ name: "Layer house", type: "layer" })).body;
  const broilers = (await call("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: bh.id, placement: { date: D(-20), count: 1000, startingWeightG: 40, chickCost: INR(40_000) } })).body;
  const layers = (await call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: lh.id, placement: { date: D(-200), count: 500 } })).body;
  const feed = (await call("post", "/inventory/items").send({ name: "Starter", category: "feed", unit: "kg", feed: { stage: "starter" } })).body;
  const supplier = (await call("post", "/finance/suppliers").send({ name: "Godrej Agrovet" })).body;
  await call("post", `/inventory/items/${feed.id}/purchases`).send({ date: D(-10), quantity: 2000, unitCost: INR(30), supplierId: supplier.id, batchNumber: "B-77" });
  await call("put", `/flocks/${broilers.id}/daily-records/${D(-3)}`).send({ mortality: [{ cause: "heat_stress", count: 5 }], feed: [{ feedItemId: feed.id, quantityKg: 300 }], waterLitres: 600 });
  await call("put", `/flocks/${broilers.id}/daily-records/${D(-2)}`).send({ mortality: [{ cause: "unknown", count: 3 }], feed: [{ feedItemId: feed.id, quantityKg: 310 }, { feedItemId: feed.id, quantityKg: 10, kind: "wastage" }] });
  await call("post", `/flocks/${broilers.id}/weighings`).send({ date: D(-1), averageWeightG: 900 });
  await call("put", `/flocks/${layers.id}/daily-records/${D(-2)}`).send({ eggs: { collected: 450, broken: 9, byGrade: { large: 300, medium: 141 } } });
  await call("put", `/flocks/${layers.id}/daily-records/${D(-1)}`).send({ eggs: { collected: 440, broken: 4 } });
  const med = (await call("post", "/health/medicines").send({ name: "Amoxicillin", type: "antibiotic", withdrawalMeatDays: 7, withdrawalSource: "medicine_label" })).body;
  await call("post", "/health/records").send({ type: "treatment", date: D(-4), flockId: broilers.id, title: HOSTILE, assessment: { text: "Respiratory signs", by: "Dr. Rao", source: "veterinarian" }, treatments: [{ medicineId: med.id, startDate: D(-4), durationDays: 3, prescribedBy: "Dr. Rao" }] });
  await call("post", "/health/vaccinations").send({ flockId: broilers.id, vaccineName: "IBD", dueDate: D(-5) });
  const batch = (await call("post", "/hatchery/batches").send({ code: "H1", eggSource: "purchased", eggsReceived: 1000, setDate: D(-21) })).body;
  await call("post", `/hatchery/batches/${batch.id}/candling`).send({ date: D(-14), infertile: 80, cracked: 10 });
  await call("post", `/hatchery/batches/${batch.id}/hatch`).send({ date: D(0), hatched: 820 });
  const graded = (await call("post", `/hatchery/batches/${batch.id}/grading`).send({ date: D(0), saleable: 800, culled: 20 })).body;
  await call("post", "/biosecurity/visitors").send({ name: "Feed rep", company: "Godrej", type: "supplier", previousPoultryContact: { hadContact: true, lastContactAt: new Date(Date.now() - 12 * 3600_000).toISOString() } });
  await call("post", "/biosecurity/logs").send({ type: "footbath", date: D(-1), footbath: { action: "changed", disinfectant: "Virkon" } });
  const cash = (await call("post", "/finance/accounts").send({ name: "Cash", type: "cash", openingBalance: INR(10_000), openingDate: D(-60) })).body;
  await call("post", "/finance/incomes").send({ kind: "sale", date: D(-5), category: "egg_sales", description: "Eggs", amount: INR(6000), customerName: "Hotel Raj", paidNow: { accountId: cash.id, method: "cash" } });
  await call("post", "/finance/expenses").send({ date: D(-6), category: "labour", description: "Wages", amount: INR(4000), paidNow: { accountId: cash.id, method: "cash" } });
  const buyer = (await call("post", "/buyers").send({ name: HOSTILE })).body;
  const order = (await call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 100, unitPrice: INR(40), chickLotId: graded.chickLot.id })).body;
  await call("post", `/chick-orders/${order.id}/confirm`);
  return { ctx, owner, call, broilers, layers };
}
type F = Awaited<ReturnType<typeof farm>>;
const json = async (f: F, type: string, extra = "", token?: string) => (await f.call("get", `/reports/${type}?format=json&from=${D(-29)}&to=${D(0)}${extra}`, token)).body;
const section = (doc: { sections: { title: string }[] }, title: string) => doc.sections.find((s) => s.title === title) as unknown as { kind: string; rows: Record<string, unknown>[]; items: { label: string; value: unknown }[]; totals?: Record<string, unknown> };
const item = (s: { items: { label: string; value: unknown }[] }, label: string) => s.items.find((i) => i.label === label)?.value;

describe("report catalog and permissions", () => {
  it("lists the nine reports with what each person may export", async () => {
    const f = await farm();
    const all = (await f.call("get", "/reports")).body.items;
    expect(all.map((r: { type: string }) => r.type)).toEqual(["farm", "flock", "egg", "feed", "health", "hatchery", "biosecurity", "financial", "marketplace"]);
    expect(all.every((r: { available: boolean }) => r.available)).toBe(true);
    const worker = await joinAs(f.ctx, f.owner, "w@example.com", "worker");
    const w = (await f.call("get", "/reports", worker.access)).body.items;
    expect(w.filter((r: { available: boolean }) => !r.available).map((r: { type: string }) => r.type)).toEqual(["financial", "marketplace"]);
  });

  it("refuses reports a role may not see, and leaves money out of the rest", async () => {
    const f = await farm();
    const worker = await joinAs(f.ctx, f.owner, "w@example.com", "worker");
    for (const type of ["financial", "marketplace"]) expect((await f.call("get", `/reports/${type}?format=pdf`, worker.access)).status).toBe(403);
    const farmDoc = await json(f, "farm", "", worker.access);
    expect(section(farmDoc, "Money (excluding tax)")).toBeUndefined();
    expect(farmDoc.notes).toContain("Money figures are left out: your role does not include finance.");
    const flockDoc = await json(f, "flock", `&flockId=${f.broilers.id}`, worker.access);
    expect(section(flockDoc, "Costs and revenue (to date)")).toBeUndefined();
    // Workers may see stock, so they get purchases and stock, but not prices.
    const feedDoc = await json(f, "feed", "", worker.access);
    expect(feedDoc.notes).toContain("Feed prices are left out: your role does not include finance.");
    expect((section(feedDoc, "Feed purchased") as unknown as { columns: { key: string }[] }).columns.map((c) => c.key)).not.toContain("unitCost");
    const accountant = await joinAs(f.ctx, f.owner, "a@example.com", "accountant");
    expect((await f.call("get", `/reports/financial?format=json`, accountant.access)).status).toBe(200);
    const other = await register(f.ctx, "other@example.com");
    expect((await f.ctx.api().get(`/api/v1/farms/${f.owner.farmId}/reports/farm?format=json`).set(bearer(other.access))).status).toBe(404);
  });

  it("checks periods and required inputs, and records every export in the audit log", async () => {
    const f = await farm();
    expect((await f.call("get", `/reports/farm?from=${D(-400)}&to=${D(0)}`)).body.error.message).toMatch(/at most 366 days/);
    expect((await f.call("get", `/reports/farm?from=${D(0)}&to=${D(-1)}`)).status).toBe(400);
    expect((await f.call("get", "/reports/flock?format=json")).body.error.message).toMatch(/Choose a flock/);
    expect((await f.call("get", "/reports/nonsense")).status).toBe(400);
    await f.call("get", "/reports/financial?format=csv");
    const audit = (await f.call("get", "/audit")).body.items;
    expect(audit.find((a: { action: string }) => a.action === "report.exported")).toMatchObject({ entityId: "financial", changes: { format: { after: "csv" } } });
  });
});

describe("report content comes from backend records", () => {
  it("farm, flock, egg and feed reports", async () => {
    const f = await farm();
    const farmDoc = await json(f, "farm");
    expect(farmDoc).toMatchObject({ title: "Farm report", farmName: "Green Valley Poultry", currency: "INR", period: { from: D(-29), to: D(0) } });
    expect(item(section(farmDoc, "Farm"), "Birds alive now")).toBe(992 + 500);
    expect(section(farmDoc, "Production by day").totals).toMatchObject({ deaths: 8, eggs: 890, feedKg: 610, waterL: 600 });
    // Accrual: ₹6,000 eggs + ₹4,000 accepted chick order − ₹4,000 wages − ₹60,000 feed purchase bill = −₹54,000.
    expect(item(section(farmDoc, "Money (excluding tax)"), "Net profit")).toBe(-5_400_000);

    const flockDoc = await json(f, "flock", `&flockId=${f.broilers.id}`);
    expect(item(section(flockDoc, "Flock B1"), "Birds alive")).toBe(992);
    const days = section(flockDoc, "Every day of the period");
    expect(days.rows.find((r) => r["date"] === D(-3))).toMatchObject({ deaths: 5, feedKg: 300, waterL: 600, alive: 1000 });
    expect(days.rows.find((r) => r["date"] === D(-1))).toMatchObject({ weightG: 900 });
    expect(item(section(flockDoc, "Costs and revenue (to date)"), "Total cost")).toBeGreaterThan(4_000_000);

    const eggDoc = await json(f, "egg");
    expect(section(eggDoc, "Eggs in the period").items.slice(0, 3).map((i) => i.value)).toEqual([890, 13, 1.5]);
    expect(section(eggDoc, "Eggs by day and flock").rows[0]).toMatchObject({ flock: "L1", collected: 450, large: 300, medium: 141, henDay: 90 });

    const feedDoc = await json(f, "feed");
    expect(section(feedDoc, "Feed by flock in the period").rows.find((r) => r["flock"] === "B1")).toMatchObject({ eatenKg: 610, wastedKg: 10 });
    expect(section(feedDoc, "Feed purchased").rows[0]).toMatchObject({ item: "Starter", qty: 2000, supplier: "Godrej Agrovet", batch: "B-77", unitCost: 3000, total: 6_000_000 });
    expect(section(feedDoc, "Feed in stock now").rows[0]).toMatchObject({ item: "Starter", kg: 1380 });
  });

  it("health, hatchery, biosecurity, financial and marketplace reports", async () => {
    const f = await farm();
    const health = await json(f, "health");
    expect(section(health, "Treatments and withdrawal periods").rows[0]).toMatchObject({ flock: "B1", medicine: "Amoxicillin", end: D(-2), meatUntil: D(5), source: "medicine label", prescribedBy: "Dr. Rao" });
    expect(section(health, "Deaths by cause").rows).toEqual([{ cause: "heat stress", birds: 5 }, { cause: "unknown", birds: 3 }]);
    expect(section(health, "Vaccinations due in the period").rows[0]).toMatchObject({ vaccine: "IBD", status: "scheduled" });

    const hatch = await json(f, "hatchery");
    expect(section(hatch, "Batches").rows[0]).toMatchObject({ code: "H1", eggsSet: 1000, infertile: 80, cracked: 10, hatched: 820, deadInShell: 90, saleable: 800, saleablePct: 80, loss: 20 });

    const bio = await json(f, "biosecurity");
    expect(item(section(bio, "Biosecurity in the period"), "Visitors")).toBe(1);
    expect(section(bio, "Log entries")[`rows`][0]).toMatchObject({ type: "footbath", detail: "changed" });

    const fin = await json(f, "financial");
    expect(item(section(fin, "Profit and loss (accrual, excluding tax)"), "Revenue")).toBe(1_000_000); // eggs ₹6,000 + chick order ₹4,000
    expect(section(fin, "Cash flow by account").rows[0]).toMatchObject({ account: "Cash", opening: 1_000_000, in: 600_000, out: 400_000, closing: 1_200_000 });
    expect(section(fin, "Spending by supplier").rows.map((r) => r["supplier"])).toContain("Godrej Agrovet");

    const market = await json(f, "marketplace");
    expect(section(market, "Orders").rows[0]).toMatchObject({ number: 1, channel: "direct", qty: 100, total: 400_000, status: "accepted", payment: "unpaid" });
  });
});

describe("formats", () => {
  it("CSV: UTF-8 with BOM, sections, money in major units, formula injection neutralised", async () => {
    const f = await farm();
    const res = await f.call("get", `/reports/health?format=csv&from=${D(-29)}&to=${D(0)}`);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toBe(`attachment; filename="poultrypilot-health-report-green-valley-poultry-${D(-29)}-to-${D(0)}.csv"`);
    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain("Health report");
    expect(text).toContain("Treatments and withdrawal periods");
    expect(text).toContain(`"'=HYPERLINK(""http://evil.example"",""click"")"`);
    expect(text).not.toMatch(/^=HYPERLINK/m);
    const fin = (await f.call("get", `/reports/financial?format=csv&from=${D(-29)}&to=${D(0)}`)).text;
    expect(fin).toContain("Revenue,10000");
    expect(fin).toContain("Amount (INR)");
  });

  it("Excel: a summary sheet and one sheet per table, numbers stay numbers, hostile text stays text", async () => {
    const f = await farm();
    const res = await f.call("get", `/reports/marketplace?format=xlsx&from=${D(-29)}&to=${D(0)}`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Summary", "Orders", "Listings"]);
    const orders = wb.getWorksheet("Orders")!;
    expect(orders.getRow(1).getCell(8).value).toBe("Total (INR)");
    const total = orders.getRow(2).getCell(8);
    expect(total.value).toBe(4000);
    expect(total.numFmt).toBe("#,##0.00");
    const buyerCell = orders.getRow(2).getCell(4);
    expect(buyerCell.type).toBe(ExcelJS.ValueType.String);
    expect(buyerCell.value).toBe(`'${HOSTILE}`);
  });

  it("PDF: a real PDF with the report, farm, amounts and page numbers", async () => {
    const f = await farm();
    const res = await f.call("get", `/reports/farm?format=pdf&from=${D(-29)}&to=${D(0)}`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    const pdf = res.body as Buffer;
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    let text = "";
    try {
      const dir = mkdtempSync(join(tmpdir(), "pp-pdf-"));
      writeFileSync(join(dir, "r.pdf"), pdf);
      text = execFileSync("pdftotext", ["-layout", join(dir, "r.pdf"), "-"]).toString();
    } catch {
      return; // pdftotext not installed: the header check above still ran
    }
    expect(text).toContain("Farm report");
    expect(text).toContain("Green Valley Poultry");
    expect(text).toContain("INR -54,000.00"); // net profit
    expect(text).toMatch(/page 1 of \d/);
  });
});
