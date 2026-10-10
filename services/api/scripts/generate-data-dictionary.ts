import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderDataDictionary } from "../src/adapters/mongo/models/dictionary.js";

const out = fileURLToPath(new URL("../../../docs/data-dictionary.md", import.meta.url));
writeFileSync(out, renderDataDictionary() + "\n");
console.log(`Data dictionary written to ${out}`);
