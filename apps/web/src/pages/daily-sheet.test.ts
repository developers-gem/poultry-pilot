import { describe, expect, it } from "vitest";
import { rowPatch } from "./DailySheet";

/** What one row of the daily sheet saves: only the cells filled in, in the units the API keeps. */
describe("daily sheet row", () => {
  it("sends only the cells that were filled in (nothing else on the day is touched)", () => {
    expect(rowPatch({ water: "210" }, null)).toEqual({ waterLitres: 210 });
    expect(rowPatch({ deaths: "", water: "" }, null)).toEqual({});
  });

  it("feed in bags becomes kg, with the feed chosen", () => {
    expect(rowPatch({ feed: "4.5" }, { itemId: "mash", bagSizeKg: 50 })).toEqual({ feed: [{ quantityKg: 225, feedItemId: "mash" }] });
    expect(rowPatch({ feed: "120" }, { itemId: "mash", bagSizeKg: null })).toEqual({ feed: [{ quantityKg: 120, feedItemId: "mash" }] });
  });

  it("eggs as trays of 30 plus loose eggs; broken counted separately", () => {
    expect(rowPatch({ trays: "133", loose: "10", broken: "6" }, null)).toEqual({ eggs: { collected: 4000, broken: 6 } });
  });

  it("deaths and temperatures; zero deaths clears them instead of being ignored", () => {
    expect(rowPatch({ deaths: "3", tmin: "24.5", tmax: "33" }, null)).toEqual({ mortality: [{ cause: "unknown", count: 3 }], temperatureMinC: 24.5, temperatureMaxC: 33 });
    expect(rowPatch({ deaths: "0" }, null)).toEqual({ mortality: [] });
  });
});
