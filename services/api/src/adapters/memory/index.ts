import type {
  AuditEventRecord,
  FarmRecord,
  IdempotencyRecord,
  MembershipRecord,
  PasswordResetRecord,
  ProcessedMutationRecord,
  RefreshTokenRecord,
  SyncChangeRecord,
  UserRecord,
} from "../../ports/records.js";
import type { Repositories, Tx, TxRunner } from "../../ports/repositories.js";

/**
 * In-memory repositories for tests and local experiments.
 * Records are cloned on the way in and out so callers cannot mutate stored state.
 * The transaction runner snapshots every table and restores it if the callback throws,
 * which lets tests prove multi-document commands are atomic.
 */

const clone = <T>(v: T): T => structuredClone(v);

class Table<T> {
  rows = new Map<string, T>();
  get(id: string): T | null {
    const r = this.rows.get(id);
    return r ? clone(r) : null;
  }
  put(id: string, row: T): void {
    this.rows.set(id, clone(row));
  }
  all(): T[] {
    return [...this.rows.values()].map(clone);
  }
  snapshot(): Map<string, T> {
    return clone(this.rows);
  }
  restore(s: Map<string, T>): void {
    this.rows = s;
  }
}

export interface MemoryStore {
  users: Table<UserRecord>;
  refreshTokens: Table<RefreshTokenRecord>;
  passwordResets: Table<PasswordResetRecord>;
  farms: Table<FarmRecord>;
  memberships: Table<MembershipRecord>;
  audit: Table<AuditEventRecord>;
  idempotency: Table<IdempotencyRecord>;
  syncChanges: Table<SyncChangeRecord>;
  syncCounters: Table<number>;
  processed: Table<ProcessedMutationRecord>;
}

export function createMemoryRepositories(): { repos: Repositories; store: MemoryStore } {
  const store: MemoryStore = {
    users: new Table(),
    refreshTokens: new Table(),
    passwordResets: new Table(),
    farms: new Table(),
    memberships: new Table(),
    audit: new Table(),
    idempotency: new Table(),
    syncChanges: new Table(),
    syncCounters: new Table(),
    processed: new Table(),
  };
  const transactional = [
    store.users,
    store.refreshTokens,
    store.passwordResets,
    store.farms,
    store.memberships,
    store.audit,
    store.syncChanges,
    store.syncCounters,
    store.processed,
  ] as Table<unknown>[];

  let depth = 0;
  const tx: TxRunner = {
    async run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
      if (depth > 0) return fn({}); // nested: join the outer transaction
      const snaps = transactional.map((t) => t.snapshot());
      depth++;
      try {
        return await fn({});
      } catch (e) {
        transactional.forEach((t, i) => t.restore(snaps[i]!));
        throw e;
      } finally {
        depth--;
      }
    },
  };

  const repos: Repositories = {
    tx,
    users: {
      async findById(id) {
        return store.users.get(id);
      },
      async findByEmail(email) {
        return store.users.all().find((u) => u.email === email.toLowerCase()) ?? null;
      },
      async findByGoogleSub(sub) {
        return store.users.all().find((u) => u.googleSub === sub) ?? null;
      },
      async create(rec) {
        if (store.users.all().some((u) => u.email === rec.email)) throw duplicate("users.email");
        store.users.put(rec.id, rec);
      },
      async update(id, patch) {
        const cur = store.users.get(id);
        if (!cur) return null;
        const next = { ...cur, ...patch, version: cur.version + 1 };
        store.users.put(id, next);
        return clone(next);
      },
    },
    refreshTokens: {
      async create(rec) {
        store.refreshTokens.put(rec.id, rec);
      },
      async findByHash(h) {
        return store.refreshTokens.all().find((r) => r.tokenHash === h) ?? null;
      },
      async update(id, patch) {
        const cur = store.refreshTokens.get(id);
        if (cur) store.refreshTokens.put(id, { ...cur, ...patch });
      },
      async revokeFamily(familyId, at) {
        for (const r of store.refreshTokens.all())
          if (r.familyId === familyId && !r.revokedAt) store.refreshTokens.put(r.id, { ...r, revokedAt: at });
      },
      async revokeAllForUser(userId, at) {
        for (const r of store.refreshTokens.all())
          if (r.userId === userId && !r.revokedAt) store.refreshTokens.put(r.id, { ...r, revokedAt: at });
      },
    },
    passwordResets: {
      async create(rec) {
        store.passwordResets.put(rec.id, rec);
      },
      async findByHash(h) {
        return store.passwordResets.all().find((r) => r.tokenHash === h) ?? null;
      },
      async markUsed(id, at) {
        const cur = store.passwordResets.get(id);
        if (cur) store.passwordResets.put(id, { ...cur, usedAt: at });
      },
    },
    farms: {
      async findById(id) {
        const f = store.farms.get(id);
        return f && !f.deletedAt ? f : null;
      },
      async findByIds(ids) {
        return ids.map((id) => store.farms.get(id)).filter((f): f is FarmRecord => !!f && !f.deletedAt);
      },
      async create(rec) {
        store.farms.put(rec.id, rec);
      },
      async updateVersioned(id, expectedVersion, patch) {
        const cur = store.farms.get(id);
        if (!cur || cur.version !== expectedVersion) return null;
        const next = { ...cur, ...patch, version: cur.version + 1 };
        store.farms.put(id, next);
        return clone(next);
      },
    },
    memberships: {
      async findById(farmId, id) {
        const m = store.memberships.get(id);
        return m && m.farmId === farmId ? m : null;
      },
      async findActive(farmId, userId) {
        return store.memberships.all().find((m) => m.farmId === farmId && m.userId === userId && m.status === "active") ?? null;
      },
      async findByFarm(farmId) {
        return store.memberships.all().filter((m) => m.farmId === farmId);
      },
      async findByFarmAndEmail(farmId, email) {
        return (
          store.memberships.all().find((m) => m.farmId === farmId && m.email === email.toLowerCase() && m.status !== "revoked") ??
          null
        );
      },
      async countActiveOwners(farmId) {
        return store.memberships.all().filter((m) => m.farmId === farmId && m.role === "owner" && m.status === "active").length;
      },
      async create(rec) {
        store.memberships.put(rec.id, rec);
      },
      async update(farmId, id, patch) {
        const cur = store.memberships.get(id);
        if (!cur || cur.farmId !== farmId) return null;
        const next = { ...cur, ...patch, version: cur.version + 1 };
        store.memberships.put(id, next);
        return clone(next);
      },
      async findActiveForUser(userId) {
        return store.memberships.all().filter((m) => m.userId === userId && m.status === "active");
      },
      async findByInviteHash(h) {
        return store.memberships.all().find((m) => m.inviteTokenHash === h) ?? null;
      },
    },
    audit: {
      async insert(rec) {
        store.audit.put(rec.id, rec);
      },
      async list(farmId, { beforeId, limit }) {
        return store.audit
          .all()
          .filter((a) => a.farmId === farmId && (!beforeId || a.id < beforeId))
          .sort((a, b) => (a.id < b.id ? 1 : -1))
          .slice(0, limit);
      },
    },
    idempotency: {
      async begin(rec) {
        const existing = store.idempotency.get(rec.id);
        if (existing) return { created: false, existing };
        store.idempotency.put(rec.id, rec);
        return { created: true };
      },
      async complete(id, status, body) {
        const cur = store.idempotency.get(id);
        if (cur) store.idempotency.put(id, { ...cur, status: "done", responseStatus: status, responseBody: body });
      },
      async release(id) {
        store.idempotency.rows.delete(id);
      },
    },
    sync: {
      async nextSeq(farmId) {
        const n = (store.syncCounters.get(farmId) ?? 0) + 1;
        store.syncCounters.put(farmId, n);
        return n;
      },
      async insertChange(rec) {
        store.syncChanges.put(`${rec.farmId}:${rec.seq}`, rec);
      },
      async listSince(farmId, since, limit) {
        return store.syncChanges
          .all()
          .filter((c) => c.farmId === farmId && c.seq > since)
          .sort((a, b) => a.seq - b.seq)
          .slice(0, limit);
      },
      async findProcessed(id) {
        return store.processed.get(id);
      },
      async saveProcessed(rec) {
        store.processed.put(rec.id, rec);
      },
    },
    ledgerProbe: {
      async hasEntries() {
        return false;
      },
    },
  };
  return { repos, store };
}

function duplicate(index: string) {
  const e = new Error(`Duplicate key ${index}`) as Error & { code: number };
  e.code = 11000;
  return e;
}
