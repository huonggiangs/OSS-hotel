import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { settingsRepo } from "../repositories/settings.repo";
import { propertyUsersRepo } from "../repositories/propertyUsers.repo";

export const marketingRouter = Router();
marketingRouter.use(requireAuth);

const deleteSchema = z.object({ index: z.number().int().min(0), password: z.string().min(1) });

marketingRouter.post("/campaigns/delete", requireRole("OWNER", "MANAGER"), asyncHandler(async (req, res) => {
  const parsed = deleteSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const currentUser = await propertyUsersRepo.findById(req.user!.id);
  if (!currentUser || currentUser.property_id !== req.user!.propertyId) throw Errors.forbidden();
  const settings = (await settingsRepo.get(req.user!.propertyId, "marketing")) as { campaigns?: unknown[]; deleteAllowedRoles?: string[] } | null;
  const allowedRoles = Array.isArray(settings?.deleteAllowedRoles) && settings!.deleteAllowedRoles!.length ? settings!.deleteAllowedRoles! : ["OWNER"];
  if (!allowedRoles.includes(req.user!.role)) throw Errors.forbidden();
  if (!(await bcrypt.compare(parsed.data.password, currentUser.password_hash))) throw Errors.invalidCredentials();
  const campaigns = Array.isArray(settings?.campaigns) ? settings!.campaigns! : [];
  const removed = campaigns[parsed.data.index];
  if (removed === undefined) throw Errors.notFound("chiến dịch");
  const next = { ...(settings ?? {}), campaigns: campaigns.filter((_, index) => index !== parsed.data.index) };
  const saved = await settingsRepo.upsert(req.user!.propertyId, req.user!.tenantId, "marketing", next);
  await writeAuditLog({ req, action: "DELETE_MARKETING_CAMPAIGN", entityType: "marketing_campaign", entityId: String(parsed.data.index), beforeData: removed, afterData: null });
  res.json({ data: saved });
}));
