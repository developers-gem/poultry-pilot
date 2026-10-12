import { describe, expect, it } from "vitest";
import { RULE_DEFINITIONS, RULE_FOR_ALERT, baselineOf, deviationFrom, effectiveParams, validateRuleParams, weatherRisks } from "./intelligence.js";

describe("baselines and deviations", () => {
  it("mean and standard deviation of the flock's own days; nothing until enough history", () => {
    expect(baselineOf([4, 6, 5, 5], 3)).toMatchObject({ mean: 5, n: 4, min: 4, max: 6 });
    expect(baselineOf([4, 6, 5, 5], 3)!.sd).toBeCloseTo(0.8165, 3);
    expect(baselineOf([4, 6], 3)).toBeNull();
  });

  it("triggers on percentage or z-score, in the chosen direction, with an absolute floor", () => {
    const b = baselineOf([10, 12, 11, 9, 10, 11, 10], 3)!; // mean ≈ 10.43
    expect(deviationFrom(17, b, { direction: "above", deviationPercent: 50, minAbsoluteChange: 3 }).triggered).toBe(true);
    expect(deviationFrom(14, b, { direction: "above", deviationPercent: 50, minAbsoluteChange: 3 }).triggered).toBe(false);
    expect(deviationFrom(4, b, { direction: "above", deviationPercent: 50 }).triggered).toBe(false); // wrong way
    expect(deviationFrom(4, b, { direction: "both", deviationPercent: 50 })).toMatchObject({ triggered: true, direction: "below" });
    expect(deviationFrom(14, b, { direction: "above", zScore: 3 }).triggered).toBe(true);
  });

  it("small numbers do not alarm: 2 deaths against an average of 1 is +100% but only one bird", () => {
    const b = baselineOf([1, 1, 1, 1], 3)!;
    expect(deviationFrom(2, b, { direction: "above", deviationPercent: 50, minAbsoluteChange: 3 }).triggered).toBe(false);
    expect(deviationFrom(5, b, { direction: "above", deviationPercent: 50, minAbsoluteChange: 3 }).triggered).toBe(true);
  });
});

describe("rule catalog", () => {
  it("covers every requested rule, and every alert type maps back to one rule", () => {
    expect(Object.keys(RULE_DEFINITIONS)).toEqual(["mortality", "egg_production", "feed_consumption", "water_consumption", "weight_variance", "fcr_variance", "inventory", "medicine_expiry", "vaccination_due", "vet_appointment", "hatch_date", "order_delivery", "payment_overdue", "weather_risk"]);
    expect(RULE_FOR_ALERT.mortality_spike).toBe("mortality");
    expect(RULE_FOR_ALERT.expired_stock).toBe("medicine_expiry");
  });

  it("absolute limits have no default: they apply only when the farm sets them", () => {
    expect(effectiveParams("mortality", undefined)).toEqual({ windowDays: 7, minBaselineDays: 3, deviationPercent: 50, minExtraBirds: 3 });
    expect(effectiveParams("mortality", { dailyRatePercentMax: 0.5, deviationPercent: 30 })).toMatchObject({ deviationPercent: 30, dailyRatePercentMax: 0.5 });
    expect(effectiveParams("water_consumption", undefined)).not.toHaveProperty("phMin");
    expect(effectiveParams("weather_risk", undefined)).not.toHaveProperty("heatMaxC");
  });

  it("rejects unknown parameters and out-of-range values", () => {
    expect(() => validateRuleParams("mortality", { banana: 1 })).toThrow(/Unknown parameter/);
    expect(() => validateRuleParams("water_consumption", { phMin: 20 })).toThrow(/between 0 and 14/);
    expect(() => validateRuleParams("fcr_variance", { targetFcr: 1.6 })).not.toThrow();
  });
});

describe("weather risk", () => {
  const history = Array.from({ length: 14 }, (_, i) => ({ date: `2026-09-${String(i + 10).padStart(2, "0")}`, tempMaxC: 32, tempMinC: 22 }));
  const p = effectiveParams("weather_risk", undefined);
  it("judges the forecast against this farm's own recent weather", () => {
    const r = weatherRisks([{ date: "2026-10-01", tempMaxC: 37, tempMinC: 24 }, { date: "2026-10-02", tempMaxC: 34, tempMinC: 17 }], history, p);
    expect(r.baseline).toEqual({ avgMaxC: 32, avgMinC: 22, days: 14 });
    expect(r.risks.map((x) => `${x.date}:${x.kind}`)).toEqual(["2026-10-01:heat", "2026-10-02:cold"]);
    expect(r.risks[0]!.reason).toMatch(/5 °C above this farm's recent average high \(32 °C\)/);
  });
  it("fixed limits for rain, wind and heat apply only when set", () => {
    const f = [{ date: "2026-10-01", tempMaxC: 33, rainMm: 80, windMaxKph: 70 }];
    expect(weatherRisks(f, history, p).risks).toEqual([]);
    const set = effectiveParams("weather_risk", { rainMm: 50, windKph: 60, heatMaxC: 32.5 });
    expect(weatherRisks(f, history, set).risks.map((x) => x.kind).sort()).toEqual(["heat", "rain", "wind"]);
  });
  it("without enough history, only farm-set limits can trigger", () => {
    expect(weatherRisks([{ date: "2026-10-01", tempMaxC: 45 }], history.slice(0, 3), p).risks).toEqual([]);
  });
});
