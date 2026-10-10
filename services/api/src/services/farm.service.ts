import type { Role, UpdateFarmRequest } from "@poultrypilot/types";
import { AppError, notFound } from "../lib/errors.js";
import { newId, randomToken, sha256, type Clock } from "../lib/util.js";
import type { EmailSender } from "../ports/external.js";
import type { Repositories } from "../ports/repositories.js";
import type { FarmRecord, MembershipRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import type { AuthService } from "./auth.service.js";
import { assertCan, type FarmContext, type RequestContext } from "./context.js";
import { VersionConflict, type SyncService } from "./sync.service.js";
import { toFarmView, toMembershipView } from "./views.js";

const INVITE_TTL_MS = 7 * 86_400_000;

export interface FarmDeps {
  repos: Repositories;
  clock: Clock;
  audit: AuditService;
  sync: SyncService;
  email: EmailSender;
  auth: AuthService;
  appBaseUrl: string;
}

export function createFarmService(d: FarmDeps) {
  const { repos, clock } = d;

  /** Resolves the caller's role on a farm. Non-members get 404, not 403, so farm IDs cannot be probed. */
  async function resolveContext(ctx: RequestContext, farmId: string): Promise<FarmContext> {
    const farm = await repos.farms.findById(farmId);
    const m = farm ? await repos.memberships.findActive(farmId, ctx.userId) : null;
    if (!farm || !m) throw notFound("Farm");
    return { ...ctx, farmId, role: m.role, membershipId: m.id };
  }

  async function guardLastOwner(farmId: string, target: MembershipRecord, nextRole: Role | null) {
    if (target.role === "owner" && target.status === "active" && nextRole !== "owner") {
      if ((await repos.memberships.countActiveOwners(farmId)) <= 1) {
        throw new AppError("LAST_OWNER", "A farm must keep at least one owner. Add another owner first.");
      }
    }
  }

  return {
    resolveContext,

    async listMine(userId: string) {
      const memberships = await repos.memberships.findActiveForUser(userId);
      const farms = await repos.farms.findByIds(memberships.map((m) => m.farmId));
      const roleOf = new Map(memberships.map((m) => [m.farmId, m.role]));
      return farms.map((f) => toFarmView(f, roleOf.get(f.id)));
    },

    async create(ctx: RequestContext, input: { name: string; timezone: string; currency: string; unitSystem: "metric" | "imperial"; countryCode?: string }) {
      const user = await repos.users.findById(ctx.userId);
      if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
      const farm = await repos.tx.run((tx) => d.auth.createFarmWithOwner(user, input, ctx, tx));
      return toFarmView(farm, "owner");
    },

    async get(ctx: FarmContext) {
      assertCan(ctx, "farm.read");
      const farm = await repos.farms.findById(ctx.farmId);
      if (!farm) throw notFound("Farm");
      return toFarmView(farm, ctx.role);
    },

    async update(ctx: FarmContext, input: UpdateFarmRequest) {
      assertCan(ctx, "farm.update_settings");
      return repos.tx.run(async (tx) => {
        const cur = await repos.farms.findById(ctx.farmId, tx);
        if (!cur) throw notFound("Farm");
        if (cur.version !== input.version) throw new VersionConflict(cur.version, toFarmView(cur, ctx.role));
        if (input.currency && input.currency !== cur.settings.currency && (await repos.ledgerProbe.hasEntries(ctx.farmId, tx))) {
          throw new AppError("INVALID_STATE_TRANSITION", "Currency cannot change after money has been recorded");
        }
        const { version, name, description, countryCode, locationLabel, location, ...settingsPatch } = input;
        const patch: Partial<FarmRecord> = {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(countryCode !== undefined ? { countryCode } : {}),
          ...(locationLabel !== undefined ? { locationLabel } : {}),
          ...(location !== undefined ? { location } : {}),
          settings: {
            ...cur.settings,
            ...Object.fromEntries(Object.entries(settingsPatch).filter(([, v]) => v !== undefined)),
          },
          updatedAt: clock.now(),
        };
        const next = await repos.farms.updateVersioned(ctx.farmId, version, patch, tx);
        if (!next) {
          const latest = await repos.farms.findById(ctx.farmId, tx);
          throw new VersionConflict(latest?.version ?? -1, latest ? toFarmView(latest, ctx.role) : null);
        }
        await d.audit.record(ctx, { action: "farm.updated", entity: "farm", entityId: cur.id, before: cur as unknown as Record<string, unknown>, after: next as unknown as Record<string, unknown> }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "farm", entityId: cur.id, op: "upsert", version: next.version, document: toFarmView(next) }, tx);
        return toFarmView(next, ctx.role);
      });
    },

    async listMembers(ctx: FarmContext) {
      assertCan(ctx, "member.read");
      const list = await repos.memberships.findByFarm(ctx.farmId);
      const users = await Promise.all(list.map((m) => (m.userId ? repos.users.findById(m.userId) : Promise.resolve(null))));
      return list.filter((m) => m.status !== "revoked").map((m, i) => toMembershipView(m, users[i]));
    },

    async invite(ctx: FarmContext, emailRaw: string, role: Role) {
      assertCan(ctx, "member.invite");
      const email = emailRaw.toLowerCase();
      const existing = await repos.memberships.findByFarmAndEmail(ctx.farmId, email);
      if (existing?.status === "active") throw new AppError("ALREADY_MEMBER", "This person is already a member of the farm");
      const token = randomToken();
      const now = clock.now();
      const farm = await repos.farms.findById(ctx.farmId);
      const rec = await repos.tx.run(async (tx) => {
        let m: MembershipRecord;
        if (existing) {
          m = (await repos.memberships.update(ctx.farmId, existing.id, { role, inviteTokenHash: sha256(token), inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS), invitedBy: ctx.userId, updatedAt: now }, tx))!;
        } else {
          m = {
            id: newId(),
            farmId: ctx.farmId,
            email,
            role,
            status: "invited",
            inviteTokenHash: sha256(token),
            inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS),
            invitedBy: ctx.userId,
            createdAt: now,
            updatedAt: now,
            version: 0,
          };
          await repos.memberships.create(m, tx);
        }
        await d.audit.record(ctx, { action: "member.invited", entity: "membership", entityId: m.id, after: { email, role } }, tx);
        return m;
      });
      await d.email.send({
        to: email,
        kind: "farm_invite",
        subject: `You're invited to ${farm?.name ?? "a farm"} on PoultryPilot`,
        text: `You have been invited as ${role}. Accept within 7 days: ${d.appBaseUrl}/invite?token=${token}`,
        token,
      });
      return toMembershipView(rec);
    },

    async acceptInvite(ctx: RequestContext, token: string) {
      const m = await repos.memberships.findByInviteHash(sha256(token));
      const user = await repos.users.findById(ctx.userId);
      const now = clock.now();
      if (!m || !user || m.status !== "invited" || !m.inviteExpiresAt || m.inviteExpiresAt <= now) {
        throw new AppError("INVITE_INVALID", "This invitation is invalid or has expired");
      }
      if (m.email !== user.email) throw new AppError("INVITE_INVALID", "This invitation was sent to a different email address");
      return repos.tx.run(async (tx) => {
        const next = await repos.memberships.update(m.farmId, m.id, { status: "active", userId: user.id, inviteTokenHash: undefined, inviteExpiresAt: undefined, updatedAt: now }, tx);
        await d.audit.record({ ...ctx }, { farmId: m.farmId, action: "member.joined", entity: "membership", entityId: m.id, after: { role: m.role } }, tx);
        return toMembershipView(next!, user);
      });
    },

    async changeRole(ctx: FarmContext, membershipId: string, role: Role) {
      assertCan(ctx, "member.change_role");
      return repos.tx.run(async (tx) => {
        const m = await repos.memberships.findById(ctx.farmId, membershipId, tx);
        if (!m || m.status === "revoked") throw notFound("Member");
        await guardLastOwner(ctx.farmId, m, role);
        const next = await repos.memberships.update(ctx.farmId, m.id, { role, updatedAt: clock.now() }, tx);
        await d.audit.record(ctx, { action: "member.role_changed", entity: "membership", entityId: m.id, before: { role: m.role }, after: { role } }, tx);
        return toMembershipView(next!);
      });
    },

    async removeMember(ctx: FarmContext, membershipId: string) {
      assertCan(ctx, "member.remove");
      await repos.tx.run(async (tx) => {
        const m = await repos.memberships.findById(ctx.farmId, membershipId, tx);
        if (!m || m.status === "revoked") throw notFound("Member");
        await guardLastOwner(ctx.farmId, m, null);
        await repos.memberships.update(ctx.farmId, m.id, { status: "revoked", updatedAt: clock.now() }, tx);
        await d.audit.record(ctx, { action: "member.removed", entity: "membership", entityId: m.id, before: { role: m.role, email: m.email } }, tx);
      });
    },
  };
}

export type FarmService = ReturnType<typeof createFarmService>;
