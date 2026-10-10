import { SYNC_OPERATION_STATUSES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { defineCollection, enumOf, instant, int, ref, str } from "./base.js";

const D = "System";

export const AuditLogModel = defineCollection({
  model: "AuditLog",
  collection: "audit_logs",
  domain: D,
  ownership: "system",
  actor: "none",
  description:
    "Who changed what, when, from which device. Written in the same transaction as the change. farmId is absent for account-level events (sign-in, password change).",
  fields: {
    farmId: ref("Farm"),
    actorUserId: ref("User", { required: true }),
    action: str({ required: true, max: 80 }),
    entity: str({ required: true, max: 40 }),
    entityId: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
    requestId: str({ max: 100 }),
    mutationId: str({ max: 100 }),
    deviceId: str({ max: 100 }),
    at: instant({ required: true }),
  },
  indexes: [
    { fields: { farmId: 1, _id: -1 }, why: "Farm audit log, newest first (UUIDv7 ids sort by time); cursor pagination" },
    { fields: { farmId: 1, entity: 1, entityId: 1, _id: -1 }, why: "History of one record" },
    { fields: { actorUserId: 1, _id: -1 }, why: "A person's account activity (sign-ins, password changes)" },
  ],
  relations: [{ field: "entityId", to: "any record", cardinality: "many-to-one", note: "Polymorphic by entity" }],
});

export const SyncOperationModel = defineCollection({
  model: "SyncOperation",
  collection: "sync_operations",
  domain: D,
  ownership: "farm",
  actor: "none",
  versioned: false,
  softDelete: false,
  description:
    "Each offline mutation a device pushed, with its outcome. _id = farmId:mutationId makes processing exactly-once: a resent mutation returns the stored result.",
  fields: {
    mutationId: { type: String, required: true },
    userId: ref("User", { required: true }),
    deviceId: str({ required: true, max: 100 }),
    command: str({ required: true, max: 80 }),
    entityId: { type: String },
    baseVersion: int(),
    status: enumOf(SYNC_OPERATION_STATUSES, { required: true }),
    result: { type: Schema.Types.Mixed, required: true },
    receivedAt: instant({ required: true }),
  },
  indexes: [{ fields: { createdAt: 1 }, options: { expireAfterSeconds: 90 * 86_400 }, why: "TTL: forget processed mutations after 90 days (devices resend within days)" }],
  notes: ["Lookups are by _id (farmId:mutationId), so no secondary index on mutationId is needed."],
});

export const SyncChangeModel = defineCollection({
  model: "SyncChange",
  collection: "sync_changes",
  domain: D,
  ownership: "farm",
  actor: "none",
  versioned: false,
  appendOnly: true,
  description: "Outbound change feed for offline clients: every change to a synced record gets the farm's next sequence number. Devices pull changes after their last seq.",
  fields: {
    seq: int({ required: true, min: 1 }),
    entity: str({ required: true, max: 40 }),
    entityId: { type: String, required: true },
    op: enumOf(["upsert", "delete"], { required: true }),
    version: int({ required: true }),
    document: { type: Schema.Types.Mixed },
    at: instant({ required: true }),
  },
  indexes: [{ fields: { farmId: 1, seq: 1 }, options: { unique: true }, why: "GET /sync/pull: changes after a sequence number" }],
});

export const IdempotencyModel = defineCollection({
  model: "IdempotencyKey",
  collection: "idempotency_keys",
  domain: D,
  ownership: "system",
  actor: "none",
  description: "Stored responses for Idempotency-Key writes, so a retried request is answered without running twice. _id = userId:key.",
  fields: {
    requestHash: { type: String, required: true },
    status: enumOf(["processing", "done"], { required: true }),
    responseStatus: int({ min: 100, max: 599 }),
    responseBody: { type: Schema.Types.Mixed },
  },
  indexes: [{ fields: { createdAt: 1 }, options: { expireAfterSeconds: 7 * 86_400 }, why: "TTL: keys expire after 7 days" }],
});

export const CounterModel = defineCollection({
  model: "Counter",
  collection: "counters",
  domain: D,
  ownership: "system",
  actor: "none",
  description: "Atomic per-farm sequences (sync change seq, order numbers). _id = purpose:farmId.",
  fields: { value: int({ required: true, default: 0 }) },
});
