import { z } from "zod";
/** Offline outbox entry sent by the Flutter app. Processed by the same service as REST. */
export declare const SyncMutation: z.ZodObject<{
    mutationId: z.ZodString;
    command: z.ZodString;
    entityId: z.ZodOptional<z.ZodString>;
    payload: z.ZodUnknown;
    baseVersion: z.ZodOptional<z.ZodNumber>;
    clientCreatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mutationId: string;
    command: string;
    clientCreatedAt: string;
    entityId?: string | undefined;
    payload?: unknown;
    baseVersion?: number | undefined;
}, {
    mutationId: string;
    command: string;
    clientCreatedAt: string;
    entityId?: string | undefined;
    payload?: unknown;
    baseVersion?: number | undefined;
}>;
export declare const SyncPushRequest: z.ZodObject<{
    farmId: z.ZodString;
    deviceId: z.ZodString;
    mutations: z.ZodArray<z.ZodObject<{
        mutationId: z.ZodString;
        command: z.ZodString;
        entityId: z.ZodOptional<z.ZodString>;
        payload: z.ZodUnknown;
        baseVersion: z.ZodOptional<z.ZodNumber>;
        clientCreatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        mutationId: string;
        command: string;
        clientCreatedAt: string;
        entityId?: string | undefined;
        payload?: unknown;
        baseVersion?: number | undefined;
    }, {
        mutationId: string;
        command: string;
        clientCreatedAt: string;
        entityId?: string | undefined;
        payload?: unknown;
        baseVersion?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
    farmId: string;
    mutations: {
        mutationId: string;
        command: string;
        clientCreatedAt: string;
        entityId?: string | undefined;
        payload?: unknown;
        baseVersion?: number | undefined;
    }[];
}, {
    deviceId: string;
    farmId: string;
    mutations: {
        mutationId: string;
        command: string;
        clientCreatedAt: string;
        entityId?: string | undefined;
        payload?: unknown;
        baseVersion?: number | undefined;
    }[];
}>;
export declare const SyncMutationResult: z.ZodDiscriminatedUnion<"status", [z.ZodObject<{
    mutationId: z.ZodString;
    status: z.ZodLiteral<"accepted">;
    entityId: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "accepted";
    mutationId: string;
    version?: number | undefined;
    entityId?: string | undefined;
}, {
    status: "accepted";
    mutationId: string;
    version?: number | undefined;
    entityId?: string | undefined;
}>, z.ZodObject<{
    mutationId: z.ZodString;
    status: z.ZodLiteral<"rejected">;
    code: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    status: "rejected";
    mutationId: string;
}, {
    code: string;
    message: string;
    status: "rejected";
    mutationId: string;
}>, z.ZodObject<{
    mutationId: z.ZodString;
    status: z.ZodLiteral<"conflict">;
    serverVersion: z.ZodNumber;
    serverDocument: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    status: "conflict";
    mutationId: string;
    serverVersion: number;
    serverDocument?: unknown;
}, {
    status: "conflict";
    mutationId: string;
    serverVersion: number;
    serverDocument?: unknown;
}>]>;
export declare const SyncPullQuery: z.ZodObject<{
    farmId: z.ZodString;
    since: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    farmId: string;
    since: number;
}, {
    farmId: string;
    limit?: number | undefined;
    since?: number | undefined;
}>;
export declare const SyncChange: z.ZodObject<{
    seq: z.ZodNumber;
    entity: z.ZodString;
    entityId: z.ZodString;
    op: z.ZodEnum<["upsert", "delete"]>;
    version: z.ZodNumber;
    document: z.ZodOptional<z.ZodUnknown>;
    at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    at: string;
    version: number;
    entityId: string;
    seq: number;
    entity: string;
    op: "upsert" | "delete";
    document?: unknown;
}, {
    at: string;
    version: number;
    entityId: string;
    seq: number;
    entity: string;
    op: "upsert" | "delete";
    document?: unknown;
}>;
