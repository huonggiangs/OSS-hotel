-- HQ Console — Migration 005: onboarding cơ sở và vòng đời thiết bị
-- Need refs: N3,N4,N5 — nhucau.md
-- Không sửa migration đã áp dụng; mọi thay đổi schema mới đặt trong file này.

CREATE TYPE "CustomerOnboardingStatus" AS ENUM (
  'NOT_STARTED',
  'PROVISIONING',
  'READY',
  'EMAIL_SENT',
  'EMAIL_NOT_CONFIGURED',
  'EMAIL_FAILED'
);

ALTER TABLE "customers_unified"
  ADD COLUMN "pms_property_id" TEXT,
  ADD COLUMN "onboarding_status" "CustomerOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "onboarding_email_sent_at" TIMESTAMPTZ,
  ADD COLUMN "onboarding_last_error" TEXT;

CREATE INDEX "customers_unified_pms_property_id_idx" ON "customers_unified"("pms_property_id");
CREATE INDEX "customers_unified_onboarding_status_idx" ON "customers_unified"("onboarding_status");

ALTER TYPE "HardwareAssetStatus" ADD VALUE 'INACTIVE';
ALTER TYPE "AssetAlertType" ADD VALUE 'MANUAL_FAULT';

ALTER TABLE "hardware_assets"
  ADD COLUMN "installation_location" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "deactivated_at" TIMESTAMPTZ,
  ADD COLUMN "deactivation_reason" TEXT;
