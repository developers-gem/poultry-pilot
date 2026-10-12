import type { z } from "zod";
import type { BiosecurityLogRequest, ChecklistAnswers, CreateChecklistTemplateRequest, VisitorCheckInRequest } from "@poultrypilot/validation";

type ChecklistAnswersType = z.output<typeof ChecklistAnswers>;
type CheckInRequestType = z.output<typeof VisitorCheckInRequest>;
type CreateTemplateType = Omit<z.output<typeof CreateChecklistTemplateRequest>, "id">;
import { addDays, addMonthsClamped, evaluateChecklist, visitorDowntime } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { BiosecurityLogRecord, ChecklistResult, ChecklistTemplateRecord, CleaningTaskRecord, EquipmentRecord, TaskRecord, VisitorRecord } from "../ports/records.js";
import type { AlertService } from "./alert.service.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";
import { duplicate } from "./house.service.js";
import type { InventoryService } from "./inventory.service.js";
import type { SyncService } from "./sync.service.js";

const STOCK_PRODUCTS = new Set(["disinfectant", "cleaning", "medicine", "litter", "other"]);

/**
 * Generic starter checklists: not tied to any country's rules. Farms edit them, or replace them with the
 * checklists their veterinarian, buyer or certification scheme requires.
 */
export const STARTER_CHECKLISTS: Omit<ChecklistTemplateRecord, "id" | "farmId" | "createdBy" | "createdAt" | "updatedAt" | "version" | "active">[] = [
  {
    name: "Visitor declaration",
    kind: "visitor_declaration",
    source: "PoultryPilot starter template (generic; edit to match your farm's rules)",
    items: [
      { id: "sick_birds_contact", text: "Have you been in contact with sick or dead poultry recently?", required: true, responseType: "yes_no", failIf: "yes", createActionOnFail: true },
      { id: "other_farm_today", text: "Have you visited another poultry farm, market or hatchery today?", required: true, responseType: "yes_no", failIf: "yes", createActionOnFail: true },
      { id: "farm_clothing", text: "Have you put on farm-provided clothing and boots?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "follow_rules", text: "Will you follow the farm's biosecurity instructions during the visit?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: false },
    ],
  },
  {
    name: "Footbath check",
    kind: "footbath",
    source: "PoultryPilot starter template (generic)",
    items: [
      { id: "clean", text: "Is the footbath free of visible dirt and organic matter?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "level", text: "Is the disinfectant at the marked level?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "concentration", text: "Concentration used (as on the product label)", required: false, responseType: "text", createActionOnFail: false },
    ],
  },
  {
    name: "House cleaning between flocks",
    kind: "cleaning",
    source: "PoultryPilot starter template (generic)",
    items: [
      { id: "litter_removed", text: "All litter and manure removed?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "dry_clean", text: "Dust and debris removed from walls, beams and equipment?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "washed", text: "House and equipment washed?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "disinfected", text: "Disinfectant applied as the label directs?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "water_lines", text: "Water lines flushed and cleaned?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
    ],
  },
  {
    name: "Monthly biosecurity audit",
    kind: "audit",
    source: "PoultryPilot starter template (generic)",
    items: [
      { id: "perimeter", text: "Perimeter fence and gates secure?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "wild_birds", text: "Houses closed to wild birds (nets, doors, gaps)?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "feed_covered", text: "Feed stores closed and spills cleaned up?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "dead_birds", text: "Dead birds removed and disposed of as your local rules require?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "rodents", text: "Signs of rodents found?", required: true, responseType: "yes_no", failIf: "yes", createActionOnFail: true },
    ],
  },
];

export function createBiosecurityService(d: { repos: Repositories; clock: Clock; audit: AuditService; sync: SyncService; inventory: InventoryService; alerts: AlertService }) {
  const { repos, clock } = d;
  const E = d.inventory.engine;

  const strip = <T extends { farmId: string; deletedAt?: Date; deletedBy?: string; createdAt: Date; updatedAt: Date }>({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }: T) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  });
  const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

  /** Evaluates answers against the farm's template; failed items become corrective actions and an alert. */
  async function runChecklist(ctx: FarmContext, input: ChecklistAnswersType, expectedKinds: ChecklistTemplateRecord["kind"][], related: { entity: string; id: string; date: string; houseId?: string; label: string }, tx: Tx): Promise<ChecklistResult> {
    const tpl = await repos.checklistTemplates.findById(ctx.farmId, input.templateId, tx);
    if (!tpl || !tpl.active) throw notFound("Checklist");
    if (!expectedKinds.includes(tpl.kind)) throw new AppError("VALIDATION_FAILED", `That checklist is for ${tpl.kind.replace("_", " ")}, not ${expectedKinds.join(" or ").replace("_", " ")}`);
    const r = evaluateChecklist(tpl.items, input.answers);
    if (r.failed.length) {
      const now = clock.now();
      for (const f of r.failed) {
        const item = tpl.items.find((i) => i.id === f.itemId)!;
        if (!item.createActionOnFail) continue;
        await repos.tasks.insert(
          { id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Fix: ${item.text}`, description: `${related.label} on ${related.date}: answered "${typeof f.answer === "boolean" ? (f.answer ? "yes" : "no") : f.answer}".`, dueDate: addDays(related.date, 1), status: "open", priority: "high", related: { entity: related.entity, id: related.id }, ...(related.houseId ? { houseId: related.houseId } : {}), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 },
          tx,
        );
      }
      await d.alerts.raise(ctx, { ruleType: "checklist_failed", severity: "warning", title: `${tpl.name}: ${r.failed.length} item(s) failed`, message: `${related.label} on ${related.date}: ${r.failed.map((f) => f.text).join("; ")}.`, dedupKey: `checklist:${related.entity}:${related.id}`, date: related.date, ...(related.houseId ? { houseId: related.houseId } : {}) }, tx);
    }
    return { templateId: tpl.id, templateVersion: tpl.version, answers: r.answers, failedCount: r.failed.length };
  }

  function nextDue(schedule: CleaningTaskRecord["schedule"], done: string): string | undefined {
    switch (schedule) {
      case "daily":
        return addDays(done, 1);
      case "weekly":
        return addDays(done, 7);
      case "monthly":
        return addMonthsClamped(done, 1);
      default:
        return undefined; // between flocks and one-off: set the next date by hand
    }
  }

  async function writeLog(ctx: FarmContext, body: z.output<typeof BiosecurityLogRequest>, tx: Tx): Promise<BiosecurityLogRecord> {
    const farm = await E.farmOf(ctx, tx);
    if (body.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${body.date} is in the future for this farm`);
    if (body.houseId && !(await repos.houses.findById(ctx.farmId, body.houseId, tx))) throw notFound("House");
    for (const a of body.attachments) if (!(await repos.mediaAssets.findById(ctx.farmId, a.assetId, tx))) throw new AppError("NOT_FOUND", `Attachment ${a.assetId} not found on this farm`);
    const id = newId();
    let product: BiosecurityLogRecord["product"] = body.product ? defined({ ...body.product }) : undefined;
    if (body.product?.inventoryItemId) {
      const item = await E.loadItem(ctx, body.product.inventoryItemId, tx);
      if (!STOCK_PRODUCTS.has(item.category)) throw new AppError("VALIDATION_FAILED", `${item.name} (${item.category}) cannot be used as a biosecurity product`);
      const taken = await E.take(ctx, item, body.product.quantityUsed!, { date: body.date, purpose: "use", type: "issue", sourceType: "manual", sourceId: id, ...(body.houseId ? { houseId: body.houseId } : {}), reason: `Biosecurity: ${body.type.replace(/_/g, " ")}` }, farm, tx);
      product = { ...product, name: body.product.name ?? item.name, stockCostMinor: taken.costMinor };
    }
    const kindFor: Record<string, ChecklistTemplateRecord["kind"][]> = {
      cleaning: ["cleaning", "general"],
      disinfection: ["disinfection", "cleaning", "general"],
      footbath: ["footbath", "general"],
      vehicle: ["vehicle", "general"],
      pest_control: ["pest_control", "general"],
      audit: ["audit", "general"],
      wild_bird_observation: ["general", "audit"],
    };
    const checklist = body.checklist ? await runChecklist(ctx, body.checklist, kindFor[body.type]!, { entity: "biosecurity_log", id, date: body.date, ...(body.houseId ? { houseId: body.houseId } : {}), label: body.type.replace(/_/g, " ") }, tx) : undefined;
    const now = clock.now();
    const rec: BiosecurityLogRecord = {
      id,
      farmId: ctx.farmId,
      type: body.type,
      date: body.date,
      ...defined({ houseId: body.houseId, cleaningTaskId: body.cleaningTaskId, performedBy: body.performedBy, details: body.details }),
      ...(product ? { product } : {}),
      ...(body.footbath ? { footbath: defined(body.footbath) } : {}),
      ...(body.vehicle ? { vehicle: defined({ ...body.vehicle, entryAt: body.vehicle.entryAt ? new Date(body.vehicle.entryAt) : undefined, exitAt: body.vehicle.exitAt ? new Date(body.vehicle.exitAt) : undefined, lastPoultryContactAt: body.vehicle.lastPoultryContactAt ? new Date(body.vehicle.lastPoultryContactAt) : undefined }) } : {}),
      ...(body.pest ? { pest: defined(body.pest) } : {}),
      ...(body.wildBird ? { wildBird: defined(body.wildBird) } : {}),
      ...(checklist ? { checklist } : {}),
      ...(body.attachments.length ? { attachments: body.attachments } : {}),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    await repos.biosecurityLogs.insert(rec, tx);

    if (body.wildBird && (body.wildBird.contactWithPoultry || body.wildBird.contactWithFeedOrWater || (body.wildBird.deadWildBirdsFound ?? 0) > 0)) {
      const dead = body.wildBird.deadWildBirdsFound ?? 0;
      await d.alerts.raise(ctx, {
        ruleType: "wild_bird_contact",
        severity: dead > 0 ? "critical" : "warning",
        title: dead > 0 ? `Dead wild birds found (${dead})` : "Wild birds in contact with poultry, feed or water",
        message: `${body.wildBird.description}${body.wildBird.location ? ` at ${body.wildBird.location}` : ""} on ${body.date}. Keep poultry away, close gaps, ${dead > 0 ? "do not handle dead birds without protection, and follow your local reporting requirements for dead wild birds" : "and watch the flock closely"}. Contact your veterinarian if you are concerned.`,
        dedupKey: `wild_bird:${id}`,
        date: body.date,
        ...(body.houseId ? { houseId: body.houseId } : {}),
      }, tx);
    }
    if (body.pest?.activityFound) {
      await repos.tasks.insert({ id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Pest activity found (${body.pest.pestType})`, description: `Found on ${body.date}${body.pest.method ? ` during ${body.pest.method}` : ""}. Agree and record a control measure.`, dueDate: addDays(body.date, 2), status: "open", priority: "high", related: { entity: "biosecurity_log", id }, ...(body.houseId ? { houseId: body.houseId } : {}), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
    }
    if (body.vehicle && !body.vehicle.disinfected) {
      await repos.tasks.insert({ id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Vehicle ${body.vehicle.registration} entered without disinfection`, description: `On ${body.date}. Review the vehicle entry procedure.`, dueDate: addDays(body.date, 1), status: "open", priority: "normal", related: { entity: "biosecurity_log", id }, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
    }
    await d.audit.record(ctx, { action: `biosecurity.${body.type}`, entity: "biosecurity_log", entityId: id, after: { date: body.date, houseId: body.houseId, failed: checklist?.failedCount ?? 0 } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "biosecurity_log", entityId: id, op: "upsert", version: 0 }, tx);
    return rec;
  }

  return {
    /** Shared with ChickStart: evaluate answers against a farm checklist, raising actions and an alert on failures. */
    runChecklist,

    // ---- checklists

    async createTemplate(ctx: FarmContext, input: CreateTemplateType & { id?: string }) {
      assertCan(ctx, "biosecurity.manage");
      const now = clock.now();
      const { id, ...fields } = input;
      const rec: ChecklistTemplateRecord = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), items: fields.items.map((i) => defined(i)), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.checklistTemplates.insert(rec, tx).catch(duplicate(`A ${rec.kind.replace("_", " ")} checklist named "${rec.name}"`));
        await d.audit.record(ctx, { action: "checklist.created", entity: "checklist_template", entityId: rec.id, after: { name: rec.name, kind: rec.kind, items: rec.items.length } }, tx);
      });
      return strip(rec);
    },

    /** Editing a checklist bumps its version; records keep the version and wording they were answered with. */
    async updateTemplate(ctx: FarmContext, id: string, input: CreateTemplateType & { active: boolean; version: number }) {
      assertCan(ctx, "biosecurity.manage");
      return repos.tx.run(async (tx) => {
        const cur = await repos.checklistTemplates.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Checklist");
        const { version, ...fields } = input;
        const next = await repos.checklistTemplates.update(ctx.farmId, id, { ...fields, items: fields.items.map((i) => defined(i)), updatedBy: ctx.userId, updatedAt: clock.now() } as never, { expectedVersion: version }, tx).catch(duplicate(`A checklist named "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This checklist was changed by someone else", { serverVersion: cur.version });
        await d.audit.record(ctx, { action: "checklist.updated", entity: "checklist_template", entityId: id, before: { version: cur.version, items: cur.items.length }, after: { version: next.version, items: next.items.length } }, tx);
        return strip(next);
      });
    },

    async listTemplates(ctx: FarmContext, q: { kind?: ChecklistTemplateRecord["kind"] }) {
      assertCan(ctx, "biosecurity.read");
      return (await repos.checklistTemplates.find(ctx.farmId, { ...(q.kind ? { where: { kind: q.kind } } : {}), sort: [{ field: "name", dir: 1 }] })).map(strip);
    },

    /** Adds the generic starter checklists the farm does not already have (by kind and name). */
    async addStarterTemplates(ctx: FarmContext) {
      assertCan(ctx, "biosecurity.manage");
      const existing = await repos.checklistTemplates.find(ctx.farmId);
      const have = new Set(existing.map((t) => `${t.kind}:${t.name}`));
      const created: ChecklistTemplateRecord[] = [];
      await repos.tx.run(async (tx) => {
        const now = clock.now();
        for (const t of STARTER_CHECKLISTS) {
          if (have.has(`${t.kind}:${t.name}`)) continue;
          const rec: ChecklistTemplateRecord = { id: newId(), farmId: ctx.farmId, ...t, active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
          await repos.checklistTemplates.insert(rec, tx);
          created.push(rec);
        }
        await d.audit.record(ctx, { action: "checklist.starters_added", entity: "farm", entityId: ctx.farmId, after: { added: created.length } }, tx);
      });
      return { added: created.map(strip) };
    },

    // ---- visitors

    /**
     * Checks a visitor in: records the declaration (against the farm's checklist), previous poultry contact and the
     * downtime since, PPE and footbath. A short downtime (by the farm's own rule) or a failed declaration flags the
     * visit and raises a biosecurity alert; entry decisions stay with the farm.
     */
    async checkIn(ctx: FarmContext, body: CheckInRequestType) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        for (const h of body.housesVisited ?? []) if (!(await repos.houses.findById(ctx.farmId, h, tx))) throw notFound("House");
        if (body.declaration?.signatureAssetId && !(await repos.mediaAssets.findById(ctx.farmId, body.declaration.signatureAssetId, tx))) throw new AppError("NOT_FOUND", "Signature image not found on this farm");
        const id = newId();
        const checkInAt = body.checkInAt ? new Date(body.checkInAt) : clock.now();
        const lastContactAt = body.previousPoultryContact.lastContactAt ? new Date(body.previousPoultryContact.lastContactAt) : undefined;
        if (lastContactAt && lastContactAt > checkInAt) throw new AppError("VALIDATION_FAILED", "Last poultry contact is after the check-in time");
        const required = farm.settings.visitorDowntimeHours;
        const downtime = visitorDowntime(body.previousPoultryContact.hadContact ? lastContactAt : undefined, checkInAt, required);
        const date = new Intl.DateTimeFormat("en-CA", { timeZone: farm.settings.timezone }).format(checkInAt);
        const declarationChecklist = body.declaration?.checklist ? await runChecklist(ctx, body.declaration.checklist, ["visitor_declaration"], { entity: "visitor", id, date, label: `Visitor ${body.name}` }, tx) : undefined;
        const flags: VisitorRecord["flags"] = [...(downtime.short ? ["downtime_short" as const] : []), ...(declarationChecklist?.failedCount ? ["declaration_failed" as const] : [])];
        const now = clock.now();
        const rec: VisitorRecord = {
          id,
          farmId: ctx.farmId,
          ...defined({ name: body.name, company: body.company, type: body.type, phone: body.phone, purpose: body.purpose, vehicleRegistration: body.vehicleRegistration, housesVisited: body.housesVisited, notes: body.notes }),
          previousPoultryContact: defined({ hadContact: body.previousPoultryContact.hadContact, lastContactAt, description: body.previousPoultryContact.description }),
          ...(downtime.hours !== null ? { downtimeHours: downtime.hours } : {}),
          ...(required !== undefined ? { requiredDowntimeHours: required } : {}),
          ...(body.declaration ? { declaration: defined({ declaredName: body.declaration.declaredName, declaredAt: now, signatureAssetId: body.declaration.signatureAssetId, checklist: declarationChecklist }) } : {}),
          ...(body.ppeUsed?.length ? { ppeUsed: body.ppeUsed } : {}),
          footbathUsed: body.footbathUsed,
          disinfected: body.disinfected,
          ...(flags.length ? { flags } : {}),
          checkInAt,
          hostUserId: ctx.userId,
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.visitors.insert(rec, tx);
        if (downtime.short) {
          await d.alerts.raise(ctx, { ruleType: "biosecurity_breach", severity: "warning", title: `Visitor downtime below the farm rule: ${body.name}`, message: `${body.name} last had poultry contact ${downtime.hours} hours before arriving; the farm requires ${required} hours.`, dedupKey: `visitor:${id}:downtime`, date }, tx);
        }
        await d.audit.record(ctx, { action: "visitor.checked_in", entity: "visitor", entityId: id, after: { name: body.name, flags } }, tx);
        return strip(rec);
      });
    },

    async checkOut(ctx: FarmContext, id: string, at?: string) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const v = await repos.visitors.findById(ctx.farmId, id, tx);
        if (!v) throw notFound("Visitor");
        if (v.checkOutAt) throw new AppError("INVALID_STATE_TRANSITION", "This visitor has already checked out");
        const out = at ? new Date(at) : clock.now();
        if (out < v.checkInAt) throw new AppError("VALIDATION_FAILED", "Check-out is before check-in");
        const next = await repos.visitors.update(ctx.farmId, id, { checkOutAt: out, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: v.version }, tx);
        return strip(next!);
      });
    },

    async listVisitors(ctx: FarmContext, q: { from?: string; to?: string; flagged?: boolean }) {
      assertCan(ctx, "biosecurity.read");
      const rows = await repos.visitors.find(ctx.farmId, { ...(q.flagged ? { exists: { flags: true } } : {}), sort: [{ field: "checkInAt", dir: -1 }], limit: 500 });
      const inRange = (d: Date) => (!q.from || d >= new Date(`${q.from}T00:00:00Z`)) && (!q.to || d <= new Date(`${q.to}T23:59:59Z`));
      return rows.filter((v) => inRange(v.checkInAt)).map(strip);
    },

    // ---- logs

    async createLog(ctx: FarmContext, body: z.output<typeof BiosecurityLogRequest>) {
      assertCan(ctx, "biosecurity.record");
      return strip(await repos.tx.run((tx) => writeLog(ctx, body, tx)));
    },

    async listLogs(ctx: FarmContext, q: { type?: BiosecurityLogRecord["type"]; houseId?: string; from?: string; to?: string; limit: number }) {
      assertCan(ctx, "biosecurity.read");
      const where: Record<string, unknown> = {};
      if (q.type) where["type"] = q.type;
      if (q.houseId) where["houseId"] = q.houseId;
      return (await repos.biosecurityLogs.find(ctx.farmId, { where: where as never, range: { field: "date", ...(q.from ? { from: q.from } : {}), ...(q.to ? { to: q.to } : {}) }, sort: [{ field: "date", dir: -1 }], limit: q.limit })).map(strip);
    },

    // ---- equipment

    async createEquipment(ctx: FarmContext, body: Omit<EquipmentRecord, keyof import("../ports/records.js").Editable> & { id?: string }) {
      assertCan(ctx, "biosecurity.manage");
      if (body.houseId && !(await repos.houses.findById(ctx.farmId, body.houseId))) throw notFound("House");
      const now = clock.now();
      const { id, ...fields } = body;
      const rec: EquipmentRecord = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.equipment.insert(rec);
      return strip(rec);
    },

    async listEquipment(ctx: FarmContext) {
      assertCan(ctx, "biosecurity.read");
      return (await repos.equipment.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },

    /** Records a move between houses or off the farm. Moving without disinfection raises a corrective action. */
    async moveEquipment(ctx: FarmContext, equipmentId: string, r: { date: string; toHouseId?: string; offFarmDestination?: string; disinfected: boolean; movedBy?: string; note?: string }) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const eq = await repos.equipment.findById(ctx.farmId, equipmentId, tx);
        if (!eq) throw notFound("Equipment");
        if (r.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        if (r.toHouseId && !(await repos.houses.findById(ctx.farmId, r.toHouseId, tx))) throw notFound("House");
        if (r.toHouseId && r.toHouseId === eq.houseId) throw new AppError("VALIDATION_FAILED", "The equipment is already in that house");
        const now = clock.now();
        const move = { id: newId(), farmId: ctx.farmId, equipmentId, date: r.date, ...defined({ fromHouseId: eq.houseId, toHouseId: r.toHouseId, offFarmDestination: r.offFarmDestination, movedBy: r.movedBy, note: r.note }), disinfected: r.disinfected, createdBy: ctx.userId, createdAt: now, updatedAt: now };
        await repos.equipmentMovements.insert(move, tx);
        await repos.equipment.update(ctx.farmId, equipmentId, { houseId: r.toHouseId, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: eq.version }, tx);
        if (!r.disinfected) {
          await repos.tasks.insert({ id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Disinfect ${eq.name} after its move`, description: `Moved on ${r.date} without disinfection${r.toHouseId ? "" : ` (to ${r.offFarmDestination})`}.`, dueDate: r.date, status: "open", priority: "high", related: { entity: "equipment_movement", id: move.id }, ...(r.toHouseId ? { houseId: r.toHouseId } : {}), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
        }
        await d.audit.record(ctx, { action: "equipment.moved", entity: "equipment", entityId: equipmentId, after: { from: eq.houseId, to: r.toHouseId ?? r.offFarmDestination, disinfected: r.disinfected } }, tx);
        const { farmId: _f, updatedAt: _u, createdAt, ...m } = move;
        return { ...m, createdAt: createdAt.toISOString() };
      });
    },

    // ---- cleaning schedules

    async createSchedule(ctx: FarmContext, body: Omit<CleaningTaskRecord, keyof import("../ports/records.js").Editable | "active" | "lastDoneDate">) {
      assertCan(ctx, "biosecurity.manage");
      if (body.checklistTemplateId && !(await repos.checklistTemplates.findById(ctx.farmId, body.checklistTemplateId))) throw notFound("Checklist");
      for (const h of body.houseIds ?? []) if (!(await repos.houses.findById(ctx.farmId, h))) throw notFound("House");
      const now = clock.now();
      const rec: CleaningTaskRecord = { id: newId(), farmId: ctx.farmId, ...defined(body), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.cleaningTasks.insert(rec);
      return strip(rec);
    },

    async listSchedules(ctx: FarmContext) {
      assertCan(ctx, "biosecurity.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      return (await repos.cleaningTasks.find(ctx.farmId, { where: { active: true }, sort: [{ field: "nextDueDate", dir: 1 }] })).map((t) => ({ ...strip(t), overdue: !!t.nextDueDate && t.nextDueDate < today }));
    },

    /** Completing a schedule writes the cleaning or disinfection log (with checklist answers) and moves the next due date. */
    async completeSchedule(ctx: FarmContext, id: string, r: { date: string; houseId?: string; performedBy?: string; product?: z.output<typeof BiosecurityLogRequest>["product"]; checklist?: ChecklistAnswersType; details?: string }) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const task = await repos.cleaningTasks.findById(ctx.farmId, id, tx);
        if (!task || !task.active) throw notFound("Cleaning schedule");
        if (task.checklistTemplateId && !r.checklist) throw new AppError("CHECKLIST_INCOMPLETE", "This schedule has a checklist; send its answers");
        if (r.checklist && task.checklistTemplateId && r.checklist.templateId !== task.checklistTemplateId) throw new AppError("VALIDATION_FAILED", "Use the checklist set on this schedule");
        const houseId = r.houseId ?? (task.houseIds?.length === 1 ? task.houseIds[0] : undefined);
        const log = await writeLog(ctx, { type: task.activity, date: r.date, cleaningTaskId: id, attachments: [], ...defined({ houseId, performedBy: r.performedBy, product: r.product, checklist: r.checklist, details: r.details }) }, tx);
        const next = nextDue(task.schedule, r.date);
        await repos.cleaningTasks.update(ctx.farmId, id, { lastDoneDate: r.date, nextDueDate: next, active: task.schedule !== "one_off", updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: task.version }, tx);
        return { log: strip(log), nextDueDate: next ?? null };
      });
    },

    // ---- corrective actions

    async createAction(ctx: FarmContext, body: { title: string; description?: string; assigneeUserId?: string; dueDate?: string; priority: TaskRecord["priority"]; houseId?: string; flockId?: string }) {
      assertCan(ctx, "biosecurity.record");
      if (body.assigneeUserId && !(await repos.memberships.findActive(ctx.farmId, body.assigneeUserId))) throw new AppError("VALIDATION_FAILED", "The assignee is not a member of this farm");
      if (body.houseId && !(await repos.houses.findById(ctx.farmId, body.houseId))) throw notFound("House");
      if (body.flockId && !(await repos.flocks.findById(ctx.farmId, body.flockId))) throw notFound("Flock");
      const now = clock.now();
      const rec: TaskRecord = { id: newId(), farmId: ctx.farmId, kind: "corrective_action", status: "open", ...defined(body), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tasks.insert(rec);
      return strip(rec);
    },

    async listActions(ctx: FarmContext, q: { status?: TaskRecord["status"]; kind: TaskRecord["kind"] }) {
      assertCan(ctx, "biosecurity.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const rows = await repos.tasks.find(ctx.farmId, { where: { kind: q.kind, ...(q.status ? { status: q.status } : {}) } as never, sort: [{ field: "dueDate", dir: 1 }] });
      return rows.map((t) => ({ ...strip(t), overdue: t.status !== "done" && t.status !== "cancelled" && !!t.dueDate && t.dueDate < today }));
    },

    async completeAction(ctx: FarmContext, id: string, notes: string) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const t = await repos.tasks.findById(ctx.farmId, id, tx);
        if (!t) throw notFound("Corrective action");
        if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `This action is already ${t.status}`);
        const next = await repos.tasks.update(ctx.farmId, id, { status: "done", completedAt: clock.now(), completedBy: ctx.userId, resolutionNotes: notes, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: t.version }, tx);
        if (t.related) await d.alerts.resolve(ctx, `checklist:${t.related.entity}:${t.related.id}`, tx).catch(() => undefined);
        await d.audit.record(ctx, { action: "corrective_action.completed", entity: "task", entityId: id, after: { notes } }, tx);
        return strip(next!);
      });
    },

    /** A supervisor confirms the fix worked. The person who completed it cannot verify their own work. */
    async verifyAction(ctx: FarmContext, id: string) {
      assertCan(ctx, "biosecurity.manage");
      return repos.tx.run(async (tx) => {
        const t = await repos.tasks.findById(ctx.farmId, id, tx);
        if (!t) throw notFound("Corrective action");
        if (t.status !== "done") throw new AppError("INVALID_STATE_TRANSITION", "Only a completed action can be verified");
        if (t.completedBy === ctx.userId) throw new AppError("FORBIDDEN", "Someone other than the person who completed the action must verify it");
        const next = await repos.tasks.update(ctx.farmId, id, { verifiedAt: clock.now(), verifiedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: t.version }, tx);
        await d.audit.record(ctx, { action: "corrective_action.verified", entity: "task", entityId: id }, tx);
        return strip(next!);
      });
    },

    /** Biosecurity at a glance for the dashboard. */
    async summary(ctx: FarmContext) {
      assertCan(ctx, "biosecurity.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const weekAgo = addDays(today, -7);
      const [visitors, actions, schedules, logs] = await Promise.all([
        repos.visitors.find(ctx.farmId, { sort: [{ field: "checkInAt", dir: -1 }], limit: 200 }),
        repos.tasks.find(ctx.farmId, { where: { kind: "corrective_action", status: ["open", "in_progress"] } as never }),
        repos.cleaningTasks.find(ctx.farmId, { where: { active: true } }),
        repos.biosecurityLogs.find(ctx.farmId, { range: { field: "date", from: weekAgo, to: today } }),
      ]);
      const dateOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: farm.settings.timezone }).format(d);
      const lastFootbath = (await repos.biosecurityLogs.find(ctx.farmId, { where: { type: "footbath" }, sort: [{ field: "date", dir: -1 }], limit: 1 }))[0];
      return {
        date: today,
        visitorsToday: visitors.filter((v) => dateOf(v.checkInAt) === today).length,
        visitorsOnSite: visitors.filter((v) => !v.checkOutAt && dateOf(v.checkInAt) === today).length,
        flaggedVisitorsLast7Days: visitors.filter((v) => v.flags?.length && dateOf(v.checkInAt) >= weekAgo).length,
        openCorrectiveActions: actions.length,
        overdueCorrectiveActions: actions.filter((a) => a.dueDate && a.dueDate < today).length,
        cleaningOverdue: schedules.filter((s) => s.nextDueDate && s.nextDueDate < today).length,
        cleaningDueToday: schedules.filter((s) => s.nextDueDate === today).length,
        failedChecksLast7Days: logs.filter((l) => (l.checklist?.failedCount ?? 0) > 0).length,
        wildBirdContactsLast7Days: logs.filter((l) => l.wildBird && (l.wildBird.contactWithPoultry || l.wildBird.contactWithFeedOrWater || (l.wildBird.deadWildBirdsFound ?? 0) > 0)).length,
        lastFootbathCheck: lastFootbath?.date ?? null,
      };
    },
  };
}

export type BiosecurityService = ReturnType<typeof createBiosecurityService>;
