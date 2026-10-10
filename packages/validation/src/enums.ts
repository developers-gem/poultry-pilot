import { z } from "zod";
import * as C from "@poultrypilot/constants";

/** Zod enum schemas generated from the readonly tuples in @poultrypilot/constants. */
export const Species = z.enum(C.SPECIES);
export const FlockPurpose = z.enum(C.FLOCK_PURPOSES);
export const FlockStatus = z.enum(C.FLOCK_STATUSES);
export const HouseType = z.enum(C.HOUSE_TYPES);
export const MortalityCause = z.enum(C.MORTALITY_CAUSES);
export const EggGrade = z.enum(C.EGG_GRADES);
export const HealthRecordType = z.enum(C.HEALTH_RECORD_TYPES);
export const ReminderStatus = z.enum(C.REMINDER_STATUSES);
export const LedgerDirection = z.enum(C.LEDGER_DIRECTIONS);
export const LedgerCategory = z.enum(C.LEDGER_CATEGORIES);
export const RecurringFrequency = z.enum(C.RECURRING_FREQUENCIES);
export const OrderStatus = z.enum(C.ORDER_STATUSES);
export const PaymentMethod = z.enum(C.PAYMENT_METHODS);
export const ListingCategory = z.enum(C.LISTING_CATEGORIES);
export const BiosecurityEntryType = z.enum(C.BIOSECURITY_ENTRY_TYPES);
export const AlertSeverity = z.enum(C.ALERT_SEVERITIES);
export const ContentKind = z.enum(C.CONTENT_KINDS);
export const Role = z.enum(C.ROLES);
export const MembershipStatus = z.enum(C.MEMBERSHIP_STATUSES);
export const UnitSystem = z.enum(C.UNIT_SYSTEMS);
