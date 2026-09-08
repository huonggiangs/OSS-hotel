import { createHash, randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import { Errors } from "../utils/errors";

export type GoLiveProgressStatus = "DONE" | "IN_PROGRESS" | "MISSING";
export interface GoLiveProgressLog {
  id: string;
  completed_at: string;
  session_description: string;
  related_items: string[];
  status: GoLiveProgressStatus;
  evidence: string;
  performed_by: string;
  notes: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}
export interface GoLiveProgressInput {
  completedAt: string;
  sessionDescription: string;
  relatedItems: string[];
  status: GoLiveProgressStatus;
  evidence: string;
  performedBy: string;
  notes?: string | null;
  idempotencyKey: string;
}

function requestHash(input: GoLiveProgressInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export const goLiveProgressRepo = {
  async create(input: GoLiveProgressInput, audit: { userId?: string; ipAddress?: string }) {
    const client = await pool.connect();
    const hash = requestHash(input);
    try {
      await client.query("BEGIN");
      const inserted = await client.query<GoLiveProgressLog>(
        `INSERT INTO go_live_progress_logs
          (id,completed_at,session_description,related_items,status,evidence,performed_by,notes,idempotency_key,request_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
        [randomUUID(),input.completedAt,input.sessionDescription,input.relatedItems,input.status,input.evidence,input.performedBy,input.notes ?? null,input.idempotencyKey,hash]
      );
      const item = inserted.rows[0] ?? (await client.query<GoLiveProgressLog & { request_hash: string }>(
        "SELECT * FROM go_live_progress_logs WHERE idempotency_key=$1", [input.idempotencyKey]
      )).rows[0];
      if (!item) throw new Error("Không đọc được log tiến trình sau khi ghi.");
      if ((item as GoLiveProgressLog & { request_hash?: string }).request_hash !== hash) {
        throw Errors.conflict("Idempotency key đã được dùng cho nội dung khác.");
      }
      await client.query(
        `INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,after_data,ip_address)
         VALUES (gen_random_uuid()::text,$1,$2,'go_live_progress_log',$3,$4,$5)`,
        [audit.userId ?? null, inserted.rows[0] ? "CREATE_GO_LIVE_PROGRESS" : "REPLAY_GO_LIVE_PROGRESS", item.id, JSON.stringify(input), audit.ipAddress ?? null]
      );
      await client.query("COMMIT");
      return { item, replayed: !inserted.rows[0] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async list(filters: { from?: string; to?: string; status?: GoLiveProgressStatus; performedBy?: string; page: number; pageSize: number }) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, value: unknown) => { params.push(value); clauses.push(sql.replace("?", `$${params.length}`)); };
    if (filters.from) add("completed_at >= ?", filters.from);
    if (filters.to) add("completed_at <= ?", filters.to);
    if (filters.status) add("status = ?", filters.status);
    if (filters.performedBy) add("performed_by = ?", filters.performedBy);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const count = await pool.query<{ count: string }>(`SELECT count(*)::text count FROM go_live_progress_logs ${where}`, params);
    const values = [...params, filters.pageSize, (filters.page - 1) * filters.pageSize];
    const rows = await pool.query<GoLiveProgressLog>(`SELECT * FROM go_live_progress_logs ${where} ORDER BY completed_at DESC,created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { items: rows.rows, total: Number(count.rows[0]?.count ?? 0) };
  },

  async all() {
    return (await pool.query<GoLiveProgressLog>("SELECT * FROM go_live_progress_logs ORDER BY completed_at DESC,created_at DESC LIMIT 5000")).rows;
  },

  async summary() {
    return (await pool.query("SELECT * FROM go_live_progress_item_summary ORDER BY dimension,item")).rows;
  },
};
