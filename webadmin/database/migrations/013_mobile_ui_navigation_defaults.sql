-- Mobile UI Studio v2: icon/layout identifiers are a strict allow-list.
-- They are presentation metadata bundled in signed apps, never executable code.

UPDATE "mobile_ui_configurations"
SET "config" = jsonb_build_object(
  'schemaVersion', 2,
  'branding', "config"->'branding',
  'dashboard', COALESCE("config"->'dashboard', '{}'::jsonb) || jsonb_build_object('quickActionLayout', 'GRID_4'),
  'navigation', (
    SELECT jsonb_agg(nav || jsonb_build_object(
      'description', CASE nav->>'key' WHEN 'DASHBOARD' THEN 'Xem tình hình vận hành trong ngày' WHEN 'ROOMS' THEN 'Xem và thao tác theo trạng thái phòng' WHEN 'BOOKINGS' THEN 'Xem đặt phòng và hợp đồng' WHEN 'ALERTS' THEN 'Xem cảnh báo cần xử lý' ELSE 'Xem tài khoản và thiết lập an toàn' END,
      'iconId', CASE nav->>'key' WHEN 'DASHBOARD' THEN 'home' WHEN 'ROOMS' THEN 'bed' WHEN 'BOOKINGS' THEN 'calendar' WHEN 'ALERTS' THEN 'bell' ELSE 'user' END,
      'activeIconId', CASE nav->>'key' WHEN 'DASHBOARD' THEN 'home-filled' WHEN 'ROOMS' THEN 'bed-filled' WHEN 'BOOKINGS' THEN 'calendar-filled' WHEN 'ALERTS' THEN 'bell-filled' ELSE 'user-filled' END
    )) FROM jsonb_array_elements("config"->'navigation') AS nav
  )
)
WHERE COALESCE(("config"->>'schemaVersion')::int, 1) < 2;

INSERT INTO "mobile_ui_configurations" ("id", "app_key", "name", "config", "status")
SELECT gen_random_uuid()::text, 'HOUSEKEEPING_MOBILE'::"AppKey", 'Giao diện chuẩn ANIO Buồng phòng 1.0', $$
{"schemaVersion":2,"branding":{"appName":"ANIO Buồng phòng","primaryColor":"#147C74","canvasColor":"#F4F8FF"},"dashboard":{"showSearch":false,"defaultFinancialDays":7,"kpis":["occupied","tasks"],"quickActions":["rooms","maintenance"],"quickActionLayout":"GRID_2X2"},"navigation":[{"key":"DASHBOARD","label":"Tổng quan","description":"Việc cần làm hôm nay","iconId":"home","activeIconId":"home-filled"},{"key":"ROOMS","label":"Phòng bẩn","description":"Nhận và hoàn tất dọn phòng","iconId":"bed","activeIconId":"bed-filled"},{"key":"BOOKINGS","label":"Vật tư","description":"Ghi nhận đồ khách đã dùng","iconId":"clipboard","activeIconId":"clipboard-filled"},{"key":"ALERTS","label":"Báo lỗi","description":"Báo hỏng phòng và thiết bị","iconId":"wrench","activeIconId":"wrench-filled"},{"key":"ACCOUNT","label":"Tài khoản","description":"Thông tin nhân viên","iconId":"user","activeIconId":"user-filled"}]}$$::jsonb, 'DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM "mobile_ui_configurations" WHERE "app_key" = 'HOUSEKEEPING_MOBILE'::"AppKey");

INSERT INTO "mobile_ui_configurations" ("id", "app_key", "name", "config", "status")
SELECT gen_random_uuid()::text, 'TECHNICIAN_MOBILE'::"AppKey", 'Giao diện chuẩn ANIO Sửa chữa 1.0', $$
{"schemaVersion":2,"branding":{"appName":"ANIO Sửa chữa","primaryColor":"#C45A17","canvasColor":"#FFF8F2"},"dashboard":{"showSearch":false,"defaultFinancialDays":7,"kpis":["tasks","occupied"],"quickActions":["maintenance","rooms"],"quickActionLayout":"LIST"},"navigation":[{"key":"DASHBOARD","label":"Công việc","description":"Phiếu sửa chữa được phân công","iconId":"clipboard","activeIconId":"clipboard-filled"},{"key":"ROOMS","label":"Thiết bị","description":"Vị trí và tài sản cần sửa","iconId":"wrench","activeIconId":"wrench-filled"},{"key":"BOOKINGS","label":"Báo giá","description":"Báo giá và vật tư","iconId":"wallet","activeIconId":"wallet-filled"},{"key":"ALERTS","label":"Thông báo","description":"Cập nhật công việc và SLA","iconId":"bell","activeIconId":"bell-filled"},{"key":"ACCOUNT","label":"Tài khoản","description":"Hồ sơ kỹ thuật viên","iconId":"user","activeIconId":"user-filled"}]}$$::jsonb, 'DRAFT'
WHERE NOT EXISTS (SELECT 1 FROM "mobile_ui_configurations" WHERE "app_key" = 'TECHNICIAN_MOBILE'::"AppKey");
