-- ============================================================================
-- Property Web — Migration 008: bảng giá linh hoạt theo loại phòng.
--
-- Một loại phòng có thể có đồng thời giá giờ/đêm/ngày/tuần/tháng, giá cuối tuần
-- hoặc giá ngày lễ. Các quy tắc thuộc đúng property/tenant của loại phòng và
-- được thay thế nguyên bộ trong một transaction khi người dùng lưu cấu hình.
-- ============================================================================

CREATE TABLE "room_type_rates" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "room_type_id" TEXT NOT NULL REFERENCES "room_types"("id") ON DELETE CASCADE,
  "rate_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL CHECK ("amount" >= 0),
  "minimum_units" INTEGER NOT NULL DEFAULT 1 CHECK ("minimum_units" >= 1),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("room_type_id", "rate_key")
);

CREATE INDEX "room_type_rates_property_id_idx" ON "room_type_rates"("property_id");
CREATE INDEX "room_type_rates_room_type_id_idx" ON "room_type_rates"("room_type_id");
