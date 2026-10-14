import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { captureMobileFixtures } from "./mobile-fixtures.js";

/**
 * The mobile app's models are tested (in Dart) against apps/mobile/test/fixtures. This test recaptures those
 * responses from the API and fails if their structure changed, so the API cannot break the app silently.
 * After an intended change: npx tsx services/api/scripts/mobile-fixtures.ts, then update the Dart models.
 */
const dir = join(__dirname, "../../../../apps/mobile/test/fixtures");

/** Keys and value types, recursively; arrays by their first element. Values themselves (ids, times) may differ. */
function shape(v: unknown): unknown {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? [shape(v[0])] : ["empty"];
  if (typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, shape((v as Record<string, unknown>)[k])]));
  return typeof v;
}

describe("mobile app contract", () => {
  it("every fixture the mobile app is tested against still matches the API", async () => {
    const live = await captureMobileFixtures();
    const files = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    expect(files.sort()).toEqual(Object.keys(live).sort());
    for (const name of files) {
      const committed = JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8"));
      expect(shape(live[name]), `fixture ${name} changed shape: regenerate with services/api/scripts/mobile-fixtures.ts and update the Dart models`).toEqual(shape(committed));
    }
  });
});
