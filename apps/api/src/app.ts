import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Container } from "./container.js";
import { authenticate, errorHandler, idempotency, notFoundHandler, requestId } from "./http/middleware/core.js";
import { authRoutes } from "./http/routes/auth.routes.js";
import { farmRoutes } from "./http/routes/farm.routes.js";
import { syncRoutes } from "./http/routes/sync.routes.js";

export function createApp(c: Container): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(pinoHttp({ logger: c.logger, genReqId: (req) => (req as express.Request).requestId, autoLogging: { ignore: (req) => req.url === "/api/v1/health" } }));
  app.use(helmet());
  app.use(
    cors({
      origin: c.config.corsOrigins,
      credentials: false,
      allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id", "X-Device-Id"],
      exposedHeaders: ["X-Request-Id", "Idempotent-Replayed"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: c.config.authRateLimitPerMinute,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many attempts. Wait a minute and try again.", requestId: req.requestId } }),
  });

  const v1 = express.Router();
  v1.get("/health", (_req, res) => res.json({ status: "ok", version: "v1" }));
  v1.use("/auth", authRoutes(c.auth, c.accessTokens, authLimiter));

  const authed = express.Router();
  authed.use(authenticate(c.accessTokens));
  authed.use(idempotency(c.repos.idempotency));
  authed.use("/farms", farmRoutes(c.farms, c.audit));
  authed.use("/sync", syncRoutes(c.sync, c.farms));
  v1.use(authed);

  app.use("/api/v1", v1);
  app.use(notFoundHandler);
  app.use(errorHandler(c.logger));
  return app;
}
