import mongoose, { Schema, type IndexOptions, type Model, type SchemaDefinition } from "mongoose";
import { requireFarmScope } from "../plugins.js";

/**
 * Every collection is declared through defineCollection so that:
 * - ownership decides the standard fields (farmId, createdBy/updatedBy, version, soft delete);
 * - every index states the query it serves (the data dictionary prints it, and a test rejects
 *   indexes made redundant by another index's prefix);
 * - the data dictionary is generated from the same declarations the database uses.
 */

/**
 * farm    — belongs to one farm: farmId required, tenancy plugin rejects queries without it.
 * tenant  — the farm document itself (its _id is the farmId).
 * user    — belongs to one person across farms (sessions, training progress, notifications).
 * global  — shared reference data managed by PoultryPilot staff (content, market prices, weather cache).
 * system  — written only by the API (audit, sync, idempotency, counters).
 */
export type Ownership = "farm" | "tenant" | "user" | "global" | "system";

/**
 * required — createdBy is required, updatedBy set on every change (farm records people create).
 * optional — present when a person caused the write (users, content, global data imported by scripts).
 * none     — system-written records; the actor, if any, is a domain field such as actorUserId.
 */
export type ActorFields = "required" | "optional" | "none";

export interface IndexSpec {
  fields: Record<string, 1 | -1 | "2dsphere" | "text">;
  options?: IndexOptions;
  /** The query this index serves. Required: an index nobody can justify is not created. */
  why: string;
}

export interface Relation {
  field: string;
  to: string;
  cardinality: "many-to-one" | "one-to-one" | "many-to-many";
  note?: string;
}

export interface CollectionSpec {
  model: string;
  collection: string;
  domain: string;
  ownership: Ownership;
  description: string;
  fields: SchemaDefinition;
  indexes?: IndexSpec[];
  actor?: ActorFields;
  /** Optimistic concurrency `version` (default: true for farm/tenant/user-editable records). */
  versioned?: boolean;
  /**
   * Soft delete with deletedAt/deletedBy (default: true for farm records). Append-only ledgers set false:
   * they are corrected with reversal entries, never edited or deleted.
   */
  softDelete?: boolean;
  appendOnly?: boolean;
  /** Relationships expressed by fields without a Mongoose `ref` (embedded ids, polymorphic refs). */
  relations?: Relation[];
  notes?: string[];
  /** Extra hooks and validators, applied before the model is compiled. */
  configure?: (schema: Schema) => void;
}

export interface CollectionMeta extends Omit<CollectionSpec, "fields"> {
  schema: Schema;
  model: string;
}

export const registry: CollectionMeta[] = [];

// ---- field helpers ----------------------------------------------------------

export const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const id = (opts: { required?: boolean } = {}) => ({ type: String, required: opts.required ?? false });
export const ref = (model: string, opts: { required?: boolean } = {}) => ({ type: String, ref: model, required: opts.required ?? false });
export const refs = (model: string) => ({ type: [{ type: String, ref: model }], default: undefined });
export const str = (opts: { required?: boolean; max?: number; trim?: boolean; lowercase?: boolean } = {}) => ({
  type: String,
  required: opts.required ?? false,
  maxlength: opts.max ?? 500,
  trim: opts.trim ?? true,
  ...(opts.lowercase ? { lowercase: true } : {}),
});
export const text = (max = 4000) => ({ type: String, maxlength: max, trim: true });
export const enumOf = (values: readonly string[], opts: { required?: boolean; default?: string } = {}) => ({
  type: String,
  enum: values,
  required: opts.required ?? false,
  ...(opts.default !== undefined ? { default: opts.default } : {}),
});
export const localDate = (opts: { required?: boolean } = {}) => ({ type: String, match: LOCAL_DATE, required: opts.required ?? false });
export const instant = (opts: { required?: boolean } = {}) => ({ type: Date, required: opts.required ?? false });
export const num = (opts: { required?: boolean; min?: number; max?: number; default?: number } = {}) => ({
  type: Number,
  required: opts.required ?? false,
  min: opts.min ?? 0,
  ...(opts.max !== undefined ? { max: opts.max } : {}),
  ...(opts.default !== undefined ? { default: opts.default } : {}),
});
export const int = (opts: { required?: boolean; min?: number; max?: number; default?: number } = {}) => ({
  ...num(opts),
  validate: { validator: (v: unknown) => v === undefined || v === null || Number.isInteger(v), message: "{PATH} must be a whole number" },
});
export const bool = (def = false) => ({ type: Boolean, default: def });

/** Integer minor units + ISO 4217 currency. Never floats. */
export const MoneySchema = new Schema(
  { amountMinor: int({ required: true }), currency: { type: String, required: true, match: /^[A-Z]{3}$/ } },
  { _id: false },
);
export const money = (opts: { required?: boolean } = {}) => ({ type: MoneySchema, required: opts.required ?? false });

export const GeoPointSchema = new Schema({ lat: num({ required: true, min: -90, max: 90 }), lng: num({ required: true, min: -180, max: 180 }) }, { _id: false });
/** GeoJSON point, only where a 2dsphere query exists (marketplace near me). */
export const GeoJsonPointSchema = new Schema(
  { type: { type: String, enum: ["Point"], required: true }, coordinates: { type: [Number], required: true } },
  { _id: false },
);

export const SourceSchema = new Schema({ name: str({ required: true, max: 200 }), url: str({ max: 1000 }), retrievedAt: instant() }, { _id: false });

/** Partial filter so uniqueness only applies to records that are not soft-deleted. */
export const LIVE = { partialFilterExpression: { deletedAt: { $type: "null" } } } as const;

// ---- defineCollection -------------------------------------------------------

export function defineCollection(spec: CollectionSpec): Model<any> {
  const farmOwned = spec.ownership === "farm";
  const actor: ActorFields = spec.actor ?? (farmOwned || spec.ownership === "tenant" ? "required" : "optional");
  const versioned = spec.versioned ?? ["farm", "tenant"].includes(spec.ownership);
  const softDelete = spec.softDelete ?? (farmOwned && !spec.appendOnly);

  const standard: SchemaDefinition = {
    _id: { type: String, required: true },
    ...(farmOwned ? { farmId: { type: String, ref: "Farm", required: true } } : {}),
    ...(actor !== "none"
      ? { createdBy: { type: String, ref: "User", required: actor === "required" }, updatedBy: { type: String, ref: "User" } }
      : {}),
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    ...(versioned ? { version: { type: Number, required: true, default: 0, min: 0 } } : {}),
    ...(softDelete ? { deletedAt: { type: Date, default: null }, deletedBy: { type: String, ref: "User" } } : {}),
  };

  const schema = new Schema({ ...standard, ...spec.fields }, { versionKey: false, minimize: false, strict: "throw", collection: spec.collection });
  schema.pre("validate", function () {
    const now = new Date();
    if (!this.get("createdAt")) this.set("createdAt", now);
    if (!this.get("updatedAt")) this.set("updatedAt", this.get("createdAt") ?? now);
  });
  if (farmOwned) requireFarmScope(schema);
  for (const ix of spec.indexes ?? []) schema.index(ix.fields, ix.options ?? {});
  spec.configure?.(schema);

  const { fields: _fields, configure: _configure, ...meta } = spec;
  registry.push({ ...meta, actor, versioned, softDelete, schema, model: spec.model });
  return mongoose.models[spec.model] ?? mongoose.model(spec.model, schema, spec.collection);
}
