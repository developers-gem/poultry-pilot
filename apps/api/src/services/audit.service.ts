import type { Repositories, Tx } from "../ports/repositories.js";
import type { AuditEventRecord } from "../ports/records.js";
import { newId, shallowDiff, type Clock } from "../lib/util.js";
import type { FarmContext, RequestContext } from "./context.js";

export interface AuditInput {
  action: string;
  entity: string;
  entityId: string;
  farmId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/** Writes audit events inside the caller's transaction, so the event and the change commit together. */
export function createAuditService(repos: Repositories, clock: Clock) {
  return {
    async record(ctx: RequestContext, input: AuditInput, tx: Tx): Promise<void> {
      const changes = input.before || input.after ? shallowDiff(input.before, input.after) : undefined;
      const rec: AuditEventRecord = {
        id: newId(),
        farmId: input.farmId ?? (ctx as Partial<FarmContext>).farmId,
        actorUserId: ctx.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ...(changes && Object.keys(changes).length ? { changes } : {}),
        ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
        ...(ctx.mutationId ? { mutationId: ctx.mutationId } : {}),
        ...(ctx.deviceId ? { deviceId: ctx.deviceId } : {}),
        at: clock.now(),
      };
      await repos.audit.insert(rec, tx);
    },
    async list(farmId: string, opts: { cursor?: string; limit: number }) {
      const items = await repos.audit.list(farmId, { limit: opts.limit + 1, ...(opts.cursor ? { beforeId: opts.cursor } : {}) });
      const page = items.slice(0, opts.limit);
      return {
        items: page.map((a) => ({ ...a, at: a.at.toISOString() })),
        nextCursor: items.length > opts.limit ? page[page.length - 1]!.id : null,
      };
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
