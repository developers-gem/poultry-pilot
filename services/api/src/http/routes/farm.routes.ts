import { AcceptInviteRequest, AddMemberRequest, CreateFarmRequest, Id, PageQuery, ReplaceFarmRequest, UpdateMemberRequest } from "@poultrypilot/validation";
import { Router } from "express";
import { z } from "zod";
import type { MembershipRecord } from "../../ports/records.js";
import type { AuditService } from "../../services/audit.service.js";
import type { FarmService } from "../../services/farm.service.js";
import { ctxOf, requireFarm, requireFarmResource, requirePermission, validate } from "../middleware/core.js";

const FarmParams = z.object({ farmId: Id });
const MemberParams = z.object({ farmId: Id, memberId: Id });

/**
 * /api/v1/farms — mounted behind authenticate. Every /:farmId route runs, in order:
 *   validate params → requireFarm (membership) → requirePermission (role) → requireFarmResource (record belongs to farm)
 * and the service re-checks permission and rank before changing anything.
 */
export function farmRoutes(farms: FarmService, audit: AuditService): Router {
  const r = Router();
  const farm = [validate("params", FarmParams), requireFarm(farms)];
  const member = [validate("params", MemberParams), requireFarm(farms), requireFarmResource("member", "memberId", farms.findMember, "Member")];
  const memberOf = (req: Express.Request) => req.resources!["member"] as MembershipRecord;

  r.get("/", async (req, res) => {
    res.json({ items: await farms.listMine(req.auth!.userId) });
  });
  r.post("/", validate("body", CreateFarmRequest), async (req, res) => {
    res.status(201).json(await farms.create(ctxOf(req), req.body));
  });
  r.post("/invitations/accept", validate("body", AcceptInviteRequest), async (req, res) => {
    res.json(await farms.acceptInvite(ctxOf(req), req.body.token));
  });

  r.get("/:farmId", ...farm, requirePermission("farm.read"), async (req, res) => {
    res.json(await farms.get(req.farmCtx!));
  });
  r.put("/:farmId", ...farm, requirePermission("farm.update_settings"), validate("body", ReplaceFarmRequest), async (req, res) => {
    res.json(await farms.replace(req.farmCtx!, req.body));
  });

  r.get("/:farmId/members", ...farm, requirePermission("member.read"), async (req, res) => {
    res.json({ items: await farms.listMembers(req.farmCtx!) });
  });
  r.post("/:farmId/members", ...farm, requirePermission("member.invite"), validate("body", AddMemberRequest), async (req, res) => {
    res.status(201).json(await farms.addMember(req.farmCtx!, req.body.email, req.body.role));
  });
  r.put("/:farmId/members/:memberId", ...member, requirePermission("member.change_role"), validate("body", UpdateMemberRequest), async (req, res) => {
    res.json(await farms.updateMember(req.farmCtx!, memberOf(req), req.body.role));
  });
  // No requirePermission here: any member may remove themselves (leave). The service requires
  // member.remove and a higher rank when removing someone else.
  r.delete("/:farmId/members/:memberId", ...member, async (req, res) => {
    await farms.removeMember(req.farmCtx!, memberOf(req));
    res.status(204).end();
  });

  r.get("/:farmId/audit", ...farm, requirePermission("audit.read"), validate("query", PageQuery), async (req, res) => {
    const q = req.query as unknown as z.infer<typeof PageQuery>;
    res.json(await audit.list(req.farmCtx!.farmId, { limit: q.limit, ...(q.cursor ? { cursor: q.cursor } : {}) }));
  });
  return r;
}
