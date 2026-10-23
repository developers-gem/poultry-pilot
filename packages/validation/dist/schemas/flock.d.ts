import { z } from "zod";
/** Flock engine contracts: houses, flocks, lifecycle events, daily records and calculations. */
export declare const CreateHouseRequest: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodEnum<["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"]>;
    capacityBirds: z.ZodOptional<z.ZodNumber>;
    floorAreaM2: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "broiler" | "layer" | "breeder" | "brooder" | "hatchery" | "mixed";
    name: string;
    id?: string | undefined;
    capacityBirds?: number | undefined;
    floorAreaM2?: number | undefined;
    notes?: string | undefined;
}, {
    type: "broiler" | "layer" | "breeder" | "brooder" | "hatchery" | "mixed";
    name: string;
    id?: string | undefined;
    capacityBirds?: number | undefined;
    floorAreaM2?: number | undefined;
    notes?: string | undefined;
}>;
export declare const ReplaceHouseRequest: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodEnum<["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"]>;
    capacityBirds: z.ZodOptional<z.ZodNumber>;
    floorAreaM2: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "id"> & {
    status: z.ZodEnum<["active", "inactive"]>;
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    type: "broiler" | "layer" | "breeder" | "brooder" | "hatchery" | "mixed";
    status: "active" | "inactive";
    version: number;
    name: string;
    capacityBirds?: number | undefined;
    floorAreaM2?: number | undefined;
    notes?: string | undefined;
}, {
    type: "broiler" | "layer" | "breeder" | "brooder" | "hatchery" | "mixed";
    status: "active" | "inactive";
    version: number;
    name: string;
    capacityBirds?: number | undefined;
    floorAreaM2?: number | undefined;
    notes?: string | undefined;
}>;
export declare const HouseView: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["broiler", "layer", "brooder", "breeder", "hatchery", "mixed"]>;
    capacityBirds: z.ZodOptional<z.ZodNumber>;
    floorAreaM2: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<["active", "inactive"]>;
    notes: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "broiler" | "layer" | "breeder" | "brooder" | "hatchery" | "mixed";
    status: "active" | "inactive";
    version: number;
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    capacityBirds?: number | undefined;
    floorAreaM2?: number | undefined;
    notes?: string | undefined;
}, {
    type: "broiler" | "layer" | "breeder" | "brooder" | "hatchery" | "mixed";
    status: "active" | "inactive";
    version: number;
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    capacityBirds?: number | undefined;
    floorAreaM2?: number | undefined;
    notes?: string | undefined;
}>;
export declare const Placement: z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    count: z.ZodNumber;
    deadOnArrival: z.ZodDefault<z.ZodNumber>;
    /** Average weight per bird at placement, grams (e.g. 40 for day-old broiler chicks). */
    startingWeightG: z.ZodOptional<z.ZodNumber>;
    /** Total cost of the birds placed. */
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
    ageDaysAtPlacement: z.ZodDefault<z.ZodNumber>;
    /** Place from a chick lot in inventory: the lot is drawn down, and its unit cost is used if chickCost is not given. */
    chickLotId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    count: number;
    deadOnArrival: number;
    ageDaysAtPlacement: number;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    chickLotId?: string | undefined;
}, {
    date: string;
    count: number;
    deadOnArrival?: number | undefined;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    ageDaysAtPlacement?: number | undefined;
    chickLotId?: string | undefined;
}>, {
    date: string;
    count: number;
    deadOnArrival: number;
    ageDaysAtPlacement: number;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    chickLotId?: string | undefined;
}, {
    date: string;
    count: number;
    deadOnArrival?: number | undefined;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    ageDaysAtPlacement?: number | undefined;
    chickLotId?: string | undefined;
}>;
/** Creating with `placement` places the birds at once (status active); without it the flock is planned. */
/** flockCode is optional on create: left out, the farm numbers it (e.g. B-2610-1 for the first broiler batch of Oct 2026). */
export declare const CreateFlockRequest: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>;
    customTypeName: z.ZodOptional<z.ZodString>;
    species: z.ZodDefault<z.ZodEnum<["chicken", "duck", "turkey", "quail", "guinea_fowl"]>>;
    breed: z.ZodOptional<z.ZodString>;
    strain: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    houseId: z.ZodString;
    hatchDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    targetSaleDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    notes: z.ZodOptional<z.ZodString>;
} & {
    id: z.ZodOptional<z.ZodString>;
    flockCode: z.ZodOptional<z.ZodString>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        date: z.ZodEffects<z.ZodString, string, string>;
        count: z.ZodNumber;
        deadOnArrival: z.ZodDefault<z.ZodNumber>;
        /** Average weight per bird at placement, grams (e.g. 40 for day-old broiler chicks). */
        startingWeightG: z.ZodOptional<z.ZodNumber>;
        /** Total cost of the birds placed. */
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
        ageDaysAtPlacement: z.ZodDefault<z.ZodNumber>;
        /** Place from a chick lot in inventory: the lot is drawn down, and its unit cost is used if chickCost is not given. */
        chickLotId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        date: string;
        count: number;
        deadOnArrival: number;
        ageDaysAtPlacement: number;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        chickLotId?: string | undefined;
    }, {
        date: string;
        count: number;
        deadOnArrival?: number | undefined;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        ageDaysAtPlacement?: number | undefined;
        chickLotId?: string | undefined;
    }>, {
        date: string;
        count: number;
        deadOnArrival: number;
        ageDaysAtPlacement: number;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        chickLotId?: string | undefined;
    }, {
        date: string;
        count: number;
        deadOnArrival?: number | undefined;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        ageDaysAtPlacement?: number | undefined;
        chickLotId?: string | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    type: "broiler" | "layer" | "breeder" | "chick" | "custom";
    name: string;
    species: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl";
    houseId: string;
    placement?: {
        date: string;
        count: number;
        deadOnArrival: number;
        ageDaysAtPlacement: number;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        chickLotId?: string | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    flockCode?: string | undefined;
    customTypeName?: string | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
}, {
    type: "broiler" | "layer" | "breeder" | "chick" | "custom";
    name: string;
    houseId: string;
    placement?: {
        date: string;
        count: number;
        deadOnArrival?: number | undefined;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        ageDaysAtPlacement?: number | undefined;
        chickLotId?: string | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    flockCode?: string | undefined;
    customTypeName?: string | undefined;
    species?: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl" | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
}>, {
    type: "broiler" | "layer" | "breeder" | "chick" | "custom";
    name: string;
    species: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl";
    houseId: string;
    placement?: {
        date: string;
        count: number;
        deadOnArrival: number;
        ageDaysAtPlacement: number;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        chickLotId?: string | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    flockCode?: string | undefined;
    customTypeName?: string | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
}, {
    type: "broiler" | "layer" | "breeder" | "chick" | "custom";
    name: string;
    houseId: string;
    placement?: {
        date: string;
        count: number;
        deadOnArrival?: number | undefined;
        startingWeightG?: number | undefined;
        chickCost?: {
            currency: string;
            amountMinor: number;
        } | undefined;
        ageDaysAtPlacement?: number | undefined;
        chickLotId?: string | undefined;
    } | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    flockCode?: string | undefined;
    customTypeName?: string | undefined;
    species?: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl" | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
}>;
/** PUT: descriptive fields only. Type, house and placement change through their own commands. */
export declare const ReplaceFlockRequest: z.ZodObject<Omit<{
    name: z.ZodString;
    flockCode: z.ZodString;
    type: z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>;
    /** Required when type is custom, e.g. "Kadaknath", "Geese". */
    customTypeName: z.ZodOptional<z.ZodString>;
    species: z.ZodDefault<z.ZodEnum<["chicken", "duck", "turkey", "quail", "guinea_fowl"]>>;
    breed: z.ZodOptional<z.ZodString>;
    strain: z.ZodOptional<z.ZodString>;
    /** Where the birds came from: hatchery or supplier name. */
    source: z.ZodOptional<z.ZodString>;
    houseId: z.ZodString;
    hatchDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    targetSaleDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    notes: z.ZodOptional<z.ZodString>;
}, "type" | "species" | "houseId"> & {
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    version: number;
    name: string;
    flockCode: string;
    notes?: string | undefined;
    customTypeName?: string | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
}, {
    version: number;
    name: string;
    flockCode: string;
    notes?: string | undefined;
    customTypeName?: string | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
}>;
export declare const FlockListQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "closed", "cancelled"]>>;
    houseId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>>;
}, "strip", z.ZodTypeAny, {
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    status?: "planned" | "active" | "closed" | "cancelled" | undefined;
    houseId?: string | undefined;
}, {
    type?: "broiler" | "layer" | "breeder" | "chick" | "custom" | undefined;
    status?: "planned" | "active" | "closed" | "cancelled" | undefined;
    houseId?: string | undefined;
}>;
export declare const PlaceFlockRequest: z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    count: z.ZodNumber;
    deadOnArrival: z.ZodDefault<z.ZodNumber>;
    /** Average weight per bird at placement, grams (e.g. 40 for day-old broiler chicks). */
    startingWeightG: z.ZodOptional<z.ZodNumber>;
    /** Total cost of the birds placed. */
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
    ageDaysAtPlacement: z.ZodDefault<z.ZodNumber>;
    /** Place from a chick lot in inventory: the lot is drawn down, and its unit cost is used if chickCost is not given. */
    chickLotId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    count: number;
    deadOnArrival: number;
    ageDaysAtPlacement: number;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    chickLotId?: string | undefined;
}, {
    date: string;
    count: number;
    deadOnArrival?: number | undefined;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    ageDaysAtPlacement?: number | undefined;
    chickLotId?: string | undefined;
}>, {
    date: string;
    count: number;
    deadOnArrival: number;
    ageDaysAtPlacement: number;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    chickLotId?: string | undefined;
}, {
    date: string;
    count: number;
    deadOnArrival?: number | undefined;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    ageDaysAtPlacement?: number | undefined;
    chickLotId?: string | undefined;
}>;
export declare const MortalityRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    count: z.ZodNumber;
    cause: z.ZodDefault<z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    count: number;
    cause: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other";
    notes?: string | undefined;
}, {
    date: string;
    count: number;
    notes?: string | undefined;
    cause?: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other" | undefined;
}>;
export declare const CullRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    count: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    count: number;
    notes?: string | undefined;
    reason?: string | undefined;
}, {
    date: string;
    count: number;
    notes?: string | undefined;
    reason?: string | undefined;
}>;
export declare const TransferRequest: z.ZodDiscriminatedUnion<"mode", [z.ZodObject<{
    mode: z.ZodLiteral<"house">;
    date: z.ZodEffects<z.ZodString, string, string>;
    toHouseId: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    mode: "house";
    toHouseId: string;
    notes?: string | undefined;
}, {
    date: string;
    mode: "house";
    toHouseId: string;
    notes?: string | undefined;
}>, z.ZodObject<{
    mode: z.ZodLiteral<"flock">;
    date: z.ZodEffects<z.ZodString, string, string>;
    toFlockId: z.ZodString;
    birds: z.ZodNumber;
    totalLiveWeightKg: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    mode: "flock";
    toFlockId: string;
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
}, {
    date: string;
    mode: "flock";
    toFlockId: string;
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
}>]>;
/** Move some birds out into a NEW flock, which inherits type, species, breed, strain and source. */
export declare const SplitRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    birds: z.ZodNumber;
    totalLiveWeightKg: z.ZodOptional<z.ZodNumber>;
    newFlock: z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        flockCode: z.ZodString;
        houseId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        name: string;
        flockCode: string;
        houseId: string;
        id?: string | undefined;
    }, {
        name: string;
        flockCode: string;
        houseId: string;
        id?: string | undefined;
    }>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    birds: number;
    newFlock: {
        name: string;
        flockCode: string;
        houseId: string;
        id?: string | undefined;
    };
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
}, {
    date: string;
    birds: number;
    newFlock: {
        name: string;
        flockCode: string;
        houseId: string;
        id?: string | undefined;
    };
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
}>;
/** Move every remaining bird into another flock of the same type and species; this flock then closes. */
export declare const MergeRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    intoFlockId: z.ZodString;
    totalLiveWeightKg: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    intoFlockId: string;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
}, {
    date: string;
    intoFlockId: string;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
}>;
export declare const SaleRequest: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    birds: z.ZodNumber;
    totalLiveWeightKg: z.ZodOptional<z.ZodNumber>;
    pricePerKg: z.ZodOptional<z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>>;
    pricePerBird: z.ZodOptional<z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>>;
    total: z.ZodOptional<z.ZodObject<{
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
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
    pricePerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    pricePerBird?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    date: string;
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
    pricePerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    pricePerBird?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>, {
    date: string;
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
    pricePerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    pricePerBird?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    date: string;
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
    pricePerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    pricePerBird?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>, {
    date: string;
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
    pricePerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    pricePerBird?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}, {
    date: string;
    birds: number;
    notes?: string | undefined;
    totalLiveWeightKg?: number | undefined;
    pricePerKg?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    pricePerBird?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
}>;
export declare const AdjustmentRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    delta: z.ZodEffects<z.ZodNumber, number, number>;
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    date: string;
    reason: string;
    delta: number;
}, {
    date: string;
    reason: string;
    delta: number;
}>;
export declare const WeighingRequest: z.ZodEffects<z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    /** Individual bird weights in grams (preferred: gives uniformity and CV). */
    weightsG: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    /** Or just the average and how many birds were weighed. */
    averageWeightG: z.ZodOptional<z.ZodNumber>;
    sampleSize: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    notes?: string | undefined;
    weightsG?: number[] | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
}, {
    date: string;
    notes?: string | undefined;
    weightsG?: number[] | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
}>, {
    date: string;
    notes?: string | undefined;
    weightsG?: number[] | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
}, {
    date: string;
    notes?: string | undefined;
    weightsG?: number[] | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
}>;
export declare const CloseFlockRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    notes?: string | undefined;
}, {
    date: string;
    notes?: string | undefined;
}>;
export declare const ReverseEventRequest: z.ZodObject<{
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const DateRangeQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const MetricsQuery: z.ZodObject<{
    asOf: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    /** Live price per kg in minor units, to value birds still on the farm. */
    referencePricePerKgMinor: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    asOf?: string | undefined;
    referencePricePerKgMinor?: number | undefined;
}, {
    asOf?: string | undefined;
    referencePricePerKgMinor?: number | undefined;
}>;
export declare const FlockMetricsView: z.ZodObject<{
    asOf: z.ZodString;
    ageDays: z.ZodNullable<z.ZodNumber>;
    stage: z.ZodNullable<z.ZodString>;
    currentBirdCount: z.ZodNumber;
    placed: z.ZodNumber;
    deadOnArrival: z.ZodNumber;
    transferredIn: z.ZodNumber;
    birdsIn: z.ZodNumber;
    mortalityCount: z.ZodNumber;
    cullCount: z.ZodNumber;
    sold: z.ZodNumber;
    transferredOut: z.ZodNumber;
    adjustments: z.ZodNumber;
    mortalityRate: z.ZodNullable<z.ZodNumber>;
    cullRate: z.ZodNullable<z.ZodNumber>;
    survivalRate: z.ZodNullable<z.ZodNumber>;
    averageWeightG: z.ZodNullable<z.ZodNumber>;
    latestWeighingDate: z.ZodNullable<z.ZodString>;
    dailyWeightGainG: z.ZodNullable<z.ZodNumber>;
    recentDailyWeightGainG: z.ZodNullable<z.ZodNumber>;
    feedConsumedKg: z.ZodNumber;
    feedWastedKg: z.ZodNumber;
    uncostedFeedKg: z.ZodNumber;
    feedPerBirdKg: z.ZodNullable<z.ZodNumber>;
    feedCostMinor: z.ZodNumber;
    feedCostPerBirdMinor: z.ZodNullable<z.ZodNumber>;
    /** Minor units per egg; can be fractional (e.g. 252.4 paise). */
    feedCostPerEggMinor: z.ZodNullable<z.ZodNumber>;
    eggsCollected: z.ZodNumber;
    liveWeightKg: z.ZodNullable<z.ZodNumber>;
    weightProducedKg: z.ZodNullable<z.ZodNumber>;
    /** Liveweight FCR: feed eaten ÷ (live weight + weight sold or moved out). */
    fcr: z.ZodNullable<z.ZodNumber>;
    /** Days with feed recorded out of the flock's days so far; FCR is flagged below 80%. */
    feedDaysRecorded: z.ZodNumber;
    feedDaysExpected: z.ZodNumber;
    /** FCR in doubt: "feed_gaps" (a caution: entries missing or recorded in bulk) or "implausibly_low" (feed or weight wrong; EPEF withheld, not benchmarked). */
    fcrWarning: z.ZodNullable<z.ZodEnum<["feed_gaps", "implausibly_low"]>>;
    /** Feed eaten ÷ weight gained on this farm (excludes the weight birds arrived with). */
    feedPerKgGainKg: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodString;
    revenueMinor: z.ZodNumber;
    cost: z.ZodObject<{
        chickMinor: z.ZodNumber;
        transferredInMinor: z.ZodNumber;
        transferredOutMinor: z.ZodNumber;
        feedMinor: z.ZodNumber;
        otherMinor: z.ZodNumber;
        totalMinor: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        chickMinor: number;
        transferredInMinor: number;
        transferredOutMinor: number;
        feedMinor: number;
        otherMinor: number;
        totalMinor: number;
    }, {
        chickMinor: number;
        transferredInMinor: number;
        transferredOutMinor: number;
        feedMinor: number;
        otherMinor: number;
        totalMinor: number;
    }>;
    profitMinor: z.ZodNumber;
    marginPercent: z.ZodNullable<z.ZodNumber>;
    liveInventoryValueMinor: z.ZodNullable<z.ZodNumber>;
    projectedProfitMinor: z.ZodNullable<z.ZodNumber>;
    projectedMarginPercent: z.ZodNullable<z.ZodNumber>;
    costPerBirdMinor: z.ZodNullable<z.ZodNumber>;
    costPerKgProducedMinor: z.ZodNullable<z.ZodNumber>;
    costsComplete: z.ZodBoolean;
    fcrIncludesMortalityWeight: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    sold: number;
    currency: string;
    fcrIncludesMortalityWeight: boolean;
    deadOnArrival: number;
    averageWeightG: number | null;
    asOf: string;
    ageDays: number | null;
    stage: string | null;
    currentBirdCount: number;
    placed: number;
    transferredIn: number;
    birdsIn: number;
    mortalityCount: number;
    cullCount: number;
    transferredOut: number;
    adjustments: number;
    mortalityRate: number | null;
    cullRate: number | null;
    survivalRate: number | null;
    latestWeighingDate: string | null;
    dailyWeightGainG: number | null;
    recentDailyWeightGainG: number | null;
    feedConsumedKg: number;
    feedWastedKg: number;
    uncostedFeedKg: number;
    feedPerBirdKg: number | null;
    feedCostMinor: number;
    feedCostPerBirdMinor: number | null;
    feedCostPerEggMinor: number | null;
    eggsCollected: number;
    liveWeightKg: number | null;
    weightProducedKg: number | null;
    fcr: number | null;
    feedDaysRecorded: number;
    feedDaysExpected: number;
    fcrWarning: "feed_gaps" | "implausibly_low" | null;
    feedPerKgGainKg: number | null;
    revenueMinor: number;
    cost: {
        chickMinor: number;
        transferredInMinor: number;
        transferredOutMinor: number;
        feedMinor: number;
        otherMinor: number;
        totalMinor: number;
    };
    profitMinor: number;
    marginPercent: number | null;
    liveInventoryValueMinor: number | null;
    projectedProfitMinor: number | null;
    projectedMarginPercent: number | null;
    costPerBirdMinor: number | null;
    costPerKgProducedMinor: number | null;
    costsComplete: boolean;
}, {
    sold: number;
    currency: string;
    fcrIncludesMortalityWeight: boolean;
    deadOnArrival: number;
    averageWeightG: number | null;
    asOf: string;
    ageDays: number | null;
    stage: string | null;
    currentBirdCount: number;
    placed: number;
    transferredIn: number;
    birdsIn: number;
    mortalityCount: number;
    cullCount: number;
    transferredOut: number;
    adjustments: number;
    mortalityRate: number | null;
    cullRate: number | null;
    survivalRate: number | null;
    latestWeighingDate: string | null;
    dailyWeightGainG: number | null;
    recentDailyWeightGainG: number | null;
    feedConsumedKg: number;
    feedWastedKg: number;
    uncostedFeedKg: number;
    feedPerBirdKg: number | null;
    feedCostMinor: number;
    feedCostPerBirdMinor: number | null;
    feedCostPerEggMinor: number | null;
    eggsCollected: number;
    liveWeightKg: number | null;
    weightProducedKg: number | null;
    fcr: number | null;
    feedDaysRecorded: number;
    feedDaysExpected: number;
    fcrWarning: "feed_gaps" | "implausibly_low" | null;
    feedPerKgGainKg: number | null;
    revenueMinor: number;
    cost: {
        chickMinor: number;
        transferredInMinor: number;
        transferredOutMinor: number;
        feedMinor: number;
        otherMinor: number;
        totalMinor: number;
    };
    profitMinor: number;
    marginPercent: number | null;
    liveInventoryValueMinor: number | null;
    projectedProfitMinor: number | null;
    projectedMarginPercent: number | null;
    costPerBirdMinor: number | null;
    costPerKgProducedMinor: number | null;
    costsComplete: boolean;
}>;
export declare const FlockView: z.ZodObject<{
    id: z.ZodString;
    farmId: z.ZodString;
    houseId: z.ZodString;
    name: z.ZodString;
    flockCode: z.ZodString;
    type: z.ZodEnum<["broiler", "layer", "breeder", "chick", "custom"]>;
    customTypeName: z.ZodOptional<z.ZodString>;
    species: z.ZodEnum<["chicken", "duck", "turkey", "quail", "guinea_fowl"]>;
    breed: z.ZodOptional<z.ZodString>;
    strain: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    hatchDate: z.ZodOptional<z.ZodString>;
    placementDate: z.ZodOptional<z.ZodString>;
    placementCount: z.ZodOptional<z.ZodNumber>;
    startingWeightG: z.ZodOptional<z.ZodNumber>;
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
    targetSaleDate: z.ZodOptional<z.ZodString>;
    closedDate: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["planned", "active", "closed", "cancelled"]>;
    splitFromFlockId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    currentBirdCount: z.ZodNumber;
    version: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    metrics: z.ZodOptional<z.ZodObject<{
        asOf: z.ZodString;
        ageDays: z.ZodNullable<z.ZodNumber>;
        stage: z.ZodNullable<z.ZodString>;
        currentBirdCount: z.ZodNumber;
        placed: z.ZodNumber;
        deadOnArrival: z.ZodNumber;
        transferredIn: z.ZodNumber;
        birdsIn: z.ZodNumber;
        mortalityCount: z.ZodNumber;
        cullCount: z.ZodNumber;
        sold: z.ZodNumber;
        transferredOut: z.ZodNumber;
        adjustments: z.ZodNumber;
        mortalityRate: z.ZodNullable<z.ZodNumber>;
        cullRate: z.ZodNullable<z.ZodNumber>;
        survivalRate: z.ZodNullable<z.ZodNumber>;
        averageWeightG: z.ZodNullable<z.ZodNumber>;
        latestWeighingDate: z.ZodNullable<z.ZodString>;
        dailyWeightGainG: z.ZodNullable<z.ZodNumber>;
        recentDailyWeightGainG: z.ZodNullable<z.ZodNumber>;
        feedConsumedKg: z.ZodNumber;
        feedWastedKg: z.ZodNumber;
        uncostedFeedKg: z.ZodNumber;
        feedPerBirdKg: z.ZodNullable<z.ZodNumber>;
        feedCostMinor: z.ZodNumber;
        feedCostPerBirdMinor: z.ZodNullable<z.ZodNumber>;
        /** Minor units per egg; can be fractional (e.g. 252.4 paise). */
        feedCostPerEggMinor: z.ZodNullable<z.ZodNumber>;
        eggsCollected: z.ZodNumber;
        liveWeightKg: z.ZodNullable<z.ZodNumber>;
        weightProducedKg: z.ZodNullable<z.ZodNumber>;
        /** Liveweight FCR: feed eaten ÷ (live weight + weight sold or moved out). */
        fcr: z.ZodNullable<z.ZodNumber>;
        /** Days with feed recorded out of the flock's days so far; FCR is flagged below 80%. */
        feedDaysRecorded: z.ZodNumber;
        feedDaysExpected: z.ZodNumber;
        /** FCR in doubt: "feed_gaps" (a caution: entries missing or recorded in bulk) or "implausibly_low" (feed or weight wrong; EPEF withheld, not benchmarked). */
        fcrWarning: z.ZodNullable<z.ZodEnum<["feed_gaps", "implausibly_low"]>>;
        /** Feed eaten ÷ weight gained on this farm (excludes the weight birds arrived with). */
        feedPerKgGainKg: z.ZodNullable<z.ZodNumber>;
        currency: z.ZodString;
        revenueMinor: z.ZodNumber;
        cost: z.ZodObject<{
            chickMinor: z.ZodNumber;
            transferredInMinor: z.ZodNumber;
            transferredOutMinor: z.ZodNumber;
            feedMinor: z.ZodNumber;
            otherMinor: z.ZodNumber;
            totalMinor: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            chickMinor: number;
            transferredInMinor: number;
            transferredOutMinor: number;
            feedMinor: number;
            otherMinor: number;
            totalMinor: number;
        }, {
            chickMinor: number;
            transferredInMinor: number;
            transferredOutMinor: number;
            feedMinor: number;
            otherMinor: number;
            totalMinor: number;
        }>;
        profitMinor: z.ZodNumber;
        marginPercent: z.ZodNullable<z.ZodNumber>;
        liveInventoryValueMinor: z.ZodNullable<z.ZodNumber>;
        projectedProfitMinor: z.ZodNullable<z.ZodNumber>;
        projectedMarginPercent: z.ZodNullable<z.ZodNumber>;
        costPerBirdMinor: z.ZodNullable<z.ZodNumber>;
        costPerKgProducedMinor: z.ZodNullable<z.ZodNumber>;
        costsComplete: z.ZodBoolean;
        fcrIncludesMortalityWeight: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        sold: number;
        currency: string;
        fcrIncludesMortalityWeight: boolean;
        deadOnArrival: number;
        averageWeightG: number | null;
        asOf: string;
        ageDays: number | null;
        stage: string | null;
        currentBirdCount: number;
        placed: number;
        transferredIn: number;
        birdsIn: number;
        mortalityCount: number;
        cullCount: number;
        transferredOut: number;
        adjustments: number;
        mortalityRate: number | null;
        cullRate: number | null;
        survivalRate: number | null;
        latestWeighingDate: string | null;
        dailyWeightGainG: number | null;
        recentDailyWeightGainG: number | null;
        feedConsumedKg: number;
        feedWastedKg: number;
        uncostedFeedKg: number;
        feedPerBirdKg: number | null;
        feedCostMinor: number;
        feedCostPerBirdMinor: number | null;
        feedCostPerEggMinor: number | null;
        eggsCollected: number;
        liveWeightKg: number | null;
        weightProducedKg: number | null;
        fcr: number | null;
        feedDaysRecorded: number;
        feedDaysExpected: number;
        fcrWarning: "feed_gaps" | "implausibly_low" | null;
        feedPerKgGainKg: number | null;
        revenueMinor: number;
        cost: {
            chickMinor: number;
            transferredInMinor: number;
            transferredOutMinor: number;
            feedMinor: number;
            otherMinor: number;
            totalMinor: number;
        };
        profitMinor: number;
        marginPercent: number | null;
        liveInventoryValueMinor: number | null;
        projectedProfitMinor: number | null;
        projectedMarginPercent: number | null;
        costPerBirdMinor: number | null;
        costPerKgProducedMinor: number | null;
        costsComplete: boolean;
    }, {
        sold: number;
        currency: string;
        fcrIncludesMortalityWeight: boolean;
        deadOnArrival: number;
        averageWeightG: number | null;
        asOf: string;
        ageDays: number | null;
        stage: string | null;
        currentBirdCount: number;
        placed: number;
        transferredIn: number;
        birdsIn: number;
        mortalityCount: number;
        cullCount: number;
        transferredOut: number;
        adjustments: number;
        mortalityRate: number | null;
        cullRate: number | null;
        survivalRate: number | null;
        latestWeighingDate: string | null;
        dailyWeightGainG: number | null;
        recentDailyWeightGainG: number | null;
        feedConsumedKg: number;
        feedWastedKg: number;
        uncostedFeedKg: number;
        feedPerBirdKg: number | null;
        feedCostMinor: number;
        feedCostPerBirdMinor: number | null;
        feedCostPerEggMinor: number | null;
        eggsCollected: number;
        liveWeightKg: number | null;
        weightProducedKg: number | null;
        fcr: number | null;
        feedDaysRecorded: number;
        feedDaysExpected: number;
        fcrWarning: "feed_gaps" | "implausibly_low" | null;
        feedPerKgGainKg: number | null;
        revenueMinor: number;
        cost: {
            chickMinor: number;
            transferredInMinor: number;
            transferredOutMinor: number;
            feedMinor: number;
            otherMinor: number;
            totalMinor: number;
        };
        profitMinor: number;
        marginPercent: number | null;
        liveInventoryValueMinor: number | null;
        projectedProfitMinor: number | null;
        projectedMarginPercent: number | null;
        costPerBirdMinor: number | null;
        costPerKgProducedMinor: number | null;
        costsComplete: boolean;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "broiler" | "layer" | "breeder" | "chick" | "custom";
    status: "planned" | "active" | "closed" | "cancelled";
    version: number;
    name: string;
    id: string;
    createdAt: string;
    farmId: string;
    updatedAt: string;
    flockCode: string;
    species: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl";
    houseId: string;
    currentBirdCount: number;
    notes?: string | undefined;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    customTypeName?: string | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
    placementDate?: string | undefined;
    placementCount?: number | undefined;
    closedDate?: string | undefined;
    splitFromFlockId?: string | undefined;
    metrics?: {
        sold: number;
        currency: string;
        fcrIncludesMortalityWeight: boolean;
        deadOnArrival: number;
        averageWeightG: number | null;
        asOf: string;
        ageDays: number | null;
        stage: string | null;
        currentBirdCount: number;
        placed: number;
        transferredIn: number;
        birdsIn: number;
        mortalityCount: number;
        cullCount: number;
        transferredOut: number;
        adjustments: number;
        mortalityRate: number | null;
        cullRate: number | null;
        survivalRate: number | null;
        latestWeighingDate: string | null;
        dailyWeightGainG: number | null;
        recentDailyWeightGainG: number | null;
        feedConsumedKg: number;
        feedWastedKg: number;
        uncostedFeedKg: number;
        feedPerBirdKg: number | null;
        feedCostMinor: number;
        feedCostPerBirdMinor: number | null;
        feedCostPerEggMinor: number | null;
        eggsCollected: number;
        liveWeightKg: number | null;
        weightProducedKg: number | null;
        fcr: number | null;
        feedDaysRecorded: number;
        feedDaysExpected: number;
        fcrWarning: "feed_gaps" | "implausibly_low" | null;
        feedPerKgGainKg: number | null;
        revenueMinor: number;
        cost: {
            chickMinor: number;
            transferredInMinor: number;
            transferredOutMinor: number;
            feedMinor: number;
            otherMinor: number;
            totalMinor: number;
        };
        profitMinor: number;
        marginPercent: number | null;
        liveInventoryValueMinor: number | null;
        projectedProfitMinor: number | null;
        projectedMarginPercent: number | null;
        costPerBirdMinor: number | null;
        costPerKgProducedMinor: number | null;
        costsComplete: boolean;
    } | undefined;
}, {
    type: "broiler" | "layer" | "breeder" | "chick" | "custom";
    status: "planned" | "active" | "closed" | "cancelled";
    version: number;
    name: string;
    id: string;
    createdAt: string;
    farmId: string;
    updatedAt: string;
    flockCode: string;
    species: "chicken" | "duck" | "turkey" | "quail" | "guinea_fowl";
    houseId: string;
    currentBirdCount: number;
    notes?: string | undefined;
    startingWeightG?: number | undefined;
    chickCost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    customTypeName?: string | undefined;
    breed?: string | undefined;
    strain?: string | undefined;
    source?: string | undefined;
    hatchDate?: string | undefined;
    targetSaleDate?: string | undefined;
    placementDate?: string | undefined;
    placementCount?: number | undefined;
    closedDate?: string | undefined;
    splitFromFlockId?: string | undefined;
    metrics?: {
        sold: number;
        currency: string;
        fcrIncludesMortalityWeight: boolean;
        deadOnArrival: number;
        averageWeightG: number | null;
        asOf: string;
        ageDays: number | null;
        stage: string | null;
        currentBirdCount: number;
        placed: number;
        transferredIn: number;
        birdsIn: number;
        mortalityCount: number;
        cullCount: number;
        transferredOut: number;
        adjustments: number;
        mortalityRate: number | null;
        cullRate: number | null;
        survivalRate: number | null;
        latestWeighingDate: string | null;
        dailyWeightGainG: number | null;
        recentDailyWeightGainG: number | null;
        feedConsumedKg: number;
        feedWastedKg: number;
        uncostedFeedKg: number;
        feedPerBirdKg: number | null;
        feedCostMinor: number;
        feedCostPerBirdMinor: number | null;
        feedCostPerEggMinor: number | null;
        eggsCollected: number;
        liveWeightKg: number | null;
        weightProducedKg: number | null;
        fcr: number | null;
        feedDaysRecorded: number;
        feedDaysExpected: number;
        fcrWarning: "feed_gaps" | "implausibly_low" | null;
        feedPerKgGainKg: number | null;
        revenueMinor: number;
        cost: {
            chickMinor: number;
            transferredInMinor: number;
            transferredOutMinor: number;
            feedMinor: number;
            otherMinor: number;
            totalMinor: number;
        };
        profitMinor: number;
        marginPercent: number | null;
        liveInventoryValueMinor: number | null;
        projectedProfitMinor: number | null;
        projectedMarginPercent: number | null;
        costPerBirdMinor: number | null;
        costPerKgProducedMinor: number | null;
        costsComplete: boolean;
    } | undefined;
}>;
export declare const FlockEventView: z.ZodObject<{
    id: z.ZodString;
    flockId: z.ZodString;
    type: z.ZodEnum<["placement", "mortality", "cull", "transfer_out", "transfer_in", "transfer_house", "split_out", "split_in", "merge_out", "merge_in", "adjustment", "sale", "weighing", "status_change"]>;
    date: z.ZodString;
    birds: z.ZodOptional<z.ZodNumber>;
    deadOnArrival: z.ZodOptional<z.ZodNumber>;
    delta: z.ZodOptional<z.ZodNumber>;
    cause: z.ZodOptional<z.ZodEnum<["unknown", "found_dead", "predator", "heat_stress", "injury", "suspected_disease", "other"]>>;
    totalLiveWeightKg: z.ZodOptional<z.ZodNumber>;
    averageWeightG: z.ZodOptional<z.ZodNumber>;
    sampleSize: z.ZodOptional<z.ZodNumber>;
    total: z.ZodOptional<z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>>;
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
    counterpartFlockId: z.ZodOptional<z.ZodString>;
    fromHouseId: z.ZodOptional<z.ZodString>;
    toHouseId: z.ZodOptional<z.ZodString>;
    groupId: z.ZodOptional<z.ZodString>;
    dailyRecordId: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    reversalOf: z.ZodOptional<z.ZodString>;
    reversed: z.ZodBoolean;
    createdBy: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "placement" | "mortality" | "cull" | "transfer_out" | "transfer_in" | "transfer_house" | "split_out" | "split_in" | "merge_out" | "merge_in" | "adjustment" | "sale" | "weighing" | "status_change";
    date: string;
    id: string;
    createdAt: string;
    flockId: string;
    reversed: boolean;
    createdBy: string;
    deadOnArrival?: number | undefined;
    cause?: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other" | undefined;
    reason?: string | undefined;
    toHouseId?: string | undefined;
    birds?: number | undefined;
    totalLiveWeightKg?: number | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    delta?: number | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    counterpartFlockId?: string | undefined;
    fromHouseId?: string | undefined;
    groupId?: string | undefined;
    dailyRecordId?: string | undefined;
    reversalOf?: string | undefined;
}, {
    type: "placement" | "mortality" | "cull" | "transfer_out" | "transfer_in" | "transfer_house" | "split_out" | "split_in" | "merge_out" | "merge_in" | "adjustment" | "sale" | "weighing" | "status_change";
    date: string;
    id: string;
    createdAt: string;
    flockId: string;
    reversed: boolean;
    createdBy: string;
    deadOnArrival?: number | undefined;
    cause?: "unknown" | "found_dead" | "predator" | "heat_stress" | "injury" | "suspected_disease" | "other" | undefined;
    reason?: string | undefined;
    toHouseId?: string | undefined;
    birds?: number | undefined;
    totalLiveWeightKg?: number | undefined;
    total?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    delta?: number | undefined;
    averageWeightG?: number | undefined;
    sampleSize?: number | undefined;
    cost?: {
        currency: string;
        amountMinor: number;
    } | undefined;
    counterpartFlockId?: string | undefined;
    fromHouseId?: string | undefined;
    groupId?: string | undefined;
    dailyRecordId?: string | undefined;
    reversalOf?: string | undefined;
}>;
