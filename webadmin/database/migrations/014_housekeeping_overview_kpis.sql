-- Buồng phòng cần ba thẻ tổng hợp cố định: bẩn, sạch và hỏng.
UPDATE "mobile_ui_configurations"
SET "config" = jsonb_set(
  "config",
  '{dashboard,kpis}',
  '["dirty","clean","broken"]'::jsonb,
  true
)
WHERE "app_key" = 'HOUSEKEEPING_MOBILE'::"AppKey";
