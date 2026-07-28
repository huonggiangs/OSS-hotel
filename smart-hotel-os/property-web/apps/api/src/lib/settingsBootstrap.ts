// Seed mặc định cho property_settings — chạy lúc API khởi động (idempotent,
// an toàn gọi lại mỗi lần start). KHÔNG đặt trong migration 003 vì tại thời
// điểm chạy migration, hàng "properties" cho property demo (chế độ embedded)
// chưa tồn tại (embeddedBootstrap.ts chạy migration TRƯỚC khi seed property
// demo) — INSERT sẽ vi phạm khoá ngoại property_id. Đặt ở đây thay vào đó:
// chạy SAU khi chắc chắn mọi property đã tồn tại, dùng chung cho cả chế độ
// embedded lẫn Postgres thật (docker compose), không cần sửa
// embeddedBootstrap.ts/database/seed.ts (nằm ngoài phạm vi được phép sửa).
import { pool } from "./db";
import { settingsRepo } from "../repositories/settings.repo";
import { DEFAULT_SETTINGS } from "./defaultSettings";

export async function ensureDefaultSettings(): Promise<void> {
  const { rows: properties } = await pool.query<{ id: string; tenant_id: string }>(
    `SELECT id, tenant_id FROM properties`
  );
  for (const property of properties) {
    for (const [group, defaultData] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await settingsRepo.get(property.id, group);
      if (existing === null) {
        await settingsRepo.upsert(property.id, property.tenant_id, group, defaultData);
      }
    }
  }
}
