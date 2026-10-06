import type { FarmSettings, GeoPoint, MembershipStatus, Role } from "@poultrypilot/contracts";

/** Persistence records. Every farm-owned record carries farmId. IDs are UUIDv7 strings. */

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  googleSub?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  replacedById?: string;
  revokedAt?: Date;
  userAgent?: string;
  ip?: string;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  tokenHash: string;
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
