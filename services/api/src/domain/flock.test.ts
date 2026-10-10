import { describe, expect, it } from "vitest";
import {
  acquisitionCostPerBird,
  ageDays,
  assertCanClose,
  assertEventAllowed,
  assertTransition,
  birdsAvailable,
  effectiveEvents,
  population,
  stageFor,
  type LedgerEvent,
} from "./flock.js";

let n = 0;
const ev = (e: Omit<LedgerEvent, "id"> & { id?: string }): LedgerEvent => ({ id: e.id ?? `e${++n}`, ...e });

const base = (): LedgerEvent[] => [
  ev({ id: "place", type: "placement", date: "2026-09-01", birds: 1000, deadOnArrival: 5, costMinor: 4_000_000 }),
  ev({ type: "mortality", date: "2026-09-02", birds: 10 }),
  ev({ type: "cull", date: "2026-09-10", birds: 2 }),
];

describe("population", () => {
  it("adds every event type with the right sign", () => {
    const events = [
      ...base(),
      ev({ type: "transfer_in", date: "2026-09-12", birds: 50 }),
      ev({ type: "split_out", date: "2026-09-15", birds: 100 }),
      ev({ type: "adjustment", date: "2026-09-16", delta: -3 }),
      ev({ type: "sale", date: "2026-10-10", birds: 400 }),
      ev({ type: "weighing", date: "2026-09-20", averageWeightG: 900 }),
      ev({ type: "transfer_house", date: "2026-09-21" }),
    ];
    expect(population(events)).toEqual({
      placed: 995, deadOnArrival: 5, transferredIn: 50, birdsIn: 1045, mortality: 10, culled: 2, sold: 400, transferredOut: 100, adjustments: -3, alive: 530,
    });
  });

  it("respects asOf", () => {
    expect(population(base(), "2026-09-05").alive).toBe(985);
  });

  it("ignores a reversed event and its reversal", () => {
    const events = [...base(), ev({ id: "oops", type: "mortality", date: "2026-09-03", birds: 500 }), ev({ type: "mortality", date: "2026-09-04", birds: 500, reversalOf: "oops" })];
    expect(effectiveEvents(events).map((e) => e.id)).not.toContain("oops");
    expect(population(events).alive).toBe(983);
  });
});

describe("impossible operations", () => {
  it("cannot sell more birds than are alive", () => {
    expect(() => assertEventAllowed(base(), ev({ type: "sale", date: "2026-10-01", birds: 984 }))).toThrow(expect.objectContaining({ code: "INSUFFICIENT_BIRDS" }));
    expect(() => assertEventAllowed(base(), ev({ type: "sale", date: "2026-10-01", birds: 983 }))).not.toThrow();
  });

  it("cannot record deaths before birds arrive", () => {
    expect(() => assertEventAllowed(base(), ev({ type: "mortality", date: "2026-08-31", birds: 1 }))).toThrow(/would leave -1 birds alive on 2026-08-31/);
  });

  it("a back-dated loss cannot invalidate a later sale", () => {
    const sold = [...base(), ev({ type: "sale", date: "2026-10-10", birds: 983 })];
    expect(() => assertEventAllowed(sold, ev({ type: "mortality", date: "2026-09-20", birds: 1 }))).toThrow(/2026-10-10/);
  });

  it("dead on arrival cannot exceed birds received", () => {
    expect(() => assertEventAllowed([], ev({ type: "placement", date: "2026-09-01", birds: 10, deadOnArrival: 11 }))).toThrow(/Dead on arrival/);
  });

  it("a negative adjustment below zero is refused", () => {
    expect(() => assertEventAllowed(base(), ev({ type: "adjustment", date: "2026-09-11", delta: -984 }))).toThrow(expect.objectContaining({ code: "INSUFFICIENT_BIRDS" }));
  });

  it("reversals: cannot reverse twice, reverse a reversal, or reverse a placement birds have already left", () => {
    const sold = [...base(), ev({ id: "sale", type: "sale", date: "2026-10-10", birds: 900 })];
    expect(() => assertEventAllowed(sold, ev({ type: "placement", date: "2026-10-11", reversalOf: "place" }))).toThrow(expect.objectContaining({ code: "INSUFFICIENT_BIRDS" }));
    const rev = ev({ id: "rev", type: "sale", date: "2026-10-11", reversalOf: "sale" });
    expect(() => assertEventAllowed(sold, rev)).not.toThrow();
    expect(() => assertEventAllowed([...sold, rev], ev({ type: "sale", date: "2026-10-12", reversalOf: "sale" }))).toThrow(/already been reversed/);
    expect(() => assertEventAllowed([...sold, rev], ev({ type: "sale", date: "2026-10-12", reversalOf: "rev" }))).toThrow(/cannot itself be reversed/);
    expect(() => assertEventAllowed(sold, ev({ type: "sale", date: "2026-10-12", reversalOf: "nope" }))).toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("birdsAvailable accounts for birds already committed on later dates", () => {
    const events = [...base(), ev({ type: "sale", date: "2026-10-10", birds: 900 })];
    expect(population(events, "2026-09-20").alive).toBe(983);
    expect(birdsAvailable(events, "2026-09-20")).toBe(83);
  });
});

describe("acquisition cost moves with birds", () => {
  it("is cost per bird received, net of birds and cost moved out", () => {
    expect(acquisitionCostPerBird(base())).toBeCloseTo(4_000_000 / 995, 6);
    const afterSplit = [...base(), ev({ type: "split_out", date: "2026-09-15", birds: 199, costMinor: 800_000 })];
    expect(acquisitionCostPerBird(afterSplit)).toBeCloseTo(3_200_000 / 796, 6);
    const withIn = [...base(), ev({ type: "transfer_in", date: "2026-09-15", birds: 5, costMinor: 25_000 })];
    expect(acquisitionCostPerBird(withIn)).toBeCloseTo(4_025_000 / 1000, 6);
    expect(acquisitionCostPerBird([])).toBe(0);
  });
});

describe("lifecycle", () => {
  it("allows planned → active → closed and planned → cancelled only", () => {
    expect(() => assertTransition("planned", "active")).not.toThrow();
    expect(() => assertTransition("active", "closed")).not.toThrow();
    expect(() => assertTransition("planned", "cancelled")).not.toThrow();
    for (const [a, b] of [["planned", "closed"], ["closed", "active"], ["active", "cancelled"], ["cancelled", "active"]] as const) {
      expect(() => assertTransition(a, b), `${a}→${b}`).toThrow(expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }));
    }
  });

  it("closes only when no birds remain and nothing happens after the close date", () => {
    expect(() => assertCanClose(base(), "2026-10-20")).toThrow(/983 birds are still recorded as alive/);
    const sold = [...base(), ev({ type: "sale", date: "2026-10-10", birds: 983 })];
    expect(() => assertCanClose(sold, "2026-10-09")).toThrow(/events after 2026-10-09/);
    expect(() => assertCanClose(sold, "2026-10-10")).not.toThrow();
  });

  it("computes age and stage per flock type", () => {
    expect(ageDays({ hatchDate: "2026-09-01" }, "2026-10-06")).toBe(35);
    expect(ageDays({ placementDate: "2026-09-02", ageDaysAtPlacement: 1 }, "2026-10-06")).toBe(35);
    expect(ageDays({}, "2026-10-06")).toBeNull();
    expect(stageFor("broiler", 14)?.key).toBe("brooding");
    expect(stageFor("broiler", 36)?.key).toBe("finishing");
    expect(stageFor("layer", 200)?.key).toBe("laying");
    expect(stageFor("chick", 30)?.key).toBe("rearing");
    expect(stageFor("custom", 30)).toBeNull();
  });
});
