import { describe, expect, it } from "vitest";
import { bearer, login, makeApp, register } from "./harness.js";

describe("session and device management", () => {
  it("lists active sessions with device details and marks the current one", async () => {
    const ctx = makeApp();
    const web = await register(ctx, "dev@example.com", { device: { platform: "web", name: "Office PC" } });
    await login(ctx, "dev@example.com", { platform: "android", name: "Field phone", deviceId: "android-123" });
    const res = await ctx.api().get("/api/v1/me/sessions").set(bearer(web.access)).set("User-Agent", "Mozilla/5.0 test");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.find((x: { current: boolean }) => x.current)).toMatchObject({ id: web.sessionId, platform: "web", deviceName: "Office PC" });
    expect(res.body.items.find((x: { current: boolean }) => !x.current)).toMatchObject({ platform: "android", deviceName: "Field phone" });
    expect(JSON.stringify(res.body)).not.toMatch(/tokenHash|refreshToken/);
  });

  it("signing out a device ends it immediately: its access token and refresh token both stop working", async () => {
    const ctx = makeApp();
    const web = await register(ctx, "lost@example.com");
    const phone = await login(ctx, "lost@example.com", { platform: "android", name: "Lost phone" });
    expect((await ctx.api().get("/api/v1/me").set(bearer(phone.access))).status).toBe(200);

    expect((await ctx.api().delete(`/api/v1/me/sessions/${phone.sessionId}`).set(bearer(web.access))).status).toBe(204);
    expect((await ctx.api().get("/api/v1/me").set(bearer(phone.access))).body.error.code).toBe("SESSION_REVOKED");
    expect((await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: phone.refresh })).body.error.code).toBe("SESSION_REVOKED");
    expect((await ctx.api().get("/api/v1/me/sessions").set(bearer(web.access))).body.items).toHaveLength(1);
  });

  it("signs out every other device in one call", async () => {
    const ctx = makeApp();
    const me = await register(ctx, "all@example.com");
    const a = await login(ctx, "all@example.com");
    const b = await login(ctx, "all@example.com");
    expect((await ctx.api().delete("/api/v1/me/sessions").set(bearer(me.access))).body).toEqual({ revoked: 2 });
    for (const s of [a, b]) expect((await ctx.api().get("/api/v1/me").set(bearer(s.access))).status).toBe(401);
    expect((await ctx.api().get("/api/v1/me").set(bearer(me.access))).status).toBe(200);
  });

  it("cannot see or end another user's session", async () => {
    const ctx = makeApp();
    const alice = await register(ctx, "alice@example.com");
    const bob = await register(ctx, "bob@example.com");
    const res = await ctx.api().delete(`/api/v1/me/sessions/${bob.sessionId}`).set(bearer(alice.access));
    expect(res.status).toBe(404);
    expect((await ctx.api().get("/api/v1/me").set(bearer(bob.access))).status).toBe(200);
    const list = await ctx.api().get("/api/v1/me/sessions").set(bearer(alice.access));
    expect(list.body.items.map((x: { id: string }) => x.id)).toEqual([alice.sessionId]);
  });

  it("a session cannot outlive its absolute limit, even by refreshing", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "old@example.com");
    const s = ctx.store.sessions.get(a.sessionId)!;
    ctx.store.sessions.put(s.id, { ...s, expiresAt: new Date(Date.now() - 1000) });
    expect((await ctx.api().post("/api/v1/auth/refresh").send({ refreshToken: a.refresh })).body.error.code).toBe("TOKEN_EXPIRED");
    expect((await ctx.api().get("/api/v1/me").set(bearer(a.access))).body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("records session events in the audit trail", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "trail@example.com");
    const b = await login(ctx, "trail@example.com");
    await ctx.api().delete(`/api/v1/me/sessions/${b.sessionId}`).set(bearer(a.access));
    await ctx.api().post("/api/v1/auth/logout").set(bearer(a.access)).send({});
    const actions = ctx.store.audit.all().filter((e) => e.actorUserId === a.userId).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["session.created", "session.revoked", "session.logout"]));
  });
});
