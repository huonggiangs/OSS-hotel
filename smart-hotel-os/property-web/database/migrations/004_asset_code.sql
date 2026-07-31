-- ============================================================================
-- property-web — Migration 004: mã thiết bị chung (asset_code)
--
-- NGOẠI LỆ so với quy tắc thường "không đụng property-web": chỉ thêm ĐÚNG 1
-- cột liên kết logic, không sửa logic nghiệp vụ nào khác. `asset_code` liên
-- kết (KHÔNG FK xuyên hệ thống, KHÔNG chung DB) tới
-- `webadmin.hardware_assets.asset_code` — webadmin là nơi SINH mã, ở đây chỉ
-- LƯU LẠI khi thiết bị được gán vào phòng đã được "ghép nối" với 1 tài sản đã
-- khai báo trong webadmin.
--
-- Không sửa 001_init.sql/002_add_username.sql/003_property_settings.sql —
-- chỉ thêm mới.
-- ============================================================================

ALTER TABLE "devices" ADD COLUMN "asset_code" TEXT;

CREATE UNIQUE INDEX "devices_asset_code_key" ON "devices"("asset_code") WHERE "asset_code" IS NOT NULL;
