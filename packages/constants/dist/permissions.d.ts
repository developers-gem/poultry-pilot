import type { Role } from "./enums.js";
/**
 * Named actions checked by API middleware AND inside services.
 * Clients use the same map only to hide controls; the server is authoritative.
 */
export declare const ACTIONS: readonly ["farm.read", "farm.update_settings", "farm.delete", "member.read", "member.invite", "member.change_role", "member.remove", "audit.read", "production.read", "production.record", "production.edit_own_recent", "production.edit_any", "production.delete", "flock.manage", "flock.sell", "health.read", "health.record_observation", "health.manage", "health.vaccinate", "biosecurity.read", "biosecurity.record", "biosecurity.manage", "money.read", "money.record", "money.delete", "market.read", "market.manage", "payment.record", "hatchery.read", "hatchery.record", "hatchery.manage", "inventory.read", "inventory.issue", "inventory.manage", "alert.manage", "task.read", "task.complete", "task.manage", "content.read"];
export type Action = (typeof ACTIONS)[number];
/**
 * What each role may do. Member-management actions are further limited by ROLE_RANK:
 * nobody can add, change or remove someone at or above their own rank (owners excepted).
 */
export declare const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Action>>;
export declare function can(role: Role, action: Action): boolean;
export declare function permissionsFor(role: Role): Action[];
/** Authority for member management. Specialist roles (accountant, vet) sit between supervisor and worker. */
export declare const ROLE_RANK: Record<Role, number>;
/**
 * Can `actor` give someone the role `role`, or act on a member who currently holds `role`?
 * Owners can manage anyone, including other owners. Everyone else only manages strictly lower ranks,
 * so a farm manager cannot create an admin, and an admin cannot remove an owner.
 */
export declare function canManageRole(actor: Role, role: Role): boolean;
/** Roles `actor` may assign, highest first. Clients use this to fill the role picker. */
export declare function assignableRoles(actor: Role): Role[];
