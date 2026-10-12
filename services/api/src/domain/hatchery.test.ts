import { describe, expect, it } from "vitest";
import { assertBands, assertHatchEventAllowed, batchCounts, evaluateBrooderCheck, hatcheryMetrics, reversibleHatchEvent, type HatchEvent } from "./hatchery.js";

/** 1000 eggs set; every expected number below is worked out by hand. */
const SET = 1000;
const events: HatchEvent[] = [
  { id: "c1", type: "candling", date: "2026-10-08", counts: { infertile: 80, deadEmbryo: 20, cracked: 5 } },
  { id: "c2", type: "candling", date: "2026-10-15", counts: { deadEmbryo: 10 } },
  { id: "t", type: "transfer_to_hatcher", date: "2026-10-19", counts: { cracked: 5, deadEmbryo: 5 } },
  // 1000 − 105 − 10 − 10 = 875 in the hatcher
  { id: "h", type: "hatch", date: "2026-10-22", counts: { hatched: 830, deadInShell: 45 } },
  { id: "g", type: "chick_grading", date: "2026-10-22", counts: { saleable: 810, culled: 20 } },
];

describe("batch counts", () => {
  it("derives every bucket from the events", () => {
    expect(batchCounts(SET, events)).toEqual({ eggsSet: 1000, infertile: 80, cracked: 10, deadEmbryo: 35, transferred: 875, hatched: 830, deadInShell: 45, culled: 20, saleable: 810, inIncubation: 0, stage: "graded" });
  });
  it("every egg is accounted for exactly once", () => {
    const c = batchCounts(SET, events);
    expect(c.infertile + c.cracked + c.deadEmbryo + c.deadInShell + c.culled + c.saleable).toBe(SET);
  });
});

describe("metrics", () => {
  const m = hatcheryMetrics(batchCounts(SET, events));
  it("fertility = 910 fertile ÷ 990 judged (1000 − 10 cracked) = 91.92%", () => {
    expect(m.fertile).toBe(910);
    expect(m.fertilityPercent).toBeCloseTo(91.919192, 5);
  });
  it("hatchability = 830 ÷ 910 fertile = 91.21%; hatch of set = 83%", () => {
    expect(m.hatchabilityPercent).toBeCloseTo(91.208791, 5);
    expect(m.hatchOfSetPercent).toBe(83);
  });
  it("saleable = 810 ÷ 1000 = 81%; of hatched 97.59%; loss = 19%", () => {
    expect(m.saleableChickPercent).toBe(81);
    expect(m.saleableOfHatchedPercent).toBeCloseTo(97.590361, 5);
    expect(m.lossPercent).toBe(19);
  });
  it("hatch and sale figures stay null until those stages are recorded", () => {
    const early = hatcheryMetrics(batchCounts(SET, events.slice(0, 2)));
    expect(early.fertilityPercent).toBeCloseTo((915 / 995) * 100, 5);
    expect(early).toMatchObject({ hatchabilityPercent: null, saleableChickPercent: null, lossPercent: null });
  });
});

describe("stage order and accounting", () => {
  const ev = (type: HatchEvent["type"], counts: HatchEvent["counts"]): HatchEvent => ({ id: "x", type, date: "2026-10-20", counts });
  it("cannot remove more eggs than are incubating", () => {
    expect(() => assertHatchEventAllowed(SET, [], ev("candling", { infertile: 1001 }))).toThrow(/Only 1000 eggs/);
  });
  it("candling only before transfer; one transfer; one hatch; grading after hatch", () => {
    expect(() => assertHatchEventAllowed(SET, events.slice(0, 3), ev("candling", { infertile: 1 }))).toThrow(/before eggs move/);
    expect(() => assertHatchEventAllowed(SET, events.slice(0, 3), ev("transfer_to_hatcher", {}))).toThrow(/already been transferred/);
    expect(() => assertHatchEventAllowed(SET, events.slice(0, 3), ev("chick_grading", { saleable: 1 }))).toThrow(/after the hatch/);
    expect(() => assertHatchEventAllowed(SET, events, ev("chick_grading", { saleable: 1 }))).toThrow(/already graded/);
  });
  it("the hatch must account for every egg in the hatcher, and grading for every chick", () => {
    expect(() => assertHatchEventAllowed(SET, events.slice(0, 3), ev("hatch", { hatched: 830, deadInShell: 40 }))).toThrow(/must equal the 875 eggs/);
    expect(() => assertHatchEventAllowed(SET, events.slice(0, 4), ev("chick_grading", { saleable: 800, culled: 20 }))).toThrow(/must equal the 830 chicks/);
    expect(() => assertHatchEventAllowed(SET, events.slice(0, 4), ev("chick_grading", { saleable: 810, culled: 20 }))).not.toThrow();
  });
  it("a hatch can be recorded without a separate transfer (single-stage machines)", () => {
    expect(() => assertHatchEventAllowed(SET, events.slice(0, 2), ev("hatch", { hatched: 800, deadInShell: 85 }))).not.toThrow();
  });
  it("reversals undo the latest counted event, one step at a time", () => {
    expect(reversibleHatchEvent(events)?.id).toBe("g");
    const undone = [...events, { id: "r", type: "reversal" as const, date: "2026-10-22", reversalOf: "g" }];
    expect(reversibleHatchEvent(undone)?.id).toBe("h");
    expect(batchCounts(SET, undone).stage).toBe("hatched");
  });
});

describe("brooding", () => {
  const bands = [{ fromDay: 0, toDay: 3, tempMinC: 31, tempMaxC: 33, humidityMin: 55, humidityMax: 70 }, { fromDay: 4, toDay: 7, tempMinC: 29, tempMaxC: 31 }];
  it("flags readings outside the farm's own band for that day", () => {
    expect(evaluateBrooderCheck({ dayOfAge: 2, temperatureC: 29.5, humidityPercent: 50, behaviour: "huddling" }, bands).flags).toEqual(["temperature_low", "humidity_low", "behaviour"]);
    expect(evaluateBrooderCheck({ dayOfAge: 5, temperatureC: 30, behaviour: "comfortable", feedAvailable: true, waterAvailable: false }, bands).flags).toEqual(["no_water"]);
  });
  it("without a profile, readings are recorded but not judged", () => {
    expect(evaluateBrooderCheck({ dayOfAge: 2, temperatureC: 20 }, undefined)).toEqual({ band: null, flags: [] });
  });
  it("bands cannot overlap or run backwards", () => {
    expect(() => assertBands([{ fromDay: 0, toDay: 3 }, { fromDay: 3, toDay: 7 }])).toThrow(/overlap at day 3/);
    expect(() => assertBands([{ fromDay: 5, toDay: 2 }])).toThrow(/ends before it starts/);
    expect(() => assertBands([{ fromDay: 0, toDay: 3, tempMinC: 34, tempMaxC: 32 }])).toThrow(/minimum temperature above maximum/);
  });
});
