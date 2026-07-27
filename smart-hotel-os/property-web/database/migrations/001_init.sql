-- ============================================================================
-- property-web (Property Web PMS) — Migration 001: khởi tạo schema
--
-- SQL thuần, chạy qua database/migrate.ts (giống hệt convention của
-- webadmin/database — KHÔNG dùng ORM code-gen/Prisma). gen_random_uuid() dùng
-- hàm built-in của PostgreSQL >= 13, không cần cài thêm extension.
--
-- QUAN TRỌNG — multi-tenant (RULES.md + SYSTEM_ARCHITECTURE.md mục 3, DATA_MODEL.md
-- mục "Mọi bảng nghiệp vụ bắt buộc có tenant_id..."): mọi bảng nghiệp vụ ở đây có cả
-- tenant_id (chuỗi công ty/khách hàng sở hữu chuỗi cơ sở) VÀ property_id (cơ sở lưu
-- trú cụ thể) — 1 tenant có thể có nhiều property. property_users là bảng người dùng
-- CẤP CƠ SỞ (lễ tân/quản lý ca/quản lý...), TÁCH BIỆT HOÀN TOÀN với bảng `users` của
-- webadmin (nhân sự nội bộ công ty) — hai hệ thống không dùng chung DB, không JOIN
-- chéo được, đúng tinh thần ARCHITECTURE_OVERVIEW.md.
-- ============================================================================

-- ---- Enums ----
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE','SUSPENDED');
CREATE TYPE "PropertyUserRole" AS ENUM ('OWNER','MANAGER','RECEPTIONIST','HOUSEKEEPING');
CREATE TYPE "PropertyUserStatus" AS ENUM ('ACTIVE','DISABLED');
CREATE TYPE "RoomTypeStatus" AS ENUM ('ACTIVE','INACTIVE');
-- Trạng thái phòng rút gọn 4 giá trị, khớp đúng RoomStatusKey trong
-- apps/web/src/lib/mock-data.ts (occupied/vacant/dirty/maintenance) — mô hình đầy đủ
-- hơn (VACANT_CLEAN/CLEANING...) mô tả ở docs/DATA_MODEL.md mục 3 dành cho phase sau.
CREATE TYPE "RoomStatus" AS ENUM ('OCCUPIED','VACANT','DIRTY','MAINTENANCE');
CREATE TYPE "BookingChannel" AS ENUM ('DIRECT','BOOKING_COM','AGODA','AIRBNB','TRAVELOKA','OTHER');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED');
CREATE TYPE "InvoiceMethod" AS ENUM ('CASH','BANK_TRANSFER','CARD','OTA_WALLET','VNPAY','MOMO','ZALOPAY','STRIPE');
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID','PENDING','FAILED');
CREATE TYPE "DeviceType" AS ENUM ('POWER_SWITCH','AC_CONTROLLER','DOOR_LOCK','OTHER');
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE','OFFLINE','ERROR');

-- ---- properties (cơ sở lưu trú — multi-tenant: mỗi property thuộc 1 tenant) ----
CREATE TABLE "properties" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "properties_tenant_id_idx" ON "properties"("tenant_id");

-- ---- property_users (người dùng CẤP CƠ SỞ — lễ tân/quản lý ca/quản lý, KHÔNG
-- dùng chung bảng "users" của webadmin) ----
CREATE TABLE "property_users" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "role" "PropertyUserRole" NOT NULL,
  "status" "PropertyUserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "property_users_property_id_idx" ON "property_users"("property_id");

-- ---- room_types ----
CREATE TABLE "room_types" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
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

-- ---- rooms (có cột power_on tối thiểu để nối vào UI công tắc điện IoT đã có) ----
CREATE TABLE "rooms" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
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
CREATE INDEX "rooms_room_type_id_idx" ON "rooms"("room_type_id");

-- ---- customers ----
CREATE TABLE "customers" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "segment" TEXT NOT NULL DEFAULT 'Mới',
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "customers_property_id_idx" ON "customers"("property_id");

-- ---- bookings (hợp đồng / đặt phòng) ----
CREATE TABLE "bookings" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "customer_id" TEXT REFERENCES "customers"("id"),
  "room_id" TEXT REFERENCES "rooms"("id"),
  "channel" "BookingChannel" NOT NULL DEFAULT 'DIRECT',
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "checkin_date" DATE NOT NULL,
  "checkout_date" DATE NOT NULL,
  "total_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "deposit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" TEXT REFERENCES "property_users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "bookings_property_id_idx" ON "bookings"("property_id");
CREATE INDEX "bookings_room_id_idx" ON "bookings"("room_id");
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- ---- invoices (hoá đơn/thanh toán) ----
CREATE TABLE "invoices" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "booking_id" TEXT REFERENCES "bookings"("id"),
  "code" TEXT NOT NULL UNIQUE,
  "guest_name" TEXT NOT NULL,
  "method" "InvoiceMethod" NOT NULL DEFAULT 'CASH',
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "paid_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "invoices_property_id_idx" ON "invoices"("property_id");
CREATE INDEX "invoices_booking_id_idx" ON "invoices"("booking_id");

-- ---- expenses (chi phí) ----
CREATE TABLE "expenses" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "expense_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "created_by" TEXT REFERENCES "property_users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "expenses_property_id_idx" ON "expenses"("property_id");

-- ---- devices (đăng ký thiết bị IoT theo phòng — tối thiểu cho UI công tắc điện) ----
CREATE TABLE "devices" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
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

-- ---- audit_log (append-only, immutable — không có UPDATE/DELETE trong nghiệp vụ) ----
CREATE TABLE "audit_log" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT REFERENCES "properties"("id"),
  "tenant_id" TEXT,
  "user_id" TEXT REFERENCES "property_users"("id"),
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "before_data" JSONB,
  "after_data" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");
CREATE INDEX "audit_log_property_id_idx" ON "audit_log"("property_id");
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");
