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
       VALUES ($1,$2,$3,$4,$5,$6,'OFFLINE','OFF')
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

  async findByAssetCode(assetCode: string): Promise<Device | null> {
    const { rows } = await pool.query<Device>(`SELECT * FROM devices WHERE asset_code = $1`, [assetCode]);
    return rows[0] ?? null;
  },

  /**
   * "Ghép nối" (pair) thiết bị vận hành thật ở đây với 1 bản ghi tài sản đã
   * khai báo trong webadmin — ghi lại asset_code (mã do webadmin sinh ra) để
   * webadmin đọc ngược lại được qua GET /devices khi đồng bộ trạng thái.
   */
  async pairAssetCode(id: string, assetCode: string): Promise<Device | null> {
    const { rows } = await pool.query<Device>(
      `UPDATE devices SET asset_code = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, assetCode]
    );
    return rows[0] ?? null;
  },

  /**
   * Quét các thiết bị đang ONLINE nhưng quá lâu không có heartbeat mới —
   * chuyển sang OFFLINE và CỘNG DỒN disconnect_count. Chạy định kỳ trong
   * index.ts (giống cơ chế "timeout sweep" đã có cho device_commands) — đây
   * là cách đơn giản nhất để có dữ liệu "số lần mất kết nối" THẬT mà không
   * cần MQTT broker/keepalive TCP thật (chưa có phần cứng, xem PROGRESS.md).
   */
  async sweepOfflineDevices(timeoutMs: number): Promise<number> {
    const { rows } = await pool.query<{ id: string }>(
      `UPDATE devices
       SET status = 'OFFLINE', disconnect_count = disconnect_count + 1, updated_at = now()
       WHERE status = 'ONLINE'
         AND (last_heartbeat_at IS NULL OR last_heartbeat_at < now() - ($1::text || ' milliseconds')::interval)
       RETURNING id`,
      [timeoutMs]
    );
    return rows.length;
  },
};
