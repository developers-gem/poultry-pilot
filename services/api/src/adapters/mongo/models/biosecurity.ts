import { BIOSECURITY_ENTRY_TYPES, CLEANING_SCHEDULES, EQUIPMENT_STATUSES, EQUIPMENT_TYPES, VISITOR_TYPES } from "@poultrypilot/constants";
import { Schema } from "mongoose";
import { bool, defineCollection, enumOf, instant, int, localDate, money, ref, refs, str, text } from "./base.js";

const D = "Biosecurity and equipment";

export const BiosecurityLogModel = defineCollection({
  model: "BiosecurityLog",
  collection: "biosecurity_logs",
  domain: D,
  ownership: "farm",
  description: "Evidence that a biosecurity action happened: cleaning, disinfection, footbath change, pest control, vehicle wash.",
  fields: {
    type: enumOf(BIOSECURITY_ENTRY_TYPES, { required: true }),
    date: localDate({ required: true }),
    houseId: ref("House"),
    cleaningTaskId: ref("CleaningTask"),
    performedBy: str({ max: 120 }),
    productUsed: str({ max: 120 }),
    inventoryTransactionId: ref("InventoryTransaction"),
    checklist: { type: [new Schema({ item: str({ required: true, max: 200 }), done: bool(false) }, { _id: false })], default: undefined },
    details: text(2000),
  },
  indexes: [{ fields: { farmId: 1, date: -1 }, why: "Biosecurity log list and audits by period" }],
});

export const VisitorModel = defineCollection({
  model: "Visitor",
  collection: "visitors",
  domain: D,
  ownership: "farm",
  description: "Visitor register: who entered, why, which houses, and their last contact with other poultry (for trace-back).",
  fields: {
    name: str({ required: true, max: 120 }),
    company: str({ max: 120 }),
    type: enumOf(VISITOR_TYPES, { required: true }),
    phone: str({ max: 30 }),
    purpose: str({ max: 200 }),
    vehicleRegistration: str({ max: 30 }),
    housesVisited: refs("House"),
    lastPoultryContactDate: localDate(),
    ppeProvided: bool(false),
    disinfected: bool(false),
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
  description: "A recurring cleaning or disinfection routine with its checklist. Completing it writes a biosecurity_log and moves nextDueDate.",
  fields: {
    title: str({ required: true, max: 200 }),
    schedule: enumOf(CLEANING_SCHEDULES, { required: true }),
    houseIds: refs("House"),
    checklist: { type: [str({ max: 200 })], default: undefined },
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
