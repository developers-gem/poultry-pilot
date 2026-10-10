import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { API_PREFIX, HEADERS } from "@poultrypilot/constants";
import * as V from "@poultrypilot/validation";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * The API contract. Every route the server exposes is declared here with the SAME Zod schemas
 * the server validates with, so the OpenAPI document cannot drift from runtime behaviour.
 * The generated document drives the typed web client and the Dart client for Flutter.
 */
export const registry = new OpenAPIRegistry();

const bearer = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});
const secured = [{ [bearer.name]: [] }];

const S = {
  ErrorEnvelope: registry.register("ErrorEnvelope", V.ErrorEnvelope),
  HealthResponse: registry.register("HealthResponse", V.HealthResponse),
  LivenessResponse: registry.register("LivenessResponse", V.LivenessResponse),
  DeviceInfo: registry.register("DeviceInfo", V.DeviceInfo),
  RegisterRequest: registry.register("RegisterRequest", V.RegisterRequest),
  LoginRequest: registry.register("LoginRequest", V.LoginRequest),
  GoogleLoginRequest: registry.register("GoogleLoginRequest", V.GoogleLoginRequest),
  RefreshRequest: registry.register("RefreshRequest", V.RefreshRequest),
  LogoutRequest: registry.register("LogoutRequest", V.LogoutRequest),
  VerifyEmailRequest: registry.register("VerifyEmailRequest", V.VerifyEmailRequest),
  ForgotPasswordRequest: registry.register("ForgotPasswordRequest", V.ForgotPasswordRequest),
  ResetPasswordRequest: registry.register("ResetPasswordRequest", V.ResetPasswordRequest),
  ChangePasswordRequest: registry.register("ChangePasswordRequest", V.ChangePasswordRequest),
  TokenPair: registry.register("TokenPair", V.TokenPair),
  UserView: registry.register("UserView", V.UserView),
  SessionView: registry.register("SessionView", V.SessionView),
  MeResponse: registry.register("MeResponse", V.MeResponse),
  FarmView: registry.register("FarmView", V.FarmView),
  CreateFarmRequest: registry.register("CreateFarmRequest", V.CreateFarmRequest),
  ReplaceFarmRequest: registry.register("ReplaceFarmRequest", V.ReplaceFarmRequest),
  MembershipView: registry.register("MembershipView", V.MembershipView),
  AddMemberRequest: registry.register("AddMemberRequest", V.AddMemberRequest),
  UpdateMemberRequest: registry.register("UpdateMemberRequest", V.UpdateMemberRequest),
  AcceptInviteRequest: registry.register("AcceptInviteRequest", V.AcceptInviteRequest),
  SyncPushRequest: registry.register("SyncPushRequest", V.SyncPushRequest),
  HouseView: registry.register("HouseView", V.HouseView),
  CreateHouseRequest: registry.register("CreateHouseRequest", V.CreateHouseRequest),
  ReplaceHouseRequest: registry.register("ReplaceHouseRequest", V.ReplaceHouseRequest),
  FlockView: registry.register("FlockView", V.FlockView),
  FlockMetricsView: registry.register("FlockMetricsView", V.FlockMetricsView),
  FlockEventView: registry.register("FlockEventView", V.FlockEventView),
  DailyRecordView: registry.register("DailyRecordView", V.DailyRecordView),
  CreateFlockRequest: registry.register("CreateFlockRequest", V.CreateFlockRequest),
  ReplaceFlockRequest: registry.register("ReplaceFlockRequest", V.ReplaceFlockRequest),
  DailyRecordRequest: registry.register("DailyRecordRequest", V.DailyRecordRequest),
  SyncChange: registry.register("SyncChange", V.SyncChange),
};

const json = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});
const errors = {
  400: json(S.ErrorEnvelope, "Validation failed"),
  401: json(S.ErrorEnvelope, "Not signed in"),
  403: json(S.ErrorEnvelope, "Role not allowed"),
  404: json(S.ErrorEnvelope, "Not found or not a member"),
  429: json(S.ErrorEnvelope, "Rate limited"),
};
const idempotencyHeader = z.object({ [HEADERS.idempotencyKey]: z.string().min(8).max(100).optional() });
const farmParams = z.object({ farmId: V.Id });

// ---- system ---------------------------------------------------------------
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/health`,
  tags: ["System"],
  summary: "Service health including MongoDB connectivity",
  responses: {
    200: json(S.HealthResponse, "All dependencies up"),
    503: json(S.HealthResponse, "A dependency is down"),
  },
});
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/health/live`,
  tags: ["System"],
  summary: "Liveness probe; no dependency checks",
  responses: { 200: json(S.LivenessResponse, "Process is running") },
});

// ---- auth -----------------------------------------------------------------
const post = (path: string, summary: string, request: Parameters<typeof registry.registerPath>[0]["request"], responses: Parameters<typeof registry.registerPath>[0]["responses"], auth = false) =>
  registry.registerPath({ method: "post", path: `${API_PREFIX}${path}`, tags: [path.startsWith("/auth") ? "Auth" : "Farms"], summary, ...(request ? { request } : {}), responses, ...(auth ? { security: secured } : {}) });
const bodyOf = <T extends z.ZodTypeAny>(schema: T) => ({ body: { content: { "application/json": { schema } } } });
const signedIn = z.object({ user: S.UserView, tokens: S.TokenPair });

post("/auth/register", "Create an account and its first farm; sends a verification email", bodyOf(S.RegisterRequest), {
  201: json(z.object({ user: S.UserView, farm: S.FarmView, tokens: S.TokenPair }), "Registered and signed in"),
  400: errors[400],
  409: json(S.ErrorEnvelope, "Email already registered"),
  429: errors[429],
});
post("/auth/verify-email", "Confirm an email address with the emailed token", bodyOf(S.VerifyEmailRequest), { 200: json(z.object({ user: S.UserView }), "Verified"), 422: json(S.ErrorEnvelope, "Invalid or expired token") });
post("/auth/resend-verification", "Send a new verification email", undefined, { 202: json(z.object({ sent: z.boolean() }), "Sent, or already verified"), 401: errors[401] }, true);
post("/auth/login", "Sign in with email and password; starts a session", bodyOf(S.LoginRequest), {
  200: json(signedIn, "Signed in"),
  401: errors[401],
  403: json(S.ErrorEnvelope, "Account disabled"),
  429: json(S.ErrorEnvelope, "Rate limited or account temporarily locked"),
});
post("/auth/google", "Sign in with a Google ID token", bodyOf(S.GoogleLoginRequest), {
  200: json(signedIn.extend({ created: z.boolean(), needsFarm: z.boolean() }), "Signed in"),
  401: errors[401],
  501: json(S.ErrorEnvelope, "Google sign-in not configured"),
});
post("/auth/refresh", "Rotate a refresh token; reuse of an old token ends the session", bodyOf(S.RefreshRequest), { 200: json(S.TokenPair, "New token pair"), 401: errors[401] });
post("/auth/logout", "End the current session (bearer token) or the session of a refresh token", bodyOf(S.LogoutRequest), { 204: { description: "Signed out" } });
post("/auth/forgot-password", "Email a password reset link; never reveals whether the account exists", bodyOf(S.ForgotPasswordRequest), { 202: json(z.object({ message: z.string() }), "Accepted"), 429: errors[429] });
post("/auth/reset-password", "Set a new password with an emailed token; signs out every session", bodyOf(S.ResetPasswordRequest), { 204: { description: "Password reset" }, 422: json(S.ErrorEnvelope, "Invalid or expired token") });
post("/auth/change-password", "Change password; signs out every other session", bodyOf(S.ChangePasswordRequest), {
  200: json(z.object({ otherSessionsSignedOut: z.number() }), "Changed"),
  401: errors[401],
  422: json(S.ErrorEnvelope, "Current password incorrect or unchanged"),
}, true);

// ---- me -------------------------------------------------------------------
registry.registerPath({ method: "get", path: `${API_PREFIX}/me`, tags: ["Me"], security: secured, summary: "Signed-in user, current session and farm memberships", responses: { 200: json(S.MeResponse, "Current user"), 401: errors[401] } });
registry.registerPath({ method: "get", path: `${API_PREFIX}/me/sessions`, tags: ["Me"], security: secured, summary: "Signed-in devices", responses: { 200: json(z.object({ items: z.array(S.SessionView) }), "Active sessions"), 401: errors[401] } });
registry.registerPath({ method: "delete", path: `${API_PREFIX}/me/sessions`, tags: ["Me"], security: secured, summary: "Sign out every other device", responses: { 200: json(z.object({ revoked: z.number() }), "Revoked"), 401: errors[401] } });
registry.registerPath({ method: "delete", path: `${API_PREFIX}/me/sessions/{sessionId}`, tags: ["Me"], security: secured, summary: "Sign out one device", request: { params: z.object({ sessionId: V.Id }) }, responses: { 204: { description: "Revoked" }, 401: errors[401], 404: errors[404] } });

// ---- farms ----------------------------------------------------------------
const memberParams = z.object({ farmId: V.Id, memberId: V.Id });
registry.registerPath({ method: "get", path: `${API_PREFIX}/farms`, tags: ["Farms"], security: secured, responses: { 200: json(z.object({ items: z.array(S.FarmView) }), "Farms I belong to"), 401: errors[401] } });
registry.registerPath({ method: "post", path: `${API_PREFIX}/farms`, tags: ["Farms"], security: secured, request: { headers: idempotencyHeader, ...bodyOf(S.CreateFarmRequest) }, responses: { 201: json(S.FarmView, "Farm created; you are its owner"), 400: errors[400], 401: errors[401] } });
registry.registerPath({ method: "get", path: `${API_PREFIX}/farms/{farmId}`, tags: ["Farms"], security: secured, request: { params: farmParams }, responses: { 200: json(S.FarmView, "Farm with your role and permissions"), 401: errors[401], 404: errors[404] } });
registry.registerPath({ method: "put", path: `${API_PREFIX}/farms/{farmId}`, tags: ["Farms"], security: secured, summary: "Replace editable farm fields (optimistic concurrency via version)", request: { params: farmParams, headers: idempotencyHeader, ...bodyOf(S.ReplaceFarmRequest) }, responses: { 200: json(S.FarmView, "Updated"), ...errors, 409: json(S.ErrorEnvelope, "Version conflict") } });
registry.registerPath({ method: "get", path: `${API_PREFIX}/farms/{farmId}/members`, tags: ["Members"], security: secured, request: { params: farmParams }, responses: { 200: json(z.object({ items: z.array(S.MembershipView) }), "Members and pending invitations"), ...errors } });
registry.registerPath({ method: "post", path: `${API_PREFIX}/farms/{farmId}/members`, tags: ["Members"], security: secured, summary: "Invite someone by email with a role below your own", request: { params: farmParams, headers: idempotencyHeader, ...bodyOf(S.AddMemberRequest) }, responses: { 201: json(S.MembershipView, "Invitation sent"), ...errors, 409: json(S.ErrorEnvelope, "Already a member") } });
registry.registerPath({ method: "put", path: `${API_PREFIX}/farms/{farmId}/members/{memberId}`, tags: ["Members"], security: secured, summary: "Change a member's role", request: { params: memberParams, ...bodyOf(S.UpdateMemberRequest) }, responses: { 200: json(S.MembershipView, "Role changed"), ...errors, 422: json(S.ErrorEnvelope, "Would leave the farm without an owner") } });
registry.registerPath({ method: "delete", path: `${API_PREFIX}/farms/{farmId}/members/{memberId}`, tags: ["Members"], security: secured, summary: "Remove a member, cancel an invitation, or leave the farm (your own id)", request: { params: memberParams }, responses: { 204: { description: "Removed" }, ...errors, 422: json(S.ErrorEnvelope, "Would leave the farm without an owner") } });
post("/farms/invitations/accept", "Accept an emailed farm invitation", bodyOf(S.AcceptInviteRequest), { 200: json(S.MembershipView, "Joined"), 401: errors[401], 422: json(S.ErrorEnvelope, "Invalid or expired invitation") }, true);

// ---- houses and flocks ----------------------------------------------------
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const houseParams = z.object({ farmId: V.Id, houseId: V.Id });
  const flockParams = z.object({ farmId: V.Id, flockId: V.Id });
  const route = (method: "get" | "post" | "put" | "delete", path: string, tag: string, summary: string, params: z.AnyZodObject, request: Record<string, unknown>, ok: Record<string, unknown>) =>
    registry.registerPath({ method, path: `${P}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } } as never);
  const items = <T extends z.ZodTypeAny>(t: T) => z.object({ items: z.array(t) });

  route("get", "/houses", "Houses", "Houses of the farm", farmParams, {}, { 200: json(items(S.HouseView), "Houses") });
  route("post", "/houses", "Houses", "Create a house", farmParams, bodyOf(S.CreateHouseRequest), { 201: json(S.HouseView, "Created") });
  route("get", "/houses/{houseId}", "Houses", "One house", houseParams, {}, { 200: json(S.HouseView, "House") });
  route("put", "/houses/{houseId}", "Houses", "Replace a house (capacity cannot drop below birds housed)", houseParams, bodyOf(S.ReplaceHouseRequest), { 200: json(S.HouseView, "Updated") });
  route("delete", "/houses/{houseId}", "Houses", "Delete a house with no planned or active flocks", houseParams, {}, { 204: { description: "Deleted" } });

  route("get", "/flocks", "Flocks", "Flocks, filtered by status, house or type", farmParams, { query: V.FlockListQuery }, { 200: json(items(S.FlockView), "Flocks") });
  route("post", "/flocks", "Flocks", "Create a flock; with placement it starts active", farmParams, bodyOf(S.CreateFlockRequest), { 201: json(S.FlockView, "Created") });
  route("get", "/flocks/{flockId}", "Flocks", "A flock with all calculations", flockParams, { query: V.MetricsQuery }, { 200: json(S.FlockView, "Flock") });
  route("put", "/flocks/{flockId}", "Flocks", "Replace descriptive fields", flockParams, bodyOf(S.ReplaceFlockRequest), { 200: json(S.FlockView, "Updated") });
  route("delete", "/flocks/{flockId}", "Flocks", "Delete a planned flock with no records", flockParams, {}, { 204: { description: "Deleted" } });
  route("get", "/flocks/{flockId}/metrics", "Flocks", "Calculations as of a date, optionally valuing live birds at a reference price", flockParams, { query: V.MetricsQuery }, { 200: json(S.FlockMetricsView, "Metrics") });
  route("get", "/flocks/{flockId}/events", "Flock events", "The flock ledger", flockParams, {}, { 200: json(items(S.FlockEventView), "Events") });

  const commands: [string, string, z.ZodTypeAny, z.ZodTypeAny][] = [
    ["placement", "Place birds in a planned flock", V.PlaceFlockRequest, S.FlockView],
    ["mortality", "Record deaths", V.MortalityRequest, S.FlockEventView],
    ["culls", "Record culled birds", V.CullRequest, S.FlockEventView],
    ["transfers", "Move the flock to another house, or move birds into another flock", V.TransferRequest, z.object({ flock: S.FlockView, destination: S.FlockView.optional() })],
    ["splits", "Move birds into a new flock", V.SplitRequest, z.object({ flock: S.FlockView, newFlock: S.FlockView })],
    ["merge", "Move every bird into another flock and close this one", V.MergeRequest, z.object({ flock: S.FlockView, target: S.FlockView })],
    ["sales", "Sell birds (never more than are available)", V.SaleRequest, S.FlockEventView],
    ["adjustments", "Correct the bird count, with a reason", V.AdjustmentRequest, S.FlockEventView],
    ["weighings", "Record a weighing", V.WeighingRequest, S.FlockEventView],
  ];
  for (const [path, summary, body, out] of commands) {
    route("post", `/flocks/{flockId}/${path}`, "Flock events", summary, flockParams, bodyOf(body), { 201: json(out, "Recorded"), 422: json(S.ErrorEnvelope, "Not enough birds, wrong status, or over capacity") });
  }
  route("post", "/flocks/{flockId}/close", "Flocks", "Close a flock once every bird is accounted for", flockParams, bodyOf(V.CloseFlockRequest), { 200: json(S.FlockView, "Closed") });
  route("post", "/flocks/{flockId}/events/{eventId}/reverse", "Flock events", "Reverse a wrong placement, death, cull, adjustment, sale or weighing", z.object({ farmId: V.Id, flockId: V.Id, eventId: V.Id }), bodyOf(V.ReverseEventRequest), { 201: json(S.FlockEventView, "Reversal recorded") });
  route("get", "/flocks/{flockId}/daily-records", "Daily records", "Days with records, newest first", flockParams, { query: V.DateRangeQuery }, { 200: json(items(S.DailyRecordView), "Days") });
  route("get", "/flocks/{flockId}/daily-records/{date}", "Daily records", "Everything recorded for one day", z.object({ farmId: V.Id, flockId: V.Id, date: V.LocalDate }), {}, { 200: json(S.DailyRecordView, "Day") });
  route("put", "/flocks/{flockId}/daily-records/{date}", "Daily records", "Create or replace the day's record (deaths, culls, feed, water, conditions)", z.object({ farmId: V.Id, flockId: V.Id, date: V.LocalDate }), bodyOf(S.DailyRecordRequest), { 200: json(S.DailyRecordView, "Saved"), 409: json(S.ErrorEnvelope, "Changed by someone else") });
}

// ---- sync -----------------------------------------------------------------
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/sync/pull`,
  tags: ["Sync"],
  security: secured,
  request: { query: V.SyncPullQuery },
  responses: {
    200: json(z.object({ changes: z.array(S.SyncChange), nextSince: z.number(), hasMore: z.boolean() }), "Changes after `since`"),
    ...errors,
  },
});
registry.registerPath({
  method: "post",
  path: `${API_PREFIX}/sync/push`,
  tags: ["Sync"],
  security: secured,
  request: { body: { content: { "application/json": { schema: S.SyncPushRequest } } } },
  responses: { 200: json(z.object({ results: z.array(V.SyncMutationResult) }), "Per-mutation results"), ...errors },
});

export type OpenApiDocument = ReturnType<OpenApiGeneratorV31["generateDocument"]>;

export function buildOpenApiDocument(opts: { serverUrl?: string; version?: string } = {}): OpenApiDocument {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "PoultryPilot API",
      version: opts.version ?? "0.1.0",
      description: "Single REST API shared by the PoultryPilot web and mobile apps.",
    },
    servers: [{ url: opts.serverUrl ?? "http://localhost:4000" }],
  });
}
