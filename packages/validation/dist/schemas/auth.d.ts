import { z } from "zod";
/** Describes the device a session belongs to; shown on the "signed-in devices" screen. */
export declare const DeviceInfo: z.ZodObject<{
    deviceId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    platform: z.ZodDefault<z.ZodEnum<["web", "android", "ios", "other"]>>;
}, "strict", z.ZodTypeAny, {
    platform: "other" | "web" | "android" | "ios";
    deviceId?: string | undefined;
    name?: string | undefined;
}, {
    deviceId?: string | undefined;
    name?: string | undefined;
    platform?: "other" | "web" | "android" | "ios" | undefined;
}>;
/** Sign-up creates the user, their first farm and an owner membership in one transaction. */
export declare const RegisterRequest: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodEffects<z.ZodString, string, string>;
    fullName: z.ZodString;
    farm: z.ZodObject<{
        name: z.ZodString;
        timezone: z.ZodEffects<z.ZodString, string, string>;
        currency: z.ZodEffects<z.ZodString, string, string>;
        unitSystem: z.ZodDefault<z.ZodEnum<["metric", "imperial"]>>;
        countryCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        name: string;
        timezone: string;
        unitSystem: "metric" | "imperial";
        countryCode?: string | undefined;
    }, {
        currency: string;
        name: string;
        timezone: string;
        unitSystem?: "metric" | "imperial" | undefined;
        countryCode?: string | undefined;
    }>;
    device: z.ZodOptional<z.ZodObject<{
        deviceId: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        platform: z.ZodDefault<z.ZodEnum<["web", "android", "ios", "other"]>>;
    }, "strict", z.ZodTypeAny, {
        platform: "other" | "web" | "android" | "ios";
        deviceId?: string | undefined;
        name?: string | undefined;
    }, {
        deviceId?: string | undefined;
        name?: string | undefined;
        platform?: "other" | "web" | "android" | "ios" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    farm: {
        currency: string;
        name: string;
        timezone: string;
        unitSystem: "metric" | "imperial";
        countryCode?: string | undefined;
    };
    password: string;
    fullName: string;
    device?: {
        platform: "other" | "web" | "android" | "ios";
        deviceId?: string | undefined;
        name?: string | undefined;
    } | undefined;
}, {
    email: string;
    farm: {
        currency: string;
        name: string;
        timezone: string;
        unitSystem?: "metric" | "imperial" | undefined;
        countryCode?: string | undefined;
    };
    password: string;
    fullName: string;
    device?: {
        deviceId?: string | undefined;
        name?: string | undefined;
        platform?: "other" | "web" | "android" | "ios" | undefined;
    } | undefined;
}>;
export declare const LoginRequest: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    device: z.ZodOptional<z.ZodObject<{
        deviceId: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        platform: z.ZodDefault<z.ZodEnum<["web", "android", "ios", "other"]>>;
    }, "strict", z.ZodTypeAny, {
        platform: "other" | "web" | "android" | "ios";
        deviceId?: string | undefined;
        name?: string | undefined;
    }, {
        deviceId?: string | undefined;
        name?: string | undefined;
        platform?: "other" | "web" | "android" | "ios" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    device?: {
        platform: "other" | "web" | "android" | "ios";
        deviceId?: string | undefined;
        name?: string | undefined;
    } | undefined;
}, {
    email: string;
    password: string;
    device?: {
        deviceId?: string | undefined;
        name?: string | undefined;
        platform?: "other" | "web" | "android" | "ios" | undefined;
    } | undefined;
}>;
/**
 * Google sign-in: the client (web Google Identity Services, Android/iOS Google Sign-In) obtains an ID token
 * and sends it here; the API verifies its signature and audience. No Google secret ever reaches a client.
 */
export declare const GoogleLoginRequest: z.ZodObject<{
    idToken: z.ZodString;
    device: z.ZodOptional<z.ZodObject<{
        deviceId: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        platform: z.ZodDefault<z.ZodEnum<["web", "android", "ios", "other"]>>;
    }, "strict", z.ZodTypeAny, {
        platform: "other" | "web" | "android" | "ios";
        deviceId?: string | undefined;
        name?: string | undefined;
    }, {
        deviceId?: string | undefined;
        name?: string | undefined;
        platform?: "other" | "web" | "android" | "ios" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    idToken: string;
    device?: {
        platform: "other" | "web" | "android" | "ios";
        deviceId?: string | undefined;
        name?: string | undefined;
    } | undefined;
}, {
    idToken: string;
    device?: {
        deviceId?: string | undefined;
        name?: string | undefined;
        platform?: "other" | "web" | "android" | "ios" | undefined;
    } | undefined;
}>;
export declare const RefreshRequest: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
/** Either the refresh token (mobile) or the bearer access token identifies the session to end. */
export declare const LogoutRequest: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string | undefined;
}, {
    refreshToken?: string | undefined;
}>;
export declare const VerifyEmailRequest: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const ForgotPasswordRequest: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const ResetPasswordRequest: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
/** PUT /me: the signed-in person's own name and phone. */
export declare const UpdateProfileRequest: z.ZodObject<{
    fullName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    fullName: string;
    phone?: string | undefined;
}, {
    fullName: string;
    phone?: string | undefined;
}>;
export declare const ChangePasswordRequest: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    currentPassword: string;
}>;
export declare const TokenPair: z.ZodObject<{
    accessToken: z.ZodString;
    accessTokenExpiresAt: z.ZodString;
    refreshToken: z.ZodString;
    refreshTokenExpiresAt: z.ZodString;
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
    sessionId: string;
}, {
    refreshToken: string;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
    sessionId: string;
}>;
export declare const UserView: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    fullName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    /** PoultryPilot staff roles (content editing); empty for everyone else. */
    platformRoles: z.ZodArray<z.ZodString, "many">;
    emailVerified: z.ZodBoolean;
    hasPassword: z.ZodBoolean;
    googleLinked: z.ZodBoolean;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    fullName: string;
    id: string;
    platformRoles: string[];
    emailVerified: boolean;
    hasPassword: boolean;
    googleLinked: boolean;
    createdAt: string;
    phone?: string | undefined;
}, {
    email: string;
    fullName: string;
    id: string;
    platformRoles: string[];
    emailVerified: boolean;
    hasPassword: boolean;
    googleLinked: boolean;
    createdAt: string;
    phone?: string | undefined;
}>;
export declare const SessionView: z.ZodObject<{
    id: z.ZodString;
    deviceName: z.ZodOptional<z.ZodString>;
    platform: z.ZodEnum<["web", "android", "ios", "other"]>;
    userAgent: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    lastUsedAt: z.ZodString;
    expiresAt: z.ZodString;
    current: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    current: boolean;
    platform: "other" | "web" | "android" | "ios";
    id: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
    deviceName?: string | undefined;
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
}, {
    current: boolean;
    platform: "other" | "web" | "android" | "ios";
    id: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
    deviceName?: string | undefined;
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
}>;
export declare const MeResponse: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        fullName: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        /** PoultryPilot staff roles (content editing); empty for everyone else. */
        platformRoles: z.ZodArray<z.ZodString, "many">;
        emailVerified: z.ZodBoolean;
        hasPassword: z.ZodBoolean;
        googleLinked: z.ZodBoolean;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        fullName: string;
        id: string;
        platformRoles: string[];
        emailVerified: boolean;
        hasPassword: boolean;
        googleLinked: boolean;
        createdAt: string;
        phone?: string | undefined;
    }, {
        email: string;
        fullName: string;
        id: string;
        platformRoles: string[];
        emailVerified: boolean;
        hasPassword: boolean;
        googleLinked: boolean;
        createdAt: string;
        phone?: string | undefined;
    }>;
    sessionId: z.ZodString;
    memberships: z.ZodArray<z.ZodObject<{
        membershipId: z.ZodString;
        farmId: z.ZodString;
        farmName: z.ZodString;
        role: z.ZodEnum<["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"]>;
        permissions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        membershipId: string;
        farmId: string;
        farmName: string;
        role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
        permissions: string[];
    }, {
        membershipId: string;
        farmId: string;
        farmName: string;
        role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
        permissions: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    user: {
        email: string;
        fullName: string;
        id: string;
        platformRoles: string[];
        emailVerified: boolean;
        hasPassword: boolean;
        googleLinked: boolean;
        createdAt: string;
        phone?: string | undefined;
    };
    memberships: {
        membershipId: string;
        farmId: string;
        farmName: string;
        role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
        permissions: string[];
    }[];
}, {
    sessionId: string;
    user: {
        email: string;
        fullName: string;
        id: string;
        platformRoles: string[];
        emailVerified: boolean;
        hasPassword: boolean;
        googleLinked: boolean;
        createdAt: string;
        phone?: string | undefined;
    };
    memberships: {
        membershipId: string;
        farmId: string;
        farmName: string;
        role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
        permissions: string[];
    }[];
}>;
