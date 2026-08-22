-- ============================================================================
-- Property Web — Migration 006: cách tính giá/giảm giá cho loại phòng +
-- mã phòng/QR token/bật đồng bộ OTA cho từng phòng
--
-- Bối cảnh (trang /price — "Phòng và giá"):
--  - room_types: thêm "Cách tính giá" (nhãn tự do, UI chỉ cho chọn 1 trong 2 giá
--    trị cố định PER_NIGHT/PER_HOUR — KHÔNG dựng engine tính giá phức tạp ở đây)
--    và "% giảm giá" cơ bản.
--  - rooms: thêm room_code (mã phòng hiển thị, hệ thống tự sinh — KHÔNG cho
--    client tự đặt), qr_token (khoá bí mật dùng trong URL công khai
--    /guest/room/:token, cấp quyền đọc thông tin phòng cho khách quét QR — phải
--    không đoán được), sync_enabled (cờ boolean bật/tắt "đủ điều kiện đồng bộ
--    OTA" — CHƯA gọi API kênh phân phối thật, đó là phạm vi của
--    channel-manager-service, ghi nhận là giới hạn đã biết).
--
-- gen_random_uuid() đã dùng sẵn từ 001_init.sql (hàm built-in PostgreSQL >= 13,
-- không cần cài thêm extension) — dùng lại để backfill dữ liệu demo đã seed sẵn
-- (32 phòng) mà không phá dữ liệu cũ.
--
-- Không sửa 001-005 — chỉ thêm mới.
-- ============================================================================

-- ---- room_types: cách tính giá + % giảm giá ----
ALTER TABLE "room_types" ADD COLUMN "pricing_method" TEXT NOT NULL DEFAULT 'PER_NIGHT';
ALTER TABLE "room_types" ADD COLUMN "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- ---- rooms: mã phòng + QR token + cờ đồng bộ OTA ----
ALTER TABLE "rooms" ADD COLUMN "room_code" TEXT;
ALTER TABLE "rooms" ADD COLUMN "qr_token" TEXT;
ALTER TABLE "rooms" ADD COLUMN "sync_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill cho các phòng demo đã seed sẵn TRƯỚC migration này (property đã
-- chạy từ trước, nâng cấp lên). Trên môi trường embedded MỚI (chưa có dữ liệu),
-- migration này chạy TRƯỚC khi seed demo chèn 32 phòng — DEFAULT bên dưới lo
-- phần đó, UPDATE này chỉ tác dụng khi có sẵn phòng chưa có room_code/qr_token.
UPDATE "rooms"
SET "room_code" = 'PHONG-' || substr(md5("id"), 1, 8)
WHERE "room_code" IS NULL;

UPDATE "rooms"
SET "qr_token" = md5("id" || clock_timestamp()::text)
WHERE "qr_token" IS NULL;

-- DEFAULT cho mọi INSERT không tự truyền room_code/qr_token (vd. script seed
-- demo database/seed.ts + embeddedBootstrap.ts không biết về 2 cột mới này) —
-- roomsRepo.create() ở API vẫn LUÔN truyền giá trị tự sinh riêng (ghi đè
-- DEFAULT), đây chỉ là lưới an toàn để không vi phạm NOT NULL/UNIQUE.
ALTER TABLE "rooms" ALTER COLUMN "room_code" SET DEFAULT ('PHONG-' || substr(md5(gen_random_uuid()::text), 1, 8));
ALTER TABLE "rooms" ALTER COLUMN "qr_token" SET DEFAULT (md5(gen_random_uuid()::text || clock_timestamp()::text));

ALTER TABLE "rooms" ALTER COLUMN "room_code" SET NOT NULL;
ALTER TABLE "rooms" ALTER COLUMN "qr_token" SET NOT NULL;

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_code_key" UNIQUE ("room_code");
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_qr_token_key" UNIQUE ("qr_token");
