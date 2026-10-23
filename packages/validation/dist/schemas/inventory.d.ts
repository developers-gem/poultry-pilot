import { z } from "zod";
export declare const CreateInventoryItemRequest: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodOptional<z.ZodString>;
    defaultSupplier: z.ZodOptional<z.ZodString>;
    defaultStorageLocation: z.ZodOptional<z.ZodString>;
    /** Low-stock alert at or below this quantity (in date). */
    reorderLevel: z.ZodOptional<z.ZodNumber>;
    /** Feed only: low-stock alert when fewer days of feed remain. */
    reorderDays: z.ZodOptional<z.ZodNumber>;
    /** Expiry alert this many days before a lot expires (default 30). */
    expiryWarningDays: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    feed: z.ZodOptional<z.ZodObject<{
        stage: z.ZodEnum<["pre_starter", "starter", "grower", "finisher", "pre_layer", "layer", "breeder", "other"]>;
        form: z.ZodOptional<z.ZodEnum<["mash", "crumble", "pellet", "other"]>>;
        bagSizeKg: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    }, {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    }>>;
    id: z.ZodOptional<z.ZodString>;
    category: z.ZodEnum<["feed", "medicine", "vaccine", "disinfectant", "litter", "packaging", "equipment", "spare_part", "cleaning", "other"]>;
    unit: z.ZodEnum<["kg", "g", "l", "ml", "dose", "piece", "tray", "bag", "box", "bottle"]>;
    medicineId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    unit: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle";
    name: string;
    category: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part";
    feed?: {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    medicineId?: string | undefined;
    sku?: string | undefined;
    defaultSupplier?: string | undefined;
    defaultStorageLocation?: string | undefined;
    reorderLevel?: number | undefined;
    reorderDays?: number | undefined;
    expiryWarningDays?: number | undefined;
}, {
    unit: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle";
    name: string;
    category: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part";
    feed?: {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    medicineId?: string | undefined;
    sku?: string | undefined;
    defaultSupplier?: string | undefined;
    defaultStorageLocation?: string | undefined;
    reorderLevel?: number | undefined;
    reorderDays?: number | undefined;
    expiryWarningDays?: number | undefined;
}>, {
    unit: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle";
    name: string;
    category: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part";
    feed?: {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    medicineId?: string | undefined;
    sku?: string | undefined;
    defaultSupplier?: string | undefined;
    defaultStorageLocation?: string | undefined;
    reorderLevel?: number | undefined;
    reorderDays?: number | undefined;
    expiryWarningDays?: number | undefined;
}, {
    unit: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle";
    name: string;
    category: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part";
    feed?: {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    medicineId?: string | undefined;
    sku?: string | undefined;
    defaultSupplier?: string | undefined;
    defaultStorageLocation?: string | undefined;
    reorderLevel?: number | undefined;
    reorderDays?: number | undefined;
    expiryWarningDays?: number | undefined;
}>;
export declare const UpdateInventoryItemRequest: z.ZodObject<{
    expiryWarningDays: z.ZodNumber;
    active: z.ZodBoolean;
    version: z.ZodNumber;
    name: z.ZodString;
    sku: z.ZodOptional<z.ZodString>;
    defaultSupplier: z.ZodOptional<z.ZodString>;
    defaultStorageLocation: z.ZodOptional<z.ZodString>;
    /** Low-stock alert at or below this quantity (in date). */
    reorderLevel: z.ZodOptional<z.ZodNumber>;
    /** Feed only: low-stock alert when fewer days of feed remain. */
    reorderDays: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    feed: z.ZodOptional<z.ZodObject<{
        stage: z.ZodEnum<["pre_starter", "starter", "grower", "finisher", "pre_layer", "layer", "breeder", "other"]>;
        form: z.ZodOptional<z.ZodEnum<["mash", "crumble", "pellet", "other"]>>;
        bagSizeKg: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    }, {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    active: boolean;
    version: number;
    name: string;
    expiryWarningDays: number;
    feed?: {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    } | undefined;
    notes?: string | undefined;
    sku?: string | undefined;
    defaultSupplier?: string | undefined;
    defaultStorageLocation?: string | undefined;
    reorderLevel?: number | undefined;
    reorderDays?: number | undefined;
}, {
    active: boolean;
    version: number;
    name: string;
    expiryWarningDays: number;
    feed?: {
        stage: "layer" | "breeder" | "other" | "pre_starter" | "starter" | "grower" | "finisher" | "pre_layer";
        form?: "other" | "mash" | "crumble" | "pellet" | undefined;
        bagSizeKg?: number | undefined;
    } | undefined;
    notes?: string | undefined;
    sku?: string | undefined;
    defaultSupplier?: string | undefined;
    defaultStorageLocation?: string | undefined;
    reorderLevel?: number | undefined;
    reorderDays?: number | undefined;
}>;
export declare const InventoryListQuery: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["feed", "medicine", "vaccine", "disinfectant", "litter", "packaging", "equipment", "spare_part", "cleaning", "other"]>>;
    lowStock: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    includeInactive: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
}, "strip", z.ZodTypeAny, {
    category?: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part" | undefined;
    lowStock?: boolean | undefined;
    includeInactive?: boolean | undefined;
}, {
    category?: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part" | undefined;
    lowStock?: "true" | "false" | undefined;
    includeInactive?: "true" | "false" | undefined;
}>;
/** A purchase: one lot with supplier, batch number, expiry, storage location and unit cost. */
export declare const PurchaseRequest: z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    quantity: z.ZodNumber;
    unitCost: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    /** A supplier from the farm's list; the purchase becomes a bill owed to them. */
    supplierId: z.ZodOptional<z.ZodString>;
    supplier: z.ZodOptional<z.ZodString>;
    batchNumber: z.ZodOptional<z.ZodString>;
    invoiceNumber: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    storageLocation: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    quantity: number;
    unitCost: {
        currency: string;
        amountMinor: number;
    };
    supplier?: string | undefined;
    supplierId?: string | undefined;
    batchNumber?: string | undefined;
    invoiceNumber?: string | undefined;
    expiryDate?: string | undefined;
    storageLocation?: string | undefined;
}, {
    date: string;
    quantity: number;
    unitCost: {
        currency: string;
        amountMinor: number;
    };
    supplier?: string | undefined;
    supplierId?: string | undefined;
    batchNumber?: string | undefined;
    invoiceNumber?: string | undefined;
    expiryDate?: string | undefined;
    storageLocation?: string | undefined;
}>, {
    date: string;
    quantity: number;
    unitCost: {
        currency: string;
        amountMinor: number;
    };
    supplier?: string | undefined;
    supplierId?: string | undefined;
    batchNumber?: string | undefined;
    invoiceNumber?: string | undefined;
    expiryDate?: string | undefined;
    storageLocation?: string | undefined;
}, {
    date: string;
    quantity: number;
    unitCost: {
        currency: string;
        amountMinor: number;
    };
    supplier?: string | undefined;
    supplierId?: string | undefined;
    batchNumber?: string | undefined;
    invoiceNumber?: string | undefined;
    expiryDate?: string | undefined;
    storageLocation?: string | undefined;
}>;
export declare const IssueRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    quantity: z.ZodNumber;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    quantity: number;
    houseId?: string | undefined;
    reason?: string | undefined;
    flockId?: string | undefined;
}, {
    date: string;
    quantity: number;
    houseId?: string | undefined;
    reason?: string | undefined;
    flockId?: string | undefined;
}>;
export declare const WastageRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    quantity: z.ZodNumber;
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    date: string;
    reason: string;
    quantity: number;
}, {
    date: string;
    reason: string;
    quantity: number;
}>;
export declare const StockCountRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    countedQuantity: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    countedQuantity: number;
    reason?: string | undefined;
}, {
    date: string;
    countedQuantity: number;
    reason?: string | undefined;
}>;
export declare const LotsQuery: z.ZodObject<{
    expiring: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    category: z.ZodOptional<z.ZodEnum<["feed", "medicine", "vaccine", "disinfectant", "litter", "packaging", "equipment", "spare_part", "cleaning", "other"]>>;
}, "strip", z.ZodTypeAny, {
    category?: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part" | undefined;
    expiring?: boolean | undefined;
}, {
    category?: "other" | "feed" | "equipment" | "cleaning" | "medicine" | "vaccine" | "disinfectant" | "litter" | "packaging" | "spare_part" | undefined;
    expiring?: "true" | "false" | undefined;
}>;
export declare const TransactionsQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    from?: string | undefined;
    to?: string | undefined;
}, {
    limit?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const EggMovementRequest: z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    type: z.ZodEnum<["used", "spoiled", "adjustment"]>;
    /** Positive for used/spoiled; signed for an adjustment (count correction). */
    quantity: z.ZodEffects<z.ZodNumber, number, number>;
    grade: z.ZodOptional<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "adjustment" | "used" | "spoiled";
    date: string;
    quantity: number;
    reason?: string | undefined;
    grade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
}, {
    type: "adjustment" | "used" | "spoiled";
    date: string;
    quantity: number;
    reason?: string | undefined;
    grade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
}>, {
    type: "adjustment" | "used" | "spoiled";
    date: string;
    quantity: number;
    reason?: string | undefined;
    grade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
}, {
    type: "adjustment" | "used" | "spoiled";
    date: string;
    quantity: number;
    reason?: string | undefined;
    grade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
}>;
export declare const ReceiveChicksRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    quantity: z.ZodNumber;
    species: z.ZodDefault<z.ZodEnum<["chicken", "duck", "turkey", "quail", "guinea_fowl"]>>;
    breed: z.ZodOptional<z.ZodString>;
    supplier: z.ZodOptional<z.ZodString>;
    hatchDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    unitCost: z.ZodOptional<z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    species: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl";
    quantity: number;
    supplier?: string | undefined;
    notes?: string | undefined;
    breed?: string | undefined;
    hatchDate?: string | undefined;
    unitCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    date: string;
    quantity: number;
    supplier?: string | undefined;
    notes?: string | undefined;
    species?: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl" | undefined;
    breed?: string | undefined;
    hatchDate?: string | undefined;
    unitCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>;
export declare const ChickLotsQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["available", "depleted", "closed"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "closed" | "available" | "depleted" | undefined;
}, {
    status?: "closed" | "available" | "depleted" | undefined;
}>;
export declare const FeedConsumptionRequest: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    quantityKg: z.ZodNumber;
    kind: z.ZodDefault<z.ZodEnum<["consumption", "wastage"]>>;
    /** Required for consumption; optional for wastage (omit for wastage in the store). */
    flockId: z.ZodOptional<z.ZodString>;
    feedItemId: z.ZodOptional<z.ZodString>;
    unitCostPerKg: z.ZodOptional<z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    quantityKg: number;
    kind: "wastage" | "consumption";
    reason?: string | undefined;
    flockId?: string | undefined;
    feedItemId?: string | undefined;
    unitCostPerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    date: string;
    quantityKg: number;
    reason?: string | undefined;
    flockId?: string | undefined;
    kind?: "wastage" | "consumption" | undefined;
    feedItemId?: string | undefined;
    unitCostPerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>, {
    date: string;
    quantityKg: number;
    kind: "wastage" | "consumption";
    reason?: string | undefined;
    flockId?: string | undefined;
    feedItemId?: string | undefined;
    unitCostPerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    date: string;
    quantityKg: number;
    reason?: string | undefined;
    flockId?: string | undefined;
    kind?: "wastage" | "consumption" | undefined;
    feedItemId?: string | undefined;
    unitCostPerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>, {
    date: string;
    quantityKg: number;
    kind: "wastage" | "consumption";
    reason?: string | undefined;
    flockId?: string | undefined;
    feedItemId?: string | undefined;
    unitCostPerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    date: string;
    quantityKg: number;
    reason?: string | undefined;
    flockId?: string | undefined;
    kind?: "wastage" | "consumption" | undefined;
    feedItemId?: string | undefined;
    unitCostPerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>;
export declare const FeedListQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    flockId: z.ZodOptional<z.ZodString>;
    feedItemId: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodEnum<["consumption", "wastage"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    kind?: "wastage" | "consumption" | undefined;
    feedItemId?: string | undefined;
}, {
    limit?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    kind?: "wastage" | "consumption" | undefined;
    feedItemId?: string | undefined;
}>;
export declare const FeedAnalyticsQuery: z.ZodObject<{
    flockId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "closed", "cancelled"]>>;
    asOf: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    status?: "planned" | "active" | "closed" | "cancelled" | undefined;
    asOf?: string | undefined;
    flockId?: string | undefined;
}, {
    status?: "planned" | "active" | "closed" | "cancelled" | undefined;
    asOf?: string | undefined;
    flockId?: string | undefined;
}>;
export declare const WaterListQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    flockId: z.ZodOptional<z.ZodString>;
    abnormal: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    abnormal?: boolean | undefined;
}, {
    limit?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    abnormal?: "true" | "false" | undefined;
}>;
