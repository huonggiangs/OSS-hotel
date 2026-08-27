import { Router } from "express";
import { pool } from "../lib/db";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";

// Router CÔNG KHAI — KHÔNG requireAuth, được gọi thẳng từ trình duyệt điện
// thoại của khách khi quét mã QR dán ở cửa phòng (trang /guest/room/:token
// bên apps/web). Chỉ trả về đúng những trường cần hiển thị cho khách, KHÔNG
// lộ id nội bộ/tenant_id/property_id hay bất kỳ cột nào khác.
export const publicRoomsRouter = Router();

interface PublicRoomRow {
  property_id: string;
  property_name: string;
  property_phone: string | null;
  room_number: string;
  room_type_name: string;
  floor: string;
  base_price: string;
  room_code: string;
}

interface SupportPartner {
  name: string;
  category: string;
  phone?: string;
  note?: string;
}

function publicSupportPartners(value: unknown): SupportPartner[] {
  if (!value || typeof value !== "object") return [];
  const candidates = (value as { maintenancePartners?: unknown }).maintenancePartners;
  if (!Array.isArray(candidates)) return [];
  return candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    if (item.visibleToGuest === false || typeof item.name !== "string" || typeof item.category !== "string") return [];
    return [{
      name: item.name,
      category: item.category,
      ...(typeof item.phone === "string" && item.phone.trim() ? { phone: item.phone.trim() } : {}),
      ...(typeof item.note === "string" && item.note.trim() ? { note: item.note.trim() } : {}),
    }];
  });
}

publicRoomsRouter.get(
  "/rooms/:token",
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query<PublicRoomRow>(
      `SELECT
         p.id AS property_id,
         p.name AS property_name,
         p.phone AS property_phone,
         r.number AS room_number,
         rt.name AS room_type_name,
         r.floor AS floor,
         rt.base_price AS base_price,
         r.room_code AS room_code
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       JOIN properties p ON p.id = r.property_id
       WHERE r.qr_token = $1`,
      [req.params.token]
    );
    const row = rows[0];
    if (!row) throw Errors.notFound("thông tin phòng");
    const { rows: settingRows } = await pool.query<{ data: unknown }>(
      `SELECT data FROM property_settings WHERE property_id = $1 AND group_key = 'utilities'`,
      [row.property_id]
    );
    res.json({
      propertyName: row.property_name,
      propertyPhone: row.property_phone,
      roomNumber: row.room_number,
      roomTypeName: row.room_type_name,
      floor: row.floor,
      basePrice: row.base_price,
      roomCode: row.room_code,
      supportPartners: publicSupportPartners(settingRows[0]?.data),
    });
  })
);
