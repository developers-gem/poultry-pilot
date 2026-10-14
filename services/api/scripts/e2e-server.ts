/**
 * End-to-end test server: the real API (every route, every rule) on in-memory storage, seeded through its own HTTP
 * endpoints with a realistic farm. Used only by the browser verification of the web app; never shipped.
 *   npx tsx services/api/scripts/e2e-server.ts   → http://localhost:4000
 */
import { fakeWeatherProvider } from "../src/adapters/weather.js";
import { addDays, localDateOf } from "../src/domain/index.js";
import { bearer, joinAs, makeApp, register } from "../src/test/harness.js";

const TODAY = localDateOf(new Date(), "Asia/Kolkata");
const D = (n: number) => addDays(TODAY, n);
const INR = (r: number) => ({ amountMinor: Math.round(r * 100), currency: "INR" });

const weather = fakeWeatherProvider(() => ({
  today: TODAY,
  current: { observedAt: new Date().toISOString(), temperatureC: 31.4, humidityPercent: 58, rainMm: 0, windKph: 11 },
  daily: [
    ...Array.from({ length: 7 }, (_, i) => ({ date: D(i - 7), tempMaxC: 31 + (i % 3), tempMinC: 22, rainMm: i === 2 ? 6 : 0, windMaxKph: 14, humidityMaxPercent: 82, humidityMinPercent: 41 })),
    ...[37, 33, 32, 31, 30, 31, 32].map((t, i) => ({ date: D(i), tempMaxC: t, tempMinC: 23, rainMm: i === 4 ? 12 : 0, windMaxKph: 16, humidityMaxPercent: 80, humidityMinPercent: 40 })),
  ],
}));

const ctx = makeApp({ weatherProvider: weather, rateLimit: 100_000, globalRateLimit: 100_000 });
const ok = async (p: Promise<{ status: number; body: unknown }>, what: string) => {
  const r = await p;
  if (r.status >= 400) throw new Error(`${what} → ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body as Record<string, any>;
};

async function seed() {
  const owner = await register(ctx, "demo@poultrypilot.test", { fullName: "Asha Verma" });
  const call = (m: "get" | "post" | "put" | "patch", p: string, body?: object) => ok(ctx.api()[m](`/api/v1/farms/${owner.farmId}${p}`).set(bearer(owner.access)).send(body ?? {}), `${m} ${p}`);
  const farm = await call("get", "");
  await call("put", "", { name: farm.name, countryCode: "IN", locationLabel: "Ghaziabad, Uttar Pradesh", location: { lat: 28.6692, lng: 77.4538 }, timezone: "Asia/Kolkata", currency: "INR", unitSystem: "metric", fcrIncludesMortalityWeight: false, workerEditWindowDays: 1, description: "Broilers and layers near Ghaziabad.", version: farm.version });
  await ok(ctx.api().put("/api/v1/me").set(bearer(owner.access)).send({ fullName: "Asha Verma", phone: "+91 98765 43210" }), "me");
  const bh = await call("post", "/houses", { name: "House A", type: "broiler", capacityBirds: 6000 });
  const lh = await call("post", "/houses", { name: "Layer shed", type: "layer", capacityBirds: 3000 });
  const brooder = await call("post", "/houses", { name: "Brooder 1", type: "brooder" });
  const feed = await call("post", "/inventory/items", { name: "Broiler starter", category: "feed", unit: "kg", feed: { stage: "starter" }, reorderLevel: 500 });
  const layerFeed = await call("post", "/inventory/items", { name: "Layer mash", category: "feed", unit: "kg", feed: { stage: "layer" }, reorderLevel: 400 });
  const supplier = await call("post", "/finance/suppliers", { name: "Godrej Agrovet" });
  await call("post", `/inventory/items/${feed.id}/purchases`, { date: D(-25), quantity: 6000, unitCost: INR(31.5), supplierId: supplier.id, batchNumber: "GA-1012" });
  await call("post", `/inventory/items/${layerFeed.id}/purchases`, { date: D(-20), quantity: 3000, unitCost: INR(27), supplier: "Local mill" });
  const broilers = await call("post", "/flocks", { name: "Broilers October", flockCode: "B-OCT", type: "broiler", breed: "Cobb 500", houseId: bh.id, placement: { date: D(-24), count: 5000, startingWeightG: 42, chickCost: INR(190000) } });
  const layers = await call("post", "/flocks", { name: "ISA Brown layers", flockCode: "L-ISA", type: "layer", breed: "ISA Brown", houseId: lh.id, placement: { date: D(-210), count: 2400 } });
  const chicks = await call("post", "/flocks", { name: "Chicks week 41", flockCode: "C-41", type: "broiler", houseId: brooder.id, placement: { date: D(-6), count: 1200, startingWeightG: 41 } });
  for (let i = 10; i >= 1; i--) {
    await call("put", `/flocks/${broilers.id}/daily-records/${D(-i)}`, { mortality: [{ cause: i === 3 ? "heat_stress" : "unknown", count: i === 3 ? 22 : 4 + (i % 3) }], feed: [{ feedItemId: feed.id, quantityKg: 380 + (10 - i) * 12 }], waterLitres: 760 + (10 - i) * 20, temperatureMinC: 26, temperatureMaxC: 32 + (i === 3 ? 4 : 0), humidityPercent: 62 });
    await call("put", `/flocks/${layers.id}/daily-records/${D(-i)}`, { eggs: { collected: 2080 - (i === 2 ? 180 : 0) + (i % 4) * 12, broken: 18 + (i % 3), byGrade: { large: 1200, medium: 640 } }, feed: [{ feedItemId: layerFeed.id, quantityKg: 270 }], mortality: [{ cause: "unknown", count: 1 }] });
    if (i <= 6) await call("put", `/flocks/${chicks.id}/daily-records/${D(-i)}`, { mortality: [{ cause: "found_dead", count: 3 }], feed: [{ feedItemId: feed.id, quantityKg: 18 + (6 - i) * 4 }], temperatureMinC: 30, temperatureMaxC: 33 });
  }
  await call("patch", `/flocks/${layers.id}/daily-records/${D(0)}`, { eggs: { collected: 2050, broken: 16 } });
  await call("post", `/flocks/${broilers.id}/weighings`, { date: D(-15), averageWeightG: 420, sampleSize: 40 });
  await call("post", `/flocks/${broilers.id}/weighings`, { date: D(-1), weightsG: [1180, 1220, 1260, 1150, 1310, 1240, 1200, 1275, 1190, 1230] });
  await call("post", `/flocks/${chicks.id}/weighings`, { date: D(-1), averageWeightG: 152, sampleSize: 25 });
  await call("post", "/chickstart/profiles", { name: "Cobb broiler targets", flockTypes: ["broiler"], isDefault: true, source: "Farm breed guide", bands: [{ fromDay: 0, toDay: 7, tempMinC: 30, tempMaxC: 33, targetWeightG: 170 }, { fromDay: 8, toDay: 14, tempMinC: 28, tempMaxC: 31, targetWeightG: 430 }, { fromDay: 15, toDay: 28, tempMinC: 24, tempMaxC: 28, targetWeightG: 1300 }] });
  await call("post", "/chickstart/checks", { flockId: chicks.id, temperatureC: 31.5, humidityPercent: 60, behaviour: "comfortable", feedAvailable: true, waterAvailable: true, cropFill: { sampled: 20, full: 18 } });
  await call("post", "/chickstart/arrivals", { houseId: brooder.id, expectedDate: D(5), expectedCount: 1500, source: "supplier", supplier: "Venky's hatchery", flockType: "broiler", breed: "Cobb 500" });
  const med = await call("post", "/health/medicines", { name: "Amoxicillin 20%", type: "antibiotic", withdrawalMeatDays: 5, withdrawalSource: "medicine_label" });
  await call("post", "/health/records", { type: "vet_visit", date: D(-4), flockId: broilers.id, title: "Routine check, heat stress", vetName: "Dr. Rao", symptoms: ["panting"], assessment: { text: "Heat stress after the hot day; improve ventilation.", by: "Dr. Rao", source: "veterinarian" }, cost: INR(1500), followUpDate: D(3) });
  await call("post", "/health/records", { type: "treatment", date: D(-12), flockId: broilers.id, title: "Respiratory treatment", treatments: [{ medicineId: med.id, startDate: D(-12), durationDays: 3, prescribedBy: "Dr. Rao" }] });
  await call("post", "/health/vaccinations", { flockId: chicks.id, vaccineName: "IBD (Gumboro)", dueDate: D(1) });
  await call("post", "/health/vaccinations", { flockId: broilers.id, vaccineName: "Newcastle booster", dueDate: D(-2) });
  await call("post", "/health/appointments", { date: D(2), title: "Flock check", vetName: "Dr. Rao", flockId: chicks.id });
  const batch = await call("post", "/hatchery/batches", { code: "HB-014", eggSource: "own_flock", sourceFlockId: layers.id, eggsReceived: 1200, rejects: { cracked: 30 }, setDate: D(-12) });
  await call("post", `/hatchery/batches/${batch.id}/candling`, { date: D(-5), infertile: 90, deadEmbryo: 14, cracked: 6 });
  const done = await call("post", "/hatchery/batches", { code: "HB-012", eggSource: "purchased", supplier: "Breeder farm", eggsReceived: 1000, setDate: D(-30), eggCost: INR(9000) });
  await call("post", `/hatchery/batches/${done.id}/hatch`, { date: D(-9), hatched: 842 });
  await call("post", `/hatchery/batches/${done.id}/grading`, { date: D(-9), saleable: 820, culled: 22 });
  await call("post", "/biosecurity/checklists/starter");
  await call("post", "/biosecurity/visitors", { name: "Ravi (feed rep)", company: "Godrej Agrovet", type: "supplier", previousPoultryContact: { hadContact: true, lastContactAt: new Date(Date.now() - 20 * 3600_000).toISOString() }, footbathUsed: true });
  await call("post", "/biosecurity/logs", { type: "footbath", date: D(-1), footbath: { action: "changed", disinfectant: "Virkon S" } });
  await call("post", "/biosecurity/logs", { type: "pest_control", date: D(-2), pest: { pestType: "rodents", activityFound: true } });
  await call("post", "/biosecurity/cleaning-schedules", { title: "Wash drinkers, House A", activity: "cleaning", schedule: "weekly", nextDueDate: D(0) });
  const cash = await call("post", "/finance/accounts", { name: "Cash box", type: "cash", openingBalance: INR(40000), openingDate: D(-60) });
  await call("post", "/finance/accounts", { name: "SBI current", type: "bank", openingBalance: INR(250000), openingDate: D(-60) });
  await call("post", "/finance/incomes", { kind: "sale", date: D(-6), category: "egg_sales", description: "Eggs to Hotel Raj", amount: INR(18600), customerName: "Hotel Raj", paidNow: { accountId: cash.id, method: "cash" } });
  await call("post", "/finance/incomes", { kind: "sale", date: D(-15), dueDate: D(-3), category: "egg_sales", description: "Eggs on credit", amount: INR(9200), customerName: "Gupta Stores" });
  await call("post", "/finance/expenses", { date: D(-8), category: "labour", description: "Weekly wages", amount: INR(14000), paidNow: { accountId: cash.id, method: "cash" } });
  await call("post", "/finance/recurring", { name: "Farm electricity", category: "electricity", vendor: "UPPCL", amount: INR(6500), frequency: "monthly", startDate: D(-40) });
  const buyer = await call("post", "/buyers", { name: "Sharma Poultry Traders", type: "trader", phone: "+91 90000 11111" });
  await call("post", "/chick-orders", { buyerId: buyer.id, quantity: 300, unitPrice: INR(38), hatcheryBatchId: batch.id, requestedDeliveryDate: D(10) });
  const listing = await call("post", "/market/listings", { title: "Fresh brown eggs, large", category: "eggs", quantityAvailable: 60, unit: "tray", price: INR(180), priceUnit: "per_tray", regionCode: "IN-UP", fulfilmentOptions: ["pickup", "seller_delivery"] });
  await call("post", `/market/listings/${listing.id}/status`, { status: "active" });
  // A second farm, so the marketplace has listings from someone else to browse and buy.
  const other = await register(ctx, "neighbour@poultrypilot.test", { fullName: "Karan Singh" });
  const oc = (m: "post", p: string, body?: object) => ok(ctx.api()[m](`/api/v1/farms/${other.farmId}${p}`).set(bearer(other.access)).send(body ?? {}), `other ${p}`);
  const ol = await oc("post", "/market/listings", { title: "Day-old Cobb chicks", category: "day_old_chicks", quantityAvailable: 2000, unit: "chick", price: INR(42), priceUnit: "per_bird", regionCode: "IN-UP", fulfilmentOptions: ["pickup"] });
  await oc("post", `/market/listings/${ol.id}/status`, { status: "active" });
  // Published content, written and reviewed through the editorial API.
  const editor = await register(ctx, "editor@poultrypilot.test", { fullName: "Content Editor" });
  const pub = await register(ctx, "publisher@poultrypilot.test", { fullName: "Content Publisher" });
  for (const [u, roles] of [[editor, ["content_editor"]], [pub, ["content_publisher"]]] as const) ctx.store.users.put(u.userId, { ...ctx.store.users.get(u.userId)!, platformRoles: [...roles] });
  const ed = (m: "post" | "put", p: string, body: object) => ok(ctx.api()[m](`/api/v1${p}`).set(bearer(editor.access)).send(body), `content ${p}`);
  const pb = (m: "post" | "put", p: string, body: object = {}) => ok(ctx.api()[m](`/api/v1${p}`).set(bearer(pub.access)).send(body), `publish ${p}`);
  await ctx.container.content.seed();
  for (const a of [
    { kind: "news", origin: "external", slug: "maize-prices-ease", title: "Maize prices ease after harvest", summary: "Feed mills report lower maize prices this month after a good kharif harvest.", content: "PoultryPilot summary: lower maize prices should ease feed costs for broiler and layer farms.", category: "markets", author: "Market desk", source: "Example Agri News", sourceUrl: "https://example.org/news/maize", publicationDate: D(-2), regionCode: "IN" },
    { kind: "fact", slug: "water-feed-ratio", title: "Birds drink about twice what they eat", summary: "Healthy broilers drink roughly 1.6–2 litres of water for every kilo of feed; a sudden change is worth checking.", category: "management", sources: [{ name: "Cobb broiler management guide", url: "https://www.cobb-vantress.com" }] },
  ]) {
    const x = await ed("post", "/admin/content/articles", a);
    await ed("post", `/admin/content/articles/${x.id}/submit`, {});
    await pb("post", `/admin/content/articles/${x.id}/publish`);
  }
  await pb("put", "/admin/content/glossary", { slug: "fcr", term: "Feed conversion ratio (FCR)", definition: "Feed eaten divided by weight gained. Lower is better.", category: "Production", status: "published" });
  await pb("put", "/admin/content/glossary", { slug: "brooding", term: "Brooding", definition: "Keeping young chicks warm and fed in their first weeks.", category: "Birds", status: "published" });
  await pb("put", "/admin/content/courses", { slug: "broiler-basics", title: "Broiler basics", summary: "From placement to sale.", category: "management", lessons: [{ lessonId: "brooding", title: "Brooding", content: "Warm, dry, draught-free.", minutes: 8, order: 1 }, { lessonId: "water", title: "Water", content: "Clean water always available.", minutes: 6, order: 2 }], status: "published" });
  await joinAs(ctx, owner, "worker@poultrypilot.test", "worker");
  await call("post", "/alerts/evaluate");
}

seed()
  .then(() => {
    ctx.app.listen(4000, () => console.log("E2E API ready on http://localhost:4000 (demo@poultrypilot.test / goodpass123)"));
  })
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  });
