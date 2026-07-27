import { pool } from "../lib/db";
import type { Device, PowerState } from "../types/domain";

export const devicesRepo = {
  async findById(id: string): Promise<Device | null> {
    const { rows } = await pool.query<Device>(`SELECT * FROM devices WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async list(propertyId?: string, roomId?: string): Promise<Device[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (propertyId) {
      params.push(propertyId);
      clauses.push(`property_id = $${params.length}`);
    }
    if (roomId) {
      params.push(roomId);
      clauses.push(`room_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<Device>(`SELECT * FROM devices ${where} ORDER BY created_at DESC`, params);
    return rows;
  },

  async create(input: {
    id: string;
    tenantId: string;
    propertyId: string;
    roomId: string;
    deviceType: "SWITCH" | "AIRCON";
    name: string;
  }): Promise<Device> {
    const { rows } = await pool.query<Device>(
      `INSERT INTO devices (id, tenant_id, property_id, room_id, device_type, name, status, power_state)
       VALUES ($1,$2,$3,$4,$5,$6,'ONLINE','OFF')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
       RETURNING *`,
      [input.id, input.tenantId, input.propertyId, input.roomId, input.deviceType, input.name]
    );
    return rows[0];
  },

  async updatePowerState(id: string, powerState: PowerState): Promise<void> {
    await pool.query(`UPDATE devices SET power_state = $2, updated_at = now() WHERE id = $1`, [id, powerState]);
  },

  async touchHeartbeat(id: string): Promise<Device | null> {
    const { rows } = await pool.query<Device>(
      `UPDATE devices SET status = 'ONLINE', last_heartbeat_at = now(), updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },
};
