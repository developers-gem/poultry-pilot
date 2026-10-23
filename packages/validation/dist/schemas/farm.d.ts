import { z } from "zod";
export declare const FarmSettings: z.ZodObject<{
    timezone: z.ZodEffects<z.ZodString, string, string>;
    currency: z.ZodEffects<z.ZodString, string, string>;
    unitSystem: z.ZodEnum<["metric", "imperial"]>;
    /** Whether FCR divides by weight of dead birds too. Integrators differ; the UI labels it. */
    fcrIncludesMortalityWeight: z.ZodDefault<z.ZodBoolean>;
    /** Workers may edit their own production entries for this many farm-local days (0 = today only). */
    workerEditWindowDays: z.ZodDefault<z.ZodNumber>;
    /** The farm's own rule: hours between a visitor's last poultry contact and entry. Omit to not check. */
    visitorDowntimeHours: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    timezone: string;
    unitSystem: "metric" | "imperial";
    fcrIncludesMortalityWeight: boolean;
    workerEditWindowDays: number;
    visitorDowntimeHours?: number | undefined;
}, {
    currency: string;
    timezone: string;
    unitSystem: "metric" | "imperial";
    fcrIncludesMortalityWeight?: boolean | undefined;
    workerEditWindowDays?: number | undefined;
    visitorDowntimeHours?: number | undefined;
}>;
export declare const CreateFarmRequest: z.ZodObject<{
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
/**
 * PUT /farms/:farmId replaces the farm's editable fields. Optional fields left out are cleared.
 * `version` must match the stored version (optimistic concurrency); a mismatch returns 409.
 */
export declare const ReplaceFarmRequest: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    countryCode: z.ZodOptional<z.ZodString>;
    locationLabel: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>>;
    timezone: z.ZodEffects<z.ZodString, string, string>;
    /** Currency changes are allowed only while the farm has no ledger entries (enforced server-side). */
    currency: z.ZodEffects<z.ZodString, string, string>;
    unitSystem: z.ZodEnum<["metric", "imperial"]>;
    fcrIncludesMortalityWeight: z.ZodBoolean;
    workerEditWindowDays: z.ZodNumber;
    visitorDowntimeHours: z.ZodOptional<z.ZodNumber>;
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    currency: string;
    version: number;
    name: string;
    timezone: string;
    unitSystem: "metric" | "imperial";
    fcrIncludesMortalityWeight: boolean;
    workerEditWindowDays: number;
    countryCode?: string | undefined;
    visitorDowntimeHours?: number | undefined;
    description?: string | undefined;
    locationLabel?: string | undefined;
    location?: {
        lat: number;
        lng: number;
    } | undefined;
}, {
    currency: string;
    version: number;
    name: string;
    timezone: string;
    unitSystem: "metric" | "imperial";
    fcrIncludesMortalityWeight: boolean;
    workerEditWindowDays: number;
    countryCode?: string | undefined;
    visitorDowntimeHours?: number | undefined;
    description?: string | undefined;
    locationLabel?: string | undefined;
    location?: {
        lat: number;
        lng: number;
    } | undefined;
}>;
export declare const FarmView: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    countryCode: z.ZodOptional<z.ZodString>;
    locationLabel: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>>;
    settings: z.ZodObject<{
        timezone: z.ZodEffects<z.ZodString, string, string>;
        currency: z.ZodEffects<z.ZodString, string, string>;
        unitSystem: z.ZodEnum<["metric", "imperial"]>;
        /** Whether FCR divides by weight of dead birds too. Integrators differ; the UI labels it. */
        fcrIncludesMortalityWeight: z.ZodDefault<z.ZodBoolean>;
        /** Workers may edit their own production entries for this many farm-local days (0 = today only). */
        workerEditWindowDays: z.ZodDefault<z.ZodNumber>;
        /** The farm's own rule: hours between a visitor's last poultry contact and entry. Omit to not check. */
        visitorDowntimeHours: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        timezone: string;
        unitSystem: "metric" | "imperial";
        fcrIncludesMortalityWeight: boolean;
        workerEditWindowDays: number;
        visitorDowntimeHours?: number | undefined;
    }, {
        currency: string;
        timezone: string;
        unitSystem: "metric" | "imperial";
        fcrIncludesMortalityWeight?: boolean | undefined;
        workerEditWindowDays?: number | undefined;
        visitorDowntimeHours?: number | undefined;
    }>;
    version: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    myRole: z.ZodOptional<z.ZodEnum<["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"]>>;
    myPermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    version: number;
    name: string;
    id: string;
    createdAt: string;
    settings: {
        currency: string;
        timezone: string;
        unitSystem: "metric" | "imperial";
        fcrIncludesMortalityWeight: boolean;
        workerEditWindowDays: number;
        visitorDowntimeHours?: number | undefined;
    };
    updatedAt: string;
    countryCode?: string | undefined;
    description?: string | undefined;
    locationLabel?: string | undefined;
    location?: {
        lat: number;
        lng: number;
    } | undefined;
    myRole?: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet" | undefined;
    myPermissions?: string[] | undefined;
}, {
    version: number;
    name: string;
    id: string;
    createdAt: string;
    settings: {
        currency: string;
        timezone: string;
        unitSystem: "metric" | "imperial";
        fcrIncludesMortalityWeight?: boolean | undefined;
        workerEditWindowDays?: number | undefined;
        visitorDowntimeHours?: number | undefined;
    };
    updatedAt: string;
    countryCode?: string | undefined;
    description?: string | undefined;
    locationLabel?: string | undefined;
    location?: {
        lat: number;
        lng: number;
    } | undefined;
    myRole?: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet" | undefined;
    myPermissions?: string[] | undefined;
}>;
/** Adds a member by email. They join when they accept the emailed invitation. */
export declare const AddMemberRequest: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"]>;
}, "strict", z.ZodTypeAny, {
    email: string;
    role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
}, {
    email: string;
    role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
}>;
export declare const AcceptInviteRequest: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const UpdateMemberRequest: z.ZodObject<{
    role: z.ZodEnum<["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"]>;
}, "strict", z.ZodTypeAny, {
    role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
}, {
    role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
}>;
export declare const MembershipView: z.ZodObject<{
    id: z.ZodString;
    farmId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    fullName: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"]>;
    status: z.ZodEnum<["invited", "active", "revoked"]>;
    invitedAt: z.ZodOptional<z.ZodString>;
    joinedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    status: "active" | "invited" | "revoked";
    id: string;
    createdAt: string;
    farmId: string;
    role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
    fullName?: string | undefined;
    userId?: string | undefined;
    invitedAt?: string | undefined;
    joinedAt?: string | undefined;
}, {
    email: string;
    status: "active" | "invited" | "revoked";
    id: string;
    createdAt: string;
    farmId: string;
    role: "owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet";
    fullName?: string | undefined;
    userId?: string | undefined;
    invitedAt?: string | undefined;
    joinedAt?: string | undefined;
}>;
