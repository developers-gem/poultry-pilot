import { MEMBERSHIP_STATUSES, ROLES, SESSION_PLATFORMS, UNIT_SYSTEMS, USER_STATUSES, PLATFORM_ROLES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { GeoPointSchema, bool, defineCollection, enumOf, instant, int, num, ref, str, text } from "./base.js";

const D = "Identity and tenancy";

export const UserModel = defineCollection({
  model: "User",
  collection: "users",
  domain: D,
  ownership: "user",
  description: "A person who signs in. Belongs to farms through farm_members, never directly.",
  versioned: true,
  fields: {
    email: str({ required: true, max: 254, lowercase: true }),
    fullName: str({ required: true, max: 120 }),
    phone: str({ max: 30 }),
    /** PoultryPilot staff roles for global content; granted by an operator, never by farms. */
    platformRoles: { type: [enumOf(PLATFORM_ROLES)], default: undefined },
    locale: str({ max: 10 }),
    passwordHash: { type: String },
    googleSub: { type: String },
    emailVerified: bool(false),
    emailVerifiedAt: instant(),
    status: enumOf(USER_STATUSES, { required: true, default: "active" }),
    passwordChangedAt: instant(),
    lastLoginAt: instant(),
    failedLoginCount: int({ default: 0 }),
    lockedUntil: instant(),
  },
  indexes: [
    { fields: { email: 1 }, options: { unique: true }, why: "Login and sign-up look users up by email; one account per email" },
    { fields: { googleSub: 1 }, options: { unique: true, sparse: true }, why: "Google sign-in resolves the user by Google subject id" },
  ],
});

export const SessionModel = defineCollection({
  model: "Session",
  collection: "sessions",
  domain: D,
  ownership: "user",
  actor: "none",
  description: "One signed-in device. Checked on every authenticated request, so revoking it signs the device out immediately.",
  fields: {
    userId: ref("User", { required: true }),
    platform: enumOf(SESSION_PLATFORMS, { required: true }),
    deviceId: str({ max: 100 }),
    deviceName: str({ max: 100 }),
    userAgent: str({ max: 300 }),
    ipAddress: str({ max: 64 }),
    authMethod: enumOf(["password", "google"], { required: true }),
    lastUsedAt: instant({ required: true }),
    expiresAt: instant({ required: true }),
    revokedAt: instant(),
    revokedReason: enumOf(["logout", "user_revoked", "password_changed", "password_reset", "token_reuse", "account_disabled"]),
  },
  indexes: [
    { fields: { userId: 1, revokedAt: 1 }, why: "List a user's active sessions; revoke all of a user's sessions" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 30 * 86_400 }, why: "TTL: delete sessions 30 days after they expire" },
  ],
});

export const RefreshTokenModel = defineCollection({
  model: "RefreshToken",
  collection: "refresh_tokens",
  domain: D,
  ownership: "user",
  actor: "none",
  description: "Rotating refresh token of a session. Only the SHA-256 hash is stored.",
  fields: {
    sessionId: ref("Session", { required: true }),
    userId: ref("User", { required: true }),
    tokenHash: { type: String, required: true },
    expiresAt: instant({ required: true }),
    replacedById: ref("RefreshToken"),
    revokedAt: instant(),
  },
  indexes: [
    { fields: { tokenHash: 1 }, options: { unique: true }, why: "POST /auth/refresh finds the token by hash" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 7 * 86_400 }, why: "TTL: delete tokens a week after expiry" },
  ],
});

export const OneTimeTokenModel = defineCollection({
  model: "OneTimeToken",
  collection: "one_time_tokens",
  domain: D,
  ownership: "user",
  actor: "none",
  description: "Single-use emailed links (email verification 24 h, password reset 1 h). Hash only.",
  fields: {
    userId: ref("User", { required: true }),
    purpose: enumOf(["email_verification", "password_reset"], { required: true }),
    tokenHash: { type: String, required: true },
    email: str({ required: true, max: 254, lowercase: true }),
    expiresAt: instant({ required: true }),
    usedAt: instant(),
  },
  indexes: [
    { fields: { tokenHash: 1 }, options: { unique: true }, why: "Verify-email and reset-password find the token by hash" },
    { fields: { userId: 1, purpose: 1 }, why: "Invalidate a user's outstanding links of one purpose" },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 86_400 }, why: "TTL: delete links a day after expiry" },
  ],
});

export const FarmModel = defineCollection({
  model: "Farm",
  collection: "farms",
  domain: D,
  ownership: "tenant",
  description: "The tenant. Every farm-owned document carries this farm's _id as farmId.",
  softDelete: true,
  fields: {
    name: str({ required: true, max: 120 }),
    description: text(2000),
    countryCode: { type: String, match: /^[A-Z]{2}$/ },
    locationLabel: str({ max: 200 }),
    location: { type: GeoPointSchema },
    settings: {
      type: new Schema(
        {
          timezone: { type: String, required: true },
          currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
          unitSystem: enumOf(UNIT_SYSTEMS, { required: true }),
          fcrIncludesMortalityWeight: bool(false),
          workerEditWindowDays: int({ default: 1, max: 7 }),
          /** The farm's own rule for hours between a visitor's last poultry contact and entry. None = not checked. */
          visitorDowntimeHours: num({ max: 10_000 }),
        },
        { _id: false },
      ),
      required: true,
    },
  },
  // Farms are only read by _id (from memberships); no secondary index is needed.
});

export const MembershipModel = defineCollection({
  model: "FarmMember",
  collection: "farm_members",
  domain: D,
  ownership: "farm",
  softDelete: false, // lifecycle is the status field: invited → active → revoked
  description: "A user's role on a farm, or a pending invitation by email. The basis of every authorization check.",
  fields: {
    userId: ref("User"),
    email: str({ required: true, max: 254, lowercase: true }),
    role: enumOf(ROLES, { required: true }),
    status: enumOf(MEMBERSHIP_STATUSES, { required: true }),
    inviteTokenHash: { type: String },
    inviteExpiresAt: instant(),
    invitedBy: ref("User"),
    invitedAt: instant(),
    joinedAt: instant(),
    removedAt: instant(),
    removedBy: ref("User"),
  },
  indexes: [
    { fields: { farmId: 1, userId: 1 }, why: "requireFarm: is this user an active member of this farm (every farm request)" },
    { fields: { farmId: 1, email: 1 }, why: "Invite: is this email already a member or invited" },
    { fields: { userId: 1, status: 1 }, why: "GET /me and GET /farms: the user's active memberships across farms" },
    { fields: { inviteTokenHash: 1 }, options: { unique: true, sparse: true }, why: "Accept invitation by token hash" },
  ],
  notes: ["Members list (farmId only) is served by the farmId+userId index prefix."],
});
