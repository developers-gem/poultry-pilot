import { pino } from "pino";
import request from "supertest";
import { memoryEmailSender } from "../adapters/external.js";
import { createMemoryRepositories } from "../adapters/memory/index.js";
import { createApp } from "../app.js";
import { buildContainer } from "../container.js";
import type { GoogleIdentity, GoogleTokenVerifier, PasswordHasher } from "../ports/external.js";
import type { Role } from "@poultrypilot/constants";
import type { HealthChecks } from "../ports/health.js";

/** Fast deterministic hasher for tests; a separate test covers real Argon2. */
export const fakeHasher: PasswordHasher = {
  async hash(p) {
    return `h:${p}`;
  },
  async verify(h, p) {
    return h === `h:${p}`;
  },
};

export const upHealth: HealthChecks = { mongodb: async () => ({ status: "up", latencyMs: 1 }) };

export function makeApp(opts: { hasher?: PasswordHasher; rateLimit?: number; globalRateLimit?: number; health?: HealthChecks; bodyLimit?: string; google?: GoogleTokenVerifier; maxFailedLogins?: number } = {}) {
  const { repos, store } = createMemoryRepositories();
  const email = memoryEmailSender();
  const container = buildContainer({
    repos,
    health: opts.health ?? upHealth,
    logger: pino({ level: "silent" }),
    hasher: opts.hasher ?? fakeHasher,
    email,
    ...(opts.google ? { google: opts.google } : {}),
    config: {
      version: "0.1.0-test",
      environment: "test",
      trustProxy: 0,
      bodyLimit: opts.bodyLimit ?? "1mb",
      rateLimitPerMinute: opts.globalRateLimit ?? 10_000,
      openapiEnabled: true,
      jwtSecret: "test-secret-test-secret-test-secret-123",
      jwtIssuer: "poultrypilot-test",
      accessTtlSeconds: 900,
      refreshTtlDays: 30,
      sessionMaxDays: 90,
      maxFailedLogins: opts.maxFailedLogins ?? 10,
      lockMinutes: 15,
      appBaseUrl: "http://localhost:5173",
      corsOrigins: ["http://localhost:5173"],
      authRateLimitPerMinute: opts.rateLimit ?? 1000,
    },
  });
  const app = createApp(container);
  const api = () => request(app);
  return { app, api, repos, store, email, container };
}

export type Ctx = ReturnType<typeof makeApp>;
export const farmInput = { name: "Green Valley Poultry", timezone: "Asia/Kolkata", currency: "INR", unitSystem: "metric" };
export const PASSWORD = "goodpass123";
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

export interface Account {
  userId: string;
  email: string;
  farmId: string;
  access: string;
  refresh: string;
  sessionId: string;
  body: Record<string, any>;
}

/** Registers a user (with their own first farm). Verifies the email by default, as most flows need it. */
export async function register(ctx: Ctx, email: string, opts: { verify?: boolean; fullName?: string; device?: object } = {}): Promise<Account> {
  const res = await ctx
    .api()
    .post("/api/v1/auth/register")
    .send({ email, password: PASSWORD, fullName: opts.fullName ?? "Test Farmer", farm: farmInput, ...(opts.device ? { device: opts.device } : {}) });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  if (opts.verify !== false) {
    const token = [...ctx.email.outbox].reverse().find((m) => m.to === email.toLowerCase() && m.kind === "email_verification")!.token!;
    const v = await ctx.api().post("/api/v1/auth/verify-email").send({ token });
    if (v.status !== 200) throw new Error(`verify failed: ${v.status} ${JSON.stringify(v.body)}`);
  }
  return {
    userId: res.body.user.id,
    email: res.body.user.email,
    farmId: res.body.farm.id,
    access: res.body.tokens.accessToken,
    refresh: res.body.tokens.refreshToken,
    sessionId: res.body.tokens.sessionId,
    body: res.body,
  };
}

export async function login(ctx: Ctx, email: string, device?: object) {
  const res = await ctx.api().post("/api/v1/auth/login").send({ email, password: PASSWORD, ...(device ? { device } : {}) });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { access: res.body.tokens.accessToken as string, refresh: res.body.tokens.refreshToken as string, sessionId: res.body.tokens.sessionId as string };
}

export const lastToken = (ctx: Ctx, kind: string, to?: string) =>
  [...ctx.email.outbox].reverse().find((m) => m.kind === kind && (!to || m.to === to.toLowerCase()))!.token!;

/** Invites `email` to `inviter`'s farm with `role`, registers them and accepts. Returns their account and member id. */
export async function joinAs(ctx: Ctx, inviter: { farmId: string; access: string }, email: string, role: Role): Promise<Account & { memberId: string }> {
  const inv = await ctx.api().post(`/api/v1/farms/${inviter.farmId}/members`).set(bearer(inviter.access)).send({ email, role });
  if (inv.status !== 201) throw new Error(`invite failed: ${inv.status} ${JSON.stringify(inv.body)}`);
  const token = lastToken(ctx, "farm_invite", email);
  const account = await register(ctx, email, { verify: false });
  const acc = await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(account.access)).send({ token });
  if (acc.status !== 200) throw new Error(`accept failed: ${acc.status} ${JSON.stringify(acc.body)}`);
  return { ...account, memberId: acc.body.id };
}

/** Complete PUT /farms/:farmId body built from a FarmView, with overrides. */
export function farmBody(farm: Record<string, any>, overrides: Record<string, unknown> = {}) {
  return {
    name: farm["name"],
    ...(farm["description"] ? { description: farm["description"] } : {}),
    ...(farm["countryCode"] ? { countryCode: farm["countryCode"] } : {}),
    timezone: farm["settings"].timezone,
    currency: farm["settings"].currency,
    unitSystem: farm["settings"].unitSystem,
    fcrIncludesMortalityWeight: farm["settings"].fcrIncludesMortalityWeight,
    workerEditWindowDays: farm["settings"].workerEditWindowDays,
    version: farm["version"],
    ...overrides,
  };
}

/** Google verifier double: each token string maps to an identity. */
export function fakeGoogle(identities: Record<string, GoogleIdentity>): GoogleTokenVerifier {
  return {
    async verify(idToken) {
      const id = identities[idToken];
      if (!id) throw new Error("bad token");
      return id;
    },
  };
}
