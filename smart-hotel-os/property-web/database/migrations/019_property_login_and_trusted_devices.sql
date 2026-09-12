-- Mã cơ sở dùng kèm username để đăng nhập đúng tenant. Với dữ liệu có số điện
-- thoại, mã là đúng 6 số cuối; dữ liệu cũ thiếu điện thoại nhận mã ổn định sinh
-- từ id và phải cập nhật lại số điện thoại trước khi bàn giao thực tế.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS login_code CHAR(6);

UPDATE properties
SET login_code = CASE
  WHEN length(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) >= 6
    THEN right(regexp_replace(phone, '[^0-9]', '', 'g'), 6)
  ELSE lpad(mod(abs(hashtext(id)::bigint), 1000000)::text, 6, '0')
END
WHERE login_code IS NULL;

ALTER TABLE properties ALTER COLUMN login_code SET NOT NULL;
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_login_code_format;
ALTER TABLE properties ADD CONSTRAINT properties_login_code_format CHECK (login_code ~ '^[0-9]{6}$');
DROP INDEX IF EXISTS properties_login_code_idx;
CREATE UNIQUE INDEX IF NOT EXISTS properties_login_code_key ON properties(login_code);

-- Username chỉ cần duy nhất trong một cơ sở; mã cơ sở là khóa phân vùng đăng
-- nhập. Điều này cho phép nhiều khách sạn cùng dùng username quen thuộc như
-- owner/reception mà không va chạm toàn hệ thống.
ALTER TABLE property_users DROP CONSTRAINT IF EXISTS property_users_username_key;
DROP INDEX IF EXISTS property_users_username_idx;
CREATE UNIQUE INDEX IF NOT EXISTS property_users_property_username_key
  ON property_users(property_id, lower(username));

ALTER TABLE mobile_connections ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'PASSWORD';
ALTER TABLE mobile_connections ADD COLUMN IF NOT EXISTS is_emulator BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE mobile_connections ADD COLUMN IF NOT EXISTS attestation_provider TEXT;
ALTER TABLE mobile_connections ADD COLUMN IF NOT EXISTS attestation_verdict TEXT;

-- Luồng chờ duyệt đã bị loại bỏ. Không tự cấp quyền cho các yêu cầu cũ chưa
-- từng xác thực mật khẩu.
UPDATE mobile_connections
SET status = 'REJECTED', rejected_at = now(),
    approval_note = 'Yêu cầu cũ đã đóng khi chuyển sang đăng nhập bằng mật khẩu.',
    updated_at = now()
WHERE status = 'PENDING';

-- Chống dò mã cơ sở/username/mật khẩu. Chỉ lưu hash, không lưu thông tin đăng
-- nhập thô; API giới hạn số lần thất bại theo mã cơ sở + tài khoản + IP.
CREATE TABLE IF NOT EXISTS property_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  property_code_hash CHAR(64) NOT NULL,
  identifier_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('WEB', 'ANDROID', 'IOS')),
  device_id_hash CHAR(64),
  succeeded BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_login_attempts_guard_idx
  ON property_login_attempts(property_code_hash, identifier_hash, ip_hash, created_at DESC)
  WHERE succeeded = false;
CREATE INDEX IF NOT EXISTS property_login_attempts_created_idx
  ON property_login_attempts(created_at);
