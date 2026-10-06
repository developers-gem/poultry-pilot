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
});
export type FarmSettings = z.infer<typeof FarmSettings>;

export const CreateFarmRequest = z.object({
  name: NonEmptyText(120),
  timezone: IanaTimezone,
  currency: CurrencyCode,
  unitSystem: UnitSystem.default("metric"),
  countryCode: CountryCode.optional(),
});

export const UpdateFarmRequest = z
  .object({
    name: NonEmptyText(120).optional(),
    description: OptionalText(2000),
    countryCode: CountryCode.optional(),
    locationLabel: OptionalText(200),
    location: GeoPoint.optional(),
    timezone: IanaTimezone.optional(),
    unitSystem: UnitSystem.optional(),
    fcrIncludesMortalityWeight: z.boolean().optional(),
    workerEditWindowDays: z.number().int().min(0).max(7).optional(),
    /** Currency changes are allowed only while the farm has no ledger entries (enforced server-side). */
    currency: CurrencyCode.optional(),
    version: z.number().int().nonnegative(),
  })
  .strict();
export type UpdateFarmRequest = z.infer<typeof UpdateFarmRequest>;

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
export type FarmView = z.infer<typeof FarmView>;

export const InviteMemberRequest = z.object({
  email: Email,
  role: Role,
});
export type InviteMemberRequest = z.infer<typeof InviteMemberRequest>;

export const AcceptInviteRequest = z.object({ token: z.string().min(20).max(500) });

export const ChangeRoleRequest = z.object({ role: Role });

export const MembershipView = z.object({
  id: z.string(),
  farmId: z.string(),
  userId: z.string().optional(),
  email: z.string(),
  fullName: z.string().optional(),
  role: Role,
  status: MembershipStatus,
  createdAt: z.string(),
});
export type MembershipView = z.infer<typeof MembershipView>;
