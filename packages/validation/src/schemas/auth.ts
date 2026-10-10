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

export const LoginRequest = z.object({ email: Email, password: z.string().min(1).max(200) });

export const GoogleLoginRequest = z.object({ idToken: z.string().min(20).max(4096) });

export const RefreshRequest = z.object({ refreshToken: z.string().min(20).max(500) });

export const PasswordResetRequest = z.object({ email: Email });
export const PasswordResetConfirm = z.object({ token: z.string().min(20).max(500), newPassword: Password });

export const TokenPair = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.string(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.string(),
});

export const UserView = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
});
