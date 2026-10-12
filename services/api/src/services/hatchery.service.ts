import type { EggGrade } from "@poultrypilot/types";
import {
  INCUBATION_DAYS,
  addDays,
  assertHatchEventAllowed,
  batchCounts,
  effectiveHatchEvents,
  expectedTransferDate,
  hatcheryMetrics,
  overallHatchOfSet,
  reversibleHatchEvent,
  type HatchEvent,
} from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { BuyerRecord, ChickLotRecord, FarmRecord, HatcheryBatchRecord, HatcheryEventRecord, MoneyValue, OrderRecord } from "../ports/records.js";
import type { AlertService } from "./alert.service.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import { duplicate } from "./house.service.js";
import type { InventoryService } from "./inventory.service.js";
import type { SyncService } from "./sync.service.js";

const LAYING_FLOCKS = new Set(["layer", "breeder", "custom"]);
const OPEN_ORDER = new Set(["pending", "confirmed"]);

export interface CreateBatchInput {
  code: string;
  species: HatcheryBatchRecord["species"];
  breed?: string;
  eggSource: "own_flock" | "purchased";
  sourceFlockId?: string;
  eggGrade?: EggGrade;
  supplier?: string;
  eggsReceived: number;
  rejects?: HatcheryBatchRecord["rejects"];
  setDate: string;
  incubationDays?: number;
  incubatorId?: string;
  eggCost?: MoneyValue;
  otherCost?: MoneyValue;
  notes?: string;
}

export function createHatcheryService(d: { repos: Repositories; clock: Clock; audit: AuditService; sync: SyncService; inventory: InventoryService; alerts: AlertService }) {
  const { repos, clock } = d;
  const E = d.inventory.engine;
  const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
  const strip = <T extends { farmId: string; deletedAt?: Date; deletedBy?: string; createdAt: Date; updatedAt: Date }>({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }: T) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  });

  const toHatchEvent = (e: HatcheryEventRecord): HatchEvent => ({ id: e.id, type: e.type, date: e.date, ...(e.counts ? { counts: e.counts } : {}), ...(e.reversalOf ? { reversalOf: e.reversalOf } : {}) });
  const sortEvents = (a: HatcheryEventRecord, b: HatcheryEventRecord) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.getTime() - b.createdAt.getTime());

  async function loadBatch(ctx: FarmContext, id: string, tx?: Tx) {
    const b = await repos.hatcheryBatches.findById(ctx.farmId, id, tx);
    if (!b) throw notFound("Hatchery batch");
    return b;
  }
  const loadEvents = async (ctx: FarmContext, batchId: string, tx?: Tx) => (await repos.hatcheryEvents.find(ctx.farmId, { where: { batchId } }, tx)).sort(sortEvents);

  function snapshot(b: HatcheryBatchRecord, events: HatcheryEventRecord[]) {
    const c = batchCounts(b.eggsSet, events.map(toHatchEvent));
    const m = hatcheryMetrics(c);
    const status: HatcheryBatchRecord["status"] = c.stage === "incubating" ? "incubating" : c.stage === "in_hatcher" ? "in_hatcher" : "hatched";
    return {
      status,
      results: defined({
        infertile: c.infertile, cracked: c.cracked, deadEmbryo: c.deadEmbryo, transferred: c.transferred ?? undefined, hatched: c.hatched, deadInShell: c.deadInShell, culled: c.culled, saleable: c.saleable, inIncubation: c.inIncubation,
        fertilityPercent: m.fertilityPercent ?? undefined, hatchabilityPercent: m.hatchabilityPercent ?? undefined, saleableChickPercent: m.saleableChickPercent ?? undefined, lossPercent: m.lossPercent ?? undefined,
      }),
      counts: c,
      metrics: m,
    };
  }

  async function batchView(ctx: FarmContext, b: HatcheryBatchRecord, events?: HatcheryEventRecord[], tx?: Tx) {
    const ev = events ?? (await loadEvents(ctx, b.id, tx));
    const s = snapshot(b, ev);
    const booked = (await repos.orders.find(ctx.farmId, { where: { hatcheryBatchId: b.id } }, tx)).filter((o) => OPEN_ORDER.has(o.status)).reduce((t, o) => t + o.lines.reduce((x, l) => x + l.quantity, 0), 0);
    return { ...strip(b), counts: s.counts, metrics: s.metrics, chicksBooked: booked };
  }

  /** Chicks still free in a lot: remaining minus open orders that will draw from it. */
  async function lotAvailability(ctx: FarmContext, lot: ChickLotRecord, excludeOrderId: string | undefined, tx?: Tx) {
    const batchIds = lot.hatcheryBatchId ? [lot.hatcheryBatchId] : [];
    const orders = await repos.orders.find(ctx.farmId, { where: { status: ["pending", "confirmed"] } as never }, tx);
    const reserved = orders
      .filter((o) => o.id !== excludeOrderId)
      .flatMap((o) => o.lines.filter((l) => l.chickLotId === lot.id || (!l.chickLotId && o.hatcheryBatchId && batchIds.includes(o.hatcheryBatchId))))
      .reduce((t, l) => t + l.quantity, 0);
    return { remaining: lot.remaining, reserved, available: lot.remaining - reserved };
  }

  /** Appends one event under the batch's version lock and rewrites the results snapshot. */
  async function append(ctx: FarmContext, farm: FarmRecord, b: HatcheryBatchRecord, events: HatcheryEventRecord[], draft: Omit<HatcheryEventRecord, "id" | "farmId" | "batchId" | "createdBy" | "createdAt" | "updatedAt">, patch: Partial<HatcheryBatchRecord>, tx: Tx) {
    if (draft.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${draft.date} is in the future for this farm`);
    if (draft.date < b.setDate) throw new AppError("VALIDATION_FAILED", `${draft.date} is before the eggs were set on ${b.setDate}`);
    const counted = effectiveHatchEvents(events.map(toHatchEvent)).filter((e) => e.type !== "set" && e.counts);
    const last = counted[counted.length - 1];
    if (draft.counts && last && draft.date < last.date) throw new AppError("VALIDATION_FAILED", `${draft.date} is before the last recorded stage (${last.date})`);
    const now = clock.now();
    const rec: HatcheryEventRecord = { id: newId(), farmId: ctx.farmId, batchId: b.id, createdBy: ctx.userId, createdAt: now, updatedAt: now, ...defined(draft) };
    if (rec.type !== "reversal") assertHatchEventAllowed(b.eggsSet, events.map(toHatchEvent), toHatchEvent(rec));
    await repos.hatcheryEvents.insert(rec, tx);
    const all = [...events, rec];
    const s = snapshot(b, all);
    const next = await repos.hatcheryBatches.update(ctx.farmId, b.id, { status: s.status, results: s.results, ...patch, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: b.version }, tx);
    if (!next) throw new AppError("VERSION_CONFLICT", "This batch was changed at the same time by someone else. Reload and try again.");
    await d.audit.record(ctx, { action: `hatchery.${rec.type}`, entity: "hatchery_batch", entityId: b.id, after: { date: rec.date, counts: rec.counts } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "hatchery_batch", entityId: b.id, op: "upsert", version: next.version }, tx);
    return { batch: next, event: rec, events: all };
  }

  const orderView = (o: OrderRecord, buyer?: BuyerRecord) => ({ ...strip(o), quantity: o.lines.reduce((t, l) => t + l.quantity, 0), ...(buyer ? { buyerName: buyer.name } : {}) });

  async function setStatus(ctx: FarmContext, o: OrderRecord, status: OrderRecord["status"], patch: Partial<OrderRecord>, tx: Tx) {
    const now = clock.now();
    const next = await repos.orders.update(ctx.farmId, o.id, { status, statusHistory: [...o.statusHistory, { status, at: now, by: ctx.userId }], ...patch, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: o.version }, tx);
    if (!next) throw new AppError("VERSION_CONFLICT", "This order was changed by someone else");
    await d.audit.record(ctx, { action: `order.${status}`, entity: "order", entityId: o.id, before: { status: o.status }, after: { status } }, tx);
    return next;
  }

  return {
    // ---- batches

    /**
     * Egg source → selection → setting, in one step. Own-flock eggs are drawn from egg stock (the given grade, or
     * ungraded). Rejected eggs are not set; expected transfer and hatch dates follow the species' incubation period.
     */
    async createBatch(ctx: FarmContext, input: CreateBatchInput & { id?: string }) {
      assertCan(ctx, "hatchery.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        if (input.setDate > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${input.setDate} is in the future for this farm`);
        const rejected = Object.values(input.rejects ?? {}).reduce((t, n) => t + (n ?? 0), 0);
        const eggsSet = input.eggsReceived - rejected;
        if (eggsSet < 1) throw new AppError("VALIDATION_FAILED", `All ${input.eggsReceived} eggs were rejected at selection; nothing to set`);
        E.assertCurrency(input.eggCost, farm, "eggCost");
        E.assertCurrency(input.otherCost, farm, "otherCost");
        if (input.incubatorId) {
          const eq = await repos.equipment.findById(ctx.farmId, input.incubatorId, tx);
          if (!eq) throw notFound("Incubator");
          if (eq.type !== "incubator" && eq.type !== "hatcher") throw new AppError("VALIDATION_FAILED", `${eq.name} is not an incubator`);
        }
        const id = input.id ?? newId();
        const now = clock.now();
        if (input.eggSource === "own_flock") {
          if (!input.sourceFlockId) throw new AppError("VALIDATION_FAILED", "Name the flock the eggs came from");
          const flock = await repos.flocks.findById(ctx.farmId, input.sourceFlockId, tx);
          if (!flock) throw notFound("Flock");
          if (!LAYING_FLOCKS.has(flock.type)) throw new AppError("VALIDATION_FAILED", `${flock.flockCode} is a ${flock.type} flock and does not lay hatching eggs`);
          const stock = await d.inventory.eggStock(ctx, tx);
          const bucket = input.eggGrade ?? "ungraded";
          const available = stock.byGrade[bucket] ?? 0;
          if (input.eggsReceived > available) throw new AppError("INSUFFICIENT_STOCK", `Only ${available} ${bucket} eggs in stock`, { available, requested: input.eggsReceived });
          await repos.eggInventory.insert(
            { id: newId(), farmId: ctx.farmId, date: input.setDate, type: "used", ...(input.eggGrade ? { grade: input.eggGrade } : {}), quantityDelta: -input.eggsReceived, flockId: flock.id, sourceType: "hatchery_batch", sourceId: id, note: `Hatching eggs for batch ${input.code}`, createdBy: ctx.userId, createdAt: now, updatedAt: now },
            tx,
          );
        }
        const days = input.incubationDays ?? INCUBATION_DAYS[input.species];
        const b: HatcheryBatchRecord = {
          id,
          farmId: ctx.farmId,
          ...defined({ code: input.code, species: input.species, breed: input.breed, eggSource: input.eggSource, sourceFlockId: input.sourceFlockId, eggGrade: input.eggGrade, supplier: input.supplier, incubatorId: input.incubatorId, eggCost: input.eggCost, otherCost: input.otherCost, notes: input.notes }),
          eggsReceived: input.eggsReceived,
          ...(rejected ? { rejects: Object.fromEntries(Object.entries(input.rejects!).filter(([, n]) => (n ?? 0) > 0)) } : {}),
          eggsSet,
          setDate: input.setDate,
          incubationDays: days,
          expectedTransferDate: expectedTransferDate(input.setDate, days),
          expectedHatchDate: addDays(input.setDate, days),
          status: "incubating",
          results: { infertile: 0, cracked: 0, deadEmbryo: 0, hatched: 0, deadInShell: 0, culled: 0, saleable: 0, inIncubation: eggsSet },
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.hatcheryBatches.insert(b, tx).catch(duplicate(`Batch code "${input.code}"`));
        const setEvent: HatcheryEventRecord = { id: newId(), farmId: ctx.farmId, batchId: id, type: "set", date: input.setDate, ...(input.incubatorId ? { machine: "setter" as const } : {}), createdBy: ctx.userId, createdAt: now, updatedAt: now };
        await repos.hatcheryEvents.insert(setEvent, tx);
        await d.audit.record(ctx, { action: "hatchery.batch_set", entity: "hatchery_batch", entityId: id, after: { code: b.code, eggsReceived: b.eggsReceived, eggsSet, expectedHatchDate: b.expectedHatchDate } }, tx);
        return batchView(ctx, b, [setEvent], tx);
      });
    },

    async recordCandling(ctx: FarmContext, id: string, r: { date: string; infertile: number; deadEmbryo: number; cracked: number; note?: string }) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This batch is cancelled");
        const out = await append(ctx, farm, b, await loadEvents(ctx, id, tx), { type: "candling", date: r.date, counts: { infertile: r.infertile, deadEmbryo: r.deadEmbryo, cracked: r.cracked }, machine: "setter", ...(r.note ? { note: r.note } : {}) }, {}, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },

    async recordTransfer(ctx: FarmContext, id: string, r: { date: string; cracked: number; deadEmbryo: number; hatcherId?: string; note?: string }) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This batch is cancelled");
        if (r.hatcherId && !(await repos.equipment.findById(ctx.farmId, r.hatcherId, tx))) throw notFound("Hatcher");
        const out = await append(ctx, farm, b, await loadEvents(ctx, id, tx), { type: "transfer_to_hatcher", date: r.date, counts: { cracked: r.cracked, deadEmbryo: r.deadEmbryo }, machine: "hatcher", ...(r.note ? { note: r.note } : {}) }, r.hatcherId ? { hatcherId: r.hatcherId } : {}, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },

    /** The hatch. Eggs that did not hatch are dead in shell; if not given, the remainder is counted as such. */
    async recordHatch(ctx: FarmContext, id: string, r: { date: string; hatched: number; deadInShell?: number; note?: string }) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This batch is cancelled");
        const events = await loadEvents(ctx, id, tx);
        const inMachine = batchCounts(b.eggsSet, events.map(toHatchEvent)).inIncubation;
        const deadInShell = r.deadInShell ?? inMachine - r.hatched;
        const out = await append(ctx, farm, b, events, { type: "hatch", date: r.date, counts: { hatched: r.hatched, deadInShell }, machine: "hatcher", ...(r.note ? { note: r.note } : {}) }, {}, tx);
        await d.alerts.resolve(ctx, `hatch_due:${id}`, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },

    /** Grading splits hatched chicks into saleable and culled; saleable chicks become a chick lot. */
    async recordGrading(ctx: FarmContext, id: string, r: { date: string; saleable: number; culled: number; note?: string }) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        const events = await loadEvents(ctx, id, tx);
        const now = clock.now();
        const costMinor = (b.eggCost?.amountMinor ?? 0) + (b.otherCost?.amountMinor ?? 0);
        const hatchDate = effectiveHatchEvents(events.map(toHatchEvent)).find((e) => e.type === "hatch")?.date ?? r.date;
        const lot: ChickLotRecord = {
          id: newId(),
          farmId: ctx.farmId,
          source: "own_hatchery",
          hatcheryBatchId: b.id,
          species: b.species,
          ...(b.breed ? { breed: b.breed } : {}),
          hatchDate,
          quantity: r.saleable,
          remaining: r.saleable,
          status: r.saleable > 0 ? "available" : "depleted",
          ...(costMinor > 0 && r.saleable > 0 ? { unitCost: { amountMinor: Math.round(costMinor / r.saleable), currency: farm.settings.currency } } : {}),
          notes: `From hatchery batch ${b.code}`,
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        const out = await append(ctx, farm, b, events, { type: "chick_grading", date: r.date, counts: { saleable: r.saleable, culled: r.culled }, chickLotId: lot.id, ...(r.note ? { note: r.note } : {}) }, { chickLotId: lot.id }, tx);
        await repos.chickLots.insert(lot, tx);
        return { batch: await batchView(ctx, out.batch, out.events, tx), chickLot: strip(lot) };
      });
    },

    async recordReading(ctx: FarmContext, id: string, r: { date: string; machine: "setter" | "hatcher"; temperatureC?: number; humidityPercent?: number; note?: string }) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        const out = await append(ctx, farm, b, await loadEvents(ctx, id, tx), { type: r.temperatureC !== undefined || r.humidityPercent !== undefined ? "environment_reading" : "note", ...defined(r) }, {}, tx);
        return strip(out.event);
      });
    },

    /** Undoes the latest stage. A grading can be undone only while its chick lot is untouched and unbooked. */
    async reverseLatest(ctx: FarmContext, id: string, reason: string) {
      assertCan(ctx, "hatchery.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        const events = await loadEvents(ctx, id, tx);
        const target = reversibleHatchEvent(events.map(toHatchEvent));
        if (!target) throw new AppError("INVALID_STATE_TRANSITION", "There is nothing to undo on this batch");
        let patch: Partial<HatcheryBatchRecord> = {};
        if (target.type === "chick_grading" && b.chickLotId) {
          const lot = await repos.chickLots.findById(ctx.farmId, b.chickLotId, tx);
          if (lot && (lot.remaining !== lot.quantity || (lot.placedFlockIds?.length ?? 0) > 0)) throw new AppError("INVALID_STATE_TRANSITION", "Chicks from this grading have already been placed or sold; it cannot be undone");
          if (lot && (await lotAvailability(ctx, lot, undefined, tx)).reserved > 0) throw new AppError("INVALID_STATE_TRANSITION", "Chicks from this grading are booked on orders; cancel or move the orders first");
          if (lot) await repos.chickLots.update(ctx.farmId, lot.id, { status: "closed", deletedAt: clock.now(), deletedBy: ctx.userId, updatedAt: clock.now() }, undefined, tx);
          patch = { chickLotId: undefined };
        }
        const today = E.todayOf(farm);
        const out = await append(ctx, farm, b, events, { type: "reversal", date: today < b.setDate ? b.setDate : today, reversalOf: target.id, note: reason }, patch, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },

    /** A batch can be cancelled before it hatches (power failure, contamination). The eggs set are written off. */
    async cancelBatch(ctx: FarmContext, id: string, reason: string) {
      assertCan(ctx, "hatchery.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status !== "incubating" && b.status !== "in_hatcher") throw new AppError("INVALID_STATE_TRANSITION", `A ${b.status} batch cannot be cancelled`);
        const events = await loadEvents(ctx, id, tx);
        const now = clock.now();
        await repos.hatcheryEvents.insert({ id: newId(), farmId: ctx.farmId, batchId: id, type: "cancelled", date: E.todayOf(farm), note: reason, createdBy: ctx.userId, createdAt: now, updatedAt: now }, tx);
        const next = await repos.hatcheryBatches.update(ctx.farmId, id, { status: "cancelled", cancelledReason: reason, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: b.version }, tx);
        await d.alerts.resolve(ctx, `hatch_due:${id}`, tx);
        await d.audit.record(ctx, { action: "hatchery.cancelled", entity: "hatchery_batch", entityId: id, after: { reason } }, tx);
        return batchView(ctx, next!, events, tx);
      });
    },

    async getBatch(ctx: FarmContext, id: string) {
      assertCan(ctx, "hatchery.read");
      const b = await loadBatch(ctx, id);
      const events = await loadEvents(ctx, id);
      const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf!));
      return { ...(await batchView(ctx, b, events)), events: events.map((e) => ({ ...strip(e), reversed: reversed.has(e.id) })) };
    },

    async listBatches(ctx: FarmContext, q: { status?: HatcheryBatchRecord["status"] }) {
      assertCan(ctx, "hatchery.read");
      const rows = await repos.hatcheryBatches.find(ctx.farmId, { ...(q.status ? { where: { status: q.status } } : {}), sort: [{ field: "setDate", dir: -1 }] });
      return Promise.all(rows.map((b) => batchView(ctx, b)));
    },

    /** Hatchery performance over completed batches (incubating ones never drag the rate down; audit B27). */
    async summary(ctx: FarmContext, q: { from?: string; to?: string }) {
      assertCan(ctx, "hatchery.read");
      const rows = await repos.hatcheryBatches.find(ctx.farmId, { range: { field: "setDate", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) } });
      const live = rows.filter((b) => b.status !== "cancelled");
      const done = live.filter((b) => b.status === "hatched");
      const sum = (f: (b: HatcheryBatchRecord) => number) => done.reduce((t, b) => t + f(b), 0);
      const eggsSet = sum((b) => b.eggsSet);
      const cracked = sum((b) => b.results?.cracked ?? 0);
      const fertile = eggsSet - cracked - sum((b) => b.results?.infertile ?? 0);
      const hatched = sum((b) => b.results?.hatched ?? 0);
      const graded = done.filter((b) => (b.results?.saleable ?? 0) + (b.results?.culled ?? 0) > 0);
      const gradedSet = graded.reduce((t, b) => t + b.eggsSet, 0);
      const saleable = graded.reduce((t, b) => t + (b.results?.saleable ?? 0), 0);
      const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);
      return {
        batches: { incubating: live.filter((b) => b.status === "incubating" || b.status === "in_hatcher").length, hatched: done.length, cancelled: rows.length - live.length },
        eggsIncubating: live.filter((b) => b.status !== "hatched").reduce((t, b) => t + (b.results?.inIncubation ?? b.eggsSet), 0),
        completed: {
          eggsSet,
          hatched,
          saleable,
          fertilityPercent: pct(fertile, eggsSet - cracked),
          hatchabilityPercent: pct(hatched, fertile),
          hatchOfSetPercent: overallHatchOfSet(done.map((b) => ({ eggsSet: b.eggsSet, hatched: b.results?.hatched ?? 0 }))),
          saleableChickPercent: pct(saleable, gradedSet),
          lossPercent: gradedSet > 0 ? pct(gradedSet - saleable, gradedSet) : null,
        },
      };
    },

    /** Hourly: a hatch due today or overdue that has not been recorded. */
    async evaluateAlerts(ctx: FarmContext, tx: Tx) {
      const farm = await E.farmOf(ctx, tx);
      const today = E.todayOf(farm);
      for (const b of await repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] } as never, range: { field: "expectedHatchDate", to: today } }, tx)) {
        await d.alerts.raise(ctx, { ruleType: "hatch_due", severity: b.expectedHatchDate < today ? "warning" : "info", title: `Hatch ${b.expectedHatchDate < today ? "overdue" : "due today"}: batch ${b.code}`, message: `Batch ${b.code} (${b.eggsSet} eggs set on ${b.setDate}) was expected to hatch on ${b.expectedHatchDate}. Record the hatch when it is done.`, dedupKey: `hatch_due:${b.id}`, date: today }, tx);
      }
    },

    // ---- buyers and chick orders

    async createBuyer(ctx: FarmContext, r: { name: string; type: BuyerRecord["type"]; phone?: string; email?: string; locationLabel?: string; notes?: string }) {
      assertCan(ctx, "market.manage");
      const now = clock.now();
      const rec: BuyerRecord = { id: newId(), farmId: ctx.farmId, ...defined(r), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.buyers.insert(rec);
      return strip(rec);
    },

    async listBuyers(ctx: FarmContext) {
      assertCan(ctx, "market.read");
      return (await repos.buyers.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },

    /**
     * A chick order: from a chick lot (checked against chicks not already booked) or booked against a batch still
     * incubating (drawn from that batch's lot at delivery). Prices come from the farm, in the farm currency.
     */
    async createChickOrder(ctx: FarmContext, r: { buyerId: string; quantity: number; unitPrice: MoneyValue; requestedDeliveryDate?: string; chickLotId?: string; hatcheryBatchId?: string; deliveryAddress?: string; notes?: string }) {
      assertCan(ctx, "market.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        E.assertCurrency(r.unitPrice, farm, "unitPrice");
        const buyer = await repos.buyers.findById(ctx.farmId, r.buyerId, tx);
        if (!buyer) throw notFound("Buyer");
        let description = "Day-old chicks";
        if (r.chickLotId) {
          const lot = await repos.chickLots.findById(ctx.farmId, r.chickLotId, tx);
          if (!lot) throw notFound("Chick lot");
          const a = await lotAvailability(ctx, lot, undefined, tx);
          if (r.quantity > a.available) throw new AppError("INSUFFICIENT_STOCK", `Only ${a.available} chicks are free in that lot (${a.reserved} already booked)`, a);
          description = `Day-old chicks${lot.breed ? ` (${lot.breed})` : ""}, hatched ${lot.hatchDate}`;
        } else if (r.hatcheryBatchId) {
          const b = await loadBatch(ctx, r.hatcheryBatchId, tx);
          if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "That batch is cancelled");
          if (b.chickLotId) throw new AppError("VALIDATION_FAILED", "That batch is already graded; order from its chick lot");
          description = `Day-old chicks from batch ${b.code}, expected ${b.expectedHatchDate}`;
        }
        const now = clock.now();
        const total = { amountMinor: Math.round(r.unitPrice.amountMinor * r.quantity), currency: farm.settings.currency };
        const order: OrderRecord = {
          id: newId(),
          farmId: ctx.farmId,
          orderNumber: await repos.counters.next("order", ctx.farmId, tx),
          channel: "direct",
          buyerId: buyer.id,
          ...(r.hatcheryBatchId ? { hatcheryBatchId: r.hatcheryBatchId } : {}),
          lines: [{ category: "day_old_chicks", description, ...(r.chickLotId ? { chickLotId: r.chickLotId } : {}), quantity: r.quantity, unit: "chick", unitPrice: r.unitPrice, total }],
          subtotal: total,
          total,
          status: "pending",
          statusHistory: [{ status: "pending", at: now, by: ctx.userId }],
          paymentStatus: "unpaid",
          ...defined({ requestedDeliveryDate: r.requestedDeliveryDate, deliveryAddress: r.deliveryAddress, notes: r.notes }),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.orders.insert(order, tx);
        await d.audit.record(ctx, { action: "order.created", entity: "order", entityId: order.id, after: { orderNumber: order.orderNumber, quantity: r.quantity, total } }, tx);
        return orderView(order, buyer);
      });
    },

    async confirmOrder(ctx: FarmContext, id: string) {
      assertCan(ctx, "market.manage");
      return repos.tx.run(async (tx) => {
        const o = await repos.orders.findById(ctx.farmId, id, tx);
        if (!o) throw notFound("Order");
        if (o.status !== "pending") throw new AppError("INVALID_STATE_TRANSITION", `A ${o.status} order cannot be confirmed`);
        return orderView(await setStatus(ctx, o, "confirmed", {}, tx));
      });
    },

    async cancelOrder(ctx: FarmContext, id: string, reason: string) {
      assertCan(ctx, "market.manage");
      return repos.tx.run(async (tx) => {
        const o = await repos.orders.findById(ctx.farmId, id, tx);
        if (!o) throw notFound("Order");
        if (!OPEN_ORDER.has(o.status)) throw new AppError("INVALID_STATE_TRANSITION", `A ${o.status} order cannot be cancelled`);
        return orderView(await setStatus(ctx, o, "cancelled", { notes: [o.notes, `Cancelled: ${reason}`].filter(Boolean).join("\n") }, tx));
      });
    },

    /** Delivery draws the chicks from the lot (the order's lot, or the lot of the batch it was booked on). */
    async deliverOrder(ctx: FarmContext, id: string, r: { date: string; chickLotId?: string }) {
      assertCan(ctx, "market.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        if (r.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        const o = await repos.orders.findById(ctx.farmId, id, tx);
        if (!o) throw notFound("Order");
        if (o.status !== "confirmed") throw new AppError("INVALID_STATE_TRANSITION", o.status === "pending" ? "Confirm the order before delivering it" : `A ${o.status} order cannot be delivered`);
        const line = o.lines[0]!;
        let lotId = r.chickLotId ?? line.chickLotId;
        if (!lotId && o.hatcheryBatchId) lotId = (await loadBatch(ctx, o.hatcheryBatchId, tx)).chickLotId;
        if (!lotId) throw new AppError("VALIDATION_FAILED", "The batch for this order has not been graded yet; there are no chicks to deliver");
        const lot = await repos.chickLots.findById(ctx.farmId, lotId, tx);
        if (!lot) throw notFound("Chick lot");
        const a = await lotAvailability(ctx, lot, o.id, tx);
        if (line.quantity > a.available) throw new AppError("INSUFFICIENT_STOCK", `Only ${Math.max(0, a.available)} chicks are free in the lot (${lot.remaining} remaining, ${a.reserved} booked by other orders)`, a);
        const remaining = lot.remaining - line.quantity;
        const updatedLot = await repos.chickLots.update(ctx.farmId, lot.id, { remaining, status: remaining === 0 ? "depleted" : "available", updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: lot.version }, tx);
        if (!updatedLot) throw new AppError("VERSION_CONFLICT", "That chick lot changed at the same time elsewhere. Try again.");
        const next = await setStatus(ctx, o, "delivered", { deliveredDate: r.date, lines: [{ ...line, chickLotId: lot.id }] }, tx);
        return { order: orderView(next), chickLot: strip(updatedLot) };
      });
    },

    async listOrders(ctx: FarmContext, q: { status?: OrderRecord["status"]; from?: string; to?: string }) {
      assertCan(ctx, "market.read");
      const rows = await repos.orders.find(ctx.farmId, { ...(q.status ? { where: { status: q.status } } : {}), sort: [{ field: "createdAt", dir: -1 }] });
      const buyers = new Map((await repos.buyers.find(ctx.farmId)).map((b) => [b.id, b]));
      return rows
        .filter((o) => (!q.from || (o.requestedDeliveryDate ?? "") >= q.from) && (!q.to || (o.requestedDeliveryDate ?? "9999") <= q.to))
        .map((o) => orderView(o, o.buyerId ? buyers.get(o.buyerId) : undefined));
    },

    lotAvailability,
  };
}

export type HatcheryService = ReturnType<typeof createHatcheryService>;
