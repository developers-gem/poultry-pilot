import { z } from "zod";
/** Intelligence layer: alert rules, analytics, weather, notifications. */
export declare const RuleKey: z.ZodEnum<["mortality", "egg_production", "feed_consumption", "water_consumption", "weight_variance", "fcr_variance", "inventory", "medicine_expiry", "vaccination_due", "vet_appointment", "hatch_date", "order_delivery", "payment_overdue", "weather_risk"]>;
export declare const AlertRuleUpdateRequest: z.ZodObject<{
    enabled: z.ZodBoolean;
    /** Parameter values from the rule's catalog entry (GET /alert-rules lists them with ranges). */
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    severity: z.ZodOptional<z.ZodEnum<["info", "warning", "critical"]>>;
    channels: z.ZodOptional<z.ZodArray<z.ZodEnum<["in_app", "push", "email"]>, "many">>;
    notifyRoles: z.ZodOptional<z.ZodArray<z.ZodEnum<["owner", "admin", "farm_manager", "supervisor", "worker", "accountant", "vet"]>, "many">>;
    cooldownHours: z.ZodOptional<z.ZodNumber>;
    flockIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    houseIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    enabled: boolean;
    flockIds?: string[] | undefined;
    houseIds?: string[] | undefined;
    parameters?: Record<string, number> | undefined;
    severity?: "info" | "warning" | "critical" | undefined;
    channels?: ("in_app" | "push" | "email")[] | undefined;
    notifyRoles?: ("owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet")[] | undefined;
    cooldownHours?: number | undefined;
}, {
    enabled: boolean;
    flockIds?: string[] | undefined;
    houseIds?: string[] | undefined;
    parameters?: Record<string, number> | undefined;
    severity?: "info" | "warning" | "critical" | undefined;
    channels?: ("in_app" | "push" | "email")[] | undefined;
    notifyRoles?: ("owner" | "admin" | "farm_manager" | "supervisor" | "worker" | "accountant" | "vet")[] | undefined;
    cooldownHours?: number | undefined;
}>;
export declare const AlertsQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["open", "acknowledged", "resolved"]>>;
    ruleType: z.ZodOptional<z.ZodEnum<["mortality_spike", "egg_drop", "feed_change", "missing_record", "heat_stress", "low_feed_stock", "low_inventory", "vaccination_due", "withdrawal_active", "expiry_soon", "expired_stock", "water_abnormal", "health_follow_up", "biosecurity_breach", "wild_bird_contact", "checklist_failed", "brooding_conditions", "hatch_due", "weight_variance", "fcr_variance", "vet_appointment", "order_delivery", "payment_overdue", "weather_risk"]>>;
    ruleKey: z.ZodOptional<z.ZodEnum<["mortality", "egg_production", "feed_consumption", "water_consumption", "weight_variance", "fcr_variance", "inventory", "medicine_expiry", "vaccination_due", "vet_appointment", "hatch_date", "order_delivery", "payment_overdue", "weather_risk"]>>;
    severity: z.ZodOptional<z.ZodEnum<["info", "warning", "critical"]>>;
    flockId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "open" | "acknowledged" | "resolved" | undefined;
    flockId?: string | undefined;
    severity?: "info" | "warning" | "critical" | undefined;
    ruleType?: "heat_stress" | "vet_appointment" | "mortality_spike" | "egg_drop" | "feed_change" | "missing_record" | "low_feed_stock" | "low_inventory" | "vaccination_due" | "withdrawal_active" | "expiry_soon" | "expired_stock" | "water_abnormal" | "health_follow_up" | "biosecurity_breach" | "wild_bird_contact" | "checklist_failed" | "brooding_conditions" | "hatch_due" | "weight_variance" | "fcr_variance" | "order_delivery" | "payment_overdue" | "weather_risk" | undefined;
    ruleKey?: "mortality" | "vet_appointment" | "vaccination_due" | "weight_variance" | "fcr_variance" | "order_delivery" | "payment_overdue" | "weather_risk" | "egg_production" | "feed_consumption" | "water_consumption" | "inventory" | "medicine_expiry" | "hatch_date" | undefined;
}, {
    status?: "open" | "acknowledged" | "resolved" | undefined;
    limit?: number | undefined;
    flockId?: string | undefined;
    severity?: "info" | "warning" | "critical" | undefined;
    ruleType?: "heat_stress" | "vet_appointment" | "mortality_spike" | "egg_drop" | "feed_change" | "missing_record" | "low_feed_stock" | "low_inventory" | "vaccination_due" | "withdrawal_active" | "expiry_soon" | "expired_stock" | "water_abnormal" | "health_follow_up" | "biosecurity_breach" | "wild_bird_contact" | "checklist_failed" | "brooding_conditions" | "hatch_due" | "weight_variance" | "fcr_variance" | "order_delivery" | "payment_overdue" | "weather_risk" | undefined;
    ruleKey?: "mortality" | "vet_appointment" | "vaccination_due" | "weight_variance" | "fcr_variance" | "order_delivery" | "payment_overdue" | "weather_risk" | "egg_production" | "feed_consumption" | "water_consumption" | "inventory" | "medicine_expiry" | "hatch_date" | undefined;
}>;
export declare const AnalyticsQuery: z.ZodEffects<z.ZodObject<{
    from: z.ZodEffects<z.ZodString, string, string>;
    to: z.ZodEffects<z.ZodString, string, string>;
    flockId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    flockId?: string | undefined;
}, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    flockId?: string | undefined;
}>, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    flockId?: string | undefined;
}, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    flockId?: string | undefined;
}>;
export declare const WeatherQuery: z.ZodObject<{
    historyDays: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    historyDays?: number | undefined;
}, {
    historyDays?: number | undefined;
}>;
export declare const NotificationListQuery: z.ZodObject<{
    unreadOnly: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    unreadOnly?: boolean | undefined;
}, {
    limit?: number | undefined;
    unreadOnly?: "true" | "false" | undefined;
}>;
export declare const MarkReadRequest: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strict", z.ZodTypeAny, {
    ids: string[];
}, {
    ids: string[];
}>;
export declare const PushDeviceRequest: z.ZodObject<{
    platform: z.ZodEnum<["ios", "android", "web"]>;
    token: z.ZodString;
    deviceName: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    platform: "web" | "android" | "ios";
    token: string;
    deviceName?: string | undefined;
}, {
    platform: "web" | "android" | "ios";
    token: string;
    deviceName?: string | undefined;
}>;
/** Per category: push and email on or off (in-app is always kept). Categories left out keep their setting. */
export declare const NotificationCategoryPrefs: z.ZodRecord<z.ZodEnum<["vaccination_due", "task_due", "inventory_low", "mortality", "feed", "water", "egg_production", "weight_variance", "hatch_date", "order_update", "payment_update", "weather_risk"]>, z.ZodObject<{
    push: z.ZodOptional<z.ZodBoolean>;
    email: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    push?: boolean | undefined;
    email?: boolean | undefined;
}, {
    push?: boolean | undefined;
    email?: boolean | undefined;
}>>;
export declare const NotificationPreferencesRequest: z.ZodObject<{
    pushEnabled: z.ZodBoolean;
    emailEnabled: z.ZodBoolean;
    pushMinSeverity: z.ZodEnum<["info", "warning", "critical"]>;
    emailMinSeverity: z.ZodEnum<["info", "warning", "critical"]>;
    mutedRuleKeys: z.ZodOptional<z.ZodArray<z.ZodEnum<["mortality", "egg_production", "feed_consumption", "water_consumption", "weight_variance", "fcr_variance", "inventory", "medicine_expiry", "vaccination_due", "vet_appointment", "hatch_date", "order_delivery", "payment_overdue", "weather_risk"]>, "many">>;
    categories: z.ZodOptional<z.ZodRecord<z.ZodEnum<["vaccination_due", "task_due", "inventory_low", "mortality", "feed", "water", "egg_production", "weight_variance", "hatch_date", "order_update", "payment_update", "weather_risk"]>, z.ZodObject<{
        push: z.ZodOptional<z.ZodBoolean>;
        email: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        push?: boolean | undefined;
        email?: boolean | undefined;
    }, {
        push?: boolean | undefined;
        email?: boolean | undefined;
    }>>>;
    /** Push waits until the end of quiet hours (critical alerts still go through). null turns quiet hours off. */
    quietHours: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
        timezone: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        timezone: string;
        start: string;
        end: string;
    }, {
        timezone: string;
        start: string;
        end: string;
    }>>>;
}, "strict", z.ZodTypeAny, {
    pushEnabled: boolean;
    emailEnabled: boolean;
    pushMinSeverity: "info" | "warning" | "critical";
    emailMinSeverity: "info" | "warning" | "critical";
    mutedRuleKeys?: ("mortality" | "vet_appointment" | "vaccination_due" | "weight_variance" | "fcr_variance" | "order_delivery" | "payment_overdue" | "weather_risk" | "egg_production" | "feed_consumption" | "water_consumption" | "inventory" | "medicine_expiry" | "hatch_date")[] | undefined;
    categories?: Partial<Record<"feed" | "water" | "mortality" | "vaccination_due" | "weight_variance" | "weather_risk" | "egg_production" | "hatch_date" | "task_due" | "inventory_low" | "order_update" | "payment_update", {
        push?: boolean | undefined;
        email?: boolean | undefined;
    }>> | undefined;
    quietHours?: {
        timezone: string;
        start: string;
        end: string;
    } | null | undefined;
}, {
    pushEnabled: boolean;
    emailEnabled: boolean;
    pushMinSeverity: "info" | "warning" | "critical";
    emailMinSeverity: "info" | "warning" | "critical";
    mutedRuleKeys?: ("mortality" | "vet_appointment" | "vaccination_due" | "weight_variance" | "fcr_variance" | "order_delivery" | "payment_overdue" | "weather_risk" | "egg_production" | "feed_consumption" | "water_consumption" | "inventory" | "medicine_expiry" | "hatch_date")[] | undefined;
    categories?: Partial<Record<"feed" | "water" | "mortality" | "vaccination_due" | "weight_variance" | "weather_risk" | "egg_production" | "hatch_date" | "task_due" | "inventory_low" | "order_update" | "payment_update", {
        push?: boolean | undefined;
        email?: boolean | undefined;
    }>> | undefined;
    quietHours?: {
        timezone: string;
        start: string;
        end: string;
    } | null | undefined;
}>;
export declare const AppointmentRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodString;
    vetName: z.ZodOptional<z.ZodString>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    title: string;
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    vetName?: string | undefined;
}, {
    date: string;
    title: string;
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    vetName?: string | undefined;
}>;
export declare const AppointmentListQuery: z.ZodObject<{
    includeDone: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
}, "strip", z.ZodTypeAny, {
    includeDone?: boolean | undefined;
}, {
    includeDone?: "true" | "false" | undefined;
}>;
export declare const CompleteAppointmentRequest: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    notes?: string | undefined;
}, {
    notes?: string | undefined;
}>;
