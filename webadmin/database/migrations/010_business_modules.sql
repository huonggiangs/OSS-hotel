-- Module nghiệp vụ do HQ quản lý theo từng khách hàng/cơ sở.
-- Chỉ seed các module đã có ranh giới API độc lập và có thể tắt hoàn toàn
-- mà không chặn đăng nhập, phòng, đặt phòng hay sổ giao dịch cốt lõi.
CREATE TABLE "business_module_catalog" (
  "module_key" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "pms_route_scope" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL,
  "can_disable_completely" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "customer_business_modules" (
  "customer_id" TEXT NOT NULL REFERENCES "customers_unified"("id"),
  "module_key" TEXT NOT NULL REFERENCES "business_module_catalog"("module_key"),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "disabled_reason" TEXT,
  "updated_by" TEXT REFERENCES "users"("id"),
  "sync_status" TEXT NOT NULL DEFAULT 'PENDING',
  "last_sync_at" TIMESTAMPTZ,
  "last_sync_error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("customer_id", "module_key"),
  CONSTRAINT "customer_business_modules_sync_status_check"
    CHECK ("sync_status" IN ('PENDING','SYNCED','FAILED'))
);
CREATE INDEX "customer_business_modules_customer_idx"
  ON "customer_business_modules"("customer_id", "module_key")
  INCLUDE ("enabled", "sync_status");

INSERT INTO "business_module_catalog"
  ("module_key", "name", "description", "pms_route_scope", "display_order")
VALUES
  ('IOT_CONTROL', 'Điều khiển thiết bị', 'Lệnh điện, khóa và thiết bị phòng. Khi tắt, không phát lệnh mới; thiết bị giữ trạng thái an toàn hiện tại.', '/api/v1/devices', 10),
  ('MAINTENANCE_ASSETS', 'Bảo trì và tài sản', 'Báo hỏng, yêu cầu sửa chữa và theo dõi tài sản vận hành.', '/api/v1/maintenance', 20),
  ('CRM_MARKETING', 'Tiếp thị và chăm sóc khách', 'Chiến dịch, lịch chăm sóc và kịch bản liên hệ khách hàng.', '/api/v1/marketing', 30),
  ('CHANNEL_MANAGER', 'Kết nối kênh bán', 'Đối soát và đồng bộ dữ liệu với các kênh bán trực tuyến.', '/api/v1/ota-reconciliation', 40),
  ('REPORTING_VALUE', 'Báo cáo giá trị', 'Giá trị tạo ra, tiết kiệm điện và các chỉ số quản trị mở rộng.', '/api/v1/value', 50);

-- Bật mặc định cho toàn bộ khách hàng hiện hữu; HQ có thể tắt theo từng cơ sở.
INSERT INTO "customer_business_modules" ("customer_id", "module_key", "enabled")
SELECT c.id, m.module_key, true
FROM "customers_unified" c
CROSS JOIN "business_module_catalog" m
WHERE c.deleted_at IS NULL
ON CONFLICT ("customer_id", "module_key") DO NOTHING;
