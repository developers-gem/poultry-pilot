import { can, type Action } from "@poultrypilot/constants";
import { addDays, dateRange, effectiveEvents, localDateOf, population, type Cell, type CellType, type ReportColumn, type ReportDocument, type ReportSection, type ReportTable } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import type { Clock } from "../lib/util.js";
import type { Repositories } from "../ports/repositories.js";
import type { FarmRecord, FlockEventRecord, FlockRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import type { FeedService } from "./feed.service.js";
import type { FinanceService } from "./finance.service.js";
import { toLedger, type FlockService } from "./flock.service.js";
import type { HatcheryService } from "./hatchery.service.js";
import type { InventoryService } from "./inventory.service.js";

export const REPORTS = {
  farm: { title: "Farm report", permission: "farm.read", needsFlock: false, description: "Flocks, production in the period, alerts, and money totals for those who may see money" },
  flock: { title: "Flock report", permission: "production.read", needsFlock: true, description: "One flock: performance, every day of the period, its events, and its costs for those who may see money" },
  egg: { title: "Egg report", permission: "production.read", needsFlock: false, description: "Eggs collected by day and flock, grades, breakage, hen-day production, egg stock" },
  feed: { title: "Feed report", permission: "production.read", needsFlock: false, description: "Feed eaten and wasted by flock, feed per bird and FCR; purchases and stock for those who may see stock" },
  health: { title: "Health report", permission: "health.read", needsFlock: false, description: "Health records, treatments and withdrawal periods, vaccinations, deaths by cause" },
  hatchery: { title: "Hatchery report", permission: "hatchery.read", needsFlock: false, description: "Batches set in the period with every count, fertility, hatchability, saleable and loss %" },
  biosecurity: { title: "Biosecurity report", permission: "biosecurity.read", needsFlock: false, description: "Visitors, biosecurity logs, failed checks and corrective actions" },
  financial: { title: "Financial report", permission: "money.read", needsFlock: false, description: "Profit and loss, cash flow by account, receivables and payables, spending by supplier" },
  marketplace: { title: "Marketplace report", permission: "market.read", needsFlock: false, description: "Listings, orders and their status, sales and payments received" },
} as const satisfies Record<string, { title: string; permission: Action; needsFlock: boolean; description: string }>;
export type ReportType = keyof typeof REPORTS;

const col = (key: string, label: string, type: CellType = "text", decimals?: number): ReportColumn => ({ key, label, type, ...(decimals !== undefined ? { decimals } : {}) });
const table = (title: string, columns: ReportColumn[], rows: Record<string, Cell>[], extra: { totals?: Record<string, Cell>; note?: string } = {}): ReportTable => ({ kind: "table", title, columns, rows, ...extra });
const sum = <T>(rows: T[], f: (r: T) => number | null | undefined) => rows.reduce((t, r) => t + (f(r) ?? 0), 0);
const r1 = (n: number | null | undefined, dp = 1) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp);

/**
 * Reports built on the server from live records. Each needs its own permission; within a report, money sections are
 * left out (and noted) for people who may not see money. Every export is written to the audit log.
 */
export function createReportService(d: { repos: Repositories; clock: Clock; audit: AuditService; flocks: FlockService; finance: FinanceService; hatchery: HatcheryService; inventory: InventoryService; feed: FeedService }) {
  const { repos, clock } = d;

  function period(farm: FarmRecord, q: { from?: string; to?: string }) {
    const today = localDateOf(clock.now(), farm.settings.timezone);
    const to = q.to ?? today;
    const from = q.from ?? addDays(to, -29);
    if (from > to) throw new AppError("VALIDATION_FAILED", "from must be on or before to");
    if (dateRange(from, to).length > 366) throw new AppError("VALIDATION_FAILED", "A report covers at most 366 days");
    return { from, to };
  }

  const inRange = (date: string | undefined, p: { from: string; to: string }) => !!date && date >= p.from && date <= p.to;

  async function liveEvents(ctx: FarmContext, flockIds?: string[]) {
    const all = await repos.flockEvents.find(ctx.farmId, flockIds ? { where: { flockId: flockIds } as never } : {});
    return effectiveEvents(all.map(toLedger)).map((e) => ({ ...e, raw: all.find((x) => x.id === e.id)! })) as (ReturnType<typeof toLedger> & { raw: FlockEventRecord })[];
  }

  const builders: Record<ReportType, (ctx: FarmContext, farm: FarmRecord, p: { from: string; to: string }, q: { flockId?: string }, notes: string[]) => Promise<ReportSection[]>> = {
    async farm(ctx, farm, p, _q, notes) {
      const [houses, flocks, alerts] = await Promise.all([repos.houses.find(ctx.farmId), repos.flocks.find(ctx.farmId, { where: { status: ["planned", "active", "closed"] } as never }), repos.alerts.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to } })]);
      const active = flocks.filter((f) => f.status === "active");
      const sections: ReportSection[] = [
        { kind: "summary", title: "Farm", items: [
          { label: "Country", value: farm.countryCode ?? "—", type: "text" },
          { label: "Houses", value: houses.length, type: "number" },
          { label: "Active flocks", value: active.length, type: "number" },
          { label: "Birds alive now", value: sum(active, (f) => f.population?.alive), type: "number" },
          { label: "Alerts raised in the period", value: alerts.length, type: "number" },
          { label: "Alerts still open", value: alerts.filter((a) => a.status !== "resolved").length, type: "number" },
        ] },
      ];
      if (can(ctx.role, "production.read")) {
        const houseName = new Map(houses.map((h) => [h.id, h.name]));
        const rows: Record<string, Cell>[] = [];
        for (const f of flocks.filter((x) => x.status !== "planned")) {
          const m = await d.flocks.metrics(ctx, f.id, {});
          rows.push({ code: f.flockCode, type: f.type, house: houseName.get(f.houseId) ?? "", status: f.status, placed: f.placementDate ?? null, birdsIn: m.birdsIn, alive: m.currentBirdCount, mortality: r1(m.mortalityRate), fcr: r1(m.fcr, 2), eggs: m.eggsCollected });
        }
        sections.push(table("Flocks (to date)", [col("code", "Flock"), col("type", "Type"), col("house", "House"), col("status", "Status"), col("placed", "Placed", "date"), col("birdsIn", "Birds in", "number"), col("alive", "Alive", "number"), col("mortality", "Mortality", "percent"), col("fcr", "FCR", "number", 2), col("eggs", "Eggs", "number")], rows));
        const ev = (await liveEvents(ctx)).filter((e) => inRange(e.date, p));
        const [feed, water, eggs] = await Promise.all([
          repos.feedConsumption.find(ctx.farmId, { where: { kind: "consumption" }, range: { field: "date", from: p.from, to: p.to } }),
          repos.waterRecords.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to } }),
          repos.eggRecords.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to } }),
        ]);
        const daily = dateRange(p.from, p.to).map((date) => ({
          date,
          deaths: sum(ev.filter((e) => e.type === "mortality" && e.date === date), (e) => e.birds),
          culls: sum(ev.filter((e) => e.type === "cull" && e.date === date), (e) => e.birds),
          eggs: sum(eggs.filter((e) => e.date === date), (e) => e.collected),
          feedKg: r1(sum(feed.filter((f) => f.date === date), (f) => f.quantityKg), 2),
          waterL: r1(sum(water.filter((w) => w.date === date), (w) => w.litres), 1),
        }));
        sections.push(table("Production by day", [col("date", "Date", "date"), col("deaths", "Deaths", "number"), col("culls", "Culls", "number"), col("eggs", "Eggs", "number"), col("feedKg", "Feed (kg)", "number", 2), col("waterL", "Water (L)", "number", 1)], daily, { totals: { deaths: sum(daily, (x) => x.deaths), culls: sum(daily, (x) => x.culls), eggs: sum(daily, (x) => x.eggs), feedKg: r1(sum(daily, (x) => x.feedKg), 2), waterL: r1(sum(daily, (x) => x.waterL), 1) } }));
      } else notes.push("Production figures are left out: your role does not include production records.");
      const byType = new Map<string, number>();
      for (const a of alerts) byType.set(a.ruleType, (byType.get(a.ruleType) ?? 0) + 1);
      sections.push(table("Alerts in the period", [col("type", "Alert"), col("count", "Count", "number")], [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type: type.replace(/_/g, " "), count }))));
      if (can(ctx.role, "money.read")) {
        const pnl = await d.finance.profitAndLoss(ctx, p);
        sections.push({ kind: "summary", title: "Money (excluding tax)", items: [
          { label: "Revenue", value: pnl.revenue.totalMinor, type: "money" },
          { label: "Expenses", value: pnl.expenses.totalMinor, type: "money" },
          { label: "Net profit", value: pnl.netProfitMinor, type: "money" },
          { label: "Margin", value: r1(pnl.marginPercent), type: "percent" },
        ] });
      } else notes.push("Money figures are left out: your role does not include finance.");
      return sections;
    },

    async flock(ctx, _farm, p, q, notes) {
      if (!q.flockId) throw new AppError("VALIDATION_FAILED", "Choose a flock (flockId) for the flock report");
      const f = await d.flocks.ledger.loadFlock(ctx, q.flockId);
      const m = await d.flocks.metrics(ctx, f.id, {});
      const house = await repos.houses.findById(ctx.farmId, f.houseId);
      const sections: ReportSection[] = [
        { kind: "summary", title: `Flock ${f.flockCode}`, items: [
          { label: "Name", value: f.name, type: "text" },
          { label: "Type", value: f.type, type: "text" },
          { label: "Breed", value: f.breed ?? "—", type: "text" },
          { label: "House", value: house?.name ?? "—", type: "text" },
          { label: "Status", value: f.status, type: "text" },
          { label: "Placed", value: f.placementDate ?? null, type: "date" },
          { label: "Age (days)", value: m.ageDays, type: "number" },
          { label: "Birds in", value: m.birdsIn, type: "number" },
          { label: "Birds alive", value: m.currentBirdCount, type: "number" },
          { label: "Mortality", value: r1(m.mortalityRate), type: "percent" },
          { label: "Average weight (g)", value: r1(m.averageWeightG, 0), type: "number" },
          { label: "Feed eaten (kg)", value: r1(m.feedConsumedKg, 1), type: "number", decimals: 1 },
          { label: "FCR", value: r1(m.fcr, 2), type: "number", decimals: 2 },
          { label: "Eggs collected", value: m.eggsCollected, type: "number" },
        ] },
      ];
      const events = await d.flocks.ledger.loadEvents(ctx, f.id);
      const ledger = events.map(toLedger);
      const live = effectiveEvents(ledger);
      const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf!));
      const [feed, water, eggs] = await Promise.all([
        repos.feedConsumption.find(ctx.farmId, { where: { flockId: f.id, kind: "consumption" }, range: { field: "date", from: p.from, to: p.to } }),
        repos.waterRecords.find(ctx.farmId, { where: { flockId: f.id }, range: { field: "date", from: p.from, to: p.to } }),
        repos.eggRecords.find(ctx.farmId, { where: { flockId: f.id }, range: { field: "date", from: p.from, to: p.to } }),
      ]);
      const start = f.placementDate && f.placementDate > p.from ? f.placementDate : p.from;
      const days = start <= p.to ? dateRange(start, p.to) : [];
      const rows = days.map((date) => {
        const w = live.filter((e) => e.type === "weighing" && e.date === date).pop();
        return {
          date,
          alive: population(ledger, addDays(date, -1)).alive,
          deaths: sum(live.filter((e) => e.type === "mortality" && e.date === date), (e) => e.birds),
          culls: sum(live.filter((e) => e.type === "cull" && e.date === date), (e) => e.birds),
          feedKg: r1(sum(feed.filter((x) => x.date === date), (x) => x.quantityKg), 2),
          waterL: r1(sum(water.filter((x) => x.date === date), (x) => x.litres), 1),
          eggs: eggs.find((x) => x.date === date)?.collected ?? null,
          weightG: w?.averageWeightG ?? null,
        };
      });
      sections.push(table("Every day of the period", [col("date", "Date", "date"), col("alive", "Alive at start", "number"), col("deaths", "Deaths", "number"), col("culls", "Culls", "number"), col("feedKg", "Feed (kg)", "number", 2), col("waterL", "Water (L)", "number", 1), col("eggs", "Eggs", "number"), col("weightG", "Avg weight (g)", "number")], rows, { totals: { deaths: sum(rows, (x) => x.deaths), culls: sum(rows, (x) => x.culls), feedKg: r1(sum(rows, (x) => x.feedKg), 2), waterL: r1(sum(rows, (x) => x.waterL), 1), eggs: sum(rows, (x) => x.eggs) } }));
      sections.push(table("Bird movements and events", [col("date", "Date", "date"), col("type", "Event"), col("birds", "Birds", "number"), col("detail", "Detail"), col("status", "Status")], events.filter((e) => !e.reversalOf && inRange(e.date, p)).map((e) => ({ date: e.date, type: e.type.replace(/_/g, " "), birds: e.birds ?? null, detail: e.cause ?? e.note ?? (e.averageWeightG ? `${e.averageWeightG} g` : ""), status: reversed.has(e.id) ? "reversed" : "" }))));
      if (can(ctx.role, "money.read")) {
        sections.push({ kind: "summary", title: "Costs and revenue (to date)", items: [
          ...Object.entries(m.cost).filter(([k]) => k !== "totalMinor").map(([k, v]) => ({ label: k.replace(/Minor$/, "").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), value: v as number, type: "money" as const })),
          { label: "Total cost", value: m.cost.totalMinor, type: "money" },
          { label: "Revenue", value: m.revenueMinor, type: "money" },
          { label: "Profit", value: m.profitMinor, type: "money" },
          { label: "Cost per bird", value: m.costPerBirdMinor, type: "money" },
          { label: "Cost per kg produced", value: m.costPerKgProducedMinor, type: "money" },
        ] });
      } else notes.push("Costs and revenue are left out: your role does not include finance.");
      return sections;
    },

    async egg(ctx, _farm, p) {
      const [flocks, recs, moves] = await Promise.all([
        repos.flocks.find(ctx.farmId),
        repos.eggRecords.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to }, sort: [{ field: "date", dir: 1 }] }),
        repos.eggInventory.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to } }),
      ]);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      const ledgers = new Map<string, ReturnType<typeof toLedger>[]>();
      for (const id of new Set(recs.map((r) => r.flockId))) ledgers.set(id, (await d.flocks.ledger.loadEvents(ctx, id)).map(toLedger));
      const grades = ["large", "medium", "small", "extra_large", "jumbo", "pee_wee", "ungraded"].filter((g) => recs.some((r) => (r.byGrade as Record<string, number> | undefined)?.[g]));
      const rows = recs.map((r) => {
        const alive = population(ledgers.get(r.flockId) ?? [], addDays(r.date, -1)).alive;
        return { date: r.date, flock: code.get(r.flockId) ?? "", collected: r.collected, broken: r.broken, ...Object.fromEntries(grades.map((g) => [g, (r.byGrade as Record<string, number> | undefined)?.[g] ?? null])), henDay: alive > 0 ? r1((r.collected / alive) * 100) : null, withheld: r.withheldUntil ? `until ${r.withheldUntil}` : "" };
      });
      const collected = sum(recs, (r) => r.collected);
      const broken = sum(recs, (r) => r.broken);
      const stock = await d.inventory.eggStock(ctx);
      const byType = new Map<string, number>();
      for (const mv of moves) byType.set(mv.type, (byType.get(mv.type) ?? 0) + mv.quantityDelta);
      return [
        { kind: "summary", title: "Eggs in the period", items: [
          { label: "Collected", value: collected, type: "number" },
          { label: "Broken", value: broken, type: "number" },
          { label: "Breakage", value: collected > 0 ? r1((broken / collected) * 100) : null, type: "percent" },
          { label: "Average hen-day production", value: rows.length ? r1(sum(rows, (x) => x.henDay) / rows.filter((x) => x.henDay !== null).length) : null, type: "percent" },
          { label: "In stock now", value: stock.total, type: "number" },
        ] },
        table("Eggs by day and flock", [col("date", "Date", "date"), col("flock", "Flock"), col("collected", "Collected", "number"), col("broken", "Broken", "number"), ...grades.map((g) => col(g, g.replace("_", " "), "number")), col("henDay", "Hen-day", "percent"), col("withheld", "Withheld")], rows, { totals: { collected, broken } }),
        table("Egg stock movements in the period", [col("type", "Movement"), col("eggs", "Eggs", "number")], [...byType.entries()].map(([type, eggs]) => ({ type, eggs }))),
        table("Egg stock now by grade", [col("grade", "Grade"), col("eggs", "Eggs", "number")], Object.entries(stock.byGrade).filter(([, n]) => n !== 0).map(([grade, eggs]) => ({ grade, eggs }))),
      ];
    },

    async feed(ctx, _farm, p, _q, notes) {
      const [flocks, use] = await Promise.all([repos.flocks.find(ctx.farmId, { where: { status: ["active", "closed"] } as never }), repos.feedConsumption.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to } })]);
      const rows: Record<string, Cell>[] = [];
      for (const f of flocks) {
        const mine = use.filter((u) => u.flockId === f.id);
        if (!mine.length && f.status !== "active") continue;
        const eaten = sum(mine.filter((u) => (u.kind ?? "consumption") === "consumption"), (u) => u.quantityKg);
        const wasted = sum(mine.filter((u) => u.kind === "wastage"), (u) => u.quantityKg);
        const m = await d.flocks.metrics(ctx, f.id, {});
        rows.push({ flock: f.flockCode, type: f.type, eatenKg: r1(eaten, 1), wastedKg: r1(wasted, 1), wastePct: eaten + wasted > 0 ? r1((wasted / (eaten + wasted)) * 100) : null, perBirdG: m.currentBirdCount > 0 ? r1((eaten * 1000) / m.currentBirdCount, 0) : null, fcr: r1(m.fcr, 2) });
      }
      const sections: ReportSection[] = [table("Feed by flock in the period", [col("flock", "Flock"), col("type", "Type"), col("eatenKg", "Eaten (kg)", "number", 1), col("wastedKg", "Wasted (kg)", "number", 1), col("wastePct", "Waste", "percent"), col("perBirdG", "Per bird alive (g)", "number"), col("fcr", "FCR to date", "number", 2)], rows, { totals: { eatenKg: r1(sum(rows, (r) => r["eatenKg"] as number), 1), wastedKg: r1(sum(rows, (r) => r["wastedKg"] as number), 1) } })];
      if (can(ctx.role, "inventory.read")) {
        const items = new Map((await repos.inventoryItems.find(ctx.farmId, { where: { category: "feed" } })).map((i) => [i.id, i]));
        // Purchases, not stock-count surpluses: lots whose receipt came from a purchase.
        const purchased = new Set((await repos.inventoryTransactions.find(ctx.farmId, { where: { type: "receipt", sourceType: "purchase" }, range: { field: "date", from: p.from, to: p.to } })).map((t) => t.lotId));
        const lots = (await repos.inventoryLots.find(ctx.farmId, { range: { field: "receivedDate", from: p.from, to: p.to } })).filter((l) => items.has(l.itemId) && purchased.has(l.id));
        const showMoney = can(ctx.role, "money.read");
        sections.push(table("Feed purchased", [col("date", "Received", "date"), col("item", "Feed"), col("qty", "Quantity (kg)", "number", 1), col("supplier", "Supplier"), col("batch", "Batch"), ...(showMoney ? [col("unitCost", "Price per kg", "money"), col("total", "Total", "money")] : [])], lots.map((l) => ({ date: l.receivedDate, item: items.get(l.itemId)?.name ?? "", qty: l.quantityReceived, supplier: l.supplier ?? "", batch: l.batchNumber ?? "", ...(showMoney ? { unitCost: l.unitCost.amountMinor, total: Math.round(l.unitCost.amountMinor * l.quantityReceived) } : {}) }))));
        const stock = await d.feed.stock(ctx);
        sections.push(table("Feed in stock now", [col("item", "Feed"), col("kg", "In date (kg)", "number", 1), col("expiredKg", "Expired (kg)", "number", 1), col("dailyKg", "Daily use (kg)", "number", 1), col("days", "Days left", "number"), col("status", "Status")], stock.items.map((s) => ({ item: s.name, kg: s.quantityKg, expiredKg: s.expiredKg, dailyKg: s.averageDailyUseKg, days: s.daysRemaining, status: s.status }))));
        if (!showMoney) notes.push("Feed prices are left out: your role does not include finance.");
      } else notes.push("Purchases and stock are left out: your role does not include stock.");
      return sections;
    },

    async health(ctx, _farm, p) {
      const [flocks, recs, vacc] = await Promise.all([repos.flocks.find(ctx.farmId), repos.healthRecords.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to }, sort: [{ field: "date", dir: 1 }] }), repos.vaccinations.find(ctx.farmId, { range: { field: "dueDate", from: p.from, to: p.to }, sort: [{ field: "dueDate", dir: 1 }] })]);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      const treatments = recs.flatMap((r) => (r.treatments ?? []).map((t) => ({ flock: r.flockId ? code.get(r.flockId) ?? "" : "", medicine: t.medicineName, start: t.startDate, end: t.endDate, meatUntil: t.withdrawalMeatUntil ?? null, eggsUntil: t.withdrawalEggsUntil ?? null, source: t.withdrawalSource?.replace("_", " ") ?? "", prescribedBy: t.prescribedBy ?? "" })));
      const deaths = (await liveEvents(ctx)).filter((e) => e.type === "mortality" && inRange(e.date, p));
      const byCause = new Map<string, number>();
      for (const e of deaths) byCause.set(e.raw.cause ?? "not recorded", (byCause.get(e.raw.cause ?? "not recorded") ?? 0) + (e.birds ?? 0));
      return [
        { kind: "summary", title: "Health in the period", items: [
          { label: "Health records", value: recs.length, type: "number" },
          { label: "Treatments", value: treatments.length, type: "number" },
          { label: "Vaccinations due", value: vacc.length, type: "number" },
          { label: "Vaccinations given", value: vacc.filter((v) => v.status === "done").length, type: "number" },
          { label: "Deaths", value: sum(deaths, (e) => e.birds), type: "number" },
        ] },
        table("Health records", [col("date", "Date", "date"), col("type", "Type"), col("flock", "Flock"), col("title", "Title"), col("assessment", "Assessment (by)"), col("affected", "Affected", "number"), col("dead", "Dead", "number"), col("followUp", "Follow-up", "date")], recs.map((r) => ({ date: r.date, type: r.type.replace("_", " "), flock: r.flockId ? code.get(r.flockId) ?? "" : "", title: r.title, assessment: r.assessment ? `${r.assessment.text} (${r.assessment.by})` : "", affected: r.affectedBirds ?? null, dead: r.deadBirds ?? null, followUp: r.followUpDate ?? null }))),
        table("Treatments and withdrawal periods", [col("flock", "Flock"), col("medicine", "Medicine"), col("start", "Start", "date"), col("end", "End", "date"), col("meatUntil", "Meat withdrawal until", "date"), col("eggsUntil", "Egg withdrawal until", "date"), col("source", "Period from"), col("prescribedBy", "Prescribed by")], treatments, { note: "Withdrawal periods are those recorded from the product label or the veterinarian." }),
        table("Vaccinations due in the period", [col("due", "Due", "date"), col("flock", "Flock"), col("vaccine", "Vaccine"), col("status", "Status"), col("given", "Given", "date"), col("birds", "Birds", "number"), col("batches", "Batches")], vacc.map((v) => ({ due: v.dueDate, flock: code.get(v.flockId) ?? "", vaccine: v.vaccineName, status: v.status, given: v.administeredDate ?? null, birds: v.birdsVaccinated ?? null, batches: (v.batches ?? []).map((b) => `${b.batchNumber}${b.expiryDate ? ` (exp ${b.expiryDate})` : ""}`).join("; ") }))),
        table("Deaths by cause", [col("cause", "Cause"), col("birds", "Birds", "number")], [...byCause.entries()].sort((a, b) => b[1] - a[1]).map(([cause, birds]) => ({ cause: cause.replace(/_/g, " "), birds }))),
      ];
    },

    async hatchery(ctx, _farm, p) {
      const batches = (await d.hatchery.listBatches(ctx, {})).filter((b) => inRange(b.setDate, p));
      const summary = await d.hatchery.summary(ctx, p);
      return [
        { kind: "summary", title: "Completed batches set in the period", items: [
          { label: "Batches hatched", value: summary.batches.hatched, type: "number" },
          { label: "Still incubating", value: summary.batches.incubating, type: "number" },
          { label: "Cancelled", value: summary.batches.cancelled, type: "number" },
          { label: "Eggs set (completed)", value: summary.completed.eggsSet, type: "number" },
          { label: "Fertility", value: r1(summary.completed.fertilityPercent), type: "percent" },
          { label: "Hatchability (of fertile)", value: r1(summary.completed.hatchabilityPercent), type: "percent" },
          { label: "Hatch of set", value: r1(summary.completed.hatchOfSetPercent), type: "percent" },
          { label: "Saleable chicks", value: r1(summary.completed.saleableChickPercent), type: "percent" },
          { label: "Loss", value: r1(summary.completed.lossPercent), type: "percent" },
        ] },
        table("Batches", [col("code", "Batch"), col("set", "Set", "date"), col("status", "Status"), col("eggsSet", "Set", "number"), col("infertile", "Infertile", "number"), col("deadEmbryo", "Dead embryo", "number"), col("cracked", "Cracked", "number"), col("hatched", "Hatched", "number"), col("deadInShell", "Dead in shell", "number"), col("culled", "Culled", "number"), col("saleable", "Saleable", "number"), col("fertility", "Fertility", "percent"), col("hatchability", "Hatchability", "percent"), col("saleablePct", "Saleable", "percent"), col("loss", "Loss", "percent")],
          batches.map((b) => ({ code: b.code, set: b.setDate, status: b.status, eggsSet: b.eggsSet, infertile: b.counts.infertile, deadEmbryo: b.counts.deadEmbryo, cracked: b.counts.cracked, hatched: b.counts.hatched, deadInShell: b.counts.deadInShell, culled: b.counts.culled, saleable: b.counts.saleable, fertility: r1(b.metrics.fertilityPercent), hatchability: r1(b.metrics.hatchabilityPercent), saleablePct: r1(b.metrics.saleableChickPercent), loss: r1(b.metrics.lossPercent) })),
          { note: "Fertility = fertile ÷ (set − cracked); hatchability = hatched ÷ fertile; saleable and loss are of eggs set." }),
      ];
    },

    async biosecurity(ctx, farm, p) {
      const tz = farm.settings.timezone;
      const [houses, visitors, logs, actions] = await Promise.all([repos.houses.find(ctx.farmId), repos.visitors.find(ctx.farmId), repos.biosecurityLogs.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to }, sort: [{ field: "date", dir: 1 }] }), repos.tasks.find(ctx.farmId, { where: { kind: "corrective_action" } })]);
      const houseName = new Map(houses.map((h) => [h.id, h.name]));
      const v = visitors.filter((x) => inRange(localDateOf(x.checkInAt, tz), p)).sort((a, b) => a.checkInAt.getTime() - b.checkInAt.getTime());
      const acts = actions.filter((a) => inRange(localDateOf(a.createdAt, tz), p));
      const byType = new Map<string, number>();
      for (const l of logs) byType.set(l.type, (byType.get(l.type) ?? 0) + 1);
      return [
        { kind: "summary", title: "Biosecurity in the period", items: [
          { label: "Visitors", value: v.length, type: "number" },
          { label: "Visitors flagged", value: v.filter((x) => x.flags?.length).length, type: "number" },
          { label: "Log entries", value: logs.length, type: "number" },
          { label: "Failed checklist items", value: sum(logs, (l) => l.checklist?.failedCount), type: "number" },
          { label: "Corrective actions raised", value: acts.length, type: "number" },
          { label: "Corrective actions still open", value: acts.filter((a) => a.status !== "done" && a.status !== "cancelled").length, type: "number" },
        ] },
        table("Visitors", [col("date", "Checked in", "date"), col("name", "Name"), col("company", "Company"), col("type", "Type"), col("contact", "Poultry contact"), col("downtime", "Downtime (h)", "number"), col("flags", "Flags")], v.map((x) => ({ date: localDateOf(x.checkInAt, tz), name: x.name, company: x.company ?? "", type: x.type, contact: x.previousPoultryContact?.hadContact ? "yes" : "no", downtime: x.downtimeHours ?? null, flags: (x.flags ?? []).join(", ").replace(/_/g, " ") }))),
        table("Log entries by type", [col("type", "Type"), col("count", "Entries", "number")], [...byType.entries()].map(([type, count]) => ({ type: type.replace(/_/g, " "), count }))),
        table("Log entries", [col("date", "Date", "date"), col("type", "Type"), col("house", "House"), col("detail", "Detail"), col("failed", "Failed items", "number")], logs.map((l) => ({ date: l.date, type: l.type.replace(/_/g, " "), house: l.houseId ? houseName.get(l.houseId) ?? "" : "", detail: l.product?.name ?? l.vehicle?.registration ?? l.footbath?.action ?? l.pest?.pestType ?? l.wildBird?.description ?? "", failed: l.checklist?.failedCount ?? null }))),
        table("Corrective actions", [col("raised", "Raised", "date"), col("title", "Action"), col("priority", "Priority"), col("status", "Status"), col("completed", "Completed", "date"), col("verified", "Verified", "date")], acts.map((a) => ({ raised: localDateOf(a.createdAt, tz), title: a.title, priority: a.priority ?? "", status: a.status, completed: a.completedAt ? localDateOf(a.completedAt, tz) : null, verified: a.verifiedAt ? localDateOf(a.verifiedAt, tz) : null }))),
      ];
    },

    async financial(ctx, _farm, p) {
      const [pnl, cash, recv, pay, exp] = await Promise.all([d.finance.profitAndLoss(ctx, p), d.finance.cashFlow(ctx, p), d.finance.openItems(ctx, "income"), d.finance.openItems(ctx, "expense"), d.finance.expenseBreakdown(ctx, p)]);
      const label = (k: string) => k.replace(/_/g, " ");
      const buckets = (b: Record<string, number>) => [{ label: "Current", value: b["current"] ?? 0 }, { label: "1–30 days overdue", value: b["1_30"] ?? 0 }, { label: "31–60 days", value: b["31_60"] ?? 0 }, { label: "61–90 days", value: b["61_90"] ?? 0 }, { label: "Over 90 days", value: b["over_90"] ?? 0 }];
      return [
        { kind: "summary", title: "Profit and loss (accrual, excluding tax)", items: [
          { label: "Revenue", value: pnl.revenue.totalMinor, type: "money" },
          { label: "Expenses", value: pnl.expenses.totalMinor, type: "money" },
          { label: "Net profit", value: pnl.netProfitMinor, type: "money" },
          { label: "Margin", value: r1(pnl.marginPercent), type: "percent" },
          { label: "Tax on sales", value: pnl.tax.onSalesMinor, type: "money" },
          { label: "Tax on purchases", value: pnl.tax.onPurchasesMinor, type: "money" },
        ] },
        table("Revenue by category", [col("category", "Category"), col("amount", "Amount", "money")], pnl.revenue.byCategory.map((x) => ({ category: label(x.key), amount: x.amountMinor })), { totals: { amount: pnl.revenue.totalMinor } }),
        table("Expenses by category", [col("category", "Category"), col("amount", "Amount", "money")], pnl.expenses.byCategory.map((x) => ({ category: label(x.key), amount: x.amountMinor })), { totals: { amount: pnl.expenses.totalMinor } }),
        table("Profit by month", [col("month", "Month"), col("revenue", "Revenue", "money"), col("expenses", "Expenses", "money"), col("profit", "Profit", "money")], pnl.byMonth.map((m) => ({ month: m.month, revenue: m.revenueMinor, expenses: m.expensesMinor, profit: m.profitMinor }))),
        table("Cash flow by account", [col("account", "Account"), col("type", "Type"), col("opening", "Opening", "money"), col("added", "Opened in period", "money"), col("in", "In", "money"), col("out", "Out", "money"), col("closing", "Closing", "money")], cash.accounts.map((a) => ({ account: a.name, type: a.type.replace("_", " "), opening: a.openingMinor, added: a.openedInPeriodMinor, in: a.inMinor, out: a.outMinor, closing: a.closingMinor })), { note: `Net cash flow ${cash.netCashFlowMinor / 100} ${pnl.currency}; transfers between accounts (${cash.transfersMinor / 100}) are not counted as cash in or out.` }),
        { kind: "summary", title: "Receivables (owed to the farm), by age", items: [...buckets(recv.buckets).map((b) => ({ ...b, type: "money" as const })), { label: "Total outstanding", value: recv.totalOutstandingMinor, type: "money" }] },
        { kind: "summary", title: "Payables (owed by the farm), by age", items: [...buckets(pay.buckets).map((b) => ({ ...b, type: "money" as const })), { label: "Total outstanding", value: pay.totalOutstandingMinor, type: "money" }] },
        table("Spending by supplier", [col("supplier", "Supplier"), col("amount", "Amount", "money")], exp.bySupplier.map((x) => ({ supplier: x.key, amount: x.amountMinor })), { totals: { amount: exp.totalMinor } }),
      ];
    },

    async marketplace(ctx, farm, p) {
      const tz = farm.settings.timezone;
      const [listings, orders, payments, buyers] = await Promise.all([repos.listings.find(ctx.farmId), repos.orders.find(ctx.farmId), repos.orderPayments.find(ctx.farmId, { range: { field: "date", from: p.from, to: p.to } }), repos.buyers.find(ctx.farmId)]);
      const buyer = new Map(buyers.map((b) => [b.id, b.name]));
      const inPeriod = orders.filter((o) => inRange(localDateOf(o.createdAt, tz), p)).sort((a, b) => a.orderNumber - b.orderNumber);
      const sold = inPeriod.filter((o) => o.status === "delivered" || o.status === "completed");
      const byStatus = new Map<string, number>();
      for (const o of inPeriod) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
      const received = sum(payments.filter((x) => x.kind === "payment"), (x) => x.amount.amountMinor);
      const refunded = sum(payments.filter((x) => x.kind === "refund"), (x) => x.amount.amountMinor);
      return [
        { kind: "summary", title: "Orders placed in the period", items: [
          { label: "Orders", value: inPeriod.length, type: "number" },
          ...[...byStatus.entries()].map(([s, n]) => ({ label: `  ${s}`, value: n, type: "number" as const })),
          { label: "Delivered or completed value", value: sum(sold, (o) => o.total.amountMinor), type: "money" },
          { label: "Payments received in the period", value: received, type: "money" },
          { label: "Refunds in the period", value: refunded, type: "money" },
        ] },
        table("Orders", [col("number", "Order", "number"), col("date", "Placed", "date"), col("channel", "Channel"), col("buyer", "Buyer"), col("item", "Item"), col("qty", "Quantity", "number"), col("unit", "Unit"), col("total", "Total", "money"), col("paid", "Paid", "money"), col("status", "Status"), col("payment", "Payment")],
          inPeriod.map((o) => ({ number: o.orderNumber, date: localDateOf(o.createdAt, tz), channel: o.channel, buyer: o.buyerName ?? (o.buyerId ? buyer.get(o.buyerId) ?? "" : ""), item: o.lines[0]?.description ?? "", qty: o.lines[0]?.quantity ?? null, unit: o.lines[0]?.unit ?? "", total: o.total.amountMinor, paid: o.amountPaid?.amountMinor ?? 0, status: o.status, payment: o.paymentStatus.replace("_", " ") })),
          { totals: { total: sum(inPeriod, (o) => o.total.amountMinor), paid: sum(inPeriod, (o) => o.amountPaid?.amountMinor ?? 0) } }),
        table("Listings", [col("title", "Listing"), col("category", "Category"), col("status", "Status"), col("available", "Available", "number"), col("unit", "Unit"), col("price", "Price", "money")], listings.map((l) => ({ title: l.title, category: l.category.replace(/_/g, " "), status: l.status, available: l.quantityAvailable, unit: l.unit, price: l.price.amountMinor }))),
      ];
    },
  };

  return {
    /** The reports this person may export, with what each needs. */
    async catalog(ctx: FarmContext) {
      assertCan(ctx, "farm.read");
      return (Object.entries(REPORTS) as [ReportType, (typeof REPORTS)[ReportType]][]).map(([type, r]) => ({ type, title: r.title, description: r.description, available: can(ctx.role, r.permission), needsFlock: r.needsFlock, formats: ["pdf", "csv", "xlsx", "json"] }));
    },

    async build(ctx: FarmContext, type: ReportType, q: { from?: string; to?: string; flockId?: string }, format: string): Promise<ReportDocument> {
      const def = REPORTS[type];
      if (!def) throw notFound("Report");
      assertCan(ctx, def.permission);
      const farm = await repos.farms.findById(ctx.farmId);
      if (!farm) throw notFound("Farm");
      const p = period(farm, q);
      const notes: string[] = [];
      const sections = await builders[type](ctx, farm, p, q, notes);
      const user = await repos.users.findById(ctx.userId);
      await repos.tx.run((tx) => d.audit.record(ctx, { action: "report.exported", entity: "report", entityId: type, after: { type, format, from: p.from, to: p.to, ...(q.flockId ? { flockId: q.flockId } : {}) } }, tx));
      return {
        type,
        title: def.title,
        farmName: farm.name,
        period: p,
        generatedAt: clock.now().toISOString(),
        generatedBy: user?.fullName ?? "PoultryPilot",
        currency: farm.settings.currency,
        sections,
        notes,
      };
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
