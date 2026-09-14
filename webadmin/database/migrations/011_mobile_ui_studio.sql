-- HQ Console — Mobile UI Studio.
-- Chỉ lưu cấu hình trình bày đã được whitelist. Không lưu HTML/JavaScript để
-- không thể thay đổi nghiệp vụ sau khi ứng dụng Android/iOS đã được duyệt.

CREATE TABLE "mobile_ui_configurations" (
  "id" TEXT PRIMARY KEY,
  "app_key" "AppKey" NOT NULL,
  "name" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'READY_FOR_RELEASE', 'RELEASED', 'ARCHIVED')),
  "created_by" TEXT REFERENCES "users"("id"),
  "updated_by" TEXT REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "mobile_ui_configurations_app_key_idx" ON "mobile_ui_configurations"("app_key", "updated_at" DESC);

ALTER TABLE "app_releases"
  ADD COLUMN "ui_config_id" TEXT REFERENCES "mobile_ui_configurations"("id");
CREATE INDEX "app_releases_ui_config_id_idx" ON "app_releases"("ui_config_id") WHERE "ui_config_id" IS NOT NULL;

-- Bản nháp nền tảng phản ánh giao diện Owner Mobile 0.5.2 hiện có.
INSERT INTO "mobile_ui_configurations" ("id", "app_key", "name", "config", "status")
SELECT
  gen_random_uuid()::text,
  'OWNER_MOBILE'::"AppKey",
  'Giao diện chuẩn ANIO Owner 0.5.2',
  $$
  {
    "schemaVersion": 1,
    "branding": {
      "appName": "ANIO Vận hành",
      "primaryColor": "#2663DA",
      "canvasColor": "#F4F8FF"
    },
    "dashboard": {
      "showSearch": true,
      "defaultFinancialDays": 7,
      "kpis": ["occupancy", "revenue", "occupied", "tasks"],
      "quickActions": ["checkin", "booking", "rooms", "maintenance"]
    },
    "navigation": [
      {"key": "DASHBOARD", "label": "Trang chủ"},
      {"key": "ROOMS", "label": "Phòng"},
      {"key": "BOOKINGS", "label": "Đặt phòng"},
      {"key": "ALERTS", "label": "Cảnh báo"},
      {"key": "ACCOUNT", "label": "Tài khoản"}
    ]
  }
  $$::jsonb,
  'DRAFT'
WHERE NOT EXISTS (
  SELECT 1 FROM "mobile_ui_configurations" WHERE "app_key" = 'OWNER_MOBILE'::"AppKey"
);
