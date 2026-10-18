import { describe, expect, it } from "vitest";
import { addDays, localDateOf } from "../domain/index.js";
import { runAlertJob } from "../jobs/alert-job.js";
import { bearer, joinAs, makeApp, register } from "./harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (rupees: number) => ({ amountMinor: Math.round(rupees * 100), currency: "INR" });
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16, 1)]);

async function setup() {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const call = (method: "get" | "post" | "put" | "delete", path: string, token = owner.access) => ctx.api()[method](`/api/v1/farms/${owner.farmId}${path}`).set(bearer(token));
  const house = (await call("post", "/houses").send({ name: "House A", type: "broiler" })).body;
  const cash = (await call("post", "/finance/accounts").send({ name: "Cash box", type: "cash", openingBalance: INR(10_000), openingDate: D(-90) })).body;
  const bank = (await call("post", "/finance/accounts").send({ name: "SBI current", type: "bank", openingBalance: INR(50_000), openingDate: D(-90) })).body;
  const supplier = (await call("post", "/finance/suppliers").send({ name: "Godrej Agrovet", phone: "+91 11 1234", taxId: "09ABCDE1234F1Z5" })).body;
  return { ctx, owner, call, house, cash, bank, supplier };
}
type S = Awaited<ReturnType<typeof setup>>;
const balance = async (s: S, id: string) => (await s.call("get", "/finance/accounts")).body.items.find((a: { id: string }) => a.id === id).balanceMinor;

describe("accounts and transfers", () => {
  it("transfers move money between accounts without touching profit; cash cannot go below zero", async () => {
    const s = await setup();
    const t = await s.call("post", "/finance/transfers").send({ date: D(-1), fromAccountId: s.bank.id, toAccountId: s.cash.id, amount: INR(5000), reference: "ATM" });
    expect(t.status).toBe(201);
    expect(await balance(s, s.bank.id)).toBe(4_500_000);
    expect(await balance(s, s.cash.id)).toBe(1_500_000);
    const over = await s.call("post", "/finance/transfers").send({ date: D(0), fromAccountId: s.cash.id, toAccountId: s.bank.id, amount: INR(15_001) });
    expect(over.body.error).toMatchObject({ code: "INSUFFICIENT_FUNDS", details: { balanceMinor: 1_500_000 } });
    expect((await s.call("post", "/finance/transfers").send({ date: D(0), fromAccountId: s.cash.id, toAccountId: s.cash.id, amount: INR(1) })).status).toBe(400);
    const pnl = (await s.call("get", `/finance/reports/pnl?from=${D(-30)}&to=${D(0)}`)).body;
    expect(pnl).toMatchObject({ netProfitMinor: 0, revenue: { totalMinor: 0 }, expenses: { totalMinor: 0 } });
  });
});

describe("bills, incomes, payments and refunds", () => {
  it("a bill with tax: partial and full payment, no overpayment, supplier refund", async () => {
    const s = await setup();
    const asset = (await s.ctx.api().post(`/api/v1/farms/${s.owner.farmId}/media`).set(bearer(s.owner.access)).set("Content-Type", "image/png").send(PNG)).body;
    const bill = (await s.call("post", "/finance/expenses").send({ kind: "expense", date: D(-10), dueDate: D(5), category: "electricity", description: "September electricity", amount: INR(10_000), tax: { ratePercent: 18, inclusive: false, label: "GST" }, supplierId: s.supplier.id, houseId: s.house.id, invoiceNumber: "EB-0912", attachments: [{ assetId: asset.id, name: "bill.png" }] })).body;
    expect(bill).toMatchObject({ amount: INR(11_800), net: INR(10_000), tax: { label: "GST", ratePercent: 18, amountMinor: 180_000 }, status: "unpaid", outstandingMinor: 1_180_000, bucket: "current" });
    const part = (await s.call("post", `/finance/expenses/${bill.id}/payments`).send({ date: D(-5), amount: INR(5000), accountId: s.bank.id, method: "bank_transfer", reference: "NEFT123" })).body;
    expect(part.document).toMatchObject({ status: "partially_paid", outstandingMinor: 680_000 });
    expect(part.transaction).toMatchObject({ kind: "payment", direction: "out", accountId: s.bank.id, documentType: "expense", supplierId: s.supplier.id, houseId: s.house.id });
    const over = await s.call("post", `/finance/expenses/${bill.id}/payments`).send({ date: D(-4), amount: INR(6801), accountId: s.bank.id, method: "cash" });
    expect(over.body.error.message).toMatch(/overpay by 100/);
    await s.call("post", `/finance/expenses/${bill.id}/payments`).send({ date: D(-4), amount: INR(6800), accountId: s.bank.id, method: "bank_transfer" });
    expect(await balance(s, s.bank.id)).toBe(5_000_000 - 1_180_000);
    const refund = (await s.call("post", `/finance/expenses/${bill.id}/refunds`).send({ date: D(-2), amount: INR(800), accountId: s.cash.id, method: "cash", reason: "Billing error credited back" })).body;
    expect(refund.document).toMatchObject({ status: "partially_paid" });
    expect(refund.transaction).toMatchObject({ kind: "refund", direction: "in" });
    expect(await balance(s, s.cash.id)).toBe(1_080_000);
    expect((await s.call("post", `/finance/expenses/${bill.id}/refunds`).send({ date: D(-1), amount: INR(20_000), accountId: s.cash.id, method: "cash", reason: "too much" })).body.error.message).toMatch(/cannot exceed/);
    expect((await s.call("post", "/finance/expenses").send({ date: D(0), category: "rent", description: "x", amount: { amountMinor: 100, currency: "USD" } })).body.error.message).toMatch(/farm currency \(INR\)/);
  });

  it("income received now; receivables and payables are aged by days past due", async () => {
    const s = await setup();
    const paidNow = (await s.call("post", "/finance/incomes").send({ kind: "income", date: D(-3), category: "manure_sales", description: "Manure, 2 trolleys", amount: INR(3000), customerName: "Village nursery", paidNow: { accountId: s.cash.id, method: "cash" } })).body;
    expect(paidNow).toMatchObject({ status: "paid", outstandingMinor: 0 });
    expect(await balance(s, s.cash.id)).toBe(1_300_000);
    await s.call("post", "/finance/incomes").send({ kind: "sale", date: D(-50), dueDate: D(-40), category: "egg_sales", description: "Eggs on credit", amount: INR(12_000), customerName: "Hotel Raj" });
    const recv = (await s.call("get", "/finance/reports/receivables")).body;
    expect(recv).toMatchObject({ totalOutstandingMinor: 1_200_000, buckets: { "31_60": 1_200_000 } });
    expect(recv.items[0]).toMatchObject({ daysOverdue: 40, bucket: "31_60" });
  });

  it("only unpaid, hand-entered documents can be cancelled", async () => {
    const s = await setup();
    const bill = (await s.call("post", "/finance/expenses").send({ date: D(0), category: "rent", description: "Rent", amount: INR(8000) })).body;
    await s.call("post", `/finance/expenses/${bill.id}/payments`).send({ date: D(0), amount: INR(1000), accountId: s.cash.id, method: "cash" });
    expect((await s.call("post", `/finance/expenses/${bill.id}/cancel`).send({ reason: "Duplicate" })).body.error.message).toMatch(/refund them before cancelling/);
    // The same rent, same day: the API asks first (it looks like the same bill typed twice) ...
    expect((await s.call("post", "/finance/expenses").send({ date: D(0), category: "rent", description: "Rent 2", amount: INR(8000) })).body.error.code).toBe("POSSIBLE_DUPLICATE");
    // ... and saves it when the person confirms.
    const other = (await s.call("post", "/finance/expenses").send({ date: D(0), category: "rent", description: "Rent 2", amount: INR(8000), allowDuplicate: true })).body;
    expect((await s.call("post", `/finance/expenses/${other.id}/cancel`).send({ reason: "Duplicate" })).body.status).toBe("cancelled");
  });
});

describe("automatic postings from other modules", () => {
  it("a feed purchase becomes a payable to the supplier; vet fees become bills that follow the record", async () => {
    const s = await setup();
    const feed = (await s.call("post", "/inventory/items").send({ name: "Starter", category: "feed", unit: "kg", feed: { stage: "starter" } })).body;
    await s.call("post", `/inventory/items/${feed.id}/purchases`).send({ date: D(-5), quantity: 1000, unitCost: INR(30), supplierId: s.supplier.id, batchNumber: "B1", invoiceNumber: "GA-77" });
    const payables = (await s.call("get", "/finance/reports/payables")).body;
    expect(payables.items[0]).toMatchObject({ kind: "purchase", category: "feed", supplierId: s.supplier.id, sourceType: "inventory_purchase", amount: INR(30_000), invoiceNumber: "GA-77" });
    expect((await s.call("get", `/finance/suppliers/${s.supplier.id}`)).body.outstandingMinor).toBe(3_000_000);

    const flock = (await s.call("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: s.house.id, placement: { date: D(-30), count: 1000 } })).body;
    const rec = (await s.call("post", "/health/records").send({ type: "vet_visit", date: D(-2), flockId: flock.id, title: "Routine visit", vetName: "Dr. Rao", cost: INR(1500) })).body;
    const vet = () => s.call("get", "/finance/expenses").then((r) => r.body.items.filter((x: { sourceType: string }) => x.sourceType === "health_record"));
    expect(await vet()).toEqual([expect.objectContaining({ category: "vet_services", vendor: "Dr. Rao", amount: INR(1500), flockId: flock.id, status: "unpaid" })]);
    await s.call("put", `/health/records/${rec.id}`).send({ type: "vet_visit", date: D(-2), flockId: flock.id, title: "Routine visit", vetName: "Dr. Rao", cost: INR(2000), version: rec.version });
    expect((await vet()).map((x: { status: string; amount: { amountMinor: number } }) => `${x.status}:${x.amount.amountMinor}`).sort()).toEqual(["cancelled:150000", "unpaid:200000"]);
    await s.call("delete", `/health/records/${rec.id}`);
    expect((await vet()).every((x: { status: string }) => x.status === "cancelled")).toBe(true);
  });

  it("a bird sale becomes a receivable; reversing it cancels the receivable, unless it was paid", async () => {
    const s = await setup();
    const flock = (await s.call("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: s.house.id, placement: { date: D(-40), count: 1000 } })).body;
    const sale = (await s.call("post", `/flocks/${flock.id}/sales`).send({ date: D(-1), birds: 100, totalLiveWeightKg: 220, pricePerKg: INR(110) })).body;
    const income = (await s.call("get", "/finance/incomes")).body.items[0];
    expect(income).toMatchObject({ category: "bird_sales", sourceType: "flock_sale", sourceId: sale.id, flockId: flock.id, amount: INR(24_200), status: "unpaid" });
    await s.call("post", `/flocks/${flock.id}/events/${sale.id}/reverse`).send({ reason: "Wrong flock" });
    expect((await s.call("get", `/finance/incomes/${income.id}`)).body.status).toBe("cancelled");

    const sale2 = (await s.call("post", `/flocks/${flock.id}/sales`).send({ date: D(-1), birds: 100, total: INR(24_000) })).body;
    const inc2 = (await s.call("get", "/finance/incomes?status=unpaid")).body.items[0];
    await s.call("post", `/finance/incomes/${inc2.id}/payments`).send({ date: D(0), amount: INR(10_000), accountId: s.cash.id, method: "cash" });
    expect((await s.call("post", `/flocks/${flock.id}/events/${sale2.id}/reverse`).send({ reason: "Oops" })).body.error.message).toMatch(/refund them before cancelling/);
    expect((await s.call("get", `/flocks/${flock.id}`)).body.currentBirdCount).toBe(900);
  });
});

describe("recurring expenses", () => {
  it("creates each monthly bill once, skipping paused months", async () => {
    const s = await setup();
    const rec = (await s.call("post", "/finance/recurring").send({ name: "Farm hand wages", category: "labour", amount: INR(12_000), frequency: "monthly", startDate: D(-70) })).body;
    // Due D(-70), then a month later twice more up to today.
    const first = (await s.call("post", "/finance/recurring/generate")).body;
    expect(first.created).toBe(3);
    expect((await s.call("post", "/finance/recurring/generate")).body.created).toBe(0);
    await s.call("post", `/finance/recurring/${rec.id}/pause`).send({ from: D(1) });
    await runAlertJob(s.ctx.container);
    const bills = (await s.call("get", "/finance/expenses")).body.items.filter((b: { sourceType: string }) => b.sourceType === "recurring_expense");
    expect(bills).toHaveLength(3);
    expect(bills.every((b: { category: string; amount: { amountMinor: number } }) => b.category === "labour" && b.amount.amountMinor === 1_200_000)).toBe(true);
  });
});

describe("reports", () => {
  async function trade(s: S) {
    await s.call("post", "/finance/incomes").send({ kind: "sale", date: D(-10), category: "egg_sales", description: "Eggs", amount: INR(11_800), tax: { ratePercent: 18, inclusive: true, label: "GST" }, customerName: "Hotel Raj", paidNow: { accountId: s.bank.id, method: "upi" } });
    await s.call("post", "/finance/incomes").send({ kind: "sale", date: D(-8), category: "manure_sales", description: "Manure", amount: INR(2000), customerName: "Nursery" });
    await s.call("post", "/finance/expenses").send({ date: D(-9), category: "labour", description: "Wages", amount: INR(6000), houseId: s.house.id, paidNow: { accountId: s.cash.id, method: "cash" } });
    await s.call("post", "/finance/expenses").send({ date: D(-7), category: "electricity", description: "Power", amount: INR(2000), supplierId: s.supplier.id });
  }

  it("P&L (accrual, excluding tax) and cash flow (cash, by account, transfers not counted)", async () => {
    const s = await setup();
    await trade(s);
    await s.call("post", "/finance/transfers").send({ date: D(-5), fromAccountId: s.bank.id, toAccountId: s.cash.id, amount: INR(1000) });
    const pnl = (await s.call("get", `/finance/reports/pnl?from=${D(-30)}&to=${D(0)}`)).body;
    expect(pnl).toMatchObject({ basis: "accrual", revenue: { totalMinor: 1_200_000 }, expenses: { totalMinor: 800_000 }, netProfitMinor: 400_000, tax: { onSalesMinor: 180_000, onPurchasesMinor: 0 } });
    expect(pnl.revenue.byCategory).toEqual([{ key: "egg_sales", amountMinor: 1_000_000 }, { key: "manure_sales", amountMinor: 200_000 }]);
    const cf = (await s.call("get", `/finance/reports/cash-flow?from=${D(-30)}&to=${D(0)}`)).body;
    expect(cf).toMatchObject({ basis: "cash", inflows: { totalMinor: 1_180_000 }, outflows: { totalMinor: 600_000 }, netCashFlowMinor: 580_000, transfersMinor: 100_000 });
    expect(cf.accounts.find((a: { name: string }) => a.name === "Cash box")).toMatchObject({ openingMinor: 1_000_000, inMinor: 100_000, outMinor: 600_000, closingMinor: 500_000 });
    expect(cf.accounts.find((a: { name: string }) => a.name === "SBI current")).toMatchObject({ openingMinor: 5_000_000, inMinor: 1_180_000, outMinor: 100_000, closingMinor: 6_080_000 });
  });

  it("expense and revenue breakdowns", async () => {
    const s = await setup();
    await trade(s);
    const exp = (await s.call("get", `/finance/reports/expenses?from=${D(-30)}&to=${D(0)}`)).body;
    expect(exp.totalMinor).toBe(800_000);
    expect(exp.bySupplier).toEqual(expect.arrayContaining([{ key: "Godrej Agrovet", amountMinor: 200_000 }]));
    expect(exp.byHouse).toEqual(expect.arrayContaining([{ key: "House A", amountMinor: 600_000 }, { key: "unassigned", amountMinor: 200_000 }]));
    const rev = (await s.call("get", `/finance/reports/revenue?from=${D(-30)}&to=${D(0)}`)).body;
    expect(rev.byCustomer).toEqual([{ key: "Hotel Raj", amountMinor: 1_000_000 }, { key: "Nursery", amountMinor: 200_000 }]);
  });

  it("flock profitability counts every cost once: chicks, feed eaten, vet fees, allocated bills; cost per bird, kg and egg", async () => {
    const s = await setup();
    const flock = (await s.call("post", "/flocks").send({ name: "B1", flockCode: "B1", type: "broiler", houseId: s.house.id, placement: { date: D(-35), count: 1000, startingWeightG: 40, chickCost: INR(40_000) } })).body;
    const feed = (await s.call("post", "/inventory/items").send({ name: "Starter", category: "feed", unit: "kg", feed: { stage: "starter" } })).body;
    await s.call("post", `/inventory/items/${feed.id}/purchases`).send({ date: D(-34), quantity: 4000, unitCost: INR(30), supplierId: s.supplier.id });
    await s.call("put", `/flocks/${flock.id}/daily-records/${D(-2)}`).send({ feed: [{ feedItemId: feed.id, quantityKg: 3000 }] });
    await s.call("post", "/health/records").send({ type: "vet_visit", date: D(-10), flockId: flock.id, title: "Visit", cost: INR(1500) });
    await s.call("post", "/finance/expenses").send({ date: D(-5), category: "labour", description: "Catching crew", amount: INR(3500), flockId: flock.id });
    await s.call("post", "/finance/incomes").send({ kind: "income", date: D(-1), category: "manure_sales", description: "Litter from B1", amount: INR(2000), flockId: flock.id });
    await s.call("post", `/flocks/${flock.id}/weighings`).send({ date: D(-1), averageWeightG: 2000, sampleSize: 50 });
    await s.call("post", `/flocks/${flock.id}/sales`).send({ date: D(0), birds: 500, totalLiveWeightKg: 1000, pricePerKg: INR(110) });
    const row = (await s.call("get", `/finance/reports/flock-profitability?flockId=${flock.id}`)).body.flocks[0];
    // Costs: chicks ₹40,000 + feed eaten 3000 kg × ₹30 = ₹90,000 + vet ₹1,500 + catching crew ₹3,500 = ₹1,35,000.
    // The ₹1,20,000 feed purchase bill is not counted again (only feed eaten is); the vet bill is counted once.
    expect(row.cost.totalMinor).toBe(13_500_000);
    // Revenue: sale ₹1,10,000 (not counted twice through its receivable) + litter ₹2,000.
    expect(row.revenueMinor).toBe(11_200_000);
    expect(row.profitMinor).toBe(-2_300_000);
    expect(row.costPerBirdMinor).toBe(13_500); // ₹1,35,000 / 1000 birds
    // 500 alive × 2.0 kg + 1000 kg sold − 40 kg arrived = 1960 kg produced
    expect(row.costPerKgProducedMinor).toBe(Math.round(13_500_000 / 1960));
    expect(row.costPerEggMinor).toBeNull();
    const houses = (await s.call("get", "/finance/reports/house-costing")).body.houses;
    expect(houses[0]).toMatchObject({ name: "House A", flockCostMinor: 13_500_000, totalCostMinor: 13_500_000 });
  });
});

describe("PoultryMarket", () => {
  async function market() {
    const s = await setup();
    const lh = (await s.call("post", "/houses").send({ name: "Layer house", type: "layer" })).body;
    const layers = (await s.call("post", "/flocks").send({ name: "L1", flockCode: "L1", type: "layer", houseId: lh.id, placement: { date: D(-200), count: 2000 } })).body;
    await s.call("put", `/flocks/${layers.id}/daily-records/${D(-1)}`).send({ eggs: { collected: 1800, byGrade: { large: 1500 } } });
    const listing = (await s.call("post", "/market/listings").send({ title: "Large brown eggs", category: "eggs", quantityAvailable: 40, unit: "tray", price: INR(180), priceUnit: "per_tray", regionCode: "IN-UP", locationLabel: "Ghaziabad", fulfilmentOptions: ["pickup", "seller_delivery"], source: { kind: "eggs", eggGrade: "large" } })).body;
    await s.call("post", `/market/listings/${listing.id}/status`).send({ status: "active" });
    const buyer = await register(s.ctx, "buyer@example.com");
    const b = (method: "get" | "post", path: string) => s.ctx.api()[method](`/api/v1/market${path}`).set(bearer(buyer.access));
    return { ...s, layers, listing, buyer, b };
  }

  it("buyers browse active listings without seller contact; price comes from the listing; sellers cannot buy their own", async () => {
    const m = await market();
    const browse = (await m.b("get", "/listings?category=eggs&region=IN")).body.items;
    expect(browse).toHaveLength(1);
    expect(browse[0]).toMatchObject({ title: "Large brown eggs", price: INR(180), seller: { name: "Green Valley Poultry" } });
    expect(JSON.stringify(browse[0])).not.toMatch(/owner@example.com|source/);
    expect((await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 10, fulfilment: "pickup", buyerName: "Ravi", price: INR(1) })).status).toBe(400);
    const own = await m.ctx.api().post("/api/v1/market/orders").set(bearer(m.owner.access)).send({ listingId: m.listing.id, quantity: 1, fulfilment: "pickup", buyerName: "Me" });
    expect(own.body.error.message).toMatch(/own farm/);
    expect((await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 41, fulfilment: "pickup", buyerName: "Ravi" })).body.error.code).toBe("INSUFFICIENT_STOCK");
    expect((await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 5, fulfilment: "courier", buyerName: "Ravi" })).body.error.message).toMatch(/offers pickup or seller_delivery/);
    expect((await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 5, fulfilment: "seller_delivery", buyerName: "Ravi" })).body.error.message).toMatch(/delivery address/);
  });

  it("PENDING → ACCEPTED → PREPARING → DISPATCHED → DELIVERED → COMPLETED with stock, receivable and payment", async () => {
    const m = await market();
    const order = (await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 10, fulfilment: "seller_delivery", deliveryAddress: "Shop 4, Raj Nagar", buyerName: "Ravi Traders", buyerPhone: "+91 98765 00000" })).body;
    expect(order).toMatchObject({ status: "pending", total: INR(1800), sellerContact: null, nextStatuses: ["accepted", "cancelled"] });
    const sel = (path: string, body: object = {}) => m.call("post", `/market/orders/${order.id}/${path}`).send(body);

    expect((await sel("deliver")).body.error.code).toBe("INVALID_STATE_TRANSITION");
    const accepted = (await sel("accept")).body;
    expect(accepted).toMatchObject({ status: "accepted", incomeId: expect.any(String) });
    expect((await m.call("get", "/market/listings")).body.items[0].quantityAvailable).toBe(30);
    expect((await m.call("get", `/finance/incomes/${accepted.incomeId}`)).body).toMatchObject({ category: "egg_sales", sourceType: "market_order", amount: INR(1800), customerName: "Ravi Traders", status: "unpaid" });
    expect((await m.b("get", `/orders/${order.id}`)).body.sellerContact).toMatchObject({ email: "owner@example.com" });
    await sel("prepare");
    expect((await sel("deliver")).body.error.message).toMatch(/Dispatch the order/);
    expect((await sel("dispatch", { vehicle: "UP14 AB 1234", driver: "Sonu", expectedDate: D(0) })).body).toMatchObject({ status: "dispatched", delivery: { vehicle: "UP14 AB 1234", driver: "Sonu" } });
    expect((await sel("cancel", { reason: "Changed mind" })).body.error.code).toBe("INVALID_STATE_TRANSITION");
    const received = (await m.b("post", `/orders/${order.id}/received`)).body;
    expect(received.status).toBe("delivered");
    expect((await m.call("get", "/inventory/eggs")).body.byGrade.large).toBe(1500 - 300); // 10 trays × 30 eggs
    expect((await m.b("post", `/orders/${order.id}/complete`)).body.error.message).toMatch(/full payment/);
    const paid = (await m.call("post", `/market/orders/${order.id}/payments`).send({ date: D(0), amount: INR(1800), accountId: m.cash.id, method: "upi", reference: "UPI-991" })).body;
    expect(paid.order).toMatchObject({ paymentStatus: "paid", outstandingMinor: 0 });
    expect((await m.call("get", `/finance/incomes/${accepted.incomeId}`)).body.status).toBe("paid");
    expect(await balance(m, m.cash.id)).toBe(1_180_000);
    expect((await m.b("post", `/orders/${order.id}/complete`)).body.status).toBe("completed");
    expect((await sel("cancel", { reason: "x x x" })).body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("buyers cancel only early; cancelling restores the listing and the receivable; paid orders must be refunded first", async () => {
    const m = await market();
    const o1 = (await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 25, fulfilment: "pickup", buyerName: "A" })).body;
    const o2 = (await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 20, fulfilment: "pickup", buyerName: "B" })).body;
    await m.call("post", `/market/orders/${o1.id}/accept`);
    // Each fitted alone, but together they exceed the 40 trays: the second acceptance is refused.
    expect((await m.call("post", `/market/orders/${o2.id}/accept`)).body.error).toMatchObject({ code: "INSUFFICIENT_STOCK", details: { available: 15 } });
    expect((await m.b("post", `/orders/${o2.id}/cancel`).send({ reason: "Found elsewhere" })).body).toMatchObject({ status: "cancelled", cancelledBy: "buyer" });
    await m.call("post", `/market/orders/${o1.id}/payments`).send({ date: D(0), amount: INR(1000), accountId: m.cash.id, method: "cash" });
    expect((await m.call("post", `/market/orders/${o1.id}/cancel`).send({ reason: "Out of stock" })).body.error.message).toMatch(/refund them before cancelling/);
    await m.call("post", `/market/orders/${o1.id}/refunds`).send({ date: D(0), amount: INR(1000), accountId: m.cash.id, method: "cash", reason: "Order cancelled" });
    const cancelled = (await m.call("post", `/market/orders/${o1.id}/cancel`).send({ reason: "Out of stock" })).body;
    expect(cancelled).toMatchObject({ status: "cancelled", paymentStatus: "refunded", cancelledBy: "seller" });
    expect((await m.call("get", "/market/listings")).body.items[0]).toMatchObject({ quantityAvailable: 40, status: "active" });
    expect((await m.call("get", `/finance/incomes/${cancelled.incomeId}`)).body.status).toBe("cancelled");
    expect(await balance(m, m.cash.id)).toBe(1_000_000);
    const o3 = (await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 1, fulfilment: "pickup", buyerName: "C" })).body;
    await m.call("post", `/market/orders/${o3.id}/accept`);
    await m.call("post", `/market/orders/${o3.id}/prepare`);
    expect((await m.b("post", `/orders/${o3.id}/cancel`).send({ reason: "Late" })).body.error.message).toMatch(/ask the seller/);
  });

  it("pickup orders are collected, never dispatched; buyers cannot drive the seller's steps", async () => {
    const m = await market();
    const o = (await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 2, fulfilment: "pickup", buyerName: "D" })).body;
    expect((await m.b("post", `/orders/${o.id}/received`)).body.error.code).toBe("INVALID_STATE_TRANSITION");
    await m.call("post", `/market/orders/${o.id}/accept`);
    expect((await m.call("post", `/market/orders/${o.id}/dispatch`).send({})).body.error.message).toMatch(/collected, not dispatched/);
    expect((await m.call("post", `/market/orders/${o.id}/deliver`).send({ receivedBy: "D himself" })).body).toMatchObject({ status: "delivered", delivery: { receivedBy: "D himself" } });
  });

  it("live birds sold through the market go through the flock engine: no double income, and withdrawal periods still apply", async () => {
    const m = await market();
    const flock = (await m.call("post", "/flocks").send({ name: "B9", flockCode: "B9", type: "broiler", houseId: m.house.id, placement: { date: D(-40), count: 500 } })).body;
    const listing = (await m.call("post", "/market/listings").send({ title: "Live broilers", category: "live_birds", quantityAvailable: 300, unit: "bird", price: INR(250), priceUnit: "per_bird", regionCode: "IN-UP", fulfilmentOptions: ["pickup"], source: { kind: "flock", flockId: flock.id } })).body;
    await m.call("post", `/market/listings/${listing.id}/status`).send({ status: "active" });
    const o = (await m.b("post", "/orders").send({ listingId: listing.id, quantity: 100, fulfilment: "pickup", buyerName: "E" })).body;
    await m.call("post", `/market/orders/${o.id}/accept`);
    const med = (await m.call("post", "/health/medicines").send({ name: "Enro", type: "antibiotic", withdrawalMeatDays: 5 })).body;
    await m.call("post", "/health/records").send({ type: "treatment", date: D(-1), flockId: flock.id, title: "T", treatments: [{ medicineId: med.id, startDate: D(-1), durationDays: 2 }] });
    expect((await m.call("post", `/market/orders/${o.id}/deliver`).send({})).body.error.code).toBe("WITHDRAWAL_ACTIVE");
    const rec = (await m.call("get", "/health/records")).body.items[0];
    await m.call("delete", `/health/records/${rec.id}`);
    expect((await m.call("post", `/market/orders/${o.id}/deliver`).send({})).body.status).toBe("delivered");
    expect((await m.call("get", `/flocks/${flock.id}`)).body.currentBirdCount).toBe(400);
    const incomes = (await m.call("get", "/finance/incomes")).body.items.filter((x: { status: string }) => x.status !== "cancelled");
    expect(incomes.map((x: { sourceType: string }) => x.sourceType)).toEqual(["market_order"]);
  });

  it("buyer management: history and what each buyer owes", async () => {
    const m = await market();
    const buyer = (await m.call("post", "/buyers").send({ name: "Sharma Poultry", type: "farm" })).body;
    const b = (await m.call("post", "/hatchery/batches").send({ code: "H1", eggSource: "purchased", eggsReceived: 100, setDate: D(-21) })).body;
    await m.call("post", `/hatchery/batches/${b.id}/hatch`).send({ date: D(0), hatched: 90 });
    const g = (await m.call("post", `/hatchery/batches/${b.id}/grading`).send({ date: D(0), saleable: 90 })).body;
    const co = (await m.call("post", "/chick-orders").send({ buyerId: buyer.id, quantity: 50, unitPrice: INR(40), chickLotId: g.chickLot.id })).body;
    await m.call("post", `/chick-orders/${co.id}/confirm`);
    await m.call("post", `/chick-orders/${co.id}/deliver`).send({ date: D(0) });
    await m.call("post", `/chick-orders/${co.id}/payments`).send({ date: D(0), amount: INR(500), accountId: m.cash.id, method: "cash" });
    const detail = (await m.call("get", `/buyers/${buyer.id}`)).body;
    expect(detail.totals).toEqual({ orders: 1, deliveredOrders: 1, salesMinor: 200_000, outstandingMinor: 150_000 });
    expect((await m.call("put", `/buyers/${buyer.id}`).send({ name: "Sharma Poultry Farms", type: "farm", phone: "+91 90000 11111", version: buyer.version })).body.name).toBe("Sharma Poultry Farms");
  });

  it("another buyer cannot see or act on someone's order; workers cannot see money", async () => {
    const m = await market();
    const o = (await m.b("post", "/orders").send({ listingId: m.listing.id, quantity: 1, fulfilment: "pickup", buyerName: "F" })).body;
    const stranger = await register(m.ctx, "stranger@example.com");
    expect((await m.ctx.api().get(`/api/v1/market/orders/${o.id}`).set(bearer(stranger.access))).status).toBe(404);
    expect((await m.ctx.api().post(`/api/v1/market/orders/${o.id}/cancel`).set(bearer(stranger.access)).send({ reason: "hijack" })).status).toBe(404);
    expect((await m.ctx.api().post(`/api/v1/farms/${stranger.farmId}/market/orders/${o.id}/accept`).set(bearer(stranger.access))).status).toBe(404);
    const worker = await joinAs(m.ctx, m.owner, "w@example.com", "worker");
    expect((await m.call("get", "/finance/reports/pnl?from=2026-01-01&to=2026-12-31", worker.access)).status).toBe(403);
    const acct = await joinAs(m.ctx, m.owner, "acc@example.com", "accountant");
    expect((await m.call("post", "/finance/expenses", acct.access).send({ date: D(0), category: "rent", description: "Rent", amount: INR(100) })).status).toBe(201);
    expect((await m.call("post", `/market/orders/${o.id}/accept`, acct.access)).status).toBe(403);
  });
});
