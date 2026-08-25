import { pool } from "../lib/db";
import type { Device, DeviceStatus, DeviceType } from "../types/domain";

export interface DeviceInput {
  roomId?: string | null;
  deviceType?: DeviceType;
  name: string;
  externalId?: string | null;
  status?: DeviceStatus;
  powerOn?: boolean;
}

export const devicesRepo = {
  async list(propertyId: string, roomId?: string): Promise<Device[]> {
    const params: unknown[] = [propertyId];
    let where = `WHERE property_id = $1`;
    if (roomId) {
      params.push(roomId);
      where += ` AND room_id = $${params.length}`;
    }
    const { rows } = await pool.query<Device>(`SELECT * FROM devices ${where} ORDER BY created_at ASC`, params);
    return rows;
  },

  async create(propertyId: string, tenantId: string, input: DeviceInput): Promise<Device | null> {
    // Không để PostgreSQL ném foreign-key error mơ hồ khi client gửi roomId cũ
    // hoặc room của cơ sở khác. Một SQL statement vừa kiểm tra ownership vừa giữ
    // KEY SHARE lock đến hết INSERT, nên phòng không thể bị xóa giữa lúc kiểm
    // tra và ghi thiết bị.
    if (input.roomId) {
      const { rows } = await pool.query<Device>(
        `WITH selected_room AS (
           SELECT id FROM rooms WHERE id = $3 AND property_id = $1 FOR KEY SHARE
         )
         INSERT INTO devices (id, property_id, tenant_id, room_id, device_type, name, external_id, status, power_on)
         SELECT gen_random_uuid()::text, $1, $2, selected_room.id, $4, $5, $6, $7, $8
         FROM selected_room
         RETURNING *`,
        [
          propertyId,
          tenantId,
          input.roomId,
          input.deviceType ?? "POWER_SWITCH",
          input.name,
          input.externalId ?? null,
          input.status ?? "OFFLINE",
          input.powerOn ?? false,
        ]
      );
      return rows[0] ?? null;
    }

    const { rows } = await pool.query<Device>(
      `INSERT INTO devices (id, property_id, tenant_id, room_id, device_type, name, external_id, status, power_on)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        propertyId,
        tenantId,
        input.roomId ?? null,
        input.deviceType ?? "POWER_SWITCH",
        input.name,
        input.externalId ?? null,
        input.status ?? "OFFLINE",
        input.powerOn ?? false,
      ]
    );
    return rows[0] ?? null;
  },

  async setPower(propertyId: string, id: string, powerOn: boolean): Promise<Device | null> {
    const { rows } = await pool.query<Device>(
      `UPDATE devices SET power_on = $1, updated_at = now() WHERE property_id = $2 AND id = $3 RETURNING *`,
      [powerOn, propertyId, id]
    );
    return rows[0] ?? null;
  },
};
