import { Router } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { roomsRepo } from "../repositories/rooms.repo";
import { roomTypesRepo } from "../repositories/roomTypes.repo";

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
const batchCreateSchema = z.object({
  roomTypeId: z.string().min(1),
  floor: z.string().trim().min(1),
  zone: z.string().trim().min(1),
  numbers: z.array(z.string().trim().min(1)).min(1).max(200),
}).superRefine((value, ctx) => {
  const seen = new Set<string>();
  for (const number of value.numbers) {
    if (seen.has(number)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Số phòng ${number} bị lặp.` });
      return;
    }
    seen.add(number);
  }
});

async function ensureRoomTypeForProperty(propertyId: string, roomTypeId: string) {
  const roomType = await roomTypesRepo.findById(propertyId, roomTypeId);
  if (!roomType) throw Errors.notFound("loại phòng");
  return roomType;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
}

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
    await ensureRoomTypeForProperty(req.user!.propertyId, parsed.data.roomTypeId);
    if (await roomsRepo.findByNumber(req.user!.propertyId, parsed.data.number)) {
      throw Errors.conflict(`Số phòng ${parsed.data.number} đã tồn tại.`);
    }
    let room;
    try {
      room = await roomsRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
    } catch (error) {
      if (isUniqueViolation(error)) throw Errors.conflict(`Số phòng ${parsed.data.number} đã tồn tại.`);
      throw error;
    }
    await writeAuditLog({ req, action: "CREATE_ROOM", entityType: "room", entityId: room.id, afterData: room });
    res.status(201).json(room);
  })
);

roomsRouter.post(
  "/batch",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const parsed = batchCreateSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    await ensureRoomTypeForProperty(req.user!.propertyId, parsed.data.roomTypeId);
    const existing = await Promise.all(parsed.data.numbers.map((number) => roomsRepo.findByNumber(req.user!.propertyId, number)));
    const duplicate = existing.find((room) => room !== null);
    if (duplicate) throw Errors.conflict(`Số phòng ${duplicate.number} đã tồn tại. Không phòng nào được thêm.`);
    let rooms;
    try {
      rooms = await roomsRepo.createMany(
        req.user!.propertyId,
        req.user!.tenantId,
        parsed.data.numbers.map((number) => ({
          roomTypeId: parsed.data.roomTypeId,
          number,
          floor: parsed.data.floor,
          zone: parsed.data.zone,
          status: "VACANT",
        }))
      );
    } catch (error) {
      if (isUniqueViolation(error)) throw Errors.conflict("Có số phòng đã tồn tại. Không phòng nào được thêm.");
      throw error;
    }
    await Promise.all(rooms.map((room) => writeAuditLog({ req, action: "CREATE_ROOM", entityType: "room", entityId: room.id, afterData: room })));
    res.status(201).json({ items: rooms, total: rooms.length });
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
    if (parsed.data.roomTypeId) await ensureRoomTypeForProperty(req.user!.propertyId, parsed.data.roomTypeId);
    if (parsed.data.number && await roomsRepo.findByNumber(req.user!.propertyId, parsed.data.number, existing.id)) {
      throw Errors.conflict(`Số phòng ${parsed.data.number} đã tồn tại.`);
    }
    let room;
    try {
      room = await roomsRepo.update(req.user!.propertyId, req.params.id, parsed.data);
    } catch (error) {
      if (isUniqueViolation(error)) throw Errors.conflict("Số phòng đã tồn tại.");
      throw error;
    }
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
