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
  active_checkin_at: Date | null;
  active_checkout_at: Date | null;
  active_stay_type: "HOURLY" | "OVERNIGHT" | "DAILY" | null;
  active_booking_total_price: string | null;
  active_booking_deposit: string | null;
}

export const roomsRepo = {
  async list(propertyId: string): Promise<RoomWithType[]> {
    const { rows } = await pool.query<RoomWithType>(
      `WITH occupancy AS (
         SELECT COUNT(*)::numeric AS total_rooms,
                COUNT(*) FILTER (WHERE status = 'OCCUPIED')::numeric AS occupied_rooms
         FROM rooms
         WHERE property_id = $1
       ), last_stays AS (
         SELECT room_id, MAX(checkout_date) AS last_checkout
         FROM bookings
         WHERE property_id = $1 AND status = 'CHECKED_OUT' AND room_id IS NOT NULL
         GROUP BY room_id
       )
       SELECT r.*, rt.name AS room_type_name,
              CASE
                WHEN r.status = 'VACANT' AND dynamic_rule.enabled THEN GREATEST(
                  COALESCE(dynamic_rule.minimum_price, 0),
                  ROUND(
                    night_rate.amount
                    * CASE
                        WHEN GREATEST(CURRENT_DATE - COALESCE(last_stays.last_checkout, r.created_at::date), 0) >= dynamic_rule.vacancy_days
                          THEN 1 - dynamic_rule.vacancy_discount_percent / 100
                        ELSE 1
                      END
                    * CASE
                        WHEN occupancy.total_rooms = 0 THEN 1
                        WHEN occupancy.occupied_rooms * 100 / occupancy.total_rooms < dynamic_rule.low_occupancy_percent
                          THEN 1 + dynamic_rule.low_occupancy_adjustment_percent / 100
                        WHEN occupancy.occupied_rooms * 100 / occupancy.total_rooms > dynamic_rule.high_occupancy_percent
                          THEN 1 + dynamic_rule.high_occupancy_adjustment_percent / 100
                        ELSE 1
                      END,
                    2
                  )
                )
                ELSE night_rate.amount
              END AS room_type_price,
              active_booking.id AS active_booking_id,
              active_booking.guest_name AS active_guest_name,
              active_booking.checkin_date AS active_checkin_date,
              active_booking.checkin_at AS active_checkin_at,
              active_booking.checkout_at AS active_checkout_at,
              active_booking.stay_type AS active_stay_type,
              active_booking.total_price AS active_booking_total_price,
              active_booking.deposit AS active_booking_deposit
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       LEFT JOIN room_type_dynamic_pricing dynamic_rule
         ON dynamic_rule.property_id = r.property_id AND dynamic_rule.room_type_id = rt.id
       LEFT JOIN LATERAL (
         SELECT COALESCE((
           SELECT rtr.amount
           FROM room_type_rates rtr
           WHERE rtr.property_id = r.property_id
             AND rtr.room_type_id = rt.id
             AND rtr.rate_key = 'NIGHT'
             AND rtr.active = true
           ORDER BY rtr.sort_order ASC, rtr.updated_at DESC
           LIMIT 1
         ), rt.base_price) AS base_amount
       ) base_rate ON true
       LEFT JOIN LATERAL (
         SELECT
           h->>'adjustmentType' AS adjustment_type,
           CASE
             WHEN COALESCE(h->>'adjustmentValue', '') ~ '^[0-9]+(\\.[0-9]+)?$'
               THEN (h->>'adjustmentValue')::numeric
             ELSE 0
           END AS adjustment_value
         FROM property_settings settings
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(settings.data->'holidays', '[]'::jsonb)) h
         WHERE settings.property_id = r.property_id
           AND settings.group_key = 'time'
           AND CURRENT_DATE BETWEEN
             CASE WHEN COALESCE(h->>'from', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (h->>'from')::date ELSE NULL END
             AND CASE WHEN COALESCE(h->>'to', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN (h->>'to')::date ELSE NULL END
         ORDER BY h->>'from' ASC
         LIMIT 1
       ) holiday ON true
       LEFT JOIN LATERAL (
         SELECT CASE
           WHEN holiday.adjustment_type = 'PERCENT' THEN base_rate.base_amount * (1 + holiday.adjustment_value / 100)
           WHEN holiday.adjustment_type = 'FIXED' THEN base_rate.base_amount + holiday.adjustment_value
           ELSE base_rate.base_amount
         END AS amount
       ) night_rate ON true
       CROSS JOIN occupancy
       LEFT JOIN last_stays ON last_stays.room_id = r.id
       LEFT JOIN LATERAL (
         SELECT b.id, c.full_name AS guest_name, b.checkin_date, b.checkin_at, b.checkout_at, b.stay_type, b.total_price, b.deposit
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

  // Dùng cho luồng "Thêm nhanh tầng / phòng": toàn bộ danh sách được insert
  // trong một transaction, nên một số phòng bị trùng sẽ không để lại trạng thái
  // tạo dở dang ở các phòng trước đó.
  async createMany(propertyId: string, tenantId: string, inputs: RoomInput[]): Promise<Room[]> {
    return pool.transaction(async (tx) => {
      const created: Room[] = [];
      for (const input of inputs) {
        const roomCode = `PHONG-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        const qrToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
        const { rows } = await tx.query<Room>(
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
        created.push(rows[0]);
      }
      return created;
    });
  },

  async findByNumber(propertyId: string, number: string, exceptId?: string): Promise<Room | null> {
    const params: string[] = [propertyId, number];
    const excludeClause = exceptId ? ` AND id <> $3` : "";
    if (exceptId) params.push(exceptId);
    const { rows } = await pool.query<Room>(
      `SELECT * FROM rooms WHERE property_id = $1 AND number = $2${excludeClause} LIMIT 1`,
      params
    );
    return rows[0] ?? null;
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
