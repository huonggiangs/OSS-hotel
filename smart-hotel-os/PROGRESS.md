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

## 2026-07-27 — property-web: implement UI PMS pixel-perfect từ bundle thiết kế

- [x] Đọc toàn bộ bundle `hotel-pms-software-design-phase-1/` (README, `project/CLAUDE.md`, `Hotel PMS.dc.html` 3307 dòng, `support.js` — phần khởi động runtime, `BA - Luong nghiep vu PMS.dc.html`, design tokens `_ds/.../tokens/*.css`).
- [x] Tạo `property-web/` (Next.js App Router + TypeScript + Tailwind, convention giống `webadmin/apps/web`) — xem `property-web/README.md` và `property-web/PROGRESS.md` (chi tiết đầy đủ từng màn hình đã/chưa làm).
- [x] Implement pixel-perfect: Dashboard (Overview + Calendar/Gantt), Booking (list + 3 modal + contract template), Rooms (4 panel donut lọc + lưới phòng + 3 modal), Price (2 bảng + 2 modal), Payment (cấu hình cổng + hoá đơn).
- [x] `npm install` + `npx tsc --noEmit` + `next build` chạy sạch (build test tại `/tmp`, source thật nằm ở `property-web/apps/web`, không có `node_modules`/`.next` trong mount).
- [ ] Các màn hình còn lại (Expenses, Night Audit, Channel, Users, Assets, Branches, cụm Settings, Customers, Services, Utilities, Modules, Printer) — hiện dẫn tới trang giữ chỗ `/stub/[key]`, đúng tinh thần khối `isStub` có sẵn trong bản thiết kế gốc.

## 2026-07-27 (phiên backend services) — Code thật cho 4 service còn thiếu

- [x] Tạo mới `services/` (chưa từng tồn tại) — 4 microservice ĐỘC LẬP, KHÔNG chung database, KHÔNG đụng `webadmin/`/`property-web/`: `channel-manager-service/`, `ai-pricing-service/`, `iot-service/`, `crm-service/`.
- [x] Mỗi service: Express + TypeScript + `pg` thuần (không Prisma, đúng convention `webadmin/`), migration SQL đánh số từ `001_init.sql`, `.env.example`, `Dockerfile` riêng, seed demo.
- [x] `channel-manager-service`: `OtaAdapter` interface + `MockOtaAdapter`, API inventory/price sync + webhook booking idempotent + chống overbooking (transaction `FOR UPDATE`).
- [x] `ai-pricing-service`: thuật toán rule-based thật (`src/pricing/engine.ts`) — weekday/occupancy/holiday/lead-time multiplier, kẹp min/max, có `scripts/demo-pricing.ts` (10 assertion PASS).
- [x] `iot-service`: idempotent command + ack + timeout thật (đúng RULES.md mục 10), mô phỏng qua HTTP thay MQTT (chưa có Edge Node/broker thật) — `scripts/simulate-device.ts` chứng minh luồng end-to-end.
- [x] `crm-service`: phân khúc khách rule-based (`src/segmentation/engine.ts`), `NotificationProvider` + `ConsoleNotificationProvider` (che số điện thoại khi log), campaign tôn trọng `opt_out` + frequency cap.
- [x] `services/docker-compose.yml` (1 Postgres dùng chung, 4 database riêng) + `services/README.md` + `services/PROGRESS.md` (chi tiết đầy đủ giới hạn/quyết định kiến trúc — đọc file đó, không lặp lại ở đây).
- [x] Build sạch (`tsc --noEmit`) cả 4 service; test chạy thật bằng Postgres thật qua wire protocol (`@electric-sql/pglite-socket` trong sandbox) + `curl`/script — phát hiện và sửa 1 bug timezone thật khi đọc cột DATE qua `pg` (chi tiết ở `services/PROGRESS.md`).
- [ ] PMS Core vẫn CHƯA có code thật — 4 service này hiện dùng dữ liệu seed độc lập thay vì đồng bộ thật từ PMS Core qua API/event bus (xem mục dưới).

## Chưa làm (bước tiếp theo)

1. Duyệt tài liệu với người có thẩm quyền quyết định sản phẩm (đặc biệt các mục còn mở trong `ASSUMPTIONS.md`/`DECISIONS.md`: cổng thanh toán, message bus, nguồn dữ liệu giá đối thủ).
2. Xây PMS Core thật (`services/pms-service/` chưa tồn tại) — đây là phần còn thiếu quan trọng nhất, 4 service backend mới thêm (channel-manager/ai-pricing/iot/crm) đều đang phụ thuộc dữ liệu seed vì chưa có PMS Core để đồng bộ thật.
3. Auth & IAM Service thật cho tầng backend `smart-hotel-os` (hiện `property-web` có auth riêng, các service mới thêm ở `services/` chưa có xác thực API-to-API).
4. Direct Booking Service, Revenue/Reporting Service, Notification Service, Audit Service — vẫn chỉ có đặc tả (`docs/`), chưa có code.
5. Kết nối `property-web` (hiện 100% mock data) với các service backend thật ở `services/`.

## Ghi chú

Tài liệu `kiosk.md` (sản phẩm Kiosk Remote Management) không bị chỉnh sửa trong phiên này — giữ nguyên là spec độc lập của sản phẩm kia.
