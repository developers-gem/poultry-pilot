import { describe, expect, it } from "vitest";
import { assertOrderTransition, ORDER_TRANSITIONS } from "../../domain/orders.js";
import { bearer, makeApp, register } from "../harness.js";
import { D } from "./seed.js";

/** A small seeded PRNG: every run takes the same "random" path, so a failure is reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(lo: number, hi: number) {
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
    pick<T>(xs: T[]): T {
      return xs[Math.floor(this.next() * xs.length)]!;
    },
  };
}
const INR = (minor: number) => ({ amountMinor: minor, currency: "INR" });

async function farm() {
  const ctx = makeApp();
  const o = await register(ctx, "owner@example.com");
  const call = (m: "get" | "post" | "put" | "patch" | "delete", p: string, body?: object) => ctx.api()[m](`/api/v1/farms/${o.farmId}${p}`).set(bearer(o.access)).send(body ?? {});
  return { ctx, o, call };
}

describe("flock counts stay consistent", () => {
  it("over 120 random deaths, culls, sales, transfers and reversals: counts match, never negative, impossible moves refused", async () => {
    const { call } = await farm();
    const house = (await call("post", "/houses", { name: "H", type: "broiler" })).body;
    const A = (await call("post", "/flocks", { name: "A", flockCode: "A", type: "broiler", houseId: house.id, placement: { date: D(-30), count: 400 } })).body;
    const B = (await call("post", "/flocks", { name: "B", flockCode: "B", type: "broiler", houseId: house.id, placement: { date: D(-30), count: 150 } })).body;
    const model: Record<string, number> = { [A.id]: 400, [B.id]: 150 };
    const reversible: { flockId: string; birds: number }[] = [];
    const r = rng(20261016);
    for (let step = 0; step < 120; step++) {
      const id = r.pick([A.id, B.id]);
      const other = id === A.id ? B.id : A.id;
      const n = r.int(1, 60);
      const kind = r.pick(["mortality", "cull", "sale", "transfer", "reverse"]);
      const date = D(0); // today: the running model is exact (back-dating is tested separately below)
      let res: { status: number; body: any };
      if (kind === "mortality") res = await call("post", `/flocks/${id}/mortality`, { date, count: n, cause: "unknown" });
      else if (kind === "cull") res = await call("post", `/flocks/${id}/culls`, { date, count: n });
      else if (kind === "sale") res = await call("post", `/flocks/${id}/sales`, { date, birds: n, pricePerBird: INR(25000) });
      else if (kind === "transfer") res = await call("post", `/flocks/${id}/transfers`, { mode: "flock", date, toFlockId: other, birds: n });
      else {
        const events = (await call("get", `/flocks/${id}/events`)).body.items as { id: string; type: string; birds?: number; reversed?: boolean; reversedBy?: string; reversalOf?: string }[];
        const target = events.filter((e) => (e.type === "mortality" || e.type === "cull") && !e.reversed && !e.reversedBy && !e.reversalOf).pop();
        if (!target) continue;
        res = await call("post", `/flocks/${id}/events/${target.id}/reverse`, { reason: "Entered by mistake" });
        if (res.status < 300) model[id]! += target.birds ?? 0;
        else expect(res.status).toBeLessThan(500);
      }
      const fits = n <= model[id]!;
      if (kind !== "reverse") {
        if (res.status < 300) {
          expect(fits, `step ${step}: ${kind} of ${n} accepted with only ${model[id]} birds`).toBe(true);
          model[id]! -= n;
          if (kind === "transfer") model[other]! += n;
        } else {
          expect(res.status, `step ${step}: ${kind} ${n} → ${JSON.stringify(res.body).slice(0, 120)}`).toBeLessThan(500);
          if (fits) expect.fail(`step ${step}: valid ${kind} of ${n} (of ${model[id]}) refused: ${JSON.stringify(res.body).slice(0, 200)}`);
        }
      }
      for (const f of [A.id, B.id]) {
        const view = (await call("get", `/flocks/${f}`)).body;
        expect(view.currentBirdCount, `step ${step} flock count`).toBe(model[f]);
        expect(view.currentBirdCount).toBeGreaterThanOrEqual(0);
        expect(view.metrics?.currentBirdCount ?? view.currentBirdCount).toBe(model[f]);
      }
      void reversible;
    }
  }, 60_000);
});

describe("flock counts are valid on every date, not just today", () => {
  it("a back-dated death that would leave the flock negative on that day is refused", async () => {
    const { call } = await farm();
    const house = (await call("post", "/houses", { name: "H", type: "broiler" })).body;
    const A = (await call("post", "/flocks", { name: "A", flockCode: "A", type: "broiler", houseId: house.id, placement: { date: D(-30), count: 100 } })).body;
    const B = (await call("post", "/flocks", { name: "B", flockCode: "B", type: "broiler", houseId: house.id, placement: { date: D(-30), count: 100 } })).body;
    expect((await call("post", `/flocks/${A.id}/transfers`, { mode: "flock", date: D(-2), toFlockId: B.id, birds: 50 })).status).toBeLessThan(300);
    // B has 150 birds today, but only 100 ten days ago: 120 deaths then are impossible.
    const r = await call("post", `/flocks/${B.id}/mortality`, { date: D(-10), count: 120, cause: "unknown" });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("INSUFFICIENT_BIRDS");
    expect((await call("get", `/flocks/${B.id}`)).body.currentBirdCount).toBe(150);
  });
});

describe("inventory stays consistent", () => {
  it("over 100 random purchases, uses, wastage, removals and counts: stock = lots = model, never negative", async () => {
    const { call } = await farm();
    const house = (await call("post", "/houses", { name: "H", type: "layer" })).body;
    const flock = (await call("post", "/flocks", { name: "L", flockCode: "L", type: "layer", houseId: house.id, placement: { date: D(-60), count: 500 } })).body;
    const item = (await call("post", "/inventory/items", { name: "Mash", category: "feed", unit: "kg", feed: { stage: "layer" } })).body;
    let model = 0;
    const uses: { id: string; kg: number }[] = [];
    const r = rng(42);
    const stock = async () => (await call("get", "/feed/stock")).body.items.find((i: { itemId: string }) => i.itemId === item.id)?.quantityKg ?? 0;
    for (let step = 0; step < 100; step++) {
      const kind = r.pick(["purchase", "use", "use", "waste", "remove", "count"]);
      const kg = r.int(1, 300);
      const date = D(-r.int(0, 10));
      if (kind === "purchase") {
        const res = await call("post", `/inventory/items/${item.id}/purchases`, { date: D(-15), quantity: kg, unitCost: INR(r.int(2000, 4000)) });
        expect(res.status).toBe(201);
        model += kg;
      } else if (kind === "use" || kind === "waste") {
        const res = await call("post", "/feed/consumption", { date, flockId: flock.id, feedItemId: item.id, quantityKg: kg, ...(kind === "waste" ? { kind: "wastage", reason: "Spilled" } : {}) });
        if (kg <= model + 1e-9) {
          expect(res.status, `step ${step}: ${kind} ${kg} of ${model}`).toBeLessThan(300);
          model -= kg;
          uses.push({ id: res.body.id, kg });
        } else expect(res.status, `step ${step}: over-use ${kg} > ${model} accepted`).toBeGreaterThanOrEqual(400);
      } else if (kind === "remove" && uses.length) {
        const u = uses.splice(r.int(0, uses.length - 1), 1)[0]!;
        const res = await call("delete", `/feed/consumption/${u.id}`);
        expect(res.status).toBeLessThan(300);
        model += u.kg;
      } else if (kind === "count") {
        const counted = r.int(0, Math.max(0, Math.round(model)));
        const res = await call("post", `/inventory/items/${item.id}/counts`, { date: D(0), countedQuantity: counted, reason: "Weekly count" });
        if (res.status < 300) model = counted;
        else expect(res.status).toBeLessThan(500);
      }
      const onHand = await stock();
      expect(onHand, `step ${step} (${kind})`).toBeCloseTo(model, 6);
      expect(onHand).toBeGreaterThanOrEqual(0);
      const lots = (await call("get", `/inventory/lots?itemId=${item.id}`)).body.items as { quantityRemaining: number }[];
      expect(lots.every((l) => l.quantityRemaining >= 0)).toBe(true);
      expect(lots.reduce((t, l) => t + l.quantityRemaining, 0)).toBeCloseTo(onHand, 6);
    }
  }, 60_000);
});

describe("money stays exact", () => {
  it("over 80 random incomes, part payments, overpayment attempts and transfers: balances and P&L match to the minor unit", async () => {
    const { call } = await farm();
    const cash = (await call("post", "/finance/accounts", { name: "Cash", type: "cash", openingBalance: INR(1_000_000), openingDate: D(-90) })).body;
    const bank = (await call("post", "/finance/accounts", { name: "Bank", type: "bank", openingBalance: INR(5_000_000), openingDate: D(-90) })).body;
    const balance: Record<string, number> = { [cash.id]: 1_000_000, [bank.id]: 5_000_000 };
    const bills: { id: string; amount: number; paid: number }[] = [];
    let revenue = 0;
    let expenses = 0;
    const r = rng(7);
    for (let step = 0; step < 80; step++) {
      const kind = r.pick(["income", "bill", "pay", "pay", "overpay", "transfer"]);
      const account = r.pick([cash.id, bank.id]);
      const amount = r.int(1, 2_000_000); // minor units: never floats
      if (kind === "income") {
        expect((await call("post", "/finance/incomes", { kind: "sale", date: D(-r.int(0, 20)), category: "egg_sales", description: "Eggs", amount: INR(amount), paidNow: { accountId: account, method: "cash" } })).status).toBe(201);
        balance[account]! += amount;
        revenue += amount;
      } else if (kind === "bill") {
        const b = await call("post", "/finance/expenses", { date: D(-r.int(0, 20)), category: "labour", description: "Wages", amount: INR(amount) });
        expect(b.status).toBe(201);
        bills.push({ id: b.body.id, amount, paid: 0 });
        expenses += amount;
      } else if ((kind === "pay" || kind === "overpay") && bills.length) {
        const bill = r.pick(bills);
        const left = bill.amount - bill.paid;
        const pay = kind === "overpay" ? left + r.int(1, 1000) : Math.max(1, Math.min(left, r.int(1, left || 1)));
        const res = await call("post", `/finance/expenses/${bill.id}/payments`, { date: D(0), amount: INR(pay), accountId: account, method: "cash" });
        if (pay <= left && left > 0) {
          expect(res.status, `step ${step}: pay ${pay} of ${left}`).toBe(201);
          bill.paid += pay;
          balance[account]! -= pay;
        } else expect(res.status, `step ${step}: overpayment ${pay} > ${left} accepted`).toBeGreaterThanOrEqual(400);
      } else if (kind === "transfer") {
        const to = account === cash.id ? bank.id : cash.id;
        const res = await call("post", "/finance/transfers", { date: D(0), fromAccountId: account, toAccountId: to, amount: INR(amount) });
        if (res.status < 300) {
          balance[account]! -= amount;
          balance[to]! += amount;
        } else expect(res.status).toBeLessThan(500);
      }
      const accounts = (await call("get", "/finance/accounts")).body.items as { id: string; balanceMinor: number }[];
      for (const a of accounts) {
        expect(Number.isInteger(a.balanceMinor)).toBe(true);
        expect(a.balanceMinor, `step ${step} balance`).toBe(balance[a.id]);
      }
    }
    const pnl = (await call("get", `/finance/reports/pnl?from=${D(-90)}&to=${D(0)}`)).body;
    expect(pnl.revenue.totalMinor).toBe(revenue);
    expect(pnl.expenses.totalMinor).toBe(expenses);
    expect(pnl.netProfitMinor).toBe(revenue - expenses);
    const list = (await call("get", "/finance/expenses?limit=500")).body.items as { id: string; outstandingMinor: number }[];
    for (const b of bills) expect(list.find((x) => x.id === b.id)!.outstandingMinor).toBe(b.amount - b.paid);
  }, 60_000);
});

describe("order state machine", () => {
  const statuses = Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[];
  /** The rules as written in the product spec, independently of the implementation. */
  function oracle(from: string, to: string, actor: "seller" | "buyer", fulfilment: string, paid: boolean): boolean {
    const next: Record<string, string[]> = { pending: ["accepted", "cancelled"], accepted: ["preparing", "dispatched", "delivered", "cancelled"], preparing: ["dispatched", "delivered", "cancelled"], dispatched: ["delivered"], delivered: ["completed"], completed: [], cancelled: [] };
    if (!next[from]!.includes(to)) return false;
    if (fulfilment === "pickup" && to === "dispatched") return false;
    if (fulfilment !== "pickup" && to === "delivered" && from !== "dispatched") return false;
    if (actor === "buyer" && !["cancelled", "delivered", "completed"].includes(to)) return false;
    if (actor === "buyer" && to === "cancelled" && !["pending", "accepted"].includes(from)) return false;
    if (actor === "buyer" && to === "delivered" && from !== "dispatched") return false;
    if (to === "completed" && !paid) return false;
    return true;
  }

  it("every (from, to, actor, delivery, payment) combination matches the spec; terminal states have no exits", () => {
    let checked = 0;
    for (const from of statuses)
      for (const to of statuses)
        for (const actor of ["seller", "buyer"] as const)
          for (const fulfilment of ["pickup", "seller_delivery", "courier"] as const)
            for (const paid of [true, false]) {
              let ok = true;
              try {
                assertOrderTransition({ status: from, fulfilment, paymentStatus: paid ? "paid" : "partially_paid" }, to, actor);
              } catch {
                ok = false;
              }
              expect(ok, `${from} → ${to} by ${actor} (${fulfilment}, ${paid ? "paid" : "unpaid"})`).toBe(oracle(from, to, actor, fulfilment, paid));
              checked++;
            }
    expect(checked).toBe(7 * 7 * 2 * 3 * 2);
    expect(ORDER_TRANSITIONS.completed).toEqual([]);
    expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
  });

  it("through the API: no payment before acceptance, no completion before full payment, no overpayment, no cancel after payment; stock reserved once", async () => {
    const { ctx, o, call } = await farm();
    const buyer = await register(ctx, "buyer@example.com");
    const listing = (await call("post", "/market/listings", { title: "Eggs", category: "eggs", quantityAvailable: 10, unit: "tray", price: INR(18000), priceUnit: "per_tray", regionCode: "IN-UP", fulfilmentOptions: ["pickup"] })).body;
    await call("post", `/market/listings/${listing.id}/status`, { status: "active" });
    const cash = (await call("post", "/finance/accounts", { name: "Cash", type: "cash", openingBalance: INR(0), openingDate: D(-1) })).body;
    const order = (await ctx.api().post("/api/v1/market/orders").set(bearer(buyer.access)).send({ listingId: listing.id, quantity: 4, fulfilment: "pickup", buyerName: "Ravi" })).body;
    const pay = (minor: number) => call("post", `/market/orders/${order.id}/payments`, { date: D(0), amount: INR(minor), accountId: cash.id, method: "cash" });
    expect((await pay(1000)).status).toBeGreaterThanOrEqual(400); // not accepted yet
    expect((await call("post", `/market/orders/${order.id}/accept`)).status).toBeLessThan(300);
    expect((await call("post", `/market/orders/${order.id}/accept`)).status).toBeGreaterThanOrEqual(400); // twice: refused
    expect((await ctx.api().get(`/api/v1/market/listings/${listing.id}`).set(bearer(buyer.access))).body.quantityAvailable).toBe(6); // reserved once
    expect((await ctx.api().post(`/api/v1/market/orders/${order.id}/complete`).set(bearer(buyer.access))).status).toBeGreaterThanOrEqual(400);
    expect((await pay(72_001)).status).toBeGreaterThanOrEqual(400); // more than owed
    expect((await pay(30_000)).status).toBe(201);
    expect((await call("post", `/market/orders/${order.id}/cancel`, { reason: "Changed mind" })).status).toBeGreaterThanOrEqual(400); // money recorded
    expect((await call("post", `/market/orders/${order.id}/deliver`, { date: D(0) })).status).toBeLessThan(300);
    expect((await call("post", `/market/orders/${order.id}/complete`)).status).toBeGreaterThanOrEqual(400); // not fully paid
    expect((await pay(42_000)).status).toBe(201);
    expect((await call("post", `/market/orders/${order.id}/complete`)).status).toBeLessThan(300);
    expect((await call("post", `/market/orders/${order.id}/cancel`, { reason: "Too late" })).status).toBeGreaterThanOrEqual(400);
    void o;
  });
});
