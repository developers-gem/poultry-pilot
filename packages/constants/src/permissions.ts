import type { Role } from "./enums.js";

/**
 * Named actions checked by API middleware AND inside services.
 * Clients use the same map only to hide controls; the server is authoritative.
 */
export const ACTIONS = [
  // farm administration
  "farm.read",
  "farm.update_settings",
  "farm.delete",
  "member.read",
  "member.invite",
  "member.change_role",
  "member.remove",
  "audit.read",
  // production
  "production.read",
  "production.record", // create daily records, mortality, eggs, feed issue, weigh-ins
  "production.edit_own_recent", // edit own entries for today and yesterday (farm-local)
  "production.edit_any",
  "production.delete",
  "flock.manage", // create/place/transfer/close flocks, houses
  "flock.sell",
  // health
  "health.read",
  "health.record_observation",
  "health.manage", // vet visits, treatments, medicines, programmes
  "health.vaccinate", // record vaccinations given
  // biosecurity
  "biosecurity.read",
  "biosecurity.record",
  "biosecurity.manage",
  // money & market
  "money.read",
  "money.record",
  "money.delete",
  "market.read",
  "market.manage",
  "payment.record",
  // inventory (feed, medicine, supplies)
  "inventory.read",
  "inventory.issue", // record use and wastage
  "inventory.manage", // catalog, purchases, stock counts
  "alert.manage", // acknowledge alerts, run checks
  // content
  "content.read",
] as const;

export type Action = (typeof ACTIONS)[number];

const ALL: readonly Action[] = ACTIONS;
const except = (...remove: Action[]) => new Set(ALL.filter((a) => !remove.includes(a)));

const WORKER: Action[] = [
  "farm.read",
  "inventory.read",
  "inventory.issue",
  "production.read",
  "production.record",
  "production.edit_own_recent",
  "health.read",
  "health.record_observation",
  "biosecurity.read",
  "biosecurity.record",
  "content.read",
];

/**
 * What each role may do. Member-management actions are further limited by ROLE_RANK:
 * nobody can add, change or remove someone at or above their own rank (owners excepted).
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  owner: new Set(ALL),
  admin: except("farm.delete"),
  farm_manager: new Set<Action>([
    "farm.read",
    "member.read",
    "member.invite",
    "member.change_role",
    "member.remove",
    "audit.read",
    "production.read",
    "production.record",
    "production.edit_own_recent",
    "production.edit_any",
    "production.delete",
    "flock.manage",
    "flock.sell",
    "health.read",
    "health.record_observation",
    "health.manage",
    "health.vaccinate",
    "biosecurity.read",
    "biosecurity.record",
    "biosecurity.manage",
    "money.read",
    "money.record",
    "market.read",
    "market.manage",
    "payment.record",
    "inventory.read",
    "inventory.issue",
    "inventory.manage",
    "alert.manage",
    "content.read",
  ]),
  supervisor: new Set<Action>([...WORKER, "member.read", "production.edit_any", "biosecurity.manage", "alert.manage", "health.vaccinate"]),
  worker: new Set<Action>(WORKER),
  accountant: new Set<Action>([
    "farm.read",
    "production.read",
    "money.read",
    "money.record",
    "money.delete",
    "market.read",
    "payment.record",
    "inventory.read",
    "inventory.manage",
    "content.read",
  ]),
  vet: new Set<Action>([
    "farm.read",
    "production.read",
    "health.read",
    "health.record_observation",
    "health.manage",
    "health.vaccinate",
    "biosecurity.read",
    "inventory.read",
    "inventory.issue",
    "content.read",
  ]),
};

export function can(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}

export function permissionsFor(role: Role): Action[] {
  return ACTIONS.filter((a) => ROLE_PERMISSIONS[role].has(a));
}

/** Authority for member management. Specialist roles (accountant, vet) sit between supervisor and worker. */
export const ROLE_RANK: Record<Role, number> = {
  owner: 100,
  admin: 80,
  farm_manager: 60,
  supervisor: 40,
  accountant: 30,
  vet: 30,
  worker: 20,
};

/**
 * Can `actor` give someone the role `role`, or act on a member who currently holds `role`?
 * Owners can manage anyone, including other owners. Everyone else only manages strictly lower ranks,
 * so a farm manager cannot create an admin, and an admin cannot remove an owner.
 */
export function canManageRole(actor: Role, role: Role): boolean {
  return actor === "owner" || ROLE_RANK[actor] > ROLE_RANK[role];
}

/** Roles `actor` may assign, highest first. Clients use this to fill the role picker. */
export function assignableRoles(actor: Role): Role[] {
  return (Object.keys(ROLE_RANK) as Role[]).filter((r) => canManageRole(actor, r));
}
