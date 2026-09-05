-- Property Web — Migration 015: xác nhận khách đến, chính sách tiền cọc,
-- thiết bị đọc QR căn cước và đối soát đặt phòng OTA.
-- Migration mới, không chỉnh sửa các migration đã áp dụng.

ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';
ALTER TYPE "DeviceType" ADD VALUE IF NOT EXISTS 'ID_SCANNER';

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "arrival_confirmation_status" TEXT NOT NULL DEFAULT 'PENDING'
    CHECK ("arrival_confirmation_status" IN ('PENDING', 'WILL_ARRIVE', 'NO_SHOW')),
  ADD COLUMN IF NOT EXISTS "arrival_confirmed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "no_show_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "deposit_resolution" TEXT
    CHECK ("deposit_resolution" IN ('REFUND', 'RETAIN', 'PENDING'));

CREATE INDEX IF NOT EXISTS "bookings_arrival_confirmation_idx"
  ON "bookings" ("property_id", "arrival_confirmation_status", "checkin_date");

CREATE TABLE IF NOT EXISTS "booking_deposit_events" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "tenant_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL CHECK ("action" IN ('POLICY_APPLIED', 'REFUND_REQUESTED', 'RETAINED', 'PENDING_REVIEW')),
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK ("amount" >= 0),
  "reason" TEXT,
  "created_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "booking_deposit_events_booking_idx"
  ON "booking_deposit_events" ("property_id", "booking_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "ota_reconciliations" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "tenant_id" TEXT NOT NULL,
  "booking_id" TEXT REFERENCES "bookings"("id") ON DELETE SET NULL,
  "channel" "BookingChannel" NOT NULL,
  "external_reference" TEXT NOT NULL,
  "gross_amount" DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK ("gross_amount" >= 0),
  "commission_amount" DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK ("commission_amount" >= 0),
  "net_amount" DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK ("net_amount" >= 0),
  "received_amount" DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK ("received_amount" >= 0),
  "settlement_date" DATE,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'MATCHED', 'DISPUTED')),
  "note" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "channel", "external_reference")
);
CREATE INDEX IF NOT EXISTS "ota_reconciliations_property_status_idx"
  ON "ota_reconciliations" ("property_id", "status", "settlement_date" DESC, "created_at" DESC);

