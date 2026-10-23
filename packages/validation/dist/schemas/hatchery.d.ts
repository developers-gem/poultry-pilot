import { z } from "zod";
/** HatcheryHub (egg source → delivery), chick orders, ChickStart and the farm calendar. */
export declare const CreateHatcheryBatchRequest: z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    code: z.ZodString;
    species: z.ZodDefault<z.ZodEnum<["chicken", "duck", "turkey", "quail", "guinea_fowl"]>>;
    breed: z.ZodOptional<z.ZodString>;
    eggSource: z.ZodEnum<["own_flock", "purchased"]>;
    sourceFlockId: z.ZodOptional<z.ZodString>;
    /** Own-flock eggs are drawn from this egg grade in stock (default: ungraded). */
    eggGrade: z.ZodOptional<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>>;
    supplier: z.ZodOptional<z.ZodString>;
    eggsReceived: z.ZodNumber;
    /** Eggs not set at selection, by reason. */
    rejects: z.ZodOptional<z.ZodRecord<z.ZodEnum<["cracked", "dirty", "misshapen", "undersized", "oversized", "thin_shell", "other"]>, z.ZodNumber>>;
    setDate: z.ZodEffects<z.ZodString, string, string>;
    /** Defaults to the species' typical period (chicken 21, duck and turkey 28, quail 17, guinea fowl 27). */
    incubationDays: z.ZodOptional<z.ZodNumber>;
    incubatorId: z.ZodOptional<z.ZodString>;
    eggCost: z.ZodOptional<z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>>;
    otherCost: z.ZodOptional<z.ZodObject<{
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
    code: string;
    species: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl";
    eggSource: "purchased" | "own_flock";
    eggsReceived: number;
    setDate: string;
    supplier?: string | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    breed?: string | undefined;
    sourceFlockId?: string | undefined;
    eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    rejects?: Partial<Record<"other" | "cracked" | "dirty" | "misshapen" | "undersized" | "oversized" | "thin_shell", number>> | undefined;
    incubationDays?: number | undefined;
    incubatorId?: string | undefined;
    eggCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    otherCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    code: string;
    eggSource: "purchased" | "own_flock";
    eggsReceived: number;
    setDate: string;
    supplier?: string | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    species?: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl" | undefined;
    breed?: string | undefined;
    sourceFlockId?: string | undefined;
    eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    rejects?: Partial<Record<"other" | "cracked" | "dirty" | "misshapen" | "undersized" | "oversized" | "thin_shell", number>> | undefined;
    incubationDays?: number | undefined;
    incubatorId?: string | undefined;
    eggCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    otherCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>, {
    code: string;
    species: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl";
    eggSource: "purchased" | "own_flock";
    eggsReceived: number;
    setDate: string;
    supplier?: string | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    breed?: string | undefined;
    sourceFlockId?: string | undefined;
    eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    rejects?: Partial<Record<"other" | "cracked" | "dirty" | "misshapen" | "undersized" | "oversized" | "thin_shell", number>> | undefined;
    incubationDays?: number | undefined;
    incubatorId?: string | undefined;
    eggCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    otherCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    code: string;
    eggSource: "purchased" | "own_flock";
    eggsReceived: number;
    setDate: string;
    supplier?: string | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    species?: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl" | undefined;
    breed?: string | undefined;
    sourceFlockId?: string | undefined;
    eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    rejects?: Partial<Record<"other" | "cracked" | "dirty" | "misshapen" | "undersized" | "oversized" | "thin_shell", number>> | undefined;
    incubationDays?: number | undefined;
    incubatorId?: string | undefined;
    eggCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    otherCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>;
export declare const CandlingRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    infertile: z.ZodDefault<z.ZodNumber>;
    deadEmbryo: z.ZodDefault<z.ZodNumber>;
    cracked: z.ZodDefault<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    cracked: number;
    date: string;
    infertile: number;
    deadEmbryo: number;
    note?: string | undefined;
}, {
    date: string;
    cracked?: number | undefined;
    note?: string | undefined;
    infertile?: number | undefined;
    deadEmbryo?: number | undefined;
}>;
export declare const TransferToHatcherRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    cracked: z.ZodDefault<z.ZodNumber>;
    deadEmbryo: z.ZodDefault<z.ZodNumber>;
    hatcherId: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    cracked: number;
    date: string;
    deadEmbryo: number;
    note?: string | undefined;
    hatcherId?: string | undefined;
}, {
    date: string;
    cracked?: number | undefined;
    note?: string | undefined;
    deadEmbryo?: number | undefined;
    hatcherId?: string | undefined;
}>;
/** deadInShell defaults to every egg in the hatcher that did not hatch. */
export declare const HatchRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    hatched: z.ZodNumber;
    deadInShell: z.ZodOptional<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    hatched: number;
    date: string;
    note?: string | undefined;
    deadInShell?: number | undefined;
}, {
    hatched: number;
    date: string;
    note?: string | undefined;
    deadInShell?: number | undefined;
}>;
export declare const GradingRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    saleable: z.ZodNumber;
    culled: z.ZodDefault<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    saleable: number;
    culled: number;
    note?: string | undefined;
}, {
    date: string;
    saleable: number;
    note?: string | undefined;
    culled?: number | undefined;
}>;
export declare const MachineReadingRequest: z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    machine: z.ZodEnum<["setter", "hatcher"]>;
    temperatureC: z.ZodOptional<z.ZodNumber>;
    humidityPercent: z.ZodOptional<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    machine: "hatcher" | "setter";
    note?: string | undefined;
    humidityPercent?: number | undefined;
    temperatureC?: number | undefined;
}, {
    date: string;
    machine: "hatcher" | "setter";
    note?: string | undefined;
    humidityPercent?: number | undefined;
    temperatureC?: number | undefined;
}>, {
    date: string;
    machine: "hatcher" | "setter";
    note?: string | undefined;
    humidityPercent?: number | undefined;
    temperatureC?: number | undefined;
}, {
    date: string;
    machine: "hatcher" | "setter";
    note?: string | undefined;
    humidityPercent?: number | undefined;
    temperatureC?: number | undefined;
}>;
export declare const ReasonRequest: z.ZodObject<{
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const BatchListQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["incubating", "in_hatcher", "hatched", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "cancelled" | "incubating" | "in_hatcher" | "hatched" | undefined;
}, {
    status?: "cancelled" | "incubating" | "in_hatcher" | "hatched" | undefined;
}>;
export declare const HatcherySummaryQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const BuyerRequest: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"]>>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    locationLabel: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "other" | "farm" | "trader" | "retailer" | "restaurant" | "processor" | "individual";
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    locationLabel?: string | undefined;
    notes?: string | undefined;
}, {
    name: string;
    email?: string | undefined;
    type?: "other" | "farm" | "trader" | "retailer" | "restaurant" | "processor" | "individual" | undefined;
    phone?: string | undefined;
    locationLabel?: string | undefined;
    notes?: string | undefined;
}>;
export declare const ChickOrderRequest: z.ZodEffects<z.ZodObject<{
    buyerId: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    requestedDeliveryDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** Order from chicks in stock... */
    chickLotId: z.ZodOptional<z.ZodString>;
    /** ...or book against a batch still incubating. */
    hatcheryBatchId: z.ZodOptional<z.ZodString>;
    deliveryAddress: z.ZodOptional<z.ZodString>;
    fulfilment: z.ZodDefault<z.ZodEnum<["pickup", "seller_delivery", "courier"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    quantity: number;
    buyerId: string;
    unitPrice: {
        currency: string;
        amountMinor: number;
    };
    fulfilment: "pickup" | "seller_delivery" | "courier";
    notes?: string | undefined;
    chickLotId?: string | undefined;
    requestedDeliveryDate?: string | undefined;
    hatcheryBatchId?: string | undefined;
    deliveryAddress?: string | undefined;
}, {
    quantity: number;
    buyerId: string;
    unitPrice: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    chickLotId?: string | undefined;
    requestedDeliveryDate?: string | undefined;
    hatcheryBatchId?: string | undefined;
    deliveryAddress?: string | undefined;
    fulfilment?: "pickup" | "seller_delivery" | "courier" | undefined;
}>, {
    quantity: number;
    buyerId: string;
    unitPrice: {
        currency: string;
        amountMinor: number;
    };
    fulfilment: "pickup" | "seller_delivery" | "courier";
    notes?: string | undefined;
    chickLotId?: string | undefined;
    requestedDeliveryDate?: string | undefined;
    hatcheryBatchId?: string | undefined;
    deliveryAddress?: string | undefined;
}, {
    quantity: number;
    buyerId: string;
    unitPrice: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    chickLotId?: string | undefined;
    requestedDeliveryDate?: string | undefined;
    hatcheryBatchId?: string | undefined;
    deliveryAddress?: string | undefined;
    fulfilment?: "pickup" | "seller_delivery" | "courier" | undefined;
}>;
export declare const DeliverOrderRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    chickLotId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    chickLotId?: string | undefined;
}, {
    date: string;
    chickLotId?: string | undefined;
}>;
export declare const OrderListQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["pending", "accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"]>>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    status?: "cancelled" | "pending" | "accepted" | "preparing" | "dispatched" | "delivered" | "completed" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    status?: "cancelled" | "pending" | "accepted" | "preparing" | "dispatched" | "delivered" | "completed" | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const BroodingProfileRequest: z.ZodObject<{
    name: z.ZodString;
    flockTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>, "many">>;
    bands: z.ZodArray<z.ZodObject<{
        fromDay: z.ZodNumber;
        toDay: z.ZodNumber;
        tempMinC: z.ZodOptional<z.ZodNumber>;
        tempMaxC: z.ZodOptional<z.ZodNumber>;
        humidityMin: z.ZodOptional<z.ZodNumber>;
        humidityMax: z.ZodOptional<z.ZodNumber>;
        targetWeightG: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        fromDay: number;
        toDay: number;
        tempMinC?: number | undefined;
        tempMaxC?: number | undefined;
        humidityMin?: number | undefined;
        humidityMax?: number | undefined;
        targetWeightG?: number | undefined;
    }, {
        fromDay: number;
        toDay: number;
        tempMinC?: number | undefined;
        tempMaxC?: number | undefined;
        humidityMin?: number | undefined;
        humidityMax?: number | undefined;
        targetWeightG?: number | undefined;
    }>, "many">;
    /** Where the targets come from: the breed's management guide or the farm's veterinarian. */
    source: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    name: string;
    bands: {
        fromDay: number;
        toDay: number;
        tempMinC?: number | undefined;
        tempMaxC?: number | undefined;
        humidityMin?: number | undefined;
        humidityMax?: number | undefined;
        targetWeightG?: number | undefined;
    }[];
    isDefault: boolean;
    source?: string | undefined;
    flockTypes?: ("broiler" | "layer" | "breeder" | "chick" | "custom")[] | undefined;
}, {
    name: string;
    bands: {
        fromDay: number;
        toDay: number;
        tempMinC?: number | undefined;
        tempMaxC?: number | undefined;
        humidityMin?: number | undefined;
        humidityMax?: number | undefined;
        targetWeightG?: number | undefined;
    }[];
    source?: string | undefined;
    flockTypes?: ("broiler" | "layer" | "breeder" | "chick" | "custom")[] | undefined;
    isDefault?: boolean | undefined;
}>;
export declare const PlanArrivalRequest: z.ZodObject<{
    houseId: z.ZodString;
    expectedDate: z.ZodEffects<z.ZodString, string, string>;
    expectedCount: z.ZodNumber;
    source: z.ZodEnum<["own_hatchery", "chick_lot", "supplier"]>;
    hatcheryBatchId: z.ZodOptional<z.ZodString>;
    chickLotId: z.ZodOptional<z.ZodString>;
    supplier: z.ZodOptional<z.ZodString>;
    flockType: z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>;
    breed: z.ZodOptional<z.ZodString>;
    broodingProfileId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    source: "own_hatchery" | "supplier" | "chick_lot";
    houseId: string;
    flockType: "broiler" | "layer" | "breeder" | "chick" | "custom";
    expectedDate: string;
    expectedCount: number;
    supplier?: string | undefined;
    notes?: string | undefined;
    chickLotId?: string | undefined;
    breed?: string | undefined;
    hatcheryBatchId?: string | undefined;
    broodingProfileId?: string | undefined;
}, {
    source: "own_hatchery" | "supplier" | "chick_lot";
    houseId: string;
    flockType: "broiler" | "layer" | "breeder" | "chick" | "custom";
    expectedDate: string;
    expectedCount: number;
    supplier?: string | undefined;
    notes?: string | undefined;
    chickLotId?: string | undefined;
    breed?: string | undefined;
    hatcheryBatchId?: string | undefined;
    broodingProfileId?: string | undefined;
}>;
export declare const ArrivalListQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["planned", "arrived", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "planned" | "cancelled" | "arrived" | undefined;
}, {
    status?: "planned" | "cancelled" | "arrived" | undefined;
}>;
export declare const PreparationRequest: z.ZodObject<{
    checklist: z.ZodObject<{
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
}, "strict", z.ZodTypeAny, {
    checklist: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    };
}, {
    checklist: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    };
}>;
export declare const ArriveRequest: z.ZodEffects<z.ZodObject<{
    arrivedAt: z.ZodOptional<z.ZodString>;
    received: z.ZodNumber;
    deadOnArrival: z.ZodDefault<z.ZodNumber>;
    averageWeightG: z.ZodOptional<z.ZodNumber>;
    sampleSize: z.ZodOptional<z.ZodNumber>;
    qualityNotes: z.ZodOptional<z.ZodString>;
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
    flock: z.ZodObject<{
        name: z.ZodString;
        flockCode: z.ZodString;
        chickCost: z.ZodOptional<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodEffects<z.ZodString, string, string>;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            amountMinor: number;
        }, {
            currency: string;
            amountMinor: number;
        }>>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        flockCode: string;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }, {
        name: string;
        flockCode: string;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    flock: {
        name: string;
        flockCode: string;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    };
    received: number;
    deadOnArrival: number;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
    qualityNotes?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    arrivedAt?: string | undefined;
}, {
    flock: {
        name: string;
        flockCode: string;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    };
    received: number;
    deadOnArrival?: number | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
    qualityNotes?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    arrivedAt?: string | undefined;
}>, {
    flock: {
        name: string;
        flockCode: string;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    };
    received: number;
    deadOnArrival: number;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
    qualityNotes?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    arrivedAt?: string | undefined;
}, {
    flock: {
        name: string;
        flockCode: string;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
    };
    received: number;
    deadOnArrival?: number | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
    qualityNotes?: string | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    arrivedAt?: string | undefined;
}>;
export declare const BrooderCheckRequest: z.ZodObject<{
    flockId: z.ZodString;
    checkedAt: z.ZodOptional<z.ZodString>;
    /** Measured at chick height. */
    temperatureC: z.ZodOptional<z.ZodNumber>;
    humidityPercent: z.ZodOptional<z.ZodNumber>;
    behaviour: z.ZodOptional<z.ZodEnum<["comfortable", "huddling", "spread_out", "panting", "avoiding_area"]>>;
    feedAvailable: z.ZodOptional<z.ZodBoolean>;
    waterAvailable: z.ZodOptional<z.ZodBoolean>;
    cropFill: z.ZodOptional<z.ZodObject<{
        sampled: z.ZodNumber;
        full: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        sampled: number;
        full: number;
    }, {
        sampled: number;
        full: number;
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
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    flockId: string;
    notes?: string | undefined;
    humidityPercent?: number | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    temperatureC?: number | undefined;
    checkedAt?: string | undefined;
    behaviour?: "comfortable" | "huddling" | "spread_out" | "panting" | "avoiding_area" | undefined;
    feedAvailable?: boolean | undefined;
    waterAvailable?: boolean | undefined;
    cropFill?: {
        sampled: number;
        full: number;
    } | undefined;
}, {
    flockId: string;
    notes?: string | undefined;
    humidityPercent?: number | undefined;
    checklist?: {
        templateId: string;
        answers: {
            itemId: string;
            answer: string | number | boolean;
        }[];
    } | undefined;
    temperatureC?: number | undefined;
    checkedAt?: string | undefined;
    behaviour?: "comfortable" | "huddling" | "spread_out" | "panting" | "avoiding_area" | undefined;
    feedAvailable?: boolean | undefined;
    waterAvailable?: boolean | undefined;
    cropFill?: {
        sampled: number;
        full: number;
    } | undefined;
}>;
export declare const BroodingViewQuery: z.ZodObject<{
    days: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    days: number;
}, {
    days?: number | undefined;
}>;
export declare const CalendarQuery: z.ZodEffects<z.ZodObject<{
    from: z.ZodEffects<z.ZodString, string, string>;
    to: z.ZodEffects<z.ZodString, string, string>;
    types: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, string[] | undefined, string | undefined>, z.ZodOptional<z.ZodArray<z.ZodEnum<["transfer_expected", "hatch_expected", "chick_delivery", "chick_arrival", "vaccination_due", "cleaning_due", "health_follow_up"]>, "many">>>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    types?: ("vaccination_due" | "health_follow_up" | "transfer_expected" | "hatch_expected" | "chick_delivery" | "chick_arrival" | "cleaning_due")[] | undefined;
}, {
    from: string;
    to: string;
    types?: string | undefined;
}>, {
    from: string;
    to: string;
    types?: ("vaccination_due" | "health_follow_up" | "transfer_expected" | "hatch_expected" | "chick_delivery" | "chick_arrival" | "cleaning_due")[] | undefined;
}, {
    from: string;
    to: string;
    types?: string | undefined;
}>;
