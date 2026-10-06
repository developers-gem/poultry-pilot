import { UpdateFarmRequest } from "@poultrypilot/contracts";
import type { Logger } from "pino";
import { AppError } from "./lib/errors.js";
import { systemClock, type Clock } from "./lib/util.js";
import type { EmailSender, GoogleTokenVerifier, PasswordHasher } from "./ports/external.js";
import type { Repositories } from "./ports/repositories.js";
import { createAuditService } from "./services/audit.service.js";
import { createAuthService } from "./services/auth.service.js";
import { createFarmService } from "./services/farm.service.js";
import { createSyncService } from "./services/sync.service.js";
import { createAccessTokens } from "./services/tokens.js";

export interface ContainerConfig {
  jwtSecret: string;
  jwtIssuer: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  appBaseUrl: string;
  corsOrigins: string[];
  authRateLimitPerMinute: number;
}

export interface ContainerDeps {
  repos: Repositories;
  config: ContainerConfig;
  logger: Logger;
  hasher: PasswordHasher;
  email: EmailSender;
  google?: GoogleTokenVerifier;
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
    appBaseUrl: d.config.appBaseUrl,
  });
  const farms = createFarmService({ repos: d.repos, clock, audit, sync, email: d.email, auth, appBaseUrl: d.config.appBaseUrl });

  // Offline commands. Each maps to the same service method the REST route uses.
  sync.register("farm.update", {
    action: "farm.update_settings",
    schema: UpdateFarmRequest.omit({ version: true }),
    async run(ctx, payload, meta) {
      if (meta.baseVersion === undefined) throw new AppError("VALIDATION_FAILED", "baseVersion is required for farm.update");
      const out = await farms.update(ctx, { ...payload, version: meta.baseVersion });
      return { entityId: out.id, version: out.version };
    },
  });

  return { ...d, clock, accessTokens, audit, sync, auth, farms };
}

export type Container = ReturnType<typeof buildContainer>;
