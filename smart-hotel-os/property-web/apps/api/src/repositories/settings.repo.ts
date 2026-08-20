import { pool } from "../lib/db";
import { secureEmailSettings } from "../lib/settingsSecrets";

// Repo chung cho bảng property_settings (key-value theo nhóm) — dùng cho toàn
// bộ các màn hình Cài đặt dạng form cấu hình (xem lý do kiến trúc ở đầu file
// database/migrations/003_property_settings.sql). Mỗi nhóm ("group_key") lưu
// nguyên 1 blob JSON, đọc ra rồi ghi đè lại toàn bộ khi bấm "Lưu" — không cần
// diff từng trường.
export const settingsRepo = {
  async get(propertyId: string, groupKey: string): Promise<unknown | null> {
    const { rows } = await pool.query<{ data: unknown }>(
      `SELECT data FROM property_settings WHERE property_id = $1 AND group_key = $2`,
      [propertyId, groupKey]
    );
    return rows[0]?.data ?? null;
  },

  async upsert(propertyId: string, tenantId: string, groupKey: string, data: unknown): Promise<unknown> {
    const { rows } = await pool.query<{ data: unknown }>(
      `INSERT INTO property_settings (id, property_id, tenant_id, group_key, data)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb)
       ON CONFLICT (property_id, group_key)
       DO UPDATE SET data = $4::jsonb, updated_at = now()
       RETURNING data`,
      [propertyId, tenantId, groupKey, JSON.stringify(data)]
    );
    return rows[0].data;
  },

  async secureLegacyEmailSecrets(): Promise<void> {
    const { rows } = await pool.query<{ property_id: string; tenant_id: string; data: unknown }>(
      `SELECT property_id, tenant_id, data FROM property_settings WHERE group_key = 'email'`
    );
    for (const row of rows) {
      const secured = secureEmailSettings(row.data);
      if (JSON.stringify(secured) !== JSON.stringify(row.data)) {
        await this.upsert(row.property_id, row.tenant_id, "email", secured);
      }
    }
    await pool.query(
      `UPDATE audit_log
       SET before_data = CASE
             WHEN before_data #>> '{fields,password}' IS NOT NULL THEN jsonb_set(before_data, '{fields,password}', '"[REDACTED]"'::jsonb, true)
             ELSE before_data END,
           after_data = CASE
             WHEN after_data #>> '{fields,password}' IS NOT NULL THEN jsonb_set(after_data, '{fields,password}', '"[REDACTED]"'::jsonb, true)
             ELSE after_data END
       WHERE entity_type = 'property_settings'`
    );
  },
};
