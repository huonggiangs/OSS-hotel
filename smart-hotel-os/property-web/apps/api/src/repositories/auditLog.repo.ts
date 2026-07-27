import { pool } from "../lib/db";
import type { AuditLog } from "../types/domain";

export const auditLogRepo = {
  async create(params: {
    propertyId?: string;
    tenantId?: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    beforeData?: unknown;
    afterData?: unknown;
    ipAddress?: string;
  }) {
    await pool.query(
      `INSERT INTO audit_log
        (id, property_id, tenant_id, user_id, action, entity_type, entity_id, before_data, after_data, ip_address)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        params.propertyId ?? null,
        params.tenantId ?? null,
        params.userId ?? null,
        params.action,
        params.entityType,
        params.entityId ?? null,
        params.beforeData ? JSON.stringify(params.beforeData) : null,
        params.afterData ? JSON.stringify(params.afterData) : null,
        params.ipAddress ?? null,
      ]
    );
  },

  async listByProperty(propertyId: string, limit = 100): Promise<AuditLog[]> {
    const { rows } = await pool.query<AuditLog>(
      `SELECT * FROM audit_log WHERE property_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [propertyId, limit]
    );
    return rows;
  },
};
