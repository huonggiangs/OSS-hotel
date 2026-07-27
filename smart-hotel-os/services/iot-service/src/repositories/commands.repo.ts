import { pool } from "../lib/db";
import type { CommandStatus, DeviceCommand } from "../types/domain";

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
    const { rows } = await pool.query<DeviceCommand>(
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
    return rows[0];
  },

  async markAcked(id: string, ackResult: unknown): Promise<DeviceCommand | null> {
    const { rows } = await pool.query<DeviceCommand>(
      `UPDATE device_commands SET status = 'ACKED', acked_at = now(), ack_result = $2
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [id, JSON.stringify(ackResult)]
    );
    return rows[0] ?? null;
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
