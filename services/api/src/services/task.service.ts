import { can } from "@poultrypilot/constants";
import { addDays, localDateOf } from "../domain/index.js";
import { AppError } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { TaskRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import type { CalendarService } from "./calendar.service.js";
import { assertCan, type FarmContext } from "./context.js";
import type { DailyRecordService } from "./daily-record.service.js";

type Priority = TaskRecord["priority"];
const PRIORITY: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export interface CreateTask {
  id?: string;
  title: string;
  description?: string;
  kind: "general" | "follow_up";
  dueDate?: string;
  priority: Priority;
  flockId?: string;
  houseId?: string;
  assigneeUserId?: string;
}

/**
 * Farm tasks: what people need to do. Stored tasks (general, follow-ups, and the corrective actions biosecurity
 * raises) plus, for "today", the scheduled work from the calendar and each flock's daily entry.
 */
export function createTaskService(d: { repos: Repositories; clock: Clock; audit: AuditService; calendar: CalendarService; dailyRecords: DailyRecordService }) {
  const { repos, clock } = d;

  async function todayOf(ctx: FarmContext): Promise<string> {
    const farm = await repos.farms.findById(ctx.farmId);
    return localDateOf(clock.now(), farm!.settings.timezone);
  }

  /** Names for flocks, houses and assignees, so lists read without extra lookups. */
  async function viewsOf(ctx: FarmContext, rows: TaskRecord[], today: string) {
    const [flocks, houses, members] = await Promise.all([
      repos.flocks.find(ctx.farmId, {}),
      repos.houses.find(ctx.farmId, {}),
      repos.memberships.findByFarm(ctx.farmId),
    ]);
    const users = new Map<string, string>();
    for (const m of members) {
      if (!m.userId || users.has(m.userId)) continue;
      const u = await repos.users.findById(m.userId);
      if (u) users.set(m.userId, u.fullName);
    }
    const flockCode = new Map(flocks.map((f) => [f.id, f.flockCode]));
    const houseName = new Map(houses.map((h) => [h.id, h.name]));
    return rows.map((t) => ({
      id: t.id,
      kind: t.kind,
      title: t.title,
      description: t.description ?? null,
      dueDate: t.dueDate ?? null,
      status: t.status,
      priority: t.priority,
      overdue: !!t.dueDate && t.dueDate < today && (t.status === "open" || t.status === "in_progress"),
      flockId: t.flockId ?? null,
      flockCode: t.flockId ? (flockCode.get(t.flockId) ?? null) : null,
      houseId: t.houseId ?? null,
      houseName: t.houseId ? (houseName.get(t.houseId) ?? null) : null,
      assigneeUserId: t.assigneeUserId ?? null,
      assigneeName: t.assigneeUserId ? (users.get(t.assigneeUserId) ?? null) : null,
      related: t.related ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      completedByName: t.completedBy ? (users.get(t.completedBy) ?? null) : null,
      resolutionNotes: t.resolutionNotes ?? null,
      version: t.version,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /** Overdue first, then by due date (no date last), then priority. */
  const order = (a: TaskRecord, b: TaskRecord) => (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : (a.dueDate ?? "9999") > (b.dueDate ?? "9999") ? 1 : PRIORITY[a.priority] - PRIORITY[b.priority];

  async function load(ctx: FarmContext, id: string, tx?: Tx) {
    const t = await repos.tasks.findById(ctx.farmId, id, tx);
    if (!t) throw new AppError("NOT_FOUND", "Task not found");
    return t;
  }

  async function checkRefs(ctx: FarmContext, r: { flockId?: string; houseId?: string; assigneeUserId?: string }, tx?: Tx) {
    if (r.flockId && !(await repos.flocks.findById(ctx.farmId, r.flockId, tx))) throw new AppError("VALIDATION_FAILED", "Flock not found on this farm", [{ path: "flockId", message: "Not found" }]);
    if (r.houseId && !(await repos.houses.findById(ctx.farmId, r.houseId, tx))) throw new AppError("VALIDATION_FAILED", "House not found on this farm", [{ path: "houseId", message: "Not found" }]);
    if (r.assigneeUserId && !(await repos.memberships.findActive(ctx.farmId, r.assigneeUserId, tx))) throw new AppError("VALIDATION_FAILED", "That person is not on this farm", [{ path: "assigneeUserId", message: "Not a member" }]);
  }

  /** Workers may complete tasks given to them or to nobody; managers may complete any. */
  function assertMayWork(ctx: FarmContext, t: TaskRecord) {
    assertCan(ctx, "task.complete");
    if (t.assigneeUserId && t.assigneeUserId !== ctx.userId && !can(ctx.role, "task.manage")) throw new AppError("FORBIDDEN", "This task is assigned to someone else");
  }

  async function transition(ctx: FarmContext, id: string, action: string, apply: (t: TaskRecord) => Partial<TaskRecord>, check: (t: TaskRecord) => void, expectedVersion?: number) {
    return repos.tx.run(async (tx) => {
      const t = await load(ctx, id, tx);
      check(t);
      if (expectedVersion !== undefined && expectedVersion !== t.version) throw new AppError("VERSION_CONFLICT", "This task was changed by someone else. Reload it first.", { serverVersion: t.version });
      const patch = { ...apply(t), updatedBy: ctx.userId, updatedAt: clock.now() };
      const next = await repos.tasks.update(ctx.farmId, id, patch, { expectedVersion: t.version }, tx);
      await d.audit.record(ctx, { action: `task.${action}`, entity: "task", entityId: id, before: { status: t.status }, after: { status: next!.status } }, tx);
      return next!;
    });
  }

  const one = async (ctx: FarmContext, t: TaskRecord) => (await viewsOf(ctx, [t], await todayOf(ctx)))[0]!;

  return {
    async list(ctx: FarmContext, q: { status: string; assignee: string; due: string; flockId?: string; houseId?: string; limit: number }) {
      assertCan(ctx, "task.read");
      const today = await todayOf(ctx);
      const statuses = q.status === "active" ? ["open", "in_progress"] : q.status === "all" ? undefined : [q.status];
      let rows = await repos.tasks.find(ctx.farmId, { where: { ...(statuses ? { status: statuses } : {}), ...(q.flockId ? { flockId: q.flockId } : {}), ...(q.houseId ? { houseId: q.houseId } : {}) } as never });
      if (q.assignee === "me") rows = rows.filter((t) => !t.assigneeUserId || t.assigneeUserId === ctx.userId);
      else if (q.assignee !== "any") rows = rows.filter((t) => t.assigneeUserId === q.assignee);
      if (q.due === "overdue") rows = rows.filter((t) => t.dueDate && t.dueDate < today);
      else if (q.due === "today") rows = rows.filter((t) => t.dueDate === today);
      else if (q.due === "upcoming") rows = rows.filter((t) => t.dueDate && t.dueDate > today);
      else if (q.due === "none") rows = rows.filter((t) => !t.dueDate);
      rows.sort(order);
      const items = await viewsOf(ctx, rows.slice(0, q.limit), today);
      return { today, items, counts: { total: rows.length, overdue: items.filter((t) => t.overdue).length } };
    },

    /**
     * GET /tasks/today: the day's work for this person. Stored tasks due today or overdue (theirs or unassigned),
     * scheduled work from the calendar (today and overdue), and which active flocks still need today's entry.
     */
    async today(ctx: FarmContext) {
      assertCan(ctx, "task.read");
      const today = await todayOf(ctx);
      const mine = (await repos.tasks.find(ctx.farmId, { where: { status: ["open", "in_progress"] } as never }))
        .filter((t) => (!t.assigneeUserId || t.assigneeUserId === ctx.userId) && (!t.dueDate || t.dueDate <= today))
        .sort(order);
      const scheduled = (await d.calendar.events(ctx, { from: addDays(today, -30), to: today })).events.filter((e) => e.date === today || e.overdue);
      const entries = can(ctx.role, "production.read")
        ? (await d.dailyRecords.sheet(ctx, {})).flocks.map((f) => ({ flockId: f.flockId, flockCode: f.flockCode, houseName: f.houseName ?? null, recorded: !!f.record }))
        : [];
      const tasks = await viewsOf(ctx, mine, today);
      return {
        date: today,
        tasks,
        scheduled,
        dailyEntries: entries,
        counts: { tasks: tasks.length, overdue: tasks.filter((t) => t.overdue).length + scheduled.filter((e) => e.overdue).length, scheduled: scheduled.length, entriesMissing: entries.filter((e) => !e.recorded).length },
      };
    },

    /** Counts for the home screen. */
    async summary(ctx: FarmContext) {
      const today = await todayOf(ctx);
      const active = await repos.tasks.find(ctx.farmId, { where: { status: ["open", "in_progress"] } as never });
      const mine = active.filter((t) => !t.assigneeUserId || t.assigneeUserId === ctx.userId);
      return {
        open: mine.length,
        dueToday: mine.filter((t) => t.dueDate === today).length,
        overdue: mine.filter((t) => t.dueDate && t.dueDate < today).length,
        next: mine.sort(order).slice(0, 3).map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate ?? null, priority: t.priority, overdue: !!t.dueDate && t.dueDate < today })),
      };
    },

    async get(ctx: FarmContext, id: string) {
      assertCan(ctx, "task.read");
      return one(ctx, await load(ctx, id));
    },

    async create(ctx: FarmContext, r: CreateTask) {
      assertCan(ctx, "task.manage");
      return repos.tx.run(async (tx) => {
        await checkRefs(ctx, r, tx);
        const id = r.id ?? newId();
        if (r.id && (await repos.tasks.findById(ctx.farmId, id, tx))) return one(ctx, (await repos.tasks.findById(ctx.farmId, id, tx))!);
        const now = clock.now();
        const rec: TaskRecord = {
          id,
          farmId: ctx.farmId,
          kind: r.kind,
          title: r.title,
          ...(r.description ? { description: r.description } : {}),
          ...(r.dueDate ? { dueDate: r.dueDate } : {}),
          status: "open",
          priority: r.priority,
          ...(r.flockId ? { flockId: r.flockId } : {}),
          ...(r.houseId ? { houseId: r.houseId } : {}),
          ...(r.assigneeUserId ? { assigneeUserId: r.assigneeUserId } : {}),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        await repos.tasks.insert(rec, tx);
        await d.audit.record(ctx, { action: "task.created", entity: "task", entityId: id, after: { title: r.title, dueDate: r.dueDate, assigneeUserId: r.assigneeUserId } }, tx);
        return one(ctx, rec);
      });
    },

    async update(ctx: FarmContext, id: string, r: Omit<CreateTask, "id" | "kind"> & { version: number }) {
      assertCan(ctx, "task.manage");
      await checkRefs(ctx, r);
      const next = await transition(
        ctx,
        id,
        "updated",
        () => ({ title: r.title, description: r.description, dueDate: r.dueDate, priority: r.priority, flockId: r.flockId, houseId: r.houseId, assigneeUserId: r.assigneeUserId }),
        (t) => {
          if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "Reopen the task before editing it");
        },
        r.version,
      );
      return one(ctx, next);
    },

    async start(ctx: FarmContext, id: string) {
      const next = await transition(ctx, id, "started", () => ({ status: "in_progress" }), (t) => {
        assertMayWork(ctx, t);
        if (t.status !== "open") throw new AppError("INVALID_STATE_TRANSITION", `The task is ${t.status.replace("_", " ")}`);
      });
      return one(ctx, next);
    },

    async complete(ctx: FarmContext, id: string, r: { notes?: string; version?: number }) {
      const next = await transition(
        ctx,
        id,
        "completed",
        () => ({ status: "done", completedAt: clock.now(), completedBy: ctx.userId, ...(r.notes ? { resolutionNotes: r.notes } : {}) }),
        (t) => {
          assertMayWork(ctx, t);
          if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `The task is already ${t.status}`);
          // Corrective actions are verified later, so say what was done (the same rule as BioSecure).
          if (t.kind === "corrective_action" && !r.notes) throw new AppError("VALIDATION_FAILED", "Say what was done to fix it", [{ path: "notes", message: "Required for corrective actions" }]);
        },
        r.version,
      );
      return one(ctx, next);
    },

    async cancel(ctx: FarmContext, id: string, reason: string) {
      assertCan(ctx, "task.manage");
      const next = await transition(ctx, id, "cancelled", () => ({ status: "cancelled", resolutionNotes: reason }), (t) => {
        if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `The task is already ${t.status}`);
      });
      return one(ctx, next);
    },

    async reopen(ctx: FarmContext, id: string) {
      assertCan(ctx, "task.manage");
      const next = await transition(ctx, id, "reopened", () => ({ status: "open", completedAt: undefined, completedBy: undefined, verifiedAt: undefined, verifiedBy: undefined }), (t) => {
        if (t.status !== "done" && t.status !== "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "Only finished or cancelled tasks can be reopened");
      });
      return one(ctx, next);
    },
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
