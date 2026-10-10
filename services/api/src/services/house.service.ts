import type { HouseView } from "@poultrypilot/types";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories } from "../ports/repositories.js";
import type { HouseRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import type { SyncService } from "./sync.service.js";

export const toHouseView = (h: HouseRecord): HouseView => ({
  id: h.id,
  name: h.name,
  type: h.type,
  ...(h.capacityBirds !== undefined ? { capacityBirds: h.capacityBirds } : {}),
  ...(h.floorAreaM2 !== undefined ? { floorAreaM2: h.floorAreaM2 } : {}),
  status: h.status,
  ...(h.notes ? { notes: h.notes } : {}),
  version: h.version,
  createdAt: h.createdAt.toISOString(),
  updatedAt: h.updatedAt.toISOString(),
});

export const duplicate = (what: string) => (e: unknown) => {
  if ((e as { code?: number }).code === 11000) throw new AppError("DUPLICATE", `${what} is already used on this farm`);
  throw e;
};

export function createHouseService(d: { repos: Repositories; clock: Clock; audit: AuditService; sync: SyncService }) {
  const { repos, clock } = d;
  return {
    async list(ctx: FarmContext) {
      assertCan(ctx, "production.read");
      return (await repos.houses.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(toHouseView);
    },

    async get(ctx: FarmContext, id: string) {
      assertCan(ctx, "production.read");
      const h = await repos.houses.findById(ctx.farmId, id);
      if (!h) throw notFound("House");
      return toHouseView(h);
    },

    async create(ctx: FarmContext, input: { id?: string; name: string; type: HouseRecord["type"]; capacityBirds?: number; floorAreaM2?: number; notes?: string }) {
      assertCan(ctx, "flock.manage");
      const now = clock.now();
      const rec: HouseRecord = {
        id: input.id ?? newId(),
        farmId: ctx.farmId,
        name: input.name,
        type: input.type,
        ...(input.capacityBirds !== undefined ? { capacityBirds: input.capacityBirds } : {}),
        ...(input.floorAreaM2 !== undefined ? { floorAreaM2: input.floorAreaM2 } : {}),
        status: "active",
        ...(input.notes ? { notes: input.notes } : {}),
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0,
      };
      await repos.tx.run(async (tx) => {
        await repos.houses.insert(rec, tx).catch(duplicate(`House name "${input.name}"`));
        await d.audit.record(ctx, { action: "house.created", entity: "house", entityId: rec.id, after: { name: rec.name, type: rec.type } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "house", entityId: rec.id, op: "upsert", version: 0, document: toHouseView(rec) }, tx);
      });
      return toHouseView(rec);
    },

    async replace(ctx: FarmContext, id: string, input: Omit<HouseRecord, keyof import("../ports/records.js").Editable> & { version: number }) {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const cur = await repos.houses.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("House");
        if (cur.version !== input.version) throw new AppError("VERSION_CONFLICT", "This house was changed by someone else", { serverVersion: cur.version });
        if (input.capacityBirds !== undefined) {
          const occupied = (await repos.flocks.find(ctx.farmId, { where: { houseId: id, status: "active" } }, tx)).reduce((t, f) => t + (f.population?.alive ?? 0), 0);
          if (occupied > input.capacityBirds) throw new AppError("CAPACITY_EXCEEDED", `${occupied} birds are already in this house, more than a capacity of ${input.capacityBirds}`);
        }
        const { version, ...fields } = input;
        const next = await repos.houses
          .update(ctx.farmId, id, { name: fields.name, type: fields.type, capacityBirds: fields.capacityBirds, floorAreaM2: fields.floorAreaM2, status: fields.status, notes: fields.notes, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version }, tx)
          .catch(duplicate(`House name "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This house was changed by someone else");
        await d.audit.record(ctx, { action: "house.updated", entity: "house", entityId: id, before: cur as unknown as Record<string, unknown>, after: next as unknown as Record<string, unknown> }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "house", entityId: id, op: "upsert", version: next.version, document: toHouseView(next) }, tx);
        return toHouseView(next);
      });
    },

    /** A house can be deleted only when no planned or active flock uses it. */
    async remove(ctx: FarmContext, id: string) {
      assertCan(ctx, "flock.manage");
      await repos.tx.run(async (tx) => {
        const cur = await repos.houses.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("House");
        const inUse = await repos.flocks.find(ctx.farmId, { where: { houseId: id, status: ["planned", "active"] }, limit: 1 }, tx);
        if (inUse.length) throw new AppError("INVALID_STATE_TRANSITION", "Move or close the flocks in this house before deleting it");
        const now = clock.now();
        await repos.houses.update(ctx.farmId, id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, undefined, tx);
        await d.audit.record(ctx, { action: "house.deleted", entity: "house", entityId: id, before: { name: cur.name } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "house", entityId: id, op: "delete", version: cur.version + 1 }, tx);
      });
    },
  };
}

export type HouseService = ReturnType<typeof createHouseService>;
