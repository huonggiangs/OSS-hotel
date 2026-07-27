# Progress — HQ Console

## 2026-07-26 — Khởi tạo tài liệu (Step 1)

- [x] `README.md`
- [x] `docs/PRODUCT_REQUIREMENTS.md`
- [x] `docs/SYSTEM_ARCHITECTURE.md`
- [x] `docs/DATA_MODEL.md`
- [x] `docs/PERMISSION_MATRIX.md`
- [x] `docs/MODULE_HARDWARE_INVENTORY.md`
- [x] `docs/MODULE_PARTNER_SUPPLIER.md`
- [x] `docs/MODULE_CUSTOMER_360.md`
- [x] `docs/MODULE_COMMISSION.md`
- [x] `docs/MODULE_APP_RELEASE_CONSOLE.md`
- [x] `docs/PARTNER_API_STANDARDS.md` (chuẩn dùng chung cho cả 3 hệ thống khi expose API ra ngoài)
- [x] `ASSUMPTIONS.md`, `DECISIONS.md`

## 2026-07-26 — Bản chạy được (webadmin/)

Toàn bộ code chạy được của HQ Console nay nằm ở `../webadmin/` (ngang cấp với `hq-console/`), không ghi đè hay di chuyển bất kỳ file nào trong thư mục này — `hq-console/docs/` vẫn là đặc tả nguồn, `webadmin/` là triển khai tham chiếu theo đặc tả đó.

- [x] Auth (JWT) + RBAC theo role — bám theo `docs/PERMISSION_MATRIX.md`.
- [x] Module Partners, Suppliers, Customer 360 (+ support tickets), Hardware Assets (+ warranty claims), Commission (rules + records + duyệt/thanh toán), Dashboard tổng hợp, Audit log.
- [x] Database: SQL thuần qua `pg` (không dùng Prisma — xem ADR trong `DECISIONS.md`), migration đầu tiên đã chạy thử thành công trên PostgreSQL thật (WASM Postgres dùng để kiểm chứng khi build).
- [x] `docker-compose.yml` — chạy toàn bộ hệ thống bằng `docker compose up --build`.
- [ ] Đồng bộ thật với Admin API của `smart-hotel-os`/`kiosk-management` — vẫn chờ hai repo đó bổ sung endpoint (xem `ASSUMPTIONS.md` mục 1–2).
- [ ] Quản lý user/role qua UI (hiện chỉ seed sẵn 4 tài khoản demo).
- [ ] Release Console tổng hợp (`docs/MODULE_APP_RELEASE_CONSOLE.md`) chưa code.
- [ ] `purchase_orders`/quản lý mua hàng chi tiết (`docs/MODULE_HARDWARE_INVENTORY.md`) chưa code — mới có `hardware_assets` + `warranty_claims`.

## Chưa làm (bước tiếp theo)

1. Duyệt tài liệu, đặc biệt quy tắc hoa hồng cụ thể (`ASSUMPTIONS.md` mục 5) cần Sales/Ban điều hành xác nhận.
2. Bổ sung Admin API phía `kiosk-management` cần cho đồng bộ (`ASSUMPTIONS.md` mục 1) — việc của repo `kiosk-management`, không phải của `hq-console`.
3. Bổ sung webhook phía `smart-hotel-os` (`ASSUMPTIONS.md` mục 2).
4. Scaffold monorepo thật theo `docs/SYSTEM_ARCHITECTURE.md` mục 6 — **đã thực hiện**, xem `../webadmin/` (cấu trúc thực tế hơi khác đề xuất ban đầu: dùng `pg` thay Prisma, dùng Express thay NestJS — lý do ghi ở `DECISIONS.md`).
5. Thiết kế database migration cho các bảng ở `docs/DATA_MODEL.md` — **đã thực hiện một phần** ở `../webadmin/database/migrations/001_init.sql` (chưa có `purchase_orders`, `warehouse_locations`, `stock_movements`, `app_release_summary`, `release_alerts`, `tenant_summary_cache`, `kiosk_customer_summary_cache`, `sync_jobs`, `sync_error_log` — để dành cho các bước tiếp theo khi tích hợp thật với hai sản phẩm kia).
