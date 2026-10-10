import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILES,
  ageDays,
  assertCanClose,
  assertEventAllowed,
  assertTransition,
  population,
  stageFor,
  type FlockEvent,
} from "./flock.js";

const base: FlockEvent[] = [
  { type: "placement", date: "2026-09-01", birdsReceived: 1000, deadOnArrival: 5 },
  { type: "mortality", date: "2026-09-02", count: 10 },
  { type: "mortality", date: "2026-09-10", count: 5 },
  { type: "cull", date: "2026-09-15", count: 2 },
];

describe("population (B18, B21)", () => {
  it("derives alive from events, counting DOA and sales", () => {
    const p = population([...base, { type: "sale", date: "2026-10-10", birds: 300, totalLiveWeightKg: 690 }]);
    expect(p).toMatchObject({ placed: 995, mortality: 15, culled: 2, sold: 300, alive: 678, soldLiveWeightKg: 690 });
  });
  it("respects asOf", () => {
    expect(population(base, "2026-09-05").alive).toBe(985);
  });
});

describe("assertEventAllowed", () => {
  it("rejects a sale larger than birds alive", () => {
    expect(() =>
      assertEventAllowed(base, { type: "sale", date: "2026-10-10", birds: 979, totalLiveWeightKg: 2000 }),
    ).toThrow(/would leave -1 birds/);
  });
  it("rejects a back-dated loss that invalidates a later sale", () => {
    const events: FlockEvent[] = [...base, { type: "sale", date: "2026-10-10", birds: 978, totalLiveWeightKg: 2200 }];
    expect(() => assertEventAllowed(events, { type: "mortality", date: "2026-09-20", count: 1 })).toThrow(
      expect.objectContaining({ code: "INSUFFICIENT_BIRDS" }),
    );
  });
});

describe("status transitions", () => {
  it("allows the defined lifecycle and refuses shortcuts", () => {
    expect(() => assertTransition("planned", "active")).not.toThrow();
    expect(() => assertTransition("active", "closed")).not.toThrow();
    expect(() => assertTransition("planned", "closed")).toThrow(expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }));
    expect(() => assertTransition("cancelled", "active")).toThrow();
  });
  it("closing requires every bird accounted for (B21)", () => {
    expect(() => assertCanClose(base)).toThrow(/978 birds are still recorded as alive/);
    expect(() =>
      assertCanClose([...base, { type: "sale", date: "2026-10-12", birds: 978, totalLiveWeightKg: 2250 }]),
    ).not.toThrow();
  });
});

describe("age and stage", () => {
  const broiler = DEFAULT_PROFILES.find((p) => p.key === "chicken_broiler")!;
  const layer = DEFAULT_PROFILES.find((p) => p.key === "chicken_layer")!;
  it("uses hatch date, or placement plus age at placement", () => {
    expect(ageDays({ hatchDate: "2026-09-01" }, "2026-10-06")).toBe(35);
    expect(ageDays({ placementDate: "2026-09-02", ageDaysAtPlacement: 1 }, "2026-10-06")).toBe(35);
    expect(ageDays({}, "2026-10-06")).toBeNull();
  });
  it("keeps the prototype broiler boundaries", () => {
    expect(stageFor(broiler, 14)?.key).toBe("brooding");
    expect(stageFor(broiler, 15)?.key).toBe("grow_out");
    expect(stageFor(broiler, 35)?.key).toBe("grow_out");
    expect(stageFor(broiler, 36)?.key).toBe("finishing");
  });
  it("gives layers laying stages instead of 'Finishing' forever", () => {
    expect(stageFor(layer, 200)?.key).toBe("laying");
    expect(stageFor(layer, 60)?.key).toBe("grower");
  });
});
