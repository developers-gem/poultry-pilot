import { z } from "zod";
import { AdministrationRoute, AssessmentSource, FlockType, HealthRecordType, MedicineType, StockUnit, WithdrawalSource } from "../enums.js";
import { Count, Cursor, Id, LocalDate, Money, NonEmptyText, OptionalText, PositiveCount } from "../primitives.js";

/**
 * FlockHealth: farm records and reminders. Observations, assessments and treatments are entered and attributed by
 * people; withdrawal periods come from the medicine label or the veterinarian. No diagnosis, no prescriptions.
 */

const Days = z.number().int().min(0).max(365);
const Attachment = z.object({ assetId: Id, name: OptionalText(200) }).strict();

const MedicineFields = {
  name: NonEmptyText(120),
  type: MedicineType,
  activeIngredient: OptionalText(200),
  manufacturer: OptionalText(120),
  defaultRoute: AdministrationRoute.optional(),
  doseUnit: StockUnit.optional(),
  /** From the product label or the farm's veterinarian. PoultryPilot has no country defaults. */
  withdrawalMeatDays: Days.optional(),
  withdrawalEggDays: Days.optional(),
  withdrawalSource: WithdrawalSource.optional(),
  prescriptionRequired: z.boolean().optional(),
  label: z.object({ name: NonEmptyText(200), url: z.string().url().max(1000).optional() }).strict().optional(),
  notes: OptionalText(1000),
};
export const CreateMedicineRequest = z.object({ id: Id.optional(), ...MedicineFields }).strict();
export const UpdateMedicineRequest = z.object({ ...MedicineFields, version: z.number().int().nonnegative() }).strict();

export const TreatmentInput = z
  .object({
    medicineId: Id.optional(),
    /** For a product not in the catalog. */
    medicineName: OptionalText(120),
    /** Draw the quantity from this inventory item's stock (FEFO, expired stock refused). */
    inventoryItemId: Id.optional(),
    quantityUsed: z.number().positive().max(100_000_000).optional(),
    /** As instructed, e.g. "1 g per 2 L drinking water". */
    dose: OptionalText(120),
    route: AdministrationRoute.optional(),
    frequency: OptionalText(120),
    startDate: LocalDate,
    durationDays: z.number().int().min(1).max(365),
    /** Override the medicine's default withdrawal periods (e.g. on veterinary instruction). */
    withdrawalMeatDays: Days.optional(),
    withdrawalEggDays: Days.optional(),
    withdrawalSource: WithdrawalSource.optional(),
    prescribedBy: OptionalText(120),
    prescriptionReference: OptionalText(80),
  })
  .strict()
  .refine((t) => !!t.medicineId || !!t.medicineName, { message: "Name the medicine (medicineId or medicineName)", path: ["medicineName"] })
  .refine((t) => !t.inventoryItemId || t.quantityUsed !== undefined, { message: "Give quantityUsed to draw from stock", path: ["quantityUsed"] });

const HealthRecordFields = z
  .object({
    type: HealthRecordType,
    date: LocalDate,
    flockId: Id.optional(),
    houseId: Id.optional(),
    title: NonEmptyText(200),
    symptoms: z.array(z.string().trim().min(2).max(60)).max(20).optional(),
    observedSigns: OptionalText(2000),
    affectedBirds: Count.optional(),
    deadBirds: Count.optional(),
    vetName: OptionalText(120),
    /** A diagnosis or assessment, attributed to the veterinarian, laboratory or staff member who made it. */
    assessment: z.object({ text: z.string().trim().min(2).max(2000), by: NonEmptyText(120), source: AssessmentSource }).strict().optional(),
    lab: z.object({ name: OptionalText(120), reference: OptionalText(60), result: OptionalText(4000) }).strict().optional(),
    treatments: z.array(TreatmentInput).max(5).default([]),
    cost: Money.optional(),
    followUpDate: LocalDate.optional(),
    attachments: z.array(Attachment).max(10).default([]),
  })
  .strict();

const treatmentsOnlyFor = <T extends { type: string; treatments: unknown[] }>(r: T) => r.treatments.length === 0 || r.type === "treatment" || r.type === "vet_visit";
const treatMsg = { message: "Treatments belong to treatment or vet visit records", path: ["treatments"] };

export const CreateHealthRecordRequest = HealthRecordFields.extend({ id: Id.optional() }).strict().refine(treatmentsOnlyFor, treatMsg);
export const UpdateHealthRecordRequest = HealthRecordFields.extend({ version: z.number().int().nonnegative() }).strict().refine(treatmentsOnlyFor, treatMsg);

export const HealthRecordListQuery = z.object({
  flockId: Id.optional(),
  type: HealthRecordType.optional(),
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  cursor: Cursor.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ---- vaccination -------------------------------------------------------------

const ProgrammeItem = z
  .object({ dayOfAge: z.number().int().min(0).max(2000), vaccineName: NonEmptyText(120), medicineId: Id.optional(), targetDisease: OptionalText(120), route: AdministrationRoute.optional(), notes: OptionalText(300) })
  .strict();
const ProgrammeFields = {
  name: NonEmptyText(120),
  flockTypes: z.array(FlockType).max(5).optional(),
  items: z.array(ProgrammeItem).min(1).max(60),
  /** Where the programme came from: the farm's veterinarian, the hatchery, a written plan. */
  source: OptionalText(300),
};
export const CreateProgrammeRequest = z.object({ id: Id.optional(), ...ProgrammeFields }).strict();
export const UpdateProgrammeRequest = z.object({ ...ProgrammeFields, active: z.boolean(), version: z.number().int().nonnegative() }).strict();
export const ApplyProgrammeRequest = z.object({ programmeId: Id, includePast: z.boolean().default(false) }).strict();

export const ScheduleVaccinationRequest = z
  .object({ flockId: Id, vaccineName: NonEmptyText(120), medicineId: Id.optional(), targetDisease: OptionalText(120), dueDate: LocalDate, route: AdministrationRoute.optional(), notes: OptionalText(1000) })
  .strict();

export const AdministerVaccinationRequest = z
  .object({
    date: LocalDate,
    administeredBy: OptionalText(120),
    route: AdministrationRoute.optional(),
    birdsVaccinated: PositiveCount.optional(),
    /** Draw doses from this vaccine's stock: batches and expiry are recorded from the lots used. */
    inventoryItemId: Id.optional(),
    dosesUsed: z.number().positive().max(100_000_000).optional(),
    /** For vaccine not tracked in inventory: the batch numbers and expiry dates used. */
    batches: z.array(z.object({ batchNumber: NonEmptyText(60), expiryDate: LocalDate.optional(), doses: z.number().positive().optional() }).strict()).max(5).optional(),
    notes: OptionalText(1000),
  })
  .strict()
  .refine((v) => !v.inventoryItemId || v.dosesUsed !== undefined, { message: "Give dosesUsed to draw from stock", path: ["dosesUsed"] })
  .refine((v) => !(v.inventoryItemId && v.batches), { message: "Batches come from the stock lots; leave out batches", path: ["batches"] });

export const SkipVaccinationRequest = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

export const VaccinationListQuery = z.object({
  flockId: Id.optional(),
  state: z.enum(["scheduled", "due", "overdue", "done", "skipped", "cancelled"]).optional(),
  from: LocalDate.optional(),
  to: LocalDate.optional(),
});

export const RemindersQuery = z.object({ days: z.coerce.number().int().min(1).max(90).default(14) });
