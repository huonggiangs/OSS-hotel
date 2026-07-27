import { pool } from "../lib/db";
import type { AuditLog } from "../types/domain";

export const auditLogsRepo = {
  async create(entry: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    beforeData?: unknown;
    afterData?: unknown;
    ipAddress?: string | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, before_data, after_data, ip_address)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7)`,
      [
        entry.userId ?? null,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.beforeData !== undefined ? JSON.stringify(entry.beforeData) : null,
        entry.afterData !== undefined ? JSON.stringify(entry.afterData) : null,
        entry.ipAddress ?? null,
      ]
    );
  },

  async list(opts: { entityType?: string; userId?: string; page: number; pageSize: number }): Promise<{ items: AuditLog[]; total: number }> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts.entityType) {
      params.push(opts.entityType);
      clauses.push(`entity_type = $${params.length}`);
    }
    if (opts.userId) {
      params.push(opts.userId);
      clauses.push(`user_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const countResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM audit_logs ${where}`, params);
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataParams = [...params, opts.pageSize, (opts.page - 1) * opts.pageSize];
    const { rows } = await pool.query<AuditLog>(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    return { items: rows, total };
  },
};
