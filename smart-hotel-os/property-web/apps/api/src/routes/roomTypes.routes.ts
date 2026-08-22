import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { roomTypesRepo } from "../repositories/roomTypes.repo";

export const roomTypesRouter = Router();
roomTypesRouter.use(requireAuth);

const upsertSchema = z.object({
  name: z.string().min(1),
  basePrice: z.number().min(0).default(0),
  capacity: z.number().int().positive().default(2),
  bedsBig: z.number().int().min(0).default(1),
  bedsSmall: z.number().int().min(0).default(0),
  areaM2: z.number().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  // Nhãn cách tính giá — UI chỉ cho chọn 1 trong 2 (giữ dạng string tự do ở
  // tầng API để không phải sửa schema DB nếu sau này thêm lựa chọn khác).
  pricingMethod: z.enum(["PER_NIGHT", "PER_HOUR"]).default("PER_NIGHT"),
  discountPercent: z.number().min(0).max(100).default(0),
});

roomTypesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await roomTypesRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);

roomTypesRouter.post(
  "/",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const roomType = await roomTypesRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
    await writeAuditLog({ req, action: "CREATE_ROOM_TYPE", entityType: "room_type", entityId: roomType.id, afterData: roomType });
    res.status(201).json(roomType);
  })
);

roomTypesRouter.patch(
  "/:id",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await roomTypesRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("loại phòng");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const roomType = await roomTypesRepo.update(req.user!.propertyId, req.params.id, parsed.data);
    await writeAuditLog({
      req,
      action: "UPDATE_ROOM_TYPE",
      entityType: "room_type",
      entityId: req.params.id,
      beforeData: existing,
      afterData: roomType,
    });
    res.json(roomType);
  })
);

// Xoá loại phòng — chặn nếu còn phòng đang gán loại này (tránh phòng mồ côi/
// mất giá cơ bản để tính tiền). Client phải xoá hoặc đổi loại các phòng đó
// trước, thông báo rõ số lượng phòng đang vướng.
roomTypesRouter.delete(
  "/:id",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await roomTypesRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("loại phòng");
    const roomCount = await roomTypesRepo.countRoomsUsing(req.user!.propertyId, req.params.id);
    if (roomCount > 0) {
      throw Errors.conflict(
        `Không thể xoá loại phòng đang có ${roomCount} phòng sử dụng — hãy xoá hoặc đổi loại các phòng đó trước.`
      );
    }
    await roomTypesRepo.remove(req.user!.propertyId, req.params.id);
    await writeAuditLog({
      req,
      action: "DELETE_ROOM_TYPE",
      entityType: "room_type",
      entityId: req.params.id,
      beforeData: existing,
    });
    res.status(204).end();
  })
);
