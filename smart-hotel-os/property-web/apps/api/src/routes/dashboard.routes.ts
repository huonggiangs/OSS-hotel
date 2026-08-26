import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
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
