import mongoose, { Schema } from "mongoose";
import { requireFarmScope } from "./plugins.js";

/**
 * Mongoose models. `_id` is a client/server-generated UUIDv7 string.
 * Indexes are declared here and created by `syncIndexes()` at deploy time, not on every boot.
 */
const opts = { versionKey: false as const, minimize: false };

const GeoPointSchema = new Schema({ lat: Number, lng: Number }, { _id: false });

export const UserModel = mongoose.model(
  "User",
  new Schema(
    {
      _id: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      fullName: { type: String, required: true },
      passwordHash: String,
      googleSub: String,
      emailVerified: { type: Boolean, default: false },
      createdAt: { type: Date, required: true },
      updatedAt: { type: Date, required: true },
      version: { type: Number, required: true, default: 0 },
    },
    opts,
  )
    .index({ email: 1 }, { unique: true })
    .index({ googleSub: 1 }, { unique: true, sparse: true }),
  "users",
);

export const RefreshTokenModel = mongoose.model(
  "RefreshToken",
  new Schema(
    {
      _id: String,
      userId: { type: String, required: true },
      familyId: { type: String, required: true },
      tokenHash: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      createdAt: { type: Date, required: true },
      replacedById: String,
      revokedAt: Date,
      userAgent: String,
      ip: String,
    },
    opts,
  )
    .index({ tokenHash: 1 }, { unique: true })
    .index({ familyId: 1 })
    .index({ userId: 1 })
    .index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 86_400 }), // purge a week after expiry
  "refresh_tokens",
);

export const PasswordResetModel = mongoose.model(
  "PasswordReset",
  new Schema(
    { _id: String, userId: String, tokenHash: String, expiresAt: Date, usedAt: Date, createdAt: Date },
    opts,
  )
    .index({ tokenHash: 1 }, { unique: true })
    .index({ expiresAt: 1 }, { expireAfterSeconds: 86_400 }),
  "password_resets",
);

export const FarmModel = mongoose.model(
  "Farm",
  new Schema(
    {
      _id: String,
      name: { type: String, required: true },
      description: String,
      countryCode: String,
      locationLabel: String,
      location: GeoPointSchema,
      settings: {
        timezone: { type: String, required: true },
        currency: { type: String, required: true },
        unitSystem: { type: String, enum: ["metric", "imperial"], required: true },
        fcrIncludesMortalityWeight: { type: Boolean, default: false },
        workerEditWindowDays: { type: Number, default: 1 },
      },
      createdBy: String,
      createdAt: Date,
      updatedAt: Date,
      version: { type: Number, required: true, default: 0 },
      deletedAt: Date,
    },
    opts,
  ),
  "farms",
);

const membershipSchema = new Schema(
  {
    _id: String,
    farmId: { type: String, required: true },
    userId: String,
    email: { type: String, required: true, lowercase: true },
    role: { type: String, enum: ["owner", "manager", "worker", "veterinarian", "accountant"], required: true },
    status: { type: String, enum: ["invited", "active", "revoked"], required: true },
    inviteTokenHash: String,
    inviteExpiresAt: Date,
    invitedBy: String,
    createdAt: Date,
    updatedAt: Date,
    version: { type: Number, default: 0 },
  },
  opts,
)
  .index({ farmId: 1, userId: 1 })
  .index({ farmId: 1, email: 1 })
  .index({ userId: 1, status: 1 })
  .index({ inviteTokenHash: 1 }, { unique: true, sparse: true });
requireFarmScope(membershipSchema);
export const MembershipModel = mongoose.model("Membership", membershipSchema, "farm_memberships");

const auditSchema = new Schema(
  {
    _id: String,
    farmId: String,
    actorUserId: String,
    action: String,
    entity: String,
    entityId: String,
    changes: Schema.Types.Mixed,
    requestId: String,
    mutationId: String,
    deviceId: String,
    at: Date,
  },
  opts,
).index({ farmId: 1, _id: -1 });
export const AuditModel = mongoose.model("AuditEvent", auditSchema, "audit_events");

export const IdempotencyModel = mongoose.model(
  "IdempotencyKey",
  new Schema(
    {
      _id: String,
      requestHash: String,
      status: String,
      responseStatus: Number,
      responseBody: Schema.Types.Mixed,
      createdAt: Date,
    },
    opts,
  ).index({ createdAt: 1 }, { expireAfterSeconds: 7 * 86_400 }),
  "idempotency_keys",
);

const syncChangeSchema = new Schema(
  {
    farmId: { type: String, required: true },
    seq: { type: Number, required: true },
    entity: String,
    entityId: String,
    op: String,
    version: Number,
    document: Schema.Types.Mixed,
    at: Date,
  },
  opts,
).index({ farmId: 1, seq: 1 }, { unique: true });
requireFarmScope(syncChangeSchema);
export const SyncChangeModel = mongoose.model("SyncChange", syncChangeSchema, "sync_changes");

export const CounterModel = mongoose.model(
  "Counter",
  new Schema({ _id: String, value: { type: Number, default: 0 } }, opts),
  "counters",
);

export const ProcessedMutationModel = mongoose.model(
  "ProcessedMutation",
  new Schema({ _id: String, farmId: String, result: Schema.Types.Mixed, at: Date }, opts).index(
    { at: 1 },
    { expireAfterSeconds: 90 * 86_400 },
  ),
  "processed_mutations",
);
