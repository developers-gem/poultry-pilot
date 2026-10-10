import { describe, expect, it } from "vitest";
import { argon2Hasher } from "../adapters/external.js";
import { PASSWORD, bearer, fakeGoogle, farmInput, lastToken, login, makeApp, register } from "./harness.js";

describe("register and email verification", () => {
  it("creates the user, an owned farm and a session, and emails a verification link", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "Asha@Example.com", { verify: false, device: { platform: "android", name: "Asha's phone" } });
    expect(a.body["user"]).toMatchObject({ email: "asha@example.com", emailVerified: false, hasPassword: true, googleLinked: false });
    expect(a.body["farm"]).toMatchObject({ myRole: "owner", settings: { timezone: "Asia/Kolkata", currency: "INR" } });
    expect(a.sessionId).toBeTruthy();
    expect(JSON.stringify(a.body)).not.toMatch(/passwordHash|tokenHash/);
    expect(ctx.email.outbox.map((m) => m.kind)).toEqual(["email_verification"]);
    expect(ctx.store.sessions.get(a.sessionId)).toMatchObject({ platform: "android", deviceName: "Asha's phone", authMethod: "password" });
  });

  it("verifies once; the link cannot be reused and a resend replaces older links", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "v@example.com", { verify: false });
    const first = lastToken(ctx, "email_verification");
    expect((await ctx.api().post("/api/v1/auth/resend-verification").set(bearer(a.access))).body).toEqual({ sent: true });
    const second = lastToken(ctx, "email_verification");
    expect((await ctx.api().post("/api/v1/auth/verify-email").send({ token: first })).body.error.code).toBe("TOKEN_INVALID");
    const ok = await ctx.api().post("/api/v1/auth/verify-email").send({ token: second });
    expect(ok.status).toBe(200);
    expect(ok.body.user.emailVerified).toBe(true);
    expect((await ctx.api().post("/api/v1/auth/verify-email").send({ token: second })).status).toBe(422);
    expect((await ctx.api().post("/api/v1/auth/resend-verification").set(bearer(a.access))).body).toEqual({ sent: false });
  });

  it("rejects duplicate emails and lists every invalid field", async () => {
    const ctx = makeApp();
    await register(ctx, "dup@example.com");
    const dup = await ctx.api().post("/api/v1/auth/register").send({ email: "DUP@example.com", password: PASSWORD, fullName: "X", farm: farmInput });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("EMAIL_TAKEN");
    const bad = await ctx.api().post("/api/v1/auth/register").send({ email: "a@b.co", password: "short", fullName: "X", farm: { ...farmInput, timezone: "Mars/Olympus" } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(["password", "farm.timezone"]));
  });
});

describe("login", () => {
  it("gives the same answer for unknown email and wrong password", async () => {
    const ctx = makeApp();
    await register(ctx, "farmer@example.com");
    const wrong = await ctx.api().post("/api/v1/auth/login").send({ email: "farmer@example.com", password: "nope" });
    const unknown = await ctx.api().post("/api/v1/auth/login").send({ email: "ghost@example.com", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.body.error).toMatchObject({ code: wrong.body.error.code, message: wrong.body.error.message });
  });

  it("locks the account after repeated wrong passwords; a reset unlocks it", async () => {
    const ctx = makeApp({ maxFailedLogins: 3 });
    await register(ctx, "lock@example.com");
    for (let i = 0; i < 3; i++) await ctx.api().post("/api/v1/auth/login").send({ email: "lock@example.com", password: "wrong" });
    const locked = await ctx.api().post("/api/v1/auth/login").send({ email: "lock@example.com", password: PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.body.error).toMatchObject({ code: "ACCOUNT_LOCKED", details: { retryAfterSeconds: 900 } });

    await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "lock@example.com" });
    await ctx.api().post("/api/v1/auth/reset-password").send({ token: lastToken(ctx, "password_reset"), newPassword: "freshpass99" });
    expect((await ctx.api().post("/api/v1/auth/login").send({ email: "lock@example.com", password: "freshpass99" })).status).toBe(200);
  });

  it("a successful login resets the failure count", async () => {
    const ctx = makeApp({ maxFailedLogins: 3 });
    await register(ctx, "reset-count@example.com");
    for (let i = 0; i < 2; i++) await ctx.api().post("/api/v1/auth/login").send({ email: "reset-count@example.com", password: "wrong" });
    await login(ctx, "reset-count@example.com");
    for (let i = 0; i < 2; i++) await ctx.api().post("/api/v1/auth/login").send({ email: "reset-count@example.com", password: "wrong" });
    expect((await ctx.api().post("/api/v1/auth/login").send({ email: "reset-count@example.com", password: PASSWORD })).status).toBe(200);
  });

  it("refuses disabled accounts, and their existing sessions stop working", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "off@example.com");
    await ctx.repos.users.update(a.userId, { status: "disabled" });
    expect((await ctx.api().post("/api/v1/auth/login").send({ email: "off@example.com", password: PASSWORD })).body.error.code).toBe("ACCOUNT_DISABLED");
    expect((await ctx.api().get("/api/v1/me").set(bearer(a.access))).body.error.code).toBe("ACCOUNT_DISABLED");
  });

  it("works with real Argon2id hashing", async () => {
    const ctx = makeApp({ hasher: argon2Hasher });
    await register(ctx, "argon@example.com");
    expect(ctx.store.users.all()[0]!.passwordHash).toMatch(/^\$argon2id\$/);
    await login(ctx, "argon@example.com");
    expect((await ctx.api().post("/api/v1/auth/login").send({ email: "argon@example.com", password: "wrongpass1" })).status).toBe(401);
  });
});

describe("refresh and logout", () => {
  it("rotates refresh tokens; reusing an old one ends the whole session", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "rotate@example.com");
    const next = await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: a.refresh });
    expect(next.status).toBe(200);
    expect(next.body.sessionId).toBe(a.sessionId);
    expect(next.body.refreshToken).not.toBe(a.refresh);

    const reuse = await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: a.refresh });
    expect(reuse.body.error.code).toBe("TOKEN_REUSED");
    // The stolen copy, the legitimate newer refresh token and the access token are all dead now.
    expect((await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: next.body.refreshToken })).status).toBe(401);
    expect((await ctx.api().get("/api/v1/me").set(bearer(next.body.accessToken))).body.error.code).toBe("SESSION_REVOKED");
  });

  it("logout with the access token ends that session immediately and leaves other devices alone", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "bye@example.com");
    const other = await login(ctx, "bye@example.com");
    expect((await ctx.api().post("/api/v1/auth/logout").set(bearer(a.access)).send({})).status).toBe(204);
    expect((await ctx.api().get("/api/v1/me").set(bearer(a.access))).status).toBe(401);
    expect((await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: a.refresh })).status).toBe(401);
    expect((await ctx.api().get("/api/v1/me").set(bearer(other.access))).status).toBe(200);
  });

  it("logout with a refresh token works without an access token, and is idempotent", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "bye2@example.com");
    expect((await ctx.api().post("/api/v1/auth/logout").send({ refreshToken: a.refresh })).status).toBe(204);
    expect((await ctx.api().post("/api/v1/auth/logout").send({ refreshToken: a.refresh })).status).toBe(204);
    expect((await ctx.api().get("/api/v1/me").set(bearer(a.access))).status).toBe(401);
    expect((await ctx.api().post("/api/v1/auth/logout").send({})).status).toBe(400);
  });
});

describe("forgot, reset and change password", () => {
  it("forgot-password never reveals whether an account exists", async () => {
    const ctx = makeApp();
    await register(ctx, "known@example.com");
    const before = ctx.email.outbox.length;
    const ghost = await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "ghost@example.com" });
    const known = await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "known@example.com" });
    expect(ghost.status).toBe(202);
    expect(known.status).toBe(202);
    expect(known.body).toEqual(ghost.body);
    expect(ctx.email.outbox.length).toBe(before + 1);
  });

  it("reset works once, invalidates older links and signs out every session", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "reset@example.com");
    await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "reset@example.com" });
    const older = lastToken(ctx, "password_reset");
    await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "reset@example.com" });
    const newest = lastToken(ctx, "password_reset");
    expect((await ctx.api().post("/api/v1/auth/reset-password").send({ token: older, newPassword: "newpass4567" })).body.error.code).toBe("TOKEN_INVALID");
    expect((await ctx.api().post("/api/v1/auth/reset-password").send({ token: newest, newPassword: "newpass4567" })).status).toBe(204);
    expect((await ctx.api().post("/api/v1/auth/reset-password").send({ token: newest, newPassword: "another999x" })).status).toBe(422);
    expect((await ctx.api().get("/api/v1/me").set(bearer(a.access))).body.error.code).toBe("SESSION_REVOKED");
    expect((await ctx.api().post("/api/v1/auth/login").send({ email: "reset@example.com", password: "newpass4567" })).status).toBe(200);
    expect(ctx.email.outbox.some((m) => m.kind === "password_changed")).toBe(true);
  });

  it("reset links expire", async () => {
    const ctx = makeApp();
    await register(ctx, "late@example.com");
    await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "late@example.com" });
    const token = lastToken(ctx, "password_reset");
    const rec = ctx.store.oneTimeTokens.all().find((t) => t.purpose === "password_reset")!;
    ctx.store.oneTimeTokens.put(rec.id, { ...rec, expiresAt: new Date(Date.now() - 1) });
    expect((await ctx.api().post("/api/v1/auth/reset-password").send({ token, newPassword: "newpass4567" })).body.error.code).toBe("TOKEN_INVALID");
  });

  it("a reset token cannot be used to verify an email, or the reverse", async () => {
    const ctx = makeApp();
    await register(ctx, "cross@example.com", { verify: false });
    const verifyToken = lastToken(ctx, "email_verification");
    await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "cross@example.com" });
    const resetToken = lastToken(ctx, "password_reset");
    expect((await ctx.api().post("/api/v1/auth/verify-email").send({ token: resetToken })).status).toBe(422);
    expect((await ctx.api().post("/api/v1/auth/reset-password").send({ token: verifyToken, newPassword: "newpass4567" })).status).toBe(422);
  });

  it("change-password checks the current password, keeps this session and ends the others", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "change@example.com");
    const phone = await login(ctx, "change@example.com");
    const wrong = await ctx.api().post("/api/v1/auth/change-password").set(bearer(a.access)).send({ currentPassword: "nope", newPassword: "brandnew123" });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.code).toBe("CURRENT_PASSWORD_INCORRECT");
    const same = await ctx.api().post("/api/v1/auth/change-password").set(bearer(a.access)).send({ currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(same.body.error.code).toBe("SAME_PASSWORD");

    const ok = await ctx.api().post("/api/v1/auth/change-password").set(bearer(a.access)).send({ currentPassword: PASSWORD, newPassword: "brandnew123" });
    expect(ok.body).toEqual({ otherSessionsSignedOut: 1 });
    expect((await ctx.api().get("/api/v1/me").set(bearer(a.access))).status).toBe(200);
    expect((await ctx.api().get("/api/v1/me").set(bearer(phone.access))).body.error.code).toBe("SESSION_REVOKED");
  });
});

describe("Google sign-in", () => {
  const NEW = "google-id-token-new-user";
  const EXISTING = "google-id-token-existing";
  const UNVERIFIED = "google-id-token-unverified";
  const google = () =>
    fakeGoogle({
      [NEW]: { sub: "g-1", email: "newbie@gmail.com", emailVerified: true, name: "New Bee" },
      [EXISTING]: { sub: "g-2", email: "existing@example.com", emailVerified: true },
      [UNVERIFIED]: { sub: "g-3", email: "existing@example.com", emailVerified: false },
    });

  it("creates a verified account with no farm yet", async () => {
    const ctx = makeApp({ google: google() });
    const res = await ctx.api().post("/api/v1/auth/google").send({ idToken: NEW, device: { platform: "ios", name: "iPhone" } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ created: true, needsFarm: true, user: { email: "newbie@gmail.com", emailVerified: true, hasPassword: false, googleLinked: true } });
    expect(ctx.store.sessions.get(res.body.tokens.sessionId)).toMatchObject({ authMethod: "google", platform: "ios" });
    const again = await ctx.api().post("/api/v1/auth/google").send({ idToken: NEW });
    expect(again.body).toMatchObject({ created: false, user: { id: res.body.user.id } });
  });

  it("links to an existing account only when Google has verified the email", async () => {
    const ctx = makeApp({ google: google() });
    const existing = await register(ctx, "existing@example.com");
    expect((await ctx.api().post("/api/v1/auth/google").send({ idToken: UNVERIFIED })).status).toBe(401);
    expect(ctx.store.users.get(existing.userId)!.googleSub).toBeUndefined();

    const linked = await ctx.api().post("/api/v1/auth/google").send({ idToken: EXISTING });
    expect(linked.status).toBe(200);
    expect(linked.body).toMatchObject({ created: false, needsFarm: false, user: { id: existing.userId, googleLinked: true, hasPassword: true } });
  });

  it("rejects tokens Google does not vouch for, and returns 501 when not configured", async () => {
    expect((await makeApp({ google: google() }).api().post("/api/v1/auth/google").send({ idToken: "forged-token-forged-token" })).status).toBe(401);
    expect((await makeApp().api().post("/api/v1/auth/google").send({ idToken: NEW })).status).toBe(501);
  });

  it("a Google-only account cannot change a password it does not have", async () => {
    const ctx = makeApp({ google: google() });
    const g = await ctx.api().post("/api/v1/auth/google").send({ idToken: NEW });
    const res = await ctx.api().post("/api/v1/auth/change-password").set(bearer(g.body.tokens.accessToken)).send({ currentPassword: "x", newPassword: "brandnew123" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/forgot password/);
  });
});

describe("GET /me", () => {
  it("returns the user, the current session and every active farm membership with permissions", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "me@example.com");
    await ctx.api().post("/api/v1/farms").set(bearer(a.access)).send({ name: "Second Farm", timezone: "Asia/Kolkata", currency: "INR" });
    const me = await ctx.api().get("/api/v1/me").set(bearer(a.access));
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ user: { email: "me@example.com", emailVerified: true }, sessionId: a.sessionId });
    expect(me.body.memberships).toHaveLength(2);
    expect(me.body.memberships[0]).toMatchObject({ role: "owner", permissions: expect.arrayContaining(["member.invite", "farm.delete"]) });
  });

  it("requires a valid bearer token", async () => {
    const ctx = makeApp();
    expect((await ctx.api().get("/api/v1/me")).body.error.code).toBe("UNAUTHENTICATED");
    expect((await ctx.api().get("/api/v1/me").set(bearer("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad"))).status).toBe(401);
  });
});
