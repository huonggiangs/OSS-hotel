import { pool } from "../lib/db";
import type { Device, DeviceControlKind, DeviceStatus, DeviceType } from "../types/domain";

export interface DeviceInput {
  roomId?: string | null;
  deviceType?: DeviceType;
  controlKind?: DeviceControlKind;
  name: string;
  externalId?: string | null;
  assetCode?: string | null;
  status?: DeviceStatus;
  powerOn?: boolean;
  locationScope?: "ROOM" | "FLOOR" | "ZONE" | "PROPERTY";
  locationLabel?: string | null;
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
         INSERT INTO devices (id, property_id, tenant_id, room_id, device_type, control_kind, name, external_id, asset_code, status, power_on, location_scope, location_label)
         SELECT gen_random_uuid()::text, $1, $2, selected_room.id, $4, $5, $6, $7, $8, $9, $10, $11, $12
         FROM selected_room
         RETURNING *`,
        [
          propertyId,
          tenantId,
          input.roomId,
          input.deviceType ?? "POWER_SWITCH",
          input.controlKind ?? "POWER_SWITCH",
          input.name,
          input.externalId ?? null,
          input.assetCode ?? null,
          input.status ?? "OFFLINE",
          input.powerOn ?? false,
          input.locationScope ?? "ROOM",
          input.locationLabel ?? null,
        ]
      );
      return rows[0] ?? null;
    }

    const { rows } = await pool.query<Device>(
      `INSERT INTO devices (id, property_id, tenant_id, room_id, device_type, control_kind, name, external_id, asset_code, status, power_on, location_scope, location_label)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        propertyId,
        tenantId,
        input.roomId ?? null,
        input.deviceType ?? "POWER_SWITCH",
        input.controlKind ?? "POWER_SWITCH",
        input.name,
        input.externalId ?? null,
        input.assetCode ?? null,
        input.status ?? "OFFLINE",
        input.powerOn ?? false,
        input.locationScope ?? (input.roomId ? "ROOM" : "PROPERTY"),
        input.locationLabel ?? null,
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

  async setIotLink(propertyId: string, id: string, assetCode: string, iotDeviceId: string): Promise<Device | null> {
    const { rows } = await pool.query<Device>(
      `UPDATE devices SET asset_code = $1, iot_device_id = $2, updated_at = now()
       WHERE property_id = $3 AND id = $4 RETURNING *`,
      [assetCode, iotDeviceId, propertyId, id]
    );
    return rows[0] ?? null;
  },

  async remove(propertyId: string, id: string): Promise<void> {
    await pool.query(`DELETE FROM devices WHERE property_id = $1 AND id = $2`, [propertyId, id]);
  },
};
