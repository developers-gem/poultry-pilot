import type { Action, SyncMutationResult, SyncPushRequest } from "@poultrypilot/contracts";
import { DomainError } from "@poultrypilot/domain";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import type { Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import { assertCan, type FarmContext } from "./context.js";

/**
 * Offline sync. Every service that changes a synced entity calls `recordChange` inside its
 * transaction; the per-farm sequence lets clients pull "everything after seq N".
 * Pushed mutations are dispatched to the SAME service methods as REST, so validation is identical.
 */

export interface CommandHandler<P = unknown> {
  action: Action;
  schema: ZodType<P>;
  run(ctx: FarmContext, payload: P, meta: { baseVersion?: number; entityId?: string }): Promise<{ entityId?: string; version?: number }>;
}

export class VersionConflict extends Error {
  constructor(
    public readonly serverVersion: number,
    public readonly serverDocument: unknown,
  ) {
    super("Version conflict");
  }
}

export function createSyncService(repos: Repositories, clock: Clock) {
  const handlers = new Map<string, CommandHandler<any>>();

  return {
    register<P>(command: string, handler: CommandHandler<P>) {
      if (handlers.has(command)) throw new Error(`Command ${command} already registered`);
      handlers.set(command, handler);
    },

    async recordChange(
      farmId: string,
      change: { entity: string; entityId: string; op: "upsert" | "delete"; version: number; document?: unknown },
      tx: Tx,
    ): Promise<number> {
      const seq = await repos.sync.nextSeq(farmId, tx);
      await repos.sync.insertChange({ farmId, seq, ...change, at: clock.now() }, tx);
      return seq;
    },

    async pull(farmId: string, since: number, limit: number) {
      const rows = await repos.sync.listSince(farmId, since, limit + 1);
      const page = rows.slice(0, limit);
      return {
        changes: page.map((c) => ({
          seq: c.seq,
          entity: c.entity,
          entityId: c.entityId,
          op: c.op,
          version: c.version,
          document: c.document,
          at: c.at.toISOString(),
        })),
        nextSince: page.length ? page[page.length - 1]!.seq : since,
        hasMore: rows.length > limit,
      };
    },

    async push(ctx: FarmContext, req: SyncPushRequest): Promise<SyncMutationResult[]> {
      const results: SyncMutationResult[] = [];
      for (const m of req.mutations) {
        const processedId = `${ctx.farmId}:${m.mutationId}`;
        const prior = await repos.sync.findProcessed(processedId);
        if (prior) {
          results.push(prior.result as SyncMutationResult);
          continue;
        }
        const handler = handlers.get(m.command);
        let result: SyncMutationResult;
        if (!handler) {
          result = { mutationId: m.mutationId, status: "rejected", code: "UNKNOWN_COMMAND", message: `Unknown command ${m.command}` };
        } else {
          const mctx: FarmContext = { ...ctx, mutationId: m.mutationId, deviceId: req.deviceId };
          try {
            assertCan(mctx, handler.action);
            const payload = handler.schema.parse(m.payload);
            const out = await handler.run(mctx, payload, {
              ...(m.baseVersion !== undefined ? { baseVersion: m.baseVersion } : {}),
              ...(m.entityId ? { entityId: m.entityId } : {}),
            });
            result = { mutationId: m.mutationId, status: "accepted", ...out };
          } catch (e) {
            if (e instanceof VersionConflict) {
              result = { mutationId: m.mutationId, status: "conflict", serverVersion: e.serverVersion, serverDocument: e.serverDocument };
            } else if (e instanceof AppError || e instanceof DomainError) {
              result = { mutationId: m.mutationId, status: "rejected", code: e.code, message: e.message };
            } else if (e instanceof ZodError) {
              result = { mutationId: m.mutationId, status: "rejected", code: "VALIDATION_FAILED", message: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
            } else {
              throw e; // infrastructure failure: let the client retry the whole batch
            }
          }
        }
        // Conflicts are not stored as processed: the client resolves and resends with a new baseVersion.
        if (result.status !== "conflict") {
          await repos.sync.saveProcessed({ id: processedId, farmId: ctx.farmId, result, at: clock.now() });
        }
        results.push(result);
      }
      return results;
    },
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
