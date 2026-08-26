import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { Room, RoomStatus } from "../types/domain";

export interface RoomInput {
  roomTypeId: string;
  number: string;
  floor: string;
  zone: string;
  status?: RoomStatus;
  powerOn?: boolean;
  note?: string | null;
}

// Kèm luôn tên/giá loại phòng qua JOIN — UI Rooms (RoomGrid) cần hiển thị thẳng
// type/price mà không phải gọi thêm request room-types riêng.
export interface RoomWithType extends Room {
  room_type_name: string;
  room_type_price: string;
  active_booking_id: string | null;
  active_guest_name: string | null;
  active_checkin_date: string | null;
  active_booking_total_price: string | null;
  active_booking_deposit: string | null;
}

export const roomsRepo = {
  async list(propertyId: string): Promise<RoomWithType[]> {
    const { rows } = await pool.query<RoomWithType>(
      `SELECT r.*, rt.name AS room_type_name, rt.base_price AS room_type_price,
              active_booking.id AS active_booking_id,
              active_booking.guest_name AS active_guest_name,
              active_booking.checkin_date AS active_checkin_date,
              active_booking.total_price AS active_booking_total_price,
              active_booking.deposit AS active_booking_deposit
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       LEFT JOIN LATERAL (
         SELECT b.id, c.full_name AS guest_name, b.checkin_date, b.total_price, b.deposit
         FROM bookings b
         LEFT JOIN customers c ON c.id = b.customer_id
         WHERE b.property_id = r.property_id AND b.room_id = r.id AND b.status = 'CHECKED_IN'
         ORDER BY b.checkin_date DESC, b.updated_at DESC
         LIMIT 1
       ) active_booking ON true
       WHERE r.property_id = $1
       ORDER BY r.number ASC`,
      [propertyId]
    );
    return rows;
  },

  async findById(propertyId: string, id: string): Promise<Room | null> {
    const { rows } = await pool.query<Room>(`SELECT * FROM rooms WHERE property_id = $1 AND id = $2`, [
      propertyId,
      id,
    ]);
    return rows[0] ?? null;
  },

  async create(propertyId: string, tenantId: string, input: RoomInput): Promise<Room> {
    // room_code/qr_token luôn sinh ở server — KHÔNG nhận giá trị client gửi lên,
    // vì qr_token cấp quyền đọc thông tin phòng công khai (endpoint /guest/room/:token
    // không yêu cầu đăng nhập) nên phải không đoán được (UUID ngẫu nhiên đầy đủ).
    const roomCode = `PHONG-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const qrToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    const { rows } = await pool.query<Room>(
      `INSERT INTO rooms
        (id, property_id, tenant_id, room_type_id, number, floor, zone, status, power_on, note, room_code, qr_token)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        propertyId,
        tenantId,
        input.roomTypeId,
        input.number,
        input.floor,
        input.zone,
        input.status ?? "VACANT",
        input.powerOn ?? false,
        input.note ?? null,
        roomCode,
        qrToken,
      ]
    );
    return rows[0];
  },

  async update(propertyId: string, id: string, input: Partial<RoomInput>): Promise<Room | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      room_type_id: input.roomTypeId,
      number: input.number,
      floor: input.floor,
      zone: input.zone,
      status: input.status,
      power_on: input.powerOn,
      note: input.note,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(propertyId, id);
    params.push(propertyId, id);
    const { rows } = await pool.query<Room>(
      `UPDATE rooms SET ${fields.join(", ")}, updated_at = now()
       WHERE property_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  // Bật/tắt điện — endpoint riêng cho UI công tắc điện IoT trong lưới phòng
  // (RULES.md mục 10: lệnh phải idempotent — set thẳng giá trị true/false, không
  // phải "toggle" mù ở tầng DB, tránh lệch trạng thái khi gọi lại nhiều lần).
  async setPower(propertyId: string, id: string, powerOn: boolean): Promise<Room | null> {
    const { rows } = await pool.query<Room>(
      `UPDATE rooms SET power_on = $1, updated_at = now() WHERE property_id = $2 AND id = $3 RETURNING *`,
      [powerOn, propertyId, id]
    );
    return rows[0] ?? null;
  },

  // Bật/tắt cờ "đủ điều kiện đồng bộ OTA" — cùng khuôn mẫu idempotent-set như
  // setPower() ở trên (set thẳng giá trị, không toggle mù ở tầng DB). CHƯA gọi
  // API kênh phân phối thật — đó là phạm vi của channel-manager-service.
  async setSync(propertyId: string, id: string, syncEnabled: boolean): Promise<Room | null> {
    const { rows } = await pool.query<Room>(
      `UPDATE rooms SET sync_enabled = $1, updated_at = now() WHERE property_id = $2 AND id = $3 RETURNING *`,
      [syncEnabled, propertyId, id]
    );
    return rows[0] ?? null;
  },

  // Xoá phòng — route đã kiểm tra trước phòng không ở trạng thái OCCUPIED.
  async remove(propertyId: string, id: string): Promise<void> {
    await pool.query(`DELETE FROM rooms WHERE property_id = $1 AND id = $2`, [propertyId, id]);
  },

  async hasBookingReferences(propertyId: string, id: string): Promise<boolean> {
    const { rows } = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM bookings WHERE property_id = $1 AND room_id = $2) AS exists`,
      [propertyId, id]
    );
    return rows[0]?.exists ?? false;
  },

  // Tra cứu công khai theo qr_token — dùng cho trang khách quét QR
  // (/guest/room/:token), KHÔNG có propertyId vì khách chưa đăng nhập, không
  // biết property nào. qr_token là duy nhất toàn hệ thống nên đủ làm khoá tra.
  async findByQrToken(token: string): Promise<Room | null> {
    const { rows } = await pool.query<Room>(`SELECT * FROM rooms WHERE qr_token = $1`, [token]);
    return rows[0] ?? null;
  },

  async statusBreakdown(propertyId: string): Promise<{ status: RoomStatus; count: number }[]> {
    const { rows } = await pool.query<{ status: RoomStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM rooms WHERE property_id = $1 GROUP BY status`,
      [propertyId]
    );
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  },

  async typeBreakdown(propertyId: string): Promise<{ type_name: string; count: number }[]> {
    const { rows } = await pool.query<{ type_name: string; count: string }>(
      `SELECT rt.name AS type_name, COUNT(*)::text AS count
       FROM rooms r JOIN room_types rt ON rt.id = r.room_type_id
       WHERE r.property_id = $1 GROUP BY rt.name`,
      [propertyId]
    );
    return rows.map((r) => ({ type_name: r.type_name, count: Number(r.count) }));
  },

  async countTotal(propertyId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM rooms WHERE property_id = $1`, [
      propertyId,
    ]);
    return Number(rows[0]?.count ?? 0);
  },
};
