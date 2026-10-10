import { can, canManageRole, type Action, type Role } from "@poultrypilot/constants";
import { AppError, forbidden } from "../lib/errors.js";

export interface RequestContext {
  userId: string;
  sessionId?: string;
  requestId?: string;
  deviceId?: string;
  mutationId?: string;
}

/** A request that has passed authenticate + requireFarm: the user is an active member of farmId. */
export interface FarmContext extends RequestContext {
  farmId: string;
  role: Role;
  membershipId: string;
}

/** Services re-check permissions even when middleware already did: defence in depth. */
export function assertCan(ctx: FarmContext, action: Action): void {
  if (!can(ctx.role, action)) throw forbidden(`Your role (${ctx.role}) cannot perform ${action}`);
}

/** Member management is limited by rank: you can only act on, or assign, roles below your own (owners excepted). */
export function assertCanManage(ctx: FarmContext, role: Role, what: "assign" | "manage"): void {
  if (!canManageRole(ctx.role, role)) {
    throw new AppError(
      "ROLE_HIERARCHY",
      what === "assign"
        ? `Your role (${ctx.role}) cannot give someone the ${role} role`
        : `Your role (${ctx.role}) cannot change or remove a member with the ${role} role`,
      { yourRole: ctx.role, targetRole: role },
    );
  }
}
