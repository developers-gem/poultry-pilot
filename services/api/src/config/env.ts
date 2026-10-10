import { z } from "zod";

/**
 * All configuration comes from environment variables, validated once at startup.
 * The process refuses to start with a clear list of problems rather than failing later.
 * Locally, variables load from services/api/.env (Node's --env-file); in production, from the platform.
 */
const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean));

const Env = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_VERSION: z.string().default("0.1.0"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "Must start with mongodb:// or mongodb+srv://"),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().min(500).default(5000),
    MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(500).default(20),
    MONGODB_CONNECT_RETRIES: z.coerce.number().int().min(0).max(100).default(10),
    MONGODB_AUTO_INDEX: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),

    JWT_ACCESS_SECRET: z.string().min(32, "Must be at least 32 characters (generate with: openssl rand -base64 48)"),
    JWT_ISSUER: z.string().default("poultrypilot-api"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(180).default(30),
    SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(365).default(90),
    LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(3).max(100).default(10),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

    CORS_ORIGINS: csv("http://localhost:5173"),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(300),
    AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(10),
    REQUEST_BODY_LIMIT: z.string().default("1mb"),

    GOOGLE_CLIENT_IDS: csv(""),
    APP_BASE_URL: z.string().url().default("http://localhost:5173"),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),
    OPENAPI_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.CORS_ORIGINS.some((o) => o === "*")) {
      ctx.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "Wildcard origin is not allowed in production" });
    }
    if (env.NODE_ENV === "production" && /change-me|replace-with/i.test(env.JWT_ACCESS_SECRET)) {
      ctx.addIssue({ code: "custom", path: ["JWT_ACCESS_SECRET"], message: "Placeholder secret used in production" });
    }
  });

export type Env = z.infer<typeof Env>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${lines}\nSee services/api/.env.example.`);
  }
  return parsed.data;
}

/** Hides credentials when logging a connection string. */
export function redactMongoUri(uri: string): string {
  return uri.replace(/\/\/([^@/]+)@/, "//***:***@");
}
