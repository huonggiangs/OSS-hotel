-- ============================================================================
-- Property Web — Migration 011: khai báo lưu trú, điều khiển thiết bị có kiểm
-- soát, thẻ phòng, dịch vụ, thanh toán hai bước, bảo trì nhiều lỗi và buồng phòng.
-- Không ghi đè migration đã áp dụng; mọi bảng mới đều tách lịch sử theo lượt ở.
-- ============================================================================

-- Các trường bổ sung giúp chuẩn bị hồ sơ thông báo lưu trú. Chỉ các trường được
-- cơ quan có thẩm quyền yêu cầu mới được gửi ra ngoài; phần còn lại phục vụ đối
-- chiếu nội bộ và phải có cơ sở pháp lý/đồng ý phù hợp trước khi khai thác.
ALTER TABLE "booking_guest_details"
  ADD COLUMN "identity_expiry_date" DATE,
  ADD COLUMN "place_of_birth" TEXT,
  ADD COLUMN "current_residence_address" TEXT,
  ADD COLUMN "arrival_from" TEXT,
  ADD COLUMN "vehicle_plate" TEXT;

CREATE TABLE "lodging_reports" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL DEFAULT 'BCA_PORTAL',
  "status" TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK ("status" IN ('DRAFT', 'READY', 'NOT_REQUIRED', 'QUEUED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'NEEDS_INFO', 'MANUAL_REQUIRED')),
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "external_reference" TEXT,
  "last_error" TEXT,
  "prepared_at" TIMESTAMPTZ,
  "submitted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "lodging_reports_property_status_idx" ON "lodging_reports" ("property_id", "status", "updated_at" DESC);

-- Thiết bị có thể đặt ở phòng, tầng, khu hoặc toàn cơ sở. Việc gán vị trí giúp
-- bộ cấp thẻ chung ở tầng/khu không bị hiểu nhầm là thiết bị của mọi phòng.
ALTER TABLE "devices"
  ADD COLUMN "location_scope" TEXT NOT NULL DEFAULT 'ROOM'
    CHECK ("location_scope" IN ('ROOM', 'FLOOR', 'ZONE', 'PROPERTY')),
  ADD COLUMN "location_label" TEXT;

CREATE INDEX "devices_property_location_idx" ON "devices" ("property_id", "location_scope", "location_label");

CREATE TABLE "device_control_events" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "room_id" TEXT REFERENCES "rooms"("id") ON DELETE SET NULL,
  "booking_id" TEXT REFERENCES "bookings"("id") ON DELETE SET NULL,
  "device_id" TEXT NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL CHECK ("action" IN ('POWER_ON', 'POWER_OFF', 'ISSUE_CARD', 'RECLAIM_CARD')),
  "delivery_status" TEXT NOT NULL CHECK ("delivery_status" IN ('QUEUED', 'NOT_CONFIGURED', 'ACKNOWLEDGED', 'FAILED')),
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "requested_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "acknowledged_at" TIMESTAMPTZ
);
CREATE INDEX "device_control_events_room_created_idx" ON "device_control_events" ("property_id", "room_id", "created_at" DESC);

CREATE TABLE "room_access_cards" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "room_id" TEXT NOT NULL REFERENCES "rooms"("id"),
  "device_id" TEXT REFERENCES "devices"("id") ON DELETE SET NULL,
  "card_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED' CHECK ("status" IN ('ISSUED', 'RETURNED', 'LOST', 'CANCELLED')),
  "issued_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "returned_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "returned_at" TIMESTAMPTZ,
  "note" TEXT
);
CREATE UNIQUE INDEX "room_access_cards_open_booking_key" ON "room_access_cards" ("booking_id") WHERE "status" = 'ISSUED';
CREATE INDEX "room_access_cards_room_status_idx" ON "room_access_cards" ("property_id", "room_id", "status");

CREATE TABLE "booking_service_charges" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL CHECK ("quantity" > 0),
  "unit_price" DECIMAL(14,2) NOT NULL CHECK ("unit_price" >= 0),
  "amount" DECIMAL(14,2) NOT NULL CHECK ("amount" >= 0),
  "note" TEXT,
  "created_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "booking_service_charges_booking_idx" ON "booking_service_charges" ("property_id", "booking_id", "created_at" DESC);

-- Một lần trả phòng tạo một công việc buồng phòng. Trạng thái DIRTY của phòng và
-- task cùng transaction để không có trường hợp phòng bẩn nhưng không ai nhận việc.
CREATE TABLE "housekeeping_tasks" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL REFERENCES "rooms"("id"),
  "booking_id" TEXT REFERENCES "bookings"("id") ON DELETE SET NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at" TIMESTAMPTZ,
  "completed_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL
);
CREATE INDEX "housekeeping_tasks_room_status_idx" ON "housekeeping_tasks" ("property_id", "room_id", "status", "created_at" DESC);
CREATE UNIQUE INDEX "housekeeping_tasks_open_room_key" ON "housekeeping_tasks" ("room_id") WHERE "status" IN ('PENDING', 'IN_PROGRESS');

-- Một phiếu bảo trì là phần đầu việc; mỗi lỗi là một dòng riêng và có thể gắn
-- ảnh/video vào từng lỗi. File thực tế được lưu ngoài DB theo media_key.
CREATE TABLE "maintenance_issues" (
  "id" TEXT PRIMARY KEY,
  "request_id" TEXT NOT NULL REFERENCES "maintenance_requests"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL' CHECK ("priority" IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "maintenance_issues_request_idx" ON "maintenance_issues" ("request_id", "created_at");

CREATE TABLE "maintenance_media" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "issue_id" TEXT NOT NULL REFERENCES "maintenance_issues"("id") ON DELETE CASCADE,
  "media_key" TEXT NOT NULL UNIQUE,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_size" INTEGER NOT NULL CHECK ("byte_size" > 0),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "maintenance_media_issue_idx" ON "maintenance_media" ("issue_id", "created_at");
