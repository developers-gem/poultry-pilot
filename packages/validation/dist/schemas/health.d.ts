import { z } from "zod";
export declare const CreateMedicineRequest: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["vaccine", "antibiotic", "anticoccidial", "antiparasitic", "vitamin_mineral", "probiotic", "other"]>;
    activeIngredient: z.ZodOptional<z.ZodString>;
    manufacturer: z.ZodOptional<z.ZodString>;
    defaultRoute: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
    doseUnit: z.ZodOptional<z.ZodEnum<["kg", "g", "l", "ml", "dose", "piece", "tray", "bag", "box", "bottle"]>>;
    /** From the product label or the farm's veterinarian. PoultryPilot has no country defaults. */
    withdrawalMeatDays: z.ZodOptional<z.ZodNumber>;
    withdrawalEggDays: z.ZodOptional<z.ZodNumber>;
    withdrawalSource: z.ZodOptional<z.ZodEnum<["medicine_label", "veterinarian", "other"]>>;
    prescriptionRequired: z.ZodOptional<z.ZodBoolean>;
    label: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        url?: string | undefined;
    }, {
        name: string;
        url?: string | undefined;
    }>>;
    notes: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "other" | "vaccine" | "antibiotic" | "anticoccidial" | "antiparasitic" | "vitamin_mineral" | "probiotic";
    name: string;
    id?: string | undefined;
    notes?: string | undefined;
    activeIngredient?: string | undefined;
    manufacturer?: string | undefined;
    defaultRoute?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    doseUnit?: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle" | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    prescriptionRequired?: boolean | undefined;
    label?: {
        name: string;
        url?: string | undefined;
    } | undefined;
}, {
    type: "other" | "vaccine" | "antibiotic" | "anticoccidial" | "antiparasitic" | "vitamin_mineral" | "probiotic";
    name: string;
    id?: string | undefined;
    notes?: string | undefined;
    activeIngredient?: string | undefined;
    manufacturer?: string | undefined;
    defaultRoute?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    doseUnit?: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle" | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    prescriptionRequired?: boolean | undefined;
    label?: {
        name: string;
        url?: string | undefined;
    } | undefined;
}>;
export declare const UpdateMedicineRequest: z.ZodObject<{
    version: z.ZodNumber;
    name: z.ZodString;
    type: z.ZodEnum<["vaccine", "antibiotic", "anticoccidial", "antiparasitic", "vitamin_mineral", "probiotic", "other"]>;
    activeIngredient: z.ZodOptional<z.ZodString>;
    manufacturer: z.ZodOptional<z.ZodString>;
    defaultRoute: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
    doseUnit: z.ZodOptional<z.ZodEnum<["kg", "g", "l", "ml", "dose", "piece", "tray", "bag", "box", "bottle"]>>;
    /** From the product label or the farm's veterinarian. PoultryPilot has no country defaults. */
    withdrawalMeatDays: z.ZodOptional<z.ZodNumber>;
    withdrawalEggDays: z.ZodOptional<z.ZodNumber>;
    withdrawalSource: z.ZodOptional<z.ZodEnum<["medicine_label", "veterinarian", "other"]>>;
    prescriptionRequired: z.ZodOptional<z.ZodBoolean>;
    label: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        url?: string | undefined;
    }, {
        name: string;
        url?: string | undefined;
    }>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "other" | "vaccine" | "antibiotic" | "anticoccidial" | "antiparasitic" | "vitamin_mineral" | "probiotic";
    version: number;
    name: string;
    notes?: string | undefined;
    activeIngredient?: string | undefined;
    manufacturer?: string | undefined;
    defaultRoute?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    doseUnit?: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle" | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    prescriptionRequired?: boolean | undefined;
    label?: {
        name: string;
        url?: string | undefined;
    } | undefined;
}, {
    type: "other" | "vaccine" | "antibiotic" | "anticoccidial" | "antiparasitic" | "vitamin_mineral" | "probiotic";
    version: number;
    name: string;
    notes?: string | undefined;
    activeIngredient?: string | undefined;
    manufacturer?: string | undefined;
    defaultRoute?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    doseUnit?: "kg" | "g" | "l" | "ml" | "dose" | "piece" | "tray" | "bag" | "box" | "bottle" | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    prescriptionRequired?: boolean | undefined;
    label?: {
        name: string;
        url?: string | undefined;
    } | undefined;
}>;
export declare const TreatmentInput: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    medicineId: z.ZodOptional<z.ZodString>;
    /** For a product not in the catalog. */
    medicineName: z.ZodOptional<z.ZodString>;
    /** Draw the quantity from this inventory item's stock (FEFO, expired stock refused). */
    inventoryItemId: z.ZodOptional<z.ZodString>;
    quantityUsed: z.ZodOptional<z.ZodNumber>;
    /** As instructed, e.g. "1 g per 2 L drinking water". */
    dose: z.ZodOptional<z.ZodString>;
    route: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
    frequency: z.ZodOptional<z.ZodString>;
    startDate: z.ZodEffects<z.ZodString, string, string>;
    durationDays: z.ZodNumber;
    /** Override the medicine's default withdrawal periods (e.g. on veterinary instruction). */
    withdrawalMeatDays: z.ZodOptional<z.ZodNumber>;
    withdrawalEggDays: z.ZodOptional<z.ZodNumber>;
    withdrawalSource: z.ZodOptional<z.ZodEnum<["medicine_label", "veterinarian", "other"]>>;
    prescribedBy: z.ZodOptional<z.ZodString>;
    prescriptionReference: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    startDate: string;
    durationDays: number;
    dose?: string | undefined;
    medicineId?: string | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    medicineName?: string | undefined;
    inventoryItemId?: string | undefined;
    quantityUsed?: number | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    frequency?: string | undefined;
    prescribedBy?: string | undefined;
    prescriptionReference?: string | undefined;
}, {
    startDate: string;
    durationDays: number;
    dose?: string | undefined;
    medicineId?: string | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    medicineName?: string | undefined;
    inventoryItemId?: string | undefined;
    quantityUsed?: number | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    frequency?: string | undefined;
    prescribedBy?: string | undefined;
    prescriptionReference?: string | undefined;
}>, {
    startDate: string;
    durationDays: number;
    dose?: string | undefined;
    medicineId?: string | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    medicineName?: string | undefined;
    inventoryItemId?: string | undefined;
    quantityUsed?: number | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    frequency?: string | undefined;
    prescribedBy?: string | undefined;
    prescriptionReference?: string | undefined;
}, {
    startDate: string;
    durationDays: number;
    dose?: string | undefined;
    medicineId?: string | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    medicineName?: string | undefined;
    inventoryItemId?: string | undefined;
    quantityUsed?: number | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    frequency?: string | undefined;
    prescribedBy?: string | undefined;
    prescriptionReference?: string | undefined;
}>, {
    startDate: string;
    durationDays: number;
    dose?: string | undefined;
    medicineId?: string | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    medicineName?: string | undefined;
    inventoryItemId?: string | undefined;
    quantityUsed?: number | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    frequency?: string | undefined;
    prescribedBy?: string | undefined;
    prescriptionReference?: string | undefined;
}, {
    startDate: string;
    durationDays: number;
    dose?: string | undefined;
    medicineId?: string | undefined;
    withdrawalMeatDays?: number | undefined;
    withdrawalEggDays?: number | undefined;
    withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
    medicineName?: string | undefined;
    inventoryItemId?: string | undefined;
    quantityUsed?: number | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    frequency?: string | undefined;
    prescribedBy?: string | undefined;
    prescriptionReference?: string | undefined;
}>;
export declare const CreateHealthRecordRequest: z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["treatment", "vet_visit", "observation", "lab_test", "post_mortem"]>;
    date: z.ZodEffects<z.ZodString, string, string>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    symptoms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    observedSigns: z.ZodOptional<z.ZodString>;
    affectedBirds: z.ZodOptional<z.ZodNumber>;
    deadBirds: z.ZodOptional<z.ZodNumber>;
    vetName: z.ZodOptional<z.ZodString>;
    /** A diagnosis or assessment, attributed to the veterinarian, laboratory or staff member who made it. */
    assessment: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        by: z.ZodString;
        source: z.ZodEnum<["veterinarian", "laboratory", "farm_staff"]>;
    }, "strict", z.ZodTypeAny, {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    }, {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    }>>;
    lab: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        reference: z.ZodOptional<z.ZodString>;
        result: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    }, {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    }>>;
    treatments: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        medicineId: z.ZodOptional<z.ZodString>;
        /** For a product not in the catalog. */
        medicineName: z.ZodOptional<z.ZodString>;
        /** Draw the quantity from this inventory item's stock (FEFO, expired stock refused). */
        inventoryItemId: z.ZodOptional<z.ZodString>;
        quantityUsed: z.ZodOptional<z.ZodNumber>;
        /** As instructed, e.g. "1 g per 2 L drinking water". */
        dose: z.ZodOptional<z.ZodString>;
        route: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
        frequency: z.ZodOptional<z.ZodString>;
        startDate: z.ZodEffects<z.ZodString, string, string>;
        durationDays: z.ZodNumber;
        /** Override the medicine's default withdrawal periods (e.g. on veterinary instruction). */
        withdrawalMeatDays: z.ZodOptional<z.ZodNumber>;
        withdrawalEggDays: z.ZodOptional<z.ZodNumber>;
        withdrawalSource: z.ZodOptional<z.ZodEnum<["medicine_label", "veterinarian", "other"]>>;
        prescribedBy: z.ZodOptional<z.ZodString>;
        prescriptionReference: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }>, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }>, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }>, "many">>;
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
    followUpDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        name?: string | undefined;
    }, {
        assetId: string;
        name?: string | undefined;
    }>, "many">>;
} & {
    id: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    title: string;
    treatments: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[];
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    id?: string | undefined;
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    followUpDate?: string | undefined;
}, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    title: string;
    id?: string | undefined;
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    treatments?: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[] | undefined;
    followUpDate?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
}>, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    title: string;
    treatments: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[];
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    id?: string | undefined;
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    followUpDate?: string | undefined;
}, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    title: string;
    id?: string | undefined;
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    treatments?: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[] | undefined;
    followUpDate?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
}>;
export declare const UpdateHealthRecordRequest: z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["treatment", "vet_visit", "observation", "lab_test", "post_mortem"]>;
    date: z.ZodEffects<z.ZodString, string, string>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    symptoms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    observedSigns: z.ZodOptional<z.ZodString>;
    affectedBirds: z.ZodOptional<z.ZodNumber>;
    deadBirds: z.ZodOptional<z.ZodNumber>;
    vetName: z.ZodOptional<z.ZodString>;
    /** A diagnosis or assessment, attributed to the veterinarian, laboratory or staff member who made it. */
    assessment: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        by: z.ZodString;
        source: z.ZodEnum<["veterinarian", "laboratory", "farm_staff"]>;
    }, "strict", z.ZodTypeAny, {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    }, {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    }>>;
    lab: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        reference: z.ZodOptional<z.ZodString>;
        result: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    }, {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    }>>;
    treatments: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        medicineId: z.ZodOptional<z.ZodString>;
        /** For a product not in the catalog. */
        medicineName: z.ZodOptional<z.ZodString>;
        /** Draw the quantity from this inventory item's stock (FEFO, expired stock refused). */
        inventoryItemId: z.ZodOptional<z.ZodString>;
        quantityUsed: z.ZodOptional<z.ZodNumber>;
        /** As instructed, e.g. "1 g per 2 L drinking water". */
        dose: z.ZodOptional<z.ZodString>;
        route: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
        frequency: z.ZodOptional<z.ZodString>;
        startDate: z.ZodEffects<z.ZodString, string, string>;
        durationDays: z.ZodNumber;
        /** Override the medicine's default withdrawal periods (e.g. on veterinary instruction). */
        withdrawalMeatDays: z.ZodOptional<z.ZodNumber>;
        withdrawalEggDays: z.ZodOptional<z.ZodNumber>;
        withdrawalSource: z.ZodOptional<z.ZodEnum<["medicine_label", "veterinarian", "other"]>>;
        prescribedBy: z.ZodOptional<z.ZodString>;
        prescriptionReference: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }>, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }>, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }, {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }>, "many">>;
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
    followUpDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        name?: string | undefined;
    }, {
        assetId: string;
        name?: string | undefined;
    }>, "many">>;
} & {
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    version: number;
    title: string;
    treatments: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[];
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    followUpDate?: string | undefined;
}, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    version: number;
    title: string;
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    treatments?: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[] | undefined;
    followUpDate?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
}>, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    version: number;
    title: string;
    treatments: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[];
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    followUpDate?: string | undefined;
}, {
    type: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem";
    date: string;
    version: number;
    title: string;
    houseId?: string | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    flockId?: string | undefined;
    affectedBirds?: number | undefined;
    symptoms?: string[] | undefined;
    observedSigns?: string | undefined;
    deadBirds?: number | undefined;
    vetName?: string | undefined;
    assessment?: {
        text: string;
        source: "veterinarian" | "laboratory" | "farm_staff";
        by: string;
    } | undefined;
    lab?: {
        name?: string | undefined;
        reference?: string | undefined;
        result?: string | undefined;
    } | undefined;
    treatments?: {
        startDate: string;
        durationDays: number;
        dose?: string | undefined;
        medicineId?: string | undefined;
        withdrawalMeatDays?: number | undefined;
        withdrawalEggDays?: number | undefined;
        withdrawalSource?: "other" | "veterinarian" | "medicine_label" | undefined;
        medicineName?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        frequency?: string | undefined;
        prescribedBy?: string | undefined;
        prescriptionReference?: string | undefined;
    }[] | undefined;
    followUpDate?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
}>;
export declare const HealthRecordListQuery: z.ZodObject<{
    flockId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["treatment", "vet_visit", "observation", "lab_test", "post_mortem"]>>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    type?: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem" | undefined;
    cursor?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}, {
    type?: "treatment" | "vet_visit" | "observation" | "lab_test" | "post_mortem" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}>;
export declare const CreateProgrammeRequest: z.ZodObject<{
    name: z.ZodString;
    flockTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>, "many">>;
    items: z.ZodArray<z.ZodObject<{
        dayOfAge: z.ZodNumber;
        vaccineName: z.ZodString;
        medicineId: z.ZodOptional<z.ZodString>;
        targetDisease: z.ZodOptional<z.ZodString>;
        route: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }, {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }>, "many">;
    /** Where the programme came from: the farm's veterinarian, the hatchery, a written plan. */
    source: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    items: {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }[];
    id?: string | undefined;
    source?: string | undefined;
    flockTypes?: ("broiler" | "layer" | "breeder" | "chick" | "custom")[] | undefined;
}, {
    name: string;
    items: {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }[];
    id?: string | undefined;
    source?: string | undefined;
    flockTypes?: ("broiler" | "layer" | "breeder" | "chick" | "custom")[] | undefined;
}>;
export declare const UpdateProgrammeRequest: z.ZodObject<{
    active: z.ZodBoolean;
    version: z.ZodNumber;
    name: z.ZodString;
    flockTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>, "many">>;
    items: z.ZodArray<z.ZodObject<{
        dayOfAge: z.ZodNumber;
        vaccineName: z.ZodString;
        medicineId: z.ZodOptional<z.ZodString>;
        targetDisease: z.ZodOptional<z.ZodString>;
        route: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }, {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }>, "many">;
    /** Where the programme came from: the farm's veterinarian, the hatchery, a written plan. */
    source: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    active: boolean;
    version: number;
    name: string;
    items: {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }[];
    source?: string | undefined;
    flockTypes?: ("broiler" | "layer" | "breeder" | "chick" | "custom")[] | undefined;
}, {
    active: boolean;
    version: number;
    name: string;
    items: {
        dayOfAge: number;
        vaccineName: string;
        notes?: string | undefined;
        medicineId?: string | undefined;
        route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
        targetDisease?: string | undefined;
    }[];
    source?: string | undefined;
    flockTypes?: ("broiler" | "layer" | "breeder" | "chick" | "custom")[] | undefined;
}>;
export declare const ApplyProgrammeRequest: z.ZodObject<{
    programmeId: z.ZodString;
    includePast: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    programmeId: string;
    includePast: boolean;
}, {
    programmeId: string;
    includePast?: boolean | undefined;
}>;
export declare const ScheduleVaccinationRequest: z.ZodObject<{
    flockId: z.ZodString;
    vaccineName: z.ZodString;
    medicineId: z.ZodOptional<z.ZodString>;
    targetDisease: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodEffects<z.ZodString, string, string>;
    route: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    flockId: string;
    vaccineName: string;
    dueDate: string;
    notes?: string | undefined;
    medicineId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    targetDisease?: string | undefined;
}, {
    flockId: string;
    vaccineName: string;
    dueDate: string;
    notes?: string | undefined;
    medicineId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    targetDisease?: string | undefined;
}>;
export declare const AdministerVaccinationRequest: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    administeredBy: z.ZodOptional<z.ZodString>;
    route: z.ZodOptional<z.ZodEnum<["drinking_water", "feed", "injection", "eye_drop", "nasal", "spray", "wing_web", "oral", "topical", "in_ovo"]>>;
    birdsVaccinated: z.ZodOptional<z.ZodNumber>;
    /** Draw doses from this vaccine's stock: batches and expiry are recorded from the lots used. */
    inventoryItemId: z.ZodOptional<z.ZodString>;
    dosesUsed: z.ZodOptional<z.ZodNumber>;
    /** For vaccine not tracked in inventory: the batch numbers and expiry dates used. */
    batches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        batchNumber: z.ZodString;
        expiryDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        doses: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }, {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    notes?: string | undefined;
    inventoryItemId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    administeredBy?: string | undefined;
    birdsVaccinated?: number | undefined;
    dosesUsed?: number | undefined;
    batches?: {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }[] | undefined;
}, {
    date: string;
    notes?: string | undefined;
    inventoryItemId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    administeredBy?: string | undefined;
    birdsVaccinated?: number | undefined;
    dosesUsed?: number | undefined;
    batches?: {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }[] | undefined;
}>, {
    date: string;
    notes?: string | undefined;
    inventoryItemId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    administeredBy?: string | undefined;
    birdsVaccinated?: number | undefined;
    dosesUsed?: number | undefined;
    batches?: {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }[] | undefined;
}, {
    date: string;
    notes?: string | undefined;
    inventoryItemId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    administeredBy?: string | undefined;
    birdsVaccinated?: number | undefined;
    dosesUsed?: number | undefined;
    batches?: {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }[] | undefined;
}>, {
    date: string;
    notes?: string | undefined;
    inventoryItemId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    administeredBy?: string | undefined;
    birdsVaccinated?: number | undefined;
    dosesUsed?: number | undefined;
    batches?: {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }[] | undefined;
}, {
    date: string;
    notes?: string | undefined;
    inventoryItemId?: string | undefined;
    route?: "feed" | "drinking_water" | "injection" | "eye_drop" | "nasal" | "spray" | "wing_web" | "oral" | "topical" | "in_ovo" | undefined;
    administeredBy?: string | undefined;
    birdsVaccinated?: number | undefined;
    dosesUsed?: number | undefined;
    batches?: {
        batchNumber: string;
        expiryDate?: string | undefined;
        doses?: number | undefined;
    }[] | undefined;
}>;
export declare const SkipVaccinationRequest: z.ZodObject<{
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const VaccinationListQuery: z.ZodObject<{
    flockId: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodEnum<["scheduled", "due", "overdue", "done", "skipped", "cancelled"]>>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    state?: "cancelled" | "scheduled" | "done" | "skipped" | "due" | "overdue" | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
    state?: "cancelled" | "scheduled" | "done" | "skipped" | "due" | "overdue" | undefined;
}>;
export declare const RemindersQuery: z.ZodObject<{
    days: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    days: number;
}, {
    days?: number | undefined;
}>;
