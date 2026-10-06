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
  "health.manage", // vaccinations, treatments, reminders
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
  // content
  "content.read",
] as const;

export type Action = (typeof ACTIONS)[number];

const ALL: readonly Action[] = ACTIONS;

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  owner: new Set(ALL),
  manager: new Set<Action>([
    "farm.read",
    "member.read",
    "audit.read",
    "production.read",
    "production.record",
    "production.edit_own_recent",
    "production.edit_any",
    "flock.manage",
    "flock.sell",
    "health.read",
    "health.record_observation",
    "health.manage",
    "biosecurity.read",
    "biosecurity.record",
    "biosecurity.manage",
    "money.read",
    "money.record",
    "market.read",
    "market.manage",
    "payment.record",
    "content.read",
  ]),
  worker: new Set<Action>([
    "farm.read",
    "production.read",
    "production.record",
    "production.edit_own_recent",
    "health.read",
    "health.record_observation",
    "biosecurity.read",
    "biosecurity.record",
    "content.read",
  ]),
  veterinarian: new Set<Action>([
    "farm.read",
    "production.read",
    "health.read",
    "health.record_observation",
    "health.manage",
    "biosecurity.read",
    "content.read",
  ]),
  accountant: new Set<Action>([
    "farm.read",
    "production.read",
    "money.read",
    "money.record",
    "money.delete",
    "market.read",
    "payment.record",
    "content.read",
  ]),
};

export function can(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}

export function permissionsFor(role: Role): Action[] {
  return ACTIONS.filter((a) => ROLE_PERMISSIONS[role].has(a));
}
