import { API_PREFIX, HEADERS } from "@poultrypilot/constants";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Container } from "./container.js";
import { authenticate, errorHandler, idempotency, notFoundHandler, requestId } from "./http/middleware/core.js";
import { authRoutes } from "./http/routes/auth.routes.js";
import { farmRoutes } from "./http/routes/farm.routes.js";
import { meRoutes } from "./http/routes/me.routes.js";
import { syncRoutes } from "./http/routes/sync.routes.js";
import { systemRoutes } from "./http/routes/system.routes.js";

const limited = (windowLimit: number) =>
  rateLimit({
    windowMs: 60_000,
    limit: windowLimit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many requests. Wait a minute and try again.", requestId: req.requestId },
      }),
  });

/**
 * Middleware order matters:
 * request id → request log → security headers → CORS → rate limit → body parser → routes → 404 → error handler.
 * Health endpoints sit before the rate limiter so probes are never throttled.
 */
export function createApp(c: Container): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", c.config.trustProxy);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger: c.logger,
      genReqId: (req) => (req as express.Request).requestId,
      customProps: (req) => ({ requestId: (req as express.Request).requestId }),
      autoLogging: { ignore: (req) => (req.url ?? "").startsWith(`${API_PREFIX}/health`) },
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: c.config.corsOrigins,
      credentials: false,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", HEADERS.idempotencyKey, HEADERS.requestId, HEADERS.deviceId],
      exposedHeaders: [HEADERS.requestId, HEADERS.idempotentReplayed, "RateLimit", "RateLimit-Policy"],
      maxAge: 600,
    }),
  );

  const v1 = express.Router();
  v1.use(systemRoutes(c.health, { version: c.config.version, environment: c.config.environment, startedAt: c.startedAt }, { openapi: c.config.openapiEnabled }));
  v1.use(limited(c.config.rateLimitPerMinute));
  v1.use(express.json({ limit: c.config.bodyLimit }));
  v1.use("/auth", authRoutes(c.auth, limited(c.config.authRateLimitPerMinute)));

  // Business modules mount here, each behind authentication and Idempotency-Key support.
  // Mounted per prefix (not on the whole router) so unknown paths return 404, not 401.
  const secured = [authenticate(c.auth), idempotency(c.repos.idempotency)];
  v1.use("/me", ...secured, meRoutes(c.auth));
  v1.use("/farms", ...secured, farmRoutes(c.farms, c.audit));
  v1.use("/sync", ...secured, syncRoutes(c.sync, c.farms));

  app.use(API_PREFIX, v1);
  app.use(notFoundHandler);
  app.use(errorHandler(c.logger));
  return app;
}
