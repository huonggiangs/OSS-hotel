import { pool } from "../lib/db";
import { writeOutboxEvent } from "../utils/outbox";
import type { CommandStatus, DeviceCommand } from "../types/domain";

// Mirror CHÍNH XÁC mô hình idempotent của
// smart-hotel-os/services/iot-service/src/repositories/commands.repo.ts —
// chỉ khác ở chỗ chạy trên PGlite cục bộ + ghi outbox_events khi tạo lệnh mới
// (để Cloud biết Edge Node đã ra lệnh gì, phục vụ đối soát/báo cáo — Cloud
// KHÔNG cần ack lại, vì thiết bị vật lý ack thẳng tại Edge Node, không qua
// Cloud, đúng tinh thần "Cloud-independent for day-to-day operation").
export const commandsRepo = {
  async findByIdempotencyKey(idempotencyKey: string): Promise<DeviceCommand | null> {
    const { rows } = await pool.query<DeviceCommand>(`SELECT * FROM device_commands WHERE idempotency_key = $1`, [
      idempotencyKey,
    ]);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<DeviceCommand | null> {
    const { rows } = await pool.query<DeviceCommand>(`SELECT * FROM device_commands WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: {
    id: string;
    tenantId: string;
    propertyId: string;
    deviceId: string;
    commandType: string;
    payload: unknown;
    idempotencyKey: string;
    expiresAt: Date;
  }): Promise<DeviceCommand> {
    return pool.transaction(async (tx) => {
      const { rows } = await tx.query<DeviceCommand>(
        `INSERT INTO device_commands
          (id, tenant_id, property_id, device_id, command_type, payload, idempotency_key, status, sent_at, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING', now(), $8)
         RETURNING *`,
        [
          input.id,
          input.tenantId,
          input.propertyId,
          input.deviceId,
          input.commandType,
          JSON.stringify(input.payload ?? {}),
          input.idempotencyKey,
          input.expiresAt.toISOString(),
        ]
      );
      const command = rows[0];
      await writeOutboxEvent(tx, { entityType: "device_command", entityId: command.id, eventType: "DEVICE_COMMAND_ISSUED", payload: command });
      return command;
    });
  },

  async markAcked(id: string, ackResult: unknown): Promise<DeviceCommand | null> {
    return pool.transaction(async (tx) => {
      const { rows } = await tx.query<DeviceCommand>(
        `UPDATE device_commands SET status = 'ACKED', acked_at = now(), ack_result = $2
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [id, JSON.stringify(ackResult)]
      );
      const command = rows[0] ?? null;
      if (command) {
        await writeOutboxEvent(tx, { entityType: "device_command", entityId: command.id, eventType: "DEVICE_COMMAND_ACKED", payload: command });
      }
      return command;
    });
  },

  /** Lazy check: nếu lệnh đang PENDING mà đã quá expires_at, chuyển sang TIMEOUT. */
  async expireIfOverdue(command: DeviceCommand): Promise<DeviceCommand> {
    if (command.status !== "PENDING") return command;
    if (new Date(command.expires_at).getTime() > Date.now()) return command;
    const { rows } = await pool.query<DeviceCommand>(
      `UPDATE device_commands SET status = 'TIMEOUT' WHERE id = $1 AND status = 'PENDING' RETURNING *`,
      [command.id]
    );
    return rows[0] ?? command;
  },

  /** Quét toàn bộ lệnh PENDING quá hạn — dùng bởi timeout sweep định kỳ (xem src/index.ts). */
  async sweepExpired(): Promise<number> {
    const { rowCount } = await pool.query(
      `UPDATE device_commands SET status = 'TIMEOUT' WHERE status = 'PENDING' AND expires_at < now()`
    );
    return rowCount ?? 0;
  },

  async listByDevice(deviceId: string, status?: CommandStatus, limit = 50): Promise<DeviceCommand[]> {
    if (status) {
      const { rows } = await pool.query<DeviceCommand>(
        `SELECT * FROM device_commands WHERE device_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3`,
        [deviceId, status, limit]
      );
      return rows;
    }
    const { rows } = await pool.query<DeviceCommand>(
      `SELECT * FROM device_commands WHERE device_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [deviceId, limit]
    );
    return rows;
  },
};
