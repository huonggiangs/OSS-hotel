-- ============================================================================
-- ai-pricing-service — Migration 001: khởi tạo schema
--
-- Phase 1 rule-based (MODULE_AI_PRICING.md mục 2). Giá đề xuất luôn là
-- "suggestion" — service này KHÔNG tự ghi đè giá bán ở PMS Core; việc "apply"
-- là hành động riêng do Property Web gọi PMS Core sau khi quản lý duyệt
-- (ngoài phạm vi service này, xem mục 4 của module spec).
-- ============================================================================

-- ---- pricing_rules ----
-- Toàn bộ hệ số cấu hình được qua bảng này, KHÔNG hard-code trong code
-- (đúng yêu cầu MODULE_AI_PRICING.md mục 2 "Rule ví dụ (cấu hình được...)").
CREATE TABLE "pricing_rules" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL,
  "base_price" DECIMAL(12,2) NOT NULL,
  "min_price" DECIMAL(12,2) NOT NULL,
  "max_price" DECIMAL(12,2) NOT NULL,
  -- Ngày cuối tuần tính giá cao hơn — mảng số thứ tự ngày trong tuần theo
  -- chuẩn JS Date.getUTCDay() (0=Chủ nhật...6=Thứ 7). Mặc định [5,6] = Thứ 6, Thứ 7.
  "weekend_days" JSONB NOT NULL DEFAULT '[5,6]',
  "weekend_multiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.3,
  -- Occupancy dự kiến vượt ngưỡng -> tăng giá.
  "occupancy_threshold_pct" INTEGER NOT NULL DEFAULT 80,
  "occupancy_multiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.2,
  -- Ngày lễ cấu hình sẵn theo rule (đơn giản hoá Phase 1 — chưa tách bảng sự
  -- kiện dùng chung nhiều rule, xem ASSUMPTIONS ở PROGRESS.md).
  "holiday_dates" JSONB NOT NULL DEFAULT '[]',
  "holiday_multiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.6,
  -- Giải phóng tồn phòng cận ngày: lead time (giờ) dưới ngưỡng VÀ occupancy
  -- dưới ngưỡng thấp -> giảm giá để bán nốt phòng trống.
  "clearance_lead_time_hours" INTEGER NOT NULL DEFAULT 24,
  "clearance_occupancy_threshold_pct" INTEGER NOT NULL DEFAULT 50,
  "clearance_multiplier" DECIMAL(6,3) NOT NULL DEFAULT 0.85,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "room_type_id")
);

-- ---- pricing_suggestions ----
-- Lịch sử đầy đủ mọi đề xuất đã sinh ra — dùng làm bằng chứng "tăng doanh thu
-- 10-25%" cho khách hàng (mục 6 tiêu chí chấp nhận) và dữ liệu huấn luyện cho
-- Phase 2.
CREATE TABLE "pricing_suggestions" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL,
  "rule_id" TEXT NOT NULL REFERENCES "pricing_rules"("id"),
  "date" DATE NOT NULL,
  "base_price" DECIMAL(12,2) NOT NULL,
  "suggested_price" DECIMAL(12,2) NOT NULL,
  "occupancy_pct_used" DECIMAL(5,2) NOT NULL,
  "lead_time_hours_used" INTEGER NOT NULL,
  "applied_multipliers" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "pricing_suggestions_property_date_idx" ON "pricing_suggestions"("property_id", "date");
