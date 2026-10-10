import { Id } from "@poultrypilot/validation";
import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../../services/auth.service.js";
import { validate } from "../middleware/core.js";
import { clientMeta } from "./auth.routes.js";

/** /api/v1/me — the signed-in user, their farms and their signed-in devices. Mounted behind authenticate. */
export function meRoutes(auth: AuthService): Router {
  const r = Router();
  r.get("/", async (req, res) => {
    res.json(await auth.me(req.auth!));
  });
  r.get("/sessions", async (req, res) => {
    res.json({ items: await auth.listSessions(req.auth!) });
  });
  /** Sign out every device except this one. */
  r.delete("/sessions", async (req, res) => {
    res.json(await auth.revokeOtherSessions(req.auth!, clientMeta(req)));
  });
  r.delete("/sessions/:sessionId", validate("params", z.object({ sessionId: Id })), async (req, res) => {
    await auth.revokeSession(req.auth!, req.params["sessionId"] as string, clientMeta(req));
    res.status(204).end();
  });
  return r;
}
