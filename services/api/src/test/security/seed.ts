import { addDays, localDateOf } from "../../domain/index.js";
import { bearer, joinAs, makeApp, register, type Account } from "../harness.js";

export const TODAY = localDateOf(new Date(), "Asia/Kolkata");
export const D = (n: number) => addDays(TODAY, n);
const INR = (r: number) => ({ amountMinor: Math.round(r * 100), currency: "INR" });

/**
 * A victim farm with at least one record of nearly every kind, plus an attacker who fully owns another farm.
 * Everything is created through the API, so the sweep attacks real records.
 */
export async function securityWorld() {
  const ctx = makeApp({ rateLimit: 100_000, globalRateLimit: 100_000 });
  const victim = await register(ctx, "victim@example.com");
  const attacker = await register(ctx, "attacker@example.com");
  const worker = await joinAs(ctx, victim, "worker@example.com", "worker");
  const v = (m: "get" | "post" | "put" | "patch", p: string, body?: object, who: Account = victim) =>
    ctx.api()[m](`/api/v1/farms/${victim.farmId}${p}`).set(bearer(who.access)).send(body ?? {});
  const ok = async (p: Promise<{ status: number; body: any }>, what: string) => {
    const r = await p;
    if (r.status >= 400) throw new Error(`seed ${what}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return r.body;
  };
  const house = await ok(v("post", "/houses", { name: "H1", type: "layer" }), "house");
  const flock = await ok(v("post", "/flocks", { name: "L1", flockCode: "L1", type: "layer", houseId: house.id, placement: { date: D(-100), count: 1000 } }), "flock");
  await ok(v("put", `/flocks/${flock.id}/daily-records/${D(-1)}`, { eggs: { collected: 900, broken: 5 }, mortality: [{ cause: "unknown", count: 2 }] }), "day");
  await ok(v("post", `/flocks/${flock.id}/weighings`, { date: D(-1), averageWeightG: 1800, sampleSize: 10 }), "weighing");
  const item = await ok(v("post", "/inventory/items", { name: "Mash", category: "feed", unit: "kg", feed: { stage: "layer" } }), "item");
  await ok(v("post", `/inventory/items/${item.id}/purchases`, { date: D(-5), quantity: 500, unitCost: INR(30) }), "purchase");
  await ok(v("post", "/feed/consumption", { date: D(-1), flockId: flock.id, feedItemId: item.id, quantityKg: 20 }), "feed");
  await ok(v("post", "/health/records", { type: "observation", date: D(-1), flockId: flock.id, title: "Cough" }), "health");
  await ok(v("post", "/health/vaccinations", { flockId: flock.id, vaccineName: "ND", dueDate: D(1) }), "vacc");
  await ok(v("post", "/health/medicines", { name: "Amox", type: "antibiotic" }), "medicine");
  await ok(v("post", "/health/appointments", { date: D(2), title: "Check" }), "appointment");
  await ok(v("post", "/hatchery/batches", { code: "HB1", eggSource: "purchased", eggsReceived: 100, setDate: D(-3) }), "batch");
  const buyer = await ok(v("post", "/buyers", { name: "Sharma" }), "buyer");
  const acct = await ok(v("post", "/finance/accounts", { name: "Cash", type: "cash", openingBalance: INR(1000), openingDate: D(-30) }), "account");
  await ok(v("post", "/finance/incomes", { kind: "sale", date: D(-2), category: "egg_sales", description: "Eggs", amount: INR(500), paidNow: { accountId: acct.id, method: "cash" } }), "income");
  await ok(v("post", "/finance/expenses", { date: D(-2), category: "labour", description: "Wages", amount: INR(300) }), "expense");
  await ok(v("post", "/finance/recurring", { name: "Power", category: "electricity", amount: INR(100), frequency: "monthly", startDate: D(-10) }), "recurring");
  await ok(v("post", "/finance/suppliers", { name: "Mill" }), "supplier");
  const listing = await ok(v("post", "/market/listings", { title: "Eggs", category: "eggs", quantityAvailable: 50, unit: "tray", price: INR(180), priceUnit: "per_tray", regionCode: "IN-UP", fulfilmentOptions: ["pickup"] }), "listing");
  await ok(v("post", `/market/listings/${listing.id}/status`, { status: "active" }), "listing active");
  await ok(v("post", "/tasks", { title: "Clean", dueDate: D(0) }), "task");
  await ok(v("post", "/biosecurity/visitors", { name: "Rep", type: "supplier", previousPoultryContact: { hadContact: false } }), "visitor");
  await ok(v("post", "/biosecurity/logs", { type: "footbath", date: D(-1), footbath: { action: "changed" } }), "log");
  await ok(v("post", "/biosecurity/cleaning-schedules", { title: "Wash", activity: "cleaning", schedule: "weekly", nextDueDate: D(0) }), "cleaning");
  await ok(v("post", "/biosecurity/checklists/starter"), "checklists");
  await ok(v("post", "/chickstart/arrivals", { houseId: house.id, expectedDate: D(3), expectedCount: 100, source: "supplier", flockType: "broiler" }), "arrival");
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1), Buffer.from([0xff, 0xd9])]);
  await ok(ctx.api().post(`/api/v1/farms/${victim.farmId}/media`).set(bearer(victim.access)).set("Content-Type", "image/jpeg").send(jpeg), "media");
  await ok(v("post", "/alerts/evaluate"), "alerts");
  // The attacker also buys from the victim (so buyer-side routes exist) and has a farm of their own with data.
  const a = (m: "post", p: string, body?: object) => ctx.api()[m](`/api/v1/farms/${attacker.farmId}${p}`).set(bearer(attacker.access)).send(body ?? {});
  const aHouse = await ok(a("post", "/houses", { name: "AH", type: "broiler" }), "attacker house");
  await ok(a("post", "/flocks", { name: "A1", flockCode: "A1", type: "broiler", houseId: aHouse.id, placement: { date: D(-10), count: 100 } }), "attacker flock");
  // A second customer places an order on the victim's listing: the attacker must not see or act on it.
  const third = await register(ctx, "third@example.com");
  const order = await ok(ctx.api().post("/api/v1/market/orders").set(bearer(third.access)).send({ listingId: listing.id, quantity: 2, fulfilment: "pickup", buyerName: "Third" }), "order");
  return { ctx, victim, attacker, worker, third, ids: { house: house.id, flock: flock.id, item: item.id, buyer: buyer.id, account: acct.id, listing: listing.id, order: order.id } };
}
