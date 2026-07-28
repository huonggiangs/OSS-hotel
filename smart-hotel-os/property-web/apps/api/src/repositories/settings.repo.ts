import { pool } from "../lib/db";

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
};
