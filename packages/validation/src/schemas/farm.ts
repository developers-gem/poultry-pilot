import { z } from "zod";
import { CountryCode, CurrencyCode, Email, GeoPoint, IanaTimezone, NonEmptyText, OptionalText } from "../primitives.js";
import { MembershipStatus, Role, UnitSystem } from "../enums.js";

export const FarmSettings = z.object({
  timezone: IanaTimezone,
  currency: CurrencyCode,
  unitSystem: UnitSystem,
  /** Whether FCR divides by weight of dead birds too. Integrators differ; the UI labels it. */
  fcrIncludesMortalityWeight: z.boolean().default(false),
  /** Workers may edit their own production entries for this many farm-local days (0 = today only). */
  workerEditWindowDays: z.number().int().min(0).max(7).default(1),
  /** The farm's own rule: hours between a visitor's last poultry contact and entry. Omit to not check. */
  visitorDowntimeHours: z.number().nonnegative().max(10_000).optional(),
});

export const CreateFarmRequest = z.object({
  name: NonEmptyText(120),
  timezone: IanaTimezone,
  currency: CurrencyCode,
  unitSystem: UnitSystem.default("metric"),
  countryCode: CountryCode.optional(),
});

/**
 * PUT /farms/:farmId replaces the farm's editable fields. Optional fields left out are cleared.
 * `version` must match the stored version (optimistic concurrency); a mismatch returns 409.
 */
export const ReplaceFarmRequest = z
  .object({
    name: NonEmptyText(120),
    description: OptionalText(2000),
    countryCode: CountryCode.optional(),
    locationLabel: OptionalText(200),
    location: GeoPoint.optional(),
    timezone: IanaTimezone,
    /** Currency changes are allowed only while the farm has no ledger entries (enforced server-side). */
    currency: CurrencyCode,
    unitSystem: UnitSystem,
    fcrIncludesMortalityWeight: z.boolean(),
    workerEditWindowDays: z.number().int().min(0).max(7),
    visitorDowntimeHours: z.number().nonnegative().max(10_000).optional(),
    version: z.number().int().nonnegative(),
  })
  .strict();

export const FarmView = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  countryCode: z.string().optional(),
  locationLabel: z.string().optional(),
  location: GeoPoint.optional(),
  settings: FarmSettings,
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  myRole: Role.optional(),
  myPermissions: z.array(z.string()).optional(),
});

/** Adds a member by email. They join when they accept the emailed invitation. */
export const AddMemberRequest = z.object({ email: Email, role: Role }).strict();

export const AcceptInviteRequest = z.object({ token: z.string().min(20).max(500) });

export const UpdateMemberRequest = z.object({ role: Role }).strict();

export const MembershipView = z.object({
  id: z.string(),
  farmId: z.string(),
  userId: z.string().optional(),
  email: z.string(),
  fullName: z.string().optional(),
  role: Role,
  status: MembershipStatus,
  invitedAt: z.string().optional(),
  joinedAt: z.string().optional(),
  createdAt: z.string(),
});
