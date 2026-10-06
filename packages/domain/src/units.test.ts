import { describe, expect, it } from "vitest";
import { cToF, convertWeight, displayWeight, fToC, toGrams } from "./units.js";

describe("units", () => {
  it("converts weights with exact constants", () => {
    expect(convertWeight(1, "lb", "g")).toBeCloseTo(453.59237, 6);
    expect(convertWeight(2.5, "kg", "lb")).toBeCloseTo(5.51155655, 6);
    expect(toGrams(16, "oz")).toBeCloseTo(453.59237, 6);
  });
  it("round-trips temperature", () => {
    expect(cToF(35)).toBe(95);
    expect(fToC(cToF(32.4))).toBeCloseTo(32.4, 10);
  });
  it("chooses sensible display units", () => {
    expect(displayWeight(450, "metric", "bird")).toEqual({ value: 450, unit: "g" });
    expect(displayWeight(2350, "metric", "bird")).toEqual({ value: 2.35, unit: "kg" });
    expect(displayWeight(2350, "imperial", "bird").unit).toBe("lb");
    expect(displayWeight(200, "imperial", "bird").unit).toBe("oz");
  });
});
