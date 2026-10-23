import { z } from "zod";
export declare const Id: z.ZodString;
export declare function isValidLocalDate(value: string): boolean;
export declare const LocalDate: z.ZodEffects<z.ZodString, string, string>;
export declare const Instant: z.ZodString;
export declare function isValidTimezone(tz: string): boolean;
export declare const IanaTimezone: z.ZodEffects<z.ZodString, string, string>;
export declare function isValidCurrency(code: string): boolean;
export declare const CurrencyCode: z.ZodEffects<z.ZodString, string, string>;
/** ISO 3166-1 alpha-2 country code. */
export declare const CountryCode: z.ZodString;
/**
 * Money is integer minor units + currency. ₹1,250.50 → { amountMinor: 125050, currency: "INR" }.
 * Never floats. Negative amounts are not used: direction is explicit on ledger entries.
 */
export declare const Money: z.ZodObject<{
    amountMinor: z.ZodNumber;
    currency: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amountMinor: number;
}, {
    currency: string;
    amountMinor: number;
}>;
export declare const Count: z.ZodNumber;
export declare const PositiveCount: z.ZodNumber;
/** Canonical stored units. Field names carry the unit: weightG, feedKg, temperatureC. */
export declare const Grams: z.ZodNumber;
export declare const Kilograms: z.ZodNumber;
export declare const Celsius: z.ZodNumber;
export declare const Percent: z.ZodNumber;
export declare const NonEmptyText: (max?: number) => z.ZodString;
export declare const OptionalText: (max?: number) => z.ZodOptional<z.ZodString>;
export declare const Email: z.ZodString;
export declare const Password: z.ZodEffects<z.ZodString, string, string>;
export declare const GeoPoint: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
}, {
    lat: number;
    lng: number;
}>;
export declare const Cursor: z.ZodString;
export declare const PageQuery: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
}, {
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
