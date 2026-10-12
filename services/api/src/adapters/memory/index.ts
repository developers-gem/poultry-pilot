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
import type { Repositories, Tx, TxRunner } from "../../ports/repositories.js";
import type { ArticleRecord, MedicineRecord, VaccinationProgrammeRecord, VaccinationRecord, ChecklistTemplateRecord, VisitorRecord, BiosecurityLogRecord, CleaningTaskRecord, EquipmentRecord, EquipmentMovementRecord, TaskRecord, AlertRecord, ChickLotRecord, InventoryItemRecord, InventoryLotRecord, InventoryTransactionRecord, BirdWeightRecord, DailyRecordRecord, EggInventoryRecord, EggRecordRecord, FeedConsumptionRecord, FlockEventRecord, FlockRecord, HealthRecordRecord, HouseRecord, MediaAssetRecord, WaterRecordRecord } from "../../ports/records.js";
import { createMemFarmRepo } from "./farm-repo.js";

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
  sessions: Table<SessionRecord>;
  refreshTokens: Table<RefreshTokenRecord>;
  oneTimeTokens: Table<OneTimeTokenRecord>;
  farms: Table<FarmRecord>;
  memberships: Table<MembershipRecord>;
  audit: Table<AuditEventRecord>;
  idempotency: Table<IdempotencyRecord>;
  syncChanges: Table<SyncChangeRecord>;
  syncCounters: Table<number>;
  processed: Table<ProcessedMutationRecord>;
  houses: Table<HouseRecord>;
  flocks: Table<FlockRecord>;
  flockEvents: Table<FlockEventRecord>;
  dailyRecords: Table<DailyRecordRecord>;
  birdWeights: Table<BirdWeightRecord>;
  feedConsumption: Table<FeedConsumptionRecord>;
  waterRecords: Table<WaterRecordRecord>;
  eggRecords: Table<EggRecordRecord>;
  eggInventory: Table<EggInventoryRecord>;
  healthRecords: Table<HealthRecordRecord>;
  mediaAssets: Table<MediaAssetRecord>;
  inventoryItems: Table<InventoryItemRecord>;
  inventoryLots: Table<InventoryLotRecord>;
  inventoryTransactions: Table<InventoryTransactionRecord>;
  chickLots: Table<ChickLotRecord>;
  alerts: Table<AlertRecord>;
  medicines: Table<MedicineRecord>;
  vaccinationProgrammes: Table<VaccinationProgrammeRecord>;
  vaccinations: Table<VaccinationRecord>;
  checklistTemplates: Table<ChecklistTemplateRecord>;
  visitors: Table<VisitorRecord>;
  biosecurityLogs: Table<BiosecurityLogRecord>;
  cleaningTasks: Table<CleaningTaskRecord>;
  equipment: Table<EquipmentRecord>;
  equipmentMovements: Table<EquipmentMovementRecord>;
  tasks: Table<TaskRecord>;
  articles: Table<ArticleRecord>;
}

export function createMemoryRepositories(): { repos: Repositories; store: MemoryStore } {
  const store: MemoryStore = {
    users: new Table(),
    sessions: new Table(),
    refreshTokens: new Table(),
    oneTimeTokens: new Table(),
    farms: new Table(),
    memberships: new Table(),
    audit: new Table(),
    idempotency: new Table(),
    syncChanges: new Table(),
    syncCounters: new Table(),
    processed: new Table(),
    houses: new Table(),
    flocks: new Table(),
    flockEvents: new Table(),
    dailyRecords: new Table(),
    birdWeights: new Table(),
    feedConsumption: new Table(),
    waterRecords: new Table(),
    eggRecords: new Table(),
    eggInventory: new Table(),
    healthRecords: new Table(),
    mediaAssets: new Table(),
    inventoryItems: new Table(),
    inventoryLots: new Table(),
    inventoryTransactions: new Table(),
    chickLots: new Table(),
    alerts: new Table(),
    medicines: new Table(),
    vaccinationProgrammes: new Table(),
    vaccinations: new Table(),
    checklistTemplates: new Table(),
    visitors: new Table(),
    biosecurityLogs: new Table(),
    cleaningTasks: new Table(),
    equipment: new Table(),
    equipmentMovements: new Table(),
    tasks: new Table(),
    articles: new Table(),
  };
  const transactional = [
    store.users,
    store.sessions,
    store.refreshTokens,
    store.oneTimeTokens,
    store.farms,
    store.memberships,
    store.audit,
    store.syncChanges,
    store.syncCounters,
    store.processed,
    store.houses,
    store.flocks,
    store.flockEvents,
    store.dailyRecords,
    store.birdWeights,
    store.feedConsumption,
    store.waterRecords,
    store.eggRecords,
    store.eggInventory,
    store.healthRecords,
    store.mediaAssets,
    store.inventoryItems,
    store.inventoryLots,
    store.inventoryTransactions,
    store.chickLots,
    store.alerts,
    store.medicines,
    store.vaccinationProgrammes,
    store.vaccinations,
    store.checklistTemplates,
    store.visitors,
    store.biosecurityLogs,
    store.cleaningTasks,
    store.equipment,
    store.equipmentMovements,
    store.tasks,
    store.articles,
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
    sessions: {
      async create(rec) {
        store.sessions.put(rec.id, rec);
      },
      async findById(id) {
        return store.sessions.get(id);
      },
      async listForUser(userId) {
        return store.sessions.all().filter((x) => x.userId === userId);
      },
      async touch(id, at) {
        const cur = store.sessions.get(id);
        if (cur) store.sessions.put(id, { ...cur, lastUsedAt: at });
      },
      async revoke(id, at, reason) {
        const cur = store.sessions.get(id);
        if (cur && !cur.revokedAt) store.sessions.put(id, { ...cur, revokedAt: at, revokedReason: reason });
      },
      async revokeAllForUser(userId, at, reason, exceptId) {
        let n = 0;
        for (const x of store.sessions.all()) {
          if (x.userId === userId && !x.revokedAt && x.id !== exceptId) {
            store.sessions.put(x.id, { ...x, revokedAt: at, revokedReason: reason });
            n++;
          }
        }
        return n;
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
    },
    oneTimeTokens: {
      async create(rec) {
        store.oneTimeTokens.put(rec.id, rec);
      },
      async findByHash(h) {
        return store.oneTimeTokens.all().find((r) => r.tokenHash === h) ?? null;
      },
      async markUsed(id, at) {
        const cur = store.oneTimeTokens.get(id);
        if (cur) store.oneTimeTokens.put(id, { ...cur, usedAt: at });
      },
      async invalidateForUser(userId, purpose, at) {
        for (const r of store.oneTimeTokens.all())
          if (r.userId === userId && r.purpose === purpose && !r.usedAt) store.oneTimeTokens.put(r.id, { ...r, usedAt: at });
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
      async listIds() {
        return store.farms.all().filter((f) => !f.deletedAt).map((f) => f.id);
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
    houses: createMemFarmRepo(store.houses, { softDelete: true, versioned: true, unique: [["farmId", "name"]] }),
    flocks: createMemFarmRepo(store.flocks, { softDelete: true, versioned: true, unique: [["farmId", "flockCode"]] }),
    flockEvents: createMemFarmRepo(store.flockEvents, { softDelete: false, versioned: false }),
    dailyRecords: createMemFarmRepo(store.dailyRecords, { softDelete: true, versioned: true, unique: [["farmId", "flockId", "date"]] }),
    birdWeights: createMemFarmRepo(store.birdWeights, { softDelete: true, versioned: true }),
    feedConsumption: createMemFarmRepo(store.feedConsumption, { softDelete: true, versioned: true }),
    waterRecords: createMemFarmRepo(store.waterRecords, { softDelete: true, versioned: true, unique: [["farmId", "flockId", "date"]] }),
    eggRecords: createMemFarmRepo(store.eggRecords, { softDelete: true, versioned: true, unique: [["farmId", "flockId", "date"]] }),
    eggInventory: createMemFarmRepo(store.eggInventory, { softDelete: false, versioned: false }),
    healthRecords: createMemFarmRepo(store.healthRecords, { softDelete: true, versioned: true }),
    mediaAssets: createMemFarmRepo(store.mediaAssets, { softDelete: true, versioned: true }),
    inventoryItems: createMemFarmRepo(store.inventoryItems, { softDelete: true, versioned: true, unique: [["farmId", "name"]] }),
    inventoryLots: createMemFarmRepo(store.inventoryLots, { softDelete: true, versioned: true }),
    inventoryTransactions: createMemFarmRepo(store.inventoryTransactions, { softDelete: false, versioned: false }),
    chickLots: createMemFarmRepo(store.chickLots, { softDelete: true, versioned: true }),
    alerts: createMemFarmRepo(store.alerts, { softDelete: false, versioned: true, unique: [["farmId", "dedupKey"]] }),
    medicines: createMemFarmRepo(store.medicines, { softDelete: true, versioned: true, unique: [["farmId", "name"]] }),
    vaccinationProgrammes: createMemFarmRepo(store.vaccinationProgrammes, { softDelete: true, versioned: true, unique: [["farmId", "name"]] }),
    vaccinations: createMemFarmRepo(store.vaccinations, { softDelete: true, versioned: true }),
    checklistTemplates: createMemFarmRepo(store.checklistTemplates, { softDelete: true, versioned: true, unique: [["farmId", "kind", "name"]] }),
    visitors: createMemFarmRepo(store.visitors, { softDelete: true, versioned: true }),
    biosecurityLogs: createMemFarmRepo(store.biosecurityLogs, { softDelete: true, versioned: true }),
    cleaningTasks: createMemFarmRepo(store.cleaningTasks, { softDelete: true, versioned: true }),
    equipment: createMemFarmRepo(store.equipment, { softDelete: true, versioned: true }),
    equipmentMovements: createMemFarmRepo(store.equipmentMovements, { softDelete: false, versioned: false }),
    tasks: createMemFarmRepo(store.tasks, { softDelete: true, versioned: true }),
    articles: {
      async findPublished(q) {
        return store.articles
          .all()
          .filter((a) => a.status === "published" && a.locale === q.locale && q.regionCodes.includes(a.regionCode) && (!q.kind || a.kind === q.kind) && (!q.tag || a.tags?.includes(q.tag)))
          .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
      },
      async findBySlug(slug, locale) {
        return store.articles.all().find((a) => a.slug === slug && a.locale === locale) ?? null;
      },
      async upsert(rec) {
        const existing = store.articles.all().find((a) => a.slug === rec.slug && a.locale === rec.locale);
        store.articles.put(existing?.id ?? rec.id, { ...rec, id: existing?.id ?? rec.id });
      },
    },
    async locateDailyRecord(id) {
      const r = store.dailyRecords.get(id);
      return r && !r.deletedAt ? r.farmId : null;
    },
  };
  return { repos, store };
}

function duplicate(index: string) {
  const e = new Error(`Duplicate key ${index}`) as Error & { code: number };
  e.code = 11000;
  return e;
}
