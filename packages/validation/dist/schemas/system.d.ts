import { z } from "zod";
/** Error envelope returned by every failing request. */
export declare const ErrorEnvelope: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}>;
export declare const DependencyStatus: z.ZodObject<{
    status: z.ZodEnum<["up", "down"]>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "up" | "down";
    error?: string | undefined;
    latencyMs?: number | undefined;
}, {
    status: "up" | "down";
    error?: string | undefined;
    latencyMs?: number | undefined;
}>;
/** GET /api/v1/health. 200 when every dependency is up, 503 otherwise. */
export declare const HealthResponse: z.ZodObject<{
    status: z.ZodEnum<["ok", "degraded"]>;
    version: z.ZodString;
    environment: z.ZodString;
    uptimeSeconds: z.ZodNumber;
    timestamp: z.ZodString;
    checks: z.ZodObject<{
        mongodb: z.ZodObject<{
            status: z.ZodEnum<["up", "down"]>;
            latencyMs: z.ZodOptional<z.ZodNumber>;
            error: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "up" | "down";
            error?: string | undefined;
            latencyMs?: number | undefined;
        }, {
            status: "up" | "down";
            error?: string | undefined;
            latencyMs?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        mongodb: {
            status: "up" | "down";
            error?: string | undefined;
            latencyMs?: number | undefined;
        };
    }, {
        mongodb: {
            status: "up" | "down";
            error?: string | undefined;
            latencyMs?: number | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    status: "ok" | "degraded";
    version: string;
    environment: string;
    uptimeSeconds: number;
    timestamp: string;
    checks: {
        mongodb: {
            status: "up" | "down";
            error?: string | undefined;
            latencyMs?: number | undefined;
        };
    };
}, {
    status: "ok" | "degraded";
    version: string;
    environment: string;
    uptimeSeconds: number;
    timestamp: string;
    checks: {
        mongodb: {
            status: "up" | "down";
            error?: string | undefined;
            latencyMs?: number | undefined;
        };
    };
}>;
/** GET /api/v1/health/live. Process is running; no dependency checks. */
export declare const LivenessResponse: z.ZodObject<{
    status: z.ZodLiteral<"ok">;
}, "strip", z.ZodTypeAny, {
    status: "ok";
}, {
    status: "ok";
}>;
