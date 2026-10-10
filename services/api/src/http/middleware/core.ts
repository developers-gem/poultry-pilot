import { can, type Action } from "@poultrypilot/constants";
import { DomainError } from "../../domain/index.js";
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import type { Logger } from "pino";
import { ZodError, type ZodTypeAny } from "zod";
import { AppError, forbidden } from "../../lib/errors.js";
import { newId, sha256 } from "../../lib/util.js";
import type { IdempotencyRepo } from "../../ports/repositories.js";
import type { RequestContext } from "../../services/context.js";
import type { FarmService } from "../../services/farm.service.js";
import { VersionConflict } from "../../services/sync.service.js";
import type { AccessTokens } from "../../services/tokens.js";
import "../types.js";

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && /^[\w-]{8,100}$/.test(incoming) ? incoming : newId();
  res.setHeader("x-request-id", req.requestId);
  next();
};

export const ctxOf = (req: Request): RequestContext => ({
  userId: req.auth!.userId,
  requestId: req.requestId,
  ...(req.header("x-device-id") ? { deviceId: req.header("x-device-id")!.slice(0, 100) } : {}),
});

export function authenticate(tokens: AccessTokens): RequestHandler {
  return async (req, _res, next) => {
    const h = req.header("authorization");
    if (!h?.startsWith("Bearer ")) return next(new AppError("UNAUTHENTICATED", "Sign in required"));
    const claims = await tokens.verify(h.slice(7));
    req.auth = { userId: claims.sub };
    next();
  };
}

/**
 * Loads the caller's membership for the farm in the URL (or body, for sync push) and
 * attaches a FarmContext. Every farm route goes through this — tenancy cannot be skipped.
 */
export function farmAccess(farms: FarmService, from: "params" | "body" | "query" = "params"): RequestHandler {
  return async (req, _res, next) => {
    const src = (from === "params" ? req.params : from === "body" ? req.body : req.query) as Record<string, unknown> | undefined;
    const farmId = typeof src?.["farmId"] === "string" ? (src["farmId"] as string).toLowerCase() : "";
    if (!farmId) return next(new AppError("VALIDATION_FAILED", "farmId is required"));
    req.farmCtx = await farms.resolveContext(ctxOf(req), farmId);
    next();
  };
}

export function requirePermission(action: Action): RequestHandler {
  return (req, _res, next) => {
    if (!req.farmCtx) return next(new AppError("INTERNAL", "farmAccess must run before requirePermission"));
    if (!can(req.farmCtx.role, action)) return next(forbidden(`Your role (${req.farmCtx.role}) cannot perform ${action}`));
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
    if (status >= 500) logger.error({ err, requestId }, body.message);
    res.status(status).json({ error: { ...body, requestId } });
  };
}
