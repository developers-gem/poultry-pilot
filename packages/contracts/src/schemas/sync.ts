import { z } from "zod";
import { Id } from "../primitives.js";

/** Offline outbox entry sent by the Flutter app. Processed by the same service as REST. */
export const SyncMutation = z.object({
  mutationId: Id,
  command: z.string().min(1).max(80),
  entityId: Id.optional(),
  payload: z.unknown(),
  baseVersion: z.number().int().nonnegative().optional(),
  clientCreatedAt: z.string().datetime({ offset: true }),
});
export type SyncMutation = z.infer<typeof SyncMutation>;

export const SyncPushRequest = z.object({
  farmId: Id,
  deviceId: z.string().min(1).max(100),
  mutations: z.array(SyncMutation).min(1).max(200),
});
export type SyncPushRequest = z.infer<typeof SyncPushRequest>;

export const SyncMutationResult = z.discriminatedUnion("status", [
  z.object({ mutationId: z.string(), status: z.literal("accepted"), entityId: z.string().optional(), version: z.number().optional() }),
  z.object({ mutationId: z.string(), status: z.literal("rejected"), code: z.string(), message: z.string() }),
  z.object({ mutationId: z.string(), status: z.literal("conflict"), serverVersion: z.number(), serverDocument: z.unknown() }),
]);
export type SyncMutationResult = z.infer<typeof SyncMutationResult>;

export const SyncPullQuery = z.object({
  farmId: Id,
  since: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

export const SyncChange = z.object({
  seq: z.number(),
  entity: z.string(),
  entityId: z.string(),
  op: z.enum(["upsert", "delete"]),
  version: z.number(),
  document: z.unknown().optional(),
  at: z.string(),
});
export type SyncChange = z.infer<typeof SyncChange>;
