import type { FarmSettings, GeoPoint, MembershipStatus, Role, SessionPlatform, UserStatus } from "@poultrypilot/types";

/** Persistence records. Every farm-owned record carries farmId. IDs are UUIDv7 strings. */

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  googleSub?: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  status: UserStatus;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  /** Consecutive failed password attempts; reset on success. */
  failedLoginCount: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * One signed-in device. Created at login, ended by logout, password change/reset, or the user
 * revoking it. Every request's access token names its session, and the session is checked on each
 * request, so ending a session takes effect immediately rather than when the access token expires.
 */
export interface SessionRecord {
  id: string;
  userId: string;
  platform: SessionPlatform;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  authMethod: "password" | "google";
  createdAt: Date;
  lastUsedAt: Date;
  /** Absolute limit; refresh cannot extend a session past this. */
  expiresAt: Date;
  revokedAt?: Date;
  revokedReason?: "logout" | "user_revoked" | "password_changed" | "password_reset" | "token_reuse" | "account_disabled";
}

/** Rotating refresh token. Each refresh issues a new one and marks the old one replaced. */
export interface RefreshTokenRecord {
  id: string;
  sessionId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  replacedById?: string;
  revokedAt?: Date;
}

/** Single-use emailed tokens. Only the SHA-256 hash is stored. */
export interface OneTimeTokenRecord {
  id: string;
  userId: string;
  purpose: "email_verification" | "password_reset";
  tokenHash: string;
  /** Email address the token was sent to; verification only counts for that address. */
  email: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface FarmRecord {
  id: string;
  name: string;
  description?: string;
  countryCode?: string;
  locationLabel?: string;
  location?: GeoPoint;
  settings: FarmSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deletedAt?: Date;
}

export interface MembershipRecord {
  id: string;
  farmId: string;
  userId?: string;
  email: string;
  role: Role;
  status: MembershipStatus;
  inviteTokenHash?: string;
  inviteExpiresAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  removedAt?: Date;
  removedBy?: string;
  /** Who created the membership: the inviter, or the user themselves for a farm they created. */
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface AuditEventRecord {
  id: string;
  farmId?: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  requestId?: string;
  mutationId?: string;
  deviceId?: string;
  at: Date;
}

export interface IdempotencyRecord {
  id: string; // `${userId}:${key}`
  requestHash: string;
  status: "processing" | "done";
  responseStatus?: number;
  responseBody?: unknown;
  createdAt: Date;
}

export interface SyncChangeRecord {
  farmId: string;
  seq: number;
  entity: string;
  entityId: string;
  op: "upsert" | "delete";
  version: number;
  document?: unknown;
  at: Date;
}

/** One pushed offline mutation and its outcome (collection sync_operations). */
export interface ProcessedMutationRecord {
  id: string; // `${farmId}:${mutationId}`
  farmId: string;
  mutationId: string;
  userId: string;
  deviceId: string;
  command: string;
  entityId?: string;
  baseVersion?: number;
  status: "accepted" | "rejected" | "conflict";
  result: unknown;
  receivedAt: Date;
  at: Date;
}

// ---- flock engine ----------------------------------------------------------

export interface MoneyValue {
  amountMinor: number;
  currency: string;
}

/** Fields every farm-owned record carries. */
export interface FarmOwned {
  id: string;
  farmId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Editable extends FarmOwned {
  version: number;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface HouseRecord extends Editable {
  name: string;
  type: import("@poultrypilot/types").HouseType;
  capacityBirds?: number;
  floorAreaM2?: number;
  status: "active" | "inactive";
  notes?: string;
}

export interface FlockPopulationSnapshot {
  placed: number;
  transferredIn: number;
  mortality: number;
  culled: number;
  sold: number;
  transferredOut: number;
  adjustments: number;
  alive: number;
  asOf: string;
}

export interface FlockRecord extends Editable {
  houseId: string;
  name: string;
  flockCode: string;
  type: import("@poultrypilot/types").FlockType;
  customTypeName?: string;
  species: import("@poultrypilot/types").Species;
  breed?: string;
  strain?: string;
  source?: string;
  status: import("@poultrypilot/types").FlockStatus;
  hatchDate?: string;
  placementDate?: string;
  placementCount?: number;
  deadOnArrival?: number;
  ageDaysAtPlacement?: number;
  startingWeightG?: number;
  chickCost?: MoneyValue;
  targetSaleDate?: string;
  closedDate?: string;
  splitFromFlockId?: string;
  mergedIntoFlockId?: string;
  notes?: string;
  population?: FlockPopulationSnapshot;
}

export interface FlockEventRecord extends FarmOwned {
  flockId: string;
  type: import("@poultrypilot/types").FlockEventType;
  date: string;
  birds?: number;
  deadOnArrival?: number;
  delta?: number;
  cause?: import("@poultrypilot/types").MortalityCause;
  totalLiveWeightKg?: number;
  averageWeightG?: number;
  sampleSize?: number;
  birdWeightId?: string;
  total?: MoneyValue;
  cost?: MoneyValue;
  counterpartFlockId?: string;
  fromHouseId?: string;
  toHouseId?: string;
  groupId?: string;
  dailyRecordId?: string;
  buyerId?: string;
  fromStatus?: import("@poultrypilot/types").FlockStatus;
  toStatus?: import("@poultrypilot/types").FlockStatus;
  reason?: string;
  reversalOf?: string;
  note?: string;
}

export interface DailyRecordRecord extends Editable {
  flockId: string;
  date: string;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  humidityPercent?: number;
  lightingHours?: number;
  notes?: string;
}

export interface BirdWeightRecord extends Editable {
  flockId: string;
  date: string;
  weightsG: number[];
  stats?: { count: number; meanG: number; minG: number; maxG: number; sdG: number; cvPercent: number; uniformityPercent: number };
  note?: string;
}

export interface FeedConsumptionRecord extends Editable {
  flockId: string;
  feedItemId?: string;
  date: string;
  quantityKg: number;
  dailyRecordId?: string;
  cost?: MoneyValue;
  notes?: string;
}

export interface WaterRecordRecord extends Editable {
  flockId: string;
  date: string;
  litres: number;
  dailyRecordId?: string;
  notes?: string;
}
