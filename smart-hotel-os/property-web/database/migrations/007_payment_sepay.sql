-- ============================================================================
-- Property Web — Migration 007: tích hợp cổng thanh toán SePay (chuyển khoản
-- ngân hàng/VietQR) cho trang /payment.
--
-- Bối cảnh:
--  - invoices.sepay_ref: mã giao dịch SePay (trường "id" trong payload webhook/
--    API SePay, ép về TEXT) đã khớp thanh toán hoá đơn này. NULL nghĩa là chưa
--    thanh toán qua SePay. UNIQUE để 1 giao dịch SePay không thể khớp trùng 2
--    hoá đơn (chặn double-processing) — kết hợp với điều kiện
--    "WHERE sepay_ref IS NULL" khi UPDATE ở tầng ứng dụng.
--  - sepay_webhook_events: nhật ký/khử trùng lặp mọi lần webhook SePay gọi đến
--    (SePay có cơ chế retry nếu không nhận được 200 + {"success":true} trong
--    30s — bảng này cho phép trả 200 ngay lập tức với các id đã xử lý mà không
--    xử lý lại). "id" TEXT PRIMARY KEY = đúng field "id" SePay gửi (ép về text).
--
-- Không sửa 001-006 — chỉ thêm mới.
-- ============================================================================

-- ---- invoices: mã tham chiếu giao dịch SePay ----
ALTER TABLE "invoices" ADD COLUMN "sepay_ref" TEXT;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sepay_ref_unique" UNIQUE ("sepay_ref");

-- ---- sepay_webhook_events: khử trùng lặp + nhật ký mọi lần gọi webhook ----
CREATE TABLE "sepay_webhook_events" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "matched_invoice_id" TEXT,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
