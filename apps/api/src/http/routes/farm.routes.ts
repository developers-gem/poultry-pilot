import { AcceptInviteRequest, ChangeRoleRequest, CreateFarmRequest, Id, InviteMemberRequest, PageQuery, UpdateFarmRequest } from "@poultrypilot/contracts";
import { Router } from "express";
import { z } from "zod";
import type { AuditService } from "../../services/audit.service.js";
import type { FarmService } from "../../services/farm.service.js";
import { ctxOf, farmAccess, requirePermission, validate } from "../middleware/core.js";

const FarmParams = z.object({ farmId: Id });
const MemberParams = z.object({ farmId: Id, membershipId: Id });

export function farmRoutes(farms: FarmService, audit: AuditService): Router {
  const r = Router();
  const access = farmAccess(farms);

  r.get("/", async (req, res) => {
    res.json({ items: await farms.listMine(req.auth!.userId) });
  });
  r.post("/", validate("body", CreateFarmRequest), async (req, res) => {
    res.status(201).json(await farms.create(ctxOf(req), req.body));
  });
  r.post("/invitations/accept", validate("body", AcceptInviteRequest), async (req, res) => {
    res.json(await farms.acceptInvite(ctxOf(req), req.body.token));
  });

  r.get("/:farmId", validate("params", FarmParams), access, requirePermission("farm.read"), async (req, res) => {
    res.json(await farms.get(req.farmCtx!));
  });
  r.patch("/:farmId", validate("params", FarmParams), access, requirePermission("farm.update_settings"), validate("body", UpdateFarmRequest), async (req, res) => {
    res.json(await farms.update(req.farmCtx!, req.body));
  });

  r.get("/:farmId/members", validate("params", FarmParams), access, requirePermission("member.read"), async (req, res) => {
    res.json({ items: await farms.listMembers(req.farmCtx!) });
  });
  r.post("/:farmId/members", validate("params", FarmParams), access, requirePermission("member.invite"), validate("body", InviteMemberRequest), async (req, res) => {
    res.status(201).json(await farms.invite(req.farmCtx!, req.body.email, req.body.role));
  });
  r.patch("/:farmId/members/:membershipId", validate("params", MemberParams), access, requirePermission("member.change_role"), validate("body", ChangeRoleRequest), async (req, res) => {
    res.json(await farms.changeRole(req.farmCtx!, req.params["membershipId"] as string, req.body.role));
  });
  r.delete("/:farmId/members/:membershipId", validate("params", MemberParams), access, requirePermission("member.remove"), async (req, res) => {
    await farms.removeMember(req.farmCtx!, req.params["membershipId"] as string);
    res.status(204).end();
  });

  r.get("/:farmId/audit", validate("params", FarmParams), access, requirePermission("audit.read"), validate("query", PageQuery), async (req, res) => {
    const q = req.query as unknown as z.infer<typeof PageQuery>;
    res.json(await audit.list(req.farmCtx!.farmId, { limit: q.limit, ...(q.cursor ? { cursor: q.cursor } : {}) }));
  });
  return r;
}
