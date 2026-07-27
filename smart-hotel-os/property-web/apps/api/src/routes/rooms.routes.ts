import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { roomsRepo } from "../repositories/rooms.repo";

export const roomsRouter = Router();
roomsRouter.use(requireAuth);

const upsertSchema = z.object({
  roomTypeId: z.string().min(1),
  number: z.string().min(1),
  floor: z.string().min(1),
  zone: z.string().min(1),
  status: z.enum(["OCCUPIED", "VACANT", "DIRTY", "MAINTENANCE"]).default("VACANT"),
  powerOn: z.boolean().default(false),
  note: z.string().optional(),
});

const powerSchema = z.object({ powerOn: z.boolean() });

roomsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await roomsRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);

roomsRouter.post(
  "/",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const room = await roomsRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
    await writeAuditLog({ req, action: "CREATE_ROOM", entityType: "room", entityId: room.id, afterData: room });
    res.status(201).json(room);
  })
);

roomsRouter.patch(
  "/:id",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const existing = await roomsRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("phòng");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const room = await roomsRepo.update(req.user!.propertyId, req.params.id, parsed.data);
    await writeAuditLog({ req, action: "UPDATE_ROOM", entityType: "room", entityId: req.params.id, beforeData: existing, afterData: room });
    res.json(room);
  })
);

// Bật/tắt điện phòng — endpoint riêng cho công tắc IoT trong lưới phòng (UI
// RoomGrid). Mọi vai trò làm việc trực tiếp ở cơ sở đều được phép bấm công tắc này
// (kể cả buồng phòng/lễ tân), khác với sửa cấu hình phòng (chỉ OWNER/MANAGER).
roomsRouter.patch(
  "/:id/power",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const existing = await roomsRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("phòng");
    const parsed = powerSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const room = await roomsRepo.setPower(req.user!.propertyId, req.params.id, parsed.data.powerOn);
    await writeAuditLog({
      req,
      action: "TOGGLE_ROOM_POWER",
      entityType: "room",
      entityId: req.params.id,
      beforeData: { power_on: existing.power_on },
      afterData: { power_on: parsed.data.powerOn },
    });
    res.json(room);
  })
);
