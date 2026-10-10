import mongoose from "mongoose";
import { pino } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMemoryRepositories } from "../adapters/memory/index.js";
import { createMongoRepositories } from "../adapters/mongo/index.js";
import { createMongo } from "../db/mongo.js";
import { newId } from "../lib/util.js";
import type { FarmRecord, MembershipRecord, SessionRecord, UserRecord } from "../ports/records.js";
import type { Repositories } from "../ports/repositories.js";

/**
 * The same behavioural contract, run against every repository adapter. The memory adapter always runs;
 * the MongoDB adapter runs when MONGODB_TEST_URI is set (CI runs it against MongoDB 7).
 * Transactions are not exercised here: they are covered by service tests and need a replica set.
 */
const now = new Date("2026-10-10T09:00:00.000Z");
const later = new Date("2026-10-10T10:00:00.000Z");

const user = (email: string): UserRecord => ({
  id: newId(), email, fullName: "U", passwordHash: "h", emailVerified: false, status: "active", failedLoginCount: 0, createdAt: now, updatedAt: now, version: 0,
});
const session = (userId: string, over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: newId(), userId, platform: "web", authMethod: "password", createdAt: now, lastUsedAt: now, expiresAt: new Date("2027-01-01T00:00:00Z"), ...over,
});
const farm = (): FarmRecord => ({
  id: newId(), name: "F", settings: { timezone: "Asia/Kolkata", currency: "INR", unitSystem: "metric", fcrIncludesMortalityWeight: false, workerEditWindowDays: 1 },
  createdBy: "u", createdAt: now, updatedAt: now, version: 0,
});
const member = (farmId: string, over: Partial<MembershipRecord> = {}): MembershipRecord => ({
  id: newId(), farmId, userId: newId(), email: `${newId()}@example.com`, role: "worker", status: "active", createdAt: now, updatedAt: now, version: 0, ...over,
});

function contract(name: string, setup: () => Promise<{ repos: Repositories; reset: () => Promise<void>; teardown?: () => Promise<void> }>) {
  describe(`repository contract: ${name}`, () => {
    let repos: Repositories;
    let reset: () => Promise<void>;
    let teardown: (() => Promise<void>) | undefined;
    beforeAll(async () => ({ repos, reset, teardown } = await setup()));
    beforeEach(async () => reset());
    afterAll(async () => teardown?.());

    it("users: create, find by email and Google id, update bumps version, clears with undefined, unique email", async () => {
      const u = user("a@example.com");
      await repos.users.create(u);
      expect((await repos.users.findByEmail("A@EXAMPLE.COM"))?.id).toBe(u.id);
      const next = await repos.users.update(u.id, { googleSub: "g-1", lockedUntil: later, updatedAt: later });
      expect(next).toMatchObject({ version: 1, googleSub: "g-1" });
      expect((await repos.users.findByGoogleSub("g-1"))?.id).toBe(u.id);
      const cleared = await repos.users.update(u.id, { lockedUntil: undefined });
      expect(cleared?.lockedUntil).toBeUndefined();
      await expect(repos.users.create(user("a@example.com"))).rejects.toMatchObject({ code: 11000 });
    });

    it("sessions: list, touch, revoke one, revoke all except the current", async () => {
      const uid = newId();
      const [a, b, c] = [session(uid), session(uid), session(uid)];
      for (const s of [a, b, c, session(newId())]) await repos.sessions.create(s);
      expect(await repos.sessions.listForUser(uid)).toHaveLength(3);
      await repos.sessions.touch(a.id, later);
      expect((await repos.sessions.findById(a.id))?.lastUsedAt.toISOString()).toBe(later.toISOString());
      await repos.sessions.revoke(b.id, later, "logout");
      expect(await repos.sessions.findById(b.id)).toMatchObject({ revokedReason: "logout" });
      expect(await repos.sessions.revokeAllForUser(uid, later, "password_changed", a.id)).toBe(1);
      expect((await repos.sessions.findById(a.id))?.revokedAt).toBeUndefined();
      expect((await repos.sessions.findById(c.id))?.revokedReason).toBe("password_changed");
      expect((await repos.sessions.findById(b.id))?.revokedReason).toBe("logout");
    });

    it("refresh and one-time tokens: find by hash, mark replaced/used, invalidate by purpose", async () => {
      const uid = newId();
      await repos.refreshTokens.create({ id: "r1", sessionId: "s1", userId: uid, tokenHash: "hash-1", expiresAt: later, createdAt: now });
      await repos.refreshTokens.update("r1", { replacedById: "r2" });
      expect(await repos.refreshTokens.findByHash("hash-1")).toMatchObject({ sessionId: "s1", replacedById: "r2" });

      const ott = (id: string, purpose: "password_reset" | "email_verification") => ({ id, userId: uid, purpose, tokenHash: `t-${id}`, email: "a@example.com", expiresAt: later, createdAt: now });
      await repos.oneTimeTokens.create(ott("o1", "password_reset"));
      await repos.oneTimeTokens.create(ott("o2", "email_verification"));
      await repos.oneTimeTokens.invalidateForUser(uid, "password_reset", later);
      expect((await repos.oneTimeTokens.findByHash("t-o1"))?.usedAt).toBeDefined();
      expect((await repos.oneTimeTokens.findByHash("t-o2"))?.usedAt).toBeUndefined();
    });

    it("farms: optimistic update succeeds once per version and clears omitted fields", async () => {
      const f = { ...farm(), description: "old" };
      await repos.farms.create(f);
      const next = await repos.farms.updateVersioned(f.id, 0, { name: "New", description: undefined });
      expect(next).toMatchObject({ version: 1, name: "New" });
      expect(next?.description).toBeUndefined();
      expect(await repos.farms.updateVersioned(f.id, 0, { name: "Stale" })).toBeNull();
      expect((await repos.farms.findById(f.id))?.name).toBe("New");
    });

    it("memberships: every lookup is scoped to its farm", async () => {
      const [farmA, farmB] = [newId(), newId()];
      const owner = member(farmA, { role: "owner" });
      const invited = member(farmA, { status: "invited", userId: undefined, inviteTokenHash: "inv-1", inviteExpiresAt: later });
      const other = member(farmB);
      for (const m of [owner, invited, other]) await repos.memberships.create(m);

      expect(await repos.memberships.findById(farmA, other.id)).toBeNull();
      expect(await repos.memberships.update(farmA, other.id, { role: "owner" })).toBeNull();
      expect((await repos.memberships.findById(farmB, other.id))?.role).toBe("worker");
      expect((await repos.memberships.findActive(farmA, owner.userId!))?.id).toBe(owner.id);
      expect(await repos.memberships.findActive(farmB, owner.userId!)).toBeNull();
      expect(await repos.memberships.countActiveOwners(farmA)).toBe(1);
      expect((await repos.memberships.findByFarm(farmA)).map((m) => m.id).sort()).toEqual([owner.id, invited.id].sort());
      expect((await repos.memberships.findByInviteHash("inv-1"))?.id).toBe(invited.id);

      const joined = await repos.memberships.update(farmA, invited.id, { status: "active", userId: "u-9", inviteTokenHash: undefined });
      expect(joined).toMatchObject({ status: "active", version: 1 });
      expect(joined?.inviteTokenHash).toBeUndefined();
      expect((await repos.memberships.findActiveForUser("u-9")).map((m) => m.id)).toEqual([invited.id]);
    });

    it("sync: per-farm sequences are independent and changes list in order", async () => {
      const [a, b] = [newId(), newId()];
      expect([await repos.sync.nextSeq(a), await repos.sync.nextSeq(a), await repos.sync.nextSeq(b)]).toEqual([1, 2, 1]);
      for (const seq of [2, 1]) await repos.sync.insertChange({ farmId: a, seq, entity: "farm", entityId: a, op: "upsert", version: seq, at: now });
      expect((await repos.sync.listSince(a, 0, 10)).map((c) => c.seq)).toEqual([1, 2]);
      expect((await repos.sync.listSince(a, 1, 10)).map((c) => c.seq)).toEqual([2]);
      expect(await repos.sync.listSince(b, 0, 10)).toEqual([]);
    });
  });
}

contract("memory", async () => {
  let current = createMemoryRepositories();
  const proxy = new Proxy({} as Repositories, { get: (_t, k) => current.repos[k as keyof Repositories] });
  return { repos: proxy, reset: async () => void (current = createMemoryRepositories()) };
});

const uri = process.env["MONGODB_TEST_URI"];
if (uri) {
  contract("mongodb", async () => {
    const mongo = createMongo({ uri, serverSelectionTimeoutMS: 3000, maxPoolSize: 5, retries: 0, autoIndex: false }, pino({ level: "silent" }));
    await mongo.connect();
    // Create indexes one by one. FerretDB (used for local checks without Docker) lacks TTL indexes;
    // skip only "not implemented" options so unique indexes are still enforced. Real MongoDB creates all.
    for (const model of Object.values(mongoose.models)) {
      for (const [fields, options] of model.schema.indexes()) {
        try {
          await model.collection.createIndex(fields as Record<string, 1 | -1>, options as Record<string, unknown>);
        } catch (err) {
          if (!/not implemented/i.test((err as Error).message)) throw err;
        }
      }
    }
    return {
      repos: createMongoRepositories(mongo.connection),
      reset: async () => {
        // deleteMany with {} would trip the tenancy plugin on farm-scoped models, which is the point of it.
        for (const m of Object.values(mongoose.models)) await m.collection.deleteMany({});
      },
      teardown: () => mongo.disconnect(),
    };
  });
}
