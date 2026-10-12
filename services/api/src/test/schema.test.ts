import { EGG_GRADES, FLOCK_STATUSES, ROLES } from "@poultrypilot/constants";
import mongoose from "mongoose";
import { afterAll, describe, expect, it } from "vitest";
import * as M from "../adapters/mongo/models/index.js";
import { registry, type CollectionMeta } from "../adapters/mongo/models/index.js";

const REQUESTED = [
  "users", "farms", "farm_members", "houses", "flocks", "flock_events", "daily_records", "bird_weights", "egg_records", "egg_inventory",
  "feed_consumption", "inventory_lots", "water_records", "inventory_items", "inventory_transactions", "health_records",
  "vaccinations", "medicines", "hatchery_batches", "hatchery_events", "chicks", "biosecurity_logs", "visitors", "cleaning_tasks",
  "equipment", "equipment_movements", "expenses", "recurring_expenses", "transactions", "buyers", "market_listings", "orders",
  "order_payments", "tasks", "alerts", "alert_rules", "notifications", "weather_cache", "market_prices", "training_courses",
  "training_progress", "articles", "glossary_terms", "audit_logs", "sync_operations",
];

/** Indexes on farm-owned collections that legitimately do not start with farmId. */
const CROSS_FARM_OR_TTL = new Set([
  "market_listings:status_1_category_1_createdAt_-1",
  "market_listings:location_2dsphere_status_1",
  "orders:buyerUserId_1_createdAt_-1",
  "sync_operations:createdAt_1",
  "farm_members:userId_1_status_1", // GET /me: a person's memberships across farms
  "farm_members:inviteTokenHash_1", // accept an invitation before the person is a member
]);

const byCollection = new Map(registry.map((c) => [c.collection, c]));
const farmOwned = registry.filter((c) => c.ownership === "farm");
const keyName = (fields: Record<string, unknown>) => Object.entries(fields).map(([k, v]) => `${k}_${v}`).join("_");

describe("collection inventory", () => {
  it("defines every requested collection exactly once", () => {
    const names = registry.map((c) => c.collection);
    expect(new Set(names).size).toBe(names.length);
    expect(REQUESTED.filter((n) => !byCollection.has(n))).toEqual([]);
  });

  it("documents every collection and every index", () => {
    for (const c of registry) {
      expect(c.description.length, c.collection).toBeGreaterThan(20);
      for (const ix of c.indexes ?? []) expect(ix.why.length, `${c.collection} ${keyName(ix.fields)}`).toBeGreaterThan(10);
    }
  });
});

describe("standard fields", () => {
  it("every collection has string _id and required createdAt/updatedAt", () => {
    for (const c of registry) {
      expect(c.schema.path("_id")?.instance, c.collection).toBe("String");
      expect(c.schema.path("createdAt")?.isRequired, c.collection).toBe(true);
      expect(c.schema.path("updatedAt")?.isRequired, c.collection).toBe(true);
    }
  });

  it("farm-owned collections require farmId; people-created ones require createdBy and carry updatedBy", () => {
    for (const c of farmOwned) {
      expect(c.schema.path("farmId")?.isRequired, c.collection).toBe(true);
      if (c.actor === "required") {
        expect(c.schema.path("createdBy")?.isRequired, c.collection).toBe(true);
        expect(c.schema.path("updatedBy"), c.collection).toBeDefined();
      }
    }
    const withoutActor = registry.filter((c) => c.actor === "none").map((c) => c.collection).sort();
    expect(withoutActor).toEqual(
      ["audit_logs", "counters", "idempotency_keys", "notifications", "one_time_tokens", "refresh_tokens", "sessions", "sync_changes", "sync_operations", "weather_cache"].sort(),
    );
  });

  it("append-only ledgers have no soft delete; editable farm records do", () => {
    for (const c of farmOwned) {
      if (c.appendOnly) expect(c.schema.path("deletedAt"), c.collection).toBeUndefined();
      else if (c.softDelete) expect(c.schema.path("deletedAt"), c.collection).toBeDefined();
    }
    expect(farmOwned.filter((c) => c.appendOnly).map((c) => c.collection).sort()).toEqual(
      ["egg_inventory", "equipment_movements", "flock_events", "hatchery_events", "inventory_transactions", "order_payments", "sync_changes", "transactions"].sort(),
    );
  });

  it("every ref points to a registered model", () => {
    const models = new Set(registry.map((c) => c.model));
    const bad: string[] = [];
    for (const c of registry) {
      c.schema.eachPath((path, type) => {
        const opts = type.options as { ref?: string; type?: unknown };
        const r = opts.ref ?? ((Array.isArray(opts.type) ? (opts.type[0] as { ref?: string })?.ref : undefined));
        if (r && !models.has(r)) bad.push(`${c.collection}.${path} → ${r}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it("enums come from the shared constants", () => {
    expect((M.MembershipModel.schema.path("role") as unknown as { enumValues: string[] }).enumValues).toEqual([...ROLES]);
    expect((M.FlockModel.schema.path("status") as unknown as { enumValues: string[] }).enumValues).toEqual([...FLOCK_STATUSES]);
    expect((M.EggInventoryModel.schema.path("grade") as unknown as { enumValues: string[] }).enumValues).toEqual([...EGG_GRADES]);
  });
});

describe("indexes", () => {
  const indexesOf = (c: CollectionMeta) => c.schema.indexes() as [Record<string, unknown>, Record<string, unknown>][];

  it("farm-owned indexes start with farmId, except documented cross-farm reads and TTL indexes", () => {
    const offenders: string[] = [];
    for (const c of farmOwned) {
      for (const [fields] of indexesOf(c)) {
        const name = `${c.collection}:${keyName(fields)}`;
        if (Object.keys(fields)[0] !== "farmId" && !CROSS_FARM_OR_TTL.has(name)) offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no index is made redundant by a longer index with the same prefix", () => {
    const redundant: string[] = [];
    for (const c of registry) {
      const list = indexesOf(c);
      list.forEach(([a, aOpts], i) => {
        if (aOpts["unique"] || aOpts["expireAfterSeconds"] !== undefined || aOpts["partialFilterExpression"] || aOpts["sparse"]) return;
        const aKeys = Object.entries(a);
        if (aKeys.length === 1 && aKeys[0]![0] === "_id") return redundant.push(`${c.collection}: ${keyName(a)} duplicates _id`);
        list.forEach(([b, bOpts], j) => {
          if (i === j || bOpts["partialFilterExpression"]) return;
          const bKeys = Object.entries(b);
          const isPrefix = aKeys.length <= bKeys.length && aKeys.every(([k, v], n) => bKeys[n]![0] === k && bKeys[n]![1] === v);
          if (isPrefix && (aKeys.length < bKeys.length || i > j)) redundant.push(`${c.collection}: ${keyName(a)} is a prefix of ${keyName(b)}`);
        });
      });
    }
    expect(redundant).toEqual([]);
  });

  it("keeps the index count small", () => {
    const total = registry.reduce((t, c) => t + indexesOf(c).length, 0);
    const max = Math.max(...registry.map((c) => indexesOf(c).length));
    expect(max).toBeLessThanOrEqual(4);
    expect(total).toBeLessThan(registry.length * 2.5);
  });
});

describe("tenancy guard on every farm-owned model", () => {
  afterAll(() => mongoose.set("bufferCommands", true));
  mongoose.set("bufferCommands", false);

  it("rejects a query without farmId on each farm-owned collection", async () => {
    for (const c of farmOwned) {
      const model = mongoose.model(c.model);
      await expect(model.find({ _id: "x" }).exec(), c.collection).rejects.toThrow(/Tenancy violation/);
    }
  });
});

describe("document validation", () => {
  const base = { _id: "id-1", farmId: "f-1", createdBy: "u-1" };

  it("rejects unknown fields instead of silently storing or dropping them", () => {
    expect(() => new M.HouseModel({ ...base, name: "A", type: "broiler", secret: 1 })).toThrow(/not in schema/);
  });

  it("requires a valid farm-local date and whole-number money", () => {
    const bad = new M.ExpenseModel({ ...base, date: "06/10/2026", category: "feed", description: "x", amount: { amountMinor: 10.5, currency: "INR" } }).validateSync();
    expect(Object.keys(bad!.errors)).toEqual(expect.arrayContaining(["date", "amount.amountMinor"]));
  });

  it("a custom flock type needs a name", async () => {
    const f = new M.FlockModel({ ...base, houseId: "h-1", name: "Geese 1", flockCode: "G1", type: "custom" });
    await expect(f.validate()).rejects.toThrow(/custom poultry type/);
    f.set("customTypeName", "Geese");
    await expect(f.validate()).resolves.toBeUndefined();
  });

  it("computes weigh-session statistics with the domain function", async () => {
    const w = new M.BirdWeightModel({ ...base, flockId: "fl-1", date: "2026-10-06", weightsG: [1800, 1900, 2000, 2100, 2200] });
    await w.validate();
    expect(w.get("stats")).toMatchObject({ count: 5, meanG: 2000, uniformityPercent: 100 });
  });

  it("only accepts egg grades as byGrade keys", async () => {
    const e = new M.EggRecordModel({ ...base, flockId: "fl-1", date: "2026-10-06", collected: 100, byGrade: { large: 80, jumbo: 20 } });
    await expect(e.validate()).rejects.toThrow(/egg grades/);
  });

  it("refuses to publish news without a source and publication date", async () => {
    const a = new M.ArticleModel({ _id: "a-1", kind: "news", slug: "outbreak", locale: "en", title: "Outbreak", regionCode: "IN-UP", status: "published" });
    await expect(a.validate()).rejects.toThrow(/source|publication date/);
    const ok = new M.ArticleModel({ _id: "a-2", kind: "news", slug: "o2", locale: "en", title: "T", regionCode: "IN-UP", status: "published", publishedAt: new Date(), sources: [{ name: "State animal husbandry department", url: "https://example.gov.in" }] });
    await expect(ok.validate()).resolves.toBeUndefined();
  });

  it("refuses to publish a health or biosecurity article without sources", async () => {
    const a = new M.ArticleModel({ _id: "a-3", kind: "guide", slug: "g", locale: "en", title: "T", tags: ["biosecurity"], status: "published", publishedAt: new Date() });
    await expect(a.validate()).rejects.toThrow(/health and biosecurity articles need at least one source/);
    a.set("status", "draft");
    await expect(a.validate()).resolves.toBeUndefined();
  });

  it("enforces the role enum on farm members", () => {
    const err = new M.MembershipModel({ ...base, email: "a@b.co", role: "manager", status: "active" }).validateSync();
    expect(err?.errors["role"]).toBeDefined();
  });
});
