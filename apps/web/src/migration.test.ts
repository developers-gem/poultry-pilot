import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GROUPS } from "./components/AppShell";
import { pages } from "./pages";

/** Every route of the Lovable prototype (src/routes/_authenticated/*.tsx there), migrated at the same path. */
const PROTOTYPE_ROUTES = [
  "/alerts", "/biosecurity", "/calendar", "/chicks", "/dashboard", "/eggs", "/expenses", "/facts", "/farm-profile", "/feed", "/flocks",
  "/glossary", "/hatchery", "/health", "/lifecycle", "/market", "/money", "/news", "/training", "/weather", "/weights",
];

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const source = files(__dirname).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts"));

describe("migration from the Lovable prototype", () => {
  /** Pages added after the migration, on purpose (the prototype had none of these). */
  const ADDED_SINCE = ["/daily"];

  it("every prototype route exists at the same path (plus only the pages deliberately added since)", () => {
    expect(Object.keys(pages).sort()).toEqual([...PROTOTYPE_ROUTES, ...ADDED_SINCE].sort());
  });

  it("every navigation link points at a registered page", () => {
    const links = GROUPS.flatMap((g) => [g.to, ...(g.items ?? []).map((i) => i.to)]);
    expect(links.filter((l) => !pages[l])).toEqual([]);
    expect(new Set(links).size).toBe(PROTOTYPE_ROUTES.length - 1 + ADDED_SINCE.length); // all but /alerts (the header pill)
  });

  it("has no Supabase, no Lovable runtime, and no third-party API called from the browser", () => {
    const pkg = readFileSync(join(__dirname, "../package.json"), "utf8");
    expect(pkg).not.toMatch(/supabase|lovable/i);
    for (const f of source) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/@supabase|supabase\.|lovable\.dev|open-meteo|geocoding-api/i);
    }
  });

  it("talks to the backend only through the API client", () => {
    const direct = source.filter((f) => !f.endsWith("api/client.ts")).filter((f) => /\bfetch\(/.test(readFileSync(f, "utf8")));
    expect(direct).toEqual([]);
  });
});
