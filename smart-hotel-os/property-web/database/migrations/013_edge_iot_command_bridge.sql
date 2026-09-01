-- ============================================================================
-- Property Web — Migration 013: cầu lệnh PMS -> Edge -> IoT và heartbeat Edge.
--
-- `power_on` cũ chỉ là trạng thái nghiệp vụ PMS. Các cột dưới đây lưu dấu vết
-- giao nhận thật; delivery_status chỉ ACKNOWLEDGED sau khi IoT nhận ACK từ
-- thiết bị, tuyệt đối không coi việc tạo lệnh là thành công phần cứng.
-- ============================================================================

ALTER TABLE "devices"
  ADD COLUMN "iot_device_id" TEXT;

CREATE UNIQUE INDEX "devices_iot_device_id_key"
  ON "devices" ("iot_device_id")
  WHERE "iot_device_id" IS NOT NULL;

ALTER TABLE "device_control_events"
  ADD COLUMN "iot_device_id" TEXT,
  ADD COLUMN "iot_command_id" TEXT,
  ADD COLUMN "dispatched_at" TIMESTAMPTZ,
  ADD COLUMN "last_attempt_at" TIMESTAMPTZ,
  ADD COLUMN "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_error" TEXT;

CREATE INDEX "device_control_events_dispatch_idx"
  ON "device_control_events" ("delivery_status", "last_attempt_at", "created_at")
  WHERE "delivery_status" = 'QUEUED';

CREATE TABLE "edge_node_heartbeats" (
  "edge_node_id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "cloud_reachable" BOOLEAN NOT NULL,
  "pending_outbox_count" INTEGER NOT NULL DEFAULT 0 CHECK ("pending_outbox_count" >= 0),
  "last_sync_at" TIMESTAMPTZ,
  "last_sync_error" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "edge_node_heartbeats_property_seen_idx"
  ON "edge_node_heartbeats" ("property_id", "last_seen_at" DESC);
