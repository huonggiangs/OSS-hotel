-- ============================================================================
-- Property Web — Migration 005: ảnh của cơ sở và loại phòng
--
-- Ảnh là dữ liệu do người dùng tải lên, không giữ trong property_settings để
-- mỗi ảnh được thêm độc lập, không phải ghi lại toàn bộ thư viện khi upload.
-- data_url được dùng cho môi trường cục bộ/MVP; khi dùng object storage sau này
-- chỉ cần thay giá trị này bằng URL/CDN mà không đổi API giao diện.
-- ============================================================================

CREATE TABLE "property_images" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "room_type_id" TEXT REFERENCES "room_types"("id") ON DELETE CASCADE,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "data_url" TEXT NOT NULL,
  "created_by" TEXT REFERENCES "property_users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("mime_type" IN ('image/png', 'image/jpeg', 'image/webp'))
);

CREATE INDEX "property_images_property_id_idx" ON "property_images"("property_id", "created_at" DESC);
CREATE INDEX "property_images_room_type_id_idx" ON "property_images"("room_type_id");
