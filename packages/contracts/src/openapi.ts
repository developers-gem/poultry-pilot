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
  RegisterRequest: registry.register("RegisterRequest", V.RegisterRequest),
  LoginRequest: registry.register("LoginRequest", V.LoginRequest),
  RefreshRequest: registry.register("RefreshRequest", V.RefreshRequest),
  TokenPair: registry.register("TokenPair", V.TokenPair),
  UserView: registry.register("UserView", V.UserView),
  FarmView: registry.register("FarmView", V.FarmView),
  CreateFarmRequest: registry.register("CreateFarmRequest", V.CreateFarmRequest),
  UpdateFarmRequest: registry.register("UpdateFarmRequest", V.UpdateFarmRequest),
  MembershipView: registry.register("MembershipView", V.MembershipView),
  InviteMemberRequest: registry.register("InviteMemberRequest", V.InviteMemberRequest),
  SyncPushRequest: registry.register("SyncPushRequest", V.SyncPushRequest),
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
registry.registerPath({
  method: "post",
  path: `${API_PREFIX}/auth/register`,
  tags: ["Auth"],
  summary: "Create an account and its first farm",
  request: { body: { content: { "application/json": { schema: S.RegisterRequest } } } },
  responses: {
    201: json(z.object({ user: S.UserView, farm: S.FarmView, tokens: S.TokenPair }), "Registered"),
    400: errors[400],
    409: json(S.ErrorEnvelope, "Email already registered"),
    429: errors[429],
  },
});
registry.registerPath({
  method: "post",
  path: `${API_PREFIX}/auth/login`,
  tags: ["Auth"],
  request: { body: { content: { "application/json": { schema: S.LoginRequest } } } },
  responses: { 200: json(z.object({ user: S.UserView, tokens: S.TokenPair }), "Signed in"), 401: errors[401], 429: errors[429] },
});
registry.registerPath({
  method: "post",
  path: `${API_PREFIX}/auth/refresh`,
  tags: ["Auth"],
  summary: "Rotate a refresh token",
  request: { body: { content: { "application/json": { schema: S.RefreshRequest } } } },
  responses: { 200: json(S.TokenPair, "New token pair"), 401: errors[401] },
});
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/auth/me`,
  tags: ["Auth"],
  security: secured,
  responses: { 200: json(S.UserView, "Current user"), 401: errors[401] },
});

// ---- farms ----------------------------------------------------------------
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/farms`,
  tags: ["Farms"],
  security: secured,
  responses: { 200: json(z.object({ items: z.array(S.FarmView) }), "Farms I belong to"), 401: errors[401] },
});
registry.registerPath({
  method: "post",
  path: `${API_PREFIX}/farms`,
  tags: ["Farms"],
  security: secured,
  request: { headers: idempotencyHeader, body: { content: { "application/json": { schema: S.CreateFarmRequest } } } },
  responses: { 201: json(S.FarmView, "Farm created"), 400: errors[400], 401: errors[401] },
});
registry.registerPath({
  method: "patch",
  path: `${API_PREFIX}/farms/{farmId}`,
  tags: ["Farms"],
  security: secured,
  request: { params: farmParams, headers: idempotencyHeader, body: { content: { "application/json": { schema: S.UpdateFarmRequest } } } },
  responses: {
    200: json(S.FarmView, "Updated"),
    ...errors,
    409: json(S.ErrorEnvelope, "Version conflict"),
  },
});
registry.registerPath({
  method: "post",
  path: `${API_PREFIX}/farms/{farmId}/members`,
  tags: ["Farms"],
  security: secured,
  request: { params: farmParams, headers: idempotencyHeader, body: { content: { "application/json": { schema: S.InviteMemberRequest } } } },
  responses: { 201: json(S.MembershipView, "Invitation sent"), ...errors },
});

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
