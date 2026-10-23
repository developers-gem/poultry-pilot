import * as C from "@poultrypilot/constants";
import { z } from "zod";
import { Id, LocalDate, Money, NonEmptyText, OptionalText } from "../primitives.js";
/** PoultryPilot Finance and PoultryMarket contracts. */
const PaymentMethod = z.enum(C.PAYMENT_METHODS);
const Attachment = z.object({ assetId: Id, name: OptionalText(200) }).strict();
/** Tax as the farm applies it: any rate and label (GST, VAT…). No country rules are built in. */
const Tax = z.object({ ratePercent: z.number().min(0).max(100), inclusive: z.boolean(), label: OptionalText(30) }).strict();
const PaidNow = z.object({ accountId: Id, method: PaymentMethod, reference: OptionalText(80) }).strict();
export const SupplierRequest = z
    .object({ name: NonEmptyText(120), phone: OptionalText(30), email: z.string().email().max(254).optional(), taxId: OptionalText(40), address: OptionalText(300), notes: OptionalText(1000) })
    .strict();
export const MoneyAccountRequest = z
    .object({ name: NonEmptyText(80), type: z.enum(C.MONEY_ACCOUNT_TYPES), openingBalance: Money, openingDate: LocalDate, notes: OptionalText(500) })
    .strict();
const DocFields = {
    date: LocalDate,
    dueDate: LocalDate.optional(),
    description: NonEmptyText(300),
    /** Amount entered: with `tax.inclusive` it includes tax, otherwise tax is added on top. */
    amount: Money,
    tax: Tax.optional(),
    flockId: Id.optional(),
    houseId: Id.optional(),
    invoiceNumber: OptionalText(60),
    attachments: z.array(Attachment).max(10).optional(),
    notes: OptionalText(1000),
    paidNow: PaidNow.optional(),
};
export const ExpenseRequest = z
    .object({
    ...DocFields,
    kind: z.enum(C.EXPENSE_KINDS).default("expense"),
    category: z.enum(C.EXPENSE_CATEGORIES),
    supplierId: Id.optional(),
    vendor: OptionalText(120),
    /** Save even though a bill with the same amount exists within 3 days (after the person has checked it). */
    allowDuplicate: z.boolean().optional(),
})
    .strict();
export const IncomeRequest = z
    .object({ ...DocFields, kind: z.enum(C.INCOME_KINDS).default("income"), category: z.enum(C.INCOME_CATEGORIES), buyerId: Id.optional(), customerName: OptionalText(120) })
    .strict();
export const DocumentListQuery = z.object({
    status: z.enum(C.EXPENSE_STATUSES).optional(),
    from: LocalDate.optional(),
    to: LocalDate.optional(),
    flockId: Id.optional(),
    houseId: Id.optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
});
export const PaymentRequest = z.object({ date: LocalDate, amount: Money, accountId: Id, method: PaymentMethod, reference: OptionalText(80), note: OptionalText(300) }).strict();
export const RefundRequest = z.object({ date: LocalDate, amount: Money, accountId: Id, method: PaymentMethod, reason: z.string().trim().min(3).max(300) }).strict();
export const TransferRequestMoney = z.object({ date: LocalDate, fromAccountId: Id, toAccountId: Id, amount: Money, reference: OptionalText(80), description: OptionalText(300) }).strict();
export const LedgerQuery = z.object({ accountId: Id.optional(), from: LocalDate.optional(), to: LocalDate.optional(), limit: z.coerce.number().int().min(1).max(1000).default(200) });
export const RecurringExpenseRequest = z
    .object({
    name: NonEmptyText(120),
    category: z.enum(C.EXPENSE_CATEGORIES),
    supplierId: Id.optional(),
    vendor: OptionalText(120),
    amount: Money,
    tax: Tax.optional(),
    frequency: z.enum(C.RECURRING_FREQUENCIES),
    startDate: LocalDate,
    endDate: LocalDate.optional(),
    flockId: Id.optional(),
    houseId: Id.optional(),
    notes: OptionalText(1000),
})
    .strict();
export const PauseRequest = z.object({ from: LocalDate, to: LocalDate.optional() }).strict();
export const PeriodQuery = z
    .object({ from: LocalDate, to: LocalDate, flockId: Id.optional(), houseId: Id.optional() })
    .refine((q) => q.from <= q.to, { message: "from must be on or before to", path: ["from"] });
export const OptionalPeriodQuery = z.object({ from: LocalDate.optional(), to: LocalDate.optional() });
export const ProfitabilityQuery = z.object({ status: z.enum(C.FLOCK_STATUSES).optional(), flockId: Id.optional() });
// ---- marketplace -------------------------------------------------------------------
export const ListingRequest = z
    .object({
    title: NonEmptyText(150),
    category: z.enum(C.LISTING_CATEGORIES),
    product: z.enum(C.MARKET_PRODUCTS).optional(),
    description: OptionalText(2000),
    quantityAvailable: z.number().positive().max(100_000_000),
    minOrderQuantity: z.number().positive().max(100_000_000).optional(),
    unit: z.string().trim().min(1).max(20),
    /** Price per unit; buyers always pay this price. */
    price: Money,
    priceUnit: z.enum(C.PRICE_UNITS),
    /** Defaults to the farm's country. */
    regionCode: z.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/, "Country code, optionally with region (e.g. IN or IN-UP)").optional(),
    locationLabel: OptionalText(200),
    availableFrom: LocalDate.optional(),
    availableUntil: LocalDate.optional(),
    fulfilmentOptions: z.array(z.enum(C.FULFILMENT_METHODS)).min(1).max(3),
    photos: z.array(Id).max(10).optional(),
    /** Link to stock so delivery moves it: eggs (grade), a chick lot, or a flock (live birds). */
    source: z
        .object({ kind: z.enum(["eggs", "chick_lot", "flock"]), eggGrade: z.enum(C.EGG_GRADES).optional(), chickLotId: Id.optional(), flockId: Id.optional() })
        .strict()
        .optional(),
})
    .strict()
    .refine((l) => !l.minOrderQuantity || l.minOrderQuantity <= l.quantityAvailable, { message: "Minimum order exceeds the quantity available", path: ["minOrderQuantity"] });
export const UpdateListingRequest = ListingRequest.innerType().extend({ version: z.number().int().nonnegative() }).strict();
export const ListingStatusRequest = z.object({ status: z.enum(["active", "paused", "closed"]) }).strict();
export const MyListingsQuery = z.object({ status: z.enum(C.LISTING_STATUSES).optional() });
export const BrowseQuery = z.object({
    category: z.enum(C.LISTING_CATEGORIES).optional(),
    region: z.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/).optional(),
    q: z.string().trim().max(80).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const PlaceOrderRequest = z
    .object({
    listingId: Id,
    quantity: z.number().positive().max(100_000_000),
    fulfilment: z.enum(C.FULFILMENT_METHODS),
    deliveryAddress: OptionalText(300),
    /** Defaults to the signed-in person's name. */
    buyerName: NonEmptyText(120).optional(),
    buyerPhone: OptionalText(30),
    /** Buying for one of your farms. */
    buyerFarmId: Id.optional(),
    notes: OptionalText(1000),
})
    .strict();
export const OrderListQueryMarket = z.object({ status: z.enum(C.ORDER_STATUSES).optional(), channel: z.enum(["direct", "marketplace"]).optional() });
export const DispatchRequest = z
    .object({ expectedDate: LocalDate.optional(), vehicle: OptionalText(60), driver: OptionalText(120), trackingReference: OptionalText(80) })
    .strict();
export const DeliveredRequest = z.object({ date: LocalDate.optional(), receivedBy: OptionalText(120), proofAssetId: Id.optional() }).strict();
export const BuyerUpdateRequest = z
    .object({ name: NonEmptyText(120), type: z.enum(["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"]), phone: OptionalText(30), email: z.string().email().max(254).optional(), locationLabel: OptionalText(200), notes: OptionalText(1000), version: z.number().int().nonnegative() })
    .strict();
//# sourceMappingURL=finance.js.map