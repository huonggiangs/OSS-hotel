import { pool } from "../lib/db";
import type { OutboxEvent, OutboxStatus } from "../types/domain";

export const outboxRepo = {
  async listPending(limit = 100): Promise<OutboxEvent[]> {
    const { rows } = await pool.query<OutboxEvent>(
      `SELECT * FROM outbox_events WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async markSynced(id: string): Promise<void> {
    await pool.query(`UPDATE outbox_events SET status = 'SYNCED', synced_at = now(), last_error = NULL WHERE id = $1`, [id]);
  },

  async markFailed(id: string, error: string): Promise<void> {
    await pool.query(
      `UPDATE outbox_events SET status = 'FAILED', attempts = attempts + 1, last_error = $2 WHERE id = $1`,
      [id, error]
    );
  },

  // Retry: FAILED quay lại PENDING để lần sync sau thử lại (không loại trừ
  // vĩnh viễn — lỗi mạng tạm thời rất phổ biến ở môi trường khách sạn).
  async requeueFailed(id: string): Promise<void> {
    await pool.query(`UPDATE outbox_events SET status = 'PENDING' WHERE id = $1`, [id]);
  },

  async countByStatus(): Promise<Record<OutboxStatus, number>> {
    const { rows } = await pool.query<{ status: OutboxStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM outbox_events GROUP BY status`
    );
    const result: Record<OutboxStatus, number> = { PENDING: 0, SYNCED: 0, FAILED: 0 };
    for (const row of rows) result[row.status] = Number(row.count);
    return result;
  },

  async countPending(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM outbox_events WHERE status = 'PENDING'`);
    return Number(rows[0]?.count ?? 0);
  },

  async listRecent(limit = 20): Promise<OutboxEvent[]> {
    const { rows } = await pool.query<OutboxEvent>(`SELECT * FROM outbox_events ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows;
  },
};
