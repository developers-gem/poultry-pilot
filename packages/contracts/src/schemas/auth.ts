import { z } from "zod";
import { CountryCode, CurrencyCode, Email, IanaTimezone, NonEmptyText, Password } from "../primitives.js";
import { UnitSystem } from "../enums.js";

/** Sign-up creates the user, their first farm and an owner membership in one transaction. */
export const RegisterRequest = z.object({
  email: Email,
  password: Password,
  fullName: NonEmptyText(120),
  farm: z.object({
    name: NonEmptyText(120),
    timezone: IanaTimezone,
    currency: CurrencyCode,
    unitSystem: UnitSystem.default("metric"),
    countryCode: CountryCode.optional(),
  }),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({ email: Email, password: z.string().min(1).max(200) });
export type LoginRequest = z.infer<typeof LoginRequest>;

export const GoogleLoginRequest = z.object({ idToken: z.string().min(20).max(4096) });

export const RefreshRequest = z.object({ refreshToken: z.string().min(20).max(500) });
export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const PasswordResetRequest = z.object({ email: Email });
export const PasswordResetConfirm = z.object({ token: z.string().min(20).max(500), newPassword: Password });

export const TokenPair = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.string(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.string(),
});
export type TokenPair = z.infer<typeof TokenPair>;

export const UserView = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
});
export type UserView = z.infer<typeof UserView>;
