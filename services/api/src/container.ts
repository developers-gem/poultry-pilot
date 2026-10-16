import { createTaskService } from "./services/task.service.js";
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
import { createReportService } from "./services/report.service.js";
import type { NotificationProvider, WeatherProvider } from "./ports/external.js";
import { AdministerVaccinationRequest, CompleteTaskRequest, CreateHealthRecordRequest, FeedConsumptionRequest, PatchDailyRecordRequest } from "@poultrypilot/validation";
import { VersionConflict } from "./services/sync.service.js";
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
  alerts.hooks.onRaised = async (...args) => {
    await notifications.onAlert(...args);
  };
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
  const market = createMarketService({ repos: d.repos, clock, audit, sync, finance, flocks, inventory, hatchery, notifications });
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
  // .extend (not .and): the request schemas are strict, so an intersection would reject flockId as unknown.
  const MortalityCommand = MortalityRequest.extend({ flockId: Id });
  const CullCommand = CullRequest.extend({ flockId: Id });
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
  const reports = createReportService({ repos: d.repos, clock, audit, flocks, finance, hatchery, inventory, feed });
  const tasks = createTaskService({ repos: d.repos, clock, audit, calendar, dailyRecords });

  // ---- Offline-first commands used by the mobile sync queue ----------------------------------------
  /** Part of a day (the sections touched offline). A stale version is a conflict carrying the server's day. */
  const DayPatchCommand = z.object({ flockId: Id, date: LocalDate, patch: PatchDailyRecordRequest.omit({ version: true }) });
  sync.register("daily_record.patch", {
    action: "production.record",
    schema: DayPatchCommand,
    async run(ctx, raw, meta) {
      const p = raw as z.output<typeof DayPatchCommand>;
      try {
        const out = await dailyRecords.patchByFlockDate(ctx, p.flockId, p.date, { ...p.patch, ...(meta.baseVersion !== undefined ? { version: meta.baseVersion } : {}) });
        return { entityId: out.id!, version: out.version! };
      } catch (e) {
        if (e instanceof AppError && e.code === "VERSION_CONFLICT") {
          const server = await dailyRecords.getByFlockDate(ctx, p.flockId, p.date);
          throw new VersionConflict(server.version ?? 0, server);
        }
        throw e;
      }
    },
  });
  /** Finishing a task that is already finished is a success: the work the farmer recorded is done. */
  const TaskCommand = CompleteTaskRequest.extend({ taskId: Id });
  sync.register("task.complete", {
    action: "task.complete",
    schema: TaskCommand,
    async run(ctx, raw) {
      const { taskId, notes } = raw as z.output<typeof TaskCommand>;
      try {
        const t = await tasks.complete(ctx, taskId, { ...(notes ? { notes } : {}) });
        return { entityId: t.id, version: t.version };
      } catch (e) {
        const t = e instanceof AppError && e.code === "INVALID_STATE_TRANSITION" ? await tasks.get(ctx, taskId) : null;
        if (t?.status === "done") return { entityId: t.id, version: t.version };
        throw e;
      }
    },
  });
  sync.register("task.start", {
    action: "task.complete",
    schema: z.object({ taskId: Id }),
    async run(ctx, p) {
      try {
        const t = await tasks.start(ctx, p.taskId);
        return { entityId: t.id, version: t.version };
      } catch (e) {
        const t = e instanceof AppError && e.code === "INVALID_STATE_TRANSITION" ? await tasks.get(ctx, p.taskId) : null;
        if (t && (t.status === "in_progress" || t.status === "done")) return { entityId: t.id, version: t.version };
        throw e;
      }
    },
  });
  /** Health events; the client sends the record id, so the record is created once whatever happens. */
  sync.register("health.record", {
    action: "health.record_observation",
    schema: CreateHealthRecordRequest,
    async run(ctx, raw) {
      const input = raw as z.output<typeof CreateHealthRecordRequest>;
      if (input.id && (await d.repos.healthRecords.findById(ctx.farmId, input.id))) return { entityId: input.id };
      const r = await flockHealth.createRecord(ctx, input as never);
      return { entityId: (r as { id: string }).id };
    },
  });
  // The request schema has refinements (no .extend): take the id, then validate the rest with the full schema.
  const VaccinationCommand = z.object({ vaccinationId: Id }).passthrough();
  sync.register("vaccination.administer", {
    action: "health.vaccinate",
    schema: VaccinationCommand,
    async run(ctx, raw) {
      const { vaccinationId, ...rest } = raw as z.output<typeof VaccinationCommand>;
      const r = AdministerVaccinationRequest.parse(rest);
      const v = await d.repos.vaccinations.findById(ctx.farmId, vaccinationId);
      if (v?.status === "done") return { entityId: v.id, version: v.version };
      const out = await flockHealth.administer(ctx, vaccinationId, r as never);
      return { entityId: vaccinationId, version: (out as { version?: number }).version };
    },
  });
  const dashboard = createDashboardService({ repos: d.repos, clock, dailyRecords, weather, calendar, inventory, feed, hatchery, finance, flocks, intelligence, rules, tasks });

  const FeedCommand = FeedConsumptionRequest;
  sync.register("feed.consume", {
    action: "inventory.issue",
    schema: FeedCommand,
    async run(ctx, raw) {
      return { entityId: (await feed.consume(ctx, raw as z.output<typeof FeedCommand>)).id };
    },
  });

  return { ...d, clock, startedAt: clock.now(), accessTokens, audit, sync, auth, farms, houses, flocks, dailyRecords, media, inventory, feed, alerts, flockHealth, biosecurity, content, hatchery, chickStart, calendar, finance, market, rules, notifications, weather, intelligence, dashboard, reports, tasks };
}

export type Container = ReturnType<typeof buildContainer>;
