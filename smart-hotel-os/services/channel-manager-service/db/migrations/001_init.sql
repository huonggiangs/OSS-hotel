-- ============================================================================
-- channel-manager-service — Migration 001: khởi tạo schema
--
-- SQL thuần, chạy qua db/migrate.ts (KHÔNG dùng Prisma/ORM code-gen — đồng
-- nhất convention của webadmin/database). Mọi bảng nghiệp vụ có tenant_id và
-- property_id theo RULES.md / SYSTEM_ARCHITECTURE.md mục 5.
--
-- Ghi chú kiến trúc: service này KHÔNG chia sẻ database với PMS Core. PMS Core
-- là nguồn sự thật (RULES.md mục 2) — tồn phòng ở đây (room_type_inventory_cache)
-- chỉ là BẢN SAO cục bộ được PMS đẩy sang qua POST /inventory/sync (mô phỏng sự
-- kiện inventory.changed ở MODULE_CHANNEL_MANAGER_BOOKING.md mục A.2). Service
-- dùng bản sao này để kiểm tra chống overbooking trước khi ghi nhận booking từ OTA.
-- ============================================================================

CREATE TYPE "OtaProvider" AS ENUM ('booking', 'agoda', 'airbnb');
CREATE TYPE "OtaConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');
CREATE TYPE "SyncLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "BookingIngestionStatus" AS ENUM ('RECEIVED', 'ACCEPTED', 'REJECTED_OVERBOOKING', 'ERROR');

-- ---- ota_connections ----
-- credentials: JSONB placeholder (api_key/secret/hotel_id...). Ở môi trường thật
-- PHẢI mã hoá tại tầng ứng dụng trước khi ghi (vd. KMS envelope encryption) —
-- hiện để dạng JSONB rõ vì MockOtaAdapter không cần credential thật, xem PROGRESS.md.
CREATE TABLE "ota_connections" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "ota_provider" "OtaProvider" NOT NULL,
  "credentials" JSONB NOT NULL DEFAULT '{}',
  "status" "OtaConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "last_connected_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "ota_provider")
);
CREATE INDEX "ota_connections_property_id_idx" ON "ota_connections"("property_id");

-- ---- room_type_inventory_cache ----
-- Bản sao cục bộ tồn phòng theo ngày, PMS Core đẩy sang qua /inventory/sync.
-- available_rooms giảm dần khi có booking ingest từ OTA, dùng để chặn overbooking.
CREATE TABLE "room_type_inventory_cache" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "available_rooms" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "room_type_id", "date")
);
CREATE INDEX "room_type_inventory_cache_property_date_idx" ON "room_type_inventory_cache"("property_id", "date");

-- ---- room_inventory_sync_log ----
CREATE TABLE "room_inventory_sync_log" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL REFERENCES "ota_connections"("id"),
  "room_type_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "available_rooms" INTEGER NOT NULL,
  "status" "SyncLogStatus" NOT NULL DEFAULT 'PENDING',
  "request_payload" JSONB,
  "response_payload" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "room_inventory_sync_log_connection_id_idx" ON "room_inventory_sync_log"("connection_id");

-- ---- price_sync_log ----
CREATE TABLE "price_sync_log" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL REFERENCES "ota_connections"("id"),
  "room_type_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "status" "SyncLogStatus" NOT NULL DEFAULT 'PENDING',
  "request_payload" JSONB,
  "response_payload" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "price_sync_log_connection_id_idx" ON "price_sync_log"("connection_id");

-- ---- booking_ingestion_log ----
-- idempotency_key UNIQUE bắt buộc theo RULES.md mục 10 (mọi command/event phải
-- có unique ID + idempotent). OTA có thể gọi lại webhook nhiều lần cho cùng một
-- booking (retry mạng) — request thứ 2 trở đi phải là no-op, không tạo booking trùng.
CREATE TABLE "booking_ingestion_log" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "connection_id" TEXT REFERENCES "ota_connections"("id"),
  "ota_provider" "OtaProvider" NOT NULL,
  "ota_booking_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "room_type_id" TEXT NOT NULL,
  "check_in" DATE NOT NULL,
  "check_out" DATE NOT NULL,
  "rooms_requested" INTEGER NOT NULL DEFAULT 1,
  "guest_name" TEXT,
  "raw_payload" JSONB NOT NULL,
  "status" "BookingIngestionStatus" NOT NULL DEFAULT 'RECEIVED',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "booking_ingestion_log_property_id_idx" ON "booking_ingestion_log"("property_id");

-- ---- overbooking_alerts ----
CREATE TABLE "overbooking_alerts" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "ota_provider" "OtaProvider" NOT NULL,
  "booking_ingestion_log_id" TEXT NOT NULL REFERENCES "booking_ingestion_log"("id"),
  "message" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "overbooking_alerts_property_id_idx" ON "overbooking_alerts"("property_id");
