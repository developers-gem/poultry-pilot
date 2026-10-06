import { pino } from "pino";
import request from "supertest";
import { memoryEmailSender } from "../adapters/external.js";
import { createMemoryRepositories } from "../adapters/memory/index.js";
import { createApp } from "../app.js";
import { buildContainer } from "../container.js";
import type { PasswordHasher } from "../ports/external.js";

/** Fast deterministic hasher for tests; a separate test covers real Argon2. */
export const fakeHasher: PasswordHasher = {
  async hash(p) {
    return `h:${p}`;
  },
  async verify(h, p) {
    return h === `h:${p}`;
  },
};

export function makeApp(opts: { hasher?: PasswordHasher; rateLimit?: number } = {}) {
  const { repos, store } = createMemoryRepositories();
  const email = memoryEmailSender();
  const container = buildContainer({
    repos,
    logger: pino({ level: "silent" }),
    hasher: opts.hasher ?? fakeHasher,
    email,
    config: {
      jwtSecret: "test-secret-test-secret-test-secret-123",
      jwtIssuer: "poultrypilot-test",
      accessTtlSeconds: 900,
      refreshTtlDays: 30,
      appBaseUrl: "http://localhost:5173",
      corsOrigins: ["http://localhost:5173"],
      authRateLimitPerMinute: opts.rateLimit ?? 1000,
    },
  });
  const app = createApp(container);
  const api = () => request(app);
  return { app, api, repos, store, email, container };
}

export const farmInput = { name: "Green Valley Poultry", timezone: "Asia/Kolkata", currency: "INR", unitSystem: "metric" };

export async function register(api: ReturnType<typeof makeApp>["api"], email: string, fullName = "Test Farmer") {
  const res = await api()
    .post("/api/v1/auth/register")
    .send({ email, password: "goodpass123", fullName, farm: farmInput });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    userId: res.body.user.id as string,
    farmId: res.body.farm.id as string,
    access: res.body.tokens.accessToken as string,
    refresh: res.body.tokens.refreshToken as string,
    body: res.body,
  };
}

export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
