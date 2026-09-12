import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { dashboardRepo } from "../repositories/dashboard.repo";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const summary = await dashboardRepo.summary(req.user!.propertyId);
    res.json(summary);
  })
);

dashboardRouter.post(
  "/night-audit/run",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const summary = await dashboardRepo.nightAudit(req.user!.propertyId);
    const completedAt = new Date().toISOString();
    await writeAuditLog({ req, action: "RUN_NIGHT_AUDIT", entityType: "night_audit", afterData: { completedAt, ...summary } });
    res.json({ ...summary, completed_at: completedAt });
  })
);

// Dữ liệu Gantt (lịch đặt phòng) cho tab "Lịch đặt phòng" ở Dashboard.
dashboardRouter.get(
  "/gantt",
  asyncHandler(async (req, res) => {
    res.json(await dashboardRepo.gantt(req.user!.propertyId));
  })
);

// Kế toán đêm (/night-audit) — KPI đối soát cuối ngày.
dashboardRouter.get(
  "/night-audit",
  asyncHandler(async (req, res) => {
    const summary = await dashboardRepo.nightAudit(req.user!.propertyId);
    res.json(summary);
  })
);
