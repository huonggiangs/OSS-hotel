import { pool } from "../lib/db";

export type MobileConnectionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
export type MobilePlatform = "ANDROID" | "IOS";

export interface MobileConnectionView {
  id: string;
  user_id: string;
  property_id: string;
  tenant_id: string;
  username: string;
  platform: MobilePlatform;
  device_id: string;
  device_name: string;
  app_version: string | null;
  status: MobileConnectionStatus;
  pairing_code: string;
  request_secret_hash: string;
  approved_by_hq_user_id: string | null;
  approval_note: string | null;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
  last_seen_at: string | null;
  full_name: string;
  role: string;
  user_status: string;
  property_name: string;
}

const selectView = `
  SELECT mc.*, pu.full_name, pu.role::text, pu.status::text AS user_status, p.name AS property_name
  FROM mobile_connections mc
  JOIN property_users pu ON pu.id = mc.user_id
  JOIN properties p ON p.id = mc.property_id`;

export const mobileConnectionsRepo = {
  async findUser(identifier: string) {
    const { rows } = await pool.query<{
      id: string; property_id: string; tenant_id: string; username: string; email: string;
      full_name: string; role: string; status: string; property_name: string;
    }>(
      `SELECT pu.id, pu.property_id, pu.tenant_id, pu.username, pu.email, pu.full_name,
              pu.role::text, pu.status::text, p.name AS property_name
       FROM property_users pu JOIN properties p ON p.id = pu.property_id
       WHERE lower(pu.username) = lower($1) OR lower(pu.email) = lower($1)
       LIMIT 1`,
      [identifier]
    );
    return rows[0] ?? null;
  },

  async request(input: {
    userId: string; propertyId: string; tenantId: string; username: string;
    platform: MobilePlatform; deviceId: string; deviceName: string; appVersion?: string | null;
    pairingCode: string; requestSecretHash: string;
  }): Promise<MobileConnectionView> {
    const { rows } = await pool.query<MobileConnectionView>(
      `INSERT INTO mobile_connections
        (user_id, property_id, tenant_id, username, platform, device_id, device_name, app_version,
         status, pairing_code, request_secret_hash, requested_at, approved_at, rejected_at, revoked_at,
         approved_by_hq_user_id, approval_note, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,$10,now(),NULL,NULL,NULL,NULL,NULL,now())
       ON CONFLICT (user_id, device_id) DO UPDATE SET
         property_id = EXCLUDED.property_id, tenant_id = EXCLUDED.tenant_id,
         username = EXCLUDED.username, platform = EXCLUDED.platform,
         device_name = EXCLUDED.device_name, app_version = EXCLUDED.app_version,
         status = 'PENDING', pairing_code = EXCLUDED.pairing_code,
         request_secret_hash = EXCLUDED.request_secret_hash, requested_at = now(),
         approved_at = NULL, rejected_at = NULL, revoked_at = NULL,
         approved_by_hq_user_id = NULL, approval_note = NULL, updated_at = now()
       RETURNING *`,
      [input.userId, input.propertyId, input.tenantId, input.username, input.platform, input.deviceId,
       input.deviceName, input.appVersion ?? null, input.pairingCode, input.requestSecretHash]
    );
    return (await this.findById(rows[0].id))!;
  },

  async findById(id: string): Promise<MobileConnectionView | null> {
    const { rows } = await pool.query<MobileConnectionView>(`${selectView} WHERE mc.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async list(filters: { status?: string; search?: string }): Promise<MobileConnectionView[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.status) { params.push(filters.status); clauses.push(`mc.status = $${params.length}`); }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      clauses.push(`(mc.username ILIKE $${params.length} OR pu.full_name ILIKE $${params.length} OR p.name ILIKE $${params.length} OR mc.device_name ILIKE $${params.length} OR mc.pairing_code ILIKE $${params.length})`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<MobileConnectionView>(`${selectView}${where} ORDER BY CASE mc.status WHEN 'PENDING' THEN 0 ELSE 1 END, mc.requested_at DESC`, params);
    return rows;
  },

  async setStatus(id: string, status: MobileConnectionStatus, hqUserId: string, note?: string | null): Promise<MobileConnectionView | null> {
    const timestamp = status === "APPROVED" ? "approved_at" : status === "REJECTED" ? "rejected_at" : "revoked_at";
    const { rows } = await pool.query<{ id: string }>(
      `UPDATE mobile_connections SET status = $2, ${timestamp} = now(), approved_by_hq_user_id = $3,
         approval_note = $4, updated_at = now() WHERE id = $1 RETURNING id`,
      [id, status, hqUserId, note ?? null]
    );
    return rows[0] ? this.findById(rows[0].id) : null;
  },

  async isApproved(id: string, userId: string): Promise<boolean> {
    const { rows } = await pool.query<{ approved: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM mobile_connections mc JOIN property_users pu ON pu.id = mc.user_id
       WHERE mc.id = $1 AND mc.user_id = $2 AND mc.status = 'APPROVED' AND pu.status = 'ACTIVE') AS approved`,
      [id, userId]
    );
    return rows[0]?.approved === true;
  },

  async touch(id: string): Promise<void> {
    await pool.query(`UPDATE mobile_connections SET last_seen_at = now(), updated_at = now() WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < now() - interval '5 minutes')`, [id]);
  },
};
