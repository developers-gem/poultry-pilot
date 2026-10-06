import { permissionsFor, type FarmView, type MembershipView, type Role, type UserView } from "@poultrypilot/contracts";
import type { FarmRecord, MembershipRecord, UserRecord } from "../ports/records.js";

/** Mapping from records to API shapes. Secrets (hashes, tokens) never leave this boundary. */

export const toUserView = (u: UserRecord): UserView => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  emailVerified: u.emailVerified,
  createdAt: u.createdAt.toISOString(),
});

export const toFarmView = (f: FarmRecord, role?: Role): FarmView => ({
  id: f.id,
  name: f.name,
  ...(f.description ? { description: f.description } : {}),
  ...(f.countryCode ? { countryCode: f.countryCode } : {}),
  ...(f.locationLabel ? { locationLabel: f.locationLabel } : {}),
  ...(f.location ? { location: f.location } : {}),
  settings: f.settings,
  version: f.version,
  createdAt: f.createdAt.toISOString(),
  updatedAt: f.updatedAt.toISOString(),
  ...(role ? { myRole: role, myPermissions: permissionsFor(role) } : {}),
});

export const toMembershipView = (m: MembershipRecord, user?: UserRecord | null): MembershipView => ({
  id: m.id,
  farmId: m.farmId,
  ...(m.userId ? { userId: m.userId } : {}),
  email: m.email,
  ...(user?.fullName ? { fullName: user.fullName } : {}),
  role: m.role,
  status: m.status,
  createdAt: m.createdAt.toISOString(),
});
