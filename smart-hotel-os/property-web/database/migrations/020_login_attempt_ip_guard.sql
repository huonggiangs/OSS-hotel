-- Hỗ trợ giới hạn tổng số lần đăng nhập sai từ cùng một IP mà không quét toàn
-- bộ lịch sử. Tách migration vì 019 đã được áp dụng trên database dùng chung.
CREATE INDEX IF NOT EXISTS property_login_attempts_ip_guard_idx
  ON property_login_attempts(ip_hash, created_at DESC)
  WHERE succeeded = false;
