import { can, type Action, type Role } from "@poultrypilot/constants";
import { forbidden } from "../lib/errors.js";

export interface RequestContext {
  userId: string;
  requestId?: string;
  deviceId?: string;
  mutationId?: string;
}

export interface FarmContext extends RequestContext {
  farmId: string;
  role: Role;
  membershipId: string;
}

/** Services re-check permissions even when middleware already did: defence in depth. */
export function assertCan(ctx: FarmContext, action: Action): void {
  if (!can(ctx.role, action)) throw forbidden(`Your role (${ctx.role}) cannot perform ${action}`);
}
