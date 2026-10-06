import type { UnitSystem } from "@poultrypilot/contracts";

/**
 * Storage is always metric (g, kg, °C, mm, L, m²). Conversion happens only for display and input.
 * Constants are exact international definitions.
 */
export const KG_PER_LB = 0.45359237;
export const G_PER_OZ = 28.349523125;
export const MM_PER_IN = 25.4;
export const L_PER_US_GAL = 3.785411784;
export const M2_PER_FT2 = 0.09290304;

export type WeightUnit = "g" | "kg" | "oz" | "lb";
const GRAMS_PER: Record<WeightUnit, number> = { g: 1, kg: 1000, oz: G_PER_OZ, lb: KG_PER_LB * 1000 };

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  return (value * GRAMS_PER[from]) / GRAMS_PER[to];
}

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;
export const mmToIn = (mm: number) => mm / MM_PER_IN;
export const litresToUsGallons = (l: number) => l / L_PER_US_GAL;
export const m2ToFt2 = (m2: number) => m2 / M2_PER_FT2;

/** Pick the display unit for a weight: per-bird weights in g/oz→lb, bulk weights in kg/lb. */
export function displayWeight(
  grams: number,
  system: UnitSystem,
  scale: "bird" | "bulk",
): { value: number; unit: WeightUnit } {
  if (system === "metric") {
    return scale === "bird" && grams < 1000 ? { value: grams, unit: "g" } : { value: grams / 1000, unit: "kg" };
  }
  return scale === "bird" && grams < GRAMS_PER.lb
    ? { value: convertWeight(grams, "g", "oz"), unit: "oz" }
    : { value: convertWeight(grams, "g", "lb"), unit: "lb" };
}

/** Convert a user-entered weight to canonical grams. */
export function toGrams(value: number, unit: WeightUnit): number {
  return convertWeight(value, unit, "g");
}

export function displayTemperature(celsius: number, system: UnitSystem): { value: number; unit: "°C" | "°F" } {
  return system === "metric" ? { value: celsius, unit: "°C" } : { value: cToF(celsius), unit: "°F" };
}
