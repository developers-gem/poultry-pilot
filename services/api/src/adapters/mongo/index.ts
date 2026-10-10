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
} from "./models.js";

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

async function findOne<T>(model: Model<any>, filter: Record<string, unknown>, tx?: Tx): Promise<T | null> {
  return fromDoc<T | null>(await model.findOne(filter, null, s(tx)).lean());
}

export function createMongoRepositories(connection = mongoose.connection): Repositories {
  return {
    tx: {
      async run(fn) {
        const session = await connection.startSession();
        try {
          let result!: Awaited<ReturnType<typeof fn>>;
          await session.withTransaction(async () => {
            result = await fn({ session });
          });
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
      findById: (id, tx) => findOne<FarmRecord>(FarmModel, { _id: id, deletedAt: { $exists: false } }, tx),
      async findByIds(ids, tx) {
        const docs = await FarmModel.find({ _id: { $in: ids }, deletedAt: { $exists: false } }, null, s(tx)).lean();
        return docs.map((d) => fromDoc<FarmRecord>(d));
      },
      async create(rec, tx) {
        await FarmModel.create([toDoc(rec)], s(tx));
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
        await AuditModel.create([toDoc(rec)], s(tx));
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
        const doc = await CounterModel.findOneAndUpdate({ _id: `sync:${farmId}` }, { $inc: { value: 1 } }, { new: true, upsert: true, ...s(tx) }).lean();
        return (doc as { value: number }).value;
      },
      async insertChange(rec, tx) {
        await SyncChangeModel.create([rec], s(tx));
      },
      async listSince(farmId, since, limit, tx) {
        const docs = await SyncChangeModel.find({ farmId, seq: { $gt: since } }, { _id: 0 }, s(tx)).sort({ seq: 1 }).limit(limit).lean();
        return docs as unknown as SyncChangeRecord[];
      },
      findProcessed: (id, tx) => findOne<ProcessedMutationRecord>(ProcessedMutationModel, { _id: id }, tx),
      async saveProcessed(rec, tx) {
        await ProcessedMutationModel.create([toDoc(rec)], s(tx));
      },
    },
    ledgerProbe: {
      async hasEntries() {
        return false; // Phase 3: query ledger_entries
      },
    },
  };
}
