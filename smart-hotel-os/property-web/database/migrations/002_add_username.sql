-- ============================================================================
-- property-web — Migration 002: thêm cột "username" cho property_users
--
-- Lý do: yêu cầu đơn giản hoá đăng nhập — thay vì bắt buộc gõ email đầy đủ
-- (vd. manager@anio-riverside.local), người dùng cấp cơ sở đăng nhập bằng tên
-- đăng nhập ngắn (owner/manager/reception/housekeeping). Cột "email" VẪN GIỮ
-- NGUYÊN (không xoá) để tương thích ngược — route POST /auth/login tra cứu
-- theo username HOẶC email (xem propertyUsers.repo.ts, findByUsernameOrEmail).
--
-- KHÔNG sửa 001_init.sql (quy tắc bắt buộc — mọi thay đổi schema sau bản khởi
-- tạo phải là migration mới, đánh số tiếp theo).
-- ============================================================================

ALTER TABLE "property_users" ADD COLUMN "username" TEXT;

-- Backfill cho các bản ghi có sẵn (nếu migration này chạy trên DB đã có seed cũ
-- từ trước) — lấy phần trước dấu "@" của email làm username tạm.
UPDATE "property_users" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL;

ALTER TABLE "property_users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "property_users" ADD CONSTRAINT "property_users_username_key" UNIQUE ("username");
CREATE INDEX "property_users_username_idx" ON "property_users"("username");
