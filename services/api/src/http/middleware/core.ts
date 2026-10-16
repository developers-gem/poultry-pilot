import { can, type Action, type Role } from "@poultrypilot/constants";
import { DomainError } from "../../domain/index.js";
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import type { Logger } from "pino";
import { ZodError, type ZodTypeAny } from "zod";
import { AppError, forbidden, notFound } from "../../lib/errors.js";
import { newId, sha256 } from "../../lib/util.js";
import type { IdempotencyRepo } from "../../ports/repositories.js";
import type { RequestContext } from "../../services/context.js";
import type { FarmService } from "../../services/farm.service.js";
import { VersionConflict } from "../../services/sync.service.js";
import type { AuthService } from "../../services/auth.service.js";
import "../types.js";

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && /^[\w-]{8,100}$/.test(incoming) ? incoming : newId();
  res.setHeader("x-request-id", req.requestId);
  next();
};

export const ctxOf = (req: Request): RequestContext => ({
  userId: req.auth!.userId,
  sessionId: req.auth!.sessionId,
  requestId: req.requestId,
  ...(req.header("x-device-id") ? { deviceId: req.header("x-device-id")!.slice(0, 100) } : {}),
});

/**
 * 1. authenticate — a valid access token whose session is still active and whose user is not disabled.
 *    The session check runs on every request, so signing out a device takes effect immediately.
 */
export function authenticate(auth: Pick<AuthService, "authenticateAccess">): RequestHandler {
  return async (req, _res, next) => {
    const h = req.header("authorization");
    if (!h?.startsWith("Bearer ")) return next(new AppError("UNAUTHENTICATED", "Sign in required"));
    req.auth = await auth.authenticateAccess(h.slice(7));
    next();
  };
}

/** Like authenticate, but lets anonymous requests through (used by logout, which accepts a refresh token instead). */
export function authenticateOptional(auth: Pick<AuthService, "authenticateAccess">): RequestHandler {
  return async (req, _res, next) => {
    const h = req.header("authorization");
    if (h?.startsWith("Bearer ")) req.auth = await auth.authenticateAccess(h.slice(7));
    next();
  };
}

/**
 * 2. requireFarm — the caller is an ACTIVE member of the farm named in the URL (or body/query for sync).
 *    Non-members get 404, never 403, so the existence of a farm id is not revealed.
 */
export function requireFarm(farms: Pick<FarmService, "resolveContext">, from: "params" | "body" | "query" = "params"): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) return next(new AppError("INTERNAL", "authenticate must run before requireFarm"));
    const src = (from === "params" ? req.params : from === "body" ? req.body : req.query) as Record<string, unknown> | undefined;
    const farmId = typeof src?.["farmId"] === "string" ? (src["farmId"] as string).toLowerCase() : "";
    if (!farmId) return next(new AppError("VALIDATION_FAILED", "farmId is required"));
    req.farmCtx = await farms.resolveContext(ctxOf(req), farmId);
    next();
  };
}

/**
 * 2b. requireFarmOf — for routes whose URL names a record but not its farm (e.g. /daily-records/:id).
 * Finds the record's farm, then applies the normal membership check. A missing record and a record on a farm the
 * caller does not belong to give the same 404, so ids cannot be probed.
 */
export function requireFarmOf(locate: (id: string) => Promise<string | null>, farms: Pick<FarmService, "resolveContext">, param: string, label: string): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) return next(new AppError("INTERNAL", "authenticate must run before requireFarmOf"));
    const id = req.params[param];
    const farmId = typeof id === "string" ? await locate(id.toLowerCase()) : null;
    if (!farmId) return next(notFound(label));
    try {
      req.farmCtx = await farms.resolveContext(ctxOf(req), farmId);
    } catch {
      return next(notFound(label));
    }
    next();
  };
}

/** 3a. requireRole — the caller's role on this farm is one of `roles`. Prefer requirePermission for features. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.farmCtx) return next(new AppError("INTERNAL", "requireFarm must run before requireRole"));
    if (!roles.includes(req.farmCtx.role)) return next(forbidden(`This needs one of these roles: ${roles.join(", ")}`));
    next();
  };
}

/** 3b. requirePermission — the caller's role grants `action` (see ROLE_PERMISSIONS). */
export function requirePermission(action: Action): RequestHandler {
  return (req, _res, next) => {
    if (!req.farmCtx) return next(new AppError("INTERNAL", "requireFarm must run before requirePermission"));
    if (!can(req.farmCtx.role, action)) return next(forbidden(`Your role (${req.farmCtx.role}) cannot perform ${action}`));
    next();
  };
}

/**
 * 4. requireFarmResource — the record named in the URL belongs to the caller's farm.
 *    The loader receives the farm id from requireFarm and must query WITHIN that farm, so an id from another
 *    farm is simply not found (404). The loaded record is passed to the handler as req.resources[name].
 */
export function requireFarmResource<T>(name: string, param: string, loader: (farmId: string, id: string) => Promise<T | null>, label = name): RequestHandler {
  return async (req, _res, next) => {
    if (!req.farmCtx) return next(new AppError("INTERNAL", "requireFarm must run before requireFarmResource"));
    const id = req.params[param];
    const rec = typeof id === "string" ? await loader(req.farmCtx.farmId, id.toLowerCase()) : null;
    if (!rec) return next(notFound(label));
    req.resources = { ...req.resources, [name]: rec };
    next();
  };
}

type Part = "body" | "query" | "params";
/** Parses and REPLACES the request part with the validated value (defaults applied, unknowns stripped). */
export function validate(part: Part, schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.parse(req[part]);
    if (part === "query") Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
    else (req as unknown as Record<string, unknown>)[part] = parsed;
    next();
  };
}

/**
 * Idempotency-Key support for writes. The first request with a key runs and its response is stored;
 * retries with the same key and body replay it; the same key with a different body is refused.
 * The Flutter outbox sends a key on every write, so a request that timed out can be retried safely.
 */
export function idempotency(repo: IdempotencyRepo): RequestHandler {
  return async (req, res, next) => {
    const key = req.header("idempotency-key");
    // A request passes this middleware once, even if routers mounted at overlapping prefixes include it twice.
    if ((req as { idempotencyHandled?: boolean }).idempotencyHandled) return next();
    (req as { idempotencyHandled?: boolean }).idempotencyHandled = true;
    if (!key || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !req.auth) return next();
    if (!/^[\w-]{8,100}$/.test(key)) return next(new AppError("VALIDATION_FAILED", "Idempotency-Key must be 8–100 letters, digits, - or _"));
    const id = `${req.auth.userId}:${key}`;
    const requestHash = sha256(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body ?? null)}`);
    const begun = await repo.begin({ id, requestHash, status: "processing", createdAt: new Date() });
    if (!begun.created) {
      const ex = begun.existing;
      if (ex.requestHash !== requestHash) return next(new AppError("IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was used for a different request"));
      if (ex.status === "processing") return next(new AppError("IDEMPOTENCY_IN_PROGRESS", "The original request is still being processed"));
      res.setHeader("idempotent-replayed", "true");
      return res.status(ex.responseStatus ?? 200).json(ex.responseBody);
    }
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const status = res.statusCode;
      // Only successful outcomes are cached; failures release the key so the client can retry.
      const done = status < 400 ? repo.complete(id, status, body) : repo.release(id);
      done.catch(() => undefined);
      return originalJson(body);
    };
    next();
  };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new AppError("NOT_FOUND", "Route not found"));

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestId;
    let status = 500;
    let body: { code: string; message: string; details?: unknown };
    if (err instanceof AppError) {
      status = err.status;
      body = { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) };
    } else if (err instanceof DomainError) {
      status = 422;
      body = { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) };
    } else if (err instanceof VersionConflict) {
      status = 409;
      body = { code: "VERSION_CONFLICT", message: "This record was changed by someone else. Review the latest version.", details: { serverVersion: err.serverVersion, serverDocument: err.serverDocument } };
    } else if (err instanceof ZodError) {
      status = 400;
      body = { code: "VALIDATION_FAILED", message: "Some fields are invalid", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
    } else if (err instanceof SyntaxError && "body" in (err as object)) {
      status = 400;
      body = { code: "INVALID_JSON", message: "Request body is not valid JSON" };
    } else if ((err as { type?: string }).type === "entity.too.large") {
      status = 413;
      body = { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" };
    } else {
      logger.error({ err, requestId }, "unhandled error");
      body = { code: "INTERNAL", message: "Something went wrong. Please try again." };
    }
    if (status >= 500) {
      logger.error({ err, requestId }, body.message);
      // Never echo internals to the client: whatever the error says, a 5xx answer is generic.
      body = { code: body.code === "INTERNAL" || !(err instanceof AppError) ? "INTERNAL" : body.code, message: "Something went wrong. Please try again." };
    }
    res.status(status).json({ error: { ...body, requestId } });
  };
}
