-- ============================================================================
-- property-web — Migration 003: bảng property_settings (key-value theo nhóm)
--
-- QUYẾT ĐỊNH KIẾN TRÚC (ghi lại đầy đủ hơn trong PROGRESS.md): thay vì tạo
-- ~16 bảng riêng cho từng màn hình Cài đặt (đa số chỉ là form cấu hình đơn
-- giản — basic/amenities/email/security/currency/tax/time/printer/social/
-- sync/db/channel/utilities/modules/assets/services/marketing/daily_entries/
-- payment/roles), dùng CHUNG 1 bảng "property_settings" dạng key-value theo
-- nhóm (property_id, group_key, data jsonb). Lý do: (1) các màn hình này đều
-- có hình dạng "đọc 1 blob cấu hình -> hiển thị -> sửa -> lưu lại nguyên
-- blob", không cần join quan hệ phức tạp; (2) gọn hơn nhiều so với 16+ bảng
-- cho MVP; (3) dễ mở rộng thêm nhóm mới sau này mà không cần migration mới.
-- Những gì THỰC SỰ cần bảng quan hệ riêng (branches dùng lại bảng
-- "properties" đã có, users dùng lại "property_users" đã có) thì vẫn dùng
-- bảng quan hệ thật, KHÔNG nhét vào property_settings.
--
-- LƯU Ý: bảng này CHỈ tạo schema, KHÔNG seed dữ liệu mẫu ở đây — vì tại thời
-- điểm chạy migration (embedded bootstrap chạy migration TRƯỚC khi seed dữ
-- liệu demo/property), hàng "properties" cho property demo CHƯA tồn tại nên
-- INSERT sẽ vi phạm khoá ngoại "property_id". Seed mặc định cho từng nhóm
-- được thực hiện lúc API khởi động (sau khi chắc chắn đã có property) qua
-- `apps/api/src/lib/settingsBootstrap.ts` — idempotent, chạy được cho cả chế
-- độ embedded lẫn Postgres thật, không cần sửa embeddedBootstrap.ts/seed.ts.
--
-- KHÔNG sửa 001_init.sql / 002_add_username.sql theo đúng quy tắc bắt buộc.
-- ============================================================================

CREATE TABLE "property_settings" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "group_key" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "group_key")
);
CREATE INDEX "property_settings_property_id_idx" ON "property_settings"("property_id");
