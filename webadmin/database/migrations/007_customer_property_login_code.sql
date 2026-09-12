-- Lưu mã cơ sở tại HQ để có thể tra cứu/bàn giao lại sau khi đóng hộp kết quả
-- setup nhanh. PMS vẫn là nguồn xác thực chính của mã này.
ALTER TABLE customers_unified ADD COLUMN IF NOT EXISTS property_login_code CHAR(6);

UPDATE customers_unified
SET property_login_code = right(regexp_replace(contact_phone, '[^0-9]', '', 'g'), 6)
WHERE property_login_code IS NULL
  AND length(regexp_replace(COALESCE(contact_phone, ''), '[^0-9]', '', 'g')) >= 6;

ALTER TABLE customers_unified DROP CONSTRAINT IF EXISTS customers_property_login_code_format;
ALTER TABLE customers_unified ADD CONSTRAINT customers_property_login_code_format
  CHECK (property_login_code IS NULL OR property_login_code ~ '^[0-9]{6}$');
CREATE INDEX IF NOT EXISTS customers_property_login_code_idx ON customers_unified(property_login_code);
