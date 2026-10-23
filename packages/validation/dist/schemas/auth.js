import { z } from "zod";
import { CountryCode, CurrencyCode, Email, IanaTimezone, NonEmptyText, Password } from "../primitives.js";
import { Role, SessionPlatform, UnitSystem } from "../enums.js";
const Token = z.string().min(20).max(500);
/** Describes the device a session belongs to; shown on the "signed-in devices" screen. */
export const DeviceInfo = z
    .object({
    deviceId: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    platform: SessionPlatform.default("other"),
})
    .strict();
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
    device: DeviceInfo.optional(),
});
export const LoginRequest = z.object({ email: Email, password: z.string().min(1).max(200), device: DeviceInfo.optional() });
/**
 * Google sign-in: the client (web Google Identity Services, Android/iOS Google Sign-In) obtains an ID token
 * and sends it here; the API verifies its signature and audience. No Google secret ever reaches a client.
 */
export const GoogleLoginRequest = z.object({ idToken: z.string().min(20).max(4096), device: DeviceInfo.optional() });
export const RefreshRequest = z.object({ refreshToken: Token });
/** Either the refresh token (mobile) or the bearer access token identifies the session to end. */
export const LogoutRequest = z.object({ refreshToken: Token.optional() });
export const VerifyEmailRequest = z.object({ token: Token });
export const ForgotPasswordRequest = z.object({ email: Email });
export const CheckEmailRequest = z.object({ email: Email });
export const DeleteAccountRequest = z.object({ email: Email });
export const ResetPasswordRequest = z.object({ token: Token, newPassword: Password });
/** PUT /me: the signed-in person's own name and phone. */
export const UpdateProfileRequest = z.object({ fullName: NonEmptyText(120), phone: z.string().trim().max(30).optional() }).strict();
export const ChangePasswordRequest = z.object({ currentPassword: z.string().min(1).max(200), newPassword: Password });
export const TokenPair = z.object({
    accessToken: z.string(),
    accessTokenExpiresAt: z.string(),
    refreshToken: z.string(),
    refreshTokenExpiresAt: z.string(),
    sessionId: z.string(),
});
export const UserView = z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    phone: z.string().optional(),
    /** PoultryPilot staff roles (content editing); empty for everyone else. */
    platformRoles: z.array(z.string()),
    emailVerified: z.boolean(),
    hasPassword: z.boolean(),
    googleLinked: z.boolean(),
    createdAt: z.string(),
});
export const SessionView = z.object({
    id: z.string(),
    deviceName: z.string().optional(),
    platform: SessionPlatform,
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    createdAt: z.string(),
    lastUsedAt: z.string(),
    expiresAt: z.string(),
    current: z.boolean(),
});
export const MeResponse = z.object({
    user: UserView,
    sessionId: z.string(),
    memberships: z.array(z.object({
        membershipId: z.string(),
        farmId: z.string(),
        farmName: z.string(),
        role: Role,
        permissions: z.array(z.string()),
    })),
});
//# sourceMappingURL=auth.js.map