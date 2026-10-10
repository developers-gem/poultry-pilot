import type { z } from "zod";
import type * as V from "@poultrypilot/validation";

/**
 * Request/response types inferred from the Zod schemas, so a type can never drift from its validator.
 * Output types (after defaults and transforms) — use z.input<> at call sites that build requests.
 */
export type Id = z.infer<typeof V.Id>;
export type LocalDate = z.infer<typeof V.LocalDate>;
export type Instant = z.infer<typeof V.Instant>;
export type CurrencyCode = z.infer<typeof V.CurrencyCode>;
export type Money = z.infer<typeof V.Money>;
export type GeoPoint = z.infer<typeof V.GeoPoint>;
export type RegisterRequest = z.infer<typeof V.RegisterRequest>;
export type LoginRequest = z.infer<typeof V.LoginRequest>;
export type RefreshRequest = z.infer<typeof V.RefreshRequest>;
export type TokenPair = z.infer<typeof V.TokenPair>;
export type UserView = z.infer<typeof V.UserView>;
export type FarmSettings = z.infer<typeof V.FarmSettings>;
export type UpdateFarmRequest = z.infer<typeof V.UpdateFarmRequest>;
export type FarmView = z.infer<typeof V.FarmView>;
export type InviteMemberRequest = z.infer<typeof V.InviteMemberRequest>;
export type MembershipView = z.infer<typeof V.MembershipView>;
export type DailyRecordUpsert = z.infer<typeof V.DailyRecordUpsert>;
export type WeighSessionCreate = z.infer<typeof V.WeighSessionCreate>;
export type SyncMutation = z.infer<typeof V.SyncMutation>;
export type SyncPushRequest = z.infer<typeof V.SyncPushRequest>;
export type SyncMutationResult = z.infer<typeof V.SyncMutationResult>;
export type SyncChange = z.infer<typeof V.SyncChange>;
export type ErrorEnvelope = z.infer<typeof V.ErrorEnvelope>;
export type DependencyStatus = z.infer<typeof V.DependencyStatus>;
export type HealthResponse = z.infer<typeof V.HealthResponse>;
export type LivenessResponse = z.infer<typeof V.LivenessResponse>;
export type CreateFarmRequest = z.infer<typeof V.CreateFarmRequest>;
export type AcceptInviteRequest = z.infer<typeof V.AcceptInviteRequest>;
export type ChangeRoleRequest = z.infer<typeof V.ChangeRoleRequest>;
export type GoogleLoginRequest = z.infer<typeof V.GoogleLoginRequest>;
export type PasswordResetRequest = z.infer<typeof V.PasswordResetRequest>;
export type PasswordResetConfirm = z.infer<typeof V.PasswordResetConfirm>;
export type CreateFlockRequest = z.infer<typeof V.CreateFlockRequest>;
export type PlacementCommand = z.infer<typeof V.PlacementCommand>;
export type SaleCommand = z.infer<typeof V.SaleCommand>;
export type MortalityEntry = z.infer<typeof V.MortalityEntry>;
export type SyncPullQuery = z.infer<typeof V.SyncPullQuery>;
