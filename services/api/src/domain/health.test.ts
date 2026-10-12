import { describe, expect, it } from "vitest";
import { activeWithdrawal, evaluateChecklist, scheduleProgramme, treatmentEndDate, vaccinationState, visitorDowntime, withdrawalUntil, type ChecklistItemDef } from "./health.js";

describe("treatment and withdrawal dates", () => {
  it("a 5-day course starting on the 1st ends on the 5th; 7 days' withdrawal ends on the 12th", () => {
    const end = treatmentEndDate("2026-10-01", 5);
    expect(end).toBe("2026-10-05");
    expect(withdrawalUntil(end, 7)).toBe("2026-10-12");
    expect(withdrawalUntil(end, 0)).toBeNull();
    expect(treatmentEndDate("2026-10-01", 1)).toBe("2026-10-01");
    expect(() => treatmentEndDate("2026-10-01", 0)).toThrow(/at least 1 day/);
  });

  it("the active withdrawal is the one ending last, inclusive of its final day", () => {
    const w = [
      { until: "2026-10-12", kind: "meat" as const, medicineName: "A", recordId: "r1" },
      { until: "2026-10-20", kind: "meat" as const, medicineName: "B", recordId: "r2" },
      { until: "2026-10-30", kind: "eggs" as const, medicineName: "B", recordId: "r2" },
    ];
    expect(activeWithdrawal(w, "2026-10-15", "meat")?.medicineName).toBe("B");
    expect(activeWithdrawal(w, "2026-10-20", "meat")?.until).toBe("2026-10-20");
    expect(activeWithdrawal(w, "2026-10-21", "meat")).toBeNull();
    expect(activeWithdrawal(w, "2026-10-21", "eggs")?.until).toBe("2026-10-30");
  });
});

describe("vaccination state", () => {
  it("is derived from the due date, never stored", () => {
    expect(vaccinationState("scheduled", "2026-10-09", "2026-10-10")).toBe("overdue");
    expect(vaccinationState("scheduled", "2026-10-13", "2026-10-10")).toBe("due");
    expect(vaccinationState("scheduled", "2026-10-20", "2026-10-10")).toBe("scheduled");
    expect(vaccinationState("done", "2026-10-01", "2026-10-10")).toBe("done");
  });
});

describe("programme schedule", () => {
  const items = [{ dayOfAge: 14, vaccineName: "B" }, { dayOfAge: 7, vaccineName: "A" }];
  it("counts age from the hatch date, or from placement minus age on arrival", () => {
    expect(scheduleProgramme(items, { hatchDate: "2026-10-01" }, "2026-10-01").map((i) => [i.vaccineName, i.dueDate, i.past])).toEqual([["A", "2026-10-08", false], ["B", "2026-10-15", false]]);
    expect(scheduleProgramme(items, { placementDate: "2026-10-03", ageDaysAtPlacement: 2 }, "2026-10-10").map((i) => [i.dueDate, i.past])).toEqual([["2026-10-08", true], ["2026-10-15", false]]);
    expect(() => scheduleProgramme(items, {}, "2026-10-10")).toThrow(/hatch or placement date/);
  });
});

describe("checklists", () => {
  const items: ChecklistItemDef[] = [
    { id: "ppe", text: "Wearing farm boots and overalls?", required: true, responseType: "yes_no", failIf: "no" },
    { id: "ill", text: "Any sick poultry at your last farm?", required: true, responseType: "yes_no", failIf: "yes" },
    { id: "conc", text: "Footbath concentration (%)", required: false, responseType: "number" },
    { id: "zone", text: "Zone visited", required: false, responseType: "choice", choices: ["clean", "dirty"] },
  ];
  it("lists failed checks by each item's own fail answer", () => {
    const r = evaluateChecklist(items, [{ itemId: "ppe", answer: false }, { itemId: "ill", answer: false }, { itemId: "conc", answer: 2 }]);
    expect(r.failed.map((f) => f.itemId)).toEqual(["ppe"]);
    expect(r.answers).toHaveLength(3);
  });
  it("requires every required item and valid answer types", () => {
    expect(() => evaluateChecklist(items, [{ itemId: "ppe", answer: true }])).toThrow(expect.objectContaining({ code: "CHECKLIST_INCOMPLETE" }));
    expect(() => evaluateChecklist(items, [{ itemId: "ppe", answer: "yes" }, { itemId: "ill", answer: false }])).toThrow(/needs yes or no/);
    expect(() => evaluateChecklist(items, [{ itemId: "ppe", answer: true }, { itemId: "ill", answer: false }, { itemId: "zone", answer: "red" }])).toThrow(/must be one of/);
    expect(() => evaluateChecklist(items, [{ itemId: "ppe", answer: true }, { itemId: "ill", answer: false }, { itemId: "nope", answer: 1 }])).toThrow(/Unknown checklist item/);
  });
});

describe("visitor downtime", () => {
  it("compares hours since last poultry contact with the farm's own requirement", () => {
    const arrive = new Date("2026-10-10T08:00:00Z");
    expect(visitorDowntime(new Date("2026-10-09T20:00:00Z"), arrive, 48)).toEqual({ hours: 12, short: true });
    expect(visitorDowntime(new Date("2026-10-07T08:00:00Z"), arrive, 48)).toEqual({ hours: 72, short: false });
    expect(visitorDowntime(new Date("2026-10-09T20:00:00Z"), arrive, undefined)).toEqual({ hours: 12, short: false });
    expect(visitorDowntime(undefined, arrive, 48)).toEqual({ hours: null, short: false });
  });
});
