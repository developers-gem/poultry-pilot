import { describe, expect, it } from "vitest";
import { addDays, addMonthsClamped, dateRange, daysBetween, lastNDates, localDateOf } from "./dates.js";

describe("localDateOf (B11: farm-local, not UTC)", () => {
  it("02:00 in Kolkata is still the same local day even though UTC is the previous day", () => {
    const instant = new Date("2026-10-05T20:30:00Z"); // 2026-10-06 02:00 IST
    expect(localDateOf(instant, "Asia/Kolkata")).toBe("2026-10-06");
    expect(localDateOf(instant, "UTC")).toBe("2026-10-05");
  });
  it("evening in Chicago does not roll over to tomorrow", () => {
    const instant = new Date("2026-10-07T02:00:00Z"); // 2026-10-06 21:00 CDT
    expect(localDateOf(instant, "America/Chicago")).toBe("2026-10-06");
  });
});

describe("daysBetween", () => {
  it("is signed and never clamped (B5, B20)", () => {
    expect(daysBetween("2026-10-01", "2026-10-06")).toBe(5);
    expect(daysBetween("2026-10-06", "2026-10-01")).toBe(-5);
  });
  it("is exact across DST changes and leap days", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });
  it("rejects invalid dates", () => {
    expect(() => daysBetween("2026-02-30", "2026-03-01")).toThrow(RangeError);
  });
});

describe("addMonthsClamped", () => {
  it("clamps to month end and keeps the anchor day afterwards", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsClamped("2026-01-31", 2, 31)).toBe("2026-03-31");
    expect(addMonthsClamped("2026-11-15", 3)).toBe("2027-02-15");
  });
});

describe("ranges", () => {
  it("dateRange is inclusive and lastNDates ends on the given day", () => {
    expect(dateRange("2026-10-01", "2026-10-03")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(dateRange("2026-10-03", "2026-10-01")).toEqual([]);
    expect(lastNDates("2026-10-06", 3)).toEqual(["2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
