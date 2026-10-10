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
}
