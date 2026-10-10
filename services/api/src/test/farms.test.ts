import { describe, expect, it } from "vitest";
import { bearer, makeApp, register } from "./harness.js";

async function inviteAndJoin(ctx: ReturnType<typeof makeApp>, owner: { farmId: string; access: string }, email: string, role: string) {
  const inv = await ctx.api().post(`/api/v1/farms/${owner.farmId}/members`).set(bearer(owner.access)).send({ email, role });
  expect(inv.status).toBe(201);
  const token = ctx.email.outbox.at(-1)!.token!;
  const member = await register(ctx.api, email, "Ravi Worker");
  const acc = await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(member.access)).send({ token });
  expect(acc.status).toBe(200);
  return { ...member, membershipId: acc.body.id as string };
}

describe("Phase 1 gate: invited Worker is refused an Owner-only action", () => {
  it("worker can read the farm but cannot change settings or invite", async () => {
    const ctx = makeApp();
    const owner = await register(ctx.api, "owner@example.com");
    const worker = await inviteAndJoin(ctx, owner, "worker@example.com", "worker");

    const farms = await ctx.api().get("/api/v1/farms").set(bearer(worker.access));
    const shared = farms.body.items.find((f: { id: string }) => f.id === owner.farmId);
    expect(shared.myRole).toBe("worker");
    expect(shared.myPermissions).toContain("production.record");
    expect(shared.myPermissions).not.toContain("farm.update_settings");

    const patch = await ctx.api().patch(`/api/v1/farms/${owner.farmId}`).set(bearer(worker.access)).send({ name: "Mine now", version: 0 });
    expect(patch.status).toBe(403);
    expect(patch.body.error.code).toBe("FORBIDDEN");

    const invite = await ctx.api().post(`/api/v1/farms/${owner.farmId}/members`).set(bearer(worker.access)).send({ email: "x@example.com", role: "owner" });
    expect(invite.status).toBe(403);

    const audit = await ctx.api().get(`/api/v1/farms/${owner.farmId}/audit`).set(bearer(worker.access));
    expect(audit.status).toBe(403);

    const ownerAudit = await ctx.api().get(`/api/v1/farms/${owner.farmId}/audit`).set(bearer(owner.access));
    expect(ownerAudit.body.items.map((a: { action: string }) => a.action)).toEqual(
      expect.arrayContaining(["farm.created", "member.invited", "member.joined"]),
    );
  });

  it("an invitation only works for the invited email, once", async () => {
    const ctx = makeApp();
    const owner = await register(ctx.api, "owner2@example.com");
    await ctx.api().post(`/api/v1/farms/${owner.farmId}/members`).set(bearer(owner.access)).send({ email: "vet@example.com", role: "veterinarian" });
    const token = ctx.email.outbox.at(-1)!.token!;
    const stranger = await register(ctx.api, "stranger@example.com");
    const wrong = await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(stranger.access)).send({ token });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.code).toBe("INVITE_INVALID");
  });
});

describe("tenancy", () => {
  it("a non-member gets 404 for another farm, not 403, on every farm route", async () => {
    const ctx = makeApp();
    const a = await register(ctx.api, "a@example.com");
    const b = await register(ctx.api, "b@example.com");
    for (const [method, path] of [
      ["get", `/api/v1/farms/${a.farmId}`],
      ["get", `/api/v1/farms/${a.farmId}/members`],
      ["get", `/api/v1/farms/${a.farmId}/audit`],
      ["get", `/api/v1/sync/pull?farmId=${a.farmId}`],
    ] as const) {
      const res = await ctx.api()[method](path).set(bearer(b.access));
      expect(res.status, path).toBe(404);
    }
    const push = await ctx
      .api()
      .post("/api/v1/sync/push")
      .set(bearer(b.access))
      .send({ farmId: a.farmId, deviceId: "d1", mutations: [{ mutationId: "0192a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b", command: "farm.update", payload: { name: "x" }, baseVersion: 0, clientCreatedAt: new Date().toISOString() }] });
    expect(push.status).toBe(404);
  });
});

describe("farm settings", () => {
  it("updates with optimistic concurrency and records an audit diff", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "o@example.com");
    const ok = await ctx.api().patch(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send({ unitSystem: "imperial", version: 0 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ version: 1, settings: { unitSystem: "imperial", timezone: "Asia/Kolkata" } });

    const stale = await ctx.api().patch(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send({ name: "Old view", version: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: "VERSION_CONFLICT", details: { serverVersion: 1 } });

    const evt = ctx.store.audit.all().find((a) => a.action === "farm.updated")!;
    expect(evt.changes).toEqual({ settings: { before: expect.objectContaining({ unitSystem: "metric" }), after: expect.objectContaining({ unitSystem: "imperial" }) } });
  });

  it("rejects unknown fields instead of silently storing them", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "strict@example.com");
    const res = await ctx.api().patch(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).send({ version: 0, isAdmin: true });
    expect(res.status).toBe(400);
  });
});

describe("membership rules", () => {
  it("a farm always keeps at least one owner", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "solo@example.com");
    const members = await ctx.api().get(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access));
    const me = members.body.items[0];
    const demote = await ctx.api().patch(`/api/v1/farms/${o.farmId}/members/${me.id}`).set(bearer(o.access)).send({ role: "manager" });
    expect(demote.status).toBe(422);
    expect(demote.body.error.code).toBe("LAST_OWNER");
    const remove = await ctx.api().delete(`/api/v1/farms/${o.farmId}/members/${me.id}`).set(bearer(o.access));
    expect(remove.body.error.code).toBe("LAST_OWNER");
  });

  it("removed members lose access immediately", async () => {
    const ctx = makeApp();
    const owner = await register(ctx.api, "boss@example.com");
    const w = await inviteAndJoin(ctx, owner, "temp@example.com", "worker");
    expect((await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(w.access))).status).toBe(200);
    expect((await ctx.api().delete(`/api/v1/farms/${owner.farmId}/members/${w.membershipId}`).set(bearer(owner.access))).status).toBe(204);
    expect((await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(w.access))).status).toBe(404);
  });
});

describe("transactions", () => {
  it("registration is atomic: a failure mid-way leaves no user behind", async () => {
    const ctx = makeApp();
    const original = ctx.repos.memberships.create;
    ctx.repos.memberships.create = async () => {
      throw new Error("simulated database failure");
    };
    const res = await ctx.api().post("/api/v1/auth/register").send({ email: "atomic@example.com", password: "goodpass123", fullName: "A", farm: { name: "F", timezone: "Asia/Kolkata", currency: "INR" } });
    expect(res.status).toBe(500);
    expect(res.body.error.message).not.toContain("simulated");
    expect(ctx.store.users.all()).toHaveLength(0);
    expect(ctx.store.farms.all()).toHaveLength(0);
    expect(ctx.store.audit.all()).toHaveLength(0);
    ctx.repos.memberships.create = original;
    expect((await ctx.api().post("/api/v1/auth/register").send({ email: "atomic@example.com", password: "goodpass123", fullName: "A", farm: { name: "F", timezone: "Asia/Kolkata", currency: "INR" } })).status).toBe(201);
  });
});

describe("idempotency", () => {
  it("replays the stored response for a retried write and refuses a reused key", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "idem@example.com");
    const send = (body: object) =>
      ctx.api().post(`/api/v1/farms/${o.farmId}/members`).set(bearer(o.access)).set("Idempotency-Key", "retry-key-0001").send(body);
    const first = await send({ email: "m@example.com", role: "manager" });
    const second = await send({ email: "m@example.com", role: "manager" });
    expect(second.status).toBe(201);
    expect(second.headers["idempotent-replayed"]).toBe("true");
    expect(second.body).toEqual(first.body);
    expect(ctx.store.audit.all().filter((a) => a.action === "member.invited")).toHaveLength(1);
    expect(ctx.email.outbox).toHaveLength(1);

    const reused = await send({ email: "other@example.com", role: "worker" });
    expect(reused.status).toBe(422);
    expect(reused.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("does not cache failures, so a corrected retry with the same key can succeed", async () => {
    const ctx = makeApp();
    const o = await register(ctx.api, "idem2@example.com");
    const first = await ctx.api().patch(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).set("Idempotency-Key", "retry-key-0002").send({ name: "N", version: 9 });
    expect(first.status).toBe(409);
    const again = await ctx.api().patch(`/api/v1/farms/${o.farmId}`).set(bearer(o.access)).set("Idempotency-Key", "retry-key-0002").send({ name: "N", version: 9 });
    expect(again.headers["idempotent-replayed"]).toBeUndefined();
  });
});
