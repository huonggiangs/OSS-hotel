-- ============================================================================
-- iot-service — Migration 001: khởi tạo schema
--
-- Mô phỏng luồng Remote Commands cho thiết bị IoT phòng (điện/điều hoà) qua
-- HTTP, đúng mô hình bắt buộc ở RULES.md mục 10: mọi lệnh có unique ID,
-- idempotent, được ack, có timeout. Khi có MQTT broker thật (vd. EMQX,
-- SYSTEM_ARCHITECTURE.md mục 8.3), chỉ cần thay tầng transport — schema và
-- state machine PENDING -> ACKED/TIMEOUT/FAILED giữ nguyên.
-- ============================================================================

CREATE TYPE "DeviceType" AS ENUM ('SWITCH', 'AIRCON');
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE_MODE');
CREATE TYPE "PowerState" AS ENUM ('ON', 'OFF');
CREATE TYPE "CommandType" AS ENUM ('POWER_ON', 'POWER_OFF', 'AC_SET_TEMPERATURE', 'AC_SET_MODE', 'DEVICE_STATUS_CHECK', 'DEVICE_RESTART');
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'ACKED', 'TIMEOUT', 'FAILED');

-- ---- devices ----
CREATE TABLE "devices" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL,
  "device_type" "DeviceType" NOT NULL,
  "name" TEXT NOT NULL,
  "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
  "power_state" "PowerState" NOT NULL DEFAULT 'OFF',
  "last_heartbeat_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "devices_property_room_idx" ON "devices"("property_id", "room_id");

-- ---- device_commands ----
-- id chính là command_id duy nhất (RULES.md mục 10). idempotency_key UNIQUE
-- cho phép caller (rule engine/kiosk/API) gọi lại an toàn khi không chắc lần
-- gọi trước có tới nơi hay không — trả về đúng bản ghi cũ thay vì tạo lệnh mới.
CREATE TABLE "device_commands" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL REFERENCES "devices"("id"),
  "command_type" "CommandType" NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
  "sent_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "acked_at" TIMESTAMPTZ,
  "ack_result" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "device_commands_device_id_idx" ON "device_commands"("device_id");
CREATE INDEX "device_commands_status_expires_idx" ON "device_commands"("status", "expires_at");

-- ---- device_heartbeats ----
-- Tổng hợp theo cửa sổ thời gian (mặc định 1 giờ/cửa sổ), KHÔNG lưu từng nhịp
-- tim thô vô hạn — đúng nguyên tắc SYSTEM_ARCHITECTURE.md mục 8.4 và
-- DATA_MODEL.md mục 4.2. Chính sách xoá dữ liệu cũ (retention job) CHƯA cài
-- đặt ở bản demo này — xem PROGRESS.md.
CREATE TABLE "device_heartbeats" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL REFERENCES "devices"("id"),
  "window_start" TIMESTAMPTZ NOT NULL,
  "window_end" TIMESTAMPTZ NOT NULL,
  "sample_count" INTEGER NOT NULL DEFAULT 0,
  "online_count" INTEGER NOT NULL DEFAULT 0,
  "offline_count" INTEGER NOT NULL DEFAULT 0,
  "last_power_state" "PowerState",
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("device_id", "window_start")
);
CREATE INDEX "device_heartbeats_device_window_idx" ON "device_heartbeats"("device_id", "window_start");
