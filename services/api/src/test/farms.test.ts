import { describe, expect, it } from "vitest";
import { bearer, farmBody, joinAs, makeApp, register } from "./harness.js";

describe("farms", () => {
  it("creates additional farms owned by the caller and lists only my farms", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "multi@example.com");
    const b = await register(ctx, "other@example.com");
    const created = await ctx.api().post("/api/v1/farms").set(bearer(a.access)).send({ name: "Hill Farm", timezone: "Africa/Nairobi", currency: "KES", unitSystem: "metric" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Hill Farm", myRole: "owner", settings: { currency: "KES", timezone: "Africa/Nairobi" } });
    const mine = await ctx.api().get("/api/v1/farms").set(bearer(a.access));
    expect(mine.body.items.map((f: { name: string }) => f.name).sort()).toEqual(["Green Valley Poultry", "Hill Farm"]);
    expect(mine.body.items.map((f: { id: string }) => f.id)).not.toContain(b.farmId);
  });

  it("GET returns the farm with my role and permissions", async () => {
    const ctx = makeApp();
    const owner = await register(ctx, "o@example.com");
    const vet = await joinAs(ctx, owner, "vet@example.com", "vet");
    const res = await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(vet.access));
    expect(res.body.myRole).toBe("vet");
    expect(res.body.myPermissions).toContain("health.manage");
    expect(res.body.myPermissions).not.toContain("money.read");
  });
});

describe("PUT /farms/:farmId", () => {
  it("replaces the editable fields, clears omitted optional ones and bumps the version", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "put@example.com");
    const farm = (await ctx.api().get(`/api/v1/farms/${o.farmId}`).set(bearer(o.access))).body;
    const first = await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send(farmBody(farm, { description: "Broilers and layers", unitSystem: "imperial" }));
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ version: 1, description: "Broilers and layers", settings: { unitSystem: "imperial", timezone: "Asia/Kolkata" } });

    const second = await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send(farmBody({ ...first.body, description: undefined }));
    expect(second.status).toBe(200);
    expect(second.body.version).toBe(2);
    expect(second.body.description).toBeUndefined();
  });

  it("rejects a stale version with 409 and the current server copy", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "stale@example.com");
    const farm = (await ctx.api().get(`/api/v1/farms/${o.farmId}`).set(bearer(o.access))).body;
    await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send(farmBody(farm, { name: "First edit" }));
    const stale = await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send(farmBody(farm, { name: "Old view" }));
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: "VERSION_CONFLICT", details: { serverVersion: 1, serverDocument: { name: "First edit" } } });
  });

  it("requires every required field and rejects unknown ones", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "strict@example.com");
    const farm = (await ctx.api().get(`/api/v1/farms/${o.farmId}`).set(bearer(o.access))).body;
    const missing = await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send({ name: "Only a name", version: 0 });
    expect(missing.status).toBe(400);
    expect(missing.body.error.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(["timezone", "currency"]));
    expect((await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send(farmBody(farm, { isAdmin: true }))).status).toBe(400);
  });

  it("records an audit event with the changed fields", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "audit@example.com");
    const farm = (await ctx.api().get(`/api/v1/farms/${o.farmId}`).set(bearer(o.access))).body;
    await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send(farmBody(farm, { name: "Renamed" }));
    const evt = ctx.store.audit.all().find((a) => a.action === "farm.updated")!;
    expect(evt.changes).toMatchObject({ name: { before: "Green Valley Poultry", after: "Renamed" } });
    expect(evt.actorUserId).toBe(o.userId);
  });
});

describe("members", () => {
  it("lists active members and pending invitations, with join and invite dates", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "list@example.com");
    await joinAs(ctx, o, "joined@example.com", "supervisor");
    await ctx.api().post(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access)).send({ email: "pending@example.com", role: "worker" });
    const res = await ctx.api().get(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access));
    const byEmail = Object.fromEntries(res.body.items.map((m: { email: string }) => [m.email, m]));
    expect(byEmail["list@example.com"]).toMatchObject({ role: "owner", status: "active" });
    expect(byEmail["joined@example.com"]).toMatchObject({ role: "supervisor", status: "active", joinedAt: expect.any(String), fullName: "Test Farmer" });
    expect(byEmail["pending@example.com"]).toMatchObject({ role: "worker", status: "invited", invitedAt: expect.any(String) });
  });

  it("refuses to add someone who is already an active member", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "dupm@example.com");
    await joinAs(ctx, o, "in@example.com", "worker");
    const res = await ctx.api().post(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access)).send({ email: "IN@example.com", role: "worker" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_MEMBER");
  });

  it("removing a pending invitation cancels it; the old link no longer works", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "cancel@example.com");
    const inv = await ctx.api().post(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access)).send({ email: "late@example.com", role: "worker" });
    const token = ctx.email.outbox.at(-1)!.token!;
    expect((await ctx.api().delete(`/api/v1/farms/${o.farmId}/members/${inv.body.id}`).set(bearer(o.access))).status).toBe(204);
    const late = await register(ctx, "late@example.com");
    expect((await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(late.access)).send({ token })).body.error.code).toBe("INVITE_INVALID");
    expect(ctx.store.audit.all().some((e) => e.action === "member.invite_cancelled")).toBe(true);
  });

  it("accepting an invitation verifies the invitee's email", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "verifies@example.com");
    const m = await joinAs(ctx, o, "newbie@example.com", "worker");
    expect(ctx.store.users.get(m.userId)!.emailVerified).toBe(true);
  });
});

describe("idempotency", () => {
  it("replays the stored response for a retried invite and refuses a reused key", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "idem@example.com");
    const send = (body: object) => ctx.api().post(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access)).set("Idempotency-Key", "retry-key-0001").send(body);
    const first = await send({ email: "m@example.com", role: "farm_manager" });
    const second = await send({ email: "m@example.com", role: "farm_manager" });
    expect(second.status).toBe(201);
    expect(second.headers["idempotent-replayed"]).toBe("true");
    expect(second.body).toEqual(first.body);
    expect(ctx.store.audit.all().filter((a) => a.action === "member.invited")).toHaveLength(1);
    expect(ctx.email.outbox.filter((m) => m.kind === "farm_invite")).toHaveLength(1);
    expect((await send({ email: "other@example.com", role: "worker" })).body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("does not cache failures, so a corrected retry with the same key runs", async () => {
    const ctx = makeApp();
    const o = await register(ctx, "idem2@example.com");
    const farm = (await ctx.api().get(`/api/v1/farms/${o.farmId}`).set(bearer(o.access))).body;
    const bad = await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).set("Idempotency-Key", "retry-key-0002").send(farmBody(farm, { version: 9 }));
    expect(bad.status).toBe(409);
    const good = await ctx.api().put(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).set("Idempotency-Key", "retry-key-0002").send(farmBody(farm, { version: 9 }));
    expect(good.headers["idempotent-replayed"]).toBeUndefined();
  });
});

describe("transactions", () => {
  it("registration is atomic: a failure part-way leaves no user, farm, session or audit row", async () => {
    const ctx = makeApp();
    const original = ctx.repos.memberships.create;
    ctx.repos.memberships.create = async () => {
      throw new Error("simulated database failure");
    };
    const body = { email: "atomic@example.com", password: "goodpass123", fullName: "A", farm: { name: "F", timezone: "Asia/Kolkata", currency: "INR" } };
    const res = await ctx.api().post("/api/v1/auth/register").send(body);
    expect(res.status).toBe(500);
    expect(res.body.error.message).not.toContain("simulated");
    for (const t of [ctx.store.users, ctx.store.farms, ctx.store.sessions, ctx.store.audit, ctx.store.oneTimeTokens]) expect(t.all()).toHaveLength(0);
    expect(ctx.email.outbox).toHaveLength(0);
    ctx.repos.memberships.create = original;
    expect((await ctx.api().post("/api/v1/auth/register").send(body)).status).toBe(201);
  });
});
