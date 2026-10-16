import { AppError } from "../../lib/errors.js";
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
import type { GlossaryTermRecord, CourseRecord, AlertRuleRecord, NotificationRecord, PushDeviceRecord, NotificationPreferenceRecord, WeatherObservationRecord, WeatherCacheRecord, SupplierRecord, MoneyAccountRecord, ExpenseRecord, IncomeRecord, RecurringExpenseRecord, TransactionRecord, MarketListingRecord, OrderPaymentRecord, HatcheryBatchRecord, HatcheryEventRecord, BuyerRecord, OrderRecord, BroodingProfileRecord, ChickArrivalRecord, BrooderCheckRecord, ArticleRecord, MedicineRecord, VaccinationProgrammeRecord, VaccinationRecord, ChecklistTemplateRecord, VisitorRecord, BiosecurityLogRecord, CleaningTaskRecord, EquipmentRecord, EquipmentMovementRecord, TaskRecord, AlertRecord, ChickLotRecord, InventoryItemRecord, InventoryLotRecord, InventoryTransactionRecord, BirdWeightRecord, DailyRecordRecord, EggInventoryRecord, EggRecordRecord, FeedConsumptionRecord, FlockEventRecord, FlockRecord, HealthRecordRecord, HouseRecord, MediaAssetRecord, WaterRecordRecord } from "../../ports/records.js";
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
  glossary: Table<GlossaryTermRecord>;
  courses: Table<CourseRecord>;
  trainingProgress: Table<{ userId: string; courseId: string; lessonId: string; completedAt: Date }>;
  hatcheryBatches: Table<HatcheryBatchRecord>;
  hatcheryEvents: Table<HatcheryEventRecord>;
  buyers: Table<BuyerRecord>;
  orders: Table<OrderRecord>;
  broodingProfiles: Table<BroodingProfileRecord>;
  chickArrivals: Table<ChickArrivalRecord>;
  brooderChecks: Table<BrooderCheckRecord>;
  suppliers: Table<SupplierRecord>;
  moneyAccounts: Table<MoneyAccountRecord>;
  expenses: Table<ExpenseRecord>;
  incomes: Table<IncomeRecord>;
  recurringExpenses: Table<RecurringExpenseRecord>;
  transactions: Table<TransactionRecord>;
  listings: Table<MarketListingRecord>;
  orderPayments: Table<OrderPaymentRecord>;
  alertRules: Table<AlertRuleRecord>;
  notifications: Table<NotificationRecord>;
  pushDevices: Table<PushDeviceRecord>;
  notificationPreferences: Table<NotificationPreferenceRecord>;
  weatherObservations: Table<WeatherObservationRecord>;
  weatherCache: Table<WeatherCacheRecord>;
  counters: Map<string, number>;
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
    glossary: new Table(),
    courses: new Table(),
    trainingProgress: new Table(),
    hatcheryBatches: new Table(),
    hatcheryEvents: new Table(),
    buyers: new Table(),
    orders: new Table(),
    broodingProfiles: new Table(),
    chickArrivals: new Table(),
    brooderChecks: new Table(),
    suppliers: new Table(),
    moneyAccounts: new Table(),
    expenses: new Table(),
    incomes: new Table(),
    recurringExpenses: new Table(),
    transactions: new Table(),
    listings: new Table(),
    orderPayments: new Table(),
    alertRules: new Table(),
    notifications: new Table(),
    pushDevices: new Table(),
    notificationPreferences: new Table(),
    weatherObservations: new Table(),
    weatherCache: new Table(),
    counters: new Map(),
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
    store.glossary,
    store.courses,
    store.trainingProgress,
    store.hatcheryBatches,
    store.hatcheryEvents,
    store.buyers,
    store.orders,
    store.broodingProfiles,
    store.chickArrivals,
    store.brooderChecks,
    store.suppliers,
    store.moneyAccounts,
    store.expenses,
    store.incomes,
    store.recurringExpenses,
    store.transactions,
    store.listings,
    store.orderPayments,
    store.alertRules,
    store.notifications,
    store.pushDevices,
    store.notificationPreferences,
    store.weatherObservations,
    store.weatherCache,
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
        // Unique, like the Mongo _id: a second save of the same mutation fails.
        if (store.processed.get(rec.id)) throw new AppError("DUPLICATE", "Mutation already processed");
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
    hatcheryBatches: createMemFarmRepo(store.hatcheryBatches, { softDelete: true, versioned: true, unique: [["farmId", "code"]] }),
    hatcheryEvents: createMemFarmRepo(store.hatcheryEvents, { softDelete: false, versioned: false }),
    buyers: createMemFarmRepo(store.buyers, { softDelete: true, versioned: true }),
    orders: createMemFarmRepo(store.orders, { softDelete: true, versioned: true, unique: [["farmId", "orderNumber"]] }),
    broodingProfiles: createMemFarmRepo(store.broodingProfiles, { softDelete: true, versioned: true, unique: [["farmId", "name"]] }),
    chickArrivals: createMemFarmRepo(store.chickArrivals, { softDelete: true, versioned: true }),
    brooderChecks: createMemFarmRepo(store.brooderChecks, { softDelete: true, versioned: true }),
    suppliers: createMemFarmRepo(store.suppliers, { softDelete: true, versioned: true }),
    moneyAccounts: createMemFarmRepo(store.moneyAccounts, { softDelete: true, versioned: true, unique: [["farmId", "name"]] }),
    expenses: createMemFarmRepo(store.expenses, { softDelete: true, versioned: true }),
    incomes: createMemFarmRepo(store.incomes, { softDelete: true, versioned: true }),
    recurringExpenses: createMemFarmRepo(store.recurringExpenses, { softDelete: true, versioned: true }),
    transactions: createMemFarmRepo(store.transactions, { softDelete: false, versioned: false }),
    listings: createMemFarmRepo(store.listings, { softDelete: true, versioned: true }),
    orderPayments: createMemFarmRepo(store.orderPayments, { softDelete: false, versioned: false }),
    alertRules: createMemFarmRepo(store.alertRules, { softDelete: false, versioned: true, unique: [["farmId", "ruleKey"]] }),
    notifications: {
      async insertMany(recs) {
        // Unique dedupe keys, like the Mongo index: a second copy of the same event is an error.
        const keys = new Set(store.notifications.all().map((n) => n.dedupeKey).filter(Boolean));
        for (const r of recs) {
          if (r.dedupeKey && keys.has(r.dedupeKey)) throw new AppError("DUPLICATE", `Notification ${r.dedupeKey} already exists`);
          if (r.dedupeKey) keys.add(r.dedupeKey);
        }
        for (const r of recs) store.notifications.put(r.id, structuredClone(r));
      },
      async existingDedupeKeys(keys) {
        const wanted = new Set(keys);
        return new Set(store.notifications.all().map((n) => n.dedupeKey).filter((k): k is string => !!k && wanted.has(k)));
      },
      async forUser(userId, q) {
        return store.notifications.all().filter((n) => n.userId === userId && n.channel === "in_app" && (!q.unreadOnly || !n.readAt)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, q.limit).map((n) => structuredClone(n));
      },
      async unreadCount(userId) {
        return store.notifications.all().filter((n) => n.userId === userId && n.channel === "in_app" && !n.readAt).length;
      },
      async markRead(userId, ids, at) {
        let n = 0;
        for (const r of store.notifications.all()) {
          if (r.userId === userId && r.channel === "in_app" && !r.readAt && (ids === "all" || ids.includes(r.id))) {
            store.notifications.put(r.id, { ...r, readAt: at, status: "read", updatedAt: at });
            n++;
          }
        }
        return n;
      },
      async due(now, limit) {
        return store.notifications.all().filter((n) => n.status === "queued" && (!n.nextAttemptAt || n.nextAttemptAt <= now)).slice(0, limit).map((n) => structuredClone(n));
      },
      async update(id, patch) {
        const r = store.notifications.get(id);
        if (r) store.notifications.put(id, { ...r, ...patch });
      },
      async lastForAlert(alertId, userId, channel) {
        return store.notifications.all().filter((n) => n.alertId === alertId && n.userId === userId && n.channel === channel).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
      },
    },
    pushDevices: {
      async upsertByToken(rec) {
        const existing = store.pushDevices.all().find((d) => d.token === rec.token);
        const next = existing ? { ...existing, userId: rec.userId, platform: rec.platform, ...(rec.deviceName ? { deviceName: rec.deviceName } : {}), lastSeenAt: rec.lastSeenAt, disabledAt: undefined, updatedAt: rec.updatedAt } : rec;
        store.pushDevices.put(next.id, structuredClone(next));
        return structuredClone(next);
      },
      async activeForUser(userId) {
        return store.pushDevices.all().filter((d) => d.userId === userId && !d.disabledAt).map((d) => structuredClone(d));
      },
      async disableTokens(tokens, at) {
        for (const d of store.pushDevices.all()) if (tokens.includes(d.token)) store.pushDevices.put(d.id, { ...d, disabledAt: at, updatedAt: at });
      },
      async remove(userId, id) {
        const d = store.pushDevices.get(id);
        if (!d || d.userId !== userId) return false;
        store.pushDevices.rows.delete(id);
        return true;
      },
    },
    notificationPreferences: {
      async get(userId) {
        const r = store.notificationPreferences.all().find((p) => p.userId === userId);
        return r ? structuredClone(r) : null;
      },
      async put(rec) {
        const existing = store.notificationPreferences.all().find((p) => p.userId === rec.userId);
        store.notificationPreferences.put(existing?.id ?? rec.id, structuredClone({ ...rec, id: existing?.id ?? rec.id }));
      },
    },
    weather: {
      async getCache(provider, locationKey, kind) {
        const r = store.weatherCache.all().find((c) => c.provider === provider && c.locationKey === locationKey && c.kind === kind);
        return r ? structuredClone(r) : null;
      },
      async putCache(rec) {
        const existing = store.weatherCache.all().find((c) => c.provider === rec.provider && c.locationKey === rec.locationKey && c.kind === rec.kind);
        store.weatherCache.put(existing?.id ?? rec.id, structuredClone({ ...rec, id: existing?.id ?? rec.id }));
      },
      async upsertObservations(recs) {
        for (const r of recs) {
          const existing = store.weatherObservations.all().find((o) => o.locationKey === r.locationKey && o.date === r.date);
          store.weatherObservations.put(existing?.id ?? r.id, structuredClone({ ...r, id: existing?.id ?? r.id, createdAt: existing?.createdAt ?? r.createdAt }));
        }
      },
      async observations(locationKey, from, to) {
        return store.weatherObservations.all().filter((o) => o.locationKey === locationKey && o.date >= from && o.date <= to).sort((a, b) => (a.date < b.date ? -1 : 1)).map((o) => structuredClone(o));
      },
    },
    market: {
      async activeListings(q) {
        const t = q.text?.toLowerCase();
        return store.listings
          .all()
          .filter((l) => !l.deletedAt && l.status === "active" && (!q.category || l.category === q.category) && (!q.regionCode || l.regionCode === q.regionCode || l.regionCode.startsWith(`${q.regionCode}-`)) && (!t || l.title.toLowerCase().includes(t)))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, q.limit)
          .map((l) => structuredClone(l));
      },
      async listingById(id) {
        const l = store.listings.get(id);
        return l && !l.deletedAt ? structuredClone(l) : null;
      },
      async orderById(id) {
        const o = store.orders.get(id);
        return o && !o.deletedAt ? structuredClone(o) : null;
      },
      async ordersForBuyer(userId) {
        return store.orders.all().filter((o) => o.buyerUserId === userId && !o.deletedAt).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((o) => structuredClone(o));
      },
    },
    counters: {
      async next(name, farmId) {
        const key = `${name}:${farmId}`;
        const n = (store.counters.get(key) ?? 0) + 1;
        store.counters.set(key, n);
        return n;
      },
    },
    articles: { ...createMemContentRepo(store.articles, "title"), async findBySourceUrl(url) {
      const r = store.articles.all().find((a) => a.sourceUrl === url);
      return r ? structuredClone(r) : null;
    } },
    glossary: createMemContentRepo(store.glossary, "term"),
    courses: createMemContentRepo(store.courses, "title"),
    trainingProgress: {
      async complete(userId, courseId, lessonId, at) {
        const exists = store.trainingProgress.all().find((p) => p.userId === userId && p.lessonId === lessonId && p.courseId === courseId);
        if (!exists) store.trainingProgress.put(`${userId}:${courseId}:${lessonId}`, { userId, courseId, lessonId, completedAt: at });
      },
      async forUser(userId, courseId) {
        return store.trainingProgress.all().filter((p) => p.userId === userId && (!courseId || p.courseId === courseId)).map((p) => ({ ...p }));
      },
    },
    async locateDailyRecord(id) {
      const r = store.dailyRecords.get(id);
      return r && !r.deletedAt ? r.farmId : null;
    },
  };
  return { repos, store };
}

/** Global content (articles, glossary, courses): unique by slug + locale, versioned writes. */
function createMemContentRepo<T extends { id: string; slug: string; locale: string; version: number; status: string; regionCode: string }>(table: Table<T>, titleField: string): import("../../ports/repositories.js").ContentRepo<T> {
  const f = (r: T) => r as unknown as Record<string, unknown>;
  return {
    async find(q) {
      const statuses = q.status === undefined ? null : Array.isArray(q.status) ? q.status : [q.status];
      const t = q.text?.toLowerCase();
      const sortBy = q.sortBy ?? "updatedAt";
      const key = (r: T) => {
        const v = f(r)[sortBy];
        return v instanceof Date ? v.getTime() : (v as string | number | undefined) ?? "";
      };
      const asc = sortBy === "order" || sortBy === "term";
      return table
        .all()
        .filter((r) => (!statuses || statuses.includes(r.status)) && (!q.kind || f(r)["kind"] === q.kind) && (!q.category || f(r)["category"] === q.category) && (!q.locale || r.locale === q.locale) && (!q.regionCodes || q.regionCodes.includes(r.regionCode)) && (!t || String(f(r)[titleField] ?? "").toLowerCase().includes(t)))
        .sort((a, b) => (key(a) < key(b) ? (asc ? -1 : 1) : key(a) > key(b) ? (asc ? 1 : -1) : 0))
        .slice(0, q.limit)
        .map((r) => structuredClone(r));
    },
    async findById(id) {
      const r = table.get(id);
      return r ? structuredClone(r) : null;
    },
    async findBySlug(slug, locale) {
      const r = table.all().find((x) => x.slug === slug && x.locale === locale);
      return r ? structuredClone(r) : null;
    },
    async insert(rec) {
      if (table.all().some((x) => x.slug === rec.slug && x.locale === rec.locale)) throw duplicate("slug_1_locale_1");
      if (f(rec)["sourceUrl"] && table.all().some((x) => f(x)["sourceUrl"] === f(rec)["sourceUrl"])) throw duplicate("sourceUrl_1");
      table.put(rec.id, structuredClone(rec));
    },
    async update(id, patch, expectedVersion) {
      const cur = table.get(id);
      if (!cur || cur.version !== expectedVersion) return null;
      if (patch.slug && table.all().some((x) => x.id !== id && x.slug === patch.slug && x.locale === (patch.locale ?? cur.locale))) throw duplicate("slug_1_locale_1");
      const next = { ...cur, ...patch, version: expectedVersion + 1 } as T;
      for (const [k, v] of Object.entries(patch)) if (v === undefined) delete (next as Record<string, unknown>)[k];
      table.put(id, structuredClone(next));
      return structuredClone(next);
    },
  };
}

function duplicate(index: string) {
  const e = new Error(`Duplicate key ${index}`) as Error & { code: number };
  e.code = 11000;
  return e;
}
