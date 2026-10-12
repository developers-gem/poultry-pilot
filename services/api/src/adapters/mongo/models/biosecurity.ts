import { BIOSECURITY_ENTRY_TYPES, CHECKLIST_KINDS, CHECKLIST_RESPONSE_TYPES, CLEANING_SCHEDULES, EQUIPMENT_STATUSES, EQUIPMENT_TYPES, PEST_TYPES, VISITOR_TYPES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { LIVE, bool, defineCollection, enumOf, instant, int, localDate, money, num, ref, refs, str, text } from "./base.js";

const D = "Biosecurity and equipment";

/** Answers to a checklist template, with the question text kept as it was answered. */
export const ChecklistResultSchema = new Schema(
  {
    templateId: ref("ChecklistTemplate", { required: true }),
    templateVersion: int({ required: true }),
    answers: {
      type: [new Schema({ itemId: str({ required: true, max: 60 }), text: str({ required: true, max: 300 }), answer: { type: Schema.Types.Mixed, required: true }, passed: { type: Boolean, required: true } }, { _id: false })],
      default: [],
    },
    failedCount: int({ default: 0 }),
  },
  { _id: false },
);

export const ChecklistTemplateModel = defineCollection({
  model: "ChecklistTemplate",
  collection: "checklist_templates",
  domain: D,
  ownership: "farm",
  description:
    "A farm's own checklist (visitor declaration, PPE, footbath, cleaning, disinfection, vehicle, pest control, audit). Items say which answer counts as a failure; failures create corrective actions. Editing bumps the version; records keep the version they used.",
  fields: {
    name: str({ required: true, max: 120 }),
    kind: enumOf(CHECKLIST_KINDS, { required: true }),
    items: {
      type: [
        new Schema(
          {
            id: str({ required: true, max: 60 }),
            text: str({ required: true, max: 300 }),
            required: bool(true),
            responseType: enumOf(CHECKLIST_RESPONSE_TYPES, { required: true }),
            choices: { type: [str({ max: 60 })], default: undefined },
            failIf: str({ max: 60 }),
            /** Raise a corrective action automatically when this item fails. */
            createActionOnFail: bool(true),
          },
          { _id: false },
        ),
      ],
      required: true,
      validate: { validator: (v: unknown[]) => v.length >= 1 && v.length <= 60, message: "1 to 60 items" },
    },
    active: bool(true),
    /** Where the checklist came from (a veterinarian, a certification scheme, the farm itself). */
    source: str({ max: 300 }),
  },
  indexes: [{ fields: { farmId: 1, kind: 1, name: 1 }, options: { unique: true, ...LIVE }, why: "Templates by kind for each form; names unique per kind" }],
});

export const BiosecurityLogModel = defineCollection({
  model: "BiosecurityLog",
  collection: "biosecurity_logs",
  domain: D,
  ownership: "farm",
  description:
    "Evidence that a biosecurity activity happened: cleaning, disinfection, footbath change or check, vehicle movement, pest control, wild bird observation, or an audit. Each type has its own section; any type can carry checklist answers.",
  fields: {
    type: enumOf(BIOSECURITY_ENTRY_TYPES, { required: true }),
    date: localDate({ required: true }),
    houseId: ref("House"),
    cleaningTaskId: ref("CleaningTask"),
    performedBy: str({ max: 120 }),
    /** Product used (disinfectant, rodenticide…). With an inventory item, stock moves automatically. */
    product: {
      type: new Schema({ inventoryItemId: ref("InventoryItem"), name: str({ max: 120 }), quantityUsed: num(), concentration: str({ max: 60 }), stockCostMinor: int() }, { _id: false }),
    },
    footbath: { type: new Schema({ action: enumOf(["changed", "checked", "topped_up"], { required: true }), disinfectant: str({ max: 120 }), concentration: str({ max: 60 }) }, { _id: false }) },
    vehicle: {
      type: new Schema(
        { registration: str({ required: true, max: 30 }), driver: str({ max: 120 }), company: str({ max: 120 }), purpose: str({ max: 200 }), disinfected: bool(false), entryAt: instant(), exitAt: instant(), lastPoultryContactAt: instant() },
        { _id: false },
      ),
    },
    pest: {
      type: new Schema({ pestType: enumOf(PEST_TYPES, { required: true }), method: str({ max: 120 }), stationsChecked: int(), activityFound: bool(false) }, { _id: false }),
    },
    wildBird: {
      type: new Schema(
        {
          description: str({ required: true, max: 200 }),
          count: int(),
          location: str({ max: 200 }),
          contactWithPoultry: bool(false),
          contactWithFeedOrWater: bool(false),
          deadWildBirdsFound: int(),
        },
        { _id: false },
      ),
    },
    checklist: { type: ChecklistResultSchema },
    attachments: { type: [new Schema({ assetId: ref("MediaAsset", { required: true }), name: str({ max: 200 }) }, { _id: false })], default: undefined },
    details: text(2000),
  },
  indexes: [{ fields: { farmId: 1, date: -1 }, why: "Biosecurity log list and audits by period" }],
});

export const VisitorModel = defineCollection({
  model: "Visitor",
  collection: "visitors",
  domain: D,
  ownership: "farm",
  description:
    "Visitor register: who entered, why, which houses, their declaration, last contact with other poultry and the downtime since, PPE and footbath use. Supports trace-back.",
  fields: {
    name: str({ required: true, max: 120 }),
    company: str({ max: 120 }),
    type: enumOf(VISITOR_TYPES, { required: true }),
    phone: str({ max: 30 }),
    purpose: str({ max: 200 }),
    vehicleRegistration: str({ max: 30 }),
    housesVisited: refs("House"),
    previousPoultryContact: {
      type: new Schema({ hadContact: { type: Boolean, required: true }, lastContactAt: instant(), description: str({ max: 300 }) }, { _id: false }),
    },
    /** Derived: hours from last poultry contact to check-in. */
    downtimeHours: num({ max: 100_000 }),
    /** The farm's own required downtime at the time of the visit (none = not checked). */
    requiredDowntimeHours: num({ max: 10_000 }),
    declaration: {
      type: new Schema({ declaredName: str({ required: true, max: 120 }), declaredAt: instant({ required: true }), signatureAssetId: ref("MediaAsset"), checklist: { type: ChecklistResultSchema } }, { _id: false }),
    },
    ppeUsed: { type: [str({ max: 60 })], default: undefined },
    footbathUsed: bool(false),
    disinfected: bool(false),
    flags: { type: [enumOf(["downtime_short", "declaration_failed"])], default: undefined },
    checkInAt: instant({ required: true }),
    checkOutAt: instant(),
    hostUserId: ref("User"),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, checkInAt: -1 }, why: "Visitor register by date; trace-back of who visited in a period" }],
});

export const CleaningTaskModel = defineCollection({
  model: "CleaningTask",
  collection: "cleaning_tasks",
  domain: D,
  ownership: "farm",
  description: "A recurring cleaning or disinfection routine, optionally with a checklist template. Completing it writes a biosecurity_log (with the checklist answers) and moves nextDueDate.",
  fields: {
    title: str({ required: true, max: 200 }),
    activity: enumOf(["cleaning", "disinfection"], { required: true, default: "cleaning" }),
    schedule: enumOf(CLEANING_SCHEDULES, { required: true }),
    houseIds: refs("House"),
    checklistTemplateId: ref("ChecklistTemplate"),
    assigneeUserId: ref("User"),
    nextDueDate: localDate(),
    lastDoneDate: localDate(),
    active: bool(true),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, active: 1, nextDueDate: 1 }, why: "Due and overdue cleaning (calendar, reminders)" }],
});

export const EquipmentModel = defineCollection({
  model: "Equipment",
  collection: "equipment",
  domain: D,
  ownership: "farm",
  description: "Assets: incubators, feeders, heaters, generators, scales, vehicles. Location is the house it is currently in.",
  fields: {
    name: str({ required: true, max: 120 }),
    type: enumOf(EQUIPMENT_TYPES, { required: true }),
    serialNumber: str({ max: 80 }),
    houseId: ref("House"),
    status: enumOf(EQUIPMENT_STATUSES, { required: true, default: "in_service" }),
    purchaseDate: localDate(),
    purchaseCost: money(),
    nextMaintenanceDate: localDate(),
    capacity: int(),
    notes: text(1000),
  },
  indexes: [{ fields: { farmId: 1, status: 1, nextMaintenanceDate: 1 }, why: "Equipment list by status; maintenance due" }],
});

export const EquipmentMovementModel = defineCollection({
  model: "EquipmentMovement",
  collection: "equipment_movements",
  domain: D,
  ownership: "farm",
  appendOnly: true,
  description: "Equipment moving between houses or off the farm, with whether it was disinfected (a common disease route).",
  fields: {
    equipmentId: ref("Equipment", { required: true }),
    date: localDate({ required: true }),
    fromHouseId: ref("House"),
    toHouseId: ref("House"),
    offFarmDestination: str({ max: 200 }),
    disinfected: bool(false),
    movedBy: str({ max: 120 }),
    reversalOf: ref("EquipmentMovement"),
    note: text(500),
  },
  indexes: [{ fields: { farmId: 1, equipmentId: 1, date: -1 }, why: "Movement history of one item (trace-back)" }],
});
