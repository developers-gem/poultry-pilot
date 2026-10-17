import { AsyncLocalStorage } from "node:async_hooks";
import mongoose, { type ClientSession, type Model } from "mongoose";
import type {
  AuditEventRecord,
  FarmRecord,
  IdempotencyRecord,
  MembershipRecord,
  OneTimeTokenRecord,
  ProcessedMutationRecord,
  RefreshTokenRecord,
  SessionRecord,
  SyncChangeRecord,
  ArticleRecord,
  GlossaryTermRecord,
  CourseRecord,
  MarketListingRecord,
  OrderRecord,
  NotificationRecord,
  PushDeviceRecord,
  NotificationPreferenceRecord,
  WeatherCacheRecord,
  WeatherObservationRecord,
  UserRecord,
} from "../../ports/records.js";
import type { Repositories, Tx } from "../../ports/repositories.js";
import {
  AuditModel,
  CounterModel,
  FarmModel,
  IdempotencyModel,
  MembershipModel,
  OneTimeTokenModel,
  ProcessedMutationModel,
  RefreshTokenModel,
  SessionModel,
  SyncChangeModel,
  UserModel,
  HouseModel,
  FlockModel,
  FlockEventModel,
  DailyRecordModel,
  BirdWeightModel,
  FeedConsumptionModel,
  WaterRecordModel,
  EggRecordModel,
  EggInventoryModel,
  HealthRecordModel,
  MediaAssetModel,
  InventoryItemModel,
  InventoryLotModel,
  InventoryTransactionModel,
  ChickLotModel,
  AlertModel,
  MedicineModel,
  VaccinationProgrammeModel,
  VaccinationModel,
  ChecklistTemplateModel,
  VisitorModel,
  BiosecurityLogModel,
  CleaningTaskModel,
  EquipmentModel,
  EquipmentMovementModel,
  TaskModel,
  ArticleModel,
  HatcheryBatchModel,
  HatcheryEventModel,
  BuyerModel,
  OrderModel,
  BroodingProfileModel,
  ChickArrivalModel,
  BrooderCheckModel,
  SupplierModel,
  MoneyAccountModel,
  ExpenseModel,
  IncomeModel,
  RecurringExpenseModel,
  TransactionModel,
  MarketListingModel,
  OrderPaymentModel,
  AlertRuleModel,
  NotificationModel,
  PushDeviceModel,
  NotificationPreferenceModel,
  WeatherObservationModel,
  WeatherCacheModel,
  GlossaryTermModel,
  TrainingCourseModel,
  TrainingProgressModel,
} from "./models/index.js";
import { createMongoFarmRepo } from "./farm-repo.js";

/**
 * MongoDB repositories. Requires a replica set (Atlas, or `mongod --replSet`) for transactions.
 * NOTE: written and type-checked but not yet run against a live MongoDB in this workspace;
 * Phase 1 exit includes running the API test suite against a real replica set in CI.
 */

/** Session options for a query. Omitted entirely outside a transaction. */
const s = (tx?: Tx): { session?: ClientSession } => (tx?.session ? { session: tx.session as ClientSession } : {});

/** Maps `_id` ↔ `id` and drops nulls so records match the port types. */
function fromDoc<T>(doc: unknown): T {
  if (!doc) return null as T;
  const { _id, ...rest } = doc as Record<string, unknown>;
  const out: Record<string, unknown> = { id: _id };
  for (const [k, v] of Object.entries(rest)) if (v !== null && v !== undefined) out[k] = v;
  return out as T;
}
function toDoc<T extends { id: string }>(rec: T): Record<string, unknown> {
  const { id, ...rest } = rec;
  return { _id: id, ...rest };
}
/** Splits a patch into $set and $unset so `undefined` clears a field. */
function toUpdate(patch: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "id") continue;
    if (v === undefined) $unset[k] = "";
    else $set[k] = v;
  }
  return { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
}

/**
 * Global content repos. Writes validate the whole document first (updateOne would skip the publishing rules in the
 * schema's validate hook), then apply only if the version still matches.
 */
function createMongoContentRepo<T extends { id: string; version: number }>(model: Model<any>, titleField: string): import("../../ports/repositories.js").ContentRepo<T> {
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    async find(q) {
      const filter: Record<string, unknown> = {};
      if (q.status !== undefined) filter["status"] = Array.isArray(q.status) ? { $in: q.status } : q.status;
      if (q.kind) filter["kind"] = q.kind;
      if (q.category) filter["category"] = q.category;
      if (q.locale) filter["locale"] = q.locale;
      if (q.regionCodes) filter["regionCode"] = { $in: q.regionCodes };
      if (q.text) filter[titleField] = { $regex: esc(q.text), $options: "i" };
      const sortBy = q.sortBy ?? "updatedAt";
      const dir = sortBy === "order" || sortBy === "term" ? 1 : -1;
      const docs = await model.find(filter).sort({ [sortBy]: dir, _id: 1 }).limit(q.limit).lean();
      return docs.map((d) => fromDoc<T>(d));
    },
    findById: (id) => findOne<T>(model, { _id: id }),
    findBySlug: (slug, locale) => findOne<T>(model, { slug, locale }),
    async insert(rec) {
      await model.create([toDoc(rec)]);
    },
    async update(id, patch, expectedVersion) {
      const cur = await model.findOne({ _id: id }).lean();
      if (!cur || (cur as unknown as { version: number }).version !== expectedVersion) return null;
      const merged: Record<string, unknown> = { ...(cur as object), ...patch, version: expectedVersion + 1 };
      for (const [k, v] of Object.entries(patch)) if (v === undefined) delete merged[k];
      delete merged["id"];
      await new model(merged).validate();
      const r = await model.updateOne({ _id: id, version: expectedVersion }, toUpdate({ ...(patch as Record<string, unknown>), version: expectedVersion + 1 }));
      if (r.matchedCount === 0) return null;
      return fromDoc<T>(await model.findOne({ _id: id }).lean());
    },
  };
}

async function findOne<T>(model: Model<any>, filter: Record<string, unknown>, tx?: Tx): Promise<T | null> {
  return fromDoc<T | null>(await model.findOne(filter, null, s(tx)).lean());
}

/** The session of the transaction in progress, so a nested tx.run joins it (same behaviour as the memory adapter). */
const activeSession = new AsyncLocalStorage<ClientSession>();

export function createMongoRepositories(connection = mongoose.connection): Repositories {
  return {
    tx: {
      async run(fn) {
        const outer = activeSession.getStore();
        if (outer) return fn({ session: outer }); // nested: join the outer transaction
        const session = await connection.startSession();
        try {
          let result!: Awaited<ReturnType<typeof fn>>;
          await activeSession.run(session, () =>
            session.withTransaction(async () => {
              result = await fn({ session });
            }),
          );
          return result;
        } finally {
          await session.endSession();
        }
      },
    },
    users: {
      findById: (id, tx) => findOne<UserRecord>(UserModel, { _id: id }, tx),
      findByEmail: (email, tx) => findOne<UserRecord>(UserModel, { email: email.toLowerCase() }, tx),
      findByGoogleSub: (sub, tx) => findOne<UserRecord>(UserModel, { googleSub: sub }, tx),
      async create(rec, tx) {
        await UserModel.create([toDoc(rec)], s(tx));
      },
      async update(id, patch, tx) {
        const doc = await UserModel.findOneAndUpdate({ _id: id }, { ...toUpdate(patch), $inc: { version: 1 } }, { new: true, ...s(tx) }).lean();
        return fromDoc<UserRecord | null>(doc);
      },
    },
    sessions: {
      async create(rec, tx) {
        await SessionModel.create([toDoc(rec)], s(tx));
      },
      findById: (id, tx) => findOne<SessionRecord>(SessionModel, { _id: id }, tx),
      async listForUser(userId, tx) {
        const docs = await SessionModel.find({ userId }, null, s(tx)).sort({ lastUsedAt: -1 }).lean();
        return docs.map((d) => fromDoc<SessionRecord>(d));
      },
      async touch(id, at, tx) {
        await SessionModel.updateOne({ _id: id }, { $set: { lastUsedAt: at } }, s(tx));
      },
      async revoke(id, at, reason, tx) {
        await SessionModel.updateOne({ _id: id, revokedAt: { $exists: false } }, { $set: { revokedAt: at, revokedReason: reason } }, s(tx));
      },
      async revokeAllForUser(userId, at, reason, exceptId, tx) {
        const filter: Record<string, unknown> = { userId, revokedAt: { $exists: false }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) };
        const res = await SessionModel.updateMany(filter, { $set: { revokedAt: at, revokedReason: reason } }, s(tx));
        return res.modifiedCount;
      },
    },
    refreshTokens: {
      async create(rec, tx) {
        await RefreshTokenModel.create([toDoc(rec)], s(tx));
      },
      findByHash: (h, tx) => findOne<RefreshTokenRecord>(RefreshTokenModel, { tokenHash: h }, tx),
      async update(id, patch, tx) {
        await RefreshTokenModel.updateOne({ _id: id }, toUpdate(patch), s(tx));
      },
    },
    oneTimeTokens: {
      async create(rec, tx) {
        await OneTimeTokenModel.create([toDoc(rec)], s(tx));
      },
      findByHash: (h, tx) => findOne<OneTimeTokenRecord>(OneTimeTokenModel, { tokenHash: h }, tx),
      async markUsed(id, at, tx) {
        await OneTimeTokenModel.updateOne({ _id: id }, { $set: { usedAt: at } }, s(tx));
      },
      async invalidateForUser(userId, purpose, at, tx) {
        await OneTimeTokenModel.updateMany({ userId, purpose, usedAt: { $exists: false } }, { $set: { usedAt: at } }, s(tx));
      },
    },
    farms: {
      findById: (id, tx) => findOne<FarmRecord>(FarmModel, { _id: id, deletedAt: null }, tx),
      async findByIds(ids, tx) {
        const docs = await FarmModel.find({ _id: { $in: ids }, deletedAt: null }, null, s(tx)).lean();
        return docs.map((d) => fromDoc<FarmRecord>(d));
      },
      async create(rec, tx) {
        await FarmModel.create([toDoc(rec)], s(tx));
      },
      async listIds() {
        return (await FarmModel.find({ deletedAt: null }, { _id: 1 }).lean()).map((d) => String(d._id));
      },
      async updateVersioned(id, expectedVersion, patch, tx) {
        const doc = await FarmModel.findOneAndUpdate(
          { _id: id, version: expectedVersion },
          { ...toUpdate(patch as Record<string, unknown>), $inc: { version: 1 } },
          { new: true, ...s(tx) },
        ).lean();
        return fromDoc<FarmRecord | null>(doc);
      },
    },
    memberships: {
      findById: (farmId, id, tx) => findOne<MembershipRecord>(MembershipModel, { farmId, _id: id }, tx),
      findActive: (farmId, userId, tx) => findOne<MembershipRecord>(MembershipModel, { farmId, userId, status: "active" }, tx),
      async findByFarm(farmId, tx) {
        return (await MembershipModel.find({ farmId }, null, s(tx)).lean()).map((d) => fromDoc<MembershipRecord>(d));
      },
      findByFarmAndEmail: (farmId, email, tx) =>
        findOne<MembershipRecord>(MembershipModel, { farmId, email: email.toLowerCase(), status: { $ne: "revoked" } }, tx),
      countActiveOwners: (farmId, tx) => MembershipModel.countDocuments({ farmId, role: "owner", status: "active" }, s(tx)),
      async create(rec, tx) {
        await MembershipModel.create([toDoc(rec)], s(tx));
      },
      async update(farmId, id, patch, tx) {
        const doc = await MembershipModel.findOneAndUpdate({ farmId, _id: id }, { ...toUpdate(patch as Record<string, unknown>), $inc: { version: 1 } }, { new: true, ...s(tx) }).lean();
        return fromDoc<MembershipRecord | null>(doc);
      },
      async findActiveForUser(userId, tx) {
        const docs = await MembershipModel.find({ userId, status: "active" }, null, s(tx)).setOptions({ crossFarm: true } as never).lean();
        return docs.map((d) => fromDoc<MembershipRecord>(d));
      },
      async findByInviteHash(h, tx) {
        const doc = await MembershipModel.findOne({ inviteTokenHash: h }, null, s(tx)).setOptions({ crossFarm: true } as never).lean();
        return fromDoc<MembershipRecord | null>(doc);
      },
    },
    audit: {
      async insert(rec, tx) {
        await AuditModel.create([{ ...toDoc(rec), createdAt: rec.at, updatedAt: rec.at }], s(tx));
      },
      async list(farmId, { beforeId, limit }, tx) {
        const filter: Record<string, unknown> = { farmId, ...(beforeId ? { _id: { $lt: beforeId } } : {}) };
        const docs = await AuditModel.find(filter, null, s(tx)).sort({ _id: -1 }).limit(limit).lean();
        return docs.map((d) => fromDoc<AuditEventRecord>(d));
      },
    },
    idempotency: {
      async begin(rec) {
        try {
          await IdempotencyModel.create(toDoc(rec));
          return { created: true };
        } catch (e) {
          if ((e as { code?: number }).code !== 11000) throw e;
          const existing = fromDoc<IdempotencyRecord>(await IdempotencyModel.findById(rec.id).lean());
          return { created: false, existing };
        }
      },
      async complete(id, status, body) {
        await IdempotencyModel.updateOne({ _id: id }, { $set: { status: "done", responseStatus: status, responseBody: body } });
      },
      async release(id) {
        await IdempotencyModel.deleteOne({ _id: id });
      },
    },
    sync: {
      async nextSeq(farmId, tx) {
        const at = new Date();
        const doc = await CounterModel.findOneAndUpdate(
          { _id: `sync:${farmId}` },
          { $inc: { value: 1 }, $set: { updatedAt: at }, $setOnInsert: { createdAt: at } },
          { new: true, upsert: true, ...s(tx) },
        ).lean();
        return (doc as unknown as { value: number }).value;
      },
      async insertChange(rec, tx) {
        await SyncChangeModel.create([{ _id: `${rec.farmId}:${rec.seq}`, ...rec, createdAt: rec.at, updatedAt: rec.at }], s(tx));
      },
      async listSince(farmId, since, limit, tx) {
        const docs = await SyncChangeModel.find({ farmId, seq: { $gt: since } }, { _id: 0, createdAt: 0, updatedAt: 0 }, s(tx)).sort({ seq: 1 }).limit(limit).lean();
        return docs as unknown as SyncChangeRecord[];
      },
      // _id is `${farmId}:${mutationId}`; farmId is repeated in the filter for the tenancy plugin.
      findProcessed: (id, tx) => findOne<ProcessedMutationRecord>(ProcessedMutationModel, { _id: id, farmId: id.split(":")[0] }, tx),
      async saveProcessed(rec, tx) {
        const { at, ...rest } = rec;
        await ProcessedMutationModel.create([{ ...toDoc(rest as typeof rec), createdAt: at, updatedAt: at }], s(tx));
      },
    },
    ledgerProbe: {
      async hasEntries() {
        return false; // Phase 3: query ledger_entries
      },
    },
    houses: createMongoFarmRepo(HouseModel, { softDelete: true, versioned: true }),
    flocks: createMongoFarmRepo(FlockModel, { softDelete: true, versioned: true }),
    flockEvents: createMongoFarmRepo(FlockEventModel, { softDelete: false, versioned: false }),
    dailyRecords: createMongoFarmRepo(DailyRecordModel, { softDelete: true, versioned: true }),
    birdWeights: createMongoFarmRepo(BirdWeightModel, { softDelete: true, versioned: true }),
    feedConsumption: createMongoFarmRepo(FeedConsumptionModel, { softDelete: true, versioned: true }),
    waterRecords: createMongoFarmRepo(WaterRecordModel, { softDelete: true, versioned: true }),
    eggRecords: createMongoFarmRepo(EggRecordModel, { softDelete: true, versioned: true }),
    eggInventory: createMongoFarmRepo(EggInventoryModel, { softDelete: false, versioned: false }),
    healthRecords: createMongoFarmRepo(HealthRecordModel, { softDelete: true, versioned: true }),
    mediaAssets: createMongoFarmRepo(MediaAssetModel, { softDelete: true, versioned: true }),
    inventoryItems: createMongoFarmRepo(InventoryItemModel, { softDelete: true, versioned: true }),
    inventoryLots: createMongoFarmRepo(InventoryLotModel, { softDelete: true, versioned: true }),
    inventoryTransactions: createMongoFarmRepo(InventoryTransactionModel, { softDelete: false, versioned: false }),
    chickLots: createMongoFarmRepo(ChickLotModel, { softDelete: true, versioned: true }),
    alerts: createMongoFarmRepo(AlertModel, { softDelete: false, versioned: true }),
    medicines: createMongoFarmRepo(MedicineModel, { softDelete: true, versioned: true }),
    vaccinationProgrammes: createMongoFarmRepo(VaccinationProgrammeModel, { softDelete: true, versioned: true }),
    vaccinations: createMongoFarmRepo(VaccinationModel, { softDelete: true, versioned: true }),
    checklistTemplates: createMongoFarmRepo(ChecklistTemplateModel, { softDelete: true, versioned: true }),
    visitors: createMongoFarmRepo(VisitorModel, { softDelete: true, versioned: true }),
    biosecurityLogs: createMongoFarmRepo(BiosecurityLogModel, { softDelete: true, versioned: true }),
    cleaningTasks: createMongoFarmRepo(CleaningTaskModel, { softDelete: true, versioned: true }),
    equipment: createMongoFarmRepo(EquipmentModel, { softDelete: true, versioned: true }),
    equipmentMovements: createMongoFarmRepo(EquipmentMovementModel, { softDelete: false, versioned: false }),
    tasks: createMongoFarmRepo(TaskModel, { softDelete: true, versioned: true }),
    hatcheryBatches: createMongoFarmRepo(HatcheryBatchModel, { softDelete: true, versioned: true }),
    hatcheryEvents: createMongoFarmRepo(HatcheryEventModel, { softDelete: false, versioned: false }),
    buyers: createMongoFarmRepo(BuyerModel, { softDelete: true, versioned: true }),
    orders: createMongoFarmRepo(OrderModel, { softDelete: true, versioned: true }),
    broodingProfiles: createMongoFarmRepo(BroodingProfileModel, { softDelete: true, versioned: true }),
    chickArrivals: createMongoFarmRepo(ChickArrivalModel, { softDelete: true, versioned: true }),
    brooderChecks: createMongoFarmRepo(BrooderCheckModel, { softDelete: true, versioned: true }),
    suppliers: createMongoFarmRepo(SupplierModel, { softDelete: true, versioned: true }),
    moneyAccounts: createMongoFarmRepo(MoneyAccountModel, { softDelete: true, versioned: true }),
    expenses: createMongoFarmRepo(ExpenseModel, { softDelete: true, versioned: true }),
    incomes: createMongoFarmRepo(IncomeModel, { softDelete: true, versioned: true }),
    recurringExpenses: createMongoFarmRepo(RecurringExpenseModel, { softDelete: true, versioned: true }),
    transactions: createMongoFarmRepo(TransactionModel, { softDelete: false, versioned: false }),
    listings: createMongoFarmRepo(MarketListingModel, { softDelete: true, versioned: true }),
    orderPayments: createMongoFarmRepo(OrderPaymentModel, { softDelete: false, versioned: false }),
    alertRules: createMongoFarmRepo(AlertRuleModel, { softDelete: false, versioned: true }),
    notifications: {
      async insertMany(recs, tx) {
        if (recs.length) await NotificationModel.create(recs.map(toDoc), { ...s(tx), ordered: true });
      },
      async forUser(userId, q) {
        const docs = await NotificationModel.find({ userId, channel: "in_app", ...(q.unreadOnly ? { readAt: null } : {}) }).sort({ createdAt: -1 }).limit(q.limit).lean();
        return docs.map((d) => fromDoc<NotificationRecord>(d));
      },
      unreadCount: (userId) => NotificationModel.countDocuments({ userId, channel: "in_app", readAt: null }),
      async markRead(userId, ids, at) {
        const r = await NotificationModel.updateMany({ userId, channel: "in_app", readAt: null, ...(ids === "all" ? {} : { _id: { $in: ids } }) }, { $set: { readAt: at, status: "read", updatedAt: at } });
        return r.modifiedCount;
      },
      async due(now, limit) {
        const docs = await NotificationModel.find({ status: "queued", $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] }).limit(limit).lean();
        return docs.map((d) => fromDoc<NotificationRecord>(d));
      },
      async update(id, patch) {
        await NotificationModel.updateOne({ _id: id }, toUpdate(patch as Record<string, unknown>));
      },
      async claim(id, expected, leaseUntil) {
        const r = await NotificationModel.updateOne({ _id: id, status: "queued", nextAttemptAt: expected }, { $set: { nextAttemptAt: leaseUntil } });
        return r.modifiedCount === 1;
      },
      async existingDedupeKeys(keys, tx) {
        if (!keys.length) return new Set<string>();
        const docs = await NotificationModel.find({ dedupeKey: { $in: keys } }, { dedupeKey: 1 }, s(tx)).lean();
        return new Set(docs.map((d) => (d as { dedupeKey?: string }).dedupeKey).filter((k): k is string => !!k));
      },
      async lastForAlert(alertId, userId, channel) {
        const d = await NotificationModel.findOne({ alertId, userId, channel }).sort({ createdAt: -1 }).lean();
        return d ? fromDoc<NotificationRecord>(d) : null;
      },
    },
    pushDevices: {
      async upsertByToken(rec) {
        const { id, createdAt, ...rest } = rec;
        const d = await PushDeviceModel.findOneAndUpdate({ token: rec.token }, { $set: rest, $unset: { disabledAt: "" }, $setOnInsert: { _id: id, createdAt } }, { upsert: true, new: true }).lean();
        return fromDoc<PushDeviceRecord>(d);
      },
      async activeForUser(userId) {
        return (await PushDeviceModel.find({ userId, disabledAt: null }).lean()).map((d) => fromDoc<PushDeviceRecord>(d));
      },
      async disableTokens(tokens, at) {
        if (tokens.length) await PushDeviceModel.updateMany({ token: { $in: tokens } }, { $set: { disabledAt: at, updatedAt: at } });
      },
      async remove(userId, id) {
        return (await PushDeviceModel.deleteOne({ _id: id, userId })).deletedCount === 1;
      },
    },
    notificationPreferences: {
      get: async (userId) => {
        const d = await NotificationPreferenceModel.findOne({ userId }).lean();
        return d ? fromDoc<NotificationPreferenceRecord>(d) : null;
      },
      async put(rec) {
        const { id, createdAt, ...rest } = rec;
        await NotificationPreferenceModel.updateOne({ userId: rec.userId }, { $set: rest, $setOnInsert: { _id: id, createdAt } }, { upsert: true, runValidators: true });
      },
    },
    weather: {
      async getCache(provider, locationKey, kind) {
        const d = await WeatherCacheModel.findOne({ provider, locationKey, kind }).lean();
        return d ? fromDoc<WeatherCacheRecord>(d) : null;
      },
      async putCache(rec) {
        const { id, createdAt, ...rest } = rec;
        await WeatherCacheModel.updateOne({ provider: rec.provider, locationKey: rec.locationKey, kind: rec.kind }, { $set: rest, $setOnInsert: { _id: id, createdAt } }, { upsert: true });
      },
      async upsertObservations(recs) {
        if (!recs.length) return;
        await WeatherObservationModel.bulkWrite(
          recs.map((r) => {
            const { id, createdAt, ...rest } = r;
            return { updateOne: { filter: { locationKey: r.locationKey, date: r.date }, update: { $set: rest, $setOnInsert: { _id: id, createdAt } }, upsert: true } };
          }),
        );
      },
      async observations(locationKey, from, to) {
        return (await WeatherObservationModel.find({ locationKey, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean()).map((d) => fromDoc<WeatherObservationRecord>(d));
      },
    },
    // Cross-farm by design (marketplace browse and buyer views); callers check what each user may see.
    market: {
      async activeListings(q) {
        const filter: Record<string, unknown> = { status: "active", deletedAt: null };
        if (q.category) filter["category"] = q.category;
        if (q.regionCode) filter["regionCode"] = { $in: [q.regionCode, new RegExp(`^${q.regionCode.replace(/[^A-Z0-9-]/g, "")}-`)] };
        if (q.text) filter["title"] = { $regex: q.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        const docs = await MarketListingModel.find(filter).setOptions({ crossFarm: true } as never).sort({ createdAt: -1 }).limit(q.limit).lean();
        return docs.map((d) => fromDoc<MarketListingRecord>(d));
      },
      async listingById(id) {
        const d = await MarketListingModel.findOne({ _id: id, deletedAt: null }).setOptions({ crossFarm: true } as never).lean();
        return d ? fromDoc<MarketListingRecord>(d) : null;
      },
      async orderById(id) {
        const d = await OrderModel.findOne({ _id: id, deletedAt: null }).setOptions({ crossFarm: true } as never).lean();
        return d ? fromDoc<OrderRecord>(d) : null;
      },
      async ordersForBuyer(userId) {
        const docs = await OrderModel.find({ buyerUserId: userId, deletedAt: null }).setOptions({ crossFarm: true } as never).sort({ createdAt: -1 }).limit(500).lean();
        return docs.map((d) => fromDoc<OrderRecord>(d));
      },
    },
    counters: {
      async next(name, farmId, tx) {
        const at = new Date();
        const doc = await CounterModel.findOneAndUpdate({ _id: `${name}:${farmId}` }, { $inc: { value: 1 }, $set: { updatedAt: at }, $setOnInsert: { createdAt: at } }, { new: true, upsert: true, ...s(tx) }).lean();
        return (doc as unknown as { value: number }).value;
      },
    },
    articles: { ...createMongoContentRepo<ArticleRecord>(ArticleModel, "title"), findBySourceUrl: (url) => findOne<ArticleRecord>(ArticleModel, { sourceUrl: url }) },
    glossary: createMongoContentRepo<GlossaryTermRecord>(GlossaryTermModel, "term"),
    courses: createMongoContentRepo<CourseRecord>(TrainingCourseModel, "title"),
    trainingProgress: {
      async complete(userId, courseId, lessonId, at) {
        await TrainingProgressModel.updateOne({ userId, lessonId }, { $setOnInsert: { _id: `${userId}:${courseId}:${lessonId}`, userId, courseId, lessonId, completedAt: at, createdAt: at, updatedAt: at } }, { upsert: true });
      },
      async forUser(userId, courseId) {
        const docs = await TrainingProgressModel.find({ userId, ...(courseId ? { courseId } : {}) }).lean();
        return docs.map((d) => ({ courseId: d.courseId as string, lessonId: d.lessonId as string, completedAt: d.completedAt as Date }));
      },
    },
    // Cross-farm by design: returns only the farmId, which the caller then checks membership for.
    async locateDailyRecord(id) {
      const doc = await DailyRecordModel.findOne({ _id: id, deletedAt: null }, { farmId: 1 }).setOptions({ crossFarm: true } as never).lean();
      return (doc as { farmId?: string } | null)?.farmId ?? null;
    },
  };
}
