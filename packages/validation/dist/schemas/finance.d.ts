import { z } from "zod";
export declare const SupplierRequest: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    taxId: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    taxId?: string | undefined;
    address?: string | undefined;
}, {
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    taxId?: string | undefined;
    address?: string | undefined;
}>;
export declare const MoneyAccountRequest: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["cash", "bank", "mobile_money", "other"]>;
    openingBalance: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    openingDate: z.ZodEffects<z.ZodString, string, string>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    type: "other" | "cash" | "mobile_money" | "bank";
    name: string;
    openingBalance: {
        currency: string;
        amountMinor: number;
    };
    openingDate: string;
    notes?: string | undefined;
}, {
    type: "other" | "cash" | "mobile_money" | "bank";
    name: string;
    openingBalance: {
        currency: string;
        amountMinor: number;
    };
    openingDate: string;
    notes?: string | undefined;
}>;
export declare const ExpenseRequest: z.ZodObject<{
    kind: z.ZodDefault<z.ZodEnum<["expense", "purchase"]>>;
    category: z.ZodEnum<["stock_purchase", "feed", "medicine_vaccine", "vet_services", "labour", "electricity", "water", "fuel_transport", "litter_bedding", "rent", "maintenance", "licences_fees", "equipment", "other_expense"]>;
    supplierId: z.ZodOptional<z.ZodString>;
    vendor: z.ZodOptional<z.ZodString>;
    /** Save even though a bill with the same amount exists within 3 days (after the person has checked it). */
    allowDuplicate: z.ZodOptional<z.ZodBoolean>;
    date: z.ZodEffects<z.ZodString, string, string>;
    dueDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodString;
    /** Amount entered: with `tax.inclusive` it includes tax, otherwise tax is added on top. */
    amount: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    tax: z.ZodOptional<z.ZodObject<{
        ratePercent: z.ZodNumber;
        inclusive: z.ZodBoolean;
        label: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    }, {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    }>>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    invoiceNumber: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        name?: string | undefined;
    }, {
        assetId: string;
        name?: string | undefined;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    paidNow: z.ZodOptional<z.ZodObject<{
        accountId: z.ZodString;
        method: z.ZodEnum<["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"]>;
        reference: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    }, {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    date: string;
    description: string;
    kind: "expense" | "purchase";
    category: "stock_purchase" | "feed" | "medicine_vaccine" | "vet_services" | "labour" | "electricity" | "water" | "fuel_transport" | "litter_bedding" | "rent" | "maintenance" | "licences_fees" | "equipment" | "other_expense";
    amount: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    supplierId?: string | undefined;
    invoiceNumber?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    dueDate?: string | undefined;
    vendor?: string | undefined;
    allowDuplicate?: boolean | undefined;
    tax?: {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    } | undefined;
    paidNow?: {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    } | undefined;
}, {
    date: string;
    description: string;
    category: "stock_purchase" | "feed" | "medicine_vaccine" | "vet_services" | "labour" | "electricity" | "water" | "fuel_transport" | "litter_bedding" | "rent" | "maintenance" | "licences_fees" | "equipment" | "other_expense";
    amount: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    kind?: "expense" | "purchase" | undefined;
    supplierId?: string | undefined;
    invoiceNumber?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    dueDate?: string | undefined;
    vendor?: string | undefined;
    allowDuplicate?: boolean | undefined;
    tax?: {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    } | undefined;
    paidNow?: {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    } | undefined;
}>;
export declare const IncomeRequest: z.ZodObject<{
    kind: z.ZodDefault<z.ZodEnum<["sale", "income"]>>;
    category: z.ZodEnum<["bird_sales", "egg_sales", "chick_sales", "manure_sales", "other_income"]>;
    buyerId: z.ZodOptional<z.ZodString>;
    customerName: z.ZodOptional<z.ZodString>;
    date: z.ZodEffects<z.ZodString, string, string>;
    dueDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodString;
    /** Amount entered: with `tax.inclusive` it includes tax, otherwise tax is added on top. */
    amount: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    tax: z.ZodOptional<z.ZodObject<{
        ratePercent: z.ZodNumber;
        inclusive: z.ZodBoolean;
        label: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    }, {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    }>>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    invoiceNumber: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        assetId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        assetId: string;
        name?: string | undefined;
    }, {
        assetId: string;
        name?: string | undefined;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    paidNow: z.ZodOptional<z.ZodObject<{
        accountId: z.ZodString;
        method: z.ZodEnum<["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"]>;
        reference: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    }, {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    date: string;
    description: string;
    kind: "income" | "sale";
    category: "bird_sales" | "egg_sales" | "chick_sales" | "manure_sales" | "other_income";
    amount: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    invoiceNumber?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    dueDate?: string | undefined;
    buyerId?: string | undefined;
    tax?: {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    } | undefined;
    paidNow?: {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    } | undefined;
    customerName?: string | undefined;
}, {
    date: string;
    description: string;
    category: "bird_sales" | "egg_sales" | "chick_sales" | "manure_sales" | "other_income";
    amount: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    kind?: "income" | "sale" | undefined;
    invoiceNumber?: string | undefined;
    attachments?: {
        assetId: string;
        name?: string | undefined;
    }[] | undefined;
    dueDate?: string | undefined;
    buyerId?: string | undefined;
    tax?: {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    } | undefined;
    paidNow?: {
        method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
        accountId: string;
        reference?: string | undefined;
    } | undefined;
    customerName?: string | undefined;
}>;
export declare const DocumentListQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["unpaid", "partially_paid", "paid", "cancelled"]>>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "cancelled" | "unpaid" | "partially_paid" | "paid" | undefined;
    houseId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}, {
    status?: "cancelled" | "unpaid" | "partially_paid" | "paid" | undefined;
    limit?: number | undefined;
    houseId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    flockId?: string | undefined;
}>;
export declare const PaymentRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    amount: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    accountId: z.ZodString;
    method: z.ZodEnum<["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"]>;
    reference: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
    accountId: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
    note?: string | undefined;
    reference?: string | undefined;
}, {
    date: string;
    method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
    accountId: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
    note?: string | undefined;
    reference?: string | undefined;
}>;
export declare const RefundRequest: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    amount: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    accountId: z.ZodString;
    method: z.ZodEnum<["cash", "bank_transfer", "mobile_money", "upi", "card", "cheque", "other"]>;
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    date: string;
    reason: string;
    method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
    accountId: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
}, {
    date: string;
    reason: string;
    method: "other" | "cash" | "bank_transfer" | "mobile_money" | "upi" | "card" | "cheque";
    accountId: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
}>;
export declare const TransferRequestMoney: z.ZodObject<{
    date: z.ZodEffects<z.ZodString, string, string>;
    fromAccountId: z.ZodString;
    toAccountId: z.ZodString;
    amount: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    reference: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
    fromAccountId: string;
    toAccountId: string;
    description?: string | undefined;
    reference?: string | undefined;
}, {
    date: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
    fromAccountId: string;
    toAccountId: string;
    description?: string | undefined;
    reference?: string | undefined;
}>;
export declare const LedgerQuery: z.ZodObject<{
    accountId: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    from?: string | undefined;
    to?: string | undefined;
    accountId?: string | undefined;
}, {
    limit?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
    accountId?: string | undefined;
}>;
export declare const RecurringExpenseRequest: z.ZodObject<{
    name: z.ZodString;
    category: z.ZodEnum<["stock_purchase", "feed", "medicine_vaccine", "vet_services", "labour", "electricity", "water", "fuel_transport", "litter_bedding", "rent", "maintenance", "licences_fees", "equipment", "other_expense"]>;
    supplierId: z.ZodOptional<z.ZodString>;
    vendor: z.ZodOptional<z.ZodString>;
    amount: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    tax: z.ZodOptional<z.ZodObject<{
        ratePercent: z.ZodNumber;
        inclusive: z.ZodBoolean;
        label: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    }, {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    }>>;
    frequency: z.ZodEnum<["daily", "weekly", "monthly", "quarterly", "yearly"]>;
    startDate: z.ZodEffects<z.ZodString, string, string>;
    endDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    name: string;
    category: "stock_purchase" | "feed" | "medicine_vaccine" | "vet_services" | "labour" | "electricity" | "water" | "fuel_transport" | "litter_bedding" | "rent" | "maintenance" | "licences_fees" | "equipment" | "other_expense";
    frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    startDate: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    supplierId?: string | undefined;
    vendor?: string | undefined;
    tax?: {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    } | undefined;
    endDate?: string | undefined;
}, {
    name: string;
    category: "stock_purchase" | "feed" | "medicine_vaccine" | "vet_services" | "labour" | "electricity" | "water" | "fuel_transport" | "litter_bedding" | "rent" | "maintenance" | "licences_fees" | "equipment" | "other_expense";
    frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    startDate: string;
    amount: {
        currency: string;
        amountMinor: number;
    };
    notes?: string | undefined;
    houseId?: string | undefined;
    flockId?: string | undefined;
    supplierId?: string | undefined;
    vendor?: string | undefined;
    tax?: {
        inclusive: boolean;
        ratePercent: number;
        label?: string | undefined;
    } | undefined;
    endDate?: string | undefined;
}>;
export declare const PauseRequest: z.ZodObject<{
    from: z.ZodEffects<z.ZodString, string, string>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strict", z.ZodTypeAny, {
    from: string;
    to?: string | undefined;
}, {
    from: string;
    to?: string | undefined;
}>;
export declare const PeriodQuery: z.ZodEffects<z.ZodObject<{
    from: z.ZodEffects<z.ZodString, string, string>;
    to: z.ZodEffects<z.ZodString, string, string>;
    flockId: z.ZodOptional<z.ZodString>;
    houseId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
    houseId?: string | undefined;
    flockId?: string | undefined;
}, {
    from: string;
    to: string;
    houseId?: string | undefined;
    flockId?: string | undefined;
}>, {
    from: string;
    to: string;
    houseId?: string | undefined;
    flockId?: string | undefined;
}, {
    from: string;
    to: string;
    houseId?: string | undefined;
    flockId?: string | undefined;
}>;
export declare const OptionalPeriodQuery: z.ZodObject<{
    from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
}>;
export declare const ProfitabilityQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["planned", "active", "closed", "cancelled"]>>;
    flockId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "planned" | "active" | "closed" | "cancelled" | undefined;
    flockId?: string | undefined;
}, {
    status?: "planned" | "active" | "closed" | "cancelled" | undefined;
    flockId?: string | undefined;
}>;
export declare const ListingRequest: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    category: z.ZodEnum<["live_birds", "dressed_birds", "eggs", "day_old_chicks", "hatching_eggs", "manure", "other"]>;
    product: z.ZodOptional<z.ZodEnum<["live_broiler", "dressed_broiler", "table_eggs", "day_old_chick_broiler", "day_old_chick_layer", "spent_hen", "maize", "soybean_meal", "broiler_feed", "layer_feed"]>>;
    description: z.ZodOptional<z.ZodString>;
    quantityAvailable: z.ZodNumber;
    minOrderQuantity: z.ZodOptional<z.ZodNumber>;
    unit: z.ZodString;
    /** Price per unit; buyers always pay this price. */
    price: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    priceUnit: z.ZodEnum<["per_kg", "per_bird", "per_egg", "per_tray", "per_dozen", "per_tonne", "per_bag"]>;
    /** Defaults to the farm's country. */
    regionCode: z.ZodOptional<z.ZodString>;
    locationLabel: z.ZodOptional<z.ZodString>;
    availableFrom: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    availableUntil: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    fulfilmentOptions: z.ZodArray<z.ZodEnum<["pickup", "seller_delivery", "courier"]>, "many">;
    photos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Link to stock so delivery moves it: eggs (grade), a chick lot, or a flock (live birds). */
    source: z.ZodOptional<z.ZodObject<{
        kind: z.ZodEnum<["eggs", "chick_lot", "flock"]>;
        eggGrade: z.ZodOptional<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>>;
        chickLotId: z.ZodOptional<z.ZodString>;
        flockId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    }, {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    unit: string;
    category: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure";
    title: string;
    quantityAvailable: number;
    price: {
        currency: string;
        amountMinor: number;
    };
    priceUnit: "per_kg" | "per_bird" | "per_egg" | "per_tray" | "per_dozen" | "per_tonne" | "per_bag";
    fulfilmentOptions: ("pickup" | "seller_delivery" | "courier")[];
    description?: string | undefined;
    locationLabel?: string | undefined;
    source?: {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    } | undefined;
    photos?: string[] | undefined;
    product?: "live_broiler" | "dressed_broiler" | "table_eggs" | "day_old_chick_broiler" | "day_old_chick_layer" | "spent_hen" | "maize" | "soybean_meal" | "broiler_feed" | "layer_feed" | undefined;
    minOrderQuantity?: number | undefined;
    regionCode?: string | undefined;
    availableFrom?: string | undefined;
    availableUntil?: string | undefined;
}, {
    unit: string;
    category: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure";
    title: string;
    quantityAvailable: number;
    price: {
        currency: string;
        amountMinor: number;
    };
    priceUnit: "per_kg" | "per_bird" | "per_egg" | "per_tray" | "per_dozen" | "per_tonne" | "per_bag";
    fulfilmentOptions: ("pickup" | "seller_delivery" | "courier")[];
    description?: string | undefined;
    locationLabel?: string | undefined;
    source?: {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    } | undefined;
    photos?: string[] | undefined;
    product?: "live_broiler" | "dressed_broiler" | "table_eggs" | "day_old_chick_broiler" | "day_old_chick_layer" | "spent_hen" | "maize" | "soybean_meal" | "broiler_feed" | "layer_feed" | undefined;
    minOrderQuantity?: number | undefined;
    regionCode?: string | undefined;
    availableFrom?: string | undefined;
    availableUntil?: string | undefined;
}>, {
    unit: string;
    category: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure";
    title: string;
    quantityAvailable: number;
    price: {
        currency: string;
        amountMinor: number;
    };
    priceUnit: "per_kg" | "per_bird" | "per_egg" | "per_tray" | "per_dozen" | "per_tonne" | "per_bag";
    fulfilmentOptions: ("pickup" | "seller_delivery" | "courier")[];
    description?: string | undefined;
    locationLabel?: string | undefined;
    source?: {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    } | undefined;
    photos?: string[] | undefined;
    product?: "live_broiler" | "dressed_broiler" | "table_eggs" | "day_old_chick_broiler" | "day_old_chick_layer" | "spent_hen" | "maize" | "soybean_meal" | "broiler_feed" | "layer_feed" | undefined;
    minOrderQuantity?: number | undefined;
    regionCode?: string | undefined;
    availableFrom?: string | undefined;
    availableUntil?: string | undefined;
}, {
    unit: string;
    category: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure";
    title: string;
    quantityAvailable: number;
    price: {
        currency: string;
        amountMinor: number;
    };
    priceUnit: "per_kg" | "per_bird" | "per_egg" | "per_tray" | "per_dozen" | "per_tonne" | "per_bag";
    fulfilmentOptions: ("pickup" | "seller_delivery" | "courier")[];
    description?: string | undefined;
    locationLabel?: string | undefined;
    source?: {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    } | undefined;
    photos?: string[] | undefined;
    product?: "live_broiler" | "dressed_broiler" | "table_eggs" | "day_old_chick_broiler" | "day_old_chick_layer" | "spent_hen" | "maize" | "soybean_meal" | "broiler_feed" | "layer_feed" | undefined;
    minOrderQuantity?: number | undefined;
    regionCode?: string | undefined;
    availableFrom?: string | undefined;
    availableUntil?: string | undefined;
}>;
export declare const UpdateListingRequest: z.ZodObject<{
    title: z.ZodString;
    category: z.ZodEnum<["live_birds", "dressed_birds", "eggs", "day_old_chicks", "hatching_eggs", "manure", "other"]>;
    product: z.ZodOptional<z.ZodEnum<["live_broiler", "dressed_broiler", "table_eggs", "day_old_chick_broiler", "day_old_chick_layer", "spent_hen", "maize", "soybean_meal", "broiler_feed", "layer_feed"]>>;
    description: z.ZodOptional<z.ZodString>;
    quantityAvailable: z.ZodNumber;
    minOrderQuantity: z.ZodOptional<z.ZodNumber>;
    unit: z.ZodString;
    /** Price per unit; buyers always pay this price. */
    price: z.ZodObject<{
        amountMinor: z.ZodNumber;
        currency: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amountMinor: number;
    }, {
        currency: string;
        amountMinor: number;
    }>;
    priceUnit: z.ZodEnum<["per_kg", "per_bird", "per_egg", "per_tray", "per_dozen", "per_tonne", "per_bag"]>;
    /** Defaults to the farm's country. */
    regionCode: z.ZodOptional<z.ZodString>;
    locationLabel: z.ZodOptional<z.ZodString>;
    availableFrom: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    availableUntil: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    fulfilmentOptions: z.ZodArray<z.ZodEnum<["pickup", "seller_delivery", "courier"]>, "many">;
    photos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Link to stock so delivery moves it: eggs (grade), a chick lot, or a flock (live birds). */
    source: z.ZodOptional<z.ZodObject<{
        kind: z.ZodEnum<["eggs", "chick_lot", "flock"]>;
        eggGrade: z.ZodOptional<z.ZodEnum<["large", "medium", "small", "cracked", "dirty", "double_yolk"]>>;
        chickLotId: z.ZodOptional<z.ZodString>;
        flockId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    }, {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    }>>;
} & {
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    unit: string;
    version: number;
    category: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure";
    title: string;
    quantityAvailable: number;
    price: {
        currency: string;
        amountMinor: number;
    };
    priceUnit: "per_kg" | "per_bird" | "per_egg" | "per_tray" | "per_dozen" | "per_tonne" | "per_bag";
    fulfilmentOptions: ("pickup" | "seller_delivery" | "courier")[];
    description?: string | undefined;
    locationLabel?: string | undefined;
    source?: {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    } | undefined;
    photos?: string[] | undefined;
    product?: "live_broiler" | "dressed_broiler" | "table_eggs" | "day_old_chick_broiler" | "day_old_chick_layer" | "spent_hen" | "maize" | "soybean_meal" | "broiler_feed" | "layer_feed" | undefined;
    minOrderQuantity?: number | undefined;
    regionCode?: string | undefined;
    availableFrom?: string | undefined;
    availableUntil?: string | undefined;
}, {
    unit: string;
    version: number;
    category: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure";
    title: string;
    quantityAvailable: number;
    price: {
        currency: string;
        amountMinor: number;
    };
    priceUnit: "per_kg" | "per_bird" | "per_egg" | "per_tray" | "per_dozen" | "per_tonne" | "per_bag";
    fulfilmentOptions: ("pickup" | "seller_delivery" | "courier")[];
    description?: string | undefined;
    locationLabel?: string | undefined;
    source?: {
        kind: "eggs" | "flock" | "chick_lot";
        chickLotId?: string | undefined;
        flockId?: string | undefined;
        eggGrade?: "large" | "medium" | "small" | "cracked" | "dirty" | "double_yolk" | undefined;
    } | undefined;
    photos?: string[] | undefined;
    product?: "live_broiler" | "dressed_broiler" | "table_eggs" | "day_old_chick_broiler" | "day_old_chick_layer" | "spent_hen" | "maize" | "soybean_meal" | "broiler_feed" | "layer_feed" | undefined;
    minOrderQuantity?: number | undefined;
    regionCode?: string | undefined;
    availableFrom?: string | undefined;
    availableUntil?: string | undefined;
}>;
export declare const ListingStatusRequest: z.ZodObject<{
    status: z.ZodEnum<["active", "paused", "closed"]>;
}, "strict", z.ZodTypeAny, {
    status: "active" | "closed" | "paused";
}, {
    status: "active" | "closed" | "paused";
}>;
export declare const MyListingsQuery: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["draft", "active", "paused", "sold_out", "closed"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "closed" | "draft" | "paused" | "sold_out" | undefined;
}, {
    status?: "active" | "closed" | "draft" | "paused" | "sold_out" | undefined;
}>;
export declare const BrowseQuery: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["live_birds", "dressed_birds", "eggs", "day_old_chicks", "hatching_eggs", "manure", "other"]>>;
    region: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    category?: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure" | undefined;
    region?: string | undefined;
    q?: string | undefined;
}, {
    limit?: number | undefined;
    category?: "other" | "live_birds" | "dressed_birds" | "eggs" | "day_old_chicks" | "hatching_eggs" | "manure" | undefined;
    region?: string | undefined;
    q?: string | undefined;
}>;
export declare const PlaceOrderRequest: z.ZodObject<{
    listingId: z.ZodString;
    quantity: z.ZodNumber;
    fulfilment: z.ZodEnum<["pickup", "seller_delivery", "courier"]>;
    deliveryAddress: z.ZodOptional<z.ZodString>;
    /** Defaults to the signed-in person's name. */
    buyerName: z.ZodOptional<z.ZodString>;
    buyerPhone: z.ZodOptional<z.ZodString>;
    /** Buying for one of your farms. */
    buyerFarmId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    quantity: number;
    fulfilment: "pickup" | "seller_delivery" | "courier";
    listingId: string;
    notes?: string | undefined;
    deliveryAddress?: string | undefined;
    buyerName?: string | undefined;
    buyerPhone?: string | undefined;
    buyerFarmId?: string | undefined;
}, {
    quantity: number;
    fulfilment: "pickup" | "seller_delivery" | "courier";
    listingId: string;
    notes?: string | undefined;
    deliveryAddress?: string | undefined;
    buyerName?: string | undefined;
    buyerPhone?: string | undefined;
    buyerFarmId?: string | undefined;
}>;
export declare const OrderListQueryMarket: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["pending", "accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"]>>;
    channel: z.ZodOptional<z.ZodEnum<["direct", "marketplace"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "cancelled" | "pending" | "accepted" | "preparing" | "dispatched" | "delivered" | "completed" | undefined;
    channel?: "direct" | "marketplace" | undefined;
}, {
    status?: "cancelled" | "pending" | "accepted" | "preparing" | "dispatched" | "delivered" | "completed" | undefined;
    channel?: "direct" | "marketplace" | undefined;
}>;
export declare const DispatchRequest: z.ZodObject<{
    expectedDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    vehicle: z.ZodOptional<z.ZodString>;
    driver: z.ZodOptional<z.ZodString>;
    trackingReference: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    vehicle?: string | undefined;
    driver?: string | undefined;
    expectedDate?: string | undefined;
    trackingReference?: string | undefined;
}, {
    vehicle?: string | undefined;
    driver?: string | undefined;
    expectedDate?: string | undefined;
    trackingReference?: string | undefined;
}>;
export declare const DeliveredRequest: z.ZodObject<{
    date: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    receivedBy: z.ZodOptional<z.ZodString>;
    proofAssetId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    date?: string | undefined;
    receivedBy?: string | undefined;
    proofAssetId?: string | undefined;
}, {
    date?: string | undefined;
    receivedBy?: string | undefined;
    proofAssetId?: string | undefined;
}>;
export declare const BuyerUpdateRequest: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"]>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    locationLabel: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    type: "other" | "farm" | "trader" | "retailer" | "restaurant" | "processor" | "individual";
    version: number;
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    locationLabel?: string | undefined;
    notes?: string | undefined;
}, {
    type: "other" | "farm" | "trader" | "retailer" | "restaurant" | "processor" | "individual";
    version: number;
    name: string;
    email?: string | undefined;
    phone?: string | undefined;
    locationLabel?: string | undefined;
    notes?: string | undefined;
}>;
