# Progress — Smart Hotel OS

## 2026-07-25 — Giai đoạn tài liệu (Step 1)

Hoàn thành bộ tài liệu yêu cầu và kiến trúc trước khi code, theo đúng quy trình đã áp dụng cho sản phẩm Kiosk (`kiosk.md` mục 19, 22):

- [x] `README.md` — tổng quan sản phẩm, quan hệ với Kiosk Remote Management, 4 ứng dụng client.
- [x] `docs/PRODUCT_REQUIREMENTS.md`
- [x] `docs/SYSTEM_ARCHITECTURE.md`
- [x] `docs/DATA_MODEL.md`
- [x] `docs/API_SPECIFICATION.md`
- [x] `docs/MODULE_PMS_CORE.md`
- [x] `docs/MODULE_CHANNEL_MANAGER_BOOKING.md`
- [x] `docs/MODULE_AI_PRICING.md`
- [x] `docs/MODULE_IOT_ENERGY.md`
- [x] `docs/MODULE_CRM_MARKETING.md`
- [x] `docs/MODULE_REVENUE_DASHBOARD.md`
- [x] `docs/UI_SITEMAP.md`
- [x] `docs/SECURITY_THREAT_MODEL.md`
- [x] `docs/PERMISSION_MATRIX.md`
- [x] `docs/ACCEPTANCE_CRITERIA.md`
- [x] `docs/ROADMAP.md`
- [x] `ASSUMPTIONS.md`
- [x] `DECISIONS.md`

## 2026-07-26 — Mở rộng: sơ đồ tổng quan hệ thống, HQ Console, PMS Windows Client

- [x] Sơ đồ tổng quan toàn hệ thống (widget + `../ARCHITECTURE_OVERVIEW.md`) — làm rõ quan hệ 3 hệ thống: HQ Console, Kiosk Remote Management, Smart Hotel OS.
- [x] Thêm client `apps/property-windows` (PMS hoạt động trên 2 nền tảng: web + Windows) — `docs/MODULE_PMS_WINDOWS_CLIENT.md`, cập nhật `docs/SYSTEM_ARCHITECTURE.md`, `docs/UI_SITEMAP.md`, `README.md`.
- [x] Xác nhận ranh giới với `hq-console` (lớp quản trị nội bộ công ty mới) — ADR-008.
- [ ] Bổ sung webhook Admin API (`tenant.created`, `subscription.changed`, `subscription.cancelled`) để `hq-console` đồng bộ — xem `ASSUMPTIONS.md` mục 9, chưa thiết kế chi tiết.

## Chưa làm (bước tiếp theo)

1. Duyệt tài liệu với người có thẩm quyền quyết định sản phẩm (đặc biệt các mục còn mở trong `ASSUMPTIONS.md`/`DECISIONS.md`: cổng thanh toán, message bus, nguồn dữ liệu giá đối thủ).
2. Scaffold monorepo thật theo cấu trúc ở `docs/SYSTEM_ARCHITECTURE.md` mục 7 (chưa tạo — phiên làm việc này chỉ dừng ở tài liệu theo lựa chọn của người yêu cầu).
3. Thiết kế database migration thật cho các bảng ở `docs/DATA_MODEL.md`.
4. Xây dựng Auth/RBAC/Audit log (Step 3 theo mô hình thứ tự triển khai của `kiosk.md` mục 22, áp dụng tương tự cho sản phẩm này).
5. Xây PMS Core (Giai đoạn 1 MVP theo `docs/ROADMAP.md`).

## Ghi chú

Tài liệu `kiosk.md` (sản phẩm Kiosk Remote Management) không bị chỉnh sửa trong phiên này — giữ nguyên là spec độc lập của sản phẩm kia.
