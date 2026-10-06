import { describe, expect, it } from "vitest";
import { evaluateFlockAlerts, type DayFigures } from "./alerts.js";
import { lastNDates } from "./dates.js";

function history(n: number, end: string, fig: (i: number) => DayFigures): Record<string, DayFigures> {
  return Object.fromEntries(lastNDates(end, n).map((d, i) => [d, fig(i)]));
}

describe("evaluateFlockAlerts", () => {
  const today = "2026-10-06";

  it("evaluates yesterday, never today's partial day (B14)", () => {
    const days = history(8, "2026-10-05", () => ({ mortality: 1, birdsAliveStartOfDay: 1000, feedKg: 100 }));
    days["2026-10-06"] = { mortality: 0, birdsAliveStartOfDay: 1000, feedKg: 10 }; // morning, partial
    expect(evaluateFlockAlerts({ flockId: "f", flockName: "House A", days, today, laying: false })).toEqual([]);
  });

  it("raises a missing-record notice when yesterday has nothing", () => {
    const f = evaluateFlockAlerts({ flockId: "f", flockName: "House A", days: {}, today, laying: false });
    expect(f.map((x) => x.rule)).toEqual(["missing_record"]);
    expect(f[0]!.dedupKey).toBe("missing_record:f:2026-10-05");
  });

  it("scales mortality to flock size (B15)", () => {
    const big = history(8, "2026-10-05", (i) => ({ mortality: i === 7 ? 3 : 2, birdsAliveStartOfDay: 20000 }));
    expect(evaluateFlockAlerts({ flockId: "big", flockName: "Big", days: big, today, laying: false })).toEqual([]);

    const small = history(8, "2026-10-05", (i) => ({ mortality: i === 7 ? 6 : 0, birdsAliveStartOfDay: 500 }));
    const f = evaluateFlockAlerts({ flockId: "small", flockName: "Small", days: small, today, laying: false });
    expect(f[0]).toMatchObject({ rule: "mortality_spike", severity: "critical" });
    expect(f[0]!.message).toContain("contact your veterinarian");
  });

  it("flags an egg drop only for laying flocks with enough baseline", () => {
    const days = history(8, "2026-10-05", (i) => ({ mortality: 0, birdsAliveStartOfDay: 1000, eggs: i === 7 ? 780 : 900 }));
    const f = evaluateFlockAlerts({ flockId: "l", flockName: "Layers", days, today, laying: true });
    expect(f.map((x) => x.rule)).toEqual(["egg_drop"]);
    expect(evaluateFlockAlerts({ flockId: "l", flockName: "Layers", days, today, laying: false })).toEqual([]);

    const sparse = history(3, "2026-10-05", (i) => ({ mortality: 0, birdsAliveStartOfDay: 1000, eggs: i === 2 ? 500 : 900 }));
    expect(evaluateFlockAlerts({ flockId: "l", flockName: "Layers", days: sparse, today, laying: true })).toEqual([]);
  });

  it("never names a disease", () => {
    const days = history(8, "2026-10-05", (i) => ({ mortality: i === 7 ? 50 : 0, birdsAliveStartOfDay: 1000, eggs: i === 7 ? 100 : 900, feedKg: i === 7 ? 40 : 110 }));
    const all = evaluateFlockAlerts({ flockId: "x", flockName: "X", days, today, laying: true });
    expect(all).toHaveLength(3);
    for (const a of all) expect(a.message).not.toMatch(/influenza|newcastle|gumboro|coccidiosis|disease/i);
  });
});
