import type { ClientSession, Model } from "mongoose";
import type { FarmQuery, FarmRepo, Tx } from "../../ports/repositories.js";

/** Generic MongoDB farm-scoped repository. Every filter includes farmId (the tenancy plugin enforces it too). */

const sess = (tx?: Tx): { session?: ClientSession } => (tx?.session ? { session: tx.session as ClientSession } : {});

function fromDoc<T>(doc: unknown): T {
  const { _id, ...rest } = doc as Record<string, unknown>;
  const out: Record<string, unknown> = { id: _id };
  for (const [k, v] of Object.entries(rest)) if (v !== null && v !== undefined) out[k] = v instanceof Map ? Object.fromEntries(v) : v;
  return out as T;
}

function toUpdate(patch: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "id" || k === "farmId" || k === "version") continue;
    if (v === undefined) $unset[k] = "";
    else $set[k] = v;
  }
  return { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
}

export function createMongoFarmRepo<T extends { id: string; farmId: string }>(model: Model<any>, opts: { softDelete: boolean; versioned: boolean }): FarmRepo<T> {
  const liveFilter = opts.softDelete ? { deletedAt: null } : {};
  const toDoc = (rec: T) => {
    const { id, ...rest } = rec;
    return { _id: id, ...rest };
  };
  return {
    async findById(farmId, id, tx) {
      const doc = await model.findOne({ _id: id, farmId, ...liveFilter }, null, sess(tx)).lean();
      return doc ? fromDoc<T>(doc) : null;
    },
    async find(farmId, q?: FarmQuery<T>, tx?) {
      const filter: Record<string, unknown> = { farmId, ...liveFilter };
      for (const [k, v] of Object.entries(q?.where ?? {})) filter[k] = Array.isArray(v) ? { $in: v } : v;
      if (q?.range) filter[q.range.field] = { ...(q.range.from !== undefined ? { $gte: q.range.from } : {}), ...(q.range.to !== undefined ? { $lte: q.range.to } : {}) };
      let query = model.find(filter, null, sess(tx));
      if (q?.sort?.length) query = query.sort(Object.fromEntries(q.sort.map((s) => [s.field, s.dir])));
      if (q?.limit) query = query.limit(q.limit);
      return (await query.lean()).map((d) => fromDoc<T>(d));
    },
    async insert(rec, tx) {
      await model.create([toDoc(rec)], sess(tx));
    },
    async insertMany(recs, tx) {
      if (recs.length) await model.create(recs.map(toDoc), { ...sess(tx), ordered: true });
    },
    async update(farmId, id, patch, o, tx) {
      const filter: Record<string, unknown> = { _id: id, farmId, ...liveFilter, ...(o?.expectedVersion !== undefined ? { version: o.expectedVersion } : {}) };
      const update = { ...toUpdate(patch as Record<string, unknown>), ...(opts.versioned ? { $inc: { version: 1 } } : {}) };
      const doc = await model.findOneAndUpdate(filter, update, { new: true, runValidators: true, ...sess(tx) }).lean();
      return doc ? fromDoc<T>(doc) : null;
    },
  };
}
