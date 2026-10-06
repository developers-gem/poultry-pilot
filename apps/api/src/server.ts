import mongoose from "mongoose";
import { pino } from "pino";
import { argon2Hasher, googleVerifier, logEmailSender } from "./adapters/external.js";
import { createMongoRepositories } from "./adapters/mongo/index.js";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { buildContainer } from "./container.js";

async function main() {
  const env = loadEnv();
  const logger = pino({ level: env.LOG_LEVEL, redact: ["req.headers.authorization", "*.password", "*.refreshToken", "*.token"] });

  await mongoose.connect(env.MONGODB_URI, { autoIndex: env.NODE_ENV !== "production" });
  logger.info("connected to MongoDB");

  const container = buildContainer({
    repos: createMongoRepositories(),
    logger,
    hasher: argon2Hasher,
    email: logEmailSender(logger),
    ...(env.GOOGLE_CLIENT_IDS.length ? { google: googleVerifier(env.GOOGLE_CLIENT_IDS) } : {}),
    config: {
      jwtSecret: env.JWT_ACCESS_SECRET,
      jwtIssuer: env.JWT_ISSUER,
      accessTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
      appBaseUrl: env.APP_BASE_URL,
      corsOrigins: env.CORS_ORIGINS,
      authRateLimitPerMinute: 10,
    },
  });

  const server = createApp(container).listen(env.PORT, () => logger.info({ port: env.PORT }, "PoultryPilot API listening"));

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
