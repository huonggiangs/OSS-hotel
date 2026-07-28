import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { auditLogRepo } from "../repositories/auditLog.repo";

// "/audit-log" — dùng cho khối "Nhật ký hoạt động tài khoản" ở màn hình Bảo vệ
// (/security). Chỉ OWNER/MANAGER được xem (nhật ký hoạt động là dữ liệu nhạy
// cảm — có thể chứa hành vi của người dùng khác).
export const auditLogRouter = Router();
auditLogRouter.use(requireAuth, requireRole("OWNER", "MANAGER"));

auditLogRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    const items = await auditLogRepo.listByProperty(req.user!.propertyId, limit);
    res.json({ items, total: items.length });
  })
);
