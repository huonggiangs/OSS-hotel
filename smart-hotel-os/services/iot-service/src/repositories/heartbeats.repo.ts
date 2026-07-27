import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { DeviceHeartbeatWindow, PowerState } from "../types/domain";

/** Cửa sổ tổng hợp: làm tròn xuống đầu giờ (1 giờ/cửa sổ). */
function windowStartOf(date: Date): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export const heartbeatsRepo = {
  /**
   * Ghi nhận 1 nhịp tim vào đúng cửa sổ giờ hiện tại — CỘNG DỒN (upsert),
   * không tạo dòng mới cho mỗi nhịp tim, tránh phình bảng vô hạn (đúng
   * nguyên tắc SYSTEM_ARCHITECTURE.md mục 8.4).
   */
  async record(input: {
    tenantId: string;
    propertyId: string;
    deviceId: string;
    online: boolean;
    powerState: PowerState;
  }): Promise<DeviceHeartbeatWindow> {
    const start = windowStartOf(new Date());
    const end = new Date(start);
    end.setUTCHours(end.getUTCHours() + 1);

    const { rows } = await pool.query<DeviceHeartbeatWindow>(
      `INSERT INTO device_heartbeats
        (id, tenant_id, property_id, device_id, window_start, window_end, sample_count, online_count, offline_count, last_power_state)
       VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$9)
       ON CONFLICT (device_id, window_start) DO UPDATE SET
         sample_count = device_heartbeats.sample_count + 1,
         online_count = device_heartbeats.online_count + $7,
         offline_count = device_heartbeats.offline_count + $8,
         last_power_state = $9,
         updated_at = now()
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.deviceId,
        start.toISOString(),
        end.toISOString(),
        input.online ? 1 : 0,
        input.online ? 0 : 1,
        input.powerState,
      ]
    );
    return rows[0];
  },

  async listByDevice(deviceId: string, limit = 24): Promise<DeviceHeartbeatWindow[]> {
    const { rows } = await pool.query<DeviceHeartbeatWindow>(
      `SELECT * FROM device_heartbeats WHERE device_id = $1 ORDER BY window_start DESC LIMIT $2`,
      [deviceId, limit]
    );
    return rows;
  },
};
