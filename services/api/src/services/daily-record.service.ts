import { can } from "@poultrypilot/constants";
import type {
  CreateDailyRecordRequest,
  DailyEntrySheet,
  DailyRecordFields,
  DailyRecordListItem,
  DailyRecordListQuery,
  DailyRecordMinimal,
  DailyRecordSummary,
  DailyRecordView,
  DashboardDayView,
  TrendsView,
  UpdateDailyRecordRequest,
} from "@poultrypilot/types";
import { addDays, dateRange, effectiveEvents, evaluateWater, henDayPercent, population } from "../domain/index.js";
import { AppError, forbidden, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { AggregateRow, Repositories, Tx } from "../ports/repositories.js";
import type {
  DailyRecordRecord,
  DailyRecordSummaryValue,
  EggInventoryRecord,
  EggRecordRecord,
  FarmRecord,
  FlockRecord,
  HealthRecordRecord,
} from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import { toLedger, type FlockService, type NewEvent } from "./flock.service.js";
import { duplicate } from "./house.service.js";
import type { SyncService } from "./sync.service.js";
import type { AlertService } from "./alert.service.js";
import type { FeedService } from "./feed.service.js";

/** Flock types that lay eggs. Egg entry on a broiler or chick flock is refused. */
const LAYING = new Set(["layer", "breeder", "custom"]);
const MAX_TREND_DAYS = 366;

export interface DailyRecordDeps {
  repos: Repositories;
  clock: Clock;
  audit: AuditService;
  sync: SyncService;
  flocks: FlockService;
  feed: FeedService;
  alerts: AlertService;
  /** The farm's water rule (deviation, baseline days and any quality limits it set). */
  waterRules?: (ctx: FarmContext, tx: Tx) => Promise<import("../domain/index.js").WaterRules>;
  /** Marks eggs laid during an egg withdrawal period as withheld (FlockHealth). */
  afterEggsWritten?: (ctx: FarmContext, flockId: string, tx: Tx) => Promise<void>;
}

type Fields = DailyRecordFields;

const encodeCursor = (date: string, id: string) => Buffer.from(JSON.stringify({ d: date, i: id })).toString("base64url");
function decodeCursor(c: string): { date: string; id: string } {
  try {
    const v = JSON.parse(Buffer.from(c, "base64url").toString("utf8")) as { d: string; i: string };
    if (typeof v.d === "string" && typeof v.i === "string") return { date: v.d, id: v.i };
  } catch {
    /* fall through */
  }
  throw new AppError("VALIDATION_FAILED", "Invalid cursor");
}

/** Totals this record contributes to its source collections, stored on the record for fast lists. */
export function summarize(f: Fields): DailyRecordSummaryValue {
  return {
    mortality: f.mortality.reduce((t, m) => t + m.count, 0),
    culls: f.culls,
    feedKg: Math.round(f.feed.filter((x) => (x.kind ?? "consumption") === "consumption").reduce((t, x) => t + x.quantityKg, 0) * 1000) / 1000,
    ...(f.waterLitres !== undefined ? { waterLitres: f.waterLitres } : {}),
    ...(f.eggs ? { eggsCollected: f.eggs.collected, eggsBroken: f.eggs.broken } : {}),
    ...(f.averageWeight ? { averageWeightG: f.averageWeight.averageWeightG } : {}),
    observations: f.healthObservations.length,
    photos: f.photos.length,
  };
}

const summaryView = (s: DailyRecordSummaryValue | undefined): DailyRecordSummary => ({
  mortality: s?.mortality ?? 0,
  culls: s?.culls ?? 0,
  feedKg: s?.feedKg ?? 0,
  waterLitres: s?.waterLitres ?? null,
  eggsCollected: s?.eggsCollected ?? null,
  eggsBroken: s?.eggsBroken ?? null,
  averageWeightG: s?.averageWeightG ?? null,
  observations: s?.observations ?? 0,
  photos: s?.photos ?? 0,
});

/** Signed effect of each event type on birds alive, for aggregate rows. */
function aliveFromAggregates(rows: AggregateRow[], reversals: AggregateRow[]): Map<string, number> {
  const sign: Record<string, number> = { placement: 1, transfer_in: 1, split_in: 1, merge_in: 1, mortality: -1, cull: -1, sale: -1, transfer_out: -1, split_out: -1, merge_out: -1 };
  const out = new Map<string, number>();
  const apply = (r: AggregateRow, k: number) => {
    const flockId = r.key["flockId"] as string;
    const type = r.key["type"] as string;
    let v = (sign[type] ?? 0) * (r.sums["birds"] ?? 0);
    if (type === "placement") v -= r.sums["deadOnArrival"] ?? 0;
    if (type === "adjustment") v += r.sums["delta"] ?? 0;
    out.set(flockId, (out.get(flockId) ?? 0) + k * v);
  };
  rows.forEach((r) => apply(r, 1));
  // A reversal carries the same type and figures as the event it cancels, so it is subtracted.
  reversals.forEach((r) => apply(r, -1));
  return out;
}

export function createDailyRecordService(d: DailyRecordDeps) {
  const { repos, clock } = d;
  const L = d.flocks.ledger;
  const mediaUrl = (farmId: string, assetId: string) => `/api/v1/farms/${farmId}/media/${assetId}`;

  // ---- permissions -------------------------------------------------------------

  /**
   * Who may write a day:
   * - record or edit: anyone with production.edit_any (supervisor and above); otherwise only within the farm's
   *   edit window (default today and yesterday), and only records they created;
   * - delete: anyone with production.delete (farm manager and above); otherwise the same own-and-recent rule.
   */
  function assertMayWrite(ctx: FarmContext, farm: FarmRecord, date: string, existing: DailyRecordRecord | null, verb: "record" | "edit" | "delete") {
    const privileged = verb === "delete" ? can(ctx.role, "production.delete") : can(ctx.role, "production.edit_any");
    if (privileged) return;
    const windowStart = addDays(L.todayOf(farm), -farm.settings.workerEditWindowDays);
    if (date < windowStart) throw forbidden(`You can ${verb} days from ${windowStart} onwards. Ask a supervisor for older days.`);
    if (existing && existing.createdBy !== ctx.userId) throw forbidden(`You can only ${verb} daily records you created`);
  }

  // ---- the save ------------------------------------------------------------------

  async function assertPhotos(ctx: FarmContext, photos: Fields["photos"], tx: Tx) {
    for (const p of photos) {
      const asset = await repos.mediaAssets.findById(ctx.farmId, p.assetId, tx);
      if (!asset) throw new AppError("NOT_FOUND", `Photo ${p.assetId} not found on this farm. Upload it first.`);
    }
  }

  /**
   * Writes one day for one flock: the record and every section, in the caller's transaction.
   * Each section is compared with what the record wrote before and rewritten only if it changed,
   * so re-saving an unchanged day costs a few reads and one write.
   */
  async function writeDay(ctx: FarmContext, farm: FarmRecord, flock: FlockRecord, date: string, f: Fields, existing: DailyRecordRecord | null, recordId: string | undefined, tx: Tx): Promise<DailyRecordRecord> {
    L.assertStatus(flock, ["active"], "record a day");
    L.assertDate(date, farm, flock);
    for (const x of f.feed) L.assertCurrency(x.unitCostPerKg, farm, "unitCostPerKg");
    if (f.waterQuality && f.waterLitres === undefined) throw new AppError("VALIDATION_FAILED", "Give waterLitres with waterQuality");
    if (f.eggs && !LAYING.has(flock.type)) throw new AppError("VALIDATION_FAILED", `${flock.flockCode} is a ${flock.type} flock; eggs are recorded for layer, breeder and custom flocks`);
    await assertPhotos(ctx, f.photos, tx);
    const now = clock.now();
    const summary = summarize(f);
    const head = {
      observedBirdCount: f.observedBirdCount,
      temperatureMinC: f.temperatureMinC,
      temperatureMaxC: f.temperatureMaxC,
      humidityPercent: f.humidityPercent,
      lightingHours: f.lightingHours,
      notes: f.notes,
      photos: f.photos.map((p) => ({ assetId: p.assetId, ...(p.caption ? { caption: p.caption } : {}) })),
      summary,
    };

    let record: DailyRecordRecord;
    if (existing) {
      const next = await repos.dailyRecords.update(ctx.farmId, existing.id, { ...head, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: existing.version }, tx);
      if (!next) throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.");
      record = next;
    } else {
      record = {
        id: recordId ?? newId(),
        farmId: ctx.farmId,
        flockId: flock.id,
        date,
        houseId: flock.houseId,
        flockType: flock.type,
        ...(Object.fromEntries(Object.entries(head).filter(([, v]) => v !== undefined)) as Partial<DailyRecordRecord>),
        photos: head.photos,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0,
      };
      await repos.dailyRecords.insert(record, tx).catch(duplicate(`A daily record for ${flock.flockCode} on ${date}`));
    }

    // 1. Flock ledger: deaths, culls and the average weight, linked to this record.
    const events = await L.loadEvents(ctx, flock.id, tx);
    const live = new Set(effectiveEvents(events.map(toLedger)).map((e) => e.id));
    const linked = events.filter((e) => e.dailyRecordId === record.id && live.has(e.id) && ["mortality", "cull", "weighing"].includes(e.type));
    const wanted: NewEvent[] = [
      ...f.mortality.map((m) => ({ type: "mortality" as const, date, birds: m.count, cause: m.cause, dailyRecordId: record.id })),
      ...(f.culls > 0 ? [{ type: "cull" as const, date, birds: f.culls, dailyRecordId: record.id }] : []),
      ...(f.averageWeight
        ? [{ type: "weighing" as const, date, averageWeightG: f.averageWeight.averageWeightG, ...(f.averageWeight.sampleSize ? { sampleSize: f.averageWeight.sampleSize } : {}), dailyRecordId: record.id }]
        : []),
    ];
    const eventKey = (xs: { type: string; cause?: string; birds?: number; averageWeightG?: number; sampleSize?: number }[]) =>
      xs.map((x) => [x.type, x.cause ?? "", x.birds ?? "", x.averageWeightG ?? "", x.sampleSize ?? ""].join(":")).sort().join("|");
    if (eventKey(linked) !== eventKey(wanted)) {
      const reversals: NewEvent[] = linked.map((e) => ({
        type: e.type,
        date: e.date,
        reversalOf: e.id,
        reason: "Daily record edited",
        dailyRecordId: record.id,
        ...(e.birds !== undefined ? { birds: e.birds } : {}),
      }));
      await L.appendEvents(ctx, flock, events, [...reversals, ...wanted], {}, farm, tx, "flock.daily_record_saved");
    }

    // 2. Feed: through FeedWise, so a named feed item moves stock and is costed from its lots.
    const oldFeed = await repos.feedConsumption.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx);
    const lineKey = (x: { kind?: string; quantityKg: number; feedItemId?: string; unitCostMinor?: number; reason?: string }) =>
      [x.kind ?? "consumption", x.quantityKg, x.feedItemId ?? "", x.feedItemId ? "" : x.unitCostMinor ?? "", x.reason ?? ""].join(":");
    const oldKey = oldFeed.map((x) => lineKey({ ...x, ...(x.cost && !x.feedItemId ? { unitCostMinor: Math.round(x.cost.amountMinor) } : {}) })).sort().join("|");
    const newKey = f.feed.map((x) => lineKey({ ...x, ...(x.unitCostPerKg ? { unitCostMinor: Math.round(x.unitCostPerKg.amountMinor * x.quantityKg) } : {}) })).sort().join("|");
    if (oldKey !== newKey) {
      for (const x of oldFeed) await d.feed.removeFeed(ctx, farm, x, tx);
      for (const x of f.feed) await d.feed.recordFeed(ctx, farm, flock, date, x, tx, { dailyRecordId: record.id });
    }

    // 3. Water: one record per flock and day, with quality and abnormal-consumption flags.
    const water = (await repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx))[0];
    const waterKey = `water:${flock.id}:${date}`;
    if (f.waterLitres !== undefined) {
      const rules = (await d.waterRules?.(ctx, tx)) ?? undefined;
      const window = (rules as { windowDays?: number } | undefined)?.windowDays ?? 7;
      const previous = await repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id }, range: { field: "date", from: addDays(date, -window), to: addDays(date, -1) } }, tx);
      const q = f.waterQuality ?? {};
      const check = evaluateWater({ litres: f.waterLitres, previousDays: previous.map((w) => w.litres), ...(q.ph !== undefined ? { ph: q.ph } : {}), ...(q.tdsPpm !== undefined ? { tdsPpm: q.tdsPpm } : {}), ...(rules ? { rules } : {}) });
      const fields = {
        litres: f.waterLitres,
        dailyRecordId: record.id,
        source: q.source,
        ph: q.ph,
        tdsPpm: q.tdsPpm,
        chlorinePpm: q.chlorinePpm,
        qualityRating: q.qualityRating,
        treatment: q.treatment,
        treatmentNotes: q.treatmentNotes,
        flags: check.flags.length ? check.flags : undefined,
        baselineLitres: check.baselineLitres === null ? undefined : Math.round(check.baselineLitres * 10) / 10,
      };
      if (!water) {
        await repos.waterRecords.insert({ id: newId(), farmId: ctx.farmId, flockId: flock.id, date, ...(Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as typeof fields), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
      } else {
        await repos.waterRecords.update(ctx.farmId, water.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, undefined, tx);
      }
      if (check.flags.length) {
        const words: Record<string, string> = {
          consumption_high: `water intake ${Math.round(check.deviationPercent ?? 0)}% above the recent average of ${Math.round(check.baselineLitres ?? 0)} L`,
          consumption_low: `water intake ${Math.round(-(check.deviationPercent ?? 0))}% below the recent average of ${Math.round(check.baselineLitres ?? 0)} L`,
          ph_low: `pH ${q.ph} is below the limit`,
          ph_high: `pH ${q.ph} is above the limit`,
          tds_high: `dissolved solids ${q.tdsPpm} ppm are above the limit`,
        };
        await d.alerts.raise(ctx, {
          ruleType: "water_abnormal",
          severity: check.flags.includes("consumption_low") ? "critical" : "warning",
          title: `Water: ${flock.flockCode} on ${date}`,
          message: `${flock.flockCode}: ${check.flags.map((x) => words[x]).join("; ")}. Check drinkers, water lines and the birds; contact your veterinarian if it continues.`,
          dedupKey: waterKey,
          date,
          flockId: flock.id,
          values: { litres: f.waterLitres, ...(check.baselineLitres !== null ? { baselineLitres: check.baselineLitres } : {}) },
        }, tx);
      } else await d.alerts.resolve(ctx, waterKey, tx);
    } else if (water) {
      await repos.waterRecords.update(ctx.farmId, water.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, undefined, tx);
      await d.alerts.resolve(ctx, waterKey, tx);
    }

    // 4. Eggs and their stock postings.
    await writeEggs(ctx, flock, date, record.id, f.eggs, now, tx);
    if (f.eggs) await d.afterEggsWritten?.(ctx, flock.id, tx);

    // 5. Health observations (records of what was seen; never a diagnosis).
    const oldObs = await repos.healthRecords.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx);
    const obsKey = (xs: { observedSigns?: string; signs?: string; affectedBirds?: number }[]) => xs.map((x) => `${x.observedSigns ?? x.signs}:${x.affectedBirds ?? ""}`).sort().join("|");
    if (obsKey(oldObs) !== obsKey(f.healthObservations)) {
      for (const o of oldObs) await repos.healthRecords.update(ctx.farmId, o.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, undefined, tx);
      const obs: HealthRecordRecord[] = f.healthObservations.map((o) => ({
        id: newId(),
        farmId: ctx.farmId,
        flockId: flock.id,
        houseId: record.houseId,
        type: "observation",
        date,
        title: o.signs.length > 80 ? `${o.signs.slice(0, 77)}…` : o.signs,
        observedSigns: o.signs,
        ...(o.affectedBirds !== undefined ? { affectedBirds: o.affectedBirds } : {}),
        dailyRecordId: record.id,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0,
      }));
      await repos.healthRecords.insertMany(obs, tx);
    }

    await d.audit.record(ctx, { action: existing ? "daily_record.updated" : "daily_record.created", entity: "daily_record", entityId: record.id, after: { flockId: flock.id, date, ...summary } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "daily_record", entityId: record.id, op: "upsert", version: record.version, document: listItem(record, flock.flockCode) }, tx);
    return record;
  }

  async function writeEggs(ctx: FarmContext, flock: FlockRecord, date: string, recordId: string, eggs: Fields["eggs"], now: Date, tx: Tx) {
    const existing = (await repos.eggRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx))[0];
    const postings = existing ? await repos.eggInventory.find(ctx.farmId, { where: { sourceId: existing.id } }, tx) : [];
    const reversed = new Set(postings.filter((p) => p.reversalOf).map((p) => p.reversalOf!));
    const livePostings = postings.filter((p) => !p.reversalOf && !reversed.has(p.id));
    const reverseAll = async () => {
      const rev: EggInventoryRecord[] = livePostings.map((p) => ({
        id: newId(), farmId: ctx.farmId, date: p.date, type: "reversal", quantityDelta: -p.quantityDelta, ...(p.grade ? { grade: p.grade } : {}),
        flockId: flock.id, sourceType: "egg_record", sourceId: p.sourceId!, reversalOf: p.id, createdBy: ctx.userId, createdAt: now, updatedAt: now,
      }));
      await repos.eggInventory.insertMany(rev, tx);
    };

    if (!eggs) {
      if (existing) {
        await reverseAll();
        await repos.eggRecords.update(ctx.farmId, existing.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, undefined, tx);
      }
      return;
    }

    const byGrade = eggs.byGrade ? (Object.fromEntries(Object.entries(eggs.byGrade).filter(([, n]) => (n ?? 0) > 0)) as EggRecordRecord["byGrade"]) : undefined;
    let egg: EggRecordRecord;
    const fields = { collected: eggs.collected, broken: eggs.broken, byGrade, averageEggWeightG: eggs.averageEggWeightG, qualityNotes: eggs.qualityNotes, dailyRecordId: recordId };
    if (existing) {
      egg = (await repos.eggRecords.update(ctx.farmId, existing.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, undefined, tx))!;
    } else {
      egg = {
        id: newId(), farmId: ctx.farmId, flockId: flock.id, date, ...(Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as typeof fields),
        createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0,
      };
      await repos.eggRecords.insert(egg, tx);
    }

    // Stock: graded eggs by grade, the ungraded remainder, and broken eggs removed.
    const graded = Object.entries(byGrade ?? {}) as [NonNullable<EggInventoryRecord["grade"]>, number][];
    const ungraded = eggs.collected - eggs.broken - graded.reduce((t, [, n]) => t + n, 0);
    const wantedPostings: Pick<EggInventoryRecord, "type" | "grade" | "quantityDelta">[] = [
      ...graded.map(([grade, n]) => ({ type: "collected" as const, grade, quantityDelta: n })),
      ...(ungraded > 0 ? [{ type: "collected" as const, quantityDelta: ungraded }] : []),
    ];
    // Broken eggs never enter sellable stock: collected postings above already exclude them.
    const key = (xs: Pick<EggInventoryRecord, "type" | "grade" | "quantityDelta">[]) => xs.map((x) => `${x.type}:${x.grade ?? ""}:${x.quantityDelta}`).sort().join("|");
    if (key(livePostings) !== key(wantedPostings)) {
      await reverseAll();
      await repos.eggInventory.insertMany(
        wantedPostings.map((w) => ({ id: newId(), farmId: ctx.farmId, date, ...w, flockId: flock.id, sourceType: "egg_record" as const, sourceId: egg.id, createdBy: ctx.userId, createdAt: now, updatedAt: now })),
        tx,
      );
    }
  }

  // ---- views ---------------------------------------------------------------------

  const listItem = (r: DailyRecordRecord, flockCode: string): DailyRecordListItem => ({
    id: r.id,
    flockId: r.flockId,
    flockCode,
    houseId: r.houseId,
    flockType: r.flockType,
    date: r.date,
    summary: summaryView(r.summary),
    version: r.version,
    createdBy: r.createdBy,
    updatedAt: r.updatedAt.toISOString(),
  });

  /** What this record itself wrote, in request form (entries linked to it by dailyRecordId). */
  async function ownFields(ctx: FarmContext, record: DailyRecordRecord | null, tx: Tx): Promise<Fields> {
    const none: Fields = { mortality: [], culls: 0, feed: [], healthObservations: [], photos: [] };
    if (!record) return none;
    const [events, feed, water, eggs, obs] = await Promise.all([
      L.loadEvents(ctx, record.flockId, tx),
      repos.feedConsumption.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx),
      repos.waterRecords.find(ctx.farmId, { where: { dailyRecordId: record.id }, limit: 1 }, tx),
      repos.eggRecords.find(ctx.farmId, { where: { dailyRecordId: record.id }, limit: 1 }, tx),
      repos.healthRecords.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx),
    ]);
    const live = new Set(effectiveEvents(events.map(toLedger)).map((e) => e.id));
    const mine = events.filter((e) => e.dailyRecordId === record.id && live.has(e.id));
    const weighing = mine.find((e) => e.type === "weighing");
    const w = water[0];
    const egg = eggs[0];
    const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
    return {
      ...defined({ observedBirdCount: record.observedBirdCount, temperatureMinC: record.temperatureMinC, temperatureMaxC: record.temperatureMaxC, humidityPercent: record.humidityPercent, lightingHours: record.lightingHours, notes: record.notes }),
      mortality: mine.filter((e) => e.type === "mortality").map((e) => ({ cause: e.cause ?? "unknown", count: e.birds ?? 0 })),
      culls: mine.filter((e) => e.type === "cull").reduce((t, e) => t + (e.birds ?? 0), 0),
      feed: feed.map((x) => ({
        quantityKg: x.quantityKg,
        kind: x.kind ?? "consumption",
        ...(x.feedItemId ? { feedItemId: x.feedItemId } : {}),
        // Untracked feed keeps its price (per kg), so the line compares equal and is not rewritten.
        ...(!x.feedItemId && x.cost ? { unitCostPerKg: { amountMinor: x.cost.amountMinor / x.quantityKg, currency: x.cost.currency } } : {}),
      })),
      ...(w ? { waterLitres: w.litres, ...(w.source || w.ph !== undefined || w.tdsPpm !== undefined || w.chlorinePpm !== undefined || w.qualityRating || w.treatment ? { waterQuality: defined({ source: w.source, ph: w.ph, tdsPpm: w.tdsPpm, chlorinePpm: w.chlorinePpm, qualityRating: w.qualityRating, treatment: w.treatment, treatmentNotes: w.treatmentNotes }) } : {}) } : {}),
      ...(egg ? { eggs: defined({ collected: egg.collected, broken: egg.broken, byGrade: egg.byGrade as Record<string, number> | undefined, averageEggWeightG: egg.averageEggWeightG, qualityNotes: egg.qualityNotes }) } : {}),
      ...(weighing?.averageWeightG ? { averageWeight: defined({ averageWeightG: weighing.averageWeightG, sampleSize: weighing.sampleSize }) } : {}),
      healthObservations: obs.map((o) => defined({ signs: o.observedSigns ?? o.title, affectedBirds: o.affectedBirds })),
      photos: record.photos ?? [],
    } as Fields;
  }

  async function fullView(ctx: FarmContext, flock: FlockRecord, date: string, record: DailyRecordRecord | null, tx?: Tx): Promise<DailyRecordView> {
    const [events, feed, waterList, eggList, obs] = await Promise.all([
      L.loadEvents(ctx, flock.id, tx),
      repos.feedConsumption.find(ctx.farmId, { where: { flockId: flock.id, date } }, tx),
      repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx),
      repos.eggRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx),
      record ? repos.healthRecords.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx) : Promise.resolve([]),
    ]);
    const ledger = events.map(toLedger);
    const live = new Set(effectiveEvents(ledger).map((e) => e.id));
    const day = events.filter((e) => e.date === date && live.has(e.id));
    const mortality = day.filter((e) => e.type === "mortality").map((e) => ({ cause: e.cause ?? "unknown", count: e.birds ?? 0, eventId: e.id, fromDailyRecord: !!e.dailyRecordId }));
    const weighing = record ? day.find((e) => e.type === "weighing" && e.dailyRecordId === record.id) : undefined;
    const aliveEnd = population(ledger, date).alive;
    const aliveStart = population(ledger, addDays(date, -1)).alive;
    const egg = eggList[0];
    const water = waterList[0];
    return {
      id: record?.id ?? null,
      flockId: flock.id,
      flockCode: flock.flockCode,
      houseId: record?.houseId ?? flock.houseId,
      flockType: flock.type,
      date,
      ...(record?.observedBirdCount !== undefined ? { observedBirdCount: record.observedBirdCount, countDifference: record.observedBirdCount - aliveEnd } : {}),
      birdsAliveEndOfDay: aliveEnd,
      mortality,
      mortalityTotal: mortality.reduce((t, m) => t + m.count, 0),
      culls: day.filter((e) => e.type === "cull").reduce((t, e) => t + (e.birds ?? 0), 0),
      feed: feed.map((x) => ({ id: x.id, kind: x.kind ?? "consumption", quantityKg: x.quantityKg, ...(x.feedItemId ? { feedItemId: x.feedItemId } : {}), ...(x.cost ? { cost: x.cost } : {}) })),
      feedKg: Math.round(feed.filter((x) => (x.kind ?? "consumption") === "consumption").reduce((t, x) => t + x.quantityKg, 0) * 1000) / 1000,
      ...(water ? { waterLitres: water.litres } : {}),
      ...(water
        ? {
            water: {
              ...(water.source ? { source: water.source } : {}),
              ...(water.ph !== undefined ? { ph: water.ph } : {}),
              ...(water.tdsPpm !== undefined ? { tdsPpm: water.tdsPpm } : {}),
              ...(water.chlorinePpm !== undefined ? { chlorinePpm: water.chlorinePpm } : {}),
              ...(water.qualityRating ? { qualityRating: water.qualityRating } : {}),
              ...(water.treatment ? { treatment: water.treatment } : {}),
              ...(water.treatmentNotes ? { treatmentNotes: water.treatmentNotes } : {}),
              flags: water.flags ?? [],
              baselineLitres: water.baselineLitres ?? null,
            },
          }
        : {}),
      ...(record?.temperatureMinC !== undefined ? { temperatureMinC: record.temperatureMinC } : {}),
      ...(record?.temperatureMaxC !== undefined ? { temperatureMaxC: record.temperatureMaxC } : {}),
      ...(record?.humidityPercent !== undefined ? { humidityPercent: record.humidityPercent } : {}),
      ...(record?.lightingHours !== undefined ? { lightingHours: record.lightingHours } : {}),
      ...(egg
        ? {
            eggs: {
              collected: egg.collected,
              broken: egg.broken,
              ...(egg.byGrade ? { byGrade: egg.byGrade as Record<string, number> } : {}),
              ...(egg.averageEggWeightG !== undefined ? { averageEggWeightG: egg.averageEggWeightG } : {}),
              ...(egg.qualityNotes ? { qualityNotes: egg.qualityNotes } : {}),
              ...(egg.withheldUntil ? { withheldUntil: egg.withheldUntil } : {}),
              henDayPercent: henDayPercent(egg.collected, aliveStart),
            },
          }
        : {}),
      ...(weighing ? { averageWeight: { averageWeightG: weighing.averageWeightG!, ...(weighing.sampleSize ? { sampleSize: weighing.sampleSize } : {}), eventId: weighing.id } } : {}),
      healthObservations: obs.map((o) => ({ id: o.id, signs: o.observedSigns ?? o.title, ...(o.affectedBirds !== undefined ? { affectedBirds: o.affectedBirds } : {}) })),
      ...(record?.notes ? { notes: record.notes } : {}),
      photos: (record?.photos ?? []).map((p) => ({ assetId: p.assetId, ...(p.caption ? { caption: p.caption } : {}), url: mediaUrl(ctx.farmId, p.assetId) })),
      version: record?.version ?? null,
      ...(record ? { createdBy: record.createdBy, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() } : {}),
    };
  }

  const minimal = (r: DailyRecordRecord): DailyRecordMinimal => ({ id: r.id, version: r.version, summary: summaryView(r.summary) });

  async function loadRecord(ctx: FarmContext, id: string, tx?: Tx) {
    const r = await repos.dailyRecords.findById(ctx.farmId, id, tx);
    if (!r) throw notFound("Daily record");
    return r;
  }

  // ---- event aggregation helpers for dashboards ----------------------------------------

  async function eventSums(farmId: string, flockIds: string[], range: { from?: string; to?: string }, by: ("flockId" | "type" | "date")[], types?: string[]) {
    const base = { where: { flockId: flockIds, ...(types ? { type: types } : {}) } as never, range: { field: "date" as const, ...range } };
    const [rows, reversals] = await Promise.all([
      repos.flockEvents.aggregate(farmId, { ...base, exists: { reversalOf: false } }, by, ["birds", "deadOnArrival", "delta"]),
      repos.flockEvents.aggregate(farmId, { ...base, exists: { reversalOf: true } }, by, ["birds", "deadOnArrival", "delta"]),
    ]);
    return { rows, reversals };
  }

  const netBirds = (sumsByKey: { rows: AggregateRow[]; reversals: AggregateRow[] }, keyOf: (r: AggregateRow) => string) => {
    const out = new Map<string, number>();
    for (const r of sumsByKey.rows) out.set(keyOf(r), (out.get(keyOf(r)) ?? 0) + (r.sums["birds"] ?? 0));
    for (const r of sumsByKey.reversals) out.set(keyOf(r), (out.get(keyOf(r)) ?? 0) - (r.sums["birds"] ?? 0));
    return out;
  };

  async function flocksFor(ctx: FarmContext, q: { flockId?: string; houseId?: string; type?: FlockRecord["type"] }, statuses?: FlockRecord["status"][]) {
    if (q.flockId) {
      const f = await repos.flocks.findById(ctx.farmId, q.flockId);
      if (!f) throw notFound("Flock");
      return [f];
    }
    const where: Record<string, unknown> = {};
    if (q.houseId) where["houseId"] = q.houseId;
    if (q.type) where["type"] = q.type;
    if (statuses) where["status"] = statuses;
    return repos.flocks.find(ctx.farmId, { where: where as never });
  }

  const sumMap = (rows: AggregateRow[], field: string, keyField = "flockId") => new Map(rows.map((r) => [r.key[keyField] as string, r.sums[field] ?? 0]));

  // ---- public API -------------------------------------------------------------------------

  return {
    async create(ctx: FarmContext, body: CreateDailyRecordRequest, opts: { minimal?: boolean } = {}) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, body.flockId, tx);
        assertMayWrite(ctx, farm, body.date, null, "record");
        const clash = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId: flock.id, date: body.date }, limit: 1 }, tx))[0];
        if (clash) {
          throw new AppError("DUPLICATE", `${flock.flockCode} already has a record for ${body.date}. Update it instead.`, { existingId: clash.id, version: clash.version });
        }
        const { id, flockId: _f, date, ...fields } = body;
        const record = await writeDay(ctx, farm, flock, date, fields, null, id, tx);
        return opts.minimal ? minimal(record) : fullView(ctx, flock, date, record, tx);
      });
    },

    async update(ctx: FarmContext, id: string, body: UpdateDailyRecordRequest, opts: { minimal?: boolean } = {}) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const existing = await loadRecord(ctx, id, tx);
        assertMayWrite(ctx, farm, existing.date, existing, "edit");
        if (existing.version !== body.version) throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.", { serverVersion: existing.version });
        const flock = await L.loadFlock(ctx, existing.flockId, tx);
        const { version: _v, ...fields } = body;
        const record = await writeDay(ctx, farm, flock, existing.date, fields, existing, undefined, tx);
        return opts.minimal ? minimal(record) : fullView(ctx, flock, existing.date, record, tx);
      });
    },

    /**
     * Changes only the sections given and keeps the rest of the day as recorded: e.g. eggs entered on the egg screen
     * do not erase the feed and deaths entered earlier. The record's own entries are rebuilt from their sources
     * (linked by dailyRecordId), so entries made outside the record are never copied into it.
     */
    async patchByFlockDate(ctx: FarmContext, flockId: string, date: string, body: Partial<Fields> & { version?: number }) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, flockId, tx);
        const existing = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId, date }, limit: 1 }, tx))[0] ?? null;
        assertMayWrite(ctx, farm, date, existing, existing ? "edit" : "record");
        if (existing && (body.version === undefined || body.version !== existing.version)) {
          throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.", { serverVersion: existing.version });
        }
        const { version: _v, ...partial } = body;
        const current = await ownFields(ctx, existing, tx);
        const merged = { ...current, ...Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined)) } as Fields;
        const record = await writeDay(ctx, farm, flock, date, merged, existing, undefined, tx);
        return fullView(ctx, flock, date, record, tx);
      });
    },

    /** Create or replace by flock and date: the offline-friendly entry point (natural key, idempotent). */
    async upsertByFlockDate(ctx: FarmContext, flockId: string, date: string, body: Fields & { version?: number }, opts: { minimal?: boolean } = {}) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, flockId, tx);
        const existing = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId, date }, limit: 1 }, tx))[0] ?? null;
        assertMayWrite(ctx, farm, date, existing, existing ? "edit" : "record");
        if (existing && (body.version === undefined || body.version !== existing.version)) {
          throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.", { serverVersion: existing.version });
        }
        const { version: _v, ...fields } = body;
        const record = await writeDay(ctx, farm, flock, date, fields, existing, undefined, tx);
        return opts.minimal ? minimal(record) : fullView(ctx, flock, date, record, tx);
      });
    },

    /**
     * Deletes a record and undoes everything it wrote: its deaths, culls and weighing are reversed in the flock
     * ledger, its egg stock postings are reversed, and its feed, water, eggs and observations are soft-deleted.
     */
    async remove(ctx: FarmContext, id: string) {
      assertCan(ctx, "production.record");
      await repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const record = await loadRecord(ctx, id, tx);
        assertMayWrite(ctx, farm, record.date, record, "delete");
        const flock = await L.loadFlock(ctx, record.flockId, tx);
        L.assertStatus(flock, ["active"], "delete a daily record");
        const now = clock.now();
        const empty: Fields = { mortality: [], culls: 0, feed: [], healthObservations: [], photos: [] };
        await writeDay(ctx, farm, flock, record.date, empty, record, undefined, tx);
        const current = await loadRecord(ctx, id, tx);
        await repos.dailyRecords.update(ctx.farmId, id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, { expectedVersion: current.version }, tx);
        await d.audit.record(ctx, { action: "daily_record.deleted", entity: "daily_record", entityId: id, before: { flockId: record.flockId, date: record.date, ...record.summary } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "daily_record", entityId: id, op: "delete", version: current.version + 1 }, tx);
      });
    },

    async get(ctx: FarmContext, id: string): Promise<DailyRecordView> {
      assertCan(ctx, "production.read");
      const record = await loadRecord(ctx, id);
      return fullView(ctx, await L.loadFlock(ctx, record.flockId), record.date, record);
    },

    /** The day for one flock, even if no record exists (separate death entries, feed, water still show). */
    async getByFlockDate(ctx: FarmContext, flockId: string, date: string): Promise<DailyRecordView> {
      assertCan(ctx, "production.read");
      const flock = await L.loadFlock(ctx, flockId);
      const record = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId, date }, limit: 1 }))[0] ?? null;
      return fullView(ctx, flock, date, record);
    },

    /** Compact, paginated list (newest first). Filters: date or from/to, house, flock, flock type. */
    async list(ctx: FarmContext, q: DailyRecordListQuery): Promise<{ items: DailyRecordListItem[]; nextCursor: string | null }> {
      assertCan(ctx, "production.read");
      const where: Record<string, unknown> = {};
      if (q.flockId) where["flockId"] = q.flockId;
      if (q.houseId) where["houseId"] = q.houseId;
      if (q.type) where["flockType"] = q.type;
      const range = q.date ? { from: q.date, to: q.date } : { ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) };
      const rows = await repos.dailyRecords.find(ctx.farmId, {
        where: where as never,
        range: { field: "date", ...range },
        sort: [{ field: "date", dir: -1 }, { field: "id", dir: -1 }],
        limit: q.limit + 1,
        ...(q.cursor ? { after: decodeCursor(q.cursor) } : {}),
      });
      const page = rows.slice(0, q.limit);
      const codes = new Map((await repos.flocks.find(ctx.farmId, { where: { id: [...new Set(page.map((r) => r.flockId))] } as never })).map((f) => [f.id, f.flockCode]));
      const last = page[page.length - 1];
      return { items: page.map((r) => listItem(r, codes.get(r.flockId) ?? "")), nextCursor: rows.length > q.limit && last ? encodeCursor(last.date, last.id) : null };
    },

    /** Everything a phone needs to enter a day, in one call: active flocks, expected birds, today's and yesterday's records. */
    async sheet(ctx: FarmContext, q: { date?: string }): Promise<DailyEntrySheet> {
      assertCan(ctx, "production.read");
      const farm = await L.farmOf(ctx);
      const today = L.todayOf(farm);
      const date = q.date ?? today;
      const [flocks, houses, records, previous] = await Promise.all([
        repos.flocks.find(ctx.farmId, { where: { status: "active" } }),
        repos.houses.find(ctx.farmId),
        repos.dailyRecords.find(ctx.farmId, { where: { date } }),
        repos.dailyRecords.find(ctx.farmId, { where: { date: addDays(date, -1) } }),
      ]);
      const houseName = new Map(houses.map((h) => [h.id, h.name]));
      const recBy = new Map(records.map((r) => [r.flockId, r]));
      const prevBy = new Map(previous.map((r) => [r.flockId, r]));
      // Expected birds: today's snapshot, or the ledger for a past date (one aggregate for all flocks).
      let alive = new Map(flocks.map((f) => [f.id, f.population?.alive ?? 0]));
      if (date !== today && flocks.length) {
        const s = await eventSums(ctx.farmId, flocks.map((f) => f.id), { to: date }, ["flockId", "type"]);
        alive = aliveFromAggregates(s.rows, s.reversals);
      }
      return {
        date,
        today,
        editWindowStart: addDays(today, -farm.settings.workerEditWindowDays),
        flocks: flocks
          .sort((a, b) => (houseName.get(a.houseId) ?? "").localeCompare(houseName.get(b.houseId) ?? "") || a.flockCode.localeCompare(b.flockCode))
          .map((f) => {
            const r = recBy.get(f.id);
            const p = prevBy.get(f.id);
            return {
              flockId: f.id,
              flockCode: f.flockCode,
              name: f.name,
              type: f.type,
              houseId: f.houseId,
              houseName: houseName.get(f.houseId) ?? "",
              expectedBirds: alive.get(f.id) ?? 0,
              laying: LAYING.has(f.type),
              record: r ? { id: r.id, version: r.version, summary: summaryView(r.summary) } : null,
              previous: p ? summaryView(p.summary) : null,
            };
          }),
      };
    },

    /** One day across the farm: per-flock and total figures, aggregated on the database server from the source collections. */
    async dashboardDay(ctx: FarmContext, q: { date?: string; houseId?: string; type?: FlockRecord["type"] }): Promise<DashboardDayView> {
      assertCan(ctx, "production.read");
      const farm = await L.farmOf(ctx);
      const date = q.date ?? L.todayOf(farm);
      const flocks = (await flocksFor(ctx, q, ["active", "closed"])).filter((f) => f.status === "active" || (f.closedDate !== undefined && f.closedDate >= date));
      const ids = flocks.map((f) => f.id);
      const zero = { birdsAlive: 0, mortality: 0, culls: 0, feedKg: 0, waterLitres: 0, eggsCollected: 0, eggsBroken: 0, henDayPercent: null, mortalityRatePercent: null };
      if (!ids.length) return { date, totals: zero, flocksTotal: 0, flocksRecorded: 0, flocks: [] };

      const [toDate, toYesterday, today, feed, water, eggs, records, weighings] = await Promise.all([
        eventSums(ctx.farmId, ids, { to: date }, ["flockId", "type"]),
        eventSums(ctx.farmId, ids, { to: addDays(date, -1) }, ["flockId", "type"]),
        eventSums(ctx.farmId, ids, { from: date, to: date }, ["flockId", "type"], ["mortality", "cull"]),
        repos.feedConsumption.aggregate(ctx.farmId, { where: { flockId: ids } as never, range: { field: "date", from: date, to: date } }, ["flockId"], ["quantityKg"]),
        repos.waterRecords.aggregate(ctx.farmId, { where: { flockId: ids } as never, range: { field: "date", from: date, to: date } }, ["flockId"], ["litres"]),
        repos.eggRecords.aggregate(ctx.farmId, { where: { flockId: ids } as never, range: { field: "date", from: date, to: date } }, ["flockId"], ["collected", "broken"]),
        repos.dailyRecords.find(ctx.farmId, { where: { flockId: ids, date } as never }),
        repos.flockEvents.find(ctx.farmId, { where: { flockId: ids, type: "weighing" } as never, range: { field: "date", to: date }, sort: [{ field: "date", dir: -1 }] }),
      ]);
      const aliveEnd = aliveFromAggregates(toDate.rows, toDate.reversals);
      const aliveStart = aliveFromAggregates(toYesterday.rows, toYesterday.reversals);
      const deaths = netBirds({ rows: today.rows.filter((r) => r.key["type"] === "mortality"), reversals: today.reversals.filter((r) => r.key["type"] === "mortality") }, (r) => r.key["flockId"] as string);
      const culls = netBirds({ rows: today.rows.filter((r) => r.key["type"] === "cull"), reversals: today.reversals.filter((r) => r.key["type"] === "cull") }, (r) => r.key["flockId"] as string);
      const feedBy = sumMap(feed, "quantityKg");
      const waterBy = sumMap(water, "litres");
      const eggsBy = sumMap(eggs, "collected");
      const brokenBy = sumMap(eggs, "broken");
      const recBy = new Map(records.map((r) => [r.flockId, r.id]));
      const reversedWeighings = new Set(weighings.filter((w) => w.reversalOf).map((w) => w.reversalOf!));
      const latestWeight = new Map<string, number>();
      for (const w of weighings) if (!w.reversalOf && !reversedWeighings.has(w.id) && !latestWeight.has(w.flockId) && w.averageWeightG) latestWeight.set(w.flockId, w.averageWeightG);

      const rows = flocks.map((f) => {
        const start = aliveStart.get(f.id) ?? 0;
        const m = deaths.get(f.id) ?? 0;
        const e = eggsBy.get(f.id) ?? 0;
        const fd = feedBy.get(f.id) ?? 0;
        const wt = waterBy.get(f.id) ?? 0;
        return {
          flockId: f.id,
          flockCode: f.flockCode,
          type: f.type,
          houseId: f.houseId,
          recorded: recBy.has(f.id),
          recordId: recBy.get(f.id) ?? null,
          birdsAlive: aliveEnd.get(f.id) ?? 0,
          mortality: m,
          culls: culls.get(f.id) ?? 0,
          feedKg: Math.round(fd * 1000) / 1000,
          waterLitres: wt,
          eggsCollected: e,
          eggsBroken: brokenBy.get(f.id) ?? 0,
          henDayPercent: LAYING.has(f.type) ? henDayPercent(e, start) : null,
          mortalityRatePercent: start > 0 ? (m / start) * 100 : null,
          latestAverageWeightG: latestWeight.get(f.id) ?? null,
          waterToFeedRatio: fd > 0 ? wt / fd : null,
        };
      });
      const t = rows.reduce(
        (acc, r) => ({ birdsAlive: acc.birdsAlive + r.birdsAlive, mortality: acc.mortality + r.mortality, culls: acc.culls + r.culls, feedKg: acc.feedKg + r.feedKg, waterLitres: acc.waterLitres + r.waterLitres, eggsCollected: acc.eggsCollected + r.eggsCollected, eggsBroken: acc.eggsBroken + r.eggsBroken }),
        { birdsAlive: 0, mortality: 0, culls: 0, feedKg: 0, waterLitres: 0, eggsCollected: 0, eggsBroken: 0 },
      );
      const layingStart = flocks.filter((f) => LAYING.has(f.type)).reduce((s, f) => s + (aliveStart.get(f.id) ?? 0), 0);
      const allStart = flocks.reduce((s, f) => s + (aliveStart.get(f.id) ?? 0), 0);
      return {
        date,
        totals: { ...t, feedKg: Math.round(t.feedKg * 1000) / 1000, henDayPercent: layingStart > 0 ? henDayPercent(t.eggsCollected, layingStart) : null, mortalityRatePercent: allStart > 0 ? (t.mortality / allStart) * 100 : null },
        flocksTotal: rows.length,
        flocksRecorded: rows.filter((r) => r.recorded).length,
        flocks: rows,
      };
    },

    /** Daily totals over a date range, every day present (zeros where nothing was recorded). */
    async trends(ctx: FarmContext, q: { from: string; to: string; flockId?: string; houseId?: string; type?: FlockRecord["type"] }): Promise<TrendsView> {
      assertCan(ctx, "production.read");
      const days = dateRange(q.from, q.to);
      if (days.length > MAX_TREND_DAYS) throw new AppError("VALIDATION_FAILED", `Ask for at most ${MAX_TREND_DAYS} days at a time`);
      const ids = (await flocksFor(ctx, q)).map((f) => f.id);
      const empty = { mortality: 0, culls: 0, feedKg: 0, waterLitres: 0, eggsCollected: 0, eggsBroken: 0, records: 0 };
      if (!ids.length) return { from: q.from, to: q.to, flockIds: [], days: days.map((date) => ({ date, ...empty })), totals: empty };
      const range = { field: "date" as const, from: q.from, to: q.to };
      const where = { flockId: ids } as never;
      const [ev, feed, water, eggs, records] = await Promise.all([
        eventSums(ctx.farmId, ids, { from: q.from, to: q.to }, ["date", "type"], ["mortality", "cull"]),
        repos.feedConsumption.aggregate(ctx.farmId, { where, range }, ["date"], ["quantityKg"]),
        repos.waterRecords.aggregate(ctx.farmId, { where, range }, ["date"], ["litres"]),
        repos.eggRecords.aggregate(ctx.farmId, { where, range }, ["date"], ["collected", "broken"]),
        repos.dailyRecords.aggregate(ctx.farmId, { where, range }, ["date"], []),
      ]);
      const byType = (type: string) => netBirds({ rows: ev.rows.filter((r) => r.key["type"] === type), reversals: ev.reversals.filter((r) => r.key["type"] === type) }, (r) => r.key["date"] as string);
      const deaths = byType("mortality");
      const culls = byType("cull");
      const feedBy = sumMap(feed, "quantityKg", "date");
      const waterBy = sumMap(water, "litres", "date");
      const eggsBy = sumMap(eggs, "collected", "date");
      const brokenBy = sumMap(eggs, "broken", "date");
      const recBy = new Map(records.map((r) => [r.key["date"] as string, r.count]));
      const series = days.map((date) => ({
        date,
        mortality: deaths.get(date) ?? 0,
        culls: culls.get(date) ?? 0,
        feedKg: Math.round((feedBy.get(date) ?? 0) * 1000) / 1000,
        waterLitres: waterBy.get(date) ?? 0,
        eggsCollected: eggsBy.get(date) ?? 0,
        eggsBroken: brokenBy.get(date) ?? 0,
        records: recBy.get(date) ?? 0,
      }));
      const totals = series.reduce((a, s) => ({ mortality: a.mortality + s.mortality, culls: a.culls + s.culls, feedKg: a.feedKg + s.feedKg, waterLitres: a.waterLitres + s.waterLitres, eggsCollected: a.eggsCollected + s.eggsCollected, eggsBroken: a.eggsBroken + s.eggsBroken, records: a.records + s.records }), empty);
      return { from: q.from, to: q.to, flockIds: ids, days: series, totals: { ...totals, feedKg: Math.round(totals.feedKg * 1000) / 1000 } };
    },
  };
}

export type DailyRecordService = ReturnType<typeof createDailyRecordService>;

