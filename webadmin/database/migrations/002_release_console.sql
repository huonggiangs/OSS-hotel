-- ============================================================================
-- HQ Console (webadmin) — Migration 002: Release Console (tổng hợp phiên bản app)
--
-- Theo đặc tả `hq-console/docs/MODULE_APP_RELEASE_CONSOLE.md`: đây là màn
-- hình TỔNG HỢP phiên bản của các client app trong hệ sinh thái, KHÔNG PHẢI
-- cơ chế phát hành/rollout thật (Kiosk có Update Campaign riêng theo
-- `kiosk.md`, Smart Hotel OS quản lý version app riêng của mình). Bảng
-- `app_releases` ở đây chỉ ghi nhận: ứng dụng nào, phiên bản nào, kênh nào
-- (stable/beta) đang là bản "active" — dùng để hiển thị + làm nguồn tham
-- chiếu, không tự gửi lệnh cập nhật xuống thiết bị/khách hàng.
--
-- Không sửa 001_init.sql — chỉ thêm mới, chạy nối tiếp qua migrate.ts.
-- ============================================================================

CREATE TYPE "AppKey" AS ENUM (
  'KIOSK_APP',
  'PROPERTY_WEB',
  'PROPERTY_WINDOWS',
  'OWNER_MOBILE',
  'HOUSEKEEPING_MOBILE',
  'SUPER_ADMIN_WEB'
);
CREATE TYPE "ReleaseChannel" AS ENUM ('STABLE', 'BETA');

-- ---- app_releases ----
CREATE TABLE "app_releases" (
  "id" TEXT PRIMARY KEY,
  "app_key" "AppKey" NOT NULL,
  "version" TEXT NOT NULL,
  "release_notes" TEXT,
  "channel" "ReleaseChannel" NOT NULL DEFAULT 'STABLE',
  "published_at" TIMESTAMPTZ,
  "published_by" TEXT REFERENCES "users"("id"),
  "artifact_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "app_releases_app_key_idx" ON "app_releases"("app_key");
CREATE UNIQUE INDEX "app_releases_app_key_version_channel_key" ON "app_releases"("app_key", "version", "channel");

-- Ràng buộc nghiệp vụ ở tầng DB: mỗi (app, channel) chỉ có TỐI ĐA MỘT bản
-- đang active tại một thời điểm — "publish"/"rollback" đều phải khử-active
-- bản cũ trước khi active bản mới, xem apps/api/src/repositories/releases.repo.ts.
CREATE UNIQUE INDEX "app_releases_active_unique_idx" ON "app_releases"("app_key", "channel") WHERE "is_active" = true;
