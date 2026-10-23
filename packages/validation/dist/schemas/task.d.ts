import { z } from "zod";
/** POST /farms/:farmId/tasks. People create general tasks and follow-ups; corrective actions come from biosecurity. */
export declare const CreateTaskRequest: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    kind: z.ZodDefault<z.ZodEnum<["general", "follow_up"]>>;
    dueDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high", "urgent"]>>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    assigneeUserId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    kind: "general" | "follow_up";
    title: string;
    priority: "low" | "normal" | "high" | "urgent";
    id?: string | undefined;
    description?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    dueDate?: string | undefined;
    assigneeUserId?: string | undefined;
}, {
    title: string;
    id?: string | undefined;
    description?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    kind?: "general" | "follow_up" | undefined;
    dueDate?: string | undefined;
    assigneeUserId?: string | undefined;
    priority?: "low" | "normal" | "high" | "urgent" | undefined;
}>;
/** PUT /farms/:farmId/tasks/:id (full replace of the editable fields). */
export declare const UpdateTaskRequest: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    kind: z.ZodDefault<z.ZodEnum<["general", "follow_up"]>>;
    dueDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high", "urgent"]>>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    assigneeUserId: z.ZodOptional<z.ZodString>;
}, "id" | "kind"> & {
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    version: number;
    title: string;
    priority: "low" | "normal" | "high" | "urgent";
    description?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    dueDate?: string | undefined;
    assigneeUserId?: string | undefined;
}, {
    version: number;
    title: string;
    description?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    dueDate?: string | undefined;
    assigneeUserId?: string | undefined;
    priority?: "low" | "normal" | "high" | "urgent" | undefined;
}>;
export declare const TaskListQuery: z.ZodObject<{
    /** "active" = open or in progress. */
    status: z.ZodDefault<z.ZodEnum<["active", "open", "in_progress", "done", "cancelled", "all"]>>;
    /** "me" = assigned to the person asking, or to nobody. */
    assignee: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"me">, z.ZodLiteral<"any">, z.ZodString]>>;
    due: z.ZodDefault<z.ZodEnum<["overdue", "today", "upcoming", "none", "any"]>>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "cancelled" | "done" | "open" | "in_progress" | "all";
    limit: number;
    due: "none" | "today" | "overdue" | "any" | "upcoming";
    assignee: string;
    houseId?: string | undefined;
    flockId?: string | undefined;
}, {
    status?: "active" | "cancelled" | "done" | "open" | "in_progress" | "all" | undefined;
    limit?: number | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    due?: "none" | "today" | "overdue" | "any" | "upcoming" | undefined;
    assignee?: string | undefined;
}>;
export declare const CompleteTaskRequest: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    version?: number | undefined;
    notes?: string | undefined;
}, {
    version?: number | undefined;
    notes?: string | undefined;
}>;
export declare const CancelTaskRequest: z.ZodObject<{
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
