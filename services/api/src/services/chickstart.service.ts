import { addDays, ageDays, dateRange, effectiveEvents, evaluateBrooderCheck, localDateOf, population, assertBands, type BroodingBand } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories } from "../ports/repositories.js";
import type { BrooderCheckRecord, BroodingProfileRecord, ChickArrivalRecord, FlockRecord } from "../ports/records.js";
import type { AlertService } from "./alert.service.js";
import type { AuditService } from "./audit.service.js";
import type { BiosecurityService } from "./biosecurity.service.js";
import { assertCan, type FarmContext } from "./context.js";
import { toLedger, type FlockService } from "./flock.service.js";
import { duplicate } from "./house.service.js";

type ChecklistInput = { templateId: string; answers: { itemId: string; answer: string | number | boolean }[] };

/**
 * ChickStart: the first days of a flock. Arrival preparation, the arrival itself (which places the chicks), brooder
 * checks against the farm's own brooding profile, and a day-by-day brooding view built from daily records.
 */
export function createChickStartService(d: { repos: Repositories; clock: Clock; audit: AuditService; flocks: FlockService; biosecurity: BiosecurityService; alerts: AlertService }) {
  const { repos, clock } = d;
  const L = d.flocks.ledger;
  const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
  const strip = <T extends { farmId: string; deletedAt?: Date; deletedBy?: string; createdAt: Date; updatedAt: Date }>({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }: T) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  });

  async function profileFor(ctx: FarmContext, flock: FlockRecord): Promise<BroodingProfileRecord | null> {
    const arrival = (await repos.chickArrivals.find(ctx.farmId, { where: { flockId: flock.id }, limit: 1 }))[0];
    if (arrival?.broodingProfileId) {
      const p = await repos.broodingProfiles.findById(ctx.farmId, arrival.broodingProfileId);
      if (p) return p;
    }
    const profiles = await repos.broodingProfiles.find(ctx.farmId, { where: { isDefault: true } });
    return profiles.find((p) => !p.flockTypes?.length || p.flockTypes.includes(flock.type)) ?? null;
  }

  const ageOf = (flock: FlockRecord, date: string) =>
    ageDays({ ...(flock.hatchDate ? { hatchDate: flock.hatchDate } : {}), ...(flock.placementDate ? { placementDate: flock.placementDate } : {}), ...(flock.ageDaysAtPlacement !== undefined ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {}) }, date);

  return {
    // ---- brooding profiles

    async createProfile(ctx: FarmContext, r: { name: string; flockTypes?: FlockRecord["type"][]; bands: BroodingBand[]; source?: string; isDefault: boolean }) {
      assertCan(ctx, "flock.manage");
      assertBands(r.bands);
      return repos.tx.run(async (tx) => {
        if (r.isDefault) {
          for (const p of await repos.broodingProfiles.find(ctx.farmId, { where: { isDefault: true } }, tx)) await repos.broodingProfiles.update(ctx.farmId, p.id, { isDefault: false, updatedAt: clock.now() }, undefined, tx);
        }
        const now = clock.now();
        const rec: BroodingProfileRecord = { id: newId(), farmId: ctx.farmId, ...defined({ name: r.name, flockTypes: r.flockTypes, source: r.source }), bands: [...r.bands].sort((a, b) => a.fromDay - b.fromDay).map((b) => defined(b)), isDefault: r.isDefault, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
        await repos.broodingProfiles.insert(rec, tx).catch(duplicate(`A profile named "${r.name}"`));
        await d.audit.record(ctx, { action: "brooding_profile.created", entity: "brooding_profile", entityId: rec.id, after: { name: rec.name, bands: rec.bands.length, source: rec.source } }, tx);
        return strip(rec);
      });
    },

    async listProfiles(ctx: FarmContext) {
      assertCan(ctx, "production.read");
      return (await repos.broodingProfiles.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },

    // ---- arrivals

    async planArrival(ctx: FarmContext, r: Omit<ChickArrivalRecord, keyof import("../ports/records.js").Editable | "status" | "preparation" | "arrival" | "flockId" | "cancelledReason">) {
      assertCan(ctx, "flock.manage");
      if (!(await repos.houses.findById(ctx.farmId, r.houseId))) throw notFound("House");
      if (r.source === "own_hatchery") {
        if (!r.hatcheryBatchId) throw new AppError("VALIDATION_FAILED", "Name the hatchery batch the chicks come from");
        if (!(await repos.hatcheryBatches.findById(ctx.farmId, r.hatcheryBatchId))) throw notFound("Hatchery batch");
      }
      if (r.source === "chick_lot") {
        if (!r.chickLotId) throw new AppError("VALIDATION_FAILED", "Name the chick lot");
        const lot = await repos.chickLots.findById(ctx.farmId, r.chickLotId);
        if (!lot) throw notFound("Chick lot");
        if (r.expectedCount > lot.remaining) throw new AppError("INSUFFICIENT_STOCK", `Only ${lot.remaining} chicks left in that lot`, { available: lot.remaining });
      }
      if (r.broodingProfileId && !(await repos.broodingProfiles.findById(ctx.farmId, r.broodingProfileId))) throw notFound("Brooding profile");
      const now = clock.now();
      const rec: ChickArrivalRecord = { id: newId(), farmId: ctx.farmId, ...defined(r), status: "planned", createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.chickArrivals.insert(rec, tx);
        await d.audit.record(ctx, { action: "arrival.planned", entity: "chick_arrival", entityId: rec.id, after: { expectedDate: rec.expectedDate, expectedCount: rec.expectedCount } }, tx);
      });
      return strip(rec);
    },

    async listArrivals(ctx: FarmContext, q: { status?: ChickArrivalRecord["status"] }) {
      assertCan(ctx, "production.read");
      return (await repos.chickArrivals.find(ctx.farmId, { ...(q.status ? { where: { status: q.status } } : {}), sort: [{ field: "expectedDate", dir: 1 }] })).map((a) => ({ ...strip(a), prepared: !!a.preparation }));
    },

    /** House and arrival preparation, answered against the farm's own checklist. Failed items create corrective actions. */
    async completePreparation(ctx: FarmContext, id: string, checklist: ChecklistInput) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const a = await repos.chickArrivals.findById(ctx.farmId, id, tx);
        if (!a) throw notFound("Arrival");
        if (a.status !== "planned") throw new AppError("INVALID_STATE_TRANSITION", `This arrival is ${a.status}`);
        const farm = await L.farmOf(ctx, tx);
        const result = await d.biosecurity.runChecklist(ctx, checklist, ["arrival_preparation", "general"], { entity: "chick_arrival", id, date: L.todayOf(farm), houseId: a.houseId, label: "Arrival preparation" }, tx);
        const next = await repos.chickArrivals.update(ctx.farmId, id, { preparation: { checklist: result, completedAt: clock.now(), completedBy: ctx.userId }, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: a.version }, tx);
        return { ...strip(next!), prepared: true };
      });
    },

    /**
     * The chicks arrive: records count, dead on arrival, chick weight and quality, then places them into a new flock
     * in the same transaction (drawing the chick lot when they come from inventory or the farm's hatchery).
     */
    async arrive(ctx: FarmContext, id: string, r: { arrivedAt?: string; received: number; deadOnArrival: number; averageWeightG?: number; sampleSize?: number; qualityNotes?: string; checklist?: ChecklistInput; flock: { name: string; flockCode: string; chickCost?: { amountMinor: number; currency: string } } }) {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const a = await repos.chickArrivals.findById(ctx.farmId, id, tx);
        if (!a) throw notFound("Arrival");
        if (a.status !== "planned") throw new AppError("INVALID_STATE_TRANSITION", `This arrival is ${a.status}`);
        if (r.deadOnArrival > r.received) throw new AppError("VALIDATION_FAILED", "Dead on arrival cannot exceed chicks received");
        const farm = await L.farmOf(ctx, tx);
        const arrivedAt = r.arrivedAt ? new Date(r.arrivedAt) : clock.now();
        const date = localDateOf(arrivedAt, farm.settings.timezone);
        let chickLotId = a.chickLotId;
        let hatchDate: string | undefined;
        if (a.source === "own_hatchery") {
          const b = await repos.hatcheryBatches.findById(ctx.farmId, a.hatcheryBatchId!, tx);
          if (!b?.chickLotId) throw new AppError("INVALID_STATE_TRANSITION", "That batch has not been graded yet, so its chicks are not in stock");
          chickLotId = b.chickLotId;
        }
        if (chickLotId) hatchDate = (await repos.chickLots.findById(ctx.farmId, chickLotId, tx))?.hatchDate;
        const checklist = r.checklist ? await d.biosecurity.runChecklist(ctx, r.checklist, ["arrival_preparation", "general"], { entity: "chick_arrival", id, date, houseId: a.houseId, label: "Chick arrival" }, tx) : undefined;
        const flock = await d.flocks.create(ctx, {
          name: r.flock.name,
          flockCode: r.flock.flockCode,
          type: a.flockType,
          species: "chicken",
          houseId: a.houseId,
          ...(a.breed ? { breed: a.breed } : {}),
          ...(a.supplier ? { source: a.supplier } : {}),
          ...(hatchDate ? { hatchDate } : {}),
          placement: {
            date,
            count: r.received,
            deadOnArrival: r.deadOnArrival,
            ...(r.averageWeightG ? { startingWeightG: r.averageWeightG } : {}),
            ...(r.flock.chickCost ? { chickCost: r.flock.chickCost } : {}),
            ageDaysAtPlacement: 0,
            ...(chickLotId ? { chickLotId } : {}),
          },
        } as never);
        const next = await repos.chickArrivals.update(
          ctx.farmId, id,
          { status: "arrived", flockId: flock.id, arrival: defined({ arrivedAt, received: r.received, deadOnArrival: r.deadOnArrival, averageWeightG: r.averageWeightG, sampleSize: r.sampleSize, qualityNotes: r.qualityNotes, checklist }), updatedBy: ctx.userId, updatedAt: clock.now() },
          { expectedVersion: a.version }, tx,
        );
        await d.audit.record(ctx, { action: "arrival.received", entity: "chick_arrival", entityId: id, after: { received: r.received, deadOnArrival: r.deadOnArrival, flockId: flock.id } }, tx);
        return { arrival: { ...strip(next!), prepared: !!a.preparation }, flock };
      });
    },

    async cancelArrival(ctx: FarmContext, id: string, reason: string) {
      assertCan(ctx, "flock.manage");
      const a = await repos.chickArrivals.findById(ctx.farmId, id);
      if (!a) throw notFound("Arrival");
      if (a.status !== "planned") throw new AppError("INVALID_STATE_TRANSITION", `This arrival is ${a.status}`);
      return strip((await repos.chickArrivals.update(ctx.farmId, id, { status: "cancelled", cancelledReason: reason, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: a.version }))!);
    },

    // ---- brooder checks

    /** A brooder check, judged against the farm's brooding profile for the chicks' age. Out-of-range readings raise an alert. */
    async recordCheck(ctx: FarmContext, r: { flockId: string; checkedAt?: string; temperatureC?: number; humidityPercent?: number; behaviour?: BrooderCheckRecord["behaviour"]; feedAvailable?: boolean; waterAvailable?: boolean; cropFill?: { sampled: number; full: number }; checklist?: ChecklistInput; notes?: string }) {
      assertCan(ctx, "production.record");
      if (r.cropFill && r.cropFill.full > r.cropFill.sampled) throw new AppError("VALIDATION_FAILED", "More full crops than chicks sampled");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, r.flockId, tx);
        L.assertStatus(flock, ["active"], "record a brooder check");
        const checkedAt = r.checkedAt ? new Date(r.checkedAt) : clock.now();
        if (checkedAt.getTime() > clock.now().getTime() + 5 * 60_000) throw new AppError("VALIDATION_FAILED", "The check time is in the future");
        const date = localDateOf(checkedAt, farm.settings.timezone);
        L.assertDate(date, farm, flock);
        const dayOfAge = ageOf(flock, date) ?? 0;
        const profile = await profileFor(ctx, flock);
        const evalResult = evaluateBrooderCheck({ dayOfAge, ...defined({ temperatureC: r.temperatureC, humidityPercent: r.humidityPercent, behaviour: r.behaviour, feedAvailable: r.feedAvailable, waterAvailable: r.waterAvailable }) }, profile?.bands);
        const id = newId();
        const checklist = r.checklist ? await d.biosecurity.runChecklist(ctx, r.checklist, ["brooder_check", "general"], { entity: "brooder_check", id, date, houseId: flock.houseId, label: `Brooder check ${flock.flockCode}` }, tx) : undefined;
        const now = clock.now();
        const rec: BrooderCheckRecord = {
          id, farmId: ctx.farmId, flockId: flock.id, houseId: flock.houseId, checkedAt, date, dayOfAge,
          ...defined({ temperatureC: r.temperatureC, humidityPercent: r.humidityPercent, behaviour: r.behaviour, feedAvailable: r.feedAvailable, waterAvailable: r.waterAvailable, cropFill: r.cropFill, notes: r.notes }),
          ...(checklist ? { checklist } : {}),
          ...(evalResult.flags.length ? { flags: evalResult.flags } : {}),
          createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0,
        };
        await repos.brooderChecks.insert(rec, tx);
        if (evalResult.flags.length) {
          const words: Record<string, string> = {
            temperature_low: `temperature ${r.temperatureC} °C is below ${evalResult.band?.tempMinC} °C`,
            temperature_high: `temperature ${r.temperatureC} °C is above ${evalResult.band?.tempMaxC} °C`,
            humidity_low: `humidity ${r.humidityPercent}% is below ${evalResult.band?.humidityMin}%`,
            humidity_high: `humidity ${r.humidityPercent}% is above ${evalResult.band?.humidityMax}%`,
            behaviour: `chicks are ${r.behaviour?.replace("_", " ")}`,
            no_feed: "feed was not available",
            no_water: "water was not available",
          };
          const urgent = evalResult.flags.some((f) => f === "no_water" || f === "no_feed");
          await d.alerts.raise(ctx, {
            ruleType: "brooding_conditions",
            severity: urgent ? "critical" : "warning",
            title: `Brooding: ${flock.flockCode}, day ${dayOfAge}`,
            message: `${flock.flockCode} (day ${dayOfAge}): ${evalResult.flags.map((f) => words[f]).join("; ")}${profile ? ` (targets from "${profile.name}")` : ""}.`,
            dedupKey: `brooding:${flock.id}:${date}`,
            date,
            flockId: flock.id,
            houseId: flock.houseId,
          }, tx);
        }
        return { ...strip(rec), profile: profile ? { id: profile.id, name: profile.name, band: evalResult.band } : null };
      });
    },

    /**
     * The brooding period day by day (default the first 14 days): deaths, culls, feed, water, conditions from the
     * daily record, weight against the profile target, and brooder checks with their flags.
     */
    async broodingView(ctx: FarmContext, flockId: string, q: { days: number }) {
      assertCan(ctx, "production.read");
      const farm = await L.farmOf(ctx);
      const flock = await L.loadFlock(ctx, flockId);
      if (!flock.placementDate) throw new AppError("INVALID_STATE_TRANSITION", "This flock has not been placed yet");
      const today = L.todayOf(farm);
      const last = [addDays(flock.placementDate, q.days - 1), today, flock.closedDate ?? today].sort()[0]!;
      const days = last >= flock.placementDate ? dateRange(flock.placementDate, last) : [];
      const range = { field: "date" as const, from: flock.placementDate, to: last };
      const [events, records, feed, water, checks, profile, arrival] = await Promise.all([
        L.loadEvents(ctx, flockId),
        repos.dailyRecords.find(ctx.farmId, { where: { flockId }, range }),
        repos.feedConsumption.find(ctx.farmId, { where: { flockId }, range }),
        repos.waterRecords.find(ctx.farmId, { where: { flockId }, range }),
        repos.brooderChecks.find(ctx.farmId, { where: { flockId }, range }),
        profileFor(ctx, flock),
        repos.chickArrivals.find(ctx.farmId, { where: { flockId }, limit: 1 }),
      ]);
      const ledger = events.map(toLedger);
      const live = effectiveEvents(ledger);
      const rows = days.map((date) => {
        const dayOfAge = ageOf(flock, date) ?? 0;
        const rec = records.find((x) => x.date === date);
        const dayChecks = checks.filter((c) => c.date === date);
        const weighing = live.filter((e) => e.type === "weighing" && e.date === date).pop();
        const band = profile?.bands.find((b) => dayOfAge >= b.fromDay && dayOfAge <= b.toDay);
        const sum = (type: string) => live.filter((e) => e.type === type && e.date === date).reduce((t, e) => t + (e.birds ?? 0), 0);
        return {
          date,
          dayOfAge,
          birdsAlive: population(ledger, date).alive,
          mortality: sum("mortality"),
          culls: sum("cull"),
          feedKg: Math.round(feed.filter((f) => f.date === date && (f.kind ?? "consumption") === "consumption").reduce((t, f) => t + f.quantityKg, 0) * 1000) / 1000,
          waterLitres: water.find((w) => w.date === date)?.litres ?? null,
          temperatureMinC: rec?.temperatureMinC ?? null,
          temperatureMaxC: rec?.temperatureMaxC ?? null,
          humidityPercent: rec?.humidityPercent ?? null,
          averageWeightG: weighing?.averageWeightG ?? null,
          targetWeightG: band?.targetWeightG ?? null,
          brooderChecks: dayChecks.length,
          flaggedChecks: dayChecks.filter((c) => c.flags?.length).length,
          checklistFailures: dayChecks.reduce((t, c) => t + (c.checklist?.failedCount ?? 0), 0),
          cropFillPercent: (() => {
            const cf = dayChecks.filter((c) => c.cropFill);
            const s = cf.reduce((t, c) => t + c.cropFill!.sampled, 0);
            return s > 0 ? (cf.reduce((t, c) => t + c.cropFill!.full, 0) / s) * 100 : null;
          })(),
          dailyRecordId: rec?.id ?? null,
        };
      });
      const placed = population(ledger).placed;
      const mortalityInPeriod = rows.reduce((t, r) => t + r.mortality, 0);
      return {
        flockId,
        flockCode: flock.flockCode,
        placementDate: flock.placementDate,
        profile: profile ? { id: profile.id, name: profile.name, source: profile.source ?? null } : null,
        arrival: arrival[0] ? { id: arrival[0].id, received: arrival[0].arrival?.received ?? null, deadOnArrival: arrival[0].arrival?.deadOnArrival ?? null, averageWeightG: arrival[0].arrival?.averageWeightG ?? null, prepared: !!arrival[0].preparation } : null,
        days: rows,
        totals: {
          mortality: mortalityInPeriod,
          mortalityPercent: placed > 0 ? (mortalityInPeriod / placed) * 100 : null,
          daysRecorded: rows.filter((r) => r.dailyRecordId).length,
          daysWithChecks: rows.filter((r) => r.brooderChecks > 0).length,
          flaggedChecks: rows.reduce((t, r) => t + r.flaggedChecks, 0),
        },
      };
    },
  };
}

export type ChickStartService = ReturnType<typeof createChickStartService>;
