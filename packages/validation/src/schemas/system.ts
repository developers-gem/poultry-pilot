import { z } from "zod";

/** Error envelope returned by every failing request. */
export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});

export const DependencyStatus = z.object({
  status: z.enum(["up", "down"]),
  latencyMs: z.number().nonnegative().optional(),
  error: z.string().optional(),
});

/** GET /api/v1/health. 200 when every dependency is up, 503 otherwise. */
export const HealthResponse = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  environment: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string(),
  checks: z.object({ mongodb: DependencyStatus }),
});

/** GET /api/v1/health/live. Process is running; no dependency checks. */
export const LivenessResponse = z.object({ status: z.literal("ok") });
