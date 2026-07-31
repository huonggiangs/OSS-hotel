import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import { writeOutboxEvent } from "../utils/outbox";
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

  async findById(propertyId: string, id: string): Promise<Device | null> {
    const { rows } = await pool.query<Device>(`SELECT * FROM devices WHERE property_id = $1 AND id = $2`, [propertyId, id]);
    return rows[0] ?? null;
  },

  async create(propertyId: string, tenantId: string, input: DeviceInput): Promise<Device> {
    return pool.transaction(async (tx) => {
      const id = randomUUID();
      const { rows } = await tx.query<Device>(
        `INSERT INTO devices (id, property_id, tenant_id, room_id, device_type, name, external_id, status, power_on)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          id,
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
      const device = rows[0];
      await writeOutboxEvent(tx, { entityType: "device", entityId: device.id, eventType: "DEVICE_CREATED", payload: device });
      return device;
    });
  },

  async updatePowerState(id: string, powerOn: boolean): Promise<Device | null> {
    return pool.transaction(async (tx) => {
      const { rows } = await tx.query<Device>(
        `UPDATE devices SET power_on = $1, status = 'ONLINE', updated_at = now() WHERE id = $2 RETURNING *`,
        [powerOn, id]
      );
      const device = rows[0] ?? null;
      if (device) {
        await writeOutboxEvent(tx, { entityType: "device", entityId: device.id, eventType: "DEVICE_POWER_CHANGED", payload: device });
      }
      return device;
    });
  },

  async upsertFromCloud(device: Device): Promise<void> {
    await pool.query(
      `INSERT INTO devices (id, property_id, tenant_id, room_id, device_type, name, external_id, status, power_on, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         room_id = EXCLUDED.room_id, device_type = EXCLUDED.device_type, name = EXCLUDED.name,
         external_id = EXCLUDED.external_id, status = EXCLUDED.status, power_on = EXCLUDED.power_on,
         updated_at = EXCLUDED.updated_at
       WHERE EXCLUDED.updated_at > devices.updated_at`,
      [
        device.id,
        device.property_id,
        device.tenant_id,
        device.room_id,
        device.device_type,
        device.name,
        device.external_id,
        device.status,
        device.power_on,
        device.created_at,
        device.updated_at,
      ]
    );
  },
};
