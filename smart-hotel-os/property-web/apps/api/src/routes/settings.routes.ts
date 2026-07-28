import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { settingsRepo } from "../repositories/settings.repo";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// Danh sách nhóm hợp lệ — chặn client ghi vào group_key tuỳ ý ngoài dự kiến.
// Khớp đúng 21 nhóm đã seed ở database/migrations/003_property_settings.sql.
const VALID_GROUPS = new Set([
  "basic",
  "amenities",
  "images",
  "email",
  "security",
  "currency",
  "tax",
  "time",
  "printer",
  "channel",
  "sync",
  "db",
  "social",
  "modules",
  "utilities",
  "assets",
  "services",
  "marketing",
  "daily_entries",
  "payment",
  "roles",
]);

const putSchema = z.object({ data: z.unknown() });

settingsRouter.get(
  "/:group",
  asyncHandler(async (req, res) => {
    const group = req.params.group;
    if (!VALID_GROUPS.has(group)) throw Errors.notFound("nhóm cấu hình");
    const data = await settingsRepo.get(req.user!.propertyId, group);
    res.json({ group, data: data ?? {} });
  })
);

// Ghi cấu hình — chỉ OWNER/MANAGER được sửa cấu hình hệ thống cấp cơ sở (đối
// chiếu docs/PERMISSION_MATRIX.md: RECEPTIONIST/HOUSEKEEPING không được sửa
// cấu hình hệ thống, chỉ được thao tác nghiệp vụ hàng ngày).
settingsRouter.put(
  "/:group",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const group = req.params.group;
    if (!VALID_GROUPS.has(group)) throw Errors.notFound("nhóm cấu hình");
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const data = await settingsRepo.upsert(req.user!.propertyId, req.user!.tenantId, group, parsed.data.data);
    await writeAuditLog({ req, action: "UPDATE_SETTINGS", entityType: "property_settings", entityId: group, afterData: data });
    res.json({ group, data });
  })
);
