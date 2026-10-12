import { z } from "zod";
import { BiosecurityEntryType, ChecklistKind, ChecklistResponseType, CleaningSchedule, EquipmentStatus, EquipmentType, PestType, TaskPriority, TaskStatus, VisitorType } from "../enums.js";
import { Count, Id, Instant, LocalDate, NonEmptyText, OptionalText } from "../primitives.js";

/** BioSecure Farm: the farm's own checklists, visitor register, biosecurity logs, equipment and corrective actions. */

const ChecklistItem = z
  .object({
    id: z.string().trim().regex(/^[a-z0-9_]{1,60}$/, "Use lowercase letters, digits and _"),
    text: NonEmptyText(300),
    required: z.boolean().default(true),
    responseType: ChecklistResponseType,
    choices: z.array(NonEmptyText(60)).min(2).max(20).optional(),
    /** The answer that counts as a failed check: "yes", "no", or one of the choices. */
    failIf: z.string().trim().max(60).optional(),
    createActionOnFail: z.boolean().default(true),
  })
  .strict()
  .refine((i) => i.responseType !== "choice" || !!i.choices, { message: "Choice items need choices", path: ["choices"] })
  .refine((i) => i.failIf === undefined || (i.responseType === "yes_no" ? ["yes", "no"].includes(i.failIf) : i.responseType === "choice" ? !!i.choices?.includes(i.failIf) : false), {
    message: "failIf must be yes/no for yes-no items or one of the choices",
    path: ["failIf"],
  });

const TemplateFields = {
  name: NonEmptyText(120),
  kind: ChecklistKind,
  items: z
    .array(ChecklistItem)
    .min(1)
    .max(60)
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length, "Item ids must be unique"),
  source: OptionalText(300),
};
export const CreateChecklistTemplateRequest = z.object({ id: Id.optional(), ...TemplateFields }).strict();
export const UpdateChecklistTemplateRequest = z.object({ ...TemplateFields, active: z.boolean(), version: z.number().int().nonnegative() }).strict();
export const ChecklistTemplateQuery = z.object({ kind: ChecklistKind.optional() });

export const ChecklistAnswers = z
  .object({ templateId: Id, answers: z.array(z.object({ itemId: z.string().max(60), answer: z.union([z.string().max(300), z.number(), z.boolean()]) }).strict()).max(60) })
  .strict();

export const VisitorCheckInRequest = z
  .object({
    name: NonEmptyText(120),
    company: OptionalText(120),
    type: VisitorType,
    phone: OptionalText(30),
    purpose: OptionalText(200),
    vehicleRegistration: OptionalText(30),
    housesVisited: z.array(Id).max(20).optional(),
    /** Asked of every visitor: contact with other poultry, and when. */
    previousPoultryContact: z.object({ hadContact: z.boolean(), lastContactAt: Instant.optional(), description: OptionalText(300) }).strict(),
    declaration: z.object({ declaredName: NonEmptyText(120), signatureAssetId: Id.optional(), checklist: ChecklistAnswers.optional() }).strict().optional(),
    ppeUsed: z.array(NonEmptyText(60)).max(20).optional(),
    footbathUsed: z.boolean().default(false),
    disinfected: z.boolean().default(false),
    checkInAt: Instant.optional(),
    notes: OptionalText(1000),
  })
  .strict()
  .refine((v) => !v.previousPoultryContact.hadContact || !!v.previousPoultryContact.lastContactAt, { message: "Give the time of the last poultry contact", path: ["previousPoultryContact", "lastContactAt"] });

export const VisitorCheckOutRequest = z.object({ checkOutAt: Instant.optional() }).strict();
export const VisitorListQuery = z.object({ from: LocalDate.optional(), to: LocalDate.optional(), flagged: z.enum(["true", "false"]).transform((v) => v === "true").optional() });

/** A product used (disinfectant, rodenticide…); with an inventory item, the quantity is drawn from stock. */
const ProductUsed = z
  .object({ inventoryItemId: Id.optional(), name: OptionalText(120), quantityUsed: z.number().positive().max(100_000_000).optional(), concentration: OptionalText(60) })
  .strict();

export const BiosecurityLogRequest = z
  .object({
    type: BiosecurityEntryType,
    date: LocalDate,
    houseId: Id.optional(),
    cleaningTaskId: Id.optional(),
    performedBy: OptionalText(120),
    product: ProductUsed.optional(),
    footbath: z.object({ action: z.enum(["changed", "checked", "topped_up"]), disinfectant: OptionalText(120), concentration: OptionalText(60) }).strict().optional(),
    vehicle: z
      .object({ registration: NonEmptyText(30), driver: OptionalText(120), company: OptionalText(120), purpose: OptionalText(200), disinfected: z.boolean().default(false), entryAt: Instant.optional(), exitAt: Instant.optional(), lastPoultryContactAt: Instant.optional() })
      .strict()
      .optional(),
    pest: z.object({ pestType: PestType, method: OptionalText(120), stationsChecked: Count.optional(), activityFound: z.boolean().default(false) }).strict().optional(),
    wildBird: z
      .object({ description: NonEmptyText(200), count: Count.optional(), location: OptionalText(200), contactWithPoultry: z.boolean().default(false), contactWithFeedOrWater: z.boolean().default(false), deadWildBirdsFound: Count.optional() })
      .strict()
      .optional(),
    checklist: ChecklistAnswers.optional(),
    attachments: z.array(z.object({ assetId: Id, name: OptionalText(200) }).strict()).max(10).default([]),
    details: OptionalText(2000),
  })
  .strict()
  .refine((l) => l.type !== "footbath" || !!l.footbath, { message: "Footbath entries need the footbath section", path: ["footbath"] })
  .refine((l) => l.type !== "vehicle" || !!l.vehicle, { message: "Vehicle entries need the vehicle section", path: ["vehicle"] })
  .refine((l) => l.type !== "pest_control" || !!l.pest, { message: "Pest control entries need the pest section", path: ["pest"] })
  .refine((l) => l.type !== "wild_bird_observation" || !!l.wildBird, { message: "Wild bird observations need the wildBird section", path: ["wildBird"] })
  .refine((l) => !l.product?.inventoryItemId || l.product.quantityUsed !== undefined, { message: "Give quantityUsed to draw the product from stock", path: ["product", "quantityUsed"] });

export const BiosecurityLogQuery = z.object({ type: BiosecurityEntryType.optional(), houseId: Id.optional(), from: LocalDate.optional(), to: LocalDate.optional(), limit: z.coerce.number().int().min(1).max(500).default(100) });

export const EquipmentRequest = z
  .object({ id: Id.optional(), name: NonEmptyText(120), type: EquipmentType, serialNumber: OptionalText(80), houseId: Id.optional(), status: EquipmentStatus.default("in_service"), nextMaintenanceDate: LocalDate.optional(), notes: OptionalText(1000) })
  .strict();
export const EquipmentMoveRequest = z
  .object({ date: LocalDate, toHouseId: Id.optional(), offFarmDestination: OptionalText(200), disinfected: z.boolean(), movedBy: OptionalText(120), note: OptionalText(500) })
  .strict()
  .refine((m) => !!m.toHouseId !== !!m.offFarmDestination, { message: "Give either toHouseId or offFarmDestination", path: ["toHouseId"] });

export const CleaningScheduleRequest = z
  .object({
    title: NonEmptyText(200),
    activity: z.enum(["cleaning", "disinfection"]).default("cleaning"),
    schedule: CleaningSchedule,
    houseIds: z.array(Id).max(50).optional(),
    checklistTemplateId: Id.optional(),
    assigneeUserId: Id.optional(),
    nextDueDate: LocalDate.optional(),
    notes: OptionalText(1000),
  })
  .strict();
export const CompleteCleaningRequest = z
  .object({ date: LocalDate, houseId: Id.optional(), performedBy: OptionalText(120), product: ProductUsed.optional(), checklist: ChecklistAnswers.optional(), details: OptionalText(2000) })
  .strict();

export const CorrectiveActionRequest = z
  .object({ title: NonEmptyText(200), description: OptionalText(2000), assigneeUserId: Id.optional(), dueDate: LocalDate.optional(), priority: TaskPriority.default("normal"), houseId: Id.optional(), flockId: Id.optional() })
  .strict();
export const CompleteActionRequest = z.object({ resolutionNotes: z.string().trim().min(3).max(2000) }).strict();
export const ActionListQuery = z.object({ status: TaskStatus.optional(), kind: z.enum(["corrective_action", "follow_up", "general"]).default("corrective_action") });

