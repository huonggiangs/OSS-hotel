-- ============================================================================
-- crm-service — Migration 001: khởi tạo schema
--
-- MODULE_CRM_MARKETING.md. `guest_stay_history` ở đây là BẢN SAO đơn giản hoá
-- của lịch sử lưu trú (thật ra nằm ở PMS Core theo DATA_MODEL.md) — service
-- này không sở hữu booking, chỉ nhận dữ liệu tổng hợp cần thiết để tính
-- segment. Ở production thật, dữ liệu này được đồng bộ qua event
-- `booking.checked_out` (SYSTEM_ARCHITECTURE.md mục 1.5), bản demo dùng seed.
-- ============================================================================

CREATE TYPE "CustomerSegmentType" AS ENUM ('NEW_GUEST', 'RETURNING_GUEST', 'VIP', 'INACTIVE_30D', 'INACTIVE_90D');
CREATE TYPE "CampaignTriggerType" AS ENUM ('MANUAL', 'CHECKOUT_THANKYOU', 'INACTIVE_30D', 'BIRTHDAY', 'VIP_UPGRADE');
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'ZALO');
CREATE TYPE "CampaignSendStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED_OPT_OUT', 'SKIPPED_FREQUENCY_CAP');

-- ---- customers ----
CREATE TABLE "customers" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "birthday" DATE,
  "total_stays" INTEGER NOT NULL DEFAULT 0,
  "total_spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "last_stay_check_out" DATE,
  -- Khách đánh dấu KHÔNG muốn nhận marketing -> campaign phải tôn trọng tuyệt
  -- đối, không gửi tiếp (MODULE_CRM_MARKETING.md mục 4).
  "opt_out" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "customers_property_id_idx" ON "customers"("property_id");

-- ---- guest_stay_history ----
CREATE TABLE "guest_stay_history" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL REFERENCES "customers"("id"),
  "check_in" DATE NOT NULL,
  "check_out" DATE NOT NULL,
  "amount_spent" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "guest_stay_history_customer_id_idx" ON "guest_stay_history"("customer_id");

-- ---- customer_segments ----
-- Mỗi khách có ĐÚNG 1 segment hiện hành (upsert theo customer_id), tính lại
-- bằng batch job POST /segments/recompute (MODULE_CRM_MARKETING.md mục 1:
-- "Segment tính lại định kỳ (batch job hàng ngày)").
CREATE TABLE "customer_segments" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL UNIQUE REFERENCES "customers"("id"),
  "segment" "CustomerSegmentType" NOT NULL,
  "reason" TEXT NOT NULL,
  "computed_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "customer_segments_property_segment_idx" ON "customer_segments"("property_id", "segment");

-- ---- campaigns ----
CREATE TABLE "campaigns" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trigger_type" "CampaignTriggerType" NOT NULL DEFAULT 'MANUAL',
  "target_segment" "CustomerSegmentType",
  "channel" "NotificationChannel" NOT NULL,
  "template_content" TEXT NOT NULL,
  -- Giới hạn tần suất gửi cho CÙNG một khách trong campaign này, tránh spam
  -- (MODULE_CRM_MARKETING.md mục 2 "giới hạn tần suất").
  "frequency_cap_days" INTEGER NOT NULL DEFAULT 30,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "campaigns_property_id_idx" ON "campaigns"("property_id");

-- ---- campaign_sends ----
CREATE TABLE "campaign_sends" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL REFERENCES "campaigns"("id"),
  "customer_id" TEXT NOT NULL REFERENCES "customers"("id"),
  "channel" "NotificationChannel" NOT NULL,
  "status" "CampaignSendStatus" NOT NULL,
  "provider_response" JSONB,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "campaign_sends_campaign_customer_idx" ON "campaign_sends"("campaign_id", "customer_id");
