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

## 2026-07-31 — Xây dựng Edge Node (`apps/edge-node`) — thiết bị điều phối tại cơ sở, hoạt động khi mất mạng

Người dùng yêu cầu 2 lần rất rõ ràng: cần 1 thiết bị phần cứng đặt tại cơ sở, điều phối/điều khiển toàn bộ vận hành, để khi mất mạng Internet hệ thống vẫn chạy được, và khi máy tính chính hỏng thì nhân viên chuyển ngay sang máy khác/điện thoại mà không mất dữ liệu. Đây là mảnh ghép còn thiếu quan trọng để hiện thực hoá yêu cầu "offline-first" đã nêu ở `CLAUDE.md` mục 7.

- [x] Service mới `smart-hotel-os/apps/edge-node/` (`@edge-node/api`), Express + TypeScript, đúng convention chung (SQL thuần qua `pg`, không ORM) — copy đúng dependency list + `tsconfig.json` của `property-web/apps/api`.
- [x] `src/lib/db.ts`: DbPool 2 chế độ `postgres`/`embedded` (PGlite) y hệt `property-web/apps/api/src/lib/db.ts`, **mở rộng thêm `transaction()`** (không có ở 2 service kia) — bắt buộc để ghi outbox pattern (mutation nghiệp vụ + outbox event trong CÙNG 1 transaction, không bao giờ mất sự kiện đồng bộ dù crash giữa chừng).
- [x] `database/migrations/001_init.sql` — schema tối giản có chủ đích: `room_types`, `rooms`, `bookings` (rút gọn, không có bảng `customers` riêng — lưu thẳng `guest_name`/`guest_phone`), `property_users` (subset, chỉ đủ đăng nhập offline), `devices`, `device_commands` (mirror CHÍNH XÁC mô hình idempotent PENDING/ACKED/TIMEOUT/FAILED của `services/iot-service`), `outbox_events`. Cố tình KHÔNG có `customers`/`invoices`/`expenses`/`settings`/`audit_log` đầy đủ — ghi rõ ranh giới phạm vi trong README.
- [x] `src/lib/sync.ts` — cơ chế đồng bộ 2 chiều: job nền `setInterval` (mặc định 15s, `.unref()`, không throw khi mất mạng — mirror `webadmin/apps/api/src/lib/iotSync.ts`) push toàn bộ `outbox_events` PENDING lên Cloud property-web qua API sẵn có (`PATCH /rooms/:id`, `PATCH /rooms/:id/power`, `PATCH /devices/:id/power`, `POST`/`PATCH /bookings`), rồi pull `room_types`/`rooms`/`bookings`/`users` mới nhất về, upsert last-write-wins theo `updated_at`.
- [x] Giới hạn đồng bộ push đã ghi rõ trong README (không giấu): (1) booking tạo mới offline khi push lên Cloud bị đổi ID (Cloud tự sinh, không có endpoint upsert-theo-ID-client) nên các sự kiện tiếp theo của đúng booking đó có thể 404 tạm thời — không mất dữ liệu cục bộ, chỉ chưa tự khớp lại được; (2) `device_command` không có endpoint Cloud tương ứng (property-web chưa có mô hình lệnh idempotent) nên coi như đã đồng bộ ngay; (3) `property_users` chỉ đồng bộ hồ sơ (không mật khẩu, vì `GET /api/v1/users` của Cloud cố tình không trả `password_hash`) — Edge Node seed sẵn tài khoản demo cục bộ để login offline hoạt động ngay.
- [x] REST API PMS tối thiểu: `GET/POST /api/v1/rooms` (+ `PATCH .../power`), `GET /api/v1/room-types`, `GET/POST /api/v1/bookings` + `POST .../checkin` + `POST .../checkout` (idempotent, tự chuyển trạng thái phòng OCCUPIED/DIRTY + bật/tắt điện — đúng luật IoT "tắt điện sau checkout" ở CLAUDE.md mục 2.5), `GET/POST /api/v1/devices` + `POST .../commands` + `POST .../ack` (mirror chính xác `services/iot-service/src/routes/commands.routes.ts`), `GET /api/v1/sync/status` + `POST /api/v1/sync/trigger`.
- [x] Auth JWT riêng biệt (không bắt buộc trùng secret với Cloud — quyết định ghi rõ trong README, có thể đồng bộ secret nếu muốn token dùng chéo được).
- [x] UI khẩn cấp `public/index.html` — HTML/CSS/JS thuần không build step: danh sách phòng, đặt phòng hôm nay (nút nhận/trả phòng), thiết bị IoT (nút bật/tắt), banner trạng thái đồng bộ xanh/đỏ. `express.static` + bind `app.listen(PORT, "0.0.0.0", ...)` — bất kỳ điện thoại/máy tính nào trong cùng WiFi khách sạn truy cập thẳng qua `http://<ip-lan>:4200`.
- [x] Verify đầy đủ theo yêu cầu:
  - `npm install` (125 packages) + `npx tsc --noEmit` sạch, không lỗi.
  - Phát hiện thực tế quan trọng: **lần khởi động PGlite ĐẦU TIÊN mất ~29 giây** (khởi tạo cụm CSDL WASM từ đầu — khớp với cảnh báo "30-90 giây" đã ghi sẵn ở `start-all.ps1` cho các service khác) — phải tách kiểm thử thành 2 bước (bước 1 "làm nóng" `.data/` bằng lần chạy đầu, bước 2 chạy lại + test qua curl) do giới hạn 45s/lệnh của môi trường kiểm thử; lần chạy thứ 2 sẵn dữ liệu, khởi động nhanh hơn nhiều.
  - Chuỗi curl thật (Postgres embedded thật, không mock): `GET /health` → `db_mode: "embedded"`, `cloud_reachable: false` (không có gì lắng nghe ở `CLOUD_PROPERTY_API_URL`, đúng như kỳ vọng khi test offline) → `POST /auth/login` (reception/Anio2026@) → `GET /rooms` (12 phòng seed sẵn) → `POST /bookings` (tạo `EN-2026002`) → `POST /bookings/:id/checkin` (`CHECKED_IN`) → `POST /bookings/:id/checkout` (`CHECKED_OUT`) → `GET /devices` → `POST /devices/:id/commands` (`POWER_ON`, trạng thái `PENDING`) → `POST /devices/:id/ack` (`ACKED`, `power_on: true`) → `GET /sync/status` (`pending_outbox_count` tăng lên 9 từ các mutation trên, `cloud_reachable: false`) → `GET /health` lần 2 vẫn `200 OK`, không crash dù Cloud không kết nối được → `GET /` trả HTML 200 (UI khẩn cấp).
- [x] Cập nhật `start-all.ps1`: thêm cửa sổ thứ 5 "Edge Node" (cổng 4200, dùng `Start-DevWindow` pattern có sẵn), cập nhật khối hướng dẫn cuối cùng (URL Edge Node + lưu ý lần đầu chạy PGlite chậm hơn).

### Chưa làm / theo dõi tiếp

1. Ánh xạ ID booking cục bộ ↔ Cloud khi push (xem giới hạn ở trên) — cần endpoint nội bộ mới ở `property-web` hoặc bảng ánh xạ `local_id -> cloud_id` tại Edge Node.
2. Kết nối `device_commands` của Edge Node với `services/iot-service` thật (hiện 2 mô hình độc lập, chỉ giống schema).
3. Đồng bộ `password_hash` an toàn từ Cloud xuống Edge Node (cần endpoint nội bộ được bảo vệ riêng, không dùng API công khai hiện có).
4. Edge Node tự báo cáo tình trạng sống lên `webadmin.hardware_assets` (đã có sẵn kiểu `EDGE_NODE` trong enum) — gợi ý bước tiếp theo, chưa làm.
5. OAuth2 client-credentials máy-tới-máy đúng chuẩn `hq-console/docs/PARTNER_API_STANDARDS.md` thay cho việc job đồng bộ tạm dùng chung tài khoản `reception` để gọi API Cloud.

## Ghi chú

Tài liệu `kiosk.md` (sản phẩm Kiosk Remote Management) không bị chỉnh sửa trong phiên này — giữ nguyên là spec độc lập của sản phẩm kia.
