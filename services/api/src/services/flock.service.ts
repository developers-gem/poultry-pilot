import type {
  AdjustmentRequest,
  CloseFlockRequest,
  CreateFlockRequest,
  CullRequest,
  FlockEventView,
  FlockMetricsView,
  FlockView,
  MergeRequest,
  MortalityRequest,
  PlaceFlockRequest,
  ReplaceFlockRequest,
  SaleRequest,
  SplitRequest,
  TransferRequest,
  WeighingRequest,
} from "@poultrypilot/types";
import {
  DomainError,
  acquisitionCostPerBird,
  assertCanClose,
  assertEventAllowed,
  assertTransition,
  birdsAvailable,
  computeFlockMetrics,
  daysBetween,
  effectiveEvents,
  localDateOf,
  population,
  stageFor,
  weighSessionStats,
  weightCurve,
  type LedgerEvent,
} from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { FarmRecord, FlockEventRecord, FlockRecord, MoneyValue } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import { duplicate } from "./house.service.js";
import type { SyncService } from "./sync.service.js";

export interface FlockDeps {
  repos: Repositories;
  clock: Clock;
  audit: AuditService;
  sync: SyncService;
}

export type NewEvent = Omit<FlockEventRecord, "id" | "farmId" | "flockId" | "createdBy" | "createdAt" | "updatedAt">;

/** Event types that can be undone with POST …/events/:eventId/reverse. Paired and structural events cannot. */
const REVERSIBLE = new Set(["placement", "mortality", "cull", "adjustment", "sale", "weighing"]);

const sortEvents = (a: FlockEventRecord, b: FlockEventRecord) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1);

export function toLedger(e: FlockEventRecord): LedgerEvent {
  return {
    id: e.id,
    type: e.type,
    date: e.date,
    ...(e.birds !== undefined ? { birds: e.birds } : {}),
    ...(e.deadOnArrival !== undefined ? { deadOnArrival: e.deadOnArrival } : {}),
    ...(e.delta !== undefined ? { delta: e.delta } : {}),
    ...(e.totalLiveWeightKg !== undefined ? { totalLiveWeightKg: e.totalLiveWeightKg } : {}),
    ...(e.averageWeightG !== undefined ? { averageWeightG: e.averageWeightG } : {}),
    ...(e.sampleSize !== undefined ? { sampleSize: e.sampleSize } : {}),
    ...(e.total ? { totalMinor: e.total.amountMinor } : {}),
    ...(e.cost ? { costMinor: e.cost.amountMinor } : {}),
    ...(e.toStatus ? { toStatus: e.toStatus } : {}),
    ...(e.reversalOf ? { reversalOf: e.reversalOf } : {}),
  };
}

export function createFlockService(d: FlockDeps) {
  const { repos, clock } = d;

  // ---- loading & guards ------------------------------------------------------

  async function farmOf(ctx: FarmContext, tx?: Tx): Promise<FarmRecord> {
    const farm = await repos.farms.findById(ctx.farmId, tx);
    if (!farm) throw notFound("Farm");
    return farm;
  }
  const todayOf = (farm: FarmRecord) => localDateOf(clock.now(), farm.settings.timezone);

  async function loadFlock(ctx: FarmContext, flockId: string, tx?: Tx): Promise<FlockRecord> {
    const f = await repos.flocks.findById(ctx.farmId, flockId, tx);
    if (!f) throw notFound("Flock");
    return f;
  }

  async function loadEvents(ctx: FarmContext, flockId: string, tx?: Tx): Promise<FlockEventRecord[]> {
    return (await repos.flockEvents.find(ctx.farmId, { where: { flockId } }, tx)).sort(sortEvents);
  }

  function assertStatus(flock: FlockRecord, allowed: FlockRecord["status"][], action: string) {
    if (!allowed.includes(flock.status)) {
      throw new DomainError("INVALID_STATE_TRANSITION", `Cannot ${action}: flock ${flock.flockCode} is ${flock.status}`, { status: flock.status });
    }
  }

  function assertDate(date: string, farm: FarmRecord, flock?: FlockRecord) {
    if (date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${date} is in the future for this farm (today is ${todayOf(farm)})`);
    if (flock?.placementDate && date < flock.placementDate) {
      throw new AppError("VALIDATION_FAILED", `${date} is before the flock was placed on ${flock.placementDate}`);
    }
  }

  function assertCurrency(m: MoneyValue | undefined, farm: FarmRecord, field: string) {
    if (m && m.currency !== farm.settings.currency) {
      throw new AppError("VALIDATION_FAILED", `${field} must be in the farm currency (${farm.settings.currency})`);
    }
  }

  /** Birds that would be in a house after adding `incoming`, checked against its capacity. */
  async function assertCapacity(ctx: FarmContext, houseId: string, incoming: number, excludeFlockId: string | undefined, tx: Tx) {
    const house = await repos.houses.findById(ctx.farmId, houseId, tx);
    if (!house) throw notFound("House");
    if (house.status !== "active") throw new AppError("VALIDATION_FAILED", `House ${house.name} is inactive`);
    if (house.capacityBirds === undefined) return house;
    const flocks = await repos.flocks.find(ctx.farmId, { where: { houseId, status: "active" } }, tx);
    const occupied = flocks.filter((f) => f.id !== excludeFlockId).reduce((t, f) => t + (f.population?.alive ?? 0), 0);
    if (occupied + incoming > house.capacityBirds) {
      throw new AppError("CAPACITY_EXCEEDED", `${house.name} holds ${house.capacityBirds} birds; it has ${occupied} and this would add ${incoming}`, {
        capacity: house.capacityBirds,
        occupied,
        incoming,
      });
    }
    return house;
  }

  function snapshot(events: FlockEventRecord[], asOf: string): FlockRecord["population"] {
    const p = population(events.map(toLedger));
    return { placed: p.placed, transferredIn: p.transferredIn, mortality: p.mortality, culled: p.culled, sold: p.sold, transferredOut: p.transferredOut, adjustments: p.adjustments, alive: p.alive, asOf };
  }

  /**
   * Validates and appends events to one flock, then updates its snapshot under an optimistic lock on the
   * flock document: if anything else changed the flock meanwhile, the whole transaction fails with 409.
   */
  async function appendEvents(
    ctx: FarmContext,
    flock: FlockRecord,
    existing: FlockEventRecord[],
    drafts: NewEvent[],
    flockPatch: Partial<FlockRecord>,
    farm: FarmRecord,
    tx: Tx,
    action: string,
  ): Promise<{ flock: FlockRecord; events: FlockEventRecord[] }> {
    const now = clock.now();
    const records: FlockEventRecord[] = drafts.map((e) => ({ id: newId(), farmId: ctx.farmId, flockId: flock.id, createdBy: ctx.userId, createdAt: now, updatedAt: now, ...e }));
    let ledger = existing.map(toLedger);
    for (const r of records) {
      assertEventAllowed(ledger, toLedger(r));
      ledger = [...ledger, toLedger(r)];
    }
    const all = [...existing, ...records].sort(sortEvents);
    await repos.flockEvents.insertMany(records, tx);
    const next = await repos.flocks.update(
      ctx.farmId,
      flock.id,
      { ...flockPatch, population: snapshot(all, todayOf(farm)), updatedBy: ctx.userId, updatedAt: now },
      { expectedVersion: flock.version },
      tx,
    );
    if (!next) throw new AppError("VERSION_CONFLICT", "This flock was changed at the same time by someone else. Reload and try again.");
    for (const r of records) {
      await d.audit.record(ctx, { action: `flock.${r.reversalOf ? "event_reversed" : r.type}`, entity: "flock_event", entityId: r.id, after: { flockId: flock.id, type: r.type, date: r.date, birds: r.birds, delta: r.delta } }, tx);
      await d.sync.recordChange(ctx.farmId, { entity: "flock_event", entityId: r.id, op: "upsert", version: 0, document: toEventView(r, new Set()) }, tx);
    }
    await d.audit.record(ctx, { action, entity: "flock", entityId: flock.id, before: { status: flock.status, alive: flock.population?.alive ?? 0, houseId: flock.houseId }, after: { status: next.status, alive: next.population?.alive ?? 0, houseId: next.houseId } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flock.id, op: "upsert", version: next.version, document: toFlockView(next) }, tx);
    return { flock: next, events: records };
  }

  /** Runs a command on one flock in a transaction with the farm, flock and ledger loaded. */
  function onFlock<T>(ctx: FarmContext, flockId: string, fn: (s: { farm: FarmRecord; flock: FlockRecord; events: FlockEventRecord[]; tx: Tx }) => Promise<T>) {
    return repos.tx.run(async (tx) => {
      const farm = await farmOf(ctx, tx);
      const flock = await loadFlock(ctx, flockId, tx);
      const events = await loadEvents(ctx, flockId, tx);
      return fn({ farm, flock, events, tx });
    });
  }

  function estimateWeightKg(flock: FlockRecord, events: FlockEventRecord[], birds: number, date: string): number | undefined {
    const g = weightCurve(flock.startingWeightG, flock.placementDate, events.map(toLedger)).at(date);
    return g === null ? undefined : Math.round(((birds * g) / 1000) * 1000) / 1000;
  }

  const money = (amountMinor: number, currency: string): MoneyValue => ({ amountMinor: Math.round(amountMinor), currency });

  // ---- views -----------------------------------------------------------------

  function toFlockView(f: FlockRecord, metrics?: FlockMetricsView): FlockView {
    return {
      id: f.id,
      farmId: f.farmId,
      houseId: f.houseId,
      name: f.name,
      flockCode: f.flockCode,
      type: f.type,
      ...(f.customTypeName ? { customTypeName: f.customTypeName } : {}),
      species: f.species,
      ...(f.breed ? { breed: f.breed } : {}),
      ...(f.strain ? { strain: f.strain } : {}),
      ...(f.source ? { source: f.source } : {}),
      ...(f.hatchDate ? { hatchDate: f.hatchDate } : {}),
      ...(f.placementDate ? { placementDate: f.placementDate } : {}),
      ...(f.placementCount !== undefined ? { placementCount: f.placementCount } : {}),
      ...(f.startingWeightG !== undefined ? { startingWeightG: f.startingWeightG } : {}),
      ...(f.chickCost ? { chickCost: f.chickCost } : {}),
      ...(f.targetSaleDate ? { targetSaleDate: f.targetSaleDate } : {}),
      ...(f.closedDate ? { closedDate: f.closedDate } : {}),
      status: f.status,
      ...(f.splitFromFlockId ? { splitFromFlockId: f.splitFromFlockId } : {}),
      ...(f.notes ? { notes: f.notes } : {}),
      currentBirdCount: f.population?.alive ?? 0,
      version: f.version,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      ...(metrics ? { metrics } : {}),
    };
  }

  function toEventView(e: FlockEventRecord, reversed: Set<string>): FlockEventView {
    const { farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, buyerId: _b, fromStatus: _fs, toStatus: _ts, birdWeightId: _bw, note, reason, ...rest } = e;
    const why = reason ?? note;
    return { ...rest, ...(why ? { reason: why } : {}), reversed: reversed.has(e.id), createdAt: createdAt.toISOString() } as FlockEventView;
  }

  async function metricsFor(ctx: FarmContext, flock: FlockRecord, events: FlockEventRecord[], farm: FarmRecord, asOf?: string, referencePricePerKgMinor?: number): Promise<FlockMetricsView> {
    const feed = await repos.feedConsumption.find(ctx.farmId, { where: { flockId: flock.id } });
    const date = asOf ?? (flock.status === "closed" && flock.closedDate ? flock.closedDate : todayOf(farm));
    const eggs = await repos.eggRecords.aggregate(ctx.farmId, { where: { flockId: flock.id }, range: { field: "date", to: date } }, ["flockId"], ["collected"]);
    const m = computeFlockMetrics({
      ...(flock.placementDate ? { placementDate: flock.placementDate } : {}),
      ...(flock.hatchDate ? { hatchDate: flock.hatchDate } : {}),
      ...(flock.ageDaysAtPlacement !== undefined ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {}),
      ...(flock.startingWeightG !== undefined ? { startingWeightG: flock.startingWeightG } : {}),
      events: events.map(toLedger),
      feed: feed.map((f) => ({ date: f.date, quantityKg: f.quantityKg, kind: f.kind ?? "consumption", ...(f.cost ? { costMinor: f.cost.amountMinor } : {}) })),
      eggsCollected: eggs[0]?.sums["collected"] ?? 0,
      asOf: date,
      includeMortalityWeight: farm.settings.fcrIncludesMortalityWeight,
      referencePricePerKgMinor: referencePricePerKgMinor ?? null,
    });
    const { weightOutKg: _o, weightInKg: _i, ...rest } = m;
    return { ...rest, stage: stageFor(flock.type, m.ageDays)?.key ?? null, currency: farm.settings.currency, fcrIncludesMortalityWeight: farm.settings.fcrIncludesMortalityWeight };
  }

  // ---- placement -------------------------------------------------------------

  /**
   * Placing from a chick lot draws the lot down (never below zero) and records the lot on the placement.
   * The lot's unit cost becomes the chick cost when none is given.
   */
  async function drawChickLot(ctx: FarmContext, flock: { id: string; species: FlockRecord["species"] }, p: PlaceFlockRequest, farm: FarmRecord, tx: Tx): Promise<PlaceFlockRequest> {
    if (!p.chickLotId) return p;
    const lot = await repos.chickLots.findById(ctx.farmId, p.chickLotId, tx);
    if (!lot) throw notFound("Chick lot");
    if (lot.status !== "available") throw new DomainError("INVALID_STATE_TRANSITION", "That chick lot has no chicks left");
    if (lot.species !== flock.species) throw new AppError("VALIDATION_FAILED", `That lot holds ${lot.species}, not ${flock.species}`);
    if (p.count > lot.remaining) throw new DomainError("INSUFFICIENT_STOCK", `Only ${lot.remaining} chicks left in that lot`, { available: lot.remaining, requested: p.count });
    const remaining = lot.remaining - p.count;
    const next = await repos.chickLots.update(
      ctx.farmId, lot.id,
      { remaining, status: remaining === 0 ? "depleted" : "available", placedFlockIds: [...(lot.placedFlockIds ?? []), flock.id], updatedBy: ctx.userId, updatedAt: clock.now() },
      { expectedVersion: lot.version }, tx,
    );
    if (!next) throw new AppError("VERSION_CONFLICT", "That chick lot changed at the same time elsewhere. Try again.");
    return p.chickCost || !lot.unitCost ? p : { ...p, chickCost: money(lot.unitCost.amountMinor * p.count, farm.settings.currency) };
  }

  function placementDraft(p: PlaceFlockRequest): NewEvent {
    const net = p.count - p.deadOnArrival;
    return {
      type: "placement",
      date: p.date,
      birds: p.count,
      ...(p.deadOnArrival ? { deadOnArrival: p.deadOnArrival } : {}),
      ...(p.startingWeightG ? { totalLiveWeightKg: Math.round(net * p.startingWeightG) / 1000 } : {}),
      ...(p.chickCost ? { cost: p.chickCost } : {}),
      ...(p.chickLotId ? { chickLotId: p.chickLotId } : {}),
    };
  }

  const placementFields = (p: PlaceFlockRequest): Partial<FlockRecord> => ({
    status: "active",
    placementDate: p.date,
    placementCount: p.count,
    deadOnArrival: p.deadOnArrival,
    ageDaysAtPlacement: p.ageDaysAtPlacement,
    ...(p.startingWeightG !== undefined ? { startingWeightG: p.startingWeightG } : {}),
    ...(p.chickCost ? { chickCost: p.chickCost } : {}),
  });

  return {
    toFlockView,

    // ---- CRUD ------------------------------------------------------------------

    async create(ctx: FarmContext, input: CreateFlockRequest): Promise<FlockView> {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        if (input.placement) {
          assertDate(input.placement.date, farm);
          assertCurrency(input.placement.chickCost, farm, "chickCost");
          await assertCapacity(ctx, input.houseId, input.placement.count - input.placement.deadOnArrival, undefined, tx);
        } else if (!(await repos.houses.findById(ctx.farmId, input.houseId, tx))) throw notFound("House");
        const now = clock.now();
        const flock: FlockRecord = {
          id: input.id ?? newId(),
          farmId: ctx.farmId,
          houseId: input.houseId,
          name: input.name,
          flockCode: input.flockCode,
          type: input.type,
          ...(input.customTypeName ? { customTypeName: input.customTypeName } : {}),
          species: input.species,
          ...(input.breed ? { breed: input.breed } : {}),
          ...(input.strain ? { strain: input.strain } : {}),
          ...(input.source ? { source: input.source } : {}),
          ...(input.hatchDate ? { hatchDate: input.hatchDate } : {}),
          ...(input.targetSaleDate ? { targetSaleDate: input.targetSaleDate } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
          status: "planned",
          population: snapshot([], todayOf(farm)),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.flocks.insert(flock, tx).catch(duplicate(`Flock code "${input.flockCode}"`));
        await d.audit.record(ctx, { action: "flock.created", entity: "flock", entityId: flock.id, after: { name: flock.name, flockCode: flock.flockCode, type: flock.type } }, tx);
        if (!input.placement) {
          await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flock.id, op: "upsert", version: 0, document: toFlockView(flock) }, tx);
          return toFlockView(flock);
        }
        const placement = await drawChickLot(ctx, flock, input.placement, farm, tx);
        const out = await appendEvents(ctx, flock, [], [placementDraft(placement)], placementFields(placement), farm, tx, "flock.placed");
        return toFlockView(out.flock);
      });
    },

    async list(ctx: FarmContext, q: { status?: FlockRecord["status"]; houseId?: string; type?: FlockRecord["type"] }): Promise<FlockView[]> {
      assertCan(ctx, "production.read");
      const where: Record<string, unknown> = {};
      if (q.status) where["status"] = q.status;
      if (q.houseId) where["houseId"] = q.houseId;
      if (q.type) where["type"] = q.type;
      const list = await repos.flocks.find(ctx.farmId, { where: where as never, sort: [{ field: "createdAt", dir: -1 }] });
      return list.map((f) => toFlockView(f));
    },

    async get(ctx: FarmContext, flockId: string, q: { asOf?: string; referencePricePerKgMinor?: number } = {}): Promise<FlockView> {
      assertCan(ctx, "production.read");
      const farm = await farmOf(ctx);
      const flock = await loadFlock(ctx, flockId);
      const events = await loadEvents(ctx, flockId);
      return toFlockView(flock, await metricsFor(ctx, flock, events, farm, q.asOf, q.referencePricePerKgMinor));
    },

    async metrics(ctx: FarmContext, flockId: string, q: { asOf?: string; referencePricePerKgMinor?: number }): Promise<FlockMetricsView> {
      assertCan(ctx, "production.read");
      const farm = await farmOf(ctx);
      const flock = await loadFlock(ctx, flockId);
      return metricsFor(ctx, flock, await loadEvents(ctx, flockId), farm, q.asOf, q.referencePricePerKgMinor);
    },

    async replace(ctx: FarmContext, flockId: string, input: ReplaceFlockRequest): Promise<FlockView> {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const flock = await loadFlock(ctx, flockId, tx);
        if (flock.version !== input.version) throw new AppError("VERSION_CONFLICT", "This flock was changed by someone else", { serverVersion: flock.version });
        if (flock.type === "custom" && !input.customTypeName) throw new AppError("VALIDATION_FAILED", "Name the custom poultry type");
        const next = await repos.flocks
          .update(
            ctx.farmId,
            flockId,
            {
              name: input.name,
              flockCode: input.flockCode,
              customTypeName: flock.type === "custom" ? input.customTypeName : undefined,
              breed: input.breed,
              strain: input.strain,
              source: input.source,
              hatchDate: input.hatchDate,
              targetSaleDate: input.targetSaleDate,
              notes: input.notes,
              updatedBy: ctx.userId,
              updatedAt: clock.now(),
            },
            { expectedVersion: input.version },
            tx,
          )
          .catch(duplicate(`Flock code "${input.flockCode}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This flock was changed by someone else");
        await d.audit.record(ctx, { action: "flock.updated", entity: "flock", entityId: flockId, before: flock as unknown as Record<string, unknown>, after: next as unknown as Record<string, unknown> }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flockId, op: "upsert", version: next.version, document: toFlockView(next) }, tx);
        return toFlockView(next);
      });
    },

    /** Only a planned flock (no events yet) can be deleted. A flock with records is closed instead, never deleted. */
    async remove(ctx: FarmContext, flockId: string): Promise<void> {
      assertCan(ctx, "flock.manage");
      await repos.tx.run(async (tx) => {
        const flock = await loadFlock(ctx, flockId, tx);
        const events = await loadEvents(ctx, flockId, tx);
        if (flock.status !== "planned" || events.length) {
          throw new DomainError("INVALID_STATE_TRANSITION", "A flock with records cannot be deleted. Close it instead, or reverse wrong entries.");
        }
        const now = clock.now();
        await repos.flocks.update(ctx.farmId, flockId, { status: "cancelled", deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, { expectedVersion: flock.version }, tx);
        await d.audit.record(ctx, { action: "flock.deleted", entity: "flock", entityId: flockId, before: { flockCode: flock.flockCode } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flockId, op: "delete", version: flock.version + 1 }, tx);
      });
    },

    // ---- lifecycle commands ------------------------------------------------------

    async place(ctx: FarmContext, flockId: string, p: PlaceFlockRequest) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["planned"], "place birds");
        assertTransition(flock.status, "active");
        assertDate(p.date, farm);
        assertCurrency(p.chickCost, farm, "chickCost");
        await assertCapacity(ctx, flock.houseId, p.count - p.deadOnArrival, flock.id, tx);
        const placement = await drawChickLot(ctx, flock, p, farm, tx);
        return toFlockView((await appendEvents(ctx, flock, events, [placementDraft(placement)], placementFields(placement), farm, tx, "flock.placed")).flock);
      });
    },

    async recordMortality(ctx: FarmContext, flockId: string, r: MortalityRequest) {
      assertCan(ctx, "production.record");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "record deaths");
        assertDate(r.date, farm, flock);
        const out = await appendEvents(ctx, flock, events, [{ type: "mortality", date: r.date, birds: r.count, cause: r.cause, ...(r.notes ? { note: r.notes } : {}) }], {}, farm, tx, "flock.mortality_recorded");
        return toEventView(out.events[0]!, new Set());
      });
    },

    async recordCull(ctx: FarmContext, flockId: string, r: CullRequest) {
      assertCan(ctx, "production.record");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "record culls");
        assertDate(r.date, farm, flock);
        const out = await appendEvents(ctx, flock, events, [{ type: "cull", date: r.date, birds: r.count, ...(r.reason ? { reason: r.reason } : {}), ...(r.notes ? { note: r.notes } : {}) }], {}, farm, tx, "flock.cull_recorded");
        return toEventView(out.events[0]!, new Set());
      });
    },

    async transfer(ctx: FarmContext, flockId: string, r: TransferRequest) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "transfer birds");
        assertDate(r.date, farm, flock);
        if (r.mode === "house") {
          if (r.toHouseId === flock.houseId) throw new AppError("VALIDATION_FAILED", "The flock is already in that house");
          await assertCapacity(ctx, r.toHouseId, flock.population?.alive ?? 0, flock.id, tx);
          const out = await appendEvents(
            ctx, flock, events,
            [{ type: "transfer_house", date: r.date, fromHouseId: flock.houseId, toHouseId: r.toHouseId, ...(r.notes ? { note: r.notes } : {}) }],
            { houseId: r.toHouseId }, farm, tx, "flock.moved_house",
          );
          return { flock: toFlockView(out.flock) };
        }
        if (r.toFlockId === flock.id) throw new AppError("VALIDATION_FAILED", "Cannot transfer birds to the same flock");
        const dest = await loadFlock(ctx, r.toFlockId, tx);
        assertStatus(dest, ["active"], "receive birds");
        if (dest.species !== flock.species) throw new AppError("VALIDATION_FAILED", `Cannot move ${flock.species} into a ${dest.species} flock`);
        assertDate(r.date, farm, dest);
        const available = birdsAvailable(events.map(toLedger), r.date);
        if (r.birds > available) throw new DomainError("INSUFFICIENT_BIRDS", `Only ${available} birds can leave ${flock.flockCode} on ${r.date}`, { available, requested: r.birds });
        if (dest.houseId !== flock.houseId) await assertCapacity(ctx, dest.houseId, r.birds, dest.id, tx);
        const groupId = newId();
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, r.birds, r.date);
        const cost = money(acquisitionCostPerBird(events.map(toLedger)) * r.birds, farm.settings.currency);
        const common = { date: r.date, birds: r.birds, groupId, cost, ...(weight !== undefined ? { totalLiveWeightKg: weight } : {}), ...(r.notes ? { note: r.notes } : {}) };
        const src = await appendEvents(ctx, flock, events, [{ ...common, type: "transfer_out", counterpartFlockId: dest.id, toHouseId: dest.houseId }], {}, farm, tx, "flock.transferred_out");
        const dst = await appendEvents(ctx, dest, await loadEvents(ctx, dest.id, tx), [{ ...common, type: "transfer_in", counterpartFlockId: flock.id, fromHouseId: flock.houseId }], {}, farm, tx, "flock.transferred_in");
        return { flock: toFlockView(src.flock), destination: toFlockView(dst.flock) };
      });
    },

    async split(ctx: FarmContext, flockId: string, r: SplitRequest) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "split the flock");
        assertDate(r.date, farm, flock);
        const ledger = events.map(toLedger);
        const available = birdsAvailable(ledger, r.date);
        if (r.birds > available) throw new DomainError("INSUFFICIENT_BIRDS", `Only ${available} birds can leave ${flock.flockCode} on ${r.date}`, { available, requested: r.birds });
        if (r.birds === population(ledger, r.date).alive) throw new AppError("VALIDATION_FAILED", "Splitting every bird is a house transfer; use a transfer with mode house");
        await assertCapacity(ctx, r.newFlock.houseId, r.birds, r.newFlock.houseId === flock.houseId ? flock.id : undefined, tx);
        const now = clock.now();
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, r.birds, r.date);
        const avgG = weight !== undefined ? Math.round((weight * 1000) / r.birds) : undefined;
        const age = flock.hatchDate ? undefined : flock.placementDate ? daysBetween(flock.placementDate, r.date) + (flock.ageDaysAtPlacement ?? 0) : undefined;
        const child: FlockRecord = {
          id: r.newFlock.id ?? newId(),
          farmId: ctx.farmId,
          houseId: r.newFlock.houseId,
          name: r.newFlock.name,
          flockCode: r.newFlock.flockCode,
          type: flock.type,
          ...(flock.customTypeName ? { customTypeName: flock.customTypeName } : {}),
          species: flock.species,
          ...(flock.breed ? { breed: flock.breed } : {}),
          ...(flock.strain ? { strain: flock.strain } : {}),
          ...(flock.source ? { source: flock.source } : {}),
          ...(flock.hatchDate ? { hatchDate: flock.hatchDate } : {}),
          ...(flock.targetSaleDate ? { targetSaleDate: flock.targetSaleDate } : {}),
          placementDate: r.date,
          ...(age !== undefined ? { ageDaysAtPlacement: age } : {}),
          ...(avgG !== undefined ? { startingWeightG: avgG } : {}),
          status: "active",
          splitFromFlockId: flock.id,
          population: snapshot([], todayOf(farm)),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.flocks.insert(child, tx).catch(duplicate(`Flock code "${r.newFlock.flockCode}"`));
        await d.audit.record(ctx, { action: "flock.created", entity: "flock", entityId: child.id, after: { flockCode: child.flockCode, splitFrom: flock.id } }, tx);
        const groupId = newId();
        const cost = money(acquisitionCostPerBird(ledger) * r.birds, farm.settings.currency);
        const common = { date: r.date, birds: r.birds, groupId, cost, ...(weight !== undefined ? { totalLiveWeightKg: weight } : {}), ...(r.notes ? { note: r.notes } : {}) };
        const src = await appendEvents(ctx, flock, events, [{ ...common, type: "split_out", counterpartFlockId: child.id, toHouseId: child.houseId }], {}, farm, tx, "flock.split");
        const dst = await appendEvents(ctx, child, [], [{ ...common, type: "split_in", counterpartFlockId: flock.id, fromHouseId: flock.houseId }], {}, farm, tx, "flock.created_by_split");
        return { flock: toFlockView(src.flock), newFlock: toFlockView(dst.flock) };
      });
    },

    async merge(ctx: FarmContext, flockId: string, r: MergeRequest) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "merge the flock");
        assertDate(r.date, farm, flock);
        if (r.intoFlockId === flock.id) throw new AppError("VALIDATION_FAILED", "A flock cannot merge into itself");
        const target = await loadFlock(ctx, r.intoFlockId, tx);
        assertStatus(target, ["active"], "receive a merge");
        assertDate(r.date, farm, target);
        if (target.type !== flock.type || target.species !== flock.species) {
          throw new AppError("VALIDATION_FAILED", `Only flocks of the same type and species can merge (${flock.type} ${flock.species} into ${target.type} ${target.species})`);
        }
        const ledger = events.map(toLedger);
        const later = effectiveEvents(ledger).find((e) => e.date > r.date);
        if (later) throw new DomainError("INVALID_STATE_TRANSITION", `${flock.flockCode} has entries after ${r.date}; merge on or after ${later.date}`);
        const birds = population(ledger, r.date).alive;
        if (birds <= 0) throw new DomainError("INSUFFICIENT_BIRDS", "There are no birds left to merge; close the flock instead");
        if (target.houseId !== flock.houseId) await assertCapacity(ctx, target.houseId, birds, target.id, tx);
        const groupId = newId();
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, birds, r.date);
        const cost = money(acquisitionCostPerBird(ledger) * birds, farm.settings.currency);
        const common = { date: r.date, birds, groupId, cost, ...(weight !== undefined ? { totalLiveWeightKg: weight } : {}), ...(r.notes ? { note: r.notes } : {}) };
        const src = await appendEvents(
          ctx, flock, events,
          [
            { ...common, type: "merge_out", counterpartFlockId: target.id, toHouseId: target.houseId },
            { type: "status_change", date: r.date, fromStatus: "active", toStatus: "closed", reason: `Merged into ${target.flockCode}`, groupId },
          ],
          { status: "closed", closedDate: r.date, mergedIntoFlockId: target.id }, farm, tx, "flock.merged",
        );
        const dst = await appendEvents(ctx, target, await loadEvents(ctx, target.id, tx), [{ ...common, type: "merge_in", counterpartFlockId: flock.id, fromHouseId: flock.houseId }], {}, farm, tx, "flock.received_merge");
        return { flock: toFlockView(src.flock), target: toFlockView(dst.flock) };
      });
    },

    async sell(ctx: FarmContext, flockId: string, r: SaleRequest) {
      assertCan(ctx, "flock.sell");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "sell birds");
        assertDate(r.date, farm, flock);
        for (const [m, f] of [[r.pricePerKg, "pricePerKg"], [r.pricePerBird, "pricePerBird"], [r.total, "total"]] as const) assertCurrency(m, farm, f);
        const available = birdsAvailable(events.map(toLedger), r.date);
        if (r.birds > available) {
          throw new DomainError("INSUFFICIENT_BIRDS", `Only ${available} birds are available to sell on ${r.date}; you asked to sell ${r.birds}`, { available, requested: r.birds });
        }
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, r.birds, r.date);
        const totalMinor = r.total ? r.total.amountMinor : r.pricePerKg ? r.pricePerKg.amountMinor * r.totalLiveWeightKg! : r.pricePerBird!.amountMinor * r.birds;
        const out = await appendEvents(
          ctx, flock, events,
          [{ type: "sale", date: r.date, birds: r.birds, total: money(totalMinor, farm.settings.currency), ...(weight !== undefined ? { totalLiveWeightKg: weight } : {}), ...(r.notes ? { note: r.notes } : {}) }],
          {}, farm, tx, "flock.sold",
        );
        return toEventView(out.events[0]!, new Set());
      });
    },

    async adjust(ctx: FarmContext, flockId: string, r: AdjustmentRequest) {
      assertCan(ctx, "production.edit_any");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "adjust the count");
        assertDate(r.date, farm, flock);
        const out = await appendEvents(ctx, flock, events, [{ type: "adjustment", date: r.date, delta: r.delta, reason: r.reason }], {}, farm, tx, "flock.adjusted");
        return toEventView(out.events[0]!, new Set());
      });
    },

    async weigh(ctx: FarmContext, flockId: string, r: WeighingRequest) {
      assertCan(ctx, "production.record");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "record a weighing");
        assertDate(r.date, farm, flock);
        const now = clock.now();
        let averageWeightG = r.averageWeightG!;
        let sampleSize = r.sampleSize;
        let birdWeightId: string | undefined;
        if (r.weightsG) {
          const stats = weighSessionStats(r.weightsG)!;
          averageWeightG = Math.round(stats.meanG * 10) / 10;
          sampleSize = stats.count;
          birdWeightId = newId();
          await repos.birdWeights.insert(
            { id: birdWeightId, farmId: ctx.farmId, flockId, date: r.date, weightsG: r.weightsG, stats, ...(r.notes ? { note: r.notes } : {}), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 },
            tx,
          );
        }
        const out = await appendEvents(
          ctx, flock, events,
          [{ type: "weighing", date: r.date, averageWeightG, ...(sampleSize ? { sampleSize } : {}), ...(birdWeightId ? { birdWeightId } : {}), ...(r.notes ? { note: r.notes } : {}) }],
          {}, farm, tx, "flock.weighed",
        );
        return toEventView(out.events[0]!, new Set());
      });
    },

    async close(ctx: FarmContext, flockId: string, r: CloseFlockRequest) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertTransition(flock.status, "closed");
        assertDate(r.date, farm, flock);
        assertCanClose(events.map(toLedger), r.date);
        const out = await appendEvents(
          ctx, flock, events,
          [{ type: "status_change", date: r.date, fromStatus: flock.status, toStatus: "closed", ...(r.notes ? { reason: r.notes } : {}) }],
          { status: "closed", closedDate: r.date }, farm, tx, "flock.closed",
        );
        return toFlockView(out.flock, await metricsFor(ctx, out.flock, [...events, ...out.events], farm));
      });
    },

    /** Undo one wrong entry by posting its reversal. The ledger must stay valid afterwards. */
    async reverse(ctx: FarmContext, flockId: string, eventId: string, reason: string) {
      assertCan(ctx, "production.edit_any");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "reverse an entry");
        const target = events.find((e) => e.id === eventId);
        if (!target) throw notFound("Event");
        if (!REVERSIBLE.has(target.type)) {
          throw new DomainError("INVALID_STATE_TRANSITION", `A ${target.type.replace("_", " ")} cannot be reversed here; record the opposite movement instead`);
        }
        if (target.dailyRecordId) throw new DomainError("INVALID_STATE_TRANSITION", "This entry belongs to a daily record; edit the daily record instead");
        const out = await appendEvents(
          ctx, flock, events,
          [{ type: target.type, date: target.date, reversalOf: target.id, reason, ...(target.birds !== undefined ? { birds: target.birds } : {}) }],
          {}, farm, tx, "flock.event_reversed",
        );
        return toEventView(out.events[0]!, new Set());
      });
    },

    async listEvents(ctx: FarmContext, flockId: string): Promise<FlockEventView[]> {
      assertCan(ctx, "production.read");
      await loadFlock(ctx, flockId);
      const events = await loadEvents(ctx, flockId);
      const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf!));
      return events.map((e) => toEventView(e, reversed));
    },

    /**
     * Ledger primitives for other services that write flock events inside their own transaction
     * (daily records). Same validation, snapshot update and optimistic lock as every flock command.
     */
    ledger: { farmOf, todayOf, loadFlock, loadEvents, appendEvents, assertStatus, assertDate, assertCurrency, money },
  };
}

export type FlockService = ReturnType<typeof createFlockService>;
