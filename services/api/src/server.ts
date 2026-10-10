import type { Server } from "node:http";
import { localDiskMediaStorage } from "./adapters/storage.js";
import { argon2Hasher, googleVerifier, logEmailSender } from "./adapters/external.js";
import { createMongoRepositories } from "./adapters/mongo/index.js";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { buildContainer } from "./container.js";
import { createMongo } from "./db/mongo.js";
import { createLogger } from "./lib/logger.js";

/**
 * Process entry point.
 * 1. Validate configuration (exit with a readable list of problems if invalid).
 * 2. Start HTTP immediately so /health can report "degraded" while MongoDB connects.
 * 3. Connect to MongoDB with exponential backoff; exit if it never succeeds.
 * 4. On SIGTERM/SIGINT: stop accepting connections, finish in-flight requests, close MongoDB, exit 0.
 *    If that takes longer than SHUTDOWN_TIMEOUT_MS, exit 1.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger({ level: env.LOG_LEVEL, format: env.LOG_FORMAT, version: env.APP_VERSION });

  const mongo = createMongo(
    {
      uri: env.MONGODB_URI,
      serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
      retries: env.MONGODB_CONNECT_RETRIES,
      autoIndex: env.MONGODB_AUTO_INDEX ?? env.NODE_ENV !== "production",
    },
    logger,
  );

  const container = buildContainer({
    repos: createMongoRepositories(mongo.connection),
    health: { mongodb: mongo.check },
    logger,
    hasher: argon2Hasher,
    media: localDiskMediaStorage(env.MEDIA_DIR),
    email: logEmailSender(logger),
    ...(env.GOOGLE_CLIENT_IDS.length ? { google: googleVerifier(env.GOOGLE_CLIENT_IDS) } : {}),
    config: {
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
      trustProxy: env.TRUST_PROXY,
      bodyLimit: env.REQUEST_BODY_LIMIT,
      rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
      authRateLimitPerMinute: env.AUTH_RATE_LIMIT_PER_MINUTE,
      openapiEnabled: env.OPENAPI_ENABLED,
      jwtSecret: env.JWT_ACCESS_SECRET,
      jwtIssuer: env.JWT_ISSUER,
      accessTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
      sessionMaxDays: env.SESSION_MAX_DAYS,
      maxFailedLogins: env.LOGIN_MAX_FAILED_ATTEMPTS,
      lockMinutes: env.LOGIN_LOCK_MINUTES,
      appBaseUrl: env.APP_BASE_URL,
      corsOrigins: env.CORS_ORIGINS,
    },
  });

  const app = createApp(container);
  const server: Server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ host: env.HOST, port: env.PORT, env: env.NODE_ENV }, "PoultryPilot API listening");
  });
  // Keep-alive sockets must not outlive the shutdown window.
  server.keepAliveTimeout = 5_000;
  server.headersTimeout = 6_000;

  let shuttingDown = false;
  const shutdown = async (reason: string, code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, "shutting down");
    const force = setTimeout(() => {
      logger.error({ timeoutMs: env.SHUTDOWN_TIMEOUT_MS }, "shutdown timed out; forcing exit");
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    force.unref();
    // Stop accepting new connections; idle keep-alive sockets are closed now so close() can finish
    // once in-flight requests complete.
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeIdleConnections();
    await closed;
    await mongo.disconnect().catch((err) => logger.error({ err }, "error closing MongoDB"));
    logger.info("shutdown complete");
    process.exit(code);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (err) => {
    logger.fatal({ err }, "unhandled promise rejection");
    void shutdown("unhandledRejection", 1);
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    void shutdown("uncaughtException", 1);
  });

  try {
    await mongo.connect();
  } catch {
    await shutdown("mongodb-unavailable", 1);
  }
}

main().catch((err) => {
  // Configuration errors land here, before the logger exists.
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
