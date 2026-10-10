import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { relationships, renderDataDictionary } from "../adapters/mongo/models/dictionary.js";
import { registry } from "../adapters/mongo/models/index.js";

describe("data dictionary", () => {
  it("docs/data-dictionary.md matches the schemas (run pnpm --filter @poultrypilot/api docs:data-dictionary)", () => {
    const committed = readFileSync(fileURLToPath(new URL("../../../../docs/data-dictionary.md", import.meta.url)), "utf8");
    expect(committed).toBe(renderDataDictionary() + "\n");
  });

  it("lists every collection and resolves every relationship to a known collection", () => {
    const doc = renderDataDictionary();
    for (const c of registry) expect(doc).toContain(`### ${c.collection}`);
    const names = new Set(registry.map((c) => c.collection));
    const unresolved = relationships().filter((r) => !r.to.includes("|") && !r.to.includes(" ") && !r.to.includes(".") && !names.has(r.to));
    expect(unresolved).toEqual([]);
  });
});
