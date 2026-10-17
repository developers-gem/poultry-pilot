import pino from "pino";
import { describe, expect, it } from "vitest";
import { bestEffortEmail, smtpEmailSender } from "../adapters/smtp.js";
import { loadEnv } from "../config/env.js";
import type { EmailSender } from "../ports/external.js";
import { makeApp, register } from "./harness.js";

describe("outgoing email", () => {
  it("the SMTP sender passes the message to the transport", async () => {
    const sent: object[] = [];
    const smtp = smtpEmailSender({ url: "smtp://localhost", from: "PoultryPilot <no-reply@example.com>" }, { sendMail: async (m: object) => sent.push(m) } as never);
    await smtp.send({ to: "a@example.com", subject: "Reset", text: "Open the link", kind: "password_reset", token: "t" });
    expect(sent).toEqual([{ from: "PoultryPilot <no-reply@example.com>", to: "a@example.com", subject: "Reset", text: "Open the link" }]);
  });

  it("when mail is down, 'forgot password' still answers the same for real and unknown accounts", async () => {
    const down: EmailSender = { send: async () => { throw new Error("SMTP 421 service unavailable"); } };
    const ctx = makeApp();
    await register(ctx, "real@example.com");
    // Swap the sender the auth service uses for a failing one, wrapped as in production.
    (ctx.email as unknown as { send: EmailSender["send"] }).send = bestEffortEmail(down, pino({ level: "silent" })).send;
    const real = await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "real@example.com" });
    const unknown = await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(real.status).toBe(unknown.status);
    expect(real.body).toEqual(unknown.body);
  });

  it("production refuses to start without outgoing email", () => {
    const base = { NODE_ENV: "production", JWT_ACCESS_SECRET: "x".repeat(40), MONGODB_URI: "mongodb://db:27017/pp", CORS_ORIGINS: "https://app.example.com" };
    expect(() => loadEnv(base as never)).toThrow(/SMTP_URL/);
    expect(() => loadEnv({ ...base, SMTP_URL: "smtps://u:p@smtp.example.com:465" } as never)).not.toThrow();
  });
});
