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
export type ReplaceFarmRequest = z.infer<typeof V.ReplaceFarmRequest>;
export type FarmView = z.infer<typeof V.FarmView>;
export type AddMemberRequest = z.infer<typeof V.AddMemberRequest>;
export type MembershipView = z.infer<typeof V.MembershipView>;
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
export type UpdateMemberRequest = z.infer<typeof V.UpdateMemberRequest>;
export type GoogleLoginRequest = z.infer<typeof V.GoogleLoginRequest>;
export type ForgotPasswordRequest = z.infer<typeof V.ForgotPasswordRequest>;
export type ResetPasswordRequest = z.infer<typeof V.ResetPasswordRequest>;
export type ChangePasswordRequest = z.infer<typeof V.ChangePasswordRequest>;
export type VerifyEmailRequest = z.infer<typeof V.VerifyEmailRequest>;
export type LogoutRequest = z.infer<typeof V.LogoutRequest>;
export type DeviceInfo = z.infer<typeof V.DeviceInfo>;
export type SessionView = z.infer<typeof V.SessionView>;
export type MeResponse = z.infer<typeof V.MeResponse>;
export type SyncPullQuery = z.infer<typeof V.SyncPullQuery>;

// flock engine
export type CreateHouseRequest = z.infer<typeof V.CreateHouseRequest>;
export type ReplaceHouseRequest = z.infer<typeof V.ReplaceHouseRequest>;
export type HouseView = z.infer<typeof V.HouseView>;
export type CreateFlockRequest = z.infer<typeof V.CreateFlockRequest>;
export type ReplaceFlockRequest = z.infer<typeof V.ReplaceFlockRequest>;
export type PlaceFlockRequest = z.infer<typeof V.PlaceFlockRequest>;
export type MortalityRequest = z.infer<typeof V.MortalityRequest>;
export type CullRequest = z.infer<typeof V.CullRequest>;
export type TransferRequest = z.infer<typeof V.TransferRequest>;
export type SplitRequest = z.infer<typeof V.SplitRequest>;
export type MergeRequest = z.infer<typeof V.MergeRequest>;
export type SaleRequest = z.infer<typeof V.SaleRequest>;
export type AdjustmentRequest = z.infer<typeof V.AdjustmentRequest>;
export type WeighingRequest = z.infer<typeof V.WeighingRequest>;
export type CloseFlockRequest = z.infer<typeof V.CloseFlockRequest>;
export type DailyRecordRequest = z.infer<typeof V.DailyRecordRequest>;
export type FlockView = z.infer<typeof V.FlockView>;
export type FlockEventView = z.infer<typeof V.FlockEventView>;
export type FlockMetricsView = z.infer<typeof V.FlockMetricsView>;
export type DailyRecordView = z.infer<typeof V.DailyRecordView>;
