import type { Role } from "@poultrypilot/constants";
import type { MembershipView, ReplaceFarmRequest } from "@poultrypilot/types";
import { AppError, forbidden, notFound } from "../lib/errors.js";
import { newId, randomToken, sha256, type Clock } from "../lib/util.js";
import type { EmailSender } from "../ports/external.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { FarmRecord, MembershipRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import type { AuthService } from "./auth.service.js";
import { assertCan, assertCanManage, type FarmContext, type RequestContext } from "./context.js";
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

  /**
   * Tenancy gate used by requireFarm. Returns the caller's role on the farm.
   * A non-member, a removed member and someone with only a pending invitation all get 404 —
   * the same answer as for a farm that does not exist — so farm ids cannot be probed.
   */
  async function resolveContext(ctx: RequestContext, farmId: string): Promise<FarmContext> {
    const farm = await repos.farms.findById(farmId);
    const m = farm ? await repos.memberships.findActive(farmId, ctx.userId) : null;
    if (!farm || !m) throw notFound("Farm");
    return { ...ctx, farmId, role: m.role, membershipId: m.id };
  }

  /** Resource loader for :memberId. Looks up ONLY within the caller's farm, so another farm's id is 404. */
  async function findMember(farmId: string, memberId: string): Promise<MembershipRecord | null> {
    const m = await repos.memberships.findById(farmId, memberId);
    return m && m.status !== "revoked" ? m : null;
  }

  async function guardLastOwner(farmId: string, target: MembershipRecord, nextRole: Role | null, tx: Tx) {
    if (target.role === "owner" && target.status === "active" && nextRole !== "owner") {
      if ((await repos.memberships.countActiveOwners(farmId, tx)) <= 1) {
        throw new AppError("LAST_OWNER", "A farm must keep at least one owner. Make someone else an owner first.");
      }
    }
  }

  async function memberChanged(ctx: FarmContext | RequestContext & { farmId: string }, m: MembershipRecord, tx: Tx) {
    await d.sync.recordChange(m.farmId, { entity: "membership", entityId: m.id, op: m.status === "revoked" ? "delete" : "upsert", version: m.version, document: toMembershipView(m) }, tx);
  }

  async function sendInvite(m: MembershipRecord, token: string, farmName: string) {
    await d.email.send({
      to: m.email,
      kind: "farm_invite",
      subject: `You're invited to ${farmName} on PoultryPilot`,
      text: `You have been invited to ${farmName} as ${m.role.replace("_", " ")}. Accept within 7 days: ${d.appBaseUrl}/invite?token=${token}`,
      token,
    });
  }

  return {
    resolveContext,
    findMember,

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

    /** PUT semantics: the body is the complete editable state. Optional fields left out are cleared. */
    async replace(ctx: FarmContext, input: ReplaceFarmRequest) {
      assertCan(ctx, "farm.update_settings");
      return repos.tx.run(async (tx) => {
        const cur = await repos.farms.findById(ctx.farmId, tx);
        if (!cur) throw notFound("Farm");
        if (cur.version !== input.version) throw new VersionConflict(cur.version, toFarmView(cur, ctx.role));
        if (input.currency !== cur.settings.currency && (await repos.ledgerProbe.hasEntries(ctx.farmId, tx))) {
          throw new AppError("INVALID_STATE_TRANSITION", "Currency cannot change after money has been recorded");
        }
        const patch: Partial<FarmRecord> = {
          name: input.name,
          description: input.description,
          countryCode: input.countryCode,
          locationLabel: input.locationLabel,
          location: input.location,
          settings: {
            timezone: input.timezone,
            currency: input.currency,
            unitSystem: input.unitSystem,
            fcrIncludesMortalityWeight: input.fcrIncludesMortalityWeight,
            workerEditWindowDays: input.workerEditWindowDays,
            ...(input.visitorDowntimeHours !== undefined ? { visitorDowntimeHours: input.visitorDowntimeHours } : {}),
          },
          updatedAt: clock.now(),
        };
        const next = await repos.farms.updateVersioned(ctx.farmId, input.version, patch, tx);
        if (!next) {
          const latest = await repos.farms.findById(ctx.farmId, tx);
          throw new VersionConflict(latest?.version ?? -1, latest ? toFarmView(latest, ctx.role) : null);
        }
        await d.audit.record(ctx, { action: "farm.updated", entity: "farm", entityId: cur.id, before: cur as unknown as Record<string, unknown>, after: next as unknown as Record<string, unknown> }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "farm", entityId: cur.id, op: "upsert", version: next.version, document: toFarmView(next) }, tx);
        return toFarmView(next, ctx.role);
      });
    },

    async listMembers(ctx: FarmContext): Promise<MembershipView[]> {
      assertCan(ctx, "member.read");
      const list = (await repos.memberships.findByFarm(ctx.farmId)).filter((m) => m.status !== "revoked");
      const users = await Promise.all(list.map((m) => (m.userId ? repos.users.findById(m.userId) : Promise.resolve(null))));
      return list.map((m, i) => toMembershipView(m, users[i]));
    },

    /**
     * Adds a member by email and sends an invitation; they join when they accept.
     * Requires member.invite, a verified email on the inviter (stops invitation spam from throwaway
     * accounts), and a role strictly below the inviter's own (owners may invite owners).
     */
    async addMember(ctx: FarmContext, emailRaw: string, role: Role): Promise<MembershipView> {
      assertCan(ctx, "member.invite");
      assertCanManage(ctx, role, "assign");
      const inviter = await repos.users.findById(ctx.userId);
      if (!inviter?.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED", "Confirm your email address before inviting people to the farm");
      const email = emailRaw.toLowerCase();
      const existing = await repos.memberships.findByFarmAndEmail(ctx.farmId, email);
      if (existing?.status === "active") throw new AppError("ALREADY_MEMBER", "This person is already a member of the farm");
      if (existing) assertCanManage(ctx, existing.role, "manage");
      const token = randomToken();
      const now = clock.now();
      const farm = await repos.farms.findById(ctx.farmId);
      const rec = await repos.tx.run(async (tx) => {
        const invite = { role, inviteTokenHash: sha256(token), inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS), invitedBy: ctx.userId, invitedAt: now, updatedAt: now };
        let m: MembershipRecord;
        if (existing) {
          m = (await repos.memberships.update(ctx.farmId, existing.id, invite, tx))!;
        } else {
          m = { id: newId(), farmId: ctx.farmId, email, status: "invited", createdBy: ctx.userId, createdAt: now, version: 0, ...invite };
          await repos.memberships.create(m, tx);
        }
        await d.audit.record(ctx, { action: "member.invited", entity: "membership", entityId: m.id, after: { email, role } }, tx);
        await memberChanged(ctx, m, tx);
        return m;
      });
      await sendInvite(rec, token, farm?.name ?? "a farm");
      return toMembershipView(rec);
    },

    /** Accepting proves the invitee controls the email address, so it also marks the email verified. */
    async acceptInvite(ctx: RequestContext, token: string): Promise<MembershipView> {
      const m = await repos.memberships.findByInviteHash(sha256(token));
      const user = await repos.users.findById(ctx.userId);
      const now = clock.now();
      if (!m || !user || m.status !== "invited" || !m.inviteExpiresAt || m.inviteExpiresAt <= now) {
        throw new AppError("INVITE_INVALID", "This invitation is invalid or has expired. Ask the farm to send a new one.");
      }
      if (m.email !== user.email) throw new AppError("INVITE_INVALID", "This invitation was sent to a different email address");
      return repos.tx.run(async (tx) => {
        const next = await repos.memberships.update(m.farmId, m.id, { status: "active", userId: user.id, joinedAt: now, inviteTokenHash: undefined, inviteExpiresAt: undefined, updatedAt: now }, tx);
        if (!user.emailVerified) await repos.users.update(user.id, { emailVerified: true, emailVerifiedAt: now, updatedAt: now }, tx);
        await d.audit.record(ctx, { farmId: m.farmId, action: "member.joined", entity: "membership", entityId: m.id, after: { role: m.role } }, tx);
        await memberChanged({ ...ctx, farmId: m.farmId }, next!, tx);
        return toMembershipView(next!, user);
      });
    },

    /** Changes a member's role. You cannot change your own role, act on someone at or above your rank, or assign a rank at or above yours. */
    async updateMember(ctx: FarmContext, target: MembershipRecord, role: Role): Promise<MembershipView> {
      assertCan(ctx, "member.change_role");
      if (target.id === ctx.membershipId) throw forbidden("You cannot change your own role. Ask another owner or admin.");
      assertCanManage(ctx, target.role, "manage");
      assertCanManage(ctx, role, "assign");
      return repos.tx.run(async (tx) => {
        const cur = await findMember(ctx.farmId, target.id);
        if (!cur) throw notFound("Member");
        await guardLastOwner(ctx.farmId, cur, role, tx);
        const next = await repos.memberships.update(ctx.farmId, cur.id, { role, updatedBy: ctx.userId, updatedAt: clock.now() }, tx);
        await d.audit.record(ctx, { action: "member.role_changed", entity: "membership", entityId: cur.id, before: { role: cur.role }, after: { role } }, tx);
        await memberChanged(ctx, next!, tx);
        return toMembershipView(next!);
      });
    },

    /**
     * Removes a member or cancels an invitation. Anyone may remove themselves (leave the farm), except the
     * last owner. Removing someone else needs member.remove and a higher rank than theirs.
     */
    async removeMember(ctx: FarmContext, target: MembershipRecord): Promise<void> {
      const leaving = target.id === ctx.membershipId;
      if (!leaving) {
        assertCan(ctx, "member.remove");
        assertCanManage(ctx, target.role, "manage");
      }
      await repos.tx.run(async (tx) => {
        const cur = await findMember(ctx.farmId, target.id);
        if (!cur) throw notFound("Member");
        await guardLastOwner(ctx.farmId, cur, null, tx);
        const now = clock.now();
        const next = await repos.memberships.update(ctx.farmId, cur.id, { status: "revoked", removedAt: now, removedBy: ctx.userId, inviteTokenHash: undefined, inviteExpiresAt: undefined, updatedAt: now }, tx);
        await d.audit.record(ctx, { action: leaving ? "member.left" : cur.status === "invited" ? "member.invite_cancelled" : "member.removed", entity: "membership", entityId: cur.id, before: { role: cur.role, email: cur.email } }, tx);
        await memberChanged(ctx, next!, tx);
      });
    },
  };
}

export type FarmService = ReturnType<typeof createFarmService>;
