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
  UpsertDailyRecordRequest: registry.register("UpsertDailyRecordRequest", V.UpsertDailyRecordRequest),
  CreateDailyRecordRequest: registry.register("CreateDailyRecordRequest", V.CreateDailyRecordRequest),
  UpdateDailyRecordRequest: registry.register("UpdateDailyRecordRequest", V.UpdateDailyRecordRequest),
  DailyRecordListItem: registry.register("DailyRecordListItem", V.DailyRecordListItem),
  DailyRecordMinimal: registry.register("DailyRecordMinimal", V.DailyRecordMinimal),
  DailyEntrySheet: registry.register("DailyEntrySheet", V.DailyEntrySheet),
  DashboardDayView: registry.register("DashboardDayView", V.DashboardDayView),
  TrendsView: registry.register("TrendsView", V.TrendsView),
  MediaAssetView: registry.register("MediaAssetView", V.MediaAssetView),
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
  route("get", "/flocks/{flockId}/daily-records", "Daily records", "This flock's daily records, newest first (cursor pagination)", flockParams, { query: V.DateRangeQuery }, { 200: json(z.object({ items: z.array(S.DailyRecordListItem), nextCursor: z.string().nullable() }), "Records") });
  route("get", "/flocks/{flockId}/daily-records/{date}", "Daily records", "Everything recorded for one day", z.object({ farmId: V.Id, flockId: V.Id, date: V.LocalDate }), {}, { 200: json(S.DailyRecordView, "Day") });
  route("put", "/flocks/{flockId}/daily-records/{date}", "Daily records", "Create or replace the day's record (deaths, culls, feed, water, conditions)", z.object({ farmId: V.Id, flockId: V.Id, date: V.LocalDate }), bodyOf(S.UpsertDailyRecordRequest), { 200: json(S.DailyRecordView, "Saved (or DailyRecordMinimal with Prefer: return=minimal)"), 409: json(S.ErrorEnvelope, "Changed by someone else") });

  // ---- daily operations
  const prefer = z.object({ prefer: z.string().optional().openapi({ description: "return=minimal → respond with id, version and summary only" }) });
  route("post", "/daily-records", "Daily records", "Record one flock's day: deaths, culls, feed, water, conditions, eggs, weight, observations, photos", farmParams, { headers: prefer, ...bodyOf(S.CreateDailyRecordRequest) }, { 201: json(S.DailyRecordView, "Created (or DailyRecordMinimal)"), 409: json(S.ErrorEnvelope, "A record already exists for that flock and date (details.existingId)") });
  route("get", "/daily-records", "Daily records", "Compact list, newest first; filter by date or from/to, house, flock, type", farmParams, { query: V.DailyRecordListQuery }, { 200: json(z.object({ items: z.array(S.DailyRecordListItem), nextCursor: z.string().nullable() }), "Records") });
  route("get", "/daily-records/sheet", "Daily records", "Entry sheet for a day: active flocks, expected birds, today's and yesterday's records", farmParams, { query: z.object({ date: V.LocalDate.optional() }) }, { 200: json(S.DailyEntrySheet, "Sheet") });
  route("get", "/dashboard/day", "Dashboard", "One day across the farm, per flock and in total", farmParams, { query: V.DashboardDayQuery }, { 200: json(S.DashboardDayView, "Day") });
  route("get", "/dashboard/trends", "Dashboard", "Daily totals over a range (max 366 days)", farmParams, { query: V.TrendsQuery }, { 200: json(S.TrendsView, "Series") });
  route("post", "/media", "Media", "Upload a photo (raw JPEG, PNG or WebP body, max 5 MB)", farmParams, { body: { content: { "image/jpeg": { schema: z.string().openapi({ format: "binary" }) }, "image/png": { schema: z.string().openapi({ format: "binary" }) }, "image/webp": { schema: z.string().openapi({ format: "binary" }) } } } }, { 201: json(S.MediaAssetView, "Stored") });
  route("get", "/media/{assetId}", "Media", "Download a photo of this farm", z.object({ farmId: V.Id, assetId: V.Id }), {}, { 200: { description: "Image bytes" } });
}
{
  const idParams = z.object({ id: V.Id });
  const prefer = z.object({ prefer: z.string().optional() });
  registry.registerPath({ method: "get", path: `${API_PREFIX}/daily-records/{id}`, tags: ["Daily records"], summary: "One daily record with every section", security: secured, request: { params: idParams }, responses: { 200: json(S.DailyRecordView, "Record"), ...errors } });
  registry.registerPath({ method: "put", path: `${API_PREFIX}/daily-records/{id}`, tags: ["Daily records"], summary: "Replace every section (version required)", security: secured, request: { params: idParams, headers: prefer, ...bodyOf(S.UpdateDailyRecordRequest) }, responses: { 200: json(S.DailyRecordView, "Saved (or DailyRecordMinimal)"), ...errors, 409: json(S.ErrorEnvelope, "Changed by someone else") } });
  registry.registerPath({ method: "delete", path: `${API_PREFIX}/daily-records/{id}`, tags: ["Daily records"], summary: "Delete a record and undo everything it wrote", security: secured, request: { params: idParams }, responses: { 204: { description: "Deleted" }, ...errors } });
}

// ---- inventory, feed, water, alerts ----------------------------------------
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const itemParams = z.object({ farmId: V.Id, itemId: V.Id });
  const any = z.record(z.unknown());
  const r = (method: "get" | "post" | "put" | "delete", path: string, tag: string, summary: string, params: z.AnyZodObject, request: Record<string, unknown>, ok: Record<string, unknown>) =>
    registry.registerPath({ method, path: `${P}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } } as never);
  const items = z.object({ items: z.array(any) });
  r("get", "/inventory/overview", "Inventory", "All stock: catalog categories, eggs by grade, chick lots", farmParams, {}, { 200: json(any, "Overview") });
  r("get", "/inventory/items", "Inventory", "Catalog with stock, low-stock and expiry status", farmParams, { query: V.InventoryListQuery }, { 200: json(items, "Items") });
  r("post", "/inventory/items", "Inventory", "Add an item: feed, medicine, vaccine, disinfectant, litter, packaging, equipment, spare part, cleaning, other", farmParams, bodyOf(V.CreateInventoryItemRequest), { 201: json(any, "Created") });
  r("get", "/inventory/items/{itemId}", "Inventory", "An item with its open lots", itemParams, {}, { 200: json(any, "Item") });
  r("put", "/inventory/items/{itemId}", "Inventory", "Replace item details and alert thresholds", itemParams, bodyOf(V.UpdateInventoryItemRequest), { 200: json(any, "Updated") });
  r("post", "/inventory/items/{itemId}/purchases", "Inventory", "Receive a purchase as a lot (supplier, batch, expiry, location, unit cost)", itemParams, bodyOf(V.PurchaseRequest), { 201: json(any, "Lot") });
  r("post", "/inventory/items/{itemId}/issues", "Inventory", "Use stock (FEFO; expired stock is never used)", itemParams, bodyOf(V.IssueRequest), { 201: json(any, "Issued"), 422: json(S.ErrorEnvelope, "Not enough in-date stock") });
  r("post", "/inventory/items/{itemId}/wastage", "Inventory", "Write off lost, spoiled or expired stock (expired first)", itemParams, bodyOf(V.WastageRequest), { 201: json(any, "Recorded") });
  r("post", "/inventory/items/{itemId}/counts", "Inventory", "Stock count: correct the book quantity", itemParams, bodyOf(V.StockCountRequest), { 201: json(any, "Counted") });
  r("get", "/inventory/items/{itemId}/transactions", "Inventory", "The item's stock ledger", itemParams, { query: V.TransactionsQuery }, { 200: json(items, "Movements") });
  r("get", "/inventory/lots", "Inventory", "Lots in stock, optionally only expired or expiring", farmParams, { query: V.LotsQuery }, { 200: json(items, "Lots") });
  r("get", "/inventory/eggs", "Inventory", "Egg stock by grade", farmParams, {}, { 200: json(any, "Eggs") });
  r("post", "/inventory/eggs/movements", "Inventory", "Eggs used, spoiled or counted", farmParams, bodyOf(V.EggMovementRequest), { 201: json(any, "Recorded") });
  r("get", "/inventory/chick-lots", "Inventory", "Chick lots", farmParams, { query: V.ChickLotsQuery }, { 200: json(items, "Lots") });
  r("post", "/inventory/chick-lots", "Inventory", "Receive day-old chicks", farmParams, bodyOf(V.ReceiveChicksRequest), { 201: json(any, "Lot") });
  r("post", "/feed/consumption", "Feed", "Feed eaten by a flock, or wasted; moves stock and costs it from lots", farmParams, bodyOf(V.FeedConsumptionRequest), { 201: json(any, "Recorded"), 422: json(S.ErrorEnvelope, "Not enough in-date feed") });
  r("get", "/feed/consumption", "Feed", "Feed entries", farmParams, { query: V.FeedListQuery }, { 200: json(items, "Entries") });
  r("delete", "/feed/consumption/{id}", "Feed", "Remove a feed entry and return its stock", z.object({ farmId: V.Id, id: V.Id }), {}, { 204: { description: "Removed" } });
  r("get", "/feed/stock", "Feed", "Feed stock with average daily use and days of feed remaining", farmParams, {}, { 200: json(any, "Stock") });
  r("get", "/feed/analytics", "Feed", "Per flock: feed per bird, per kg gain, FCR, wastage, feed cost per bird and per egg", farmParams, { query: V.FeedAnalyticsQuery }, { 200: json(any, "Analytics") });
  r("get", "/water-records", "Water", "Water records with source, quality, treatment and abnormal flags", farmParams, { query: V.WaterListQuery }, { 200: json(items, "Records") });
  r("get", "/alerts", "Alerts", "Alerts", farmParams, { query: V.AlertListQuery }, { 200: json(items, "Alerts") });
  r("post", "/alerts/evaluate", "Alerts", "Re-check stock and expiry alerts now", farmParams, {}, { 200: json(any, "Done") });
  r("post", "/alerts/{alertId}/acknowledge", "Alerts", "Acknowledge an alert", z.object({ farmId: V.Id, alertId: V.Id }), {}, { 200: json(any, "Acknowledged") });
}

// ---- FlockHealth, BioSecure Farm, content ------------------------------------
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const any = z.record(z.unknown());
  const items = z.object({ items: z.array(any) });
  const idp = z.object({ farmId: V.Id, id: V.Id });
  const r = (method: "get" | "post" | "put" | "delete", path: string, tag: string, summary: string, params: z.AnyZodObject, request: Record<string, unknown>, ok: Record<string, unknown>) =>
    registry.registerPath({ method, path: `${P}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } } as never);
  const H = "FlockHealth";
  r("get", "/health/medicines", H, "The farm's medicine and vaccine catalog with withdrawal periods (from label or vet)", farmParams, {}, { 200: json(items, "Medicines") });
  r("post", "/health/medicines", H, "Add a medicine", farmParams, bodyOf(V.CreateMedicineRequest), { 201: json(any, "Created") });
  r("put", "/health/medicines/{id}", H, "Replace a medicine", idp, bodyOf(V.UpdateMedicineRequest), { 200: json(any, "Updated") });
  r("get", "/health/records", H, "Health records: observations, vet visits, treatments, lab tests, post-mortems", farmParams, { query: V.HealthRecordListQuery }, { 200: json(items, "Records") });
  r("post", "/health/records", H, "Record an observation, visit, treatment, lab test or post-mortem (assessments are attributed; nothing is diagnosed)", farmParams, bodyOf(V.CreateHealthRecordRequest), { 201: json(any, "Created") });
  r("get", "/health/records/{id}", H, "One health record with attachment links", idp, {}, { 200: json(any, "Record") });
  r("put", "/health/records/{id}", H, "Replace a health record", idp, bodyOf(V.UpdateHealthRecordRequest), { 200: json(any, "Updated") });
  r("delete", "/health/records/{id}", H, "Delete a record; its medicine returns to stock and its withdrawal periods lift", idp, {}, { 204: { description: "Deleted" } });
  r("post", "/health/records/{id}/follow-up-done", H, "Mark the follow-up done", idp, {}, { 200: json(any, "Updated") });
  r("get", "/health/reminders", H, "Vaccinations due or overdue, follow-ups, withdrawal end dates", farmParams, { query: V.RemindersQuery }, { 200: json(any, "Reminders") });
  r("get", "/health/withdrawals/{flockId}", H, "Withdrawal periods in force for a flock", z.object({ farmId: V.Id, flockId: V.Id }), {}, { 200: json(any, "Withdrawals") });
  r("get", "/health/programmes", H, "The farm's vaccination programmes", farmParams, {}, { 200: json(items, "Programmes") });
  r("post", "/health/programmes", H, "Add a vaccination programme (from the farm's vet or hatchery)", farmParams, bodyOf(V.CreateProgrammeRequest), { 201: json(any, "Created") });
  r("post", "/health/programmes/apply/{flockId}", H, "Schedule a programme for a flock by bird age", z.object({ farmId: V.Id, flockId: V.Id }), bodyOf(V.ApplyProgrammeRequest), { 201: json(any, "Scheduled") });
  r("get", "/health/vaccinations", H, "Vaccinations with derived state (scheduled, due, overdue, done, skipped)", farmParams, { query: V.VaccinationListQuery }, { 200: json(items, "Vaccinations") });
  r("post", "/health/vaccinations", H, "Schedule a vaccination", farmParams, bodyOf(V.ScheduleVaccinationRequest), { 201: json(any, "Scheduled") });
  r("post", "/health/vaccinations/{id}/administer", H, "Record a vaccination as given (batches and expiry from stock; expired batches refused)", idp, bodyOf(V.AdministerVaccinationRequest), { 200: json(any, "Given") });
  r("post", "/health/vaccinations/{id}/skip", H, "Skip a vaccination with a reason", idp, bodyOf(V.SkipVaccinationRequest), { 200: json(any, "Skipped") });
  const B = "BioSecure Farm";
  r("get", "/biosecurity/summary", B, "Biosecurity at a glance", farmParams, {}, { 200: json(any, "Summary") });
  r("get", "/biosecurity/checklists", B, "The farm's checklists", farmParams, { query: V.ChecklistTemplateQuery }, { 200: json(items, "Checklists") });
  r("post", "/biosecurity/checklists", B, "Add a checklist", farmParams, bodyOf(V.CreateChecklistTemplateRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/checklists/starter", B, "Add generic starter checklists (editable; no country rules)", farmParams, {}, { 201: json(any, "Added") });
  r("put", "/biosecurity/checklists/{id}", B, "Replace a checklist (bumps its version)", idp, bodyOf(V.UpdateChecklistTemplateRequest), { 200: json(any, "Updated") });
  r("get", "/biosecurity/visitors", B, "Visitor register", farmParams, { query: V.VisitorListQuery }, { 200: json(items, "Visitors") });
  r("post", "/biosecurity/visitors", B, "Check a visitor in (declaration, previous poultry contact, PPE, footbath)", farmParams, bodyOf(V.VisitorCheckInRequest), { 201: json(any, "Checked in"), 422: json(S.ErrorEnvelope, "Declaration incomplete") });
  r("post", "/biosecurity/visitors/{id}/check-out", B, "Check a visitor out", idp, bodyOf(V.VisitorCheckOutRequest), { 200: json(any, "Checked out") });
  r("get", "/biosecurity/logs", B, "Biosecurity logs", farmParams, { query: V.BiosecurityLogQuery }, { 200: json(items, "Logs") });
  r("post", "/biosecurity/logs", B, "Record cleaning, disinfection, footbath, vehicle, pest control, wild bird observation or audit", farmParams, bodyOf(V.BiosecurityLogRequest), { 201: json(any, "Recorded") });
  r("get", "/biosecurity/equipment", B, "Equipment", farmParams, {}, { 200: json(items, "Equipment") });
  r("post", "/biosecurity/equipment", B, "Add equipment", farmParams, bodyOf(V.EquipmentRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/equipment/{id}/moves", B, "Record an equipment movement", idp, bodyOf(V.EquipmentMoveRequest), { 201: json(any, "Moved") });
  r("get", "/biosecurity/cleaning-schedules", B, "Cleaning and disinfection schedules", farmParams, {}, { 200: json(items, "Schedules") });
  r("post", "/biosecurity/cleaning-schedules", B, "Add a schedule", farmParams, bodyOf(V.CleaningScheduleRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/cleaning-schedules/{id}/complete", B, "Complete a scheduled cleaning (writes the log, moves the next due date)", idp, bodyOf(V.CompleteCleaningRequest), { 201: json(any, "Completed") });
  r("get", "/biosecurity/corrective-actions", B, "Corrective actions", farmParams, { query: V.ActionListQuery }, { 200: json(items, "Actions") });
  r("post", "/biosecurity/corrective-actions", B, "Raise a corrective action", farmParams, bodyOf(V.CorrectiveActionRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/corrective-actions/{id}/complete", B, "Complete an action", idp, bodyOf(V.CompleteActionRequest), { 200: json(any, "Completed") });
  r("post", "/biosecurity/corrective-actions/{id}/verify", B, "Verify an action (not by the person who completed it)", idp, {}, { 200: json(any, "Verified") });
  r("get", "/content/articles", "Content", "Published educational articles (global and the farm's country), each with sources", farmParams, { query: V.ArticleListQuery }, { 200: json(items, "Articles") });
  r("get", "/content/articles/{slug}", "Content", "One article with its body and sources", z.object({ farmId: V.Id, slug: z.string() }), {}, { 200: json(any, "Article") });
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
