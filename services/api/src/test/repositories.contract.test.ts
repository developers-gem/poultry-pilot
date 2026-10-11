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
  id: newId(), farmId, userId: newId(), email: `${newId()}@example.com`, role: "worker", status: "active", createdBy: "u-1", createdAt: now, updatedAt: now, version: 0, ...over,
});

/** What the server under test supports. FerretDB (local check without Docker) lacks partial indexes. */
interface Caps {
  partialUniqueIndexes: boolean;
  /** FerretDB 1.x computes only the first accumulator of a $group stage; MongoDB computes all. */
  multiAccumulatorGroup: boolean;
}

function contract(name: string, setup: () => Promise<{ repos: Repositories; reset: () => Promise<void>; teardown?: () => Promise<void>; caps: Caps }>) {
  describe(`repository contract: ${name}`, () => {
    let repos: Repositories;
    let reset: () => Promise<void>;
    let teardown: (() => Promise<void>) | undefined;
    let caps: Caps;
    beforeAll(async () => ({ repos, reset, teardown, caps } = await setup()));
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

    it("farm repositories: scoped reads, versioned updates, unique keys among live records, soft delete", async () => {
      const farmA = newId();
      const farmB = newId();
      const flock = (code: string, farmId = farmA) => ({
        id: newId(), farmId, houseId: "h1", name: code, flockCode: code, type: "broiler" as const, species: "chicken" as const, status: "active" as const,
        createdBy: "u1", createdAt: now, updatedAt: now, version: 0,
      });
      const a = flock("B1");
      await repos.flocks.insert(a);
      await repos.flocks.insert(flock("B1", farmB)); // same code, other farm: allowed
      if (caps.partialUniqueIndexes) await expect(repos.flocks.insert(flock("B1"))).rejects.toMatchObject({ code: 11000 });
      expect(await repos.flocks.findById(farmB, a.id)).toBeNull();

      const v1 = await repos.flocks.update(farmA, a.id, { name: "Renamed", breed: "Cobb" }, { expectedVersion: 0 });
      expect(v1).toMatchObject({ name: "Renamed", version: 1 });
      expect(await repos.flocks.update(farmA, a.id, { name: "Stale" }, { expectedVersion: 0 })).toBeNull();
      expect((await repos.flocks.update(farmA, a.id, { breed: undefined }))?.breed).toBeUndefined();

      await repos.flocks.update(farmA, a.id, { deletedAt: later, deletedBy: "u1" });
      expect(await repos.flocks.findById(farmA, a.id)).toBeNull();
      expect(await repos.flocks.find(farmA)).toEqual([]);
      if (caps.partialUniqueIndexes) await repos.flocks.insert(flock("B1")); // code free again once the old flock is deleted
    });

    it("farm repositories: find with equality, one-of, date range, sort and limit", async () => {
      const farmId = newId();
      const ev = (date: string, type: "mortality" | "cull", flockId = "f1") => ({ id: newId(), farmId, flockId, type, date, birds: 1, createdBy: "u1", createdAt: now, updatedAt: now });
      await repos.flockEvents.insertMany([ev("2026-10-03", "mortality"), ev("2026-10-01", "cull"), ev("2026-10-02", "mortality"), ev("2026-10-02", "mortality", "f2")]);
      const f1 = await repos.flockEvents.find(farmId, { where: { flockId: "f1" }, sort: [{ field: "date", dir: 1 }] });
      expect(f1.map((e) => e.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
      expect(await repos.flockEvents.find(farmId, { where: { type: ["cull"] } })).toHaveLength(1);
      expect(await repos.flockEvents.find(farmId, { range: { field: "date", from: "2026-10-02", to: "2026-10-02" } })).toHaveLength(2);
      expect(await repos.flockEvents.find(farmId, { sort: [{ field: "date", dir: -1 }], limit: 1 })).toEqual([expect.objectContaining({ date: "2026-10-03" })]);

      const rec = { id: newId(), farmId, flockId: "f1", date: "2026-10-02", houseId: "h1", flockType: "broiler" as const, photos: [], createdBy: "u1", createdAt: now, updatedAt: now, version: 0 };
      await repos.dailyRecords.insert(rec);
      if (caps.partialUniqueIndexes) await expect(repos.dailyRecords.insert({ ...rec, id: newId() })).rejects.toMatchObject({ code: 11000 });
    });

    it("farm repositories: exists filter, keyset pagination, id filters and server-side aggregation", async () => {
      const farmId = newId();
      const ev = (date: string, type: "mortality" | "cull", birds: number, flockId: string, reversalOf?: string) => ({
        id: newId(), farmId, flockId, type, date, birds, ...(reversalOf ? { reversalOf } : {}), createdBy: "u1", createdAt: now, updatedAt: now,
      });
      const a = ev("2026-10-01", "mortality", 5, "f1");
      await repos.flockEvents.insertMany([a, ev("2026-10-01", "mortality", 3, "f1"), ev("2026-10-01", "cull", 2, "f2"), ev("2026-10-02", "mortality", 4, "f2"), ev("2026-10-03", "mortality", 5, "f1", a.id)]);
      await repos.flockEvents.insert({ ...ev("2026-10-01", "mortality", 99, "f1"), farmId: newId() }); // another farm: never counted

      expect(await repos.flockEvents.find(farmId, { exists: { reversalOf: true } })).toHaveLength(1);
      expect(await repos.flockEvents.find(farmId, { exists: { reversalOf: false } })).toHaveLength(4);
      expect(await repos.flockEvents.find(farmId, { where: { id: [a.id] } as never })).toEqual([expect.objectContaining({ id: a.id })]);

      const rows = await repos.flockEvents.aggregate(farmId, { exists: { reversalOf: false }, range: { field: "date", to: "2026-10-01" } }, ["flockId", "type"], ["birds"]);
      expect(rows.map((r) => `${r.key["flockId"]}:${r.key["type"]}`).sort()).toEqual(["f1:mortality", "f2:cull"]);
      if (caps.multiAccumulatorGroup) {
        const byKey = Object.fromEntries(rows.map((r) => [`${r.key["flockId"]}:${r.key["type"]}`, [r.sums["birds"], r.count]]));
        expect(byKey).toEqual({ "f1:mortality": [8, 2], "f2:cull": [2, 1] });
        const perDay = await repos.flockEvents.aggregate(farmId, { where: { type: ["mortality"] } as never }, ["date"], ["birds"]);
        expect(Object.fromEntries(perDay.map((r) => [r.key["date"], r.sums["birds"]]))).toEqual({ "2026-10-01": 8, "2026-10-02": 4, "2026-10-03": 5 });
      }

      const rec = (date: string) => ({ id: newId(), farmId, flockId: newId(), date, houseId: "h1", flockType: "layer" as const, photos: [], createdBy: "u1", createdAt: now, updatedAt: now, version: 0 });
      const recs = [rec("2026-10-03"), rec("2026-10-02"), rec("2026-10-02"), rec("2026-10-01")];
      await repos.dailyRecords.insertMany(recs);
      const sort = [{ field: "date" as const, dir: -1 as const }, { field: "id" as const, dir: -1 as const }];
      const p1 = await repos.dailyRecords.find(farmId, { sort, limit: 2 });
      const p2 = await repos.dailyRecords.find(farmId, { sort, limit: 2, after: { date: p1[1]!.date, id: p1[1]!.id } });
      expect([...p1, ...p2].map((r) => r.id).sort()).toEqual(recs.map((r) => r.id).sort());
      expect(new Set([...p1, ...p2].map((r) => r.id)).size).toBe(4);
      expect(await repos.locateDailyRecord(recs[0]!.id)).toBe(farmId);
      await repos.dailyRecords.update(farmId, recs[0]!.id, { deletedAt: later });
      expect(await repos.locateDailyRecord(recs[0]!.id)).toBeNull();
    });

    it("inventory, feed, water, chick and alert records round-trip through their schemas", async () => {
      const farmId = newId();
      const base = { farmId, createdBy: "u1", createdAt: now, updatedAt: now };
      const item = { ...base, id: newId(), version: 0, name: "Broiler starter", category: "feed" as const, unit: "kg" as const, feed: { stage: "starter" as const, form: "crumble" as const, bagSizeKg: 50 }, reorderLevel: 200, reorderDays: 5, expiryWarningDays: 30, active: true, stock: { quantity: 0, valueMinor: 0, currency: "INR", asOf: "2026-10-01" } };
      await repos.inventoryItems.insert(item);
      const lot = { ...base, id: newId(), version: 0, itemId: item.id, receivedDate: "2026-10-01", supplier: "S", batchNumber: "B1", expiryDate: "2026-12-01", storageLocation: "Store", quantityReceived: 1000, quantityRemaining: 1000, unitCost: { amountMinor: 3000, currency: "INR" } };
      await repos.inventoryLots.insert(lot);
      await repos.inventoryTransactions.insert({ ...base, id: newId(), itemId: item.id, lotId: lot.id, type: "receipt", date: "2026-10-01", quantityDelta: 1000, valueMinor: 3_000_000, currency: "INR", sourceType: "purchase", sourceId: lot.id });
      expect((await repos.inventoryLots.update(farmId, lot.id, { quantityRemaining: 400.5 }, { expectedVersion: 0 }))?.quantityRemaining).toBe(400.5);
      expect((await repos.inventoryItems.update(farmId, item.id, { stock: { quantity: 400.5, valueMinor: 1_201_500, currency: "INR", asOf: "2026-10-02" } }, { expectedVersion: 0 }))?.stock?.quantity).toBe(400.5);
      await repos.feedConsumption.insert({ ...base, id: newId(), version: 0, flockId: "f1", feedItemId: item.id, kind: "wastage", date: "2026-10-02", quantityKg: 5, allocations: [{ lotId: lot.id, quantity: 5, costMinor: 15_000 }], cost: { amountMinor: 15_000, currency: "INR" }, reason: "Spill" });
      await repos.waterRecords.insert({ ...base, id: newId(), version: 0, flockId: "f1", date: "2026-10-02", litres: 300, source: "borehole", ph: 5.4, tdsPpm: 450, chlorinePpm: 3, qualityRating: "fair", treatment: "chlorination", flags: ["consumption_low", "ph_low"], baselineLitres: 400 });
      await repos.chickLots.insert({ ...base, id: newId(), version: 0, source: "purchased", species: "chicken", hatchDate: "2026-10-01", quantity: 3000, remaining: 3000, status: "available", unitCost: { amountMinor: 3800, currency: "INR" } });
      await repos.alerts.insert({ farmId, id: newId(), createdBy: "system", createdAt: now, updatedAt: now, version: 0, ruleType: "expiry_soon", severity: "warning", status: "open", date: "2026-10-02", title: "Expiring", message: "m", dedupKey: `expiry_soon:${lot.id}`, values: { quantity: 400.5 } });
      expect(await repos.waterRecords.find(farmId, { exists: { flags: true } })).toHaveLength(1);
      expect((await repos.alerts.find(farmId, { where: { dedupKey: `expiry_soon:${lot.id}` } }))[0]?.values).toEqual({ quantity: 400.5 });
      expect(await repos.farms.listIds()).toEqual(expect.any(Array));
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
  return { repos: proxy, reset: async () => void (current = createMemoryRepositories()), caps: { partialUniqueIndexes: true, multiAccumulatorGroup: true } };
});

/** Detects servers that compute only the first $group accumulator (FerretDB 1.x). */
async function probeMultiAccumulator(): Promise<boolean> {
  const c = mongoose.connection.collection("capability_probe");
  await c.deleteMany({});
  await c.insertMany([{ g: 1, n: 5 }, { g: 1, n: 3 }]);
  const [row] = await c.aggregate([{ $group: { _id: "$g", count: { $sum: 1 }, n: { $sum: "$n" } } }]).toArray();
  await c.drop().catch(() => undefined);
  return row?.["count"] === 2 && row?.["n"] === 8;
}

const uri = process.env["MONGODB_TEST_URI"];
if (uri) {
  contract("mongodb", async () => {
    const mongo = createMongo({ uri, serverSelectionTimeoutMS: 3000, maxPoolSize: 5, retries: 0, autoIndex: false }, pino({ level: "silent" }));
    await mongo.connect();
    // Create indexes one by one. FerretDB (used for local checks without Docker) lacks TTL, partial, 2dsphere and text indexes;
    // skip only "not implemented" options so unique indexes are still enforced. Real MongoDB creates all.
    let partialUniqueIndexes = true;
    for (const model of Object.values(mongoose.models)) {
      for (const [fields, options] of model.schema.indexes()) {
        try {
          await model.collection.createIndex(fields as Record<string, 1 | -1>, options as Record<string, unknown>);
        } catch (err) {
          if (!/not implemented|can.t find index/i.test((err as Error).message)) throw err;
          if ((options as { partialFilterExpression?: unknown }).partialFilterExpression) partialUniqueIndexes = false;
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
      caps: { partialUniqueIndexes, multiAccumulatorGroup: await probeMultiAccumulator() },
    };
  });
}
