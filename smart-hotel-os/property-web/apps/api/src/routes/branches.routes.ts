import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireAuthOrInternalKey } from "../middleware/internalAuth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { propertiesRepo } from "../repositories/properties.repo";

// "Danh sách cơ sở" — liệt kê toàn bộ property thuộc cùng tenant (chuỗi khách
// sạn). Khác các route khác (luôn lọc theo propertyId của user), route này cố
// tình lọc theo tenantId để hỗ trợ nghiệp vụ multi-property.
//
// GET / KHÔNG dùng `.use(requireAuth)` chung cho cả router nữa — dùng riêng
// `requireAuthOrInternalKey` (chấp nhận JWT property_user HOẶC header nội bộ
// X-Internal-Service-Key từ webadmin) CHỈ cho endpoint đọc này. Mọi endpoint
// ghi (POST) vẫn bắt buộc JWT + role như cũ, KHÔNG áp dụng ngoại lệ.
export const branchesRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

branchesRouter.get(
  "/",
  requireAuthOrInternalKey,
  asyncHandler(async (req, res) => {
    // req.user chỉ có khi gọi bằng JWT property_user thật (không có khi gọi
    // bằng X-Internal-Service-Key) — lời gọi nội bộ từ webadmin cần thấy
    // TOÀN BỘ cơ sở của mọi tenant (dropdown "gán vào cơ sở" khi khai báo
    // thiết bị ở HQ Console), lời gọi từ property_user thật vẫn chỉ thấy đúng
    // các cơ sở cùng tenant của họ như trước.
    const items = req.user ? await propertiesRepo.listByTenant(req.user.tenantId) : await propertiesRepo.listAll();
    const withRoomCount = await Promise.all(
      items.map(async (p) => ({ ...p, room_count: await propertiesRepo.countRoomsByProperty(p.id) }))
    );
    res.json({ items: withRoomCount, total: withRoomCount.length });
  })
);

// Thêm cơ sở mới trong cùng tenant — chỉ OWNER (mở rộng chuỗi khách sạn là
// quyết định cấp cao nhất, không giao cho MANAGER cấp cơ sở). KHÔNG áp dụng
// ngoại lệ X-Internal-Service-Key — luôn bắt buộc JWT thật.
branchesRouter.post(
  "/",
  requireAuth,
  requireRole("OWNER"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const property = await propertiesRepo.create(req.user!.tenantId, parsed.data);
    await writeAuditLog({ req, action: "CREATE_BRANCH", entityType: "property", entityId: property.id, afterData: property });
    res.status(201).json(property);
  })
);
