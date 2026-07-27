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
}

export const roomsRepo = {
  async list(propertyId: string): Promise<RoomWithType[]> {
    const { rows } = await pool.query<RoomWithType>(
      `SELECT r.*, rt.name AS room_type_name, rt.base_price AS room_type_price
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
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
    const { rows } = await pool.query<Room>(
      `INSERT INTO rooms
        (id, property_id, tenant_id, room_type_id, number, floor, zone, status, power_on, note)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9)
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
