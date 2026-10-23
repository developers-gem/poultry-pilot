import { z } from "zod";
import { TaskPriority } from "../enums.js";
import { Id, LocalDate, NonEmptyText, OptionalText } from "../primitives.js";
/** POST /farms/:farmId/tasks. People create general tasks and follow-ups; corrective actions come from biosecurity. */
export const CreateTaskRequest = z
    .object({
    id: Id.optional(),
    title: NonEmptyText(200),
    description: OptionalText(2000),
    kind: z.enum(["general", "follow_up"]).default("general"),
    dueDate: LocalDate.optional(),
    priority: TaskPriority.default("normal"),
    flockId: Id.optional(),
    houseId: Id.optional(),
    assigneeUserId: Id.optional(),
})
    .strict();
/** PUT /farms/:farmId/tasks/:id (full replace of the editable fields). */
export const UpdateTaskRequest = CreateTaskRequest.omit({ id: true, kind: true }).extend({ version: z.number().int().nonnegative() }).strict();
export const TaskListQuery = z.object({
    /** "active" = open or in progress. */
    status: z.enum(["active", "open", "in_progress", "done", "cancelled", "all"]).default("active"),
    /** "me" = assigned to the person asking, or to nobody. */
    assignee: z.union([z.literal("me"), z.literal("any"), Id]).default("any"),
    due: z.enum(["overdue", "today", "upcoming", "none", "any"]).default("any"),
    flockId: Id.optional(),
    houseId: Id.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
});
export const CompleteTaskRequest = z.object({ notes: OptionalText(2000), version: z.number().int().nonnegative().optional() }).strict();
export const CancelTaskRequest = z.object({ reason: NonEmptyText(500) }).strict();
//# sourceMappingURL=task.js.map