import { permissionsFor } from "@poultrypilot/constants";
import type { DeviceInfo, MeResponse, RegisterRequest, SessionView, TokenPair, UserView } from "@poultrypilot/types";
import { AppError, notFound } from "../lib/errors.js";
import { newId, randomToken, sha256, type Clock } from "../lib/util.js";
import type { EmailSender, GoogleTokenVerifier, PasswordHasher } from "../ports/external.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { FarmRecord, MembershipRecord, OneTimeTokenRecord, SessionRecord, UserRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import type { RequestContext } from "./context.js";
import type { SyncService } from "./sync.service.js";
import type { AccessTokens } from "./tokens.js";
import { toFarmView, toSessionView, toUserView } from "./views.js";

export interface AuthDeps {
  repos: Repositories;
  clock: Clock;
  hasher: PasswordHasher;
  accessTokens: AccessTokens;
  audit: AuditService;
  sync: SyncService;
  email: EmailSender;
  google?: GoogleTokenVerifier;
  appBaseUrl: string;
  /** Sliding lifetime of a refresh token. */
  refreshTtlDays: number;
  /** Absolute lifetime of a session; refreshing never extends past it. */
  sessionMaxDays: number;
  /** Consecutive failed passwords before the account is locked. */
  maxFailedLogins: number;
  lockMinutes: number;
}

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
  requestId?: string;
  device?: DeviceInfo;
}

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
}

const DAY = 86_400_000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function createAuthService(d: AuthDeps) {
  const { repos, clock } = d;
  // Verifying against a fixed hash when the user does not exist keeps login timing uniform.
  let dummyHash: Promise<string> | undefined;
  const getDummy = () => (dummyHash ??= d.hasher.hash(randomToken()));
  const ctxOf = (userId: string, meta: ClientMeta, sessionId?: string): RequestContext => ({
    userId,
    ...(sessionId ? { sessionId } : {}),
    ...(meta.requestId ? { requestId: meta.requestId } : {}),
    ...(meta.device?.deviceId ? { deviceId: meta.device.deviceId } : {}),
  });

  // ---- tokens & sessions ---------------------------------------------------

  async function issueRefreshToken(session: SessionRecord, tx?: Tx) {
    const now = clock.now();
    const secret = randomToken(32);
    const expiresAt = new Date(Math.min(now.getTime() + d.refreshTtlDays * DAY, session.expiresAt.getTime()));
    const id = newId();
    await repos.refreshTokens.create({ id, sessionId: session.id, userId: session.userId, tokenHash: sha256(secret), expiresAt, createdAt: now }, tx);
    return { id, secret, expiresAt };
  }

  async function tokenPair(session: SessionRecord, tx?: Tx): Promise<TokenPair & { _refreshId: string }> {
    const access = await d.accessTokens.sign(session.userId, session.id, clock.now());
    const refresh = await issueRefreshToken(session, tx);
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.secret,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      sessionId: session.id,
      _refreshId: refresh.id,
    };
  }

  const publicPair = ({ _refreshId: _, ...pair }: TokenPair & { _refreshId: string }): TokenPair => pair;

  async function startSession(user: UserRecord, method: SessionRecord["authMethod"], meta: ClientMeta, tx?: Tx): Promise<TokenPair> {
    const now = clock.now();
    const session: SessionRecord = {
      id: newId(),
      userId: user.id,
      platform: meta.device?.platform ?? "other",
      ...(meta.device?.deviceId ? { deviceId: meta.device.deviceId } : {}),
      ...(meta.device?.name ? { deviceName: meta.device.name } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent.slice(0, 300) } : {}),
      ...(meta.ip ? { ipAddress: meta.ip } : {}),
      authMethod: method,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + d.sessionMaxDays * DAY),
    };
    await repos.sessions.create(session, tx);
    await d.audit.record(ctxOf(user.id, meta, session.id), { action: "session.created", entity: "session", entityId: session.id, after: { platform: session.platform, authMethod: method } }, tx ?? {});
    return publicPair(await tokenPair(session, tx));
  }

  /**
   * Verifies an access token AND its session on every request. A revoked session (logout, password
   * change, user revoked it) fails immediately, not when the 15-minute access token expires.
   */
  async function authenticateAccess(token: string): Promise<AuthenticatedPrincipal> {
    const claims = await d.accessTokens.verify(token);
    const session = await repos.sessions.findById(claims.sid);
    const now = clock.now();
    if (!session || session.userId !== claims.sub) throw new AppError("UNAUTHENTICATED", "Invalid session");
    if (session.revokedAt) throw new AppError("SESSION_REVOKED", "This session has been signed out. Please sign in again.");
    if (session.expiresAt <= now) throw new AppError("TOKEN_EXPIRED", "Session expired. Please sign in again.");
    const user = await repos.users.findById(claims.sub);
    if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
    if (user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
    return { userId: user.id, sessionId: session.id };
  }

  // ---- one-time emailed tokens ----------------------------------------------

  async function createOneTimeToken(user: UserRecord, purpose: OneTimeTokenRecord["purpose"], ttlMs: number, tx?: Tx): Promise<string> {
    const token = randomToken();
    const now = clock.now();
    await repos.oneTimeTokens.create(
      { id: newId(), userId: user.id, purpose, tokenHash: sha256(token), email: user.email, expiresAt: new Date(now.getTime() + ttlMs), createdAt: now },
      tx,
    );
    return token;
  }

  async function consumeOneTimeToken(token: string, purpose: OneTimeTokenRecord["purpose"]): Promise<{ rec: OneTimeTokenRecord; user: UserRecord }> {
    const rec = await repos.oneTimeTokens.findByHash(sha256(token));
    const now = clock.now();
    const invalid = new AppError("TOKEN_INVALID", purpose === "password_reset" ? "This reset link is invalid or has expired. Request a new one." : "This verification link is invalid or has expired. Request a new one.");
    if (!rec || rec.purpose !== purpose || rec.usedAt || rec.expiresAt <= now) throw invalid;
    const user = await repos.users.findById(rec.userId);
    if (!user || user.status !== "active") throw invalid;
    return { rec, user };
  }

  async function sendVerificationEmail(user: UserRecord, token: string) {
    await d.email.send({
      to: user.email,
      kind: "email_verification",
      subject: "Confirm your email for PoultryPilot",
      text: `Confirm your email address within 24 hours: ${d.appBaseUrl}/verify-email?token=${token}`,
      token,
    });
  }

  // ---- farm bootstrap (shared with the farm service) ------------------------

  async function createFarmWithOwner(user: UserRecord, farm: RegisterRequest["farm"], ctx: RequestContext, tx: Tx) {
    const now = clock.now();
    const farmRec: FarmRecord = {
      id: newId(),
      name: farm.name,
      ...(farm.countryCode ? { countryCode: farm.countryCode } : {}),
      settings: { timezone: farm.timezone, currency: farm.currency, unitSystem: farm.unitSystem, fcrIncludesMortalityWeight: false, workerEditWindowDays: 1 },
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    const membership: MembershipRecord = {
      id: newId(),
      farmId: farmRec.id,
      userId: user.id,
      email: user.email,
      role: "owner",
      status: "active",
      joinedAt: now,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    await repos.farms.create(farmRec, tx);
    await repos.memberships.create(membership, tx);
    await d.audit.record(ctx, { farmId: farmRec.id, action: "farm.created", entity: "farm", entityId: farmRec.id, after: { name: farmRec.name, settings: farmRec.settings } }, tx);
    await d.sync.recordChange(farmRec.id, { entity: "farm", entityId: farmRec.id, op: "upsert", version: 0, document: toFarmView(farmRec) }, tx);
    return farmRec;
  }

  async function activeUser(userId: string): Promise<UserRecord> {
    const user = await repos.users.findById(userId);
    if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
    if (user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
    return user;
  }

  return {
    authenticateAccess,
    createFarmWithOwner,

    async register(input: RegisterRequest, meta: ClientMeta) {
      const email = input.email.toLowerCase();
      if (await repos.users.findByEmail(email)) throw new AppError("EMAIL_TAKEN", "An account with this email already exists");
      const passwordHash = await d.hasher.hash(input.password);
      const out = await repos.tx.run(async (tx) => {
        const now = clock.now();
        const user: UserRecord = {
          id: newId(),
          email,
          fullName: input.fullName,
          passwordHash,
          emailVerified: false,
          status: "active",
          passwordChangedAt: now,
          lastLoginAt: now,
          failedLoginCount: 0,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        try {
          await repos.users.create(user, tx);
        } catch (e) {
          if ((e as { code?: number }).code === 11000) throw new AppError("EMAIL_TAKEN", "An account with this email already exists");
          throw e;
        }
        const ctx = ctxOf(user.id, meta);
        await d.audit.record(ctx, { action: "user.registered", entity: "user", entityId: user.id }, tx);
        const farm = await createFarmWithOwner(user, input.farm, ctx, tx);
        const verifyToken = await createOneTimeToken(user, "email_verification", VERIFY_TTL_MS, tx);
        const tokens = await startSession(user, "password", meta, tx);
        return { user, farm, tokens, verifyToken };
      });
      await sendVerificationEmail(out.user, out.verifyToken);
      return { user: toUserView(out.user), farm: toFarmView(out.farm, "owner"), tokens: out.tokens };
    },

    async verifyEmail(token: string, meta: ClientMeta): Promise<UserView> {
      const { rec, user } = await consumeOneTimeToken(token, "email_verification");
      if (rec.email !== user.email) throw new AppError("TOKEN_INVALID", "This link was sent to a different email address");
      const now = clock.now();
      return repos.tx.run(async (tx) => {
        const next = await repos.users.update(user.id, { emailVerified: true, emailVerifiedAt: now, updatedAt: now }, tx);
        await repos.oneTimeTokens.invalidateForUser(user.id, "email_verification", now, tx);
        await d.audit.record(ctxOf(user.id, meta), { action: "user.email_verified", entity: "user", entityId: user.id }, tx);
        return toUserView(next!);
      });
    },

    async resendVerification(userId: string): Promise<{ sent: boolean }> {
      const user = await activeUser(userId);
      if (user.emailVerified) return { sent: false };
      await repos.oneTimeTokens.invalidateForUser(user.id, "email_verification", clock.now());
      const token = await createOneTimeToken(user, "email_verification", VERIFY_TTL_MS);
      await sendVerificationEmail(user, token);
      return { sent: true };
    },

    async login(emailRaw: string, password: string, meta: ClientMeta) {
      const now = clock.now();
      const user = await repos.users.findByEmail(emailRaw.toLowerCase());
      if (user?.lockedUntil && user.lockedUntil > now) {
        const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000);
        throw new AppError("ACCOUNT_LOCKED", `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`, { retryAfterSeconds: minutes * 60 });
      }
      const ok = user?.passwordHash ? await d.hasher.verify(user.passwordHash, password) : (await d.hasher.verify(await getDummy(), password), false);
      if (!user || !ok) {
        if (user) {
          const failed = user.failedLoginCount + 1;
          const lock = failed >= d.maxFailedLogins;
          await repos.users.update(user.id, {
            failedLoginCount: lock ? 0 : failed,
            ...(lock ? { lockedUntil: new Date(now.getTime() + d.lockMinutes * 60_000) } : {}),
            updatedAt: now,
          });
          if (lock) await d.audit.record(ctxOf(user.id, meta), { action: "user.locked", entity: "user", entityId: user.id }, {});
        }
        throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect");
      }
      if (user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
      const updated = await repos.users.update(user.id, { failedLoginCount: 0, lockedUntil: undefined, lastLoginAt: now, updatedAt: now });
      return { user: toUserView(updated ?? user), tokens: await startSession(user, "password", meta) };
    },

    /**
     * Google sign-in. Account resolution:
     * 1. a user already linked to this Google account (by `sub`) signs in;
     * 2. otherwise, if Google says the email is verified and a user has that email, Google is linked to it;
     * 3. otherwise a new user is created (email verified by Google) with no farm — the client then creates one.
     * Unverified Google emails are never linked or used to create accounts.
     */
    async loginWithGoogle(idToken: string, meta: ClientMeta) {
      if (!d.google) throw new AppError("NOT_IMPLEMENTED", "Google sign-in is not configured");
      const g = await d.google.verify(idToken).catch(() => {
        throw new AppError("INVALID_CREDENTIALS", "Google sign-in could not be verified");
      });
      const now = clock.now();
      let user = await repos.users.findByGoogleSub(g.sub);
      let created = false;
      if (!user) {
        if (!g.emailVerified) throw new AppError("INVALID_CREDENTIALS", "Your Google account email is not verified");
        const byEmail = await repos.users.findByEmail(g.email.toLowerCase());
        if (byEmail) {
          user = await repos.users.update(byEmail.id, { googleSub: g.sub, emailVerified: true, emailVerifiedAt: byEmail.emailVerifiedAt ?? now, updatedAt: now });
          await d.audit.record(ctxOf(byEmail.id, meta), { action: "user.google_linked", entity: "user", entityId: byEmail.id }, {});
        } else {
          user = {
            id: newId(),
            email: g.email.toLowerCase(),
            fullName: g.name ?? g.email.split("@")[0]!,
            googleSub: g.sub,
            emailVerified: true,
            emailVerifiedAt: now,
            status: "active",
            failedLoginCount: 0,
            createdAt: now,
            updatedAt: now,
            version: 0,
          };
          await repos.users.create(user);
          await d.audit.record(ctxOf(user.id, meta), { action: "user.registered", entity: "user", entityId: user.id, after: { method: "google" } }, {});
          created = true;
        }
      }
      if (!user || user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
      await repos.users.update(user.id, { lastLoginAt: now, updatedAt: now });
      const farms = await repos.memberships.findActiveForUser(user.id);
      return { user: toUserView(user), tokens: await startSession(user, "google", meta), created, needsFarm: farms.length === 0 };
    },

    /**
     * Refresh-token rotation with reuse detection. Presenting a token that was already rotated means it was
     * copied, so the whole session is revoked and both the thief and the owner must sign in again.
     */
    async refresh(secret: string, meta: ClientMeta): Promise<TokenPair> {
      const rec = await repos.refreshTokens.findByHash(sha256(secret));
      if (!rec) throw new AppError("UNAUTHENTICATED", "Refresh token not recognised");
      const now = clock.now();
      const session = await repos.sessions.findById(rec.sessionId);
      if (!session) throw new AppError("UNAUTHENTICATED", "Refresh token not recognised");
      if (rec.replacedById || rec.revokedAt) {
        await repos.sessions.revoke(session.id, now, "token_reuse");
        await d.audit.record(ctxOf(session.userId, meta, session.id), { action: "session.token_reuse_detected", entity: "session", entityId: session.id }, {});
        throw new AppError("TOKEN_REUSED", "This session was signed out for security. Please sign in again.");
      }
      if (session.revokedAt) throw new AppError("SESSION_REVOKED", "This session has been signed out. Please sign in again.");
      if (rec.expiresAt <= now || session.expiresAt <= now) throw new AppError("TOKEN_EXPIRED", "Session expired. Please sign in again.");
      await activeUser(session.userId);
      return repos.tx.run(async (tx) => {
        const pair = await tokenPair(session, tx);
        await repos.refreshTokens.update(rec.id, { replacedById: pair._refreshId }, tx);
        await repos.sessions.touch(session.id, now, tx);
        return publicPair(pair);
      });
    },

    /** Ends one session, identified by refresh token or by the caller's access token. Unknown tokens are ignored. */
    async logout(opts: { refreshToken?: string; principal?: AuthenticatedPrincipal }, meta: ClientMeta): Promise<void> {
      let sessionId = opts.principal?.sessionId;
      if (!sessionId && opts.refreshToken) sessionId = (await repos.refreshTokens.findByHash(sha256(opts.refreshToken)))?.sessionId;
      if (!opts.principal && !opts.refreshToken) throw new AppError("VALIDATION_FAILED", "Send the refresh token, or call with your access token");
      if (!sessionId) return;
      const session = await repos.sessions.findById(sessionId);
      if (!session || session.revokedAt) return;
      await repos.sessions.revoke(session.id, clock.now(), "logout");
      await d.audit.record(ctxOf(session.userId, meta, session.id), { action: "session.logout", entity: "session", entityId: session.id }, {});
    },

    /** Always succeeds from the caller's point of view, so it cannot be used to discover accounts. */
    async forgotPassword(emailRaw: string): Promise<void> {
      const user = await repos.users.findByEmail(emailRaw.toLowerCase());
      if (!user || user.status !== "active") return;
      await repos.oneTimeTokens.invalidateForUser(user.id, "password_reset", clock.now());
      const token = await createOneTimeToken(user, "password_reset", RESET_TTL_MS);
      await d.email.send({
        to: user.email,
        kind: "password_reset",
        subject: "Reset your PoultryPilot password",
        text: `Use this link within 1 hour to choose a new password: ${d.appBaseUrl}/reset-password?token=${token}. If you did not ask for this, ignore this email.`,
        token,
      });
    },

    /** Sets a new password from an emailed link. Signs out every session and unlocks the account. */
    async resetPassword(token: string, newPassword: string, meta: ClientMeta): Promise<void> {
      const { rec, user } = await consumeOneTimeToken(token, "password_reset");
      const passwordHash = await d.hasher.hash(newPassword);
      const now = clock.now();
      await repos.tx.run(async (tx) => {
        await repos.users.update(
          user.id,
          {
            passwordHash,
            passwordChangedAt: now,
            failedLoginCount: 0,
            lockedUntil: undefined,
            // The link reached this inbox, which proves the address.
            ...(rec.email === user.email && !user.emailVerified ? { emailVerified: true, emailVerifiedAt: now } : {}),
            updatedAt: now,
          },
          tx,
        );
        await repos.oneTimeTokens.markUsed(rec.id, now, tx);
        await repos.oneTimeTokens.invalidateForUser(user.id, "password_reset", now, tx);
        await repos.sessions.revokeAllForUser(user.id, now, "password_reset", undefined, tx);
        await d.audit.record(ctxOf(user.id, meta), { action: "user.password_reset", entity: "user", entityId: user.id }, tx);
      });
      await d.email.send({ to: user.email, kind: "password_changed", subject: "Your PoultryPilot password was reset", text: "Your password was reset and all devices were signed out. If this was not you, reset it again and contact support." });
    },

    /** Changes the password of a signed-in user. Keeps the current session; signs out every other one. */
    async changePassword(principal: AuthenticatedPrincipal, currentPassword: string, newPassword: string, meta: ClientMeta): Promise<{ otherSessionsSignedOut: number }> {
      const user = await activeUser(principal.userId);
      if (!user.passwordHash) {
        throw new AppError("VALIDATION_FAILED", "This account signs in with Google and has no password. Use forgot password to set one.");
      }
      if (!(await d.hasher.verify(user.passwordHash, currentPassword))) throw new AppError("CURRENT_PASSWORD_INCORRECT", "Your current password is incorrect");
      if (await d.hasher.verify(user.passwordHash, newPassword)) throw new AppError("SAME_PASSWORD", "Choose a password different from your current one");
      const passwordHash = await d.hasher.hash(newPassword);
      const now = clock.now();
      const count = await repos.tx.run(async (tx) => {
        await repos.users.update(user.id, { passwordHash, passwordChangedAt: now, updatedAt: now }, tx);
        const n = await repos.sessions.revokeAllForUser(user.id, now, "password_changed", principal.sessionId, tx);
        await repos.oneTimeTokens.invalidateForUser(user.id, "password_reset", now, tx);
        await d.audit.record(ctxOf(user.id, meta, principal.sessionId), { action: "user.password_changed", entity: "user", entityId: user.id }, tx);
        return n;
      });
      await d.email.send({ to: user.email, kind: "password_changed", subject: "Your PoultryPilot password was changed", text: "Your password was changed and your other devices were signed out. If this was not you, reset your password now." });
      return { otherSessionsSignedOut: count };
    },

    async me(principal: AuthenticatedPrincipal): Promise<MeResponse> {
      const user = await activeUser(principal.userId);
      const memberships = await repos.memberships.findActiveForUser(user.id);
      const farms = await repos.farms.findByIds(memberships.map((m) => m.farmId));
      const nameOf = new Map(farms.map((f) => [f.id, f.name]));
      return {
        user: toUserView(user),
        sessionId: principal.sessionId,
        memberships: memberships
          .filter((m) => nameOf.has(m.farmId))
          .map((m) => ({ membershipId: m.id, farmId: m.farmId, farmName: nameOf.get(m.farmId)!, role: m.role, permissions: permissionsFor(m.role) })),
      };
    },

    async listSessions(principal: AuthenticatedPrincipal): Promise<SessionView[]> {
      const now = clock.now();
      const list = await repos.sessions.listForUser(principal.userId);
      return list
        .filter((x) => !x.revokedAt && x.expiresAt > now)
        .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
        .map((x) => toSessionView(x, principal.sessionId));
    },

    /** Signs out one device. Another user's session id is reported as not found. */
    async revokeSession(principal: AuthenticatedPrincipal, sessionId: string, meta: ClientMeta): Promise<void> {
      const session = await repos.sessions.findById(sessionId);
      if (!session || session.userId !== principal.userId || session.revokedAt) throw notFound("Session");
      await repos.sessions.revoke(session.id, clock.now(), "user_revoked");
      await d.audit.record(ctxOf(principal.userId, meta, principal.sessionId), { action: "session.revoked", entity: "session", entityId: session.id }, {});
    },

    async revokeOtherSessions(principal: AuthenticatedPrincipal, meta: ClientMeta): Promise<{ revoked: number }> {
      const revoked = await repos.sessions.revokeAllForUser(principal.userId, clock.now(), "user_revoked", principal.sessionId);
      await d.audit.record(ctxOf(principal.userId, meta, principal.sessionId), { action: "session.revoked_others", entity: "user", entityId: principal.userId, after: { revoked } }, {});
      return { revoked };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
