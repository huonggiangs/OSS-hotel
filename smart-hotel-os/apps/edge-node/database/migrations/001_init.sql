-- ============================================================================
-- edge-node — Migration 001: khởi tạo schema cục bộ (PGlite/Postgres)
--
-- PHẠM VI CÓ CHỦ ĐÍCH (xem README.md mục "Ranh giới phạm vi"): Edge Node chỉ
-- lưu bản sao TỐI THIỂU đủ để lễ tân vận hành liên tục khi mất Internet —
-- room_types/rooms/bookings/property_users(subset)/devices/device_commands +
-- outbox_events. KHÔNG có customers/invoices/expenses/settings/audit_log đầy
-- đủ như property-web — Cloud property-web vẫn là nguồn sự thật đầy đủ.
--
-- bookings ở đây KHÔNG có bảng customers riêng (ngoài phạm vi) — lưu thẳng
-- guest_name/guest_phone dạng text trên chính bản ghi booking.
--
-- _migrations được tạo bởi src/lib/embeddedBootstrap.ts TRƯỚC khi áp dụng file
-- này (đúng pattern property-web/apps/api/src/lib/embeddedBootstrap.ts) — file
-- migration không tự tạo bảng đó.
-- ============================================================================

-- ---- Enums ----
CREATE TYPE "RoomTypeStatus" AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE "RoomStatus" AS ENUM ('OCCUPIED','VACANT','DIRTY','MAINTENANCE');
CREATE TYPE "PropertyUserRole" AS ENUM ('OWNER','MANAGER','RECEPTIONIST','HOUSEKEEPING');
CREATE TYPE "PropertyUserStatus" AS ENUM ('ACTIVE','DISABLED');
CREATE TYPE "BookingChannel" AS ENUM ('DIRECT','BOOKING_COM','AGODA','AIRBNB','TRAVELOKA','OTHER');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED');
CREATE TYPE "DeviceType" AS ENUM ('POWER_SWITCH','AC_CONTROLLER','DOOR_LOCK','OTHER');
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE','OFFLINE','ERROR');
CREATE TYPE "CommandType" AS ENUM ('POWER_ON','POWER_OFF','AC_SET_TEMPERATURE','AC_SET_MODE','DEVICE_STATUS_CHECK','DEVICE_RESTART');
CREATE TYPE "CommandStatus" AS ENUM ('PENDING','ACKED','TIMEOUT','FAILED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING','SYNCED','FAILED');

-- ---- room_types (bản sao cục bộ, đồng bộ last-write-wins từ Cloud) ----
CREATE TABLE "room_types" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "base_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "capacity" INTEGER NOT NULL DEFAULT 2,
  "beds_big" INTEGER NOT NULL DEFAULT 1,
  "beds_small" INTEGER NOT NULL DEFAULT 0,
  "area_m2" DECIMAL(6,2),
  "status" "RoomTypeStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "room_types_property_id_idx" ON "room_types"("property_id");

-- ---- rooms ----
CREATE TABLE "rooms" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL REFERENCES "room_types"("id"),
  "number" TEXT NOT NULL,
  "floor" TEXT NOT NULL,
  "zone" TEXT NOT NULL,
  "status" "RoomStatus" NOT NULL DEFAULT 'VACANT',
  "power_on" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "number")
);
CREATE INDEX "rooms_property_id_idx" ON "rooms"("property_id");

-- ---- property_users (subset — chỉ đủ cho đăng nhập cục bộ tại Edge Node khi
-- offline; đồng bộ MỘT CHIỀU từ Cloud xuống trong job pull-sync, KHÔNG bao
-- giờ tạo/sửa user cục bộ rồi đẩy ngược lên Cloud) ----
CREATE TABLE "property_users" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "role" "PropertyUserRole" NOT NULL,
  "status" "PropertyUserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- bookings (rút gọn — KHÔNG có bảng customers riêng, xem đầu file) ----
CREATE TABLE "bookings" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "guest_name" TEXT,
  "guest_phone" TEXT,
  "room_id" TEXT REFERENCES "rooms"("id"),
  "channel" "BookingChannel" NOT NULL DEFAULT 'DIRECT',
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "checkin_date" DATE NOT NULL,
  "checkout_date" DATE NOT NULL,
  "total_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "deposit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "bookings_property_id_idx" ON "bookings"("property_id");
CREATE INDEX "bookings_room_id_idx" ON "bookings"("room_id");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- ---- devices (thiết bị IoT cục bộ — khoá/công tắc/điều hoà/đồng hồ đo) ----
CREATE TABLE "devices" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "room_id" TEXT REFERENCES "rooms"("id"),
  "device_type" "DeviceType" NOT NULL DEFAULT 'POWER_SWITCH',
  "name" TEXT NOT NULL,
  "external_id" TEXT,
  "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
  "power_on" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "devices_property_id_idx" ON "devices"("property_id");
CREATE INDEX "devices_room_id_idx" ON "devices"("room_id");

-- ---- device_commands (mô hình idempotent y hệt services/iot-service — xem
-- src/repositories/commands.repo.ts/src/routes/commands.routes.ts) ----
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

-- ---- outbox_events (cơ chế đồng bộ offline-first 2 chiều — xem
-- src/lib/sync.ts và src/utils/outbox.ts. Mọi ghi cục bộ (booking/checkin/
-- checkout/lệnh thiết bị) đều INSERT 1 dòng vào đây TRONG CÙNG transaction với
-- thao tác nghiệp vụ, để không bao giờ mất sự kiện kể cả khi Edge Node crash
-- ngay sau đó) ----
CREATE TABLE "outbox_events" (
  "id" TEXT PRIMARY KEY,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "synced_at" TIMESTAMPTZ,
  "last_error" TEXT
);
CREATE INDEX "outbox_events_status_idx" ON "outbox_events"("status");
CREATE INDEX "outbox_events_entity_idx" ON "outbox_events"("entity_type", "entity_id");
