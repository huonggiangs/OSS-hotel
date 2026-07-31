-- ============================================================================
-- HQ Console (webadmin) — Migration 004: Giám sát thiết bị (asset monitoring)
--
-- Mục tiêu: biến `hardware_assets` từ "danh mục tĩnh" thành trung tâm giám sát
-- vòng đời + kết nối thiết bị thật, liên kết logic (KHÔNG chung DB, KHÔNG FK
-- xuyên hệ thống — đúng ARCHITECTURE_OVERVIEW.md) với `iot-service.devices`
-- (trạng thái vận hành) và `property-web.devices` (ánh xạ thiết bị↔phòng) qua
-- một "mã thiết bị chung" `asset_code` (dạng AST-XXXXXX, sinh tự động ở đây —
-- webadmin là SỔ GỐC/master registry của mọi thiết bị).
--
-- Không sửa 001_init.sql/002_release_console.sql/003_purchase_orders.sql —
-- chỉ thêm mới.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Mở rộng enum HardwareAssetType (+DOOR_LOCK, POWER_SWITCH, ELECTRIC_METER,
--    EDGE_NODE) bằng `ALTER TYPE ... ADD VALUE`.
--
--    LƯU Ý PHIÊN BẢN (đã kiểm tra kỹ theo đúng yêu cầu): trước PostgreSQL 12,
--    ADD VALUE hoàn toàn KHÔNG chạy được bên trong 1 transaction block. Từ
--    PostgreSQL 12 trở đi, ADD VALUE ĐƯỢC PHÉP chạy trong transaction block,
--    với điều kiện giá trị enum mới KHÔNG được dùng (INSERT/CAST) trong CÙNG
--    transaction đó — migration này chỉ THÊM giá trị, không insert bản ghi
--    nào dùng ngay 4 giá trị mới, nên an toàn để chạy trong transaction mà cả
--    2 migration runner của dự án dùng (database/migrate.ts và
--    apps/api/src/lib/embeddedBootstrap.ts đều bọc BEGIN/COMMIT quanh toàn bộ
--    file). PGlite build trên PostgreSQL bản mới (>=15) nên đáp ứng điều kiện
--    này.
--
--    ĐÃ THỬ cách khác trước đó ("tạo enum mới → ALTER COLUMN TYPE cast 2 cột
--    → DROP TYPE cũ → RENAME") và phát hiện nó làm PGlite CRASH (WASM
--    RuntimeError: Aborted(), không phải lỗi SQL thông thường) khi test thật
--    — cách ADD VALUE đơn giản này ít rủi ro hơn nhiều (không viết lại catalog
--    phức tạp), dùng làm phương án chính thức.
-- ----------------------------------------------------------------------------
ALTER TYPE "HardwareAssetType" ADD VALUE 'DOOR_LOCK';
ALTER TYPE "HardwareAssetType" ADD VALUE 'POWER_SWITCH';
ALTER TYPE "HardwareAssetType" ADD VALUE 'ELECTRIC_METER';
ALTER TYPE "HardwareAssetType" ADD VALUE 'EDGE_NODE';

-- ----------------------------------------------------------------------------
-- 2. Enum mới cho giám sát kết nối / thuê bao / cảnh báo
-- ----------------------------------------------------------------------------
-- ONLINE/OFFLINE/UNKNOWN — ĐỒNG BỘ TỪ iot-service qua job/endpoint sync, KHÔNG
-- nhập tay (xem apps/api/src/lib/iotSync.ts).
CREATE TYPE "ConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');
CREATE TYPE "SubscriptionCycle" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "AssetAlertType" AS ENUM ('WARRANTY_EXPIRING', 'OFFLINE_TOO_LONG', 'HIGH_DISCONNECT_RATE');
CREATE TYPE "AssetAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- ----------------------------------------------------------------------------
-- 3. Chuỗi sinh asset_code — dùng SELECT nextval(...) trực tiếp trong repo
--    (không dùng cột DEFAULT/hàm PL/pgSQL) để đơn giản + tương thích PGlite,
--    vẫn đảm bảo ATOMIC (nextval là nguyên tử ở tầng PostgreSQL).
-- ----------------------------------------------------------------------------
CREATE SEQUENCE "hardware_assets_asset_code_seq" START 1;

-- ----------------------------------------------------------------------------
-- 4. Cột mới trên hardware_assets
-- ----------------------------------------------------------------------------
ALTER TABLE "hardware_assets"
  ADD COLUMN "asset_code" TEXT,
  -- Ngày bắt đầu kích hoạt (khác purchased_at — ngày mua có thể sớm hơn nhiều
  -- so với ngày thực sự đưa vào vận hành tại cơ sở khách hàng).
  ADD COLUMN "activated_at" TIMESTAMPTZ,
  ADD COLUMN "connection_status" "ConnectionStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "disconnect_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_seen_at" TIMESTAMPTZ,
  ADD COLUMN "last_connection_check_at" TIMESTAMPTZ,
  -- Đối tác đang hỗ trợ/bảo hành thiết bị này CHO KHÁCH HÀNG — có thể khác
  -- supplier_id (nơi công ty MUA thiết bị). Vd: mua từ nhà cung cấp A nhưng
  -- đối tác vùng B là người trực tiếp hỗ trợ khách hàng tại chỗ.
  ADD COLUMN "supporting_partner_id" TEXT REFERENCES "partners"("id"),
  -- Nhà cung cấp dịch vụ kết nối/quản lý thiết bị từ xa — text tự do, KHÔNG
  -- hardcode "Navtask" (tên người dùng nhắc tới nhưng không xác nhận được là
  -- dịch vụ cụ thể nào trong dự án) — chỉ gợi ý làm placeholder khi seed demo.
  ADD COLUMN "connectivity_provider" TEXT,
  ADD COLUMN "subscription_fee" DECIMAL(14,2),
  ADD COLUMN "subscription_cycle" "SubscriptionCycle",
  -- Server/edge-node thiết bị đang báo cáo về — điền tự động khi có dữ liệu
  -- đồng bộ từ iot-service (xem iotSync.ts), để trống nếu chưa biết.
  ADD COLUMN "connected_server" TEXT,
  -- property_id/property_name: KHÔNG có FK thật vì "properties" thuộc DB của
  -- property-web (khác hệ thống) — lưu TEXT tham chiếu lỏng + cache tên hiển
  -- thị nhanh, đồng bộ qua gọi API property-web (propertyWebClient.ts). Bắt
  -- buộc ở TẦNG VALIDATE khi tạo mới (xem hardware-assets.routes.ts) — không
  -- đặt NOT NULL ở DB để không phá dữ liệu demo cũ đã seed trước migration này.
  ADD COLUMN "property_id" TEXT,
  ADD COLUMN "property_name" TEXT,
  -- Thiết bị phụ trợ gắn vào thiết bị chính (vd: máy in nhiệt/máy quét hộ
  -- chiếu/QR gắn vào 1 Kiosk cụ thể) — tự tham chiếu, cho phép NULL.
  ADD COLUMN "parent_asset_id" TEXT REFERENCES "hardware_assets"("id");

-- Backfill asset_code cho dữ liệu đã seed trước migration này (mỗi dòng gọi
-- nextval() một lần → mỗi dòng nhận một mã khác nhau, đúng ngữ nghĩa tuần tự).
UPDATE "hardware_assets"
SET "asset_code" = 'AST-' || LPAD(nextval('hardware_assets_asset_code_seq')::text, 6, '0')
WHERE "asset_code" IS NULL;

ALTER TABLE "hardware_assets" ALTER COLUMN "asset_code" SET NOT NULL;
ALTER TABLE "hardware_assets" ADD CONSTRAINT "hardware_assets_asset_code_key" UNIQUE ("asset_code");

CREATE INDEX "hardware_assets_connection_status_idx" ON "hardware_assets"("connection_status");
CREATE INDEX "hardware_assets_property_id_idx" ON "hardware_assets"("property_id");
CREATE INDEX "hardware_assets_parent_asset_id_idx" ON "hardware_assets"("parent_asset_id");
CREATE INDEX "hardware_assets_supporting_partner_id_idx" ON "hardware_assets"("supporting_partner_id");

-- ----------------------------------------------------------------------------
-- 5. asset_alerts — cảnh báo tự động (sắp hết bảo hành / offline lâu / mất
--    kết nối nhiều lần). Sinh ra lúc gọi API đồng bộ (đơn giản nhất chạy được
--    thật — không cần thêm scheduler/worker riêng), xem iotSync.ts.
-- ----------------------------------------------------------------------------
CREATE TABLE "asset_alerts" (
  "id" TEXT PRIMARY KEY,
  "asset_id" TEXT NOT NULL REFERENCES "hardware_assets"("id"),
  "alert_type" "AssetAlertType" NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "AssetAlertSeverity" NOT NULL DEFAULT 'WARNING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resolved_at" TIMESTAMPTZ
);
CREATE INDEX "asset_alerts_asset_id_idx" ON "asset_alerts"("asset_id");
CREATE INDEX "asset_alerts_unresolved_idx" ON "asset_alerts"("asset_id", "alert_type") WHERE "resolved_at" IS NULL;
