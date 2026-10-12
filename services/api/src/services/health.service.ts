import type { z } from "zod";
import type { AdministerVaccinationRequest, CreateHealthRecordRequest, CreateMedicineRequest, CreateProgrammeRequest, ScheduleVaccinationRequest } from "@poultrypilot/validation";
import { addDays, activeWithdrawal, population, scheduleProgramme, treatmentEndDate, vaccinationState, withdrawalUntil, type WithdrawalWindow } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { FarmRecord, FlockRecord, HealthRecordRecord, MedicineRecord, TreatmentRecord, VaccinationProgrammeRecord, VaccinationRecord } from "../ports/records.js";
import type { AlertService } from "./alert.service.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import { toLedger, type FlockService } from "./flock.service.js";
import { duplicate } from "./house.service.js";
import type { InventoryService } from "./inventory.service.js";
import type { SyncService } from "./sync.service.js";

type HealthInput = z.output<typeof CreateHealthRecordRequest>;
type TreatmentInput = HealthInput["treatments"][number];

const MEDICAL_CATEGORIES = new Set(["medicine", "vaccine"]);

export interface HealthDeps {
  repos: Repositories;
  clock: Clock;
  audit: AuditService;
  sync: SyncService;
  flocks: FlockService;
  inventory: InventoryService;
  alerts: AlertService;
}

/**
 * FlockHealth. Records what people observed and what a named veterinarian, laboratory or staff member assessed.
 * Computes dates (treatment end, withdrawal end, vaccination due), draws medicine and vaccine from stock, and
 * raises reminders. It never proposes a diagnosis or a treatment.
 */
export function createHealthService(d: HealthDeps) {
  const { repos, clock } = d;
  /** Finance: a fee on a record becomes (or stops being) a vet services bill. */
  const hooks: { onCost: ((ctx: FarmContext, rec: HealthRecordRecord | null, recordId: string, tx: Tx) => Promise<void>)[] } = { onCost: [] };
  const E = d.inventory.engine;
  const L = d.flocks.ledger;

  const strip = <T extends { farmId: string; deletedAt?: Date; deletedBy?: string; createdAt: Date; updatedAt: Date }>({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }: T) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  });

  // ---- withdrawals ------------------------------------------------------------------

  async function windowsFor(ctx: FarmContext, flockId: string, tx?: Tx): Promise<WithdrawalWindow[]> {
    const records = await repos.healthRecords.find(ctx.farmId, { where: { flockId }, exists: { treatments: true } }, tx);
    const out: WithdrawalWindow[] = [];
    for (const r of records) {
      for (const t of r.treatments ?? []) {
        if (t.withdrawalMeatUntil) out.push({ until: t.withdrawalMeatUntil, kind: "meat", medicineName: t.medicineName, recordId: r.id });
        if (t.withdrawalEggsUntil) out.push({ until: t.withdrawalEggsUntil, kind: "eggs", medicineName: t.medicineName, recordId: r.id });
      }
    }
    return out;
  }

  /** Called by the flock engine before birds leave a flock (sale, transfer, split, merge). */
  async function assertBirdsMayLeave(ctx: FarmContext, flock: FlockRecord, date: string, purpose: "sale" | "move", tx: Tx) {
    const w = activeWithdrawal(await windowsFor(ctx, flock.id, tx), date, "meat");
    if (!w) return;
    throw new AppError(
      "WITHDRAWAL_ACTIVE",
      purpose === "sale"
        ? `${flock.flockCode} is in a meat withdrawal period for ${w.medicineName} until ${w.until} (inclusive). Birds cannot be sold before ${addDays(w.until, 1)}.`
        : `${flock.flockCode} is in a meat withdrawal period for ${w.medicineName} until ${w.until}. Birds cannot move into another flock until it ends.`,
      { until: w.until, medicine: w.medicineName, recordId: w.recordId },
    );
  }

  /** Marks the flock's egg records that fall inside an egg withdrawal window, and clears ones that no longer do. */
  async function refreshWithheldEggs(ctx: FarmContext, flockId: string, tx: Tx) {
    const windows = (await windowsFor(ctx, flockId, tx)).filter((w) => w.kind === "eggs");
    const starts = new Map<string, string>();
    for (const r of await repos.healthRecords.find(ctx.farmId, { where: { flockId }, exists: { treatments: true } }, tx)) {
      for (const t of r.treatments ?? []) if (t.withdrawalEggsUntil) starts.set(`${r.id}:${t.withdrawalEggsUntil}`, t.startDate);
    }
    const eggs = await repos.eggRecords.find(ctx.farmId, { where: { flockId } }, tx);
    for (const e of eggs) {
      const covering = windows.filter((w) => (starts.get(`${w.recordId}:${w.until}`) ?? w.until) <= e.date && e.date <= w.until).map((w) => w.until).sort().reverse()[0];
      if (covering !== e.withheldUntil) await repos.eggRecords.update(ctx.farmId, e.id, { withheldUntil: covering, updatedAt: clock.now() }, undefined, tx);
    }
  }

  // ---- treatments -------------------------------------------------------------------

  async function buildTreatments(ctx: FarmContext, farm: FarmRecord, flock: FlockRecord | null, recordId: string, input: TreatmentInput[], tx: Tx): Promise<TreatmentRecord[]> {
    const out: TreatmentRecord[] = [];
    for (const t of input) {
      let med: MedicineRecord | null = null;
      if (t.medicineId) {
        med = await repos.medicines.findById(ctx.farmId, t.medicineId, tx);
        if (!med) throw notFound("Medicine");
      }
      const endDate = treatmentEndDate(t.startDate, t.durationDays);
      const meatDays = t.withdrawalMeatDays ?? med?.withdrawalMeatDays;
      const eggDays = t.withdrawalEggDays ?? med?.withdrawalEggDays;
      const overridden = t.withdrawalMeatDays !== undefined || t.withdrawalEggDays !== undefined;
      const source = t.withdrawalSource ?? (overridden ? undefined : med?.withdrawalSource);
      let stockCostMinor: number | undefined;
      if (t.inventoryItemId) {
        const item = await E.loadItem(ctx, t.inventoryItemId, tx);
        if (!MEDICAL_CATEGORIES.has(item.category)) throw new AppError("VALIDATION_FAILED", `${item.name} is not a medicine or vaccine`);
        const taken = await E.take(ctx, item, t.quantityUsed!, { date: t.startDate, purpose: "use", type: "issue", sourceType: "health_record", sourceId: recordId, ...(flock ? { flockId: flock.id, houseId: flock.houseId } : {}), reason: `Treatment: ${med?.name ?? t.medicineName}` }, farm, tx);
        stockCostMinor = taken.costMinor;
      }
      const meatUntil = withdrawalUntil(endDate, meatDays);
      const eggsUntil = withdrawalUntil(endDate, eggDays);
      out.push({
        id: newId(),
        ...(med ? { medicineId: med.id } : {}),
        medicineName: med?.name ?? t.medicineName!,
        ...(t.inventoryItemId ? { inventoryItemId: t.inventoryItemId, quantityUsed: t.quantityUsed! } : {}),
        ...(t.dose ? { dose: t.dose } : {}),
        ...((t.route ?? med?.defaultRoute) ? { route: (t.route ?? med?.defaultRoute)! } : {}),
        ...(t.frequency ? { frequency: t.frequency } : {}),
        startDate: t.startDate,
        durationDays: t.durationDays,
        endDate,
        ...(meatDays !== undefined ? { withdrawalMeatDays: meatDays } : {}),
        ...(eggDays !== undefined ? { withdrawalEggDays: eggDays } : {}),
        ...(source ? { withdrawalSource: source } : {}),
        ...(meatUntil ? { withdrawalMeatUntil: meatUntil } : {}),
        ...(eggsUntil ? { withdrawalEggsUntil: eggsUntil } : {}),
        ...(t.prescribedBy ? { prescribedBy: t.prescribedBy } : {}),
        ...(t.prescriptionReference ? { prescriptionReference: t.prescriptionReference } : {}),
        ...(stockCostMinor !== undefined ? { stockCostMinor } : {}),
      });
    }
    return out;
  }

  async function validateRefs(ctx: FarmContext, farm: FarmRecord, input: HealthInput, tx: Tx): Promise<FlockRecord | null> {
    if (input.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${input.date} is in the future for this farm`);
    if (input.followUpDate && input.followUpDate < input.date) throw new AppError("VALIDATION_FAILED", "The follow-up date is before the record date");
    let flock: FlockRecord | null = null;
    if (input.flockId) {
      flock = await L.loadFlock(ctx, input.flockId, tx);
      if (input.affectedBirds !== undefined && input.affectedBirds > (flock.population?.alive ?? 0) + (input.deadBirds ?? 0)) {
        throw new AppError("VALIDATION_FAILED", `More birds affected (${input.affectedBirds}) than are in ${flock.flockCode}`);
      }
    }
    if (input.houseId && !(await repos.houses.findById(ctx.farmId, input.houseId, tx))) throw notFound("House");
    for (const a of input.attachments) if (!(await repos.mediaAssets.findById(ctx.farmId, a.assetId, tx))) throw new AppError("NOT_FOUND", `Attachment ${a.assetId} not found on this farm`);
    for (const t of input.treatments) if (t.startDate > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", "A treatment cannot start in the future; schedule a follow-up instead");
    if (input.treatments.length && !flock && !input.houseId) throw new AppError("VALIDATION_FAILED", "A treatment must name the flock or house treated");
    E.assertCurrency(input.cost, farm, "cost");
    return flock;
  }

  async function afterWrite(ctx: FarmContext, rec: HealthRecordRecord, farm: FarmRecord, tx: Tx) {
    if (rec.flockId) {
      await refreshWithheldEggs(ctx, rec.flockId, tx);
      const windows = await windowsFor(ctx, rec.flockId, tx);
      const today = E.todayOf(farm);
      const meat = activeWithdrawal(windows, today, "meat");
      const eggs = activeWithdrawal(windows, today, "eggs");
      const key = `withdrawal:${rec.flockId}`;
      if (meat || eggs) {
        const flock = await L.loadFlock(ctx, rec.flockId, tx);
        const parts = [meat ? `birds may not be sold until after ${meat.until} (${meat.medicineName})` : null, eggs ? `eggs may not be sold until after ${eggs.until} (${eggs.medicineName})` : null].filter(Boolean);
        await d.alerts.raise(ctx, { ruleType: "withdrawal_active", severity: "warning", title: `Withdrawal period: ${flock.flockCode}`, message: `${flock.flockCode}: ${parts.join("; ")}.`, dedupKey: key, date: today, flockId: rec.flockId }, tx);
      } else await d.alerts.resolve(ctx, key, tx);
    }
    await d.sync.recordChange(ctx.farmId, { entity: "health_record", entityId: rec.id, op: "upsert", version: rec.version }, tx);
  }

  const treatmentKey = (ts: { medicineId?: string; medicineName?: string; inventoryItemId?: string; quantityUsed?: number; startDate: string; durationDays: number; withdrawalMeatDays?: number; withdrawalEggDays?: number }[]) =>
    JSON.stringify(ts.map((t) => [t.medicineId ?? t.medicineName, t.inventoryItemId ?? "", t.quantityUsed ?? "", t.startDate, t.durationDays, t.withdrawalMeatDays ?? "", t.withdrawalEggDays ?? ""]));

  function recordFields(input: HealthInput) {
    return {
      type: input.type,
      date: input.date,
      flockId: input.flockId,
      houseId: input.houseId,
      title: input.title,
      symptoms: input.symptoms?.map((s) => s.toLowerCase()),
      observedSigns: input.observedSigns,
      affectedBirds: input.affectedBirds,
      deadBirds: input.deadBirds,
      vetName: input.vetName,
      assessment: input.assessment,
      lab: input.lab,
      cost: input.cost,
      followUpDate: input.followUpDate,
      attachments: input.attachments.length ? input.attachments : undefined,
    };
  }
  const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

  // ---- vaccinations -------------------------------------------------------------------

  const vaccinationView = (v: VaccinationRecord, today: string) => ({ ...strip(v), state: vaccinationState(v.status, v.dueDate, today) });

  async function scheduleOne(ctx: FarmContext, v: Omit<VaccinationRecord, "id" | "farmId" | "createdBy" | "createdAt" | "updatedAt" | "version" | "status">, tx: Tx) {
    const now = clock.now();
    const rec: VaccinationRecord = { id: newId(), farmId: ctx.farmId, status: "scheduled", ...defined(v), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
    await repos.vaccinations.insert(rec, tx);
    return rec;
  }

  return {
    hooks,
    assertBirdsMayLeave,
    refreshWithheldEggs,

    /** Health costs of a flock up to a date: fees on records, medicine stock used, vaccine stock used. For flock profit. */
    async flockHealthCostMinor(ctx: FarmContext, flockId: string, asOf: string): Promise<number> {
      const [records, vaccinations] = await Promise.all([
        repos.healthRecords.find(ctx.farmId, { where: { flockId }, range: { field: "date", to: asOf } }),
        repos.vaccinations.find(ctx.farmId, { where: { flockId, status: "done" } }),
      ]);
      const fees = records.reduce((t, r) => t + (r.cost?.amountMinor ?? 0) + (r.treatments ?? []).reduce((s, x) => s + (x.stockCostMinor ?? 0), 0), 0);
      return fees + vaccinations.filter((v) => (v.administeredDate ?? "") <= asOf).reduce((t, v) => t + (v.stockCostMinor ?? 0), 0);
    },

    // ---- medicines

    async createMedicine(ctx: FarmContext, input: z.output<typeof CreateMedicineRequest>) {
      assertCan(ctx, "health.manage");
      const now = clock.now();
      const { id, ...fields } = input;
      const rec: MedicineRecord = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.medicines.insert(rec, tx).catch(duplicate(`A medicine named "${rec.name}"`));
        await d.audit.record(ctx, { action: "medicine.created", entity: "medicine", entityId: rec.id, after: { name: rec.name, withdrawalMeatDays: rec.withdrawalMeatDays, withdrawalEggDays: rec.withdrawalEggDays } }, tx);
      });
      return strip(rec);
    },

    async updateMedicine(ctx: FarmContext, id: string, input: Omit<z.output<typeof CreateMedicineRequest>, "id"> & { version: number }) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const cur = await repos.medicines.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Medicine");
        const { version, ...fields } = input;
        const next = await repos.medicines.update(ctx.farmId, id, { ...fields, updatedBy: ctx.userId, updatedAt: clock.now() } as never, { expectedVersion: version }, tx).catch(duplicate(`A medicine named "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This medicine was changed by someone else", { serverVersion: cur.version });
        await d.audit.record(ctx, { action: "medicine.updated", entity: "medicine", entityId: id, before: cur as never, after: next as never }, tx);
        return strip(next);
      });
    },

    async listMedicines(ctx: FarmContext) {
      assertCan(ctx, "health.read");
      return (await repos.medicines.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },

    // ---- health records

    async createRecord(ctx: FarmContext, input: HealthInput & { id?: string }) {
      assertCan(ctx, input.type === "observation" ? "health.record_observation" : "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const flock = await validateRefs(ctx, farm, input, tx);
        const id = input.id ?? newId();
        const treatments = await buildTreatments(ctx, farm, flock, id, input.treatments, tx);
        const now = clock.now();
        const rec: HealthRecordRecord = {
          id,
          farmId: ctx.farmId,
          ...defined(recordFields(input)),
          ...(treatments.length ? { treatments } : {}),
          ...(input.followUpDate ? { followUpDone: false } : {}),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.healthRecords.insert(rec, tx);
        for (const h of hooks.onCost) await h(ctx, rec, id, tx);
        await d.audit.record(ctx, { action: `health.${input.type}_recorded`, entity: "health_record", entityId: id, after: { flockId: rec.flockId, title: rec.title, treatments: treatments.map((t) => t.medicineName) } }, tx);
        await afterWrite(ctx, rec, farm, tx);
        return strip(rec);
      });
    },

    async updateRecord(ctx: FarmContext, id: string, input: HealthInput & { version: number }) {
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const cur = await repos.healthRecords.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Health record");
        assertCan(ctx, cur.type === "observation" && input.type === "observation" ? "health.record_observation" : "health.manage");
        if (cur.version !== input.version) throw new AppError("VERSION_CONFLICT", "This record was changed by someone else", { serverVersion: cur.version });
        if (cur.dailyRecordId) throw new AppError("INVALID_STATE_TRANSITION", "This observation belongs to a daily record; edit the daily record instead");
        const flock = await validateRefs(ctx, farm, input, tx);
        let treatments = cur.treatments ?? [];
        // Compare effective values: a request that leaves out withdrawal days uses the medicine's defaults.
        const effective = [];
        for (const t of input.treatments) {
          const med = t.medicineId ? await repos.medicines.findById(ctx.farmId, t.medicineId, tx) : null;
          effective.push({ ...t, withdrawalMeatDays: t.withdrawalMeatDays ?? med?.withdrawalMeatDays, withdrawalEggDays: t.withdrawalEggDays ?? med?.withdrawalEggDays });
        }
        if (treatmentKey(treatments) !== treatmentKey(effective)) {
          await E.reverseSource(ctx, id, "Treatment changed", farm, tx);
          treatments = await buildTreatments(ctx, farm, flock, id, input.treatments, tx);
        }
        const next = await repos.healthRecords.update(
          ctx.farmId, id,
          { ...recordFields(input), treatments: treatments.length ? treatments : undefined, followUpDone: input.followUpDate ? cur.followUpDone ?? false : undefined, updatedBy: ctx.userId, updatedAt: clock.now() },
          { expectedVersion: input.version }, tx,
        );
        if (!next) throw new AppError("VERSION_CONFLICT", "This record was changed by someone else");
        for (const h of hooks.onCost) await h(ctx, next, id, tx);
        await d.audit.record(ctx, { action: "health.record_updated", entity: "health_record", entityId: id, before: cur as never, after: next as never }, tx);
        await afterWrite(ctx, next, farm, tx);
        if (cur.flockId && cur.flockId !== next.flockId) await refreshWithheldEggs(ctx, cur.flockId, tx);
        return strip(next);
      });
    },

    /** Deleting a record returns its medicine to stock and lifts its withdrawal periods. */
    async deleteRecord(ctx: FarmContext, id: string) {
      assertCan(ctx, "health.manage");
      await repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const cur = await repos.healthRecords.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Health record");
        if (cur.dailyRecordId) throw new AppError("INVALID_STATE_TRANSITION", "This observation belongs to a daily record; edit the daily record instead");
        await E.reverseSource(ctx, id, "Health record deleted", farm, tx);
        const now = clock.now();
        const gone = await repos.healthRecords.update(ctx.farmId, id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, { expectedVersion: cur.version }, tx);
        for (const h of hooks.onCost) await h(ctx, null, id, tx);
        await d.audit.record(ctx, { action: "health.record_deleted", entity: "health_record", entityId: id, before: { title: cur.title, flockId: cur.flockId } }, tx);
        if (cur.flockId) await afterWrite(ctx, { ...cur, ...gone! }, farm, tx);
      });
    },

    async getRecord(ctx: FarmContext, id: string) {
      assertCan(ctx, "health.read");
      const r = await repos.healthRecords.findById(ctx.farmId, id);
      if (!r) throw notFound("Health record");
      return { ...strip(r), attachments: (r.attachments ?? []).map((a) => ({ ...a, url: `/api/v1/farms/${ctx.farmId}/media/${a.assetId}` })) };
    },

    async listRecords(ctx: FarmContext, q: { flockId?: string; type?: HealthRecordRecord["type"]; from?: string; to?: string; limit: number }) {
      assertCan(ctx, "health.read");
      const where: Record<string, unknown> = {};
      if (q.flockId) where["flockId"] = q.flockId;
      if (q.type) where["type"] = q.type;
      const rows = await repos.healthRecords.find(ctx.farmId, { where: where as never, range: { field: "date", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }, sort: [{ field: "date", dir: -1 }], limit: q.limit });
      return rows.map(strip);
    },

    async completeFollowUp(ctx: FarmContext, id: string) {
      assertCan(ctx, "health.record_observation");
      return repos.tx.run(async (tx) => {
        const r = await repos.healthRecords.findById(ctx.farmId, id, tx);
        if (!r) throw notFound("Health record");
        if (!r.followUpDate) throw new AppError("VALIDATION_FAILED", "This record has no follow-up");
        const next = await repos.healthRecords.update(ctx.farmId, id, { followUpDone: true, updatedBy: ctx.userId, updatedAt: clock.now() }, undefined, tx);
        await d.alerts.resolve(ctx, `follow_up:${id}`, tx);
        return strip(next!);
      });
    },

    async withdrawals(ctx: FarmContext, flockId: string) {
      assertCan(ctx, "health.read");
      const farm = await E.farmOf(ctx);
      await L.loadFlock(ctx, flockId);
      const today = E.todayOf(farm);
      const windows = await windowsFor(ctx, flockId);
      const meat = activeWithdrawal(windows, today, "meat");
      const eggs = activeWithdrawal(windows, today, "eggs");
      return {
        date: today,
        meat: meat ? { until: meat.until, medicine: meat.medicineName, birdsMaySellFrom: addDays(meat.until, 1) } : null,
        eggs: eggs ? { until: eggs.until, medicine: eggs.medicineName, eggsMaySellFrom: addDays(eggs.until, 1) } : null,
        windows: windows.filter((w) => w.until >= today),
      };
    },

    // ---- vet appointments (tasks of kind vet_appointment; reminded by the vet appointment rule)

    async bookAppointment(ctx: FarmContext, r: { date: string; title: string; vetName?: string; flockId?: string; houseId?: string; notes?: string }) {
      assertCan(ctx, "health.manage");
      if (r.flockId) await L.loadFlock(ctx, r.flockId);
      if (r.houseId && !(await repos.houses.findById(ctx.farmId, r.houseId))) throw notFound("House");
      const farm = await E.farmOf(ctx);
      if (r.date < E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", "An appointment cannot be booked in the past");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, kind: "vet_appointment" as const, title: r.vetName ? `${r.title} (${r.vetName})` : r.title, dueDate: r.date, status: "open" as const, priority: "normal" as const, ...defined({ description: r.notes, flockId: r.flockId, houseId: r.houseId }), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tasks.insert(rec);
      return strip(rec);
    },

    async listAppointments(ctx: FarmContext, q: { includeDone?: boolean }) {
      assertCan(ctx, "health.read");
      return (await repos.tasks.find(ctx.farmId, { where: { kind: "vet_appointment", ...(q.includeDone ? {} : { status: ["open", "in_progress"] }) } as never, sort: [{ field: "dueDate", dir: 1 }] })).map(strip);
    },

    async completeAppointment(ctx: FarmContext, id: string, notes?: string) {
      assertCan(ctx, "health.manage");
      const t = await repos.tasks.findById(ctx.farmId, id);
      if (!t || t.kind !== "vet_appointment") throw notFound("Appointment");
      if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `This appointment is ${t.status}`);
      const next = await repos.tasks.update(ctx.farmId, id, { status: "done", completedAt: clock.now(), completedBy: ctx.userId, ...(notes ? { resolutionNotes: notes } : {}), updatedAt: clock.now() }, { expectedVersion: t.version });
      await repos.tx.run((tx) => d.alerts.resolve(ctx, `vet_appointment:${id}`, tx));
      return strip(next!);
    },

    // ---- programmes and vaccinations

    async createProgramme(ctx: FarmContext, input: z.output<typeof CreateProgrammeRequest>) {
      assertCan(ctx, "health.manage");
      for (const i of input.items) if (i.medicineId && !(await repos.medicines.findById(ctx.farmId, i.medicineId))) throw notFound("Medicine");
      const now = clock.now();
      const { id, ...fields } = input;
      const rec: VaccinationProgrammeRecord = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.vaccinationProgrammes.insert(rec, tx).catch(duplicate(`A programme named "${rec.name}"`));
        await d.audit.record(ctx, { action: "programme.created", entity: "vaccination_programme", entityId: rec.id, after: { name: rec.name, items: rec.items.length } }, tx);
      });
      return strip(rec);
    },

    async listProgrammes(ctx: FarmContext) {
      assertCan(ctx, "health.read");
      return (await repos.vaccinationProgrammes.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },

    /** Schedules a programme for a flock by bird age. Items already scheduled from the same programme are skipped. */
    async applyProgramme(ctx: FarmContext, flockId: string, r: { programmeId: string; includePast: boolean }) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, flockId, tx);
        L.assertStatus(flock, ["planned", "active"], "apply a vaccination programme");
        const prog = await repos.vaccinationProgrammes.findById(ctx.farmId, r.programmeId, tx);
        if (!prog || !prog.active) throw notFound("Vaccination programme");
        if (prog.flockTypes?.length && !prog.flockTypes.includes(flock.type)) throw new AppError("VALIDATION_FAILED", `${prog.name} is for ${prog.flockTypes.join(", ")} flocks`);
        // Age comes from the hatch date, else placement; a flock with neither is refused by scheduleProgramme.
        const plan = scheduleProgramme(prog.items, { ...(flock.hatchDate ? { hatchDate: flock.hatchDate } : {}), ...(flock.placementDate ? { placementDate: flock.placementDate } : {}), ...(flock.ageDaysAtPlacement !== undefined ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {}) }, E.todayOf(farm));
        const existing = await repos.vaccinations.find(ctx.farmId, { where: { flockId, programmeId: prog.id } }, tx);
        const have = new Set(existing.map((v) => `${v.dayOfAge}:${v.vaccineName}`));
        const created: VaccinationRecord[] = [];
        for (const p of plan) {
          if (have.has(`${p.dayOfAge}:${p.vaccineName}`) || (p.past && !r.includePast)) continue;
          created.push(await scheduleOne(ctx, { flockId, programmeId: prog.id, dayOfAge: p.dayOfAge, vaccineName: p.vaccineName, dueDate: p.dueDate, ...(p.medicineId ? { medicineId: p.medicineId } : {}), ...(p.targetDisease ? { targetDisease: p.targetDisease } : {}), ...(p.route ? { route: p.route } : {}), ...(p.notes ? { notes: p.notes } : {}) }, tx));
        }
        await d.audit.record(ctx, { action: "programme.applied", entity: "flock", entityId: flockId, after: { programme: prog.name, scheduled: created.length } }, tx);
        const today = E.todayOf(farm);
        return { scheduled: created.map((v) => vaccinationView(v, today)), skipped: plan.length - created.length };
      });
    },

    async scheduleVaccination(ctx: FarmContext, r: z.output<typeof ScheduleVaccinationRequest>) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, r.flockId, tx);
        L.assertStatus(flock, ["planned", "active"], "schedule a vaccination");
        if (r.medicineId && !(await repos.medicines.findById(ctx.farmId, r.medicineId, tx))) throw notFound("Medicine");
        const v = await scheduleOne(ctx, { ...r }, tx);
        return vaccinationView(v, E.todayOf(farm));
      });
    },

    /**
     * Records a vaccination as given. From stock: doses leave the vaccine's lots FEFO, expired batches are refused,
     * and each batch number and expiry is recorded. Not from stock: the batches entered must not be expired.
     */
    async administer(ctx: FarmContext, id: string, r: z.output<typeof AdministerVaccinationRequest>) {
      assertCan(ctx, "health.vaccinate");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const v = await repos.vaccinations.findById(ctx.farmId, id, tx);
        if (!v) throw notFound("Vaccination");
        if (v.status !== "scheduled") throw new AppError("INVALID_STATE_TRANSITION", `This vaccination is already ${v.status}`);
        if (r.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        const flock = await L.loadFlock(ctx, v.flockId, tx);
        L.assertStatus(flock, ["active"], "record a vaccination");
        const alive = population((await L.loadEvents(ctx, flock.id, tx)).map(toLedger), r.date).alive;
        if (r.birdsVaccinated !== undefined && r.birdsVaccinated > alive) throw new AppError("VALIDATION_FAILED", `${flock.flockCode} had ${alive} birds on ${r.date}`);
        let batches: VaccinationRecord["batches"];
        let stockCostMinor: number | undefined;
        if (r.inventoryItemId) {
          const item = await E.loadItem(ctx, r.inventoryItemId, tx);
          if (item.category !== "vaccine") throw new AppError("VALIDATION_FAILED", `${item.name} is not a vaccine`);
          const taken = await E.take(ctx, item, r.dosesUsed!, { date: r.date, purpose: "use", type: "issue", sourceType: "vaccination", sourceId: id, flockId: flock.id, houseId: flock.houseId, reason: `Vaccination: ${v.vaccineName}` }, farm, tx);
          const lots = await Promise.all(taken.allocations.map((a) => repos.inventoryLots.findById(ctx.farmId, a.lotId, tx)));
          batches = taken.allocations.map((a, i) => ({ lotId: a.lotId, doses: a.quantity, ...(lots[i]?.batchNumber ? { batchNumber: lots[i]!.batchNumber } : {}), ...(lots[i]?.expiryDate ? { expiryDate: lots[i]!.expiryDate } : {}) }));
          stockCostMinor = taken.costMinor;
        } else if (r.batches) {
          const expired = r.batches.find((b) => b.expiryDate && b.expiryDate < r.date);
          if (expired) throw new AppError("VALIDATION_FAILED", `Batch ${expired.batchNumber} expired on ${expired.expiryDate}; an expired vaccine cannot be recorded as given`);
          batches = r.batches.map((b) => defined({ batchNumber: b.batchNumber, expiryDate: b.expiryDate, doses: b.doses }));
        }
        const next = await repos.vaccinations.update(
          ctx.farmId, id,
          defined({ status: "done" as const, administeredDate: r.date, administeredBy: r.administeredBy, route: r.route ?? v.route, birdsVaccinated: r.birdsVaccinated, inventoryItemId: r.inventoryItemId, dosesUsed: r.dosesUsed, batches, stockCostMinor, notes: r.notes ?? v.notes, updatedBy: ctx.userId, updatedAt: clock.now() }),
          { expectedVersion: v.version }, tx,
        );
        if (!next) throw new AppError("VERSION_CONFLICT", "This vaccination was changed by someone else");
        await d.alerts.resolve(ctx, `vaccination:${id}`, tx);
        await d.audit.record(ctx, { action: "vaccination.given", entity: "vaccination", entityId: id, after: { flockId: v.flockId, vaccine: v.vaccineName, date: r.date, batches } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "vaccination", entityId: id, op: "upsert", version: next.version }, tx);
        return vaccinationView(next, E.todayOf(farm));
      });
    },

    async skipVaccination(ctx: FarmContext, id: string, reason: string) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const v = await repos.vaccinations.findById(ctx.farmId, id, tx);
        if (!v) throw notFound("Vaccination");
        if (v.status !== "scheduled") throw new AppError("INVALID_STATE_TRANSITION", `This vaccination is already ${v.status}`);
        const next = await repos.vaccinations.update(ctx.farmId, id, { status: "skipped", skipReason: reason, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: v.version }, tx);
        await d.alerts.resolve(ctx, `vaccination:${id}`, tx);
        await d.audit.record(ctx, { action: "vaccination.skipped", entity: "vaccination", entityId: id, after: { reason } }, tx);
        return vaccinationView(next!, E.todayOf(farm));
      });
    },

    async listVaccinations(ctx: FarmContext, q: { flockId?: string; state?: string; from?: string; to?: string }) {
      assertCan(ctx, "health.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const rows = await repos.vaccinations.find(ctx.farmId, { ...(q.flockId ? { where: { flockId: q.flockId } } : {}), range: { field: "dueDate", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }, sort: [{ field: "dueDate", dir: 1 }] });
      return rows.map((v) => vaccinationView(v, today)).filter((v) => !q.state || v.state === q.state);
    },

    /** Everything coming up or overdue: vaccinations, follow-ups and withdrawal periods ending. Reminders, not instructions. */
    async reminders(ctx: FarmContext, q: { days: number }) {
      assertCan(ctx, "health.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const horizon = addDays(today, q.days);
      const [vacc, follow, flocks] = await Promise.all([
        repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: horizon } }),
        repos.healthRecords.find(ctx.farmId, { where: { followUpDone: false }, range: { field: "followUpDate", to: horizon } }),
        repos.flocks.find(ctx.farmId, { where: { status: "active" } }),
      ]);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      const items: { kind: string; date: string; overdue: boolean; title: string; flockId?: string; refId: string }[] = [
        ...vacc.map((v) => ({ kind: "vaccination", date: v.dueDate, overdue: v.dueDate < today, title: `${v.vaccineName} for ${code.get(v.flockId) ?? "flock"}`, flockId: v.flockId, refId: v.id })),
        ...follow.map((r) => ({ kind: "follow_up", date: r.followUpDate!, overdue: r.followUpDate! < today, title: `Follow up: ${r.title}`, ...(r.flockId ? { flockId: r.flockId } : {}), refId: r.id })),
      ];
      for (const f of flocks) {
        for (const w of await windowsFor(ctx, f.id)) {
          if (w.until >= today && w.until <= horizon) items.push({ kind: `withdrawal_${w.kind}_ends`, date: w.until, overdue: false, title: `${w.kind === "meat" ? "Meat" : "Egg"} withdrawal for ${w.medicineName} ends (${f.flockCode})`, flockId: f.id, refId: w.recordId });
        }
      }
      return { date: today, until: horizon, items: items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) };
    },

    /** Hourly: overdue vaccinations, follow-ups due, and withdrawal alerts that have ended. */
    async evaluateAlerts(ctx: FarmContext, tx: Tx) {
      const farm = await E.farmOf(ctx, tx);
      const today = E.todayOf(farm);
      const flocks = await repos.flocks.find(ctx.farmId, {}, tx);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      for (const v of await repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: addDays(today, -1) } }, tx)) {
        await d.alerts.raise(ctx, { ruleType: "vaccination_due", severity: "warning", title: `Vaccination overdue: ${code.get(v.flockId) ?? "flock"}`, message: `${v.vaccineName} for ${code.get(v.flockId) ?? "the flock"} was due on ${v.dueDate}. Record it as given, reschedule or skip it with a reason.`, dedupKey: `vaccination:${v.id}`, date: today, flockId: v.flockId }, tx);
      }
      for (const r of await repos.healthRecords.find(ctx.farmId, { where: { followUpDone: false }, range: { field: "followUpDate", to: today } }, tx)) {
        await d.alerts.raise(ctx, { ruleType: "health_follow_up", severity: "info", title: `Health follow-up due: ${r.title}`, message: `Follow-up planned for ${r.followUpDate}: ${r.title}.`, dedupKey: `follow_up:${r.id}`, date: today, ...(r.flockId ? { flockId: r.flockId } : {}) }, tx);
      }
      for (const a of await repos.alerts.find(ctx.farmId, { where: { ruleType: "withdrawal_active", status: ["open", "acknowledged"] } }, tx)) {
        if (a.flockId) {
          const w = await windowsFor(ctx, a.flockId, tx);
          if (!activeWithdrawal(w, today, "meat") && !activeWithdrawal(w, today, "eggs")) await d.alerts.resolve(ctx, a.dedupKey, tx);
        }
      }
    },
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
