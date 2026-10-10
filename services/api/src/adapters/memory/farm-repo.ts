import type { AggregateRow, FarmQuery, FarmRepo, Tx } from "../../ports/repositories.js";

/**
 * In-memory farm-scoped repository with the same semantics as the MongoDB one: farm scoping,
 * soft delete, version bumps and unique keys (among live records), throwing code 11000 on conflict.
 */
export interface MemTable<T> {
  rows: Map<string, T>;
}

const clone = <T>(v: T): T => structuredClone(v);

function matches<T>(rec: T, q: FarmQuery<T> | undefined): boolean {
  for (const [k, v] of Object.entries(q?.where ?? {})) {
    const actual = (rec as Record<string, unknown>)[k];
    if (Array.isArray(v) ? !v.includes(actual) : actual !== v) return false;
  }
  for (const [k, want] of Object.entries(q?.exists ?? {})) {
    if (((rec as Record<string, unknown>)[k] !== undefined) !== want) return false;
  }
  if (q?.after) {
    const r = rec as unknown as { date: string; id: string };
    if (!(r.date < q.after.date || (r.date === q.after.date && r.id < q.after.id))) return false;
  }
  if (q?.range) {
    const val = (rec as Record<string, unknown>)[q.range.field] as string | undefined;
    if (val === undefined) return false;
    if (q.range.from !== undefined && val < q.range.from) return false;
    if (q.range.to !== undefined && val > q.range.to) return false;
  }
  return true;
}

export function createMemFarmRepo<T extends { id: string; farmId: string }>(
  table: MemTable<T>,
  opts: { softDelete: boolean; versioned: boolean; unique?: (keyof T & string)[][] },
): FarmRepo<T> {
  const live = (r: T) => !opts.softDelete || !(r as { deletedAt?: Date }).deletedAt;
  const assertUnique = (rec: T) => {
    if (!live(rec)) return;
    for (const key of opts.unique ?? []) {
      for (const other of table.rows.values()) {
        if (other.id !== rec.id && live(other) && key.every((k) => other[k] !== undefined && other[k] === rec[k])) {
          throw Object.assign(new Error(`Duplicate key ${key.join("+")}`), { code: 11000, keyPattern: Object.fromEntries(key.map((k) => [k, 1])) });
        }
      }
    }
  };
  return {
    async findById(farmId, id, _tx?: Tx) {
      const r = table.rows.get(id);
      return r && r.farmId === farmId && live(r) ? clone(r) : null;
    },
    async find(farmId, q) {
      let list = [...table.rows.values()].filter((r) => r.farmId === farmId && live(r) && matches(r, q));
      for (const s of [...(q?.sort ?? [])].reverse()) {
        list = list.sort((a, b) => {
          const x = a[s.field] as unknown as string | number;
          const y = b[s.field] as unknown as string | number;
          return (x < y ? -1 : x > y ? 1 : 0) * s.dir;
        });
      }
      return (q?.limit ? list.slice(0, q.limit) : list).map(clone);
    },
    async insert(rec) {
      assertUnique(rec);
      table.rows.set(rec.id, clone(rec));
    },
    async insertMany(recs) {
      for (const r of recs) assertUnique(r);
      for (const r of recs) table.rows.set(r.id, clone(r));
    },
    async aggregate(farmId, q, by, sums) {
      const groups = new Map<string, AggregateRow>();
      for (const r of table.rows.values()) {
        if (r.farmId !== farmId || !live(r) || !matches(r, q)) continue;
        const key = Object.fromEntries(by.map((k) => [k, r[k] ?? null]));
        const id = JSON.stringify(key);
        const g = groups.get(id) ?? { key, sums: Object.fromEntries(sums.map((s) => [s, 0])), count: 0 };
        for (const s of sums) g.sums[s] = (g.sums[s] ?? 0) + (Number(r[s]) || 0);
        g.count++;
        groups.set(id, g);
      }
      return [...groups.values()];
    },
    async update(farmId, id, patch, o) {
      const cur = table.rows.get(id);
      if (!cur || cur.farmId !== farmId || !live(cur)) return null;
      if (o?.expectedVersion !== undefined && (cur as { version?: number }).version !== o.expectedVersion) return null;
      const next = { ...cur, ...patch, ...(opts.versioned ? { version: ((cur as { version?: number }).version ?? 0) + 1 } : {}) } as T;
      assertUnique(next);
      table.rows.set(id, clone(next));
      return clone(next);
    },
  };
}
