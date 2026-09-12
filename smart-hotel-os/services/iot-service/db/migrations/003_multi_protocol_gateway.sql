-- Kết nối thiết bị bên thứ ba qua HTTP, MQTT, TCP hoặc Firebase bridge.
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'DOOR_LOCK';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'ELECTRIC_METER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'RELAY';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'CAMERA';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'SENSOR';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'SMART_TV';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'SPEAKER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'QR_SCANNER';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'LOCK';
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'UNLOCK';
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'SET_VALUE';
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'PLAY_MESSAGE';
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'CUSTOM';

ALTER TABLE "devices"
  ADD COLUMN "connection_protocol" TEXT NOT NULL DEFAULT 'HTTP',
  ADD COLUMN "credential_hash" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "protocol_config" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "last_payload" JSONB,
  ADD COLUMN "last_transport" TEXT;

ALTER TABLE "devices" ADD CONSTRAINT "devices_connection_protocol_check"
  CHECK ("connection_protocol" IN ('HTTP', 'MQTT', 'TCP', 'FIREBASE'));

CREATE TABLE "device_events" (
  "id" TEXT PRIMARY KEY,
  "device_id" TEXT NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "event_type" TEXT NOT NULL,
  "transport" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "device_events_device_time_idx" ON "device_events"("device_id", "received_at" DESC);
