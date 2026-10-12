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

    it("health, biosecurity and content records round-trip through their schemas", async () => {
      const farmId = newId();
      const base = { farmId, createdBy: "u1", createdAt: now, updatedAt: now, version: 0 };
      const med = { ...base, id: newId(), name: "Amoxicillin", type: "antibiotic" as const, withdrawalMeatDays: 7, withdrawalSource: "medicine_label" as const, label: { name: "Label", url: "https://example.com" } };
      await repos.medicines.insert(med);
      await repos.healthRecords.insert({
        ...base, id: newId(), type: "treatment", date: "2026-10-01", flockId: "f1", title: "Cough", symptoms: ["coughing"], affectedBirds: 3,
        assessment: { text: "Suspected", by: "Dr. Rao", source: "veterinarian" }, cost: { amountMinor: 1000, currency: "INR" }, followUpDate: "2026-10-05", followUpDone: false,
        attachments: [{ assetId: newId(), name: "r.pdf" }],
        treatments: [{ id: newId(), medicineId: med.id, medicineName: "Amoxicillin", startDate: "2026-10-01", durationDays: 5, endDate: "2026-10-05", withdrawalMeatDays: 7, withdrawalMeatUntil: "2026-10-12", withdrawalSource: "medicine_label", stockCostMinor: 500 }],
      });
      expect(await repos.healthRecords.find(farmId, { where: { followUpDone: false }, range: { field: "followUpDate", to: "2026-10-06" } })).toHaveLength(1);
      expect(await repos.healthRecords.find(farmId, { exists: { treatments: true } })).toHaveLength(1);
      const prog = { ...base, id: newId(), name: "P", flockTypes: ["broiler" as const], items: [{ dayOfAge: 7, vaccineName: "ND", route: "eye_drop" as const }], source: "Vet", active: true };
      await repos.vaccinationProgrammes.insert(prog);
      await repos.vaccinations.insert({ ...base, id: newId(), flockId: "f1", programmeId: prog.id, dayOfAge: 7, vaccineName: "ND", status: "done", dueDate: "2026-10-08", administeredDate: "2026-10-08", batches: [{ lotId: newId(), batchNumber: "B1", expiryDate: "2027-01-01", doses: 1000 }], stockCostMinor: 600 });
      const tpl = { ...base, id: newId(), name: "Decl", kind: "visitor_declaration" as const, active: true, items: [{ id: "q1", text: "Q?", required: true, responseType: "yes_no" as const, failIf: "yes", createActionOnFail: true }] };
      await repos.checklistTemplates.insert(tpl);
      const result = { templateId: tpl.id, templateVersion: 0, answers: [{ itemId: "q1", text: "Q?", answer: true, passed: false }], failedCount: 1 };
      await repos.visitors.insert({ ...base, id: newId(), name: "V", type: "supplier", previousPoultryContact: { hadContact: true, lastContactAt: now }, downtimeHours: 12, requiredDowntimeHours: 48, declaration: { declaredName: "V", declaredAt: now, checklist: result }, ppeUsed: ["boots"], footbathUsed: true, disinfected: false, flags: ["downtime_short", "declaration_failed"], checkInAt: now });
      await repos.biosecurityLogs.insert({ ...base, id: newId(), type: "wild_bird_observation", date: "2026-10-01", wildBird: { description: "Crows", contactWithPoultry: false, contactWithFeedOrWater: true, deadWildBirdsFound: 2 }, product: { name: "Virkon", quantityUsed: 0.5, stockCostMinor: 450 }, checklist: result });
      await repos.biosecurityLogs.insert({ ...base, id: newId(), type: "vehicle", date: "2026-10-01", vehicle: { registration: "UP14", disinfected: false, entryAt: now } });
      await repos.cleaningTasks.insert({ ...base, id: newId(), title: "Clean", activity: "disinfection", schedule: "weekly", checklistTemplateId: tpl.id, nextDueDate: "2026-10-08", active: true });
      const eq = { ...base, id: newId(), name: "Scale", type: "scale" as const, status: "in_service" as const };
      await repos.equipment.insert(eq);
      await repos.equipmentMovements.insert({ farmId, id: newId(), createdBy: "u1", createdAt: now, updatedAt: now, equipmentId: eq.id, date: "2026-10-01", toHouseId: "h1", disinfected: false });
      await repos.tasks.insert({ ...base, id: newId(), kind: "corrective_action", title: "Fix", status: "open", priority: "high", related: { entity: "visitor", id: "v1" } });
      expect(await repos.tasks.find(farmId, { where: { kind: "corrective_action", status: ["open", "in_progress"] } as never })).toHaveLength(1);

      const article = { id: newId(), kind: "guide" as const, slug: `a-${farmId.slice(-8)}`, locale: "en", title: "T", regionCode: "GLOBAL", tags: ["health"], status: "published" as const, publishedAt: now, sources: [{ name: "WOAH", url: "https://www.woah.org" }], createdAt: now, updatedAt: now, version: 0 };
      await repos.articles.upsert(article);
      await repos.articles.upsert({ ...article, id: newId(), title: "T2" });
      expect((await repos.articles.findBySlug(article.slug, "en"))?.title).toBe("T2");
      expect((await repos.articles.findPublished({ tag: "health", regionCodes: ["GLOBAL"], locale: "en" })).some((a) => a.slug === article.slug)).toBe(true);
    });

    it("hatchery, order and ChickStart records round-trip through their schemas", async () => {
      const farmId = newId();
      const base = { farmId, createdBy: "u1", createdAt: now, updatedAt: now, version: 0 };
      const batch = { ...base, id: newId(), code: "H-1", species: "chicken" as const, eggSource: "own_flock" as const, sourceFlockId: "f1", eggsReceived: 1050, rejects: { cracked: 30, dirty: 20 }, eggsSet: 1000, setDate: "2026-10-01", incubationDays: 21, expectedTransferDate: "2026-10-19", expectedHatchDate: "2026-10-22", status: "incubating" as const, results: { infertile: 0, cracked: 0, deadEmbryo: 0, hatched: 0, deadInShell: 0, culled: 0, saleable: 0, inIncubation: 1000 } };
      await repos.hatcheryBatches.insert(batch);
      expect((await repos.hatcheryBatches.findById(farmId, batch.id))?.rejects).toEqual({ cracked: 30, dirty: 20 });
      await repos.hatcheryEvents.insert({ farmId, id: newId(), createdBy: "u1", createdAt: now, updatedAt: now, batchId: batch.id, type: "candling", date: "2026-10-08", counts: { infertile: 80, deadEmbryo: 20, cracked: 5 }, machine: "setter" });
      expect((await repos.hatcheryBatches.update(farmId, batch.id, { status: "hatched", results: { ...batch.results, hatched: 830, fertilityPercent: 91.9 } }, { expectedVersion: 0 }))?.results?.fertilityPercent).toBe(91.9);
      const buyer = { ...base, id: newId(), name: "Sharma", type: "farm" as const };
      await repos.buyers.insert(buyer);
      const total = { amountMinor: 1_900_000, currency: "INR" };
      await repos.orders.insert({ ...base, id: newId(), orderNumber: await repos.counters.next("order", farmId), channel: "direct", buyerId: buyer.id, hatcheryBatchId: batch.id, lines: [{ category: "day_old_chicks", description: "Chicks", quantity: 500, unit: "chick", unitPrice: { amountMinor: 3800, currency: "INR" }, total }], subtotal: total, total, status: "pending", statusHistory: [{ status: "pending", at: now, by: "u1" }], paymentStatus: "unpaid", fulfilment: "pickup", requestedDeliveryDate: "2026-10-23" });
      expect(await repos.counters.next("order", farmId)).toBe(2);
      expect(await repos.orders.find(farmId, { where: { status: ["pending", "confirmed"] } as never })).toHaveLength(1);
      const profile = { ...base, id: newId(), name: "P", flockTypes: ["broiler" as const], bands: [{ fromDay: 0, toDay: 3, tempMinC: 31, tempMaxC: 33, targetWeightG: 60 }], source: "Breed guide", isDefault: true };
      await repos.broodingProfiles.insert(profile);
      const result = { templateId: newId(), templateVersion: 0, answers: [{ itemId: "q", text: "Q?", answer: false, passed: false }], failedCount: 1 };
      await repos.chickArrivals.insert({ ...base, id: newId(), houseId: "h1", expectedDate: "2026-10-22", expectedCount: 800, source: "own_hatchery", hatcheryBatchId: batch.id, flockType: "broiler", broodingProfileId: profile.id, status: "arrived", preparation: { checklist: result, completedAt: now, completedBy: "u1" }, arrival: { arrivedAt: now, received: 800, deadOnArrival: 4, averageWeightG: 42, sampleSize: 50 }, flockId: "f2" });
      await repos.brooderChecks.insert({ ...base, id: newId(), flockId: "f2", checkedAt: now, date: "2026-10-23", dayOfAge: 1, temperatureC: 29.5, humidityPercent: 50, behaviour: "huddling", feedAvailable: true, waterAvailable: true, cropFill: { sampled: 20, full: 15 }, flags: ["temperature_low", "behaviour"] });
      expect((await repos.brooderChecks.find(farmId, { where: { flockId: "f2" } }))[0]?.cropFill).toEqual({ sampled: 20, full: 15 });
    });

    it("finance and marketplace records round-trip; cross-farm market reads", async () => {
      const farmId = newId();
      const base = { farmId, createdBy: "u1", createdAt: now, updatedAt: now, version: 0 };
      const inr = (n: number) => ({ amountMinor: n, currency: "INR" });
      const sup = { ...base, id: newId(), name: "Godrej", taxId: "09ABC" };
      await repos.suppliers.insert(sup);
      const acct = { ...base, id: newId(), name: "Cash", type: "cash" as const, openingBalance: inr(1000), openingDate: "2026-09-01", active: true };
      await repos.moneyAccounts.insert(acct);
      const bill = { ...base, id: newId(), kind: "purchase" as const, date: "2026-10-01", category: "feed" as const, description: "Feed", supplierId: sup.id, amount: inr(11800), net: inr(10000), tax: { label: "GST", ratePercent: 18, inclusive: false, amountMinor: 1800 }, amountPaid: inr(0), status: "unpaid" as const, sourceType: "inventory_purchase" as const, sourceId: newId(), attachments: [{ assetId: newId(), name: "b.png" }] };
      await repos.expenses.insert(bill);
      expect((await repos.expenses.update(farmId, bill.id, { amountPaid: inr(5000), status: "partially_paid" }, { expectedVersion: 0 }))?.status).toBe("partially_paid");
      await repos.incomes.insert({ ...base, id: newId(), kind: "sale", date: "2026-10-02", category: "egg_sales", description: "Eggs", customerName: "Hotel", amount: inr(5000), net: inr(5000), amountPaid: inr(0), status: "unpaid", sourceType: "market_order", sourceId: newId() });
      await repos.recurringExpenses.insert({ ...base, id: newId(), name: "Wages", category: "labour", amount: inr(1200000), frequency: "monthly", startDate: "2026-08-01", pauses: [{ from: "2026-10-01" }], nextDueDate: "2026-11-01", active: true });
      const g = newId();
      await repos.transactions.insertMany([
        { farmId, id: newId(), createdBy: "u1", createdAt: now, updatedAt: now, date: "2026-10-03", kind: "transfer", direction: "out", accountId: acct.id, amount: inr(100), transferGroupId: g, counterpartAccountId: newId() },
        { farmId, id: newId(), createdBy: "u1", createdAt: now, updatedAt: now, date: "2026-10-03", kind: "payment", direction: "out", accountId: acct.id, amount: inr(5000), category: "feed", documentType: "expense", documentId: bill.id, supplierId: sup.id, paymentMethod: "upi", reference: "R1" },
      ]);
      expect(await repos.transactions.find(farmId, { where: { documentId: bill.id } })).toHaveLength(1);
      const listing = { ...base, id: newId(), title: "Eggs", category: "eggs" as const, quantityAvailable: 40, unit: "tray", price: inr(18000), priceUnit: "per_tray" as const, regionCode: "IN-UP", fulfilmentOptions: ["pickup" as const, "seller_delivery" as const], status: "active" as const, source: { kind: "eggs" as const, eggGrade: "large" as const } };
      await repos.listings.insert(listing);
      const order = { ...base, id: newId(), orderNumber: 1, channel: "marketplace" as const, listingId: listing.id, buyerUserId: "buyer-1", buyerName: "Ravi", fulfilment: "seller_delivery" as const, delivery: { address: "Shop 4", vehicle: "UP14", dispatchedAt: now }, lines: [{ category: "eggs" as const, description: "Eggs", quantity: 10, unit: "tray", unitPrice: inr(18000), total: inr(180000) }], subtotal: inr(180000), total: inr(180000), status: "dispatched" as const, statusHistory: [{ status: "pending" as const, at: now }], paymentStatus: "unpaid" as const, amountPaid: inr(0) };
      await repos.orders.insert(order);
      await repos.orderPayments.insert({ farmId, id: newId(), createdBy: "u1", createdAt: now, updatedAt: now, orderId: order.id, kind: "payment", date: "2026-10-04", amount: inr(180000), method: "upi", accountId: acct.id });
      expect((await repos.market.activeListings({ category: "eggs", regionCode: "IN", limit: 10 })).some((l) => l.id === listing.id)).toBe(true);
      expect((await repos.market.activeListings({ text: "egg", limit: 10 })).some((l) => l.id === listing.id)).toBe(true);
      expect((await repos.market.listingById(listing.id))?.farmId).toBe(farmId);
      expect((await repos.market.orderById(order.id))?.delivery?.vehicle).toBe("UP14");
      expect((await repos.market.ordersForBuyer("buyer-1")).map((o) => o.id)).toContain(order.id);
    });

    it("intelligence, notification and weather records round-trip", async () => {
      const farmId = newId();
      const user = newId();
      await repos.alertRules.insert({ id: newId(), farmId, ruleKey: "mortality", enabled: true, parameters: { deviationPercent: 80, dailyRatePercentMax: 0.3 }, severity: "critical", channels: ["in_app", "push"], notifyRoles: ["owner"], cooldownHours: 12, createdBy: "u1", createdAt: now, updatedAt: now, version: 0 });
      expect((await repos.alertRules.find(farmId, { where: { ruleKey: "mortality" } }))[0]?.parameters).toEqual({ deviationPercent: 80, dailyRatePercentMax: 0.3 });
      const base = { userId: user, farmId, title: "T", attempts: 0, createdAt: now, updatedAt: now };
      const inApp = { ...base, id: newId(), channel: "in_app" as const, status: "delivered" as const, alertId: "a1", ruleKey: "mortality" as const, severity: "warning" as const, link: { entity: "alert", id: "a1" } };
      const queued = { ...base, id: newId(), channel: "push" as const, status: "queued" as const, alertId: "a1", nextAttemptAt: new Date(now.getTime() - 1000) };
      await repos.notifications.insertMany([inApp, queued]);
      expect(await repos.notifications.unreadCount(user)).toBe(1);
      expect((await repos.notifications.forUser(user, { limit: 10 })).map((n) => n.id)).toEqual([inApp.id]);
      expect((await repos.notifications.due(now, 10)).map((n) => n.id)).toContain(queued.id);
      await repos.notifications.update(queued.id, { status: "sent", sentAt: now, attempts: 1, providerMessageId: "p1" });
      expect((await repos.notifications.due(now, 10)).map((n) => n.id)).not.toContain(queued.id);
      expect((await repos.notifications.lastForAlert("a1", user, "push"))?.providerMessageId).toBe("p1");
      expect(await repos.notifications.markRead(user, "all", now)).toBe(1);
      expect(await repos.notifications.unreadCount(user)).toBe(0);
      const token = `tok-${newId()}`;
      await repos.pushDevices.upsertByToken({ id: newId(), userId: user, platform: "android", token, lastSeenAt: now, createdAt: now, updatedAt: now });
      const other = newId();
      const moved = await repos.pushDevices.upsertByToken({ id: newId(), userId: other, platform: "android", token, lastSeenAt: now, createdAt: now, updatedAt: now });
      expect(moved.userId).toBe(other);
      expect(await repos.pushDevices.activeForUser(user)).toHaveLength(0);
      await repos.pushDevices.disableTokens([token], now);
      expect(await repos.pushDevices.activeForUser(other)).toHaveLength(0);
      await repos.notificationPreferences.put({ id: newId(), userId: user, pushEnabled: true, emailEnabled: false, pushMinSeverity: "info", emailMinSeverity: "critical", mutedRuleKeys: ["weather_risk"], createdAt: now, updatedAt: now });
      await repos.notificationPreferences.put({ id: newId(), userId: user, pushEnabled: false, emailEnabled: false, pushMinSeverity: "info", emailMinSeverity: "critical", createdAt: now, updatedAt: now });
      expect((await repos.notificationPreferences.get(user))?.pushEnabled).toBe(false);
      const key = `t-${farmId.slice(-6)}`;
      await repos.weather.putCache({ id: newId(), provider: "fake", locationKey: key, kind: "daily", data: { today: "2026-10-12", daily: [] }, fetchedAt: now, expiresAt: new Date(now.getTime() + 3600_000), createdAt: now, updatedAt: now });
      await repos.weather.putCache({ id: newId(), provider: "fake", locationKey: key, kind: "daily", data: { today: "2026-10-13", daily: [] }, fetchedAt: now, expiresAt: new Date(now.getTime() + 3600_000), createdAt: now, updatedAt: now });
      expect(((await repos.weather.getCache("fake", key, "daily"))?.data as { today: string }).today).toBe("2026-10-13");
      const obs = (date: string, t: number) => ({ id: newId(), provider: "fake", locationKey: key, date, tempMaxC: t, tempMinC: 20, rainMm: 1.5, windMaxKph: 14, humidityMaxPercent: 80, createdAt: now, updatedAt: now });
      await repos.weather.upsertObservations([obs("2026-10-10", 31), obs("2026-10-11", 32)]);
      await repos.weather.upsertObservations([obs("2026-10-11", 33)]);
      const hist = await repos.weather.observations(key, "2026-10-01", "2026-10-31");
      expect(hist.map((h) => `${h.date}:${h.tempMaxC}`)).toEqual(["2026-10-10:31", "2026-10-11:33"]);
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
