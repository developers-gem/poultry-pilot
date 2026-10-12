import { Id, ReportQuery, ReportType } from "@poultrypilot/validation";
import { Router, type Request } from "express";
import { z } from "zod";
import { renderReport } from "../../adapters/report-renderers.js";
import type { FarmService } from "../../services/farm.service.js";
import { REPORTS, type ReportService } from "../../services/report.service.js";
import { requireFarm, requirePermission, validate } from "../middleware/core.js";

const asciiSlug = (s: string) => s.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40) || "farm";

/** /api/v1/farms/:farmId/reports — generated on the server from live data, each behind its own permission. */
export function reportRoutes(reports: ReportService, farms: FarmService): Router {
  const r = Router({ mergeParams: true });
  r.get("/", validate("params", z.object({ farmId: Id })), requireFarm(farms), requirePermission("farm.read"), async (req, res) => res.json({ items: await reports.catalog(req.farmCtx!) }));
  r.get(
    "/:type",
    validate("params", z.object({ farmId: Id, type: ReportType })),
    requireFarm(farms),
    (req, res, next) => requirePermission(REPORTS[req.params["type"] as keyof typeof REPORTS].permission)(req, res, next),
    validate("query", ReportQuery),
    async (req: Request, res) => {
      const q = req.query as unknown as { format: "pdf" | "csv" | "xlsx" | "json"; from?: string; to?: string; flockId?: string };
      const type = req.params["type"] as keyof typeof REPORTS;
      const doc = await reports.build(req.farmCtx!, type, q, q.format);
      if (q.format === "json") return void res.json(doc);
      const out = await renderReport(doc, q.format);
      const name = `poultrypilot-${type}-report-${asciiSlug(doc.farmName)}-${doc.period?.from ?? ""}-to-${doc.period?.to ?? ""}.${out.extension}`;
      res.setHeader("Content-Type", out.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
      res.setHeader("Cache-Control", "private, no-store");
      res.send(out.bytes);
    },
  );
  return r;
}
