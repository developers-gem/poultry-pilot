import { z } from "zod";
/** Every section of a daily record. Omitted optional sections are empty; arrays default to empty. */
export declare const DailyRecordFields: z.ZodObject<{
    /** Birds counted in the house today (a headcount). Compared with the ledger; differences are shown, not applied. */
    observedBirdCount: z.ZodOptional<z.ZodNumber>;
    mortality: z.ZodDefault<z.ZodArray<z.ZodObject<{
        cause: z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>;
        count: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }>, "many">>;
    culls: z.ZodDefault<z.ZodNumber>;
    feed: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        quantityKg: z.ZodNumber;
        /** consumption (eaten, counts in FCR) or wastage (spilled or spoiled in the house). */
        kind: z.ZodDefault<z.ZodEnum<["consumption", "wastage"]>>;
        /** A feed item from inventory: stock moves automatically and the feed is costed at its lots' prices. */
        feedItemId: z.ZodOptional<z.ZodString>;
        /** For feed not tracked in inventory: the price per kg. Not allowed together with feedItemId. */
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
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, "many">>;
    waterLitres: z.ZodOptional<z.ZodNumber>;
    /** Source, quality and treatment of the day's water. Needs waterLitres. */
    waterQuality: z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodEnum<["borehole", "municipal", "well", "rainwater", "river", "tanker", "other"]>>;
        ph: z.ZodOptional<z.ZodNumber>;
        tdsPpm: z.ZodOptional<z.ZodNumber>;
        chlorinePpm: z.ZodOptional<z.ZodNumber>;
        qualityRating: z.ZodOptional<z.ZodEnum<["good", "fair", "poor"]>>;
        treatment: z.ZodOptional<z.ZodEnum<["none", "chlorination", "acidification", "filtration", "uv", "medication", "vitamins", "other"]>>;
        treatmentNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }>>;
    temperatureMinC: z.ZodOptional<z.ZodNumber>;
    temperatureMaxC: z.ZodOptional<z.ZodNumber>;
    humidityPercent: z.ZodOptional<z.ZodNumber>;
    lightingHours: z.ZodOptional<z.ZodNumber>;
    eggs: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /** Every egg gathered, including broken ones. */
        collected: z.ZodNumber;
        /** Broken eggs (part of collected). Removed from stock. */
        broken: z.ZodDefault<z.ZodNumber>;
        /** Unbroken eggs by grade; the sum cannot exceed collected − broken. Ungraded eggs are the remainder. */
        byGrade: z.ZodOptional<z.ZodRecord<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>, z.ZodNumber>>;
        averageEggWeightG: z.ZodOptional<z.ZodNumber>;
        qualityNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>>;
    averageWeight: z.ZodOptional<z.ZodObject<{
        averageWeightG: z.ZodNumber;
        sampleSize: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }>>;
    healthObservations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** What was seen, in the farmer's words. PoultryPilot records observations; it does not diagnose. */
        signs: z.ZodString;
        affectedBirds: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        signs: string;
        affectedBirds?: number | undefined;
    }, {
        signs: string;
        affectedBirds?: number | undefined;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodDefault<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        caption?: string | undefined;
    }, {
        assetId: string;
        caption?: string | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>;
/** POST /farms/:farmId/daily-records. `id` may be generated on the device (offline). */
export declare const CreateDailyRecordRequest: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    /** Birds counted in the house today (a headcount). Compared with the ledger; differences are shown, not applied. */
    observedBirdCount: z.ZodOptional<z.ZodNumber>;
    mortality: z.ZodDefault<z.ZodArray<z.ZodObject<{
        cause: z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>;
        count: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }>, "many">>;
    culls: z.ZodDefault<z.ZodNumber>;
    feed: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        quantityKg: z.ZodNumber;
        /** consumption (eaten, counts in FCR) or wastage (spilled or spoiled in the house). */
        kind: z.ZodDefault<z.ZodEnum<["consumption", "wastage"]>>;
        /** A feed item from inventory: stock moves automatically and the feed is costed at its lots' prices. */
        feedItemId: z.ZodOptional<z.ZodString>;
        /** For feed not tracked in inventory: the price per kg. Not allowed together with feedItemId. */
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
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, "many">>;
    waterLitres: z.ZodOptional<z.ZodNumber>;
    /** Source, quality and treatment of the day's water. Needs waterLitres. */
    waterQuality: z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodEnum<["borehole", "municipal", "well", "rainwater", "river", "tanker", "other"]>>;
        ph: z.ZodOptional<z.ZodNumber>;
        tdsPpm: z.ZodOptional<z.ZodNumber>;
        chlorinePpm: z.ZodOptional<z.ZodNumber>;
        qualityRating: z.ZodOptional<z.ZodEnum<["good", "fair", "poor"]>>;
        treatment: z.ZodOptional<z.ZodEnum<["none", "chlorination", "acidification", "filtration", "uv", "medication", "vitamins", "other"]>>;
        treatmentNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }>>;
    temperatureMinC: z.ZodOptional<z.ZodNumber>;
    temperatureMaxC: z.ZodOptional<z.ZodNumber>;
    humidityPercent: z.ZodOptional<z.ZodNumber>;
    lightingHours: z.ZodOptional<z.ZodNumber>;
    eggs: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /** Every egg gathered, including broken ones. */
        collected: z.ZodNumber;
        /** Broken eggs (part of collected). Removed from stock. */
        broken: z.ZodDefault<z.ZodNumber>;
        /** Unbroken eggs by grade; the sum cannot exceed collected − broken. Ungraded eggs are the remainder. */
        byGrade: z.ZodOptional<z.ZodRecord<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>, z.ZodNumber>>;
        averageEggWeightG: z.ZodOptional<z.ZodNumber>;
        qualityNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>>;
    averageWeight: z.ZodOptional<z.ZodObject<{
        averageWeightG: z.ZodNumber;
        sampleSize: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }>>;
    healthObservations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** What was seen, in the farmer's words. PoultryPilot records observations; it does not diagnose. */
        signs: z.ZodString;
        affectedBirds: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        signs: string;
        affectedBirds?: number | undefined;
    }, {
        signs: string;
        affectedBirds?: number | undefined;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodDefault<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        caption?: string | undefined;
    }, {
        assetId: string;
        caption?: string | undefined;
    }>, "many">>;
} & {
    id: z.ZodOptional<z.ZodString>;
    flockId: z.ZodString;
    date: z.ZodEffects<z.ZodString, string, string>;
}, "strict", z.ZodTypeAny, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    date: string;
    flockId: string;
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    date: string;
    flockId: string;
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    date: string;
    flockId: string;
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    date: string;
    flockId: string;
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    date: string;
    flockId: string;
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    date: string;
    flockId: string;
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>;
/** PUT /daily-records/:id — replaces every section. `version` must match (optimistic concurrency). */
export declare const UpdateDailyRecordRequest: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    /** Birds counted in the house today (a headcount). Compared with the ledger; differences are shown, not applied. */
    observedBirdCount: z.ZodOptional<z.ZodNumber>;
    mortality: z.ZodDefault<z.ZodArray<z.ZodObject<{
        cause: z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>;
        count: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }>, "many">>;
    culls: z.ZodDefault<z.ZodNumber>;
    feed: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        quantityKg: z.ZodNumber;
        /** consumption (eaten, counts in FCR) or wastage (spilled or spoiled in the house). */
        kind: z.ZodDefault<z.ZodEnum<["consumption", "wastage"]>>;
        /** A feed item from inventory: stock moves automatically and the feed is costed at its lots' prices. */
        feedItemId: z.ZodOptional<z.ZodString>;
        /** For feed not tracked in inventory: the price per kg. Not allowed together with feedItemId. */
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
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, "many">>;
    waterLitres: z.ZodOptional<z.ZodNumber>;
    /** Source, quality and treatment of the day's water. Needs waterLitres. */
    waterQuality: z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodEnum<["borehole", "municipal", "well", "rainwater", "river", "tanker", "other"]>>;
        ph: z.ZodOptional<z.ZodNumber>;
        tdsPpm: z.ZodOptional<z.ZodNumber>;
        chlorinePpm: z.ZodOptional<z.ZodNumber>;
        qualityRating: z.ZodOptional<z.ZodEnum<["good", "fair", "poor"]>>;
        treatment: z.ZodOptional<z.ZodEnum<["none", "chlorination", "acidification", "filtration", "uv", "medication", "vitamins", "other"]>>;
        treatmentNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }>>;
    temperatureMinC: z.ZodOptional<z.ZodNumber>;
    temperatureMaxC: z.ZodOptional<z.ZodNumber>;
    humidityPercent: z.ZodOptional<z.ZodNumber>;
    lightingHours: z.ZodOptional<z.ZodNumber>;
    eggs: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /** Every egg gathered, including broken ones. */
        collected: z.ZodNumber;
        /** Broken eggs (part of collected). Removed from stock. */
        broken: z.ZodDefault<z.ZodNumber>;
        /** Unbroken eggs by grade; the sum cannot exceed collected − broken. Ungraded eggs are the remainder. */
        byGrade: z.ZodOptional<z.ZodRecord<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>, z.ZodNumber>>;
        averageEggWeightG: z.ZodOptional<z.ZodNumber>;
        qualityNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>>;
    averageWeight: z.ZodOptional<z.ZodObject<{
        averageWeightG: z.ZodNumber;
        sampleSize: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }>>;
    healthObservations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** What was seen, in the farmer's words. PoultryPilot records observations; it does not diagnose. */
        signs: z.ZodString;
        affectedBirds: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        signs: string;
        affectedBirds?: number | undefined;
    }, {
        signs: string;
        affectedBirds?: number | undefined;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodDefault<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        caption?: string | undefined;
    }, {
        assetId: string;
        caption?: string | undefined;
    }>, "many">>;
} & {
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    version: number;
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    version: number;
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    version: number;
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    version: number;
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    version: number;
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    version: number;
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>;
/** PUT /farms/:farmId/flocks/:flockId/daily-records/:date — create or replace by flock and date (offline-friendly). */
/** PATCH by flock and date: only the sections given are changed. `version` is required when a record exists. */
export declare const PatchDailyRecordRequest: z.ZodObject<{
    observedBirdCount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    mortality: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        cause: z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>;
        count: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }>, "many">>>;
    culls: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    feed: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        quantityKg: z.ZodNumber;
        /** consumption (eaten, counts in FCR) or wastage (spilled or spoiled in the house). */
        kind: z.ZodDefault<z.ZodEnum<["consumption", "wastage"]>>;
        /** A feed item from inventory: stock moves automatically and the feed is costed at its lots' prices. */
        feedItemId: z.ZodOptional<z.ZodString>;
        /** For feed not tracked in inventory: the price per kg. Not allowed together with feedItemId. */
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
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, "many">>>;
    waterLitres: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    waterQuality: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodEnum<["borehole", "municipal", "well", "rainwater", "river", "tanker", "other"]>>;
        ph: z.ZodOptional<z.ZodNumber>;
        tdsPpm: z.ZodOptional<z.ZodNumber>;
        chlorinePpm: z.ZodOptional<z.ZodNumber>;
        qualityRating: z.ZodOptional<z.ZodEnum<["good", "fair", "poor"]>>;
        treatment: z.ZodOptional<z.ZodEnum<["none", "chlorination", "acidification", "filtration", "uv", "medication", "vitamins", "other"]>>;
        treatmentNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }>>>;
    temperatureMinC: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    temperatureMaxC: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    humidityPercent: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    lightingHours: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    eggs: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /** Every egg gathered, including broken ones. */
        collected: z.ZodNumber;
        /** Broken eggs (part of collected). Removed from stock. */
        broken: z.ZodDefault<z.ZodNumber>;
        /** Unbroken eggs by grade; the sum cannot exceed collected − broken. Ungraded eggs are the remainder. */
        byGrade: z.ZodOptional<z.ZodRecord<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>, z.ZodNumber>>;
        averageEggWeightG: z.ZodOptional<z.ZodNumber>;
        qualityNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>>>;
    averageWeight: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        averageWeightG: z.ZodNumber;
        sampleSize: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }>>>;
    healthObservations: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** What was seen, in the farmer's words. PoultryPilot records observations; it does not diagnose. */
        signs: z.ZodString;
        affectedBirds: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        signs: string;
        affectedBirds?: number | undefined;
    }, {
        signs: string;
        affectedBirds?: number | undefined;
    }>, "many">>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    photos: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        caption?: string | undefined;
    }, {
        assetId: string;
        caption?: string | undefined;
    }>, "many">>>;
} & {
    version: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    feed?: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}, {
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>;
export declare const UpsertDailyRecordRequest: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    /** Birds counted in the house today (a headcount). Compared with the ledger; differences are shown, not applied. */
    observedBirdCount: z.ZodOptional<z.ZodNumber>;
    mortality: z.ZodDefault<z.ZodArray<z.ZodObject<{
        cause: z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>;
        count: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }>, "many">>;
    culls: z.ZodDefault<z.ZodNumber>;
    feed: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodObject<{
        quantityKg: z.ZodNumber;
        /** consumption (eaten, counts in FCR) or wastage (spilled or spoiled in the house). */
        kind: z.ZodDefault<z.ZodEnum<["consumption", "wastage"]>>;
        /** A feed item from inventory: stock moves automatically and the feed is costed at its lots' prices. */
        feedItemId: z.ZodOptional<z.ZodString>;
        /** For feed not tracked in inventory: the price per kg. Not allowed together with feedItemId. */
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
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>, "many">>;
    waterLitres: z.ZodOptional<z.ZodNumber>;
    /** Source, quality and treatment of the day's water. Needs waterLitres. */
    waterQuality: z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodEnum<["borehole", "municipal", "well", "rainwater", "river", "tanker", "other"]>>;
        ph: z.ZodOptional<z.ZodNumber>;
        tdsPpm: z.ZodOptional<z.ZodNumber>;
        chlorinePpm: z.ZodOptional<z.ZodNumber>;
        qualityRating: z.ZodOptional<z.ZodEnum<["good", "fair", "poor"]>>;
        treatment: z.ZodOptional<z.ZodEnum<["none", "chlorination", "acidification", "filtration", "uv", "medication", "vitamins", "other"]>>;
        treatmentNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }, {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }>>;
    temperatureMinC: z.ZodOptional<z.ZodNumber>;
    temperatureMaxC: z.ZodOptional<z.ZodNumber>;
    humidityPercent: z.ZodOptional<z.ZodNumber>;
    lightingHours: z.ZodOptional<z.ZodNumber>;
    eggs: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /** Every egg gathered, including broken ones. */
        collected: z.ZodNumber;
        /** Broken eggs (part of collected). Removed from stock. */
        broken: z.ZodDefault<z.ZodNumber>;
        /** Unbroken eggs by grade; the sum cannot exceed collected − broken. Ungraded eggs are the remainder. */
        byGrade: z.ZodOptional<z.ZodRecord<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>, z.ZodNumber>>;
        averageEggWeightG: z.ZodOptional<z.ZodNumber>;
        qualityNotes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>, {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }, {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    }>>;
    averageWeight: z.ZodOptional<z.ZodObject<{
        averageWeightG: z.ZodNumber;
        sampleSize: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }, {
        averageWeightG: number;
        sampleSize?: number | undefined;
    }>>;
    healthObservations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** What was seen, in the farmer's words. PoultryPilot records observations; it does not diagnose. */
        signs: z.ZodString;
        affectedBirds: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        signs: string;
        affectedBirds?: number | undefined;
    }, {
        signs: string;
        affectedBirds?: number | undefined;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodDefault<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        caption?: string | undefined;
    }, {
        assetId: string;
        caption?: string | undefined;
    }>, "many">>;
} & {
    version: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>, {
    feed: {
        quantityKg: number;
        kind: "wastage" | "consumption";
        reason?: string | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[];
    culls: number;
    healthObservations: {
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        caption?: string | undefined;
    }[];
    eggs?: {
        collected: number;
        broken: number;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
}, {
    feed?: {
        quantityKg: number;
        reason?: string | undefined;
        kind?: "wastage" | "consumption" | undefined;
        feedItemId?: string | undefined;
        unitCostPerKg?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }[] | undefined;
    eggs?: {
        collected: number;
        broken?: number | undefined;
        byGrade?: Partial<Record<"large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk", number>> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
    } | undefined;
    mortality?: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    }[] | undefined;
    version?: number | undefined;
    notes?: string | undefined;
    observedBirdCount?: number | undefined;
    culls?: number | undefined;
    waterLitres?: number | undefined;
    waterQuality?: {
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        sampleSize?: number | undefined;
    } | undefined;
    healthObservations?: {
        signs: string;
        affectedBirds?: number | undefined;
    }[] | undefined;
    photos?: {
        assetId: string;
        caption?: string | undefined;
    }[] | undefined;
}>;
export declare const DailyRecordListQuery: z.ZodObject<{
    date: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    houseId: z.ZodOptional<z.ZodString>;
    flockId: z.ZodOptional<z.ZodString>;
    /** Flock type: broiler, layer, breeder, chick or custom. */
    type: z.ZodOptional<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    cursor?: string | undefined;
    date?: string | undefined;
    houseId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}, {
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
    date?: string | undefined;
    houseId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}>;
/** Totals of what this record itself recorded. Stored on the record for fast lists. */
export declare const DailyRecordSummary: z.ZodObject<{
    mortality: z.ZodNumber;
    culls: z.ZodNumber;
    feedKg: z.ZodNumber;
    waterLitres: z.ZodNullable<z.ZodNumber>;
    eggsCollected: z.ZodNullable<z.ZodNumber>;
    eggsBroken: z.ZodNullable<z.ZodNumber>;
    averageWeightG: z.ZodNullable<z.ZodNumber>;
    observations: z.ZodNumber;
    photos: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    mortality: number;
    averageWeightG: number | null;
    eggsCollected: number | null;
    culls: number;
    waterLitres: number | null;
    photos: number;
    feedKg: number;
    eggsBroken: number | null;
    observations: number;
}, {
    mortality: number;
    averageWeightG: number | null;
    eggsCollected: number | null;
    culls: number;
    waterLitres: number | null;
    photos: number;
    feedKg: number;
    eggsBroken: number | null;
    observations: number;
}>;
export declare const DailyRecordListItem: z.ZodObject<{
    id: z.ZodString;
    flockId: z.ZodString;
    flockCode: z.ZodString;
    houseId: z.ZodString;
    flockType: z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>;
    date: z.ZodString;
    summary: z.ZodObject<{
        mortality: z.ZodNumber;
        culls: z.ZodNumber;
        feedKg: z.ZodNumber;
        waterLitres: z.ZodNullable<z.ZodNumber>;
        eggsCollected: z.ZodNullable<z.ZodNumber>;
        eggsBroken: z.ZodNullable<z.ZodNumber>;
        averageWeightG: z.ZodNullable<z.ZodNumber>;
        observations: z.ZodNumber;
        photos: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    }, {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    }>;
    version: z.ZodNumber;
    createdBy: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    version: number;
    id: string;
    updatedAt: string;
    flockCode: string;
    houseId: string;
    flockId: string;
    createdBy: string;
    flockType: "broiler" | "layer" | "breeder" | "chick" | "custom";
    summary: {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    };
}, {
    date: string;
    version: number;
    id: string;
    updatedAt: string;
    flockCode: string;
    houseId: string;
    flockId: string;
    createdBy: string;
    flockType: "broiler" | "layer" | "breeder" | "chick" | "custom";
    summary: {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    };
}>;
export declare const DailyRecordView: z.ZodObject<{
    id: z.ZodNullable<z.ZodString>;
    flockId: z.ZodString;
    flockCode: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    flockType: z.ZodOptional<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>>;
    date: z.ZodString;
    observedBirdCount: z.ZodOptional<z.ZodNumber>;
    /** Birds alive at the end of the day according to the flock ledger. */
    birdsAliveEndOfDay: z.ZodNumber;
    /** observedBirdCount − birdsAliveEndOfDay, when a headcount was entered. */
    countDifference: z.ZodOptional<z.ZodNumber>;
    /** Every death recorded for the day: from this record and from separate mortality entries. */
    mortality: z.ZodArray<z.ZodObject<{
        cause: z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>;
        count: z.ZodNumber;
        eventId: z.ZodString;
        fromDailyRecord: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
        eventId: string;
        fromDailyRecord: boolean;
    }, {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
        eventId: string;
        fromDailyRecord: boolean;
    }>, "many">;
    mortalityTotal: z.ZodNumber;
    culls: z.ZodNumber;
    feed: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<["consumption", "wastage"]>;
        quantityKg: z.ZodNumber;
        feedItemId: z.ZodOptional<z.ZodString>;
        cost: z.ZodOptional<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodEffects<z.ZodString, string, string>;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amountMinor: number;
        }, {
            currency: string;
            amountMinor: number;
        }>>;
        fromDailyRecord: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        quantityKg: number;
        kind: "wastage" | "consumption";
        fromDailyRecord: boolean;
        cost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        feedItemId?: string | undefined;
    }, {
        id: string;
        quantityKg: number;
        kind: "wastage" | "consumption";
        fromDailyRecord: boolean;
        cost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        feedItemId?: string | undefined;
    }>, "many">;
    feedKg: z.ZodNumber;
    waterLitres: z.ZodOptional<z.ZodNumber>;
    water: z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodEnum<["borehole", "municipal", "well", "rainwater", "river", "tanker", "other"]>>;
        ph: z.ZodOptional<z.ZodNumber>;
        tdsPpm: z.ZodOptional<z.ZodNumber>;
        chlorinePpm: z.ZodOptional<z.ZodNumber>;
        qualityRating: z.ZodOptional<z.ZodEnum<["good", "fair", "poor"]>>;
        treatment: z.ZodOptional<z.ZodEnum<["none", "chlorination", "acidification", "filtration", "uv", "medication", "vitamins", "other"]>>;
        treatmentNotes: z.ZodOptional<z.ZodString>;
        flags: z.ZodArray<z.ZodString, "many">;
        baselineLitres: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        flags: string[];
        baselineLitres: number | null;
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }, {
        flags: string[];
        baselineLitres: number | null;
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    }>>;
    temperatureMinC: z.ZodOptional<z.ZodNumber>;
    temperatureMaxC: z.ZodOptional<z.ZodNumber>;
    humidityPercent: z.ZodOptional<z.ZodNumber>;
    lightingHours: z.ZodOptional<z.ZodNumber>;
    eggs: z.ZodOptional<z.ZodObject<{
        collected: z.ZodNumber;
        broken: z.ZodNumber;
        byGrade: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        averageEggWeightG: z.ZodOptional<z.ZodNumber>;
        qualityNotes: z.ZodOptional<z.ZodString>;
        henDayPercent: z.ZodNullable<z.ZodNumber>;
        withheldUntil: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        collected: number;
        broken: number;
        henDayPercent: number | null;
        byGrade?: Record<string, number> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
        withheldUntil?: string | undefined;
    }, {
        collected: number;
        broken: number;
        henDayPercent: number | null;
        byGrade?: Record<string, number> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
        withheldUntil?: string | undefined;
    }>>;
    averageWeight: z.ZodOptional<z.ZodObject<{
        averageWeightG: z.ZodNumber;
        sampleSize: z.ZodOptional<z.ZodNumber>;
        eventId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        averageWeightG: number;
        eventId: string;
        sampleSize?: number | undefined;
    }, {
        averageWeightG: number;
        eventId: string;
        sampleSize?: number | undefined;
    }>>;
    healthObservations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        signs: z.ZodString;
        affectedBirds: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        signs: string;
        affectedBirds?: number | undefined;
    }, {
        id: string;
        signs: string;
        affectedBirds?: number | undefined;
    }>, "many">;
    notes: z.ZodOptional<z.ZodString>;
    photos: z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        assetId: string;
        url: string;
        caption?: string | undefined;
    }, {
        assetId: string;
        url: string;
        caption?: string | undefined;
    }>, "many">;
    version: z.ZodNullable<z.ZodNumber>;
    createdBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    feed: {
        id: string;
        quantityKg: number;
        kind: "wastage" | "consumption";
        fromDailyRecord: boolean;
        cost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        feedItemId?: string | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
        eventId: string;
        fromDailyRecord: boolean;
    }[];
    date: string;
    version: number | null;
    id: string | null;
    flockId: string;
    culls: number;
    healthObservations: {
        id: string;
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        url: string;
        caption?: string | undefined;
    }[];
    feedKg: number;
    birdsAliveEndOfDay: number;
    mortalityTotal: number;
    water?: {
        flags: string[];
        baselineLitres: number | null;
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    eggs?: {
        collected: number;
        broken: number;
        henDayPercent: number | null;
        byGrade?: Record<string, number> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
        withheldUntil?: string | undefined;
    } | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    notes?: string | undefined;
    flockCode?: string | undefined;
    houseId?: string | undefined;
    createdBy?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        eventId: string;
        sampleSize?: number | undefined;
    } | undefined;
    flockType?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    countDifference?: number | undefined;
}, {
    feed: {
        id: string;
        quantityKg: number;
        kind: "wastage" | "consumption";
        fromDailyRecord: boolean;
        cost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        feedItemId?: string | undefined;
    }[];
    mortality: {
        count: number;
        cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
        eventId: string;
        fromDailyRecord: boolean;
    }[];
    date: string;
    version: number | null;
    id: string | null;
    flockId: string;
    culls: number;
    healthObservations: {
        id: string;
        signs: string;
        affectedBirds?: number | undefined;
    }[];
    photos: {
        assetId: string;
        url: string;
        caption?: string | undefined;
    }[];
    feedKg: number;
    birdsAliveEndOfDay: number;
    mortalityTotal: number;
    water?: {
        flags: string[];
        baselineLitres: number | null;
        treatment?: "other" | "none" | "chlorination" | "acidification" | "filtration" | "uv" | "medication" | "vitamins" | undefined;
        source?: "other" | "borehole" | "municipal" | "well" | "rainwater" | "river" | "tanker" | undefined;
        ph?: number | undefined;
        tdsPpm?: number | undefined;
        chlorinePpm?: number | undefined;
        qualityRating?: "good" | "fair" | "poor" | undefined;
        treatmentNotes?: string | undefined;
    } | undefined;
    eggs?: {
        collected: number;
        broken: number;
        henDayPercent: number | null;
        byGrade?: Record<string, number> | undefined;
        averageEggWeightG?: number | undefined;
        qualityNotes?: string | undefined;
        withheldUntil?: string | undefined;
    } | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    notes?: string | undefined;
    flockCode?: string | undefined;
    houseId?: string | undefined;
    createdBy?: string | undefined;
    observedBirdCount?: number | undefined;
    waterLitres?: number | undefined;
    temperatureMinC?: number | undefined;
    temperatureMaxC?: number | undefined;
    humidityPercent?: number | undefined;
    lightingHours?: number | undefined;
    averageWeight?: {
        averageWeightG: number;
        eventId: string;
        sampleSize?: number | undefined;
    } | undefined;
    flockType?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    countDifference?: number | undefined;
}>;
/** Returned instead of the full view when the client sends `Prefer: return=minimal` (saves mobile data). */
export declare const DailyRecordMinimal: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
    summary: z.ZodObject<{
        mortality: z.ZodNumber;
        culls: z.ZodNumber;
        feedKg: z.ZodNumber;
        waterLitres: z.ZodNullable<z.ZodNumber>;
        eggsCollected: z.ZodNullable<z.ZodNumber>;
        eggsBroken: z.ZodNullable<z.ZodNumber>;
        averageWeightG: z.ZodNullable<z.ZodNumber>;
        observations: z.ZodNumber;
        photos: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    }, {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    }>;
}, "strip", z.ZodTypeAny, {
    version: number;
    id: string;
    summary: {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    };
}, {
    version: number;
    id: string;
    summary: {
        mortality: number;
        averageWeightG: number | null;
        eggsCollected: number | null;
        culls: number;
        waterLitres: number | null;
        photos: number;
        feedKg: number;
        eggsBroken: number | null;
        observations: number;
    };
}>;
/** GET /farms/:farmId/daily-records/sheet — everything a phone needs to enter a day, in one call. */
export declare const DailyEntrySheet: z.ZodObject<{
    date: z.ZodString;
    today: z.ZodString;
    editWindowStart: z.ZodString;
    flocks: z.ZodArray<z.ZodObject<{
        flockId: z.ZodString;
        flockCode: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>;
        houseId: z.ZodString;
        houseName: z.ZodString;
        expectedBirds: z.ZodNumber;
        laying: z.ZodBoolean;
        record: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            version: z.ZodNumber;
            summary: z.ZodObject<{
                mortality: z.ZodNumber;
                culls: z.ZodNumber;
                feedKg: z.ZodNumber;
                waterLitres: z.ZodNullable<z.ZodNumber>;
                eggsCollected: z.ZodNullable<z.ZodNumber>;
                eggsBroken: z.ZodNullable<z.ZodNumber>;
                averageWeightG: z.ZodNullable<z.ZodNumber>;
                observations: z.ZodNumber;
                photos: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            }, {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            }>;
            recordedByName: z.ZodNullable<z.ZodString>;
            lastChangedByName: z.ZodNullable<z.ZodString>;
            updatedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            version: number;
            id: string;
            updatedAt: string;
            summary: {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            };
            recordedByName: string | null;
            lastChangedByName: string | null;
        }, {
            version: number;
            id: string;
            updatedAt: string;
            summary: {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            };
            recordedByName: string | null;
            lastChangedByName: string | null;
        }>>;
        /** Yesterday's figures, to pre-fill or compare. */
        previous: z.ZodNullable<z.ZodObject<{
            mortality: z.ZodNumber;
            culls: z.ZodNumber;
            feedKg: z.ZodNumber;
            waterLitres: z.ZodNullable<z.ZodNumber>;
            eggsCollected: z.ZodNullable<z.ZodNumber>;
            eggsBroken: z.ZodNullable<z.ZodNumber>;
            averageWeightG: z.ZodNullable<z.ZodNumber>;
            observations: z.ZodNumber;
            photos: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            mortality: number;
            averageWeightG: number | null;
            eggsCollected: number | null;
            culls: number;
            waterLitres: number | null;
            photos: number;
            feedKg: number;
            eggsBroken: number | null;
            observations: number;
        }, {
            mortality: number;
            averageWeightG: number | null;
            eggsCollected: number | null;
            culls: number;
            waterLitres: number | null;
            photos: number;
            feedKg: number;
            eggsBroken: number | null;
            observations: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        name: string;
        flockCode: string;
        houseId: string;
        flockId: string;
        houseName: string;
        expectedBirds: number;
        laying: boolean;
        record: {
            version: number;
            id: string;
            updatedAt: string;
            summary: {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            };
            recordedByName: string | null;
            lastChangedByName: string | null;
        } | null;
        previous: {
            mortality: number;
            averageWeightG: number | null;
            eggsCollected: number | null;
            culls: number;
            waterLitres: number | null;
            photos: number;
            feedKg: number;
            eggsBroken: number | null;
            observations: number;
        } | null;
    }, {
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        name: string;
        flockCode: string;
        houseId: string;
        flockId: string;
        houseName: string;
        expectedBirds: number;
        laying: boolean;
        record: {
            version: number;
            id: string;
            updatedAt: string;
            summary: {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            };
            recordedByName: string | null;
            lastChangedByName: string | null;
        } | null;
        previous: {
            mortality: number;
            averageWeightG: number | null;
            eggsCollected: number | null;
            culls: number;
            waterLitres: number | null;
            photos: number;
            feedKg: number;
            eggsBroken: number | null;
            observations: number;
        } | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    date: string;
    today: string;
    editWindowStart: string;
    flocks: {
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        name: string;
        flockCode: string;
        houseId: string;
        flockId: string;
        houseName: string;
        expectedBirds: number;
        laying: boolean;
        record: {
            version: number;
            id: string;
            updatedAt: string;
            summary: {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            };
            recordedByName: string | null;
            lastChangedByName: string | null;
        } | null;
        previous: {
            mortality: number;
            averageWeightG: number | null;
            eggsCollected: number | null;
            culls: number;
            waterLitres: number | null;
            photos: number;
            feedKg: number;
            eggsBroken: number | null;
            observations: number;
        } | null;
    }[];
}, {
    date: string;
    today: string;
    editWindowStart: string;
    flocks: {
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        name: string;
        flockCode: string;
        houseId: string;
        flockId: string;
        houseName: string;
        expectedBirds: number;
        laying: boolean;
        record: {
            version: number;
            id: string;
            updatedAt: string;
            summary: {
                mortality: number;
                averageWeightG: number | null;
                eggsCollected: number | null;
                culls: number;
                waterLitres: number | null;
                photos: number;
                feedKg: number;
                eggsBroken: number | null;
                observations: number;
            };
            recordedByName: string | null;
            lastChangedByName: string | null;
        } | null;
        previous: {
            mortality: number;
            averageWeightG: number | null;
            eggsCollected: number | null;
            culls: number;
            waterLitres: number | null;
            photos: number;
            feedKg: number;
            eggsBroken: number | null;
            observations: number;
        } | null;
    }[];
}>;
export declare const MediaAssetView: z.ZodObject<{
    id: z.ZodString;
    contentType: z.ZodString;
    sizeBytes: z.ZodNumber;
    url: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    url: string;
    contentType: string;
    sizeBytes: number;
}, {
    id: string;
    createdAt: string;
    url: string;
    contentType: string;
    sizeBytes: number;
}>;
export declare const DashboardDayQuery: z.ZodObject<{
    date: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    houseId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>>;
}, "strip", z.ZodTypeAny, {
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    date?: string | undefined;
    houseId?: string | undefined;
}, {
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    date?: string | undefined;
    houseId?: string | undefined;
}>;
export declare const DashboardDayView: z.ZodObject<{
    date: z.ZodString;
    totals: z.ZodObject<{
        birdsAlive: z.ZodNumber;
        mortality: z.ZodNumber;
        culls: z.ZodNumber;
        feedKg: z.ZodNumber;
        waterLitres: z.ZodNumber;
        eggsCollected: z.ZodNumber;
        eggsBroken: z.ZodNumber;
        henDayPercent: z.ZodNullable<z.ZodNumber>;
        mortalityRatePercent: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
    }, {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
    }>;
    flocksTotal: z.ZodNumber;
    flocksRecorded: z.ZodNumber;
    flocks: z.ZodArray<z.ZodObject<{
        birdsAlive: z.ZodNumber;
        mortality: z.ZodNumber;
        culls: z.ZodNumber;
        feedKg: z.ZodNumber;
        waterLitres: z.ZodNumber;
        eggsCollected: z.ZodNumber;
        eggsBroken: z.ZodNumber;
        henDayPercent: z.ZodNullable<z.ZodNumber>;
        mortalityRatePercent: z.ZodNullable<z.ZodNumber>;
    } & {
        flockId: z.ZodString;
        flockCode: z.ZodString;
        type: z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>;
        houseId: z.ZodString;
        recorded: z.ZodBoolean;
        recordId: z.ZodNullable<z.ZodString>;
        latestAverageWeightG: z.ZodNullable<z.ZodNumber>;
        waterToFeedRatio: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mortality: number;
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        flockCode: string;
        houseId: string;
        eggsCollected: number;
        flockId: string;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
        recorded: boolean;
        recordId: string | null;
        latestAverageWeightG: number | null;
        waterToFeedRatio: number | null;
    }, {
        mortality: number;
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        flockCode: string;
        houseId: string;
        eggsCollected: number;
        flockId: string;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
        recorded: boolean;
        recordId: string | null;
        latestAverageWeightG: number | null;
        waterToFeedRatio: number | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    date: string;
    flocks: {
        mortality: number;
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        flockCode: string;
        houseId: string;
        eggsCollected: number;
        flockId: string;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
        recorded: boolean;
        recordId: string | null;
        latestAverageWeightG: number | null;
        waterToFeedRatio: number | null;
    }[];
    totals: {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
    };
    flocksTotal: number;
    flocksRecorded: number;
}, {
    date: string;
    flocks: {
        mortality: number;
        type: "broiler" | "layer" | "breeder" | "chick" | "custom";
        flockCode: string;
        houseId: string;
        eggsCollected: number;
        flockId: string;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
        recorded: boolean;
        recordId: string | null;
        latestAverageWeightG: number | null;
        waterToFeedRatio: number | null;
    }[];
    totals: {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        henDayPercent: number | null;
        birdsAlive: number;
        mortalityRatePercent: number | null;
    };
    flocksTotal: number;
    flocksRecorded: number;
}>;
export declare const TrendsQuery: z.ZodEffects<z.ZodObject<{
    from: z.ZodEffects<z.ZodString, string, string>;
    to: z.ZodEffects<z.ZodString, string, string>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
}, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
}>, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
}, {
    from: string;
    to: string;
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
}>;
export declare const TrendsView: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    flockIds: z.ZodArray<z.ZodString, "many">;
    days: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        mortality: z.ZodNumber;
        culls: z.ZodNumber;
        feedKg: z.ZodNumber;
        waterLitres: z.ZodNumber;
        eggsCollected: z.ZodNumber;
        eggsBroken: z.ZodNumber;
        records: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        mortality: number;
        date: string;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    }, {
        mortality: number;
        date: string;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    }>, "many">;
    totals: z.ZodObject<{
        mortality: z.ZodNumber;
        culls: z.ZodNumber;
        feedKg: z.ZodNumber;
        waterLitres: z.ZodNumber;
        eggsCollected: z.ZodNumber;
        eggsBroken: z.ZodNumber;
        records: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    }, {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    }>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    totals: {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    };
    flockIds: string[];
    days: {
        mortality: number;
        date: string;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    }[];
}, {
    from: string;
    to: string;
    totals: {
        mortality: number;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    };
    flockIds: string[];
    days: {
        mortality: number;
        date: string;
        eggsCollected: number;
        culls: number;
        waterLitres: number;
        feedKg: number;
        eggsBroken: number;
        records: number;
    }[];
}>;
