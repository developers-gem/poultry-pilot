import type { Role } from "@poultrypilot/constants";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler, requireRole } from "../http/middleware/core.js";
import { pino } from "pino";
import { newId } from "../lib/util.js";
import { bearer, farmBody, joinAs, makeApp, register, type Ctx } from "./harness.js";

const ROLES: Role[] = ["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"];

/** A farm with its owner, plus one member in `role` (or the owner themselves). */
async function farmWith(role: Role) {
  const ctx = makeApp();
  const owner = await register(ctx, "owner@example.com");
  const actor = role === "owner" ? owner : await joinAs(ctx, owner, `${role}@example.com`, role);
  const farm = (await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(owner.access))).body;
  return { ctx, owner, actor, farm, farmId: owner.farmId };
}

/**
 * Expected HTTP status per role, written out by hand. This is the specification; it deliberately does not
 * read ROLE_PERMISSIONS, so a wrong change to the permission map fails here.
 */
const MATRIX: { name: string; expect: Record<Role, number>; call: (f: Awaited<ReturnType<typeof farmWith>>) => Promise<number> }[] = [
  {
    name: "GET /farms/:farmId",
    expect: { owner: 200, admin: 200, farm_manager: 200, supervisor: 200, worker: 200, accountant: 200, vet: 200 },
    call: async (f) => (await f.ctx.api().get(`/api/v1/farms/${f.farmId}`).set(bearer(f.actor.access))).status,
  },
  {
    name: "PUT /farms/:farmId",
    expect: { owner: 200, admin: 200, farm_manager: 403, supervisor: 403, worker: 403, accountant: 403, vet: 403 },
    call: async (f) => (await f.ctx.api().put(`/api/v1/farms/${f.farmId}`).set(bearer(f.actor.access)).send(farmBody(f.farm, { name: "Renamed" }))).status,
  },
  {
    name: "GET /farms/:farmId/members",
    expect: { owner: 200, admin: 200, farm_manager: 200, supervisor: 200, worker: 403, accountant: 403, vet: 403 },
    call: async (f) => (await f.ctx.api().get(`/api/v1/farms/${f.farmId}/members`).set(bearer(f.actor.access))).status,
  },
  {
    name: "POST /farms/:farmId/members (worker)",
    expect: { owner: 201, admin: 201, farm_manager: 201, supervisor: 403, worker: 403, accountant: 403, vet: 403 },
    call: async (f) => (await f.ctx.api().post(`/api/v1/farms/${f.farmId}/members`).set(bearer(f.actor.access)).send({ email: "new@example.com", role: "worker" })).status,
  },
  {
    name: "GET /farms/:farmId/audit",
    expect: { owner: 200, admin: 200, farm_manager: 200, supervisor: 403, worker: 403, accountant: 403, vet: 403 },
    call: async (f) => (await f.ctx.api().get(`/api/v1/farms/${f.farmId}/audit`).set(bearer(f.actor.access))).status,
  },
];

describe("role × endpoint authorization matrix", () => {
  for (const row of MATRIX) {
    it(row.name, async () => {
      const actual: Partial<Record<Role, number>> = {};
      for (const role of ROLES) actual[role] = await row.call(await farmWith(role));
      expect(actual).toEqual(row.expect);
    });
  }

  it("forbidden responses use the FORBIDDEN error code and change nothing", async () => {
    const f = await farmWith("worker");
    const res = await f.ctx.api().put(`/api/v1/farms/${f.farmId}`).set(bearer(f.actor.access)).send(farmBody(f.farm, { name: "Hijacked" }));
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(f.ctx.store.farms.get(f.farmId)!.name).toBe(f.farm.name);
  });
});

describe("role hierarchy for member management", () => {
  const roleOf = (ctx: Ctx, memberId: string) => ctx.store.memberships.get(memberId)!.role;

  it("a farm manager can add roles below their own, never equal or above", async () => {
    const f = await farmWith("farm_manager");
    const add = (role: Role) => f.ctx.api().post(`/api/v1/farms/${f.farmId}/members`).set(bearer(f.actor.access)).send({ email: `${role}-x@example.com`, role });
    expect((await add("supervisor")).status).toBe(201);
    expect((await add("vet")).status).toBe(201);
    for (const role of ["farm_manager", "admin", "owner"] as Role[]) {
      const res = await add(role);
      expect(res.status, role).toBe(403);
      expect(res.body.error.code).toBe("ROLE_HIERARCHY");
    }
  });

  it("an admin can promote a worker to farm manager, but not to admin, and cannot touch owners", async () => {
    const f = await farmWith("admin");
    const w = await joinAs(f.ctx, f.owner, "w@example.com", "worker");
    const put = (memberId: string, role: Role) => f.ctx.api().put(`/api/v1/farms/${f.farmId}/members/${memberId}`).set(bearer(f.actor.access)).send({ role });
    expect((await put(w.memberId, "farm_manager")).status).toBe(200);
    expect((await put(w.memberId, "admin")).body.error.code).toBe("ROLE_HIERARCHY");

    const ownerMember = f.ctx.store.memberships.all().find((m) => m.role === "owner")!;
    expect((await put(ownerMember.id, "worker")).body.error.code).toBe("ROLE_HIERARCHY");
    expect((await f.ctx.api().delete(`/api/v1/farms/${f.farmId}/members/${ownerMember.id}`).set(bearer(f.actor.access))).body.error.code).toBe("ROLE_HIERARCHY");
    expect(roleOf(f.ctx, ownerMember.id)).toBe("owner");
  });

  it("a farm manager cannot change or remove another farm manager or an admin", async () => {
    const f = await farmWith("farm_manager");
    const peer = await joinAs(f.ctx, f.owner, "peer@example.com", "farm_manager");
    const admin = await joinAs(f.ctx, f.owner, "adm@example.com", "admin");
    for (const m of [peer, admin]) {
      expect((await f.ctx.api().put(`/api/v1/farms/${f.farmId}/members/${m.memberId}`).set(bearer(f.actor.access)).send({ role: "worker" })).status).toBe(403);
      expect((await f.ctx.api().delete(`/api/v1/farms/${f.farmId}/members/${m.memberId}`).set(bearer(f.actor.access))).status).toBe(403);
    }
  });

  it("nobody can change their own role", async () => {
    for (const role of ["owner", "admin"] as Role[]) {
      const f = await farmWith(role);
      const self = f.ctx.store.memberships.all().find((m) => m.userId === f.actor.userId)!;
      const res = await f.ctx.api().put(`/api/v1/farms/${f.farmId}/members/${self.id}`).set(bearer(f.actor.access)).send({ role: "worker" });
      expect(res.status, role).toBe(403);
    }
  });

  it("ownership can be transferred, but a farm always keeps one owner", async () => {
    const f = await farmWith("owner");
    const ownerMember = f.ctx.store.memberships.all().find((m) => m.role === "owner")!;
    const heir = await joinAs(f.ctx, f.owner, "heir@example.com", "admin");
    expect((await f.ctx.api().delete(`/api/v1/farms/${f.farmId}/members/${ownerMember.id}`).set(bearer(f.owner.access))).body.error.code).toBe("LAST_OWNER");

    expect((await f.ctx.api().put(`/api/v1/farms/${f.farmId}/members/${heir.memberId}`).set(bearer(f.owner.access)).send({ role: "owner" })).status).toBe(200);
    // The new owner can now demote the original owner, after which the heir is the last owner.
    expect((await f.ctx.api().put(`/api/v1/farms/${f.farmId}/members/${ownerMember.id}`).set(bearer(heir.access)).send({ role: "admin" })).status).toBe(200);
    const leave = await f.ctx.api().delete(`/api/v1/farms/${f.farmId}/members/${heir.memberId}`).set(bearer(heir.access));
    expect(leave.body.error.code).toBe("LAST_OWNER");
  });

  it("any member can leave the farm, and loses access at once", async () => {
    const f = await farmWith("worker");
    const self = f.ctx.store.memberships.all().find((m) => m.userId === f.actor.userId)!;
    expect((await f.ctx.api().delete(`/api/v1/farms/${f.farmId}/members/${self.id}`).set(bearer(f.actor.access))).status).toBe(204);
    expect((await f.ctx.api().get(`/api/v1/farms/${f.farmId}`).set(bearer(f.actor.access))).status).toBe(404);
    expect(f.ctx.store.audit.all().some((e) => e.action === "member.left")).toBe(true);
  });

  it("inviting requires a verified email", async () => {
    const ctx = makeApp();
    const owner = await register(ctx, "unverified@example.com", { verify: false });
    const res = await ctx.api().post(`/api/v1/farms/${owner.farmId}/members`).set(bearer(owner.access)).send({ email: "x@example.com", role: "worker" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });
});

describe("cross-farm access attempts", () => {
  /** Alice owns farm A; Bob owns farm B. Each has their own membership id. */
  async function twoFarms() {
    const ctx = makeApp();
    const alice = await register(ctx, "alice@example.com");
    const bob = await register(ctx, "bob@example.com");
    const aliceMember = ctx.store.memberships.all().find((m) => m.userId === alice.userId)!;
    const bobMember = ctx.store.memberships.all().find((m) => m.userId === bob.userId)!;
    const farmB = (await ctx.api().get(`/api/v1/farms/${bob.farmId}`).set(bearer(bob.access))).body;
    return { ctx, alice, bob, aliceMember, bobMember, farmB };
  }

  it("a non-member gets 404 — not 403 — on every farm route, and nothing changes", async () => {
    const { ctx, alice, bob, bobMember, farmB } = await twoFarms();
    const B = bob.farmId;
    const attempts: [string, () => Promise<{ status: number }>][] = [
      ["GET farm", () => ctx.api().get(`/api/v1/farms/${B}`).set(bearer(alice.access))],
      ["PUT farm", () => ctx.api().put(`/api/v1/farms/${B}`).set(bearer(alice.access)).send(farmBody(farmB, { name: "Pwned" }))],
      ["GET members", () => ctx.api().get(`/api/v1/farms/${B}/members`).set(bearer(alice.access))],
      ["POST member", () => ctx.api().post(`/api/v1/farms/${B}/members`).set(bearer(alice.access)).send({ email: "alice@example.com", role: "owner" })],
      ["PUT member", () => ctx.api().put(`/api/v1/farms/${B}/members/${bobMember.id}`).set(bearer(alice.access)).send({ role: "worker" })],
      ["DELETE member", () => ctx.api().delete(`/api/v1/farms/${B}/members/${bobMember.id}`).set(bearer(alice.access))],
      ["GET audit", () => ctx.api().get(`/api/v1/farms/${B}/audit`).set(bearer(alice.access))],
      ["sync pull", () => ctx.api().get(`/api/v1/sync/pull?farmId=${B}`).set(bearer(alice.access))],
      [
        "sync push",
        () =>
          ctx
            .api()
            .post("/api/v1/sync/push")
            .set(bearer(alice.access))
            .send({ farmId: B, deviceId: "d1", mutations: [{ mutationId: newId(), command: "farm.update", payload: {}, baseVersion: 0, clientCreatedAt: new Date().toISOString() }] }),
      ],
    ];
    for (const [name, attempt] of attempts) expect((await attempt()).status, name).toBe(404);
    expect(ctx.store.farms.get(B)!.name).toBe(farmB.name);
    expect(ctx.store.memberships.get(bobMember.id)!.role).toBe("owner");
    expect(ctx.store.memberships.all().filter((m) => m.farmId === B)).toHaveLength(1);
  });

  it("a non-member cannot tell a real farm from a made-up id", async () => {
    const { ctx, alice, bob } = await twoFarms();
    const real = await ctx.api().get(`/api/v1/farms/${bob.farmId}`).set(bearer(alice.access));
    const fake = await ctx.api().get(`/api/v1/farms/${newId()}`).set(bearer(alice.access));
    expect(real.status).toBe(fake.status);
    expect(real.body.error.message).toBe(fake.body.error.message);
  });

  it("another farm's member id in your own farm's URL is not found", async () => {
    const { ctx, alice, bob, bobMember } = await twoFarms();
    const put = await ctx.api().put(`/api/v1/farms/${alice.farmId}/members/${bobMember.id}`).set(bearer(alice.access)).send({ role: "worker" });
    const del = await ctx.api().delete(`/api/v1/farms/${alice.farmId}/members/${bobMember.id}`).set(bearer(alice.access));
    expect(put.status).toBe(404);
    expect(del.status).toBe(404);
    expect(put.body.error.message).toBe("Member not found");
    expect(ctx.store.memberships.get(bobMember.id)).toMatchObject({ role: "owner", status: "active", farmId: bob.farmId });
  });

  it("your own member id in another farm's URL is not found", async () => {
    const { ctx, alice, bob, aliceMember } = await twoFarms();
    const res = await ctx.api().delete(`/api/v1/farms/${bob.farmId}/members/${aliceMember.id}`).set(bearer(alice.access));
    expect(res.status).toBe(404);
    expect(ctx.store.memberships.get(aliceMember.id)!.status).toBe("active");
  });

  it("being owner of one farm grants nothing on another farm where you are a worker", async () => {
    const { ctx, alice, bob, farmB } = await twoFarms();
    // Bob invites Alice into farm B as a worker. Alice still owns farm A.
    await ctx.api().post(`/api/v1/farms/${bob.farmId}/members`).set(bearer(bob.access)).send({ email: "alice@example.com", role: "worker" });
    const token = [...ctx.email.outbox].reverse().find((m) => m.kind === "farm_invite")!.token!;
    await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(alice.access)).send({ token });

    expect((await ctx.api().get(`/api/v1/farms/${bob.farmId}`).set(bearer(alice.access))).body.myRole).toBe("worker");
    expect((await ctx.api().put(`/api/v1/farms/${bob.farmId}`).set(bearer(alice.access)).send(farmBody(farmB))).status).toBe(403);
    expect((await ctx.api().get(`/api/v1/farms/${alice.farmId}`).set(bearer(alice.access))).body.myRole).toBe("owner");
    const me = await ctx.api().get("/api/v1/me").set(bearer(alice.access));
    expect(me.body.memberships.map((m: { role: string }) => m.role).sort()).toEqual(["owner", "worker"]);
  });

  it("a pending invitation grants no access until it is accepted", async () => {
    const ctx = makeApp();
    const owner = await register(ctx, "boss@example.com");
    const invitee = await register(ctx, "invitee@example.com");
    await ctx.api().post(`/api/v1/farms/${owner.farmId}/members`).set(bearer(owner.access)).send({ email: "invitee@example.com", role: "admin" });
    expect((await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(invitee.access))).status).toBe(404);
  });

  it("an invitation can only be accepted by the invited email address", async () => {
    const ctx = makeApp();
    const owner = await register(ctx, "boss2@example.com");
    await ctx.api().post(`/api/v1/farms/${owner.farmId}/members`).set(bearer(owner.access)).send({ email: "vet@example.com", role: "vet" });
    const token = [...ctx.email.outbox].reverse().find((m) => m.kind === "farm_invite")!.token!;
    const stranger = await register(ctx, "stranger@example.com");
    const res = await ctx.api().post("/api/v1/farms/invitations/accept").set(bearer(stranger.access)).send({ token });
    expect(res.body.error.code).toBe("INVITE_INVALID");
    expect((await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(stranger.access))).status).toBe(404);
  });

  it("a removed member loses access on their very next request", async () => {
    const ctx = makeApp();
    const owner = await register(ctx, "owner3@example.com");
    const w = await joinAs(ctx, owner, "temp@example.com", "worker");
    expect((await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(w.access))).status).toBe(200);
    expect((await ctx.api().delete(`/api/v1/farms/${owner.farmId}/members/${w.memberId}`).set(bearer(owner.access))).status).toBe(204);
    expect((await ctx.api().get(`/api/v1/farms/${owner.farmId}`).set(bearer(w.access))).status).toBe(404);
    expect((await ctx.api().get("/api/v1/me").set(bearer(w.access))).body.memberships.map((m: { farmId: string }) => m.farmId)).not.toContain(owner.farmId);
  });

  it("malformed ids are rejected before any lookup", async () => {
    const ctx = makeApp();
    const a = await register(ctx, "ids@example.com");
    expect((await ctx.api().get("/api/v1/farms/not-a-uuid").set(bearer(a.access))).status).toBe(400);
    expect((await ctx.api().delete(`/api/v1/farms/${a.farmId}/members/123`).set(bearer(a.access))).status).toBe(400);
  });
});

describe("requireRole middleware", () => {
  it("allows listed roles and refuses others", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.farmCtx = { userId: "u", farmId: "f", membershipId: "m", role: req.header("x-role") as Role };
      next();
    });
    app.get("/x", requireRole("owner", "admin"), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler(pino({ level: "silent" })));
    expect((await request(app).get("/x").set("x-role", "admin")).status).toBe(200);
    expect((await request(app).get("/x").set("x-role", "farm_manager")).status).toBe(403);
  });
});
