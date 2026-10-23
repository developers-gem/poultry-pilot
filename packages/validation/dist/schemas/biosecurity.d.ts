import { z } from "zod";
export declare const CreateChecklistTemplateRequest: z.ZodObject<{
    name: z.ZodString;
    kind: z.ZodEnum<["visitor_declaration", "ppe", "footbath", "cleaning", "disinfection", "vehicle", "pest_control", "audit", "general", "arrival_preparation", "brooder_check"]>;
    items: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        required: z.ZodDefault<z.ZodBoolean>;
        responseType: z.ZodEnum<["yes_no", "text", "number", "choice"]>;
        choices: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** The answer that counts as a failed check: "yes", "no", or one of the choices. */
        failIf: z.ZodOptional<z.ZodString>;
        createActionOnFail: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }, {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }>, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }, {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }>, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }, {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }>, "many">, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }[], {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }[]>;
    source: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    kind: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "audit" | "visitor_declaration" | "ppe" | "general" | "arrival_preparation" | "brooder_check";
    items: {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }[];
    id?: string | undefined;
    source?: string | undefined;
}, {
    name: string;
    kind: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "audit" | "visitor_declaration" | "ppe" | "general" | "arrival_preparation" | "brooder_check";
    items: {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }[];
    id?: string | undefined;
    source?: string | undefined;
}>;
export declare const UpdateChecklistTemplateRequest: z.ZodObject<{
    active: z.ZodBoolean;
    version: z.ZodNumber;
    name: z.ZodString;
    kind: z.ZodEnum<["visitor_declaration", "ppe", "footbath", "cleaning", "disinfection", "vehicle", "pest_control", "audit", "general", "arrival_preparation", "brooder_check"]>;
    items: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        required: z.ZodDefault<z.ZodBoolean>;
        responseType: z.ZodEnum<["yes_no", "text", "number", "choice"]>;
        choices: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** The answer that counts as a failed check: "yes", "no", or one of the choices. */
        failIf: z.ZodOptional<z.ZodString>;
        createActionOnFail: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }, {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }>, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }, {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }>, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }, {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }>, "many">, {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }[], {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }[]>;
    source: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    active: boolean;
    version: number;
    name: string;
    kind: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "audit" | "visitor_declaration" | "ppe" | "general" | "arrival_preparation" | "brooder_check";
    items: {
        text: string;
        id: string;
        required: boolean;
        responseType: "number" | "yes_no" | "text" | "choice";
        createActionOnFail: boolean;
        choices?: string[] | undefined;
        failIf?: string | undefined;
    }[];
    source?: string | undefined;
}, {
    active: boolean;
    version: number;
    name: string;
    kind: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "audit" | "visitor_declaration" | "ppe" | "general" | "arrival_preparation" | "brooder_check";
    items: {
        text: string;
        id: string;
        responseType: "number" | "yes_no" | "text" | "choice";
        required?: boolean | undefined;
        choices?: string[] | undefined;
        failIf?: string | undefined;
        createActionOnFail?: boolean | undefined;
    }[];
    source?: string | undefined;
}>;
export declare const ChecklistTemplateQuery: z.ZodObject<{
    kind: z.ZodOptional<z.ZodEnum<["visitor_declaration", "ppe", "footbath", "cleaning", "disinfection", "vehicle", "pest_control", "audit", "general", "arrival_preparation", "brooder_check"]>>;
}, "strip", z.ZodTypeAny, {
    kind?: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "audit" | "visitor_declaration" | "ppe" | "general" | "arrival_preparation" | "brooder_check" | undefined;
}, {
    kind?: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "audit" | "visitor_declaration" | "ppe" | "general" | "arrival_preparation" | "brooder_check" | undefined;
}>;
export declare const ChecklistAnswers: z.ZodObject<{
    templateId: z.ZodString;
    answers: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        answer: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
    }, "strict", z.ZodTypeAny, {
        itemId: string;
        answer: string | number | boolean;
    }, {
        itemId: string;
        answer: string | number | boolean;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    templateId: string;
    answers: {
        itemId: string;
        answer: string | number | boolean;
    }[];
}, {
    templateId: string;
    answers: {
        itemId: string;
        answer: string | number | boolean;
    }[];
}>;
export declare const VisitorCheckInRequest: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    company: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["vet", "supplier", "buyer", "worker", "government", "contractor", "other"]>;
    phone: z.ZodOptional<z.ZodString>;
    purpose: z.ZodOptional<z.ZodString>;
    vehicleRegistration: z.ZodOptional<z.ZodString>;
    housesVisited: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Asked of every visitor: contact with other poultry, and when. */
    previousPoultryContact: z.ZodObject<{
        hadContact: z.ZodBoolean;
        lastContactAt: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        hadContact: boolean;
        description?: string | undefined;
        lastContactAt?: string | undefined;
    }, {
        hadContact: boolean;
        description?: string | undefined;
        lastContactAt?: string | undefined;
    }>;
    declaration: z.ZodOptional<z.ZodObject<{
        declaredName: z.ZodString;
        signatureAssetId: z.ZodOptional<z.ZodString>;
        checklist: z.ZodOptional<z.ZodObject<{
            templateId: z.ZodString;
            answers: z.ZodArray<z.ZodObject<{
                itemId: z.ZodString;
                answer: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            }, "strict", z.ZodTypeAny, {
                itemId: string;
                answer: string | number | boolean;
            }, {
                itemId: string;
                answer: string | number | boolean;
            }>, "many">;
        }, "strict", z.ZodTypeAny, {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        }, {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        }>>;
    }, "strict", z.ZodTypeAny, {
        declaredName: string;
        signatureAssetId?: string | undefined;
        checklist?: {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        } | undefined;
    }, {
        declaredName: string;
        signatureAssetId?: string | undefined;
        checklist?: {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        } | undefined;
    }>>;
    ppeUsed: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    footbathUsed: z.ZodDefault<z.ZodBoolean>;
    disinfected: z.ZodDefault<z.ZodBoolean>;
    checkInAt: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "other" | "worker" | "vet" | "supplier" | "buyer" | "government" | "contractor";
    name: string;
    previousPoultryContact: {
        hadContact: boolean;
        description?: string | undefined;
        lastContactAt?: string | undefined;
    };
    footbathUsed: boolean;
    disinfected: boolean;
    phone?: string | undefined;
    notes?: string | undefined;
    company?: string | undefined;
    purpose?: string | undefined;
    vehicleRegistration?: string | undefined;
    housesVisited?: string[] | undefined;
    declaration?: {
        declaredName: string;
        signatureAssetId?: string | undefined;
        checklist?: {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        } | undefined;
    } | undefined;
    ppeUsed?: string[] | undefined;
    checkInAt?: string | undefined;
}, {
    type: "other" | "worker" | "vet" | "supplier" | "buyer" | "government" | "contractor";
    name: string;
    previousPoultryContact: {
        hadContact: boolean;
        description?: string | undefined;
        lastContactAt?: string | undefined;
    };
    phone?: string | undefined;
    notes?: string | undefined;
    company?: string | undefined;
    purpose?: string | undefined;
    vehicleRegistration?: string | undefined;
    housesVisited?: string[] | undefined;
    declaration?: {
        declaredName: string;
        signatureAssetId?: string | undefined;
        checklist?: {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        } | undefined;
    } | undefined;
    ppeUsed?: string[] | undefined;
    footbathUsed?: boolean | undefined;
    disinfected?: boolean | undefined;
    checkInAt?: string | undefined;
}>, {
    type: "other" | "worker" | "vet" | "supplier" | "buyer" | "government" | "contractor";
    name: string;
    previousPoultryContact: {
        hadContact: boolean;
        description?: string | undefined;
        lastContactAt?: string | undefined;
    };
    footbathUsed: boolean;
    disinfected: boolean;
    phone?: string | undefined;
    notes?: string | undefined;
    company?: string | undefined;
    purpose?: string | undefined;
    vehicleRegistration?: string | undefined;
    housesVisited?: string[] | undefined;
    declaration?: {
        declaredName: string;
        signatureAssetId?: string | undefined;
        checklist?: {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        } | undefined;
    } | undefined;
    ppeUsed?: string[] | undefined;
    checkInAt?: string | undefined;
}, {
    type: "other" | "worker" | "vet" | "supplier" | "buyer" | "government" | "contractor";
    name: string;
    previousPoultryContact: {
        hadContact: boolean;
        description?: string | undefined;
        lastContactAt?: string | undefined;
    };
    phone?: string | undefined;
    notes?: string | undefined;
    company?: string | undefined;
    purpose?: string | undefined;
    vehicleRegistration?: string | undefined;
    housesVisited?: string[] | undefined;
    declaration?: {
        declaredName: string;
        signatureAssetId?: string | undefined;
        checklist?: {
            templateId: string;
            answers: {
                itemId: string;
                answer: string | number | boolean;
            }[];
        } | undefined;
    } | undefined;
    ppeUsed?: string[] | undefined;
    footbathUsed?: boolean | undefined;
    disinfected?: boolean | undefined;
    checkInAt?: string | undefined;
}>;
export declare const VisitorCheckOutRequest: z.ZodObject<{
    checkOutAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    checkOutAt?: string | undefined;
}, {
    checkOutAt?: string | undefined;
}>;
export declare const VisitorListQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    flagged: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
}, "strip", z.ZodTypeAny, {
    from?: string | undefined;
    to?: string | undefined;
    flagged?: boolean | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    flagged?: "true" | "false" | undefined;
}>;
export declare const BiosecurityLogRequest: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["cleaning", "disinfection", "footbath", "vehicle", "pest_control", "wild_bird_observation", "audit"]>;
    date: z.ZodEffects<z.ZodString, string, string>;
    houseId: z.ZodOptional<z.ZodString>;
    cleaningTaskId: z.ZodOptional<z.ZodString>;
    performedBy: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodObject<{
        inventoryItemId: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        quantityUsed: z.ZodOptional<z.ZodNumber>;
        concentration: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    }, {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    }>>;
    footbath: z.ZodOptional<z.ZodObject<{
        action: z.ZodEnum<["changed", "checked", "topped_up"]>;
        disinfectant: z.ZodOptional<z.ZodString>;
        concentration: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    }, {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    }>>;
    vehicle: z.ZodOptional<z.ZodObject<{
        registration: z.ZodString;
        driver: z.ZodOptional<z.ZodString>;
        company: z.ZodOptional<z.ZodString>;
        purpose: z.ZodOptional<z.ZodString>;
        disinfected: z.ZodDefault<z.ZodBoolean>;
        entryAt: z.ZodOptional<z.ZodString>;
        exitAt: z.ZodOptional<z.ZodString>;
        lastPoultryContactAt: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        disinfected: boolean;
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    }, {
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        disinfected?: boolean | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    }>>;
    pest: z.ZodOptional<z.ZodObject<{
        pestType: z.ZodEnum<["rodents", "insects", "wild_birds", "other"]>;
        method: z.ZodOptional<z.ZodString>;
        stationsChecked: z.ZodOptional<z.ZodNumber>;
        activityFound: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        activityFound: boolean;
        method?: string | undefined;
        stationsChecked?: number | undefined;
    }, {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        method?: string | undefined;
        stationsChecked?: number | undefined;
        activityFound?: boolean | undefined;
    }>>;
    wildBird: z.ZodOptional<z.ZodObject<{
        description: z.ZodString;
        count: z.ZodOptional<z.ZodNumber>;
        location: z.ZodOptional<z.ZodString>;
        contactWithPoultry: z.ZodDefault<z.ZodBoolean>;
        contactWithFeedOrWater: z.ZodDefault<z.ZodBoolean>;
        deadWildBirdsFound: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        description: string;
        contactWithPoultry: boolean;
        contactWithFeedOrWater: boolean;
        location?: string | undefined;
        count?: number | undefined;
        deadWildBirdsFound?: number | undefined;
    }, {
        description: string;
        location?: string | undefined;
        count?: number | undefined;
        contactWithPoultry?: boolean | undefined;
        contactWithFeedOrWater?: boolean | undefined;
        deadWildBirdsFound?: number | undefined;
    }>>;
    checklist: z.ZodOptional<z.ZodObject<{
        templateId: z.ZodString;
        answers: z.ZodArray<z.ZodObject<{
            itemId: z.ZodString;
            answer: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        }, "strict", z.ZodTypeAny, {
            itemId: string;
            answer: string | number | boolean;
        }, {
            itemId: string;
            answer: string | number | boolean;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    }, {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    }>>;
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
    details: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        disinfected: boolean;
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        activityFound: boolean;
        method?: string | undefined;
        stationsChecked?: number | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        contactWithPoultry: boolean;
        contactWithFeedOrWater: boolean;
        location?: string | undefined;
        count?: number | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        disinfected?: boolean | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        method?: string | undefined;
        stationsChecked?: number | undefined;
        activityFound?: boolean | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        location?: string | undefined;
        count?: number | undefined;
        contactWithPoultry?: boolean | undefined;
        contactWithFeedOrWater?: boolean | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}>, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        disinfected: boolean;
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        activityFound: boolean;
        method?: string | undefined;
        stationsChecked?: number | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        contactWithPoultry: boolean;
        contactWithFeedOrWater: boolean;
        location?: string | undefined;
        count?: number | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        disinfected?: boolean | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        method?: string | undefined;
        stationsChecked?: number | undefined;
        activityFound?: boolean | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        location?: string | undefined;
        count?: number | undefined;
        contactWithPoultry?: boolean | undefined;
        contactWithFeedOrWater?: boolean | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}>, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        disinfected: boolean;
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        activityFound: boolean;
        method?: string | undefined;
        stationsChecked?: number | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        contactWithPoultry: boolean;
        contactWithFeedOrWater: boolean;
        location?: string | undefined;
        count?: number | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        disinfected?: boolean | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        method?: string | undefined;
        stationsChecked?: number | undefined;
        activityFound?: boolean | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        location?: string | undefined;
        count?: number | undefined;
        contactWithPoultry?: boolean | undefined;
        contactWithFeedOrWater?: boolean | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}>, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        disinfected: boolean;
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        activityFound: boolean;
        method?: string | undefined;
        stationsChecked?: number | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        contactWithPoultry: boolean;
        contactWithFeedOrWater: boolean;
        location?: string | undefined;
        count?: number | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        disinfected?: boolean | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        method?: string | undefined;
        stationsChecked?: number | undefined;
        activityFound?: boolean | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        location?: string | undefined;
        count?: number | undefined;
        contactWithPoultry?: boolean | undefined;
        contactWithFeedOrWater?: boolean | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}>, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        disinfected: boolean;
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        activityFound: boolean;
        method?: string | undefined;
        stationsChecked?: number | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        contactWithPoultry: boolean;
        contactWithFeedOrWater: boolean;
        location?: string | undefined;
        count?: number | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        disinfected?: boolean | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        method?: string | undefined;
        stationsChecked?: number | undefined;
        activityFound?: boolean | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        location?: string | undefined;
        count?: number | undefined;
        contactWithPoultry?: boolean | undefined;
        contactWithFeedOrWater?: boolean | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}>, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    attachments: {
        assetId: string;
        name?: string | undefined;
    }[];
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        disinfected: boolean;
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        activityFound: boolean;
        method?: string | undefined;
        stationsChecked?: number | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        contactWithPoultry: boolean;
        contactWithFeedOrWater: boolean;
        location?: string | undefined;
        count?: number | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}, {
    type: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit";
    date: string;
    footbath?: {
        action: "changed" | "checked" | "topped_up";
        disinfectant?: string | undefined;
        concentration?: string | undefined;
    } | undefined;
    vehicle?: {
        registration: string;
        company?: string | undefined;
        purpose?: string | undefined;
        disinfected?: boolean | undefined;
        driver?: string | undefined;
        entryAt?: string | undefined;
        exitAt?: string | undefined;
        lastPoultryContactAt?: string | undefined;
    } | undefined;
    details?: string | undefined;
    houseId?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    cleaningTaskId?: string | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
    pest?: {
        pestType: "other" | "rodents" | "insects" | "wild_birds";
        method?: string | undefined;
        stationsChecked?: number | undefined;
        activityFound?: boolean | undefined;
    } | undefined;
    wildBird?: {
        description: string;
        location?: string | undefined;
        count?: number | undefined;
        contactWithPoultry?: boolean | undefined;
        contactWithFeedOrWater?: boolean | undefined;
        deadWildBirdsFound?: number | undefined;
    } | undefined;
}>;
export declare const BiosecurityLogQuery: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["cleaning", "disinfection", "footbath", "vehicle", "pest_control", "wild_bird_observation", "audit"]>>;
    houseId: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    type?: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit" | undefined;
    houseId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    type?: "cleaning" | "disinfection" | "footbath" | "vehicle" | "pest_control" | "wild_bird_observation" | "audit" | undefined;
    limit?: number | undefined;
    houseId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const EquipmentRequest: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodEnum<["incubator", "hatcher", "feeder", "drinker", "heater", "fan", "generator", "scale", "vehicle", "sprayer", "other"]>;
    serialNumber: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["in_service", "maintenance", "retired"]>>;
    nextMaintenanceDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "other" | "vehicle" | "incubator" | "hatcher" | "feeder" | "drinker" | "heater" | "fan" | "generator" | "scale" | "sprayer";
    status: "maintenance" | "in_service" | "retired";
    name: string;
    id?: string | undefined;
    notes?: string | undefined;
    houseId?: string | undefined;
    serialNumber?: string | undefined;
    nextMaintenanceDate?: string | undefined;
}, {
    type: "other" | "vehicle" | "incubator" | "hatcher" | "feeder" | "drinker" | "heater" | "fan" | "generator" | "scale" | "sprayer";
    name: string;
    status?: "maintenance" | "in_service" | "retired" | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    houseId?: string | undefined;
    serialNumber?: string | undefined;
    nextMaintenanceDate?: string | undefined;
}>;
export declare const EquipmentMoveRequest: z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    toHouseId: z.ZodOptional<z.ZodString>;
    offFarmDestination: z.ZodOptional<z.ZodString>;
    disinfected: z.ZodBoolean;
    movedBy: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    disinfected: boolean;
    note?: string | undefined;
    toHouseId?: string | undefined;
    offFarmDestination?: string | undefined;
    movedBy?: string | undefined;
}, {
    date: string;
    disinfected: boolean;
    note?: string | undefined;
    toHouseId?: string | undefined;
    offFarmDestination?: string | undefined;
    movedBy?: string | undefined;
}>, {
    date: string;
    disinfected: boolean;
    note?: string | undefined;
    toHouseId?: string | undefined;
    offFarmDestination?: string | undefined;
    movedBy?: string | undefined;
}, {
    date: string;
    disinfected: boolean;
    note?: string | undefined;
    toHouseId?: string | undefined;
    offFarmDestination?: string | undefined;
    movedBy?: string | undefined;
}>;
export declare const CleaningScheduleRequest: z.ZodObject<{
    title: z.ZodString;
    activity: z.ZodDefault<z.ZodEnum<["cleaning", "disinfection"]>>;
    schedule: z.ZodEnum<["daily", "weekly", "monthly", "between_flocks", "one_off"]>;
    houseIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    checklistTemplateId: z.ZodOptional<z.ZodString>;
    assigneeUserId: z.ZodOptional<z.ZodString>;
    nextDueDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    title: string;
    activity: "cleaning" | "disinfection";
    schedule: "daily" | "weekly" | "monthly" | "between_flocks" | "one_off";
    notes?: string | undefined;
    houseIds?: string[] | undefined;
    checklistTemplateId?: string | undefined;
    assigneeUserId?: string | undefined;
    nextDueDate?: string | undefined;
}, {
    title: string;
    schedule: "daily" | "weekly" | "monthly" | "between_flocks" | "one_off";
    notes?: string | undefined;
    activity?: "cleaning" | "disinfection" | undefined;
    houseIds?: string[] | undefined;
    checklistTemplateId?: string | undefined;
    assigneeUserId?: string | undefined;
    nextDueDate?: string | undefined;
}>;
export declare const CompleteCleaningRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    houseId: z.ZodOptional<z.ZodString>;
    performedBy: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodObject<{
        inventoryItemId: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        quantityUsed: z.ZodOptional<z.ZodNumber>;
        concentration: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    }, {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    }>>;
    checklist: z.ZodOptional<z.ZodObject<{
        templateId: z.ZodString;
        answers: z.ZodArray<z.ZodObject<{
            itemId: z.ZodString;
            answer: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        }, "strict", z.ZodTypeAny, {
            itemId: string;
            answer: string | number | boolean;
        }, {
            itemId: string;
            answer: string | number | boolean;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    }, {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    }>>;
    details: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
}, {
    date: string;
    details?: string | undefined;
    houseId?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    performedBy?: string | undefined;
    product?: {
        name?: string | undefined;
        inventoryItemId?: string | undefined;
        quantityUsed?: number | undefined;
        concentration?: string | undefined;
    } | undefined;
}>;
export declare const CorrectiveActionRequest: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    assigneeUserId: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high", "urgent"]>>;
    houseId: z.ZodOptional<z.ZodString>;
    flockId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    title: string;
    priority: "low" | "normal" | "high" | "urgent";
    description?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    dueDate?: string | undefined;
    assigneeUserId?: string | undefined;
}, {
    title: string;
    description?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    dueDate?: string | undefined;
    assigneeUserId?: string | undefined;
    priority?: "low" | "normal" | "high" | "urgent" | undefined;
}>;
export declare const CompleteActionRequest: z.ZodObject<{
    resolutionNotes: z.ZodString;
}, "strict", z.ZodTypeAny, {
    resolutionNotes: string;
}, {
    resolutionNotes: string;
}>;
export declare const ActionListQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["open", "in_progress", "done", "cancelled"]>>;
    kind: z.ZodDefault<z.ZodEnum<["corrective_action", "follow_up", "general"]>>;
}, "strip", z.ZodTypeAny, {
    kind: "general" | "corrective_action" | "follow_up";
    status?: "cancelled" | "done" | "open" | "in_progress" | undefined;
}, {
    status?: "cancelled" | "done" | "open" | "in_progress" | undefined;
    kind?: "general" | "corrective_action" | "follow_up" | undefined;
}>;
