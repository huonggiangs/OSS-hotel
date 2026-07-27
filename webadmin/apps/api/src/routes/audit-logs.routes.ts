import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { auditLogsRepo } from "../repositories/auditLogs.repo";

export const auditLogsRouter = Router();
auditLogsRouter.use(requireAuth);

auditLogsRouter.get(
  "/",
  requireRole("SUPER_ADMIN", "OPS_SUPPORT"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 50);
    const { items, total } = await auditLogsRepo.list({
      entityType: req.query.entityType as string | undefined,
      userId: req.query.userId as string | undefined,
      page,
      pageSize,
    });
    res.json({ items, total, page, page_size: pageSize });
  })
);
