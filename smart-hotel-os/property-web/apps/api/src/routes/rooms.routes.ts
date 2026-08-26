import { Router } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { roomsRepo } from "../repositories/rooms.repo";

// URL công khai của web khách (property-web/apps/web) — dùng để dựng link
// /guest/room/:token nhúng vào mã QR. Tài liệu ở .env.example.
const PUBLIC_WEB_BASE_URL = process.env.PUBLIC_WEB_BASE_URL ?? "http://localhost:3100";

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
const syncSchema = z.object({ syncEnabled: z.boolean() });

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

// Bật/tắt "đủ điều kiện đồng bộ OTA" — cờ boolean lưu thật trong DB, dùng cho
// công tắc "Sync" ở bảng "Danh sách phòng" trang /price. CHƯA gọi API kênh
// phân phối thật (channel-manager-service) — đây chỉ đánh dấu phòng nào hotel
// muốn đưa lên kênh khi đã kết nối kênh đó, phạm vi gọi API thật nằm ngoài task này.
roomsRouter.patch(
  "/:id/sync",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await roomsRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("phòng");
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const room = await roomsRepo.setSync(req.user!.propertyId, req.params.id, parsed.data.syncEnabled);
    await writeAuditLog({
      req,
      action: "TOGGLE_ROOM_SYNC",
      entityType: "room",
      entityId: req.params.id,
      beforeData: { sync_enabled: existing.sync_enabled },
      afterData: { sync_enabled: parsed.data.syncEnabled },
    });
    res.json(room);
  })
);

// Xoá phòng — chặn nếu phòng đang có khách ở (OCCUPIED), tránh xoá mất dữ
// liệu phòng đang gắn với 1 lượt lưu trú thật.
roomsRouter.delete(
  "/:id",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await roomsRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("phòng");
    if (existing.status === "OCCUPIED") throw Errors.conflict("Không thể xoá phòng đang có khách ở.");
    if (await roomsRepo.hasBookingReferences(req.user!.propertyId, req.params.id)) {
      throw Errors.conflict("Không thể xoá phòng đã có hợp đồng đặt phòng. Hãy lưu giữ lịch sử hoặc hủy hợp đồng trước.");
    }
    await roomsRepo.remove(req.user!.propertyId, req.params.id);
    await writeAuditLog({ req, action: "DELETE_ROOM", entityType: "room", entityId: req.params.id, beforeData: existing });
    res.status(204).end();
  })
);

// Ảnh QR PNG của phòng — mã hoá URL công khai /guest/room/:qr_token, để nhân
// viên in/dán lên cửa phòng cho khách quét. Chỉ cần đăng nhập (bất kỳ vai trò
// nào ở cơ sở), không giới hạn OWNER/MANAGER vì lễ tân/buồng phòng cũng cần in.
roomsRouter.get(
  "/:id/qr",
  asyncHandler(async (req, res) => {
    const room = await roomsRepo.findById(req.user!.propertyId, req.params.id);
    if (!room) throw Errors.notFound("phòng");
    const url = `${PUBLIC_WEB_BASE_URL}/guest/room/${room.qr_token}`;
    const buffer = await QRCode.toBuffer(url, { type: "png", width: 300 });
    res.type("png");
    res.send(buffer);
  })
);
