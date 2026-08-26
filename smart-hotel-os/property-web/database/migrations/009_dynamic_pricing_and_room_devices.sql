-- ============================================================================
-- Property Web — Migration 009: quy tắc giá động theo loại phòng và phân loại
-- thiết bị điều khiển trong phòng.
--
-- Giá động chỉ được áp dụng khi enabled = true, cho phòng VACANT và được tính
-- tại thời điểm truy vấn giá. Không thay đổi giá đã chốt trên booking cũ.
-- ============================================================================

CREATE TABLE "room_type_dynamic_pricing" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL REFERENCES "room_types"("id") ON DELETE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "vacancy_days" INTEGER NOT NULL DEFAULT 7 CHECK ("vacancy_days" >= 1),
  "vacancy_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 20 CHECK ("vacancy_discount_percent" >= 0 AND "vacancy_discount_percent" <= 100),
  "low_occupancy_percent" INTEGER NOT NULL DEFAULT 30 CHECK ("low_occupancy_percent" >= 0 AND "low_occupancy_percent" <= 100),
  "low_occupancy_adjustment_percent" DECIMAL(5,2) NOT NULL DEFAULT -20 CHECK ("low_occupancy_adjustment_percent" >= -100 AND "low_occupancy_adjustment_percent" <= 0),
  "high_occupancy_percent" INTEGER NOT NULL DEFAULT 80 CHECK ("high_occupancy_percent" >= 0 AND "high_occupancy_percent" <= 100),
  "high_occupancy_adjustment_percent" DECIMAL(5,2) NOT NULL DEFAULT 30 CHECK ("high_occupancy_adjustment_percent" >= 0 AND "high_occupancy_adjustment_percent" <= 200),
  "minimum_price" DECIMAL(14,2) CHECK ("minimum_price" IS NULL OR "minimum_price" >= 0),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("room_type_id"),
  CHECK ("low_occupancy_percent" < "high_occupancy_percent")
);

CREATE INDEX "room_type_dynamic_pricing_property_id_idx" ON "room_type_dynamic_pricing"("property_id");

-- device_type là enum tổng quát đã dùng ở các bản trước. control_kind giữ loại
-- điều khiển chi tiết để thêm thiết bị mới mà không phải thay đổi enum cũ.
ALTER TABLE "devices" ADD COLUMN "control_kind" TEXT NOT NULL DEFAULT 'POWER_SWITCH';
CREATE INDEX "devices_room_id_control_kind_idx" ON "devices"("room_id", "control_kind");
