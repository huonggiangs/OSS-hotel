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
  property_name: string;
  property_phone: string | null;
  room_number: string;
  room_type_name: string;
  floor: string;
  base_price: string;
  room_code: string;
}

publicRoomsRouter.get(
  "/rooms/:token",
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query<PublicRoomRow>(
      `SELECT
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
    res.json({
      propertyName: row.property_name,
      propertyPhone: row.property_phone,
      roomNumber: row.room_number,
      roomTypeName: row.room_type_name,
      floor: row.floor,
      basePrice: row.base_price,
      roomCode: row.room_code,
    });
  })
);
