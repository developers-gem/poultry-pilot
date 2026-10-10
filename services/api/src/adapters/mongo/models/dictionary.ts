import type { Schema, SchemaType } from "mongoose";
import { registry, type CollectionMeta } from "./base.js";
import "./index.js";

/**
 * Renders docs/data-dictionary.md from the live schema declarations, so the dictionary can never
 * disagree with what the database enforces. Regenerate with: pnpm --filter @poultrypilot/api docs:data-dictionary
 */

interface FieldRow {
  path: string;
  type: string;
  required: boolean;
  constraints: string;
  ref?: string;
}

const STANDARD = new Set(["_id", "farmId", "createdBy", "updatedBy", "createdAt", "updatedAt", "version", "deletedAt", "deletedBy"]);

function describeType(t: SchemaType): { type: string; constraints: string[]; ref?: string; sub?: Schema } {
  const o = t.options as Record<string, any>;
  const constraints: string[] = [];
  const enumValues = (t as unknown as { enumValues?: string[] }).enumValues;
  if (enumValues?.length) constraints.push(`one of: ${enumValues.map((v) => `\`${v}\``).join(", ")}`);
  if (o["match"]) constraints.push(`pattern \`${String(o["match"]).replace(/\|/g, "\\|")}\``);
  if (o["min"] !== undefined && o["min"] !== 0) constraints.push(`min ${o["min"]}`);
  if (o["max"] !== undefined) constraints.push(`max ${o["max"]}`);
  if (o["maxlength"] !== undefined) constraints.push(`≤ ${o["maxlength"]} chars`);
  if (o["default"] !== undefined && typeof o["default"] !== "function" && !(Array.isArray(o["default"]) && o["default"].length === 0)) {
    constraints.push(`default \`${JSON.stringify(o["default"])}\``);
  }
  if (o["lowercase"]) constraints.push("lowercased");
  if (o["validate"]) constraints.push(/whole number/.test(String(o["validate"]?.message ?? "")) ? "integer" : "custom validation");
  const instance = t.instance;
  if (instance === "Embedded" || instance === "SubdocumentPath") return { type: "object", constraints, sub: (t as unknown as { schema: Schema }).schema };
  if (instance === "Array") {
    const caster = (t as unknown as { caster?: SchemaType; schema?: Schema }).caster;
    const sub = (t as unknown as { schema?: Schema }).schema;
    if (sub) return { type: "array of objects", constraints, sub };
    const inner = caster ? describeType(caster) : { type: "Mixed", constraints: [] as string[] };
    return { type: `array of ${inner.type}`, constraints: [...constraints, ...inner.constraints], ...(inner.ref ? { ref: inner.ref } : {}) };
  }
  if (instance === "Map") {
    const of = o["of"]?.name ?? (typeof o["of"] === "function" ? o["of"].name : "Mixed");
    return { type: `map of ${of ?? "Number"}`, constraints };
  }
  return { type: instance === "ObjectID" ? "ObjectId" : instance, constraints, ...(o["ref"] ? { ref: o["ref"] as string } : {}) };
}

function fieldRows(schema: Schema, prefix = ""): FieldRow[] {
  const rows: FieldRow[] = [];
  schema.eachPath((path, t) => {
    if (!prefix && STANDARD.has(path)) return;
    const d = describeType(t);
    rows.push({ path: prefix + path, type: d.type, required: !!t.isRequired, constraints: d.constraints.join("; "), ...(d.ref ? { ref: d.ref } : {}) });
    if (d.sub) rows.push(...fieldRows(d.sub, `${prefix}${path}${d.type.startsWith("array") ? "[]" : ""}.`));
  });
  return rows;
}

function standardFields(c: CollectionMeta): string {
  const parts = ["`_id` (UUIDv7 string)"];
  if (c.ownership === "farm") parts.push("`farmId` (required)");
  if (c.actor === "required") parts.push("`createdBy` (required), `updatedBy`");
  if (c.actor === "optional") parts.push("`createdBy`, `updatedBy` (when a person made the change)");
  parts.push("`createdAt`, `updatedAt` (UTC, required)");
  if (c.versioned) parts.push("`version` (optimistic concurrency)");
  if (c.softDelete) parts.push("`deletedAt`, `deletedBy` (soft delete)");
  return parts.join(", ");
}

const OWNERSHIP: Record<CollectionMeta["ownership"], string> = {
  farm: "Farm — every query must include farmId",
  tenant: "Tenant root (its _id is the farmId)",
  user: "User — belongs to one person",
  global: "Global — shared reference data",
  system: "System — written by the API only",
};

const keyText = (fields: Record<string, unknown>) =>
  Object.entries(fields)
    .map(([k, v]) => `${k}${v === 1 ? "" : v === -1 ? " ↓" : ` (${v})`}`)
    .join(", ");

function optionText(o: Record<string, any> | undefined): string {
  if (!o) return "";
  const out: string[] = [];
  if (o["unique"]) out.push("unique");
  if (o["sparse"]) out.push("sparse");
  if (o["expireAfterSeconds"] !== undefined) out.push(`TTL ${Math.round(o["expireAfterSeconds"] / 86_400) || 0} d`);
  if (o["partialFilterExpression"]) out.push(o["partialFilterExpression"]["deletedAt"] ? "live records only" : `partial: ${JSON.stringify(o["partialFilterExpression"])}`);
  return out.join(", ");
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function relationships(): { from: string; field: string; to: string; cardinality: string; note?: string }[] {
  const byModel = new Map(registry.map((c) => [c.model, c.collection]));
  const out: { from: string; field: string; to: string; cardinality: string; note?: string }[] = [];
  for (const c of registry) {
    for (const r of fieldRows(c.schema)) {
      if (r.ref) out.push({ from: c.collection, field: r.path, to: byModel.get(r.ref) ?? r.ref, cardinality: r.type.startsWith("array") ? "many-to-many" : "many-to-one" });
    }
    if (c.ownership === "farm") out.push({ from: c.collection, field: "farmId", to: "farms", cardinality: "many-to-one" });
    for (const r of c.relations ?? []) out.push({ from: c.collection, field: r.field, to: r.to, cardinality: r.cardinality, ...(r.note ? { note: r.note } : {}) });
  }
  return out;
}

export function renderDataDictionary(): string {
  const domains = [...new Set(registry.map((c) => c.domain))];
  const L: string[] = [];
  const totalIndexes = registry.reduce((t, c) => t + (c.indexes?.length ?? 0), 0);
  L.push("# PoultryPilot data dictionary", "");
  L.push("> Generated from the Mongoose schemas in `services/api/src/adapters/mongo/models`. Do not edit by hand:");
  L.push("> run `pnpm --filter @poultrypilot/api docs:data-dictionary`. A test fails if this file is out of date.", "");
  L.push(`${registry.length} collections, ${totalIndexes} secondary indexes (plus the default \`_id\` index on each). Design rules and relationships: \`docs/data-model.md\`.`, "");
  L.push("| Collection | Domain | Ownership | Indexes | Purpose |", "| --- | --- | --- | --- | --- |");
  for (const c of registry) L.push(`| [\`${c.collection}\`](#${c.collection}) | ${c.domain} | ${c.ownership}${c.appendOnly ? ", append-only" : ""} | ${c.indexes?.length ?? 0} | ${cell(c.description.split(". ")[0]!.replace(/\.$/, ""))} |`);
  L.push("");

  for (const domain of domains) {
    L.push(`## ${domain}`, "");
    for (const c of registry.filter((x) => x.domain === domain)) {
      L.push(`### ${c.collection}`, "");
      L.push(c.description, "");
      L.push(`- **Model:** \`${c.model}\``);
      L.push(`- **Ownership:** ${OWNERSHIP[c.ownership]}`);
      L.push(`- **Standard fields:** ${standardFields(c)}`);
      if (c.appendOnly) L.push("- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`");
      L.push("");
      const rows = fieldRows(c.schema);
      if (rows.length) {
        L.push("| Field | Type | Required | Constraints | References |", "| --- | --- | --- | --- | --- |");
        for (const r of rows) L.push(`| \`${r.path}\` | ${r.type} | ${r.required ? "yes" : ""} | ${cell(r.constraints)} | ${r.ref ? `\`${r.ref}\`` : ""} |`);
        L.push("");
      }
      if (c.indexes?.length) {
        L.push("| Index | Options | Serves |", "| --- | --- | --- |");
        for (const ix of c.indexes) L.push(`| ${keyText(ix.fields)} | ${optionText(ix.options as Record<string, any>)} | ${cell(ix.why)} |`);
        L.push("");
      } else {
        L.push("No secondary indexes: read by `_id` only.", "");
      }
      for (const r of c.relations ?? []) L.push(`- **Relationship:** \`${r.field}\` → ${r.to} (${r.cardinality})${r.note ? ` — ${r.note}` : ""}`);
      for (const n of c.notes ?? []) L.push(`- ${n}`);
      if ((c.relations?.length ?? 0) + (c.notes?.length ?? 0)) L.push("");
    }
  }

  L.push("## Relationship index", "", "Every reference between collections, derived from the schemas.", "");
  L.push("| From | Field | To | Cardinality |", "| --- | --- | --- | --- |");
  for (const r of relationships().filter((x) => x.field !== "farmId")) L.push(`| \`${r.from}\` | \`${r.field}\` | ${r.to.includes("|") || r.to.includes(" ") ? cell(r.to) : `\`${r.to}\``} | ${r.cardinality}${r.note ? ` (${cell(r.note)})` : ""} |`);
  L.push("", "Every farm-owned collection also references `farms` through `farmId` (many-to-one).", "");
  return L.join("\n");
}
