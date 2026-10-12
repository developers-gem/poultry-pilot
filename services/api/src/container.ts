import { CullRequest, Id, LocalDate, MortalityRequest, ReplaceFarmRequest, UpsertDailyRecordRequest, WeighingRequest } from "@poultrypilot/validation";
import { z } from "zod";
import type { Logger } from "pino";
import { AppError } from "./lib/errors.js";
import { systemClock, type Clock } from "./lib/util.js";
import type { EmailSender, GoogleTokenVerifier, MediaStorage, PasswordHasher } from "./ports/external.js";
import { memoryMediaStorage } from "./adapters/storage.js";
import { createDailyRecordService } from "./services/daily-record.service.js";
import { createMediaService } from "./services/media.service.js";
import { createAlertService } from "./services/alert.service.js";
import { createFeedService } from "./services/feed.service.js";
import { createInventoryService } from "./services/inventory.service.js";
import { createHealthService } from "./services/health.service.js";
import { createBiosecurityService } from "./services/biosecurity.service.js";
import { createContentService } from "./services/content.service.js";
import { createHatcheryService } from "./services/hatchery.service.js";
import { createChickStartService } from "./services/chickstart.service.js";
import { createCalendarService } from "./services/calendar.service.js";
import { createFinanceService } from "./services/finance.service.js";
import { createMarketService } from "./services/market.service.js";
import { createRulesService } from "./services/rules.service.js";
import { createNotificationService } from "./services/notification.service.js";
import { createWeatherService } from "./services/weather.service.js";
import { createIntelligenceService } from "./services/intelligence.service.js";
import { createDashboardService } from "./services/dashboard.service.js";
import type { NotificationProvider, WeatherProvider } from "./ports/external.js";
import { FeedConsumptionRequest } from "@poultrypilot/validation";
import type { HealthChecks } from "./ports/health.js";
import type { Repositories } from "./ports/repositories.js";
import { createAuditService } from "./services/audit.service.js";
import { createAuthService } from "./services/auth.service.js";
import { createFarmService } from "./services/farm.service.js";
import { createFlockService } from "./services/flock.service.js";
import { createHouseService } from "./services/house.service.js";
import { createSyncService } from "./services/sync.service.js";
import { createAccessTokens } from "./services/tokens.js";

export interface ContainerConfig {
  version: string;
  environment: string;
  trustProxy: number;
  bodyLimit: string;
  rateLimitPerMinute: number;
  openapiEnabled: boolean;
  jwtSecret: string;
  jwtIssuer: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  sessionMaxDays: number;
  maxFailedLogins: number;
  lockMinutes: number;
  appBaseUrl: string;
  corsOrigins: string[];
  authRateLimitPerMinute: number;
}

export interface ContainerDeps {
  repos: Repositories;
  health: HealthChecks;
  config: ContainerConfig;
  logger: Logger;
  hasher: PasswordHasher;
  email: EmailSender;
  google?: GoogleTokenVerifier;
  /** Photo storage. Defaults to in-memory (tests); server.ts passes local disk or S3. */
  media?: MediaStorage;
  /** Weather source (server.ts: Open-Meteo). Without one, weather is unavailable. */
  weatherProvider?: WeatherProvider;
  /** Push and email delivery providers (server.ts: email through EmailSender, push through a log provider). */
  notificationProviders?: NotificationProvider[];
  clock?: Clock;
}

export function buildContainer(d: ContainerDeps) {
  const clock = d.clock ?? systemClock;
  const accessTokens = createAccessTokens({ secret: d.config.jwtSecret, issuer: d.config.jwtIssuer, ttlSeconds: d.config.accessTtlSeconds });
  const audit = createAuditService(d.repos, clock);
  const sync = createSyncService(d.repos, clock);
  const auth = createAuthService({
    repos: d.repos,
    clock,
    hasher: d.hasher,
    accessTokens,
    audit,
    sync,
    email: d.email,
    ...(d.google ? { google: d.google } : {}),
    refreshTtlDays: d.config.refreshTtlDays,
    sessionMaxDays: d.config.sessionMaxDays,
    maxFailedLogins: d.config.maxFailedLogins,
    lockMinutes: d.config.lockMinutes,
    appBaseUrl: d.config.appBaseUrl,
  });
  const farms = createFarmService({ repos: d.repos, clock, audit, sync, email: d.email, auth, appBaseUrl: d.config.appBaseUrl });

  // Offline commands. Each maps to the same service method the REST route uses.
  sync.register("farm.update", {
    action: "farm.update_settings",
    schema: ReplaceFarmRequest.omit({ version: true }),
    async run(ctx, payload, meta) {
      if (meta.baseVersion === undefined) throw new AppError("VALIDATION_FAILED", "baseVersion is required for farm.update");
      const out = await farms.replace(ctx, { ...payload, version: meta.baseVersion });
      return { entityId: out.id, version: out.version };
    },
  });

  const houses = createHouseService({ repos: d.repos, clock, audit, sync });
  const flocks = createFlockService({ repos: d.repos, clock, audit, sync });
  const finance = createFinanceService({ repos: d.repos, clock, audit, sync, flocks });
  // Finance plugs into the flock engine: sales become receivables; allocated bills and income reach flock profit.
  flocks.hooks.afterSale.push(finance.onFlockSale);
  flocks.hooks.onSaleReversed.push(finance.onFlockSaleReversed);
  flocks.hooks.extraCostMinor.push(finance.flockExtraCostMinor);
  flocks.hooks.extraIncomeMinor.push(finance.flockExtraIncomeMinor);
  const alerts = createAlertService({ repos: d.repos, clock });
  // Every alert follows the farm's rule settings and is fanned out by the notifier.
  const rules = createRulesService({ repos: d.repos, clock, audit });
  const notifications = createNotificationService({ repos: d.repos, clock, providers: d.notificationProviders ?? [] });
  alerts.hooks.ruleFor = rules.forAlertType;
  alerts.hooks.onRaised = notifications.onAlert;
  const weather = createWeatherService({
    repos: d.repos,
    clock,
    rules,
    provider: d.weatherProvider ?? { name: "none", fetch: async () => { throw new Error("no weather provider configured"); } },
  });
  const inventory = createInventoryService({ repos: d.repos, clock, audit, sync, onStockChanged: (ctx, tx) => alerts.evaluateInventory(ctx, tx) });
  inventory.hooks.afterPurchase.push(finance.onInventoryPurchase);
  const feed = createFeedService({ repos: d.repos, clock, audit, sync, inventory, flocks });
  const flockHealth = createHealthService({ repos: d.repos, clock, audit, sync, flocks, inventory, alerts });
  // FlockHealth plugs into the flock engine: no sale or move during a meat withdrawal; health costs in flock profit.
  flocks.hooks.beforeBirdsLeave.push(flockHealth.assertBirdsMayLeave);
  flocks.hooks.extraCostMinor.push(flockHealth.flockHealthCostMinor);
  flockHealth.hooks.onCost.push(finance.onHealthCost);
  const biosecurity = createBiosecurityService({ repos: d.repos, clock, audit, sync, inventory, alerts });
  const content = createContentService({ repos: d.repos, clock });
  const hatchery = createHatcheryService({ repos: d.repos, clock, audit, sync, inventory, alerts });
  const chickStart = createChickStartService({ repos: d.repos, clock, audit, flocks, biosecurity, alerts });
  const calendar = createCalendarService({ repos: d.repos, clock });
  const market = createMarketService({ repos: d.repos, clock, audit, sync, finance, flocks, inventory, hatchery });
  const dailyRecords = createDailyRecordService({ repos: d.repos, clock, audit, sync, flocks, feed, alerts, afterEggsWritten: flockHealth.refreshWithheldEggs,
    waterRules: async (ctx, tx) => {
      const r = await rules.config(ctx, "water_consumption", tx);
      return { deviationPercent: r.params["deviationPercent"] ?? 20, minBaselineDays: r.params["minBaselineDays"] ?? 3, windowDays: r.params["windowDays"] ?? 7, ...(r.params["phMin"] !== undefined ? { phMin: r.params["phMin"] } : {}), ...(r.params["phMax"] !== undefined ? { phMax: r.params["phMax"] } : {}), ...(r.params["tdsMaxPpm"] !== undefined ? { tdsMaxPpm: r.params["tdsMaxPpm"] } : {}) } as never;
    },
  });
  const media = createMediaService({ repos: d.repos, clock, audit, storage: d.media ?? memoryMediaStorage() });

  // Offline field-recording commands (Flutter outbox). Same service methods, same rules, as REST.
  // Handlers receive the parsed (output) value, with defaults applied.
  const DailyRecordCommand = z.object({ flockId: Id, date: LocalDate, record: UpsertDailyRecordRequest });
  const MortalityCommand = z.object({ flockId: Id }).and(MortalityRequest);
  const CullCommand = z.object({ flockId: Id }).and(CullRequest);
  sync.register("daily_record.put", {
    action: "production.record",
    schema: DailyRecordCommand,
    async run(ctx, raw, meta) {
      const p = raw as z.output<typeof DailyRecordCommand>;
      const out = await dailyRecords.upsertByFlockDate(ctx, p.flockId, p.date, { ...p.record, ...(meta.baseVersion !== undefined ? { version: meta.baseVersion } : {}) }, { minimal: true });
      return { entityId: out.id!, version: out.version! };
    },
  });
  sync.register("flock.mortality", {
    action: "production.record",
    schema: MortalityCommand,
    async run(ctx, raw) {
      const { flockId, ...r } = raw as z.output<typeof MortalityCommand>;
      return { entityId: (await flocks.recordMortality(ctx, flockId, r)).id };
    },
  });
  sync.register("flock.cull", {
    action: "production.record",
    schema: CullCommand,
    async run(ctx, raw) {
      const { flockId, ...r } = raw as z.output<typeof CullCommand>;
      return { entityId: (await flocks.recordCull(ctx, flockId, r)).id };
    },
  });
  sync.register("flock.weighing", {
    action: "production.record",
    schema: z.object({ flockId: Id, weighing: WeighingRequest }),
    async run(ctx, p) {
      return { entityId: (await flocks.weigh(ctx, p.flockId, p.weighing)).id };
    },
  });

  const intelligence = createIntelligenceService({ repos: d.repos, clock, alerts, rules, flocks, weather });
  const dashboard = createDashboardService({ repos: d.repos, clock, dailyRecords, weather, calendar, inventory, feed, hatchery, finance, flocks, intelligence, rules });

  const FeedCommand = FeedConsumptionRequest;
  sync.register("feed.consume", {
    action: "inventory.issue",
    schema: FeedCommand,
    async run(ctx, raw) {
      return { entityId: (await feed.consume(ctx, raw as z.output<typeof FeedCommand>)).id };
    },
  });

  return { ...d, clock, startedAt: clock.now(), accessTokens, audit, sync, auth, farms, houses, flocks, dailyRecords, media, inventory, feed, alerts, flockHealth, biosecurity, content, hatchery, chickStart, calendar, finance, market, rules, notifications, weather, intelligence, dashboard };
}

export type Container = ReturnType<typeof buildContainer>;
