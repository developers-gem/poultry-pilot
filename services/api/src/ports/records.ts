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

export interface ProcessedMutationRecord {
  id: string; // `${farmId}:${mutationId}`
  farmId: string;
  result: unknown;
  at: Date;
}
