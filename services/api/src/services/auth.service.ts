import type { RegisterRequest, TokenPair } from "@poultrypilot/types";
import { AppError } from "../lib/errors.js";
import { newId, randomToken, sha256, type Clock } from "../lib/util.js";
import type { EmailSender, GoogleTokenVerifier, PasswordHasher } from "../ports/external.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { FarmRecord, MembershipRecord, UserRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import type { RequestContext } from "./context.js";
import type { SyncService } from "./sync.service.js";
import type { AccessTokens } from "./tokens.js";
import { toFarmView, toUserView } from "./views.js";

export interface AuthDeps {
  repos: Repositories;
  clock: Clock;
  hasher: PasswordHasher;
  accessTokens: AccessTokens;
  audit: AuditService;
  sync: SyncService;
  email: EmailSender;
  google?: GoogleTokenVerifier;
  refreshTtlDays: number;
  appBaseUrl: string;
}

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
  requestId?: string;
}

const RESET_TTL_MS = 60 * 60 * 1000;

export function createAuthService(d: AuthDeps) {
  const { repos, clock } = d;
  // Verifying against a fixed hash when the user does not exist keeps login timing uniform.
  let dummyHash: Promise<string> | undefined;
  const getDummy = () => (dummyHash ??= d.hasher.hash(randomToken()));

  async function issueTokens(userId: string, meta: ClientMeta, familyId = newId(), tx?: Tx): Promise<TokenPair> {
    const now = clock.now();
    const access = await d.accessTokens.sign(userId, now);
    const secret = randomToken(32);
    const expiresAt = new Date(now.getTime() + d.refreshTtlDays * 86_400_000);
    await repos.refreshTokens.create(
      {
        id: newId(),
        userId,
        familyId,
        tokenHash: sha256(secret),
        expiresAt,
        createdAt: now,
        ...(meta.userAgent ? { userAgent: meta.userAgent.slice(0, 300) } : {}),
        ...(meta.ip ? { ip: meta.ip } : {}),
      },
      tx,
    );
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: secret,
      refreshTokenExpiresAt: expiresAt.toISOString(),
    };
  }

  async function createFarmWithOwner(user: UserRecord, farm: RegisterRequest["farm"], ctx: RequestContext, tx: Tx) {
    const now = clock.now();
    const farmRec: FarmRecord = {
      id: newId(),
      name: farm.name,
      ...(farm.countryCode ? { countryCode: farm.countryCode } : {}),
      settings: {
        timezone: farm.timezone,
        currency: farm.currency,
        unitSystem: farm.unitSystem,
        fcrIncludesMortalityWeight: false,
        workerEditWindowDays: 1,
      },
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

  return {
    issueTokens,
    createFarmWithOwner,

    async register(input: RegisterRequest, meta: ClientMeta) {
      const email = input.email.toLowerCase();
      if (await repos.users.findByEmail(email)) throw new AppError("EMAIL_TAKEN", "An account with this email already exists");
      const passwordHash = await d.hasher.hash(input.password);
      return repos.tx.run(async (tx) => {
        const now = clock.now();
        const user: UserRecord = {
          id: newId(),
          email,
          fullName: input.fullName,
          passwordHash,
          emailVerified: false,
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
        const ctx: RequestContext = { userId: user.id, ...(meta.requestId ? { requestId: meta.requestId } : {}) };
        await d.audit.record(ctx, { action: "user.registered", entity: "user", entityId: user.id }, tx);
        const farm = await createFarmWithOwner(user, input.farm, ctx, tx);
        const tokens = await issueTokens(user.id, meta, undefined, tx);
        return { user: toUserView(user), farm: toFarmView(farm, "owner"), tokens };
      });
    },

    async login(emailRaw: string, password: string, meta: ClientMeta) {
      const user = await repos.users.findByEmail(emailRaw.toLowerCase());
      const ok = user?.passwordHash
        ? await d.hasher.verify(user.passwordHash, password)
        : (await d.hasher.verify(await getDummy(), password), false);
      if (!user || !ok) throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect");
      return { user: toUserView(user), tokens: await issueTokens(user.id, meta) };
    },

    async loginWithGoogle(idToken: string, meta: ClientMeta) {
      if (!d.google) throw new AppError("NOT_IMPLEMENTED", "Google sign-in is not configured");
      const g = await d.google.verify(idToken).catch(() => {
        throw new AppError("INVALID_CREDENTIALS", "Google sign-in could not be verified");
      });
      let user = await repos.users.findByGoogleSub(g.sub);
      if (!user && g.emailVerified) {
        const byEmail = await repos.users.findByEmail(g.email.toLowerCase());
        if (byEmail) user = await repos.users.update(byEmail.id, { googleSub: g.sub, emailVerified: true, updatedAt: clock.now() });
      }
      let created = false;
      if (!user) {
        if (!g.emailVerified) throw new AppError("INVALID_CREDENTIALS", "Google account email is not verified");
        const now = clock.now();
        user = {
          id: newId(),
          email: g.email.toLowerCase(),
          fullName: g.name ?? g.email.split("@")[0]!,
          googleSub: g.sub,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.users.create(user);
        created = true;
      }
      const farms = await repos.memberships.findActiveForUser(user.id);
      return { user: toUserView(user), tokens: await issueTokens(user.id, meta), created, needsFarm: farms.length === 0 };
    },

    /**
     * Refresh-token rotation with reuse detection: presenting a token that was already rotated
     * means it was copied, so the whole family (every device session descended from that login) is revoked.
     */
    async refresh(secret: string, meta: ClientMeta): Promise<TokenPair> {
      const rec = await repos.refreshTokens.findByHash(sha256(secret));
      if (!rec) throw new AppError("UNAUTHENTICATED", "Refresh token not recognised");
      const now = clock.now();
      if (rec.revokedAt || rec.replacedById) {
        await repos.refreshTokens.revokeFamily(rec.familyId, now);
        throw new AppError("TOKEN_REUSED", "This session was signed out for security. Please sign in again.");
      }
      if (rec.expiresAt <= now) throw new AppError("TOKEN_EXPIRED", "Session expired. Please sign in again.");
      return repos.tx.run(async (tx) => {
        const pair = await issueTokens(rec.userId, meta, rec.familyId, tx);
        const next = await repos.refreshTokens.findByHash(sha256(pair.refreshToken), tx);
        await repos.refreshTokens.update(rec.id, { replacedById: next!.id }, tx);
        return pair;
      });
    },

    async logout(secret: string): Promise<void> {
      const rec = await repos.refreshTokens.findByHash(sha256(secret));
      if (rec) await repos.refreshTokens.revokeFamily(rec.familyId, clock.now());
    },

    async me(userId: string) {
      const user = await repos.users.findById(userId);
      if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
      return toUserView(user);
    },

    /** Always succeeds from the caller's point of view, so it cannot be used to discover accounts. */
    async requestPasswordReset(emailRaw: string): Promise<void> {
      const user = await repos.users.findByEmail(emailRaw.toLowerCase());
      if (!user) return;
      const token = randomToken();
      const now = clock.now();
      await repos.passwordResets.create({
        id: newId(),
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(now.getTime() + RESET_TTL_MS),
        createdAt: now,
      });
      await d.email.send({
        to: user.email,
        kind: "password_reset",
        subject: "Reset your PoultryPilot password",
        text: `Use this link within 1 hour to choose a new password: ${d.appBaseUrl}/reset-password?token=${token}`,
        token,
      });
    },

    async confirmPasswordReset(token: string, newPassword: string, meta: ClientMeta): Promise<void> {
      const rec = await repos.passwordResets.findByHash(sha256(token));
      const now = clock.now();
      if (!rec || rec.usedAt || rec.expiresAt <= now) throw new AppError("INVITE_INVALID", "This reset link is invalid or has expired");
      const passwordHash = await d.hasher.hash(newPassword);
      await repos.tx.run(async (tx) => {
        await repos.users.update(rec.userId, { passwordHash, updatedAt: now }, tx);
        await repos.passwordResets.markUsed(rec.id, now, tx);
        await repos.refreshTokens.revokeAllForUser(rec.userId, now, tx);
        await d.audit.record({ userId: rec.userId, ...(meta.requestId ? { requestId: meta.requestId } : {}) }, { action: "user.password_reset", entity: "user", entityId: rec.userId }, tx);
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
