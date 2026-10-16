import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every route the API actually serves must be in the OpenAPI document, so the authorization sweep (which is
 * driven by the document) covers it. Routes are recorded as they are registered, then compared with the spec.
 */
const require = createRequire(import.meta.url);
const RouterProto = require(require.resolve("router", { paths: [require.resolve("express")] })).prototype as Record<string, (...a: unknown[]) => unknown>;
type Node = { routes: { method: string; path: string }[]; mounts: { prefix: string; child: unknown }[] };
const nodes = new Map<unknown, Node>();
const nodeOf = (r: unknown) => nodes.get(r) ?? (nodes.set(r, { routes: [], mounts: [] }), nodes.get(r)!);
const origRoute = RouterProto["route"]!;
const origUse = RouterProto["use"]!;
RouterProto["route"] = function (this: unknown, ...a: unknown[]) {
  const path = a[0] as string;
  const route = origRoute.call(this, path) as Record<string, (...a: unknown[]) => unknown>;
  const owner = this;
  for (const m of ["get", "post", "put", "patch", "delete"]) {
    const orig = route[m]!;
    route[m] = function (...args: unknown[]) {
      nodeOf(owner).routes.push({ method: m, path });
      return orig.apply(this, args);
    };
  }
  return route;
};
RouterProto["use"] = function (this: unknown, ...args: unknown[]) {
  const prefix = typeof args[0] === "string" ? (args[0] as string) : "/";
  for (const a of args) if (typeof a === "function" && (a as { stack?: unknown }).stack) nodeOf(this).mounts.push({ prefix, child: a });
  return origUse.apply(this, args);
};

describe("route inventory", () => {
  it("every served route is documented (so the security sweep covers it)", async () => {
    const { makeApp } = await import("../harness.js");
    makeApp();
    RouterProto["route"] = origRoute;
    RouterProto["use"] = origUse;
    // The app's v1 router is mounted at /api/v1; find routers that are nobody's child (roots).
    const children = new Set([...nodes.values()].flatMap((n) => n.mounts.map((m) => m.child)));
    const served = new Set<string>();
    const walk = (r: unknown, base: string, depth = 0) => {
      if (depth > 6) return;
      const n = nodes.get(r);
      if (!n) return;
      for (const rt of n.routes) served.add(`${rt.method.toUpperCase()} ${(base + rt.path).replace(/\/+$/, "").replace(/:(\w+)/g, "{$1}") || "/"}`);
      for (const m of n.mounts) walk(m.child, base + (m.prefix === "/" ? "" : m.prefix), depth + 1);
    };
    for (const r of nodes.keys()) if (!children.has(r)) walk(r, "");
    const spec = JSON.parse(readFileSync(join(__dirname, "../../../../../packages/contracts/openapi.json"), "utf8")) as { paths: Record<string, Record<string, unknown>> };
    const documented = new Set(Object.entries(spec.paths).flatMap(([p, ms]) => Object.keys(ms).map((m) => `${m.toUpperCase()} ${p}`)));
    const undocumented = [...served].filter((s) => !documented.has(s) && !/\/openapi/.test(s)).sort();
    expect(served.size).toBeGreaterThan(200);
    expect(undocumented).toEqual([]);
  });
});
