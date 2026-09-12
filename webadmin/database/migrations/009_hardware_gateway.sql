-- Cấu hình kết nối vận hành của tài sản với IoT gateway.
ALTER TABLE "hardware_assets"
  ADD COLUMN "connection_protocol" TEXT NOT NULL DEFAULT 'HTTP',
  ADD COLUMN "gateway_configured_at" TIMESTAMPTZ;

ALTER TABLE "hardware_assets" ADD CONSTRAINT "hardware_assets_connection_protocol_check"
  CHECK ("connection_protocol" IN ('HTTP', 'MQTT', 'TCP', 'FIREBASE'));
