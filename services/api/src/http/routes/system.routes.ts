import { buildOpenApiDocument, type OpenApiDocument } from "@poultrypilot/contracts";
import type { HealthResponse } from "@poultrypilot/types";
import { Router } from "express";
import type { HealthChecks } from "../../ports/health.js";

export interface SystemInfo {
  version: string;
  environment: string;
  startedAt: Date;
}

/**
 * GET /health       — readiness: checks MongoDB with a real ping; 503 if any dependency is down.
 * GET /health/live  — liveness: the process answers; never touches dependencies, so an orchestrator
 *                     does not restart a healthy process just because the database blipped.
 * GET /openapi.json — the API contract generated from the same schemas the routes validate with.
 */
export function systemRoutes(checks: HealthChecks, info: SystemInfo, opts: { openapi: boolean }): Router {
  const r = Router();

  r.get("/health", async (_req, res) => {
    const mongodb = await checks.mongodb();
    const body: HealthResponse = {
      status: mongodb.status === "up" ? "ok" : "degraded",
      version: info.version,
      environment: info.environment,
      uptimeSeconds: Math.round((Date.now() - info.startedAt.getTime()) / 1000),
      timestamp: new Date().toISOString(),
      checks: { mongodb },
    };
    res.setHeader("Cache-Control", "no-store");
    res.status(body.status === "ok" ? 200 : 503).json(body);
  });

  r.get("/health/live", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ status: "ok" });
  });

  if (opts.openapi) {
    let doc: OpenApiDocument | undefined;
    r.get("/openapi.json", (req, res) => {
      doc ??= buildOpenApiDocument({ serverUrl: `${req.protocol}://${req.get("host")}`, version: info.version });
      res.json(doc);
    });
  }
  return r;
}
