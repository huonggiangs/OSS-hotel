import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { propertiesRepo } from "../repositories/properties.repo";

// "Danh sách cơ sở" — liệt kê toàn bộ property thuộc cùng tenant (chuỗi khách
// sạn). Khác các route khác (luôn lọc theo propertyId của user), route này cố
// tình lọc theo tenantId để hỗ trợ nghiệp vụ multi-property.
export const branchesRouter = Router();
branchesRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

branchesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await propertiesRepo.listByTenant(req.user!.tenantId);
    const withRoomCount = await Promise.all(
      items.map(async (p) => ({ ...p, room_count: await propertiesRepo.countRoomsByProperty(p.id) }))
    );
    res.json({ items: withRoomCount, total: withRoomCount.length });
  })
);

// Thêm cơ sở mới trong cùng tenant — chỉ OWNER (mở rộng chuỗi khách sạn là
// quyết định cấp cao nhất, không giao cho MANAGER cấp cơ sở).
branchesRouter.post(
  "/",
  requireRole("OWNER"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const property = await propertiesRepo.create(req.user!.tenantId, parsed.data);
    await writeAuditLog({ req, action: "CREATE_BRANCH", entityType: "property", entityId: property.id, afterData: property });
    res.status(201).json(property);
  })
);
