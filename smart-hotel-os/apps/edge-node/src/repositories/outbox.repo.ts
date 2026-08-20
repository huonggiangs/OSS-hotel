import { pool } from "../lib/db";
import type { OutboxEvent, OutboxStatus } from "../types/domain";

export const outboxRepo = {
  async listRetryable(limit = 100): Promise<OutboxEvent[]> {
    const { rows } = await pool.query<OutboxEvent>(
      `SELECT * FROM outbox_events
       WHERE status = 'PENDING' OR (status = 'FAILED' AND (next_retry_at IS NULL OR next_retry_at <= now()))
       ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async markSynced(id: string): Promise<void> {
    await pool.query(`UPDATE outbox_events SET status = 'SYNCED', synced_at = now(), next_retry_at = NULL, last_error = NULL WHERE id = $1`, [id]);
  },

  async markFailed(id: string, error: string): Promise<void> {
    const { rows } = await pool.query<{ attempts: number }>(`SELECT attempts FROM outbox_events WHERE id = $1`, [id]);
    const retryNumber = (rows[0]?.attempts ?? 0) + 1;
    const delaySeconds = Math.min(300, 2 ** Math.min(retryNumber, 8));
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
    await pool.query(
      `UPDATE outbox_events
       SET status = 'FAILED', attempts = attempts + 1, next_retry_at = $3, last_error = $2
       WHERE id = $1`,
      [id, error, nextRetryAt.toISOString()]
    );
  },

  // Retry: FAILED quay lại PENDING để lần sync sau thử lại (không loại trừ
  // vĩnh viễn — lỗi mạng tạm thời rất phổ biến ở môi trường khách sạn).
  async requeueFailed(id: string): Promise<void> {
    await pool.query(`UPDATE outbox_events SET status = 'PENDING', next_retry_at = NULL WHERE id = $1`, [id]);
  },

  async requeueAllFailed(): Promise<number> {
    const { rowCount } = await pool.query(`UPDATE outbox_events SET status = 'PENDING', next_retry_at = NULL WHERE status = 'FAILED'`);
    return rowCount ?? 0;
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
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM outbox_events
       WHERE status = 'PENDING' OR (status = 'FAILED' AND (next_retry_at IS NULL OR next_retry_at <= now()))`
    );
    return Number(rows[0]?.count ?? 0);
  },

  async listRecent(limit = 20): Promise<OutboxEvent[]> {
    const { rows } = await pool.query<OutboxEvent>(`SELECT * FROM outbox_events ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows;
  },
};
