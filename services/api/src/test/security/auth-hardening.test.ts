import { describe, expect, it } from "vitest";
import { bearer, joinAs, makeApp, register } from "../harness.js";

const lastToken = (ctx: ReturnType<typeof makeApp>, kind: string, to: string) => [...ctx.email.outbox].reverse().find((m) => m.kind === kind && m.to === to)?.token;

describe("OWASP API2: authentication", () => {
  it("login does not reveal whether an account exists", async () => {
    const ctx = makeApp();
    await register(ctx, "real@example.com");
    const wrongPassword = await ctx.api().post("/api/v1/auth/login").send({ email: "real@example.com", password: "wrong-password-1" });
    const noAccount = await ctx.api().post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "wrong-password-1" });
    expect(wrongPassword.status).toBe(401);
    expect(noAccount.status).toBe(401);
    expect(noAccount.body.error.code).toBe(wrongPassword.body.error.code);
    expect(noAccount.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it("brute force: sign-in attempts are rate limited, and repeated failures lock the account", async () => {
    const limited = makeApp({ rateLimit: 5 });
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await limited.api().post("/api/v1/auth/login").send({ email: "x@example.com", password: "nope-nope-1" })).status);
    expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(codes.slice(5)).toEqual([429, 429]);
    const locking = makeApp({ maxFailedLogins: 3 });
    await register(locking, "victim@example.com");
    for (let i = 0; i < 3; i++) await locking.api().post("/api/v1/auth/login").send({ email: "victim@example.com", password: "guess-guess-1" });
    const right = await locking.api().post("/api/v1/auth/login").send({ email: "victim@example.com", password: "goodpass123" });
    expect(right.status).toBeGreaterThanOrEqual(400); // locked: even the right password waits
    expect(JSON.stringify(right.body)).not.toMatch(/goodpass123/);
  });

  it("refresh tokens rotate; replaying an old one revokes the whole session (and its access token at once)", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "a@example.com");
    const r1 = await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: a.refresh });
    expect(r1.status).toBe(200);
    expect(r1.body.refreshToken).not.toBe(a.refresh);
    const replay = await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: a.refresh }); // stolen copy used
    expect(replay.status).toBe(401);
    expect((await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: r1.body.refreshToken })).status).toBe(401); // the family is revoked
    expect((await ctx.api().get("/api/v1/me").set(bearer(r1.body.accessToken))).status).toBe(401); // immediately, not after 15 minutes
  });

  it("logout, and revoking one session from another device, take effect immediately", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "a@example.com");
    const phone = (await ctx.api().post("/api/v1/auth/login").send({ email: "a@example.com", password: "goodpass123" })).body;
    await ctx.api().post("/api/v1/auth/logout").set(bearer(phone.tokens.accessToken)).send({ refreshToken: phone.tokens.refreshToken });
    expect((await ctx.api().get("/api/v1/me").set(bearer(phone.tokens.accessToken))).status).toBe(401);
    expect((await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: phone.tokens.refreshToken })).status).toBe(401);
    const tablet = (await ctx.api().post("/api/v1/auth/login").send({ email: "a@example.com", password: "goodpass123" })).body;
    const tabletSession = (await ctx.api().get("/api/v1/me/sessions").set(bearer(a.access))).body.items.find((s: { current: boolean; id: string }) => !s.current && s.id === tablet.tokens.sessionId);
    expect((await ctx.api().delete(`/api/v1/me/sessions/${tabletSession.id}`).set(bearer(a.access))).status).toBe(204);
    expect((await ctx.api().get("/api/v1/me").set(bearer(tablet.tokens.accessToken))).status).toBe(401);
  });

  it("changing the password signs out the other sessions", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "a@example.com");
    const other = (await ctx.api().post("/api/v1/auth/login").send({ email: "a@example.com", password: "goodpass123" })).body;
    expect((await ctx.api().post("/api/v1/auth/change-password").set(bearer(a.access)).send({ currentPassword: "goodpass123", newPassword: "newpass456789" })).status).toBeLessThan(300);
    expect((await ctx.api().get("/api/v1/me").set(bearer(other.tokens.accessToken))).status).toBe(401);
    expect((await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: other.tokens.refreshToken })).status).toBe(401);
  });

  it("password reset: same answer for any email, single-use token, all sessions revoked, token never in a response", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "a@example.com");
    const known = await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "a@example.com" });
    const unknown = await ctx.api().post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(known.status).toBe(unknown.status);
    expect(known.body).toEqual(unknown.body);
    const token = lastToken(ctx, "password_reset", "a@example.com")!;
    expect(token).toBeTruthy();
    expect(JSON.stringify(known.body)).not.toContain(token);
    // Stored hashed only: the raw token is nowhere in the database.
    expect(JSON.stringify([...ctx.store.oneTimeTokens.all()])).not.toContain(token);
    const reset = await ctx.api().post("/api/v1/auth/reset-password").send({ token, newPassword: "fresh-pass-123" });
    expect(reset.status).toBeLessThan(300);
    expect((await ctx.api().post("/api/v1/auth/reset-password").send({ token, newPassword: "again-pass-123" })).status).toBeGreaterThanOrEqual(400); // single use
    expect((await ctx.api().get("/api/v1/me").set(bearer(a.access))).status).toBe(401); // old sessions gone
    expect((await ctx.api().post("/api/v1/auth/login").send({ email: "a@example.com", password: "goodpass123" })).status).toBe(401);
    expect((await ctx.api().post("/api/v1/auth/login").send({ email: "a@example.com", password: "fresh-pass-123" })).status).toBe(200);
    expect((await ctx.api().post("/api/v1/auth/reset-password").send({ token: "x".repeat(43), newPassword: "fresh-pass-123" })).status).toBeGreaterThanOrEqual(400);
  });

  it("refresh tokens are stored hashed, never in clear", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "a@example.com");
    expect(JSON.stringify([...ctx.store.refreshTokens.all()])).not.toContain(a.refresh);
  });
});

describe("OWASP API5: role escalation and membership", () => {
  async function team() {
    const ctx = makeApp();
    const owner = await register(ctx, "owner@example.com");
    const admin = await joinAs(ctx, owner, "admin@example.com", "admin");
    const manager = await joinAs(ctx, owner, "manager@example.com", "farm_manager");
    const worker = await joinAs(ctx, owner, "worker@example.com", "worker");
    const f = (who: { access: string }, m: "get" | "post" | "put" | "delete", p: string) => ctx.api()[m](`/api/v1/farms/${owner.farmId}${p}`).set(bearer(who.access));
    const memberId = async (email: string) => (await f(owner, "get", "/members")).body.items.find((m: { email: string }) => m.email === email).id as string;
    return { ctx, owner, admin, manager, worker, f, memberId };
  }

  it("nobody can promote themselves, assign a rank at or above their own, or act on a higher rank", async () => {
    const { owner, admin, manager, worker, f, memberId } = await team();
    expect((await f(manager, "post", "/members").send({ email: "friend@example.com", role: "admin" })).status).toBe(403);
    expect((await f(manager, "post", "/members").send({ email: "friend@example.com", role: "farm_manager" })).status).toBe(403); // same rank
    expect((await f(admin, "post", "/members").send({ email: "friend@example.com", role: "owner" })).status).toBe(403);
    expect((await f(worker, "post", "/members").send({ email: "friend@example.com", role: "worker" })).status).toBe(403);
    expect((await f(manager, "put", `/members/${await memberId("manager@example.com")}`).send({ role: "owner" })).status).toBe(403); // self
    expect((await f(admin, "put", `/members/${await memberId("owner@example.com")}`).send({ role: "worker" })).status).toBe(403); // higher rank
    expect((await f(admin, "delete", `/members/${await memberId("owner@example.com")}`)).status).toBe(403);
    expect((await f(worker, "put", `/members/${await memberId("worker@example.com")}`).send({ role: "admin" })).status).toBe(403);
    // The last owner cannot leave the farm ownerless.
    expect((await f(owner, "delete", `/members/${await memberId("owner@example.com")}`)).status).toBeGreaterThanOrEqual(400);
  });

  it("an invitation can only be accepted by the email it was sent to", async () => {
    const { ctx, owner, f } = await team();
    await f(owner, "post", "/members").send({ email: "alice@example.com", role: "worker" });
    const token = lastToken(ctx, "farm_invite", "alice@example.com")!;
    const mallory = await register(ctx, "mallory@example.com");
    const r = await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(mallory.access)).send({ token });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect((await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(mallory.access))).status).toBe(404);
  });

  it("a removed member loses access with their very next request", async () => {
    const { owner, worker, f, memberId } = await team();
    expect((await f(worker, "get", "/flocks")).status).toBe(200);
    expect((await f(owner, "delete", `/members/${await memberId("worker@example.com")}`)).status).toBeLessThan(300);
    expect((await f(worker, "get", "/flocks")).status).toBe(404);
  });

  it("a worker cannot reach money, members or settings on their own farm", async () => {
    const { worker, f } = await team();
    expect((await f(worker, "get", "/finance/accounts")).status).toBe(403);
    expect((await f(worker, "get", "/members")).status).toBe(403);
    expect((await f(worker, "get", "/audit")).status).toBe(403);
    expect((await f(worker, "put", "")).status).toBe(403);
  });
});
