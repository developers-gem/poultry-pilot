import { taskRoutes } from "./http/routes/task.routes.js";
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
import { flockRoutes } from "./http/routes/flock.routes.js";
import { houseRoutes } from "./http/routes/house.routes.js";
import { dailyRecordRoutes, dashboardRoutes, farmDailyRecordRoutes, mediaRoutes } from "./http/routes/daily-record.routes.js";
import { alertRoutes, feedRoutes, inventoryRoutes, waterRoutes } from "./http/routes/inventory.routes.js";
import { biosecurityRoutes, contentRoutes, healthRoutes } from "./http/routes/health.routes.js";
import { calendarRoutes, chickOrderRoutes, chickStartRoutes, hatcheryRoutes } from "./http/routes/hatchery.routes.js";
import { buyerMarketRoutes, chickOrderActions, financeRoutes, sellerMarketRoutes } from "./http/routes/finance.routes.js";
import { appointmentRoutes, intelligenceRoutes, myNotificationRoutes } from "./http/routes/intelligence.routes.js";
import { runFarmChecks } from "./jobs/alert-job.js";
import { editorialContentRoutes, readerContentRoutes } from "./http/routes/content.routes.js";
import { reportRoutes } from "./http/routes/report.routes.js";
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
  const mine = myNotificationRoutes(c.notifications);
  v1.use("/me/notifications", ...secured, mine.inbox);
  v1.use("/me/push-devices", ...secured, mine.devices);
  v1.use("/me/notification-preferences", ...secured, mine.preferences);
  v1.use("/me", ...secured, meRoutes(c.auth));
  v1.use("/farms/:farmId/houses", ...secured, houseRoutes(c.houses, c.farms));
  v1.use("/farms/:farmId/flocks", ...secured, flockRoutes(c.flocks, c.farms, c.repos, c.dailyRecords));
  v1.use("/farms/:farmId/daily-records", ...secured, farmDailyRecordRoutes(c.dailyRecords, c.farms));
  v1.use("/farms/:farmId/dashboard", ...secured, dashboardRoutes(c.dailyRecords, c.farms));
  v1.use("/farms/:farmId/media", ...secured, mediaRoutes(c.media, c.farms));
  v1.use("/daily-records", ...secured, dailyRecordRoutes(c.dailyRecords, c.farms, c.repos));
  v1.use("/farms/:farmId/inventory", ...secured, inventoryRoutes(c.inventory, c.farms, c.repos));
  v1.use("/farms/:farmId/feed", ...secured, feedRoutes(c.feed, c.farms));
  v1.use("/farms/:farmId/water-records", ...secured, waterRoutes(c.feed, c.farms));
  v1.use("/farms/:farmId/alerts", ...secured, alertRoutes(c.alerts, c.farms, (ctx) => runFarmChecks(c, ctx)));
  v1.use("/farms/:farmId/health/appointments", ...secured, appointmentRoutes(c.flockHealth, c.farms));
  v1.use("/farms/:farmId/biosecurity", ...secured, biosecurityRoutes(c.biosecurity, c.farms));
  v1.use("/farms/:farmId/content", ...secured, contentRoutes(c.content, c.farms));
  v1.use("/farms/:farmId/health", ...secured, healthRoutes(c.flockHealth, c.farms));
  v1.use("/farms/:farmId/hatchery", ...secured, hatcheryRoutes(c.hatchery, c.farms));
  const chickOrders = chickOrderRoutes(c.hatchery, c.farms);
  const orderActions = chickOrderActions(c.market, c.farms);
  v1.use("/farms/:farmId/buyers", ...secured, chickOrders.buyers, orderActions.buyers);
  v1.use("/farms/:farmId/chick-orders", ...secured, chickOrders.orders, orderActions.orders);
  v1.use("/farms/:farmId/finance", ...secured, financeRoutes(c.finance, c.farms));
  v1.use("/farms/:farmId/market", ...secured, sellerMarketRoutes(c.market, c.farms));
  v1.use("/market", ...secured, buyerMarketRoutes(c.market));
  v1.use("/content", ...secured, readerContentRoutes(c.content));
  v1.use("/farms/:farmId/reports", ...secured, reportRoutes(c.reports, c.farms));
  v1.use("/admin/content", ...secured, editorialContentRoutes(c.content));
  v1.use("/farms/:farmId", ...secured, intelligenceRoutes({ dashboard: c.dashboard, rules: c.rules, weather: c.weather }, c.farms));
  v1.use("/farms/:farmId/chickstart", ...secured, chickStartRoutes(c.chickStart, c.farms));
  v1.use("/farms/:farmId/calendar", ...secured, calendarRoutes(c.calendar, c.farms));
  v1.use("/farms/:farmId/tasks", ...secured, taskRoutes(c.tasks, c.farms));
  v1.use("/farms", ...secured, farmRoutes(c.farms, c.audit));
  v1.use("/sync", ...secured, syncRoutes(c.sync, c.farms));

  app.use(API_PREFIX, v1);
  app.use(notFoundHandler);
  app.use(errorHandler(c.logger));
  return app;
}
