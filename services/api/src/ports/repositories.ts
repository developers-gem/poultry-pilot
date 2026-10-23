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
  HouseRecord,
  FlockRecord,
  FlockEventRecord,
  DailyRecordRecord,
  BirdWeightRecord,
  FeedConsumptionRecord,
  WaterRecordRecord,
  EggRecordRecord,
  EggInventoryRecord,
  HealthRecordRecord,
  MediaAssetRecord,
  InventoryItemRecord,
  InventoryLotRecord,
  InventoryTransactionRecord,
  ChickLotRecord,
  AlertRecord,
  MedicineRecord,
  VaccinationProgrammeRecord,
  VaccinationRecord,
  ChecklistTemplateRecord,
  VisitorRecord,
  BiosecurityLogRecord,
  CleaningTaskRecord,
  EquipmentRecord,
  EquipmentMovementRecord,
  TaskRecord,
  ArticleRecord,
  GlossaryTermRecord,
  CourseRecord,
  HatcheryBatchRecord,
  HatcheryEventRecord,
  BuyerRecord,
  OrderRecord,
  BroodingProfileRecord,
  ChickArrivalRecord,
  BrooderCheckRecord,
  SupplierRecord,
  MoneyAccountRecord,
  ExpenseRecord,
  IncomeRecord,
  RecurringExpenseRecord,
  TransactionRecord,
  MarketListingRecord,
  OrderPaymentRecord,
  AlertRuleRecord,
  NotificationRecord,
  PushDeviceRecord,
  NotificationPreferenceRecord,
  WeatherObservationRecord,
  WeatherCacheRecord,
} from "./records.js";

/**
 * Opaque transaction handle. The Mongo adapter carries a ClientSession; the memory adapter
 * carries nothing. Services never inspect it — they only pass it to repositories.
 */
export interface Tx {
  readonly session?: unknown;
}

export interface TxRunner {
  run<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

export interface UsersRepo {
  findById(id: string, tx?: Tx): Promise<UserRecord | null>;
  findByEmail(email: string, tx?: Tx): Promise<UserRecord | null>;
  findByGoogleSub(sub: string, tx?: Tx): Promise<UserRecord | null>;
  create(rec: UserRecord, tx?: Tx): Promise<void>;
  update(id: string, patch: Partial<UserRecord>, tx?: Tx): Promise<UserRecord | null>;
  delete(id: string, tx?: Tx): Promise<boolean>;
}

export interface SessionsRepo {
  create(rec: SessionRecord, tx?: Tx): Promise<void>;
  findById(id: string, tx?: Tx): Promise<SessionRecord | null>;
  listForUser(userId: string, tx?: Tx): Promise<SessionRecord[]>;
  touch(id: string, at: Date, tx?: Tx): Promise<void>;
  revoke(id: string, at: Date, reason: NonNullable<SessionRecord["revokedReason"]>, tx?: Tx): Promise<void>;
  /** Revokes every active session of a user, optionally keeping one (the caller's own). */
  revokeAllForUser(userId: string, at: Date, reason: NonNullable<SessionRecord["revokedReason"]>, exceptId?: string, tx?: Tx): Promise<number>;
}

export interface RefreshTokensRepo {
  create(rec: RefreshTokenRecord, tx?: Tx): Promise<void>;
  findByHash(tokenHash: string, tx?: Tx): Promise<RefreshTokenRecord | null>;
  update(id: string, patch: Partial<RefreshTokenRecord>, tx?: Tx): Promise<void>;
}

export interface OneTimeTokensRepo {
  create(rec: OneTimeTokenRecord, tx?: Tx): Promise<void>;
  findByHash(tokenHash: string, tx?: Tx): Promise<OneTimeTokenRecord | null>;
  markUsed(id: string, at: Date, tx?: Tx): Promise<void>;
  /** Invalidates every unused token of a purpose for a user (e.g. older reset links once one is used). */
  invalidateForUser(userId: string, purpose: OneTimeTokenRecord["purpose"], at: Date, tx?: Tx): Promise<void>;
}

export interface FarmsRepo {
  findById(id: string, tx?: Tx): Promise<FarmRecord | null>;
  findByIds(ids: string[], tx?: Tx): Promise<FarmRecord[]>;
  create(rec: FarmRecord, tx?: Tx): Promise<void>;
  /** Ids of farms not deleted. Used only by system jobs that run for every farm. */
  listIds(): Promise<string[]>;
  /** Optimistic update: returns null when the stored version differs from expectedVersion. */
  updateVersioned(id: string, expectedVersion: number, patch: Partial<FarmRecord>, tx?: Tx): Promise<FarmRecord | null>;
}

/** Every method takes farmId: there is no way to query memberships across farms by accident. */
export interface MembershipsRepo {
  findById(farmId: string, id: string, tx?: Tx): Promise<MembershipRecord | null>;
  findActive(farmId: string, userId: string, tx?: Tx): Promise<MembershipRecord | null>;
  findByFarm(farmId: string, tx?: Tx): Promise<MembershipRecord[]>;
  findByFarmAndEmail(farmId: string, email: string, tx?: Tx): Promise<MembershipRecord | null>;
  countActiveOwners(farmId: string, tx?: Tx): Promise<number>;
  create(rec: MembershipRecord, tx?: Tx): Promise<void>;
  update(farmId: string, id: string, patch: Partial<MembershipRecord>, tx?: Tx): Promise<MembershipRecord | null>;
  /** User-scoped lookups (not farm-scoped by nature). */
  findActiveForUser(userId: string, tx?: Tx): Promise<MembershipRecord[]>;
  findByInviteHash(tokenHash: string, tx?: Tx): Promise<MembershipRecord | null>;
}

export interface AuditRepo {
  insert(rec: AuditEventRecord, tx?: Tx): Promise<void>;
  list(farmId: string, opts: { beforeId?: string; limit: number }, tx?: Tx): Promise<AuditEventRecord[]>;
}

export interface IdempotencyRepo {
  /** Inserts a "processing" record. Returns the existing record if the key is already taken. */
  begin(rec: IdempotencyRecord): Promise<{ created: true } | { created: false; existing: IdempotencyRecord }>;
  complete(id: string, status: number, body: unknown): Promise<void>;
  release(id: string): Promise<void>;
}

export interface SyncRepo {
  /** Atomically allocates the next per-farm change sequence number. */
  nextSeq(farmId: string, tx?: Tx): Promise<number>;
  insertChange(rec: SyncChangeRecord, tx?: Tx): Promise<void>;
  listSince(farmId: string, since: number, limit: number, tx?: Tx): Promise<SyncChangeRecord[]>;
  findProcessed(id: string, tx?: Tx): Promise<ProcessedMutationRecord | null>;
  saveProcessed(rec: ProcessedMutationRecord, tx?: Tx): Promise<void>;
}

/** Answers "does this farm have money records yet?" so currency changes can be blocked. Implemented in Phase 3. */
export interface LedgerProbe {
  hasEntries(farmId: string, tx?: Tx): Promise<boolean>;
}

/**
 * Generic farm-scoped repository. Every method takes farmId; soft-deleted records are invisible.
 * insert/update throw an error with code 11000 when a unique key is violated (same as MongoDB).
 */
export interface FarmQuery<T> {
  /** Equality per field; an array value means "one of". */
  where?: { [K in keyof T]?: T[K] | T[K][] };
  /** Inclusive range on a string field (farm-local dates). */
  range?: { field: keyof T & string; from?: string; to?: string };
  /** Field presence: true = the field is set, false = it is absent. */
  exists?: { [K in keyof T]?: boolean };
  sort?: { field: keyof T & string; dir: 1 | -1 }[];
  limit?: number;
  /** Keyset pagination: records sorting after this (date desc, id desc) position. */
  after?: { date: string; id: string };
}

export interface AggregateRow {
  key: Record<string, unknown>;
  sums: Record<string, number>;
  count: number;
}

export interface FarmRepo<T extends { id: string; farmId: string }> {
  findById(farmId: string, id: string, tx?: Tx): Promise<T | null>;
  find(farmId: string, query?: FarmQuery<T>, tx?: Tx): Promise<T[]>;
  insert(rec: T, tx?: Tx): Promise<void>;
  insertMany(recs: T[], tx?: Tx): Promise<void>;
  /** Applies the patch; bumps `version` on versioned collections. Returns null if missing, deleted, or the version differs. */
  update(farmId: string, id: string, patch: Partial<T>, opts?: { expectedVersion?: number }, tx?: Tx): Promise<T | null>;
  /** Group matching live records by `by` fields and sum numeric `sums` fields, on the database server. */
  aggregate(farmId: string, query: FarmQuery<T>, by: (keyof T & string)[], sums: (keyof T & string)[]): Promise<AggregateRow[]>;
}

/** Global content: list with filters, open by id or slug, and versioned writes. */
export interface ContentQuery {
  status?: string | string[];
  kind?: string;
  category?: string;
  locale?: string;
  /** Matches any of these region codes. */
  regionCodes?: string[];
  /** Case-insensitive match on the title (or term). */
  text?: string;
  /** Newest first by this field. */
  sortBy?: "publicationDate" | "publishedAt" | "updatedAt" | "order" | "term";
  limit: number;
}
export interface ContentRepo<T extends { id: string; version: number }> {
  find(q: ContentQuery): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findBySlug(slug: string, locale: string): Promise<T | null>;
  insert(rec: T): Promise<void>;
  /** Applies only if the stored version matches; returns the new record or null on conflict. */
  update(id: string, patch: Partial<T>, expectedVersion: number): Promise<T | null>;
}

export interface Repositories {
  tx: TxRunner;
  users: UsersRepo;
  sessions: SessionsRepo;
  refreshTokens: RefreshTokensRepo;
  oneTimeTokens: OneTimeTokensRepo;
  farms: FarmsRepo;
  memberships: MembershipsRepo;
  audit: AuditRepo;
  idempotency: IdempotencyRepo;
  sync: SyncRepo;
  ledgerProbe: LedgerProbe;
  houses: FarmRepo<HouseRecord>;
  flocks: FarmRepo<FlockRecord>;
  /** Append-only: never updated. */
  flockEvents: FarmRepo<FlockEventRecord>;
  dailyRecords: FarmRepo<DailyRecordRecord>;
  birdWeights: FarmRepo<BirdWeightRecord>;
  feedConsumption: FarmRepo<FeedConsumptionRecord>;
  waterRecords: FarmRepo<WaterRecordRecord>;
  eggRecords: FarmRepo<EggRecordRecord>;
  /** Append-only. */
  eggInventory: FarmRepo<EggInventoryRecord>;
  healthRecords: FarmRepo<HealthRecordRecord>;
  mediaAssets: FarmRepo<MediaAssetRecord>;
  inventoryItems: FarmRepo<InventoryItemRecord>;
  inventoryLots: FarmRepo<InventoryLotRecord>;
  /** Append-only. */
  inventoryTransactions: FarmRepo<InventoryTransactionRecord>;
  chickLots: FarmRepo<ChickLotRecord>;
  alerts: FarmRepo<AlertRecord>;
  medicines: FarmRepo<MedicineRecord>;
  vaccinationProgrammes: FarmRepo<VaccinationProgrammeRecord>;
  vaccinations: FarmRepo<VaccinationRecord>;
  checklistTemplates: FarmRepo<ChecklistTemplateRecord>;
  visitors: FarmRepo<VisitorRecord>;
  biosecurityLogs: FarmRepo<BiosecurityLogRecord>;
  cleaningTasks: FarmRepo<CleaningTaskRecord>;
  equipment: FarmRepo<EquipmentRecord>;
  /** Append-only. */
  equipmentMovements: FarmRepo<EquipmentMovementRecord>;
  tasks: FarmRepo<TaskRecord>;
  hatcheryBatches: FarmRepo<HatcheryBatchRecord>;
  /** Append-only. */
  hatcheryEvents: FarmRepo<HatcheryEventRecord>;
  buyers: FarmRepo<BuyerRecord>;
  orders: FarmRepo<OrderRecord>;
  broodingProfiles: FarmRepo<BroodingProfileRecord>;
  chickArrivals: FarmRepo<ChickArrivalRecord>;
  brooderChecks: FarmRepo<BrooderCheckRecord>;
  suppliers: FarmRepo<SupplierRecord>;
  moneyAccounts: FarmRepo<MoneyAccountRecord>;
  expenses: FarmRepo<ExpenseRecord>;
  incomes: FarmRepo<IncomeRecord>;
  recurringExpenses: FarmRepo<RecurringExpenseRecord>;
  /** Append-only. */
  transactions: FarmRepo<TransactionRecord>;
  listings: FarmRepo<MarketListingRecord>;
  /** Append-only. */
  orderPayments: FarmRepo<OrderPaymentRecord>;
  /**
   * The marketplace's only cross-farm reads: active listings for browsing, one listing or order by id (the caller then
   * checks it may see it), and a buyer's own orders across sellers.
   */
  market: {
    activeListings(q: { category?: string; regionCode?: string; text?: string; limit: number }): Promise<MarketListingRecord[]>;
    listingById(id: string): Promise<MarketListingRecord | null>;
    orderById(id: string): Promise<OrderRecord | null>;
    ordersForBuyer(userId: string): Promise<OrderRecord[]>;
  };
  alertRules: FarmRepo<AlertRuleRecord>;
  /** Per-person notifications (not farm-scoped: a person sees theirs across farms) and the delivery queue. */
  notifications: {
    insertMany(recs: NotificationRecord[], tx?: Tx): Promise<void>;
    forUser(userId: string, q: { unreadOnly?: boolean; limit: number }): Promise<NotificationRecord[]>;
    unreadCount(userId: string): Promise<number>;
    markRead(userId: string, ids: string[] | "all", at: Date): Promise<number>;
    /** Queued push and email notifications whose next attempt is due. */
    due(now: Date, limit: number): Promise<NotificationRecord[]>;
    update(id: string, patch: Partial<NotificationRecord>): Promise<void>;
    lastForAlert(alertId: string, userId: string, channel: string): Promise<NotificationRecord | null>;
  /** Which of these dedupe keys are already stored (checked before inserting, inside the same transaction). */
  existingDedupeKeys(keys: string[], tx?: Tx): Promise<Set<string>>;
  /**
   * Claim a due notification for sending: atomically moves nextAttemptAt to leaseUntil if it is still queued and
   * still due at `expected`. Only one worker (of any number of API instances) wins; a crashed worker's lease expires.
   */
  claim(id: string, expected: Date, leaseUntil: Date): Promise<boolean>;
  };
  pushDevices: {
    upsertByToken(rec: PushDeviceRecord): Promise<PushDeviceRecord>;
    activeForUser(userId: string): Promise<PushDeviceRecord[]>;
    disableTokens(tokens: string[], at: Date): Promise<void>;
    remove(userId: string, id: string): Promise<boolean>;
  };
  notificationPreferences: {
    get(userId: string): Promise<NotificationPreferenceRecord | null>;
    put(rec: NotificationPreferenceRecord): Promise<void>;
  };
  /** Global, location-keyed weather: the provider cache and the daily history. */
  weather: {
    getCache(provider: string, locationKey: string, kind: WeatherCacheRecord["kind"]): Promise<WeatherCacheRecord | null>;
    putCache(rec: WeatherCacheRecord): Promise<void>;
    upsertObservations(recs: WeatherObservationRecord[]): Promise<void>;
    observations(locationKey: string, from: string, to: string): Promise<WeatherObservationRecord[]>;
  };
  /** Atomic per-farm sequences (order numbers). */
  counters: { next(name: string, farmId: string, tx?: Tx): Promise<number> };
  /** Global educational content (not farm-owned). */
  articles: ContentRepo<ArticleRecord> & { findBySourceUrl(url: string): Promise<ArticleRecord | null> };
  glossary: ContentRepo<GlossaryTermRecord>;
  courses: ContentRepo<CourseRecord>;
  trainingProgress: {
    complete(userId: string, courseId: string, lessonId: string, at: Date): Promise<void>;
    forUser(userId: string, courseId?: string): Promise<{ courseId: string; lessonId: string; completedAt: Date }[]>;
  };
  /**
   * The only by-id lookup that does not know the farm: used by /daily-records/:id routes to find which farm a
   * record belongs to, so the normal membership check can then run. Returns the farmId of a live record or null.
   */
  locateDailyRecord(id: string): Promise<string | null>;
}
