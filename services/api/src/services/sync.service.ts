import type { Action, SyncMutationResult, SyncPushRequest } from "@poultrypilot/types";
import { DomainError } from "../domain/index.js";
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

    /**
     * Applies mutations in order. Each accepted mutation and its "processed" record are written in ONE transaction,
     * so a mutation is either applied and remembered, or not applied at all: if the connection or the server dies
     * mid-way, resending the same mutationId never applies it twice (the stored result is returned instead).
     * Two pushes of the same mutation at once: the second insert of the processed record fails, its transaction
     * rolls back, and it returns the first one's result.
     */
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
        const record = (result: SyncMutationResult) => {
          const at = clock.now();
          return {
            id: processedId,
            farmId: ctx.farmId,
            mutationId: m.mutationId,
            userId: ctx.userId,
            deviceId: req.deviceId,
            command: m.command,
            ...(m.entityId ? { entityId: m.entityId } : {}),
            ...(m.baseVersion !== undefined ? { baseVersion: m.baseVersion } : {}),
            status: result.status as "accepted" | "rejected",
            result,
            receivedAt: at,
            at,
          };
        };
        /** Stores a rejection; if another push stored this mutation first, its result wins. */
        const saveRejection = async (result: SyncMutationResult) => {
          try {
            await repos.sync.saveProcessed(record(result));
            return result;
          } catch (e) {
            const winner = await repos.sync.findProcessed(processedId);
            if (winner) return winner.result as SyncMutationResult;
            throw e;
          }
        };
        if (!handler) {
          results.push(await saveRejection({ mutationId: m.mutationId, status: "rejected", code: "UNKNOWN_COMMAND", message: `Unknown command ${m.command}` }));
          continue;
        }
        const mctx: FarmContext = { ...ctx, mutationId: m.mutationId, deviceId: req.deviceId };
        try {
          const accepted = await repos.tx.run(async (tx) => {
            assertCan(mctx, handler.action);
            const payload = handler.schema.parse(m.payload);
            const out = await handler.run(mctx, payload, {
              ...(m.baseVersion !== undefined ? { baseVersion: m.baseVersion } : {}),
              ...(m.entityId ? { entityId: m.entityId } : {}),
            });
            const result: SyncMutationResult = { mutationId: m.mutationId, status: "accepted", ...out };
            await repos.sync.saveProcessed(record(result), tx);
            return result;
          });
          results.push(accepted);
        } catch (e) {
          if (e instanceof VersionConflict) {
            // Not stored as processed: the client resolves and resends with a new baseVersion.
            results.push({ mutationId: m.mutationId, status: "conflict", serverVersion: e.serverVersion, serverDocument: e.serverDocument });
            continue;
          }
          // A concurrent push of the same mutation committed first: return its result.
          const winner = await repos.sync.findProcessed(processedId);
          if (winner) {
            results.push(winner.result as SyncMutationResult);
            continue;
          }
          if (e instanceof AppError || e instanceof DomainError) {
            results.push(await saveRejection({ mutationId: m.mutationId, status: "rejected", code: e.code, message: e.message }));
          } else if (e instanceof ZodError) {
            results.push(await saveRejection({ mutationId: m.mutationId, status: "rejected", code: "VALIDATION_FAILED", message: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }));
          } else {
            throw e; // infrastructure failure: nothing of this mutation was kept; the client retries the batch
          }
        }
      }
      return results;
    },
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
