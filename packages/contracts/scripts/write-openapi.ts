import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOpenApiDocument } from "../src/openapi.js";

/** Writes packages/contracts/openapi.json — the input for web and Dart client generation. */
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../openapi.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(buildOpenApiDocument(), null, 2) + "\n");
console.log(`OpenAPI document written to ${out}`);
