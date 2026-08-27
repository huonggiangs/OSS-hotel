-- ============================================================================
-- Property Web — Migration 010: vận hành lưu trú trực tiếp từ Trạng thái phòng.
-- Lưu hồ sơ khai báo tạm trú theo từng lượt ở, phát sinh gia hạn/chuyển phòng
-- và phiếu bảo trì. Các bảng mới tách khỏi customers/bookings để không làm mất
-- lịch sử khi thông tin khách hoặc mức giá được điều chỉnh ở các lượt sau.
-- ============================================================================

ALTER TABLE "bookings"
  ADD COLUMN "stay_type" TEXT NOT NULL DEFAULT 'DAILY'
    CHECK ("stay_type" IN ('HOURLY', 'OVERNIGHT', 'DAILY')),
  ADD COLUMN "checkin_at" TIMESTAMPTZ,
  ADD COLUMN "checkout_at" TIMESTAMPTZ;

-- Booking cũ chỉ có ngày; quy đổi giờ chuẩn để giữ nguyên khả năng hiển thị và
-- kiểm tra trùng phòng. Booking mới luôn lưu chính xác thời điểm nhận/trả.
UPDATE "bookings"
SET "checkin_at" = "checkin_date"::timestamp,
    "checkout_at" = "checkout_date"::timestamp
WHERE "checkin_at" IS NULL OR "checkout_at" IS NULL;

CREATE INDEX "bookings_room_active_at_idx"
  ON "bookings" ("property_id", "room_id", "checkin_at", "checkout_at")
  WHERE "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN');

CREATE TABLE "booking_guest_details" (
  "booking_id" TEXT PRIMARY KEY REFERENCES "bookings"("id") ON DELETE CASCADE,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "date_of_birth" DATE,
  "gender" TEXT,
  "nationality" TEXT,
  "identity_type" TEXT,
  "identity_number" TEXT,
  "identity_issued_date" DATE,
  "identity_issued_place" TEXT,
  "permanent_address" TEXT,
  "occupation" TEXT,
  "stay_purpose" TEXT,
  "expected_checkout_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "booking_guest_details_property_id_idx"
  ON "booking_guest_details" ("property_id");

CREATE TABLE "booking_adjustments" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('EXTENSION', 'ROOM_TRANSFER', 'SERVICE', 'PAYMENT_NOTE')),
  "description" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "payment_timing" TEXT CHECK ("payment_timing" IN ('PREPAID', 'POSTPAID')),
  "created_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "booking_adjustments_booking_id_idx"
  ON "booking_adjustments" ("booking_id", "created_at" DESC);

CREATE TABLE "maintenance_requests" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL REFERENCES "rooms"("id"),
  "booking_id" TEXT REFERENCES "bookings"("id") ON DELETE SET NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL' CHECK ("priority" IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  "partner_name" TEXT,
  "partner_phone" TEXT,
  "guest_visible" BOOLEAN NOT NULL DEFAULT true,
  "reported_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "maintenance_requests_room_status_idx"
  ON "maintenance_requests" ("property_id", "room_id", "status", "created_at" DESC);
