-- ============================================================================
-- iot-service — Migration 002: mã thiết bị chung (asset_code) + đếm mất kết nối
--
-- `asset_code` liên kết LOGIC (KHÔNG FK xuyên hệ thống, KHÔNG chung DB) tới
-- `hardware_assets.asset_code` của webadmin — webadmin là nơi SINH mã
-- (AST-XXXXXX), ở đây chỉ LƯU LẠI khi 1 thiết bị vận hành thật được "ghép
-- nối" (pair) với 1 bản ghi tài sản trong webadmin. Cho phép NULL vì phần lớn
-- thiết bị mô phỏng trong demo/dev chưa cần ghép nối ngay.
--
-- `disconnect_count` đếm CỘNG DỒN số lần thiết bị chuyển từ ONLINE -> OFFLINE
-- (xem devices.repo.ts#sweepOfflineDevices, chạy định kỳ trong index.ts) —
-- webadmin đọc cột này qua GET /api/v1/devices để đồng bộ vào
-- hardware_assets.disconnect_count.
--
-- Không sửa 001_init.sql — chỉ thêm mới.
-- ============================================================================

ALTER TABLE "devices"
  ADD COLUMN "asset_code" TEXT,
  ADD COLUMN "disconnect_count" INTEGER NOT NULL DEFAULT 0;

-- UNIQUE cho phép nhiều NULL (thiết bị chưa ghép nối) nhưng không cho 2 thiết
-- bị vận hành cùng ghép vào 1 asset_code.
CREATE UNIQUE INDEX "devices_asset_code_key" ON "devices"("asset_code") WHERE "asset_code" IS NOT NULL;
