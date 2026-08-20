# Memory — Smart Hotel Group OSS Project

## Quy ước bàn giao và Git (bắt buộc từ 2026-08-20)

- Trước khi kết thúc **mỗi phiên làm việc hoặc phiên bản**, tạo một file handoff riêng tại gốc `D:\hotel\OSS`, theo tên `handoff1n_YYYYMMDD_HHMMSS.md` (thời gian Asia/Saigon), tóm tắt phạm vi, kiểm thử, thay đổi, lỗi/chặn và bước tiếp theo.
- Sau khi tạo handoff, commit toàn bộ thay đổi đã được người dùng duyệt và push lên `https://github.com/huonggiangs/OSS-hotel.git` trên nhánh `main`.
- Không tự sửa mã nguồn/chức năng. Mọi lỗi, điều chỉnh hoặc tối ưu phải trình bày bằng tiếng Việt và chờ người dùng duyệt trước khi thực hiện.

## Phiên 2026-08-20 — Audit dự án (không sửa mã)

- Đã tạo handoff: `handoff1n_20260820_114544.md`.
- Đã xác minh typecheck cho webadmin/property-web/Edge Node; phát hiện các lỗi ưu tiên về xác thực microservice, bất nhất check-in/phòng/điện, retry outbox Edge Node, lộ SMTP credential, xung đột cổng Docker và phụ thuộc có cảnh báo bảo mật.
- Chưa sửa lỗi nào; chờ người dùng duyệt phạm vi.

File này tồn tại để **phiên làm việc (Cowork session) sau có thể tiếp tục ngay** mà không phải đọc lại toàn bộ lịch sử chat. Luôn đọc file này đầu tiên khi bắt đầu một phiên mới trên dự án `D:\hotel\OSS`, và **cập nhật lại file này ở cuối mỗi phiên** (mục "Đã xong" / "Đang làm" / "Chưa làm" + ngày).

Cập nhật lần cuối: **2026-07-29 (phiên 7)** — verify xong module giám sát thiết bị webadmin (tìm & sửa 3 lỗi thật), dọn rác `.data`/`.next` tồn đọng trên ổ đĩa thật, tạo `start-all.ps1` (chạy 1 lệnh PowerShell là lên đủ 4 dịch vụ, không cần Docker)

## ⚠ QUAN TRỌNG NHẤT — đọc mục này TRƯỚC KHI làm gì ở phiên tiếp theo

1. **Sự cố "sandbox hết dung lượng đĩa" ở phiên 6 (2026-07-28) đã qua** — phiên 7 chạy trên sandbox mới hoàn toàn sạch (`df -h` xác nhận 3.9G trống), không cần người dùng cấp quyền gì thêm, đây thuần tuý là hạ tầng tạm thời được cấp lại khi mở phiên chat mới.
2. **`webadmin` module giám sát thiết bị (asset monitoring) — ĐÃ VERIFY CHẠY THẬT, tìm và sửa 3 lỗi thật** trong lúc test (không phải chỉ đọc code): (a) seed thiếu `asset_code` gây crash lúc khởi động lần đầu, (b) seed gán cứng mã trùng với mã do API tự sinh, (c) cảnh báo bảo hành không bao giờ được tính nếu `iot-service` chưa chạy (lỗi logic, đã tách ra chạy độc lập). Chi tiết đầy đủ + bằng chứng curl: `webadmin/PROGRESS.md` mục "2026-07-29".
3. **Phát hiện quan trọng**: `D:\hotel\OSS` (ổ đĩa thật của người dùng) có tồn đọng thư mục rác `.data/`, `.next/`, và CẢ `node_modules/` (đã cài sẵn!) từ các phiên trước — **`node_modules` đã có sẵn trên máy người dùng cho cả 4 app** (`webadmin/apps/api`, `webadmin/apps/web`, `property-web/apps/api`, `property-web/apps/web`), nghĩa là người dùng CÓ THỂ chạy `npm run dev` ngay, không bắt buộc phải `npm install` trước (dù chạy lại cũng vô hại, chỉ mất vài giây kiểm tra "up to date"). Đã xoá các thư mục `.data`/`.next` rác (không phải mất code, chỉ là cache/state cũ có thể ở trạng thái dở dang gây lỗi khó hiểu).
4. **Đã tạo `D:\hotel\OSS\start-all.ps1`** — đúng yêu cầu người dùng "chỉ cần chạy 1 đoạn code PowerShell là tất cả các web đều chạy bình thường". Chạy bằng:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "D:\hotel\OSS\start-all.ps1"
   ```
   Mở 4 cửa sổ PowerShell riêng (webadmin api/web, property-web api/web), mỗi cửa sổ tự `npm install` nếu thiếu rồi `npm run dev`. Dùng `-ExecutionPolicy Bypass` CHỈ cho lần chạy này (không đổi cài đặt máy vĩnh viễn, không cần quyền admin) — né đúng lỗi "chạy script bị chặn" người dùng gặp trước đó mà KHÔNG cần họ tự đổi `Set-ExecutionPolicy` thủ công. **File .bat cũ (`_start-property-web.bat`, double-click không chạy được) đã bị xoá, thay bằng script này.**
5. **Edge Node — ĐÃ XONG, verify chạy thật (không phải chỉ viết code).** Service mới `smart-hotel-os/apps/edge-node/` (port 4200, DB nhúng PGlite riêng, bind `0.0.0.0` để bất kỳ máy/điện thoại nào cùng mạng LAN khách sạn cũng vào được ngay khi máy chính hỏng). Cơ chế outbox: mọi thay đổi cục bộ (booking, checkin/checkout, lệnh IoT) ghi vào bảng `outbox_events` cùng transaction, đồng bộ 2 chiều với Cloud (`property-web` API) khi có mạng lại — Cloud vẫn là nguồn sự thật, Edge Node là executor+cache offline-first. Điều khiển IoT cục bộ dùng đúng mẫu idempotent PENDING/ACKED/TIMEOUT của `iot-service`. Có giao diện khẩn cấp `public/index.html` (HTML/JS thuần, không cần build) — xem phòng, checkin/checkout, bật/tắt thiết bị — dùng được thẳng từ trình duyệt điện thoại. Đã thêm cửa sổ thứ 5 vào `start-all.ps1`. Đăng nhập demo: `reception` / `Anio2026@`. Chi tiết + bằng chứng curl: `smart-hotel-os/PROGRESS.md`, `smart-hotel-os/apps/edge-node/README.md`.
   - Việc còn để ngỏ (đã ghi rõ trong README, không phải bug): id booking lệch giữa Edge Node và Cloud khi push (property-web chưa có endpoint upsert theo id khách gửi lên); `JWT_SECRET` của Edge Node độc lập với Cloud; đồng bộ `property_users` chỉ cập nhật hồ sơ (không có password_hash vì Cloud không trả field này) — tài khoản demo được seed cục bộ.

Cập nhật lần cuối (phiên hoàn chỉnh gần nhất trước đó): **2026-07-28 07:54** (phiên 5: nối NỐT 24/24 màn hình property-web vào API thật (28/28 xong), property-web + webadmin chạy được KHÔNG CẦN DOCKER (PGlite nhúng), đổi tài khoản demo property-web sang username ngắn + `Anio2026@`, vẽ sơ đồ DB + phân tích offline-first)

Trước đó: **2026-07-27 22:56** (phiên 4: Auth+API/DB thật cho `property-web`, 4 service backend `smart-hotel-os/services/` (Channel Manager/AI Pricing/IoT/CRM), webadmin thêm User/Role UI + Release Console + Purchase Orders — chạy 3 nhánh song song bằng subagent)

## 1. Tổng quan dự án

Ba hệ thống độc lập (không dùng chung database, giao tiếp qua API — xem `ARCHITECTURE_OVERVIEW.md`):

| Repo | Vai trò | Trạng thái |
|---|---|---|
| `kiosk.md` (+ `kiosk-management/` tương lai) | Spec sản phẩm Kiosk Remote Management | Chỉ có spec gốc (không phải do phiên Cowork tạo), **chưa có code** |
| `smart-hotel-os/` | Spec sản phẩm PMS SaaS (PMS + Channel Manager + AI Pricing + IoT + CRM) | Tài liệu đầy đủ; **`smart-hotel-os/property-web/` có đủ 28 màn hình UI + Auth thật + API/DB thật cho luồng lõi**; **`smart-hotel-os/services/` có code thật 4 service (Channel Manager, AI Pricing, IoT, CRM)** — xem mục 2 |
| `hq-console/` | Spec HQ Console (quản trị nội bộ công ty) | **Chỉ có tài liệu đầy đủ** |
| `webadmin/` | Code chạy được của HQ Console (implementation của `hq-console/`) | **Có code MVP chạy được** + User/Role UI + Release Console + Purchase Orders, đã build/test thành công |

Quy tắc bắt buộc phải nhớ: `RULES.md` (kiến trúc phân tán, Cloud là nguồn sự thật) và `CLAUDE.md` (yêu cầu gốc PMS+Automation) ở thư mục gốc — mọi thiết kế mới phải đối chiếu hai file này.

## 2. Đã xong

### Tài liệu (docs-only)
- `smart-hotel-os/docs/*` — đầy đủ 14 file: PRD, kiến trúc, data model, API spec, module spec (PMS Core, PMS Windows Client, Channel Manager/Booking, AI Pricing, IoT Energy, CRM, Revenue Dashboard), UI sitemap, security threat model, permission matrix, acceptance criteria, roadmap.
- `hq-console/docs/*` — đầy đủ: PRD, kiến trúc, data model, permission matrix, module spec (Hardware Inventory, Partner/Supplier, Customer 360, Commission, App Release Console), Partner API Standards.
- `ARCHITECTURE_OVERVIEW.md` — sơ đồ tổng quan 3 hệ thống (mermaid).
- Mỗi repo con có `ASSUMPTIONS.md` / `DECISIONS.md` (ADR) / `PROGRESS.md` riêng — **đọc các file này để biết chi tiết kỹ thuật**, memory.md chỉ tóm tắt.

### Code chạy được — `webadmin/` (HQ Console MVP)
- **API**: Express + TypeScript + `pg` (node-postgres thuần, KHÔNG dùng Prisma — lý do: sandbox build chặn CDN tải engine Prisma, xem `hq-console/DECISIONS.md` ADR-006). Auth JWT + RBAC, module Partners/Suppliers/Customers(360)/Hardware Assets(+warranty)/Commissions(rules+records+duyệt/thanh toán)/Dashboard/Audit log.
- **Web**: Next.js 16.2.12 (đã bump từ 14.2.5 vì lỗi bảo mật) + Tailwind. Login + 7 trang quản trị.
- **Database**: SQL thuần trong `database/migrations/001_init.sql`, migration runner viết tay (`database/migrate.ts`), seed demo (`database/seed.ts`). Đã build & test: `tsc` sạch lỗi, `next build` thành công, migration chạy được trên Postgres thật (test bằng `@electric-sql/pglite`).
- `docker-compose.yml` — 4 service (postgres, migrate, api, web), chạy 1 lệnh `docker compose up --build`.
- **README.md đã sửa lại hướng dẫn chạy cho đúng Windows** (PowerShell dùng `;`/`Set-Location`, CMD dùng `cd /d`/`&`, không dùng `&&` trực tiếp) — vì người dùng báo lỗi `&&` không chạy được trên CMD/PowerShell của họ (2026-07-27).
- `RULES_COMPLIANCE.md` — đối chiếu từng mục `RULES.md` với thiết kế webadmin.

### Code chạy được — `smart-hotel-os/property-web/` (PMS Property Web UI, từ bundle thiết kế Claude Design)

- Nguồn: bundle handoff `hotel-pms-software-design-phase-1/` (local, do người dùng export từ claude.ai/design) — file chính `Hotel PMS.dc.html` (3307 dòng) + `support.js` (runtime, chỉ đọc để hiểu semantics, KHÔNG copy) + `BA - Luong nghiep vu PMS.dc.html` (nghiệp vụ) + design tokens `_ds/.../tokens/*.css`. Đã đọc toàn bộ.
- **Next.js 16.2.12 (App Router) + TypeScript + Tailwind**, cấu trúc `property-web/apps/web/` giống hệt convention `webadmin/apps/web/`. Chạy ở cổng 3100 (song song được với `webadmin` ở cổng 3000).
- Đã implement **pixel-perfect** 5 màn hình ưu tiên: **Dashboard** (Overview 3 cột đầy đủ + Calendar/Gantt có kéo-chọn ngày thật), **Booking** (list + 3 modal + contract template editor có chèn tham số), **Rooms** (4 panel donut lọc + lưới 32 phòng + 3 modal theo trạng thái phòng, có công tắc bật/tắt điện IoT tại chỗ), **Price** (2 bảng loại phòng/phòng + 2 modal thêm mới), **Payment** (cấu hình cổng thanh toán + bảng hoá đơn). Shared layout: Sidebar collapsible + panel Cài đặt + Topbar (cỡ chữ/ngôn ngữ/profile modal).
- Dữ liệu mẫu tách riêng vào `apps/web/src/lib/mock-data.ts` (chưa có `apps/api`/DB riêng — ưu tiên UI đúng trước, xem `property-web/PROGRESS.md` mục "Điểm mơ hồ/tự quyết định" giải thích rõ).
- Build sạch: `npm install` + `npx tsc --noEmit` + `next build` (test tại `/tmp`, source thật trong mount không có `node_modules`/`.next`).
- **[PHIÊN 3 — 2026-07-27] Đã implement NỐT toàn bộ 23 màn hình còn lại — property-web giờ có ĐỦ 28 màn hình pixel-perfect, không còn màn hình nào là stub.** Nhóm main nav (7): Chi phí (`/expenses`, 2 tab), Kế toán đêm (`/night-audit`), Marketing (`/marketing`), Khách hàng (`/customers`), Dịch vụ (`/services`), Tiện ích (`/utilities`), Module nâng cao (`/modules`). Nhóm panel Cài đặt (16): Danh sách cơ sở (`/branches`), Cơ bản (`/basic`, 3 tab), Tiện ích cơ sở (`/amenities`, 3 tab, copy đủ danh sách tiện ích/hoạt động/dịch vụ dài của bản gốc), Hình ảnh (`/images`), Email (`/email`, 2 tab), Bảo vệ (`/security`), Tiền tệ (`/currency`), Thuế (`/tax`), Thời gian (`/time`), Máy in & mẫu in (`/printer`), Kênh bán OTA (`/channel`), Đồng bộ hoá (`/sync`), Cơ sở dữ liệu (`/db`), Người dùng & phân quyền (`/users`), Mạng xã hội (`/social`), Quản lý tài sản (`/assets`). `src/lib/nav.ts` đã trỏ toàn bộ `mainNav`/`settingsTree` sang route thật (không còn trỏ `/stub/[key]`). Chi tiết đầy đủ từng màn hình + điểm tự quyết định mới: `property-web/PROGRESS.md` mục "2026-07-27 (phiên 2)".
- `/stub/[key]` (component `StubPage`) vẫn còn trong code (không xoá, không gây lỗi) nhưng hiện KHÔNG còn nơi nào trong app trỏ tới nó nữa — an toàn nếu tái sử dụng cho màn hình mới sau này.

### [PHIÊN 4 — 2026-07-27] Auth thật + API/DB thật cho `property-web`
- **`property-web/apps/api/`** (mới, cổng 4100) — Express + TS + `pg` thuần, đúng convention `webadmin`. Migration `properties`, `property_users` (role OWNER/MANAGER/RECEPTIONIST/HOUSEKEEPING — **tách biệt hoàn toàn** bảng `users` của `webadmin`), `room_types`, `rooms` (có `power_on`), `customers`, `bookings`, `invoices`, `expenses`, `devices`, `audit_log`. Mọi bảng có `tenant_id`+`property_id`. Seed: 32 phòng + 4 tài khoản demo (`owner/manager/reception/housekeeping@anio-riverside.local`, mật khẩu chung `ChangeMe123!`).
- API: `POST /auth/login`, `GET /auth/me`, CRUD room-types/rooms(+bật tắt điện)/customers/bookings/payments/expenses/devices, `dashboard/summary`+`dashboard/gantt`.
- **Đã vá lỗ hổng "ai mở link cũng vào được"**: thêm trang `/login` (tự thiết kế mới, bản gốc không có màn đăng nhập), `RequireAuth` chặn toàn bộ route `(pms)`, JWT lưu localStorage.
- Đã nối API thật cho: **Đăng nhập, Dashboard (KPI+donut), Rooms (list+bật/tắt điện thật), Booking (list+tạo hợp đồng thật)**. Các màn còn lại (Price, Payment, Expenses, 16 màn Cài đặt...) **vẫn dùng mock** — không lỗi build nhưng chưa phải dữ liệu thật, xem danh sách đầy đủ ở `property-web/PROGRESS.md`.
- `docker-compose.yml` riêng cho `property-web` (web 3100, api 4100, postgres 5433 — chạy song song được với `webadmin` cổng 3000/4000/5432).
- Build: `tsc --noEmit` sạch (api+web), `next build` thành công đủ route kể cả `/login`, migration test qua `@electric-sql/pglite`.

### [PHIÊN 4 — 2026-07-27] `smart-hotel-os/services/` — 4 service backend THẬT (mới, chưa từng có code)
- **`channel-manager-service/`** (4101): `ota_connections`, sync log, `booking_ingestion_log` (idempotency_key chống trùng), `overbooking_alerts`. `OtaAdapter` interface + `MockOtaAdapter` (chưa có credential Booking/Agoda/Airbnb thật). API sync tồn phòng/giá + webhook nhận booking, đã test thật: chống overbooking hoạt động đúng.
- **`ai-pricing-service/`** (4102): thuật toán rule-based THẬT (`src/pricing/engine.ts` — occupancy/ngày trong tuần/lễ/lead-time, kẹp min-max), có `npm run demo:pricing` (10 assertion PASS). API `POST /pricing/suggest`.
- **`iot-service/`** (4103): `device_commands` idempotent + ack + timeout (đúng RULES.md), `device_heartbeats` gộp theo cửa sổ giờ (không lưu vô hạn). **Mô phỏng qua HTTP** vì chưa có MQTT broker/phần cứng thật (`scripts/simulate-device.ts` chứng minh luồng end-to-end chạy được). Khi có Edge Node/MQTT thật chỉ cần thay tầng transport.
- **`crm-service/`** (4104): phân khúc khách hàng rule-based (VIP/mới/quay lại), `NotificationProvider` + `ConsoleNotificationProvider` (chưa có SMS/Zalo/Email thật — kiến trúc cho phép cắm provider thật sau), tôn trọng opt-out + frequency cap.
- Cả 4 service: build `tsc --noEmit` sạch + **đã test chạy thật qua `@electric-sql/pglite-socket`** (không chỉ build sạch), phát hiện và sửa 1 bug thật lúc test (parse cột DATE lệch múi giờ trong `pg`). `services/docker-compose.yml` gộp cả 4 + 1 Postgres (4 database riêng). Chi tiết đầy đủ + giới hạn từng service: `smart-hotel-os/services/PROGRESS.md`.
- **Giới hạn rõ ràng còn lại**: chưa có credential OTA/SMS/Zalo thật (cần hợp đồng đối tác), chưa có MQTT broker/Edge Node thật, chưa có Auth API-to-API giữa các service, 4 service này dùng dữ liệu seed độc lập (chưa nối với PMS Core của `property-web`).

### [PHIÊN 4 — 2026-07-27] `webadmin` — 3 phần bổ sung
- **Quản lý user/role qua UI**: `GET/POST/PATCH /api/v1/users` + trang `/users` — chỉ `SUPER_ADMIN` gọi được (kể cả xem). Reset password trả mật khẩu tạm 1 lần (chưa có email service).
- **Release Console**: migration `002_release_console.sql` — bảng `app_releases` (6 app: kiosk/property-web/property-windows/owner-mobile/housekeeping-mobile/super-admin-web), unique index đảm bảo 1 bản active/app+channel ở tầng DB. Trang `/releases` (phát hành + rollback). **Đây là MVP quản lý version, CHƯA phải deploy pipeline thật** (chưa gửi lệnh xuống thiết bị/server).
- **Purchase Orders**: migration `003_purchase_orders.sql` — `purchase_orders`+`purchase_order_items`, workflow DRAFT→ORDERED→RECEIVED/CANCELLED, khi RECEIVED tự sinh `hardware_assets` cho dòng có gắn asset_type. Trang `/purchase-orders` (danh sách + chi tiết).
- Build: `tsc --noEmit` sạch (api+web), `next build` đủ 14 route, migration 001→003 test nối tiếp OK. Chi tiết: `webadmin/PROGRESS.md` (mới tạo).

### [PHIÊN 5 — 2026-07-28] Chạy được KHÔNG CẦN DOCKER + nối nốt 24 màn hình
**Bối cảnh: người dùng KHÔNG bật được Docker Desktop** (lỗi `npipe:////./pipe/dockerDesktopLinuxEngine ... system cannot find the file specified` = daemon chưa chạy), nên cả `webadmin` (3000/4000) lẫn `property-web` API (4100) đều không lên được → trang login báo "Đăng nhập thất bại". Đã sửa triệt để:
- **Cả `property-web/apps/api` VÀ `webadmin/apps/api` giờ có chế độ DB nhúng** dùng `@electric-sql/pglite` (PostgreSQL WASM, lưu file `.data/`, KHÔNG cần cài Postgres, KHÔNG cần Docker). File `src/lib/db.ts` là adapter chọn giữa PGlite nhúng (mặc định khi không có `DATABASE_URL`) và `pg.Pool` thật — **giữ nguyên interface `pool.query()` nên không phải sửa file repository nào**. `src/lib/embeddedBootstrap.ts` tự chạy migration + seed lần đầu khởi động (idempotent).
- Bản webadmin có xử lý thêm `pool.connect()` (transaction thủ công) vì webadmin dùng transaction thật, property-web thì không — đã test `BEGIN/COMMIT/ROLLBACK/FOR UPDATE` chạy đúng trên PGlite.
- `JWT_SECRET` có default an toàn cho dev (vẫn chặn cứng khi `NODE_ENV=production`) → `npm run dev` chạy được ngay, không cần tạo `.env` thủ công.
- **Đã kiểm chứng THẬT bằng curl** (không chỉ build sạch): property-web login `manager`/`Anio2026@` trả JWT 200 + `/auth/me` + `/rooms` (32 phòng); webadmin login `admin@hq-console.local`/`ChangeMe123!` trả JWT 200 + `/users` + `/releases` + `/purchase-orders` (xác nhận migration 002/003 chạy đúng ở chế độ nhúng). Khởi động lại lần 2 không seed trùng → persistence OK.
- `start-dev.bat` ở cả 2 thư mục (tiện ích phụ). **CẢNH BÁO: người dùng báo double-click `.bat` KHÔNG mở được cửa sổ trên máy họ** (nghi phần mềm bảo mật chặn) → đường chính là gõ tay lệnh trong README.
- README của cả 2 đã viết lại: cách KHÔNG-Docker lên đầu, Docker xuống thứ 2, thêm mục "Xử lý sự cố" 3 lỗi thực tế người dùng gặp.

**Đổi tài khoản demo property-web theo yêu cầu người dùng**: bỏ đuôi `@anio-riverside.local`, dùng username ngắn `owner`/`manager`/`reception`/`housekeeping`, mật khẩu chung đổi từ `ChangeMe123!` → **`Anio2026@`**. Thêm migration `002_add_username.sql` (cột `username` UNIQUE), route login đổi field `email` → `username` nhưng vẫn tra `username = $1 OR email = $1` (tương thích ngược, email cũ vẫn đăng nhập được). **Lưu ý: `webadmin` GIỮ NGUYÊN `admin@hq-console.local`/`ChangeMe123!`** — hai hệ thống khác nhau, đừng nhầm.

**Nối NỐT 24/24 màn hình property-web vào API thật → 28/28 màn hình dùng dữ liệu thật**:
- Thêm migration `003_property_settings.sql`: **MỘT bảng `property_settings` key-value** (`property_id`, `tenant_id`, `group_key`, `data jsonb`) phục vụ 21 nhóm cấu hình, thay vì tạo ~18 bảng riêng cho các màn Cài đặt — gọn, dễ mở rộng. API `GET/PUT /api/v1/settings/:group`.
- `/branches` dùng lại bảng `properties`; `/users` dùng lại `property_users` (+ `GET/POST /users`, `PATCH /users/:id` đổi role/khoá-mở).
- Đã curl test thật: 21 nhóm settings GET/PUT, `/branches`, `/users` CRUD, và RBAC (RECEPTIONIST gọi `/users` → 403; RECEPTIONIST PUT settings → 403 nhưng GET 200; MANAGER POST `/branches` OWNER-only → 403; khoá tài khoản → login 401 đúng).
- **Còn mock có chủ đích** (thiếu bảng nguồn, để phase sau): nhật ký hoạt động tài khoản (trang Bảo vệ), vài khối phụ ở Dashboard (thu/chi theo thời gian, gói phổ biến, hoạt động/khách mới, tab Gantt).
- **Quyết định kiến trúc**: `/channel` và `/sync` CHỈ lưu cấu hình cấp cơ sở trong DB property-web, KHÔNG gọi chéo sang `channel-manager-service` (giữ đúng ranh giới `ARCHITECTURE_OVERVIEW.md`) — đồng bộ OTA thật là bước sau.

### [PHIÊN 6 — 2026-07-28, DỞ DANG] webadmin: module giám sát thiết bị (asset monitoring) — CODE XONG, CHƯA VERIFY CHẠY THẬT
Theo yêu cầu người dùng: Hardware Assets cần hiển thị trạng thái kết nối, ngày kích hoạt, số lần mất kết nối, đối tác hỗ trợ/bảo hành, phí thuê bao dịch vụ kết nối, server đang kết nối, khách hàng dùng, thiết bị con gắn vào Kiosk (máy in nhiệt/quét hộ chiếu/QR), bắt buộc gán vào cơ sở — và phân vai rõ: **webadmin = vòng đời tài sản + cảnh báo, iot-service = trạng thái vận hành thật, property-web = ánh xạ thiết bị↔phòng**, liên kết bằng **mã thiết bị chung `asset_code`** (dạng `AST-XXXXXX`, sinh tại webadmin — webadmin là "sổ gốc").
- `webadmin/database/migrations/004_asset_monitoring.sql`: mở rộng enum `HardwareAssetType` (+`DOOR_LOCK`/`POWER_SWITCH`/`ELECTRIC_METER`/`EDGE_NODE`), thêm cột `asset_code`/`activated_at`/`connection_status`/`disconnect_count`/`last_seen_at`/`supporting_partner_id`/`connectivity_provider`/`subscription_fee`/`subscription_cycle`/`connected_server`/`property_id`/`property_name`/`parent_asset_id` vào `hardware_assets`, bảng mới `asset_alerts`.
- `webadmin/apps/api/src/lib/iotSync.ts` (đồng bộ connection_status/disconnect_count từ iot-service qua `asset_code` + sinh cảnh báo tự động: sắp hết bảo hành 30 ngày / offline >24h / mất kết nối nhiều trong 7 ngày) + `propertyWebClient.ts` (lấy danh sách cơ sở thật từ property-web `GET /branches`, có fallback an toàn nếu không kết nối được).
- Trang `/hardware-assets` mở rộng (badge kết nối, lọc theo cơ sở/trạng thái, khối cảnh báo) + trang chi tiết MỚI `/hardware-assets/[id]` (đầy đủ field, danh sách thiết bị con, nút đồng bộ thủ công).
- `iot-service`: migration `002_asset_code.sql` (cột `asset_code`), `sweepOfflineDevices()` (đếm mất kết nối thật qua timeout heartbeat), route `/pair`, `/by-asset-code/:code`.
- `property-web`: migration `004_asset_code.sql` (cột `asset_code` cho bảng `devices`) + middleware `requireAuthOrInternalKey` cho riêng `GET /branches` (cho phép webadmin gọi vào bằng header `X-Internal-Service-Key` thay JWT — **CƠ CHẾ TẠM THỜI CHO DEV, production phải đổi sang OAuth2 client credentials theo `hq-console/docs/PARTNER_API_STANDARDS.md`**).
- **Về "Navtask"**: không hardcode tên này — làm trường tự do `connectivity_provider` (gợi ý "Navtask" làm placeholder vì đó là tên người dùng nhắc tới) + `subscription_fee` + `subscription_cycle`, đổi tên/nhà cung cấp lúc nào cũng được.
- **⚠ CHƯA VERIFY CHẠY THẬT** (xem mục "QUAN TRỌNG NHẤT" đầu file) — `tsc --noEmit` đã sạch cho cả 3 backend và `next build` webadmin/web đã thành công TRƯỚC KHI phát hiện lỗi migration, nhưng bộ curl test end-to-end (bắt buộc theo quy trình dự án) CHƯA chạy được vì sandbox hết dung lượng đĩa ngay sau khi sửa lỗi migration. **KHÔNG coi module này production-ready cho tới khi verify xong.**
- Chi tiết đầy đủ: `webadmin/PROGRESS.md`, `smart-hotel-os/services/PROGRESS.md`.
- **CHƯA commit git** (bash sandbox wedged, không chạy được `git add`/`git commit`) — code vẫn nằm an toàn trên `D:\hotel\OSS` (mount Windows thật), nhưng phiên sau phải nhớ commit sau khi verify xong.

### Hạ tầng version control
- **Git repo cục bộ đã khởi tạo tại `D:\hotel\OSS`** (2026-07-27), branch `main`, có `.gitignore` (loại trừ node_modules/.next/dist/.env), đã có 1 commit ban đầu (107 file, "Initial commit"). **CHƯA kết nối remote GitHub** — bạn sẽ tự tạo repo + push, xem hướng dẫn ở mục 3.

### Skill tự động
- Đã tạo skill `smart-hotel-group-progress` (qua `save_skill`) — tự trigger khi có phiên làm việc chạm vào `D:\hotel\OSS`, đọc `memory.md` trước khi làm việc và nhắc cập nhật lại cuối phiên.

## 3. Đang làm / đang bị chặn (cần bạn cung cấp thêm thông tin)

1. **[ĐÃ GIẢI QUYẾT 2026-07-27]** Thiết kế PMS Windows từ Claude.ai Design — bạn đã export bundle handoff ra local tại `hotel-pms-software-design-phase-1/` (không cần Claude in Chrome nữa). Đã đọc toàn bộ và implement UI tại `smart-hotel-os/property-web/` (xem mục 2). Còn 1 quyết định nhỏ tự đưa ra khi đọc thiết kế (điều hướng SPA → route Next.js thật, chèn tham số hợp đồng, v.v.) — liệt kê đầy đủ ở `smart-hotel-os/property-web/PROGRESS.md` mục "Điểm mơ hồ/tự quyết định", có thể xem lại nếu muốn đổi cách làm.
2. **[ĐÃ GIẢI QUYẾT 2026-07-27, phiên 3]** property-web đã implement xong TOÀN BỘ màn hình UI của `Hotel PMS.dc.html` (28/28, không còn stub) — xem mục 2 phía trên và `smart-hotel-os/property-web/PROGRESS.md`.
3. **Backup GitHub** — bạn chọn "tự push từ máy mình". Git repo cục bộ đã có sẵn tại `D:\hotel\OSS` (branch `main`, 1 commit) — vì thư mục này mount thẳng vào máy thật của bạn, repo đó CŨNG đã tồn tại trên máy bạn, mở PowerShell/CMD tại `D:\hotel\OSS` là thấy ngay. **Việc còn lại là của bạn**: tạo repo trống trên GitHub rồi chạy (PowerShell):
   ```powershell
   Set-Location D:\hotel\OSS
   git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
   git push -u origin main
   ```
   (CMD: `cd /d D:\hotel\OSS` rồi hai lệnh git giữ nguyên). Lần đầu push GitHub sẽ hỏi đăng nhập/token — dùng Git Credential Manager (thường có sẵn nếu cài Git for Windows) hoặc Personal Access Token thay mật khẩu. Từ phiên sau, nếu `git remote -v` đã thấy `origin`, chỉ cần `git add -A; git commit -m "..."; git push` sau mỗi lần có thay đổi lớn.

## 4. Chưa làm (rõ ràng, chưa bắt đầu)

- **[ƯU TIÊN SỐ 1 phiên sau]** Verify chạy thật module giám sát thiết bị webadmin (phiên 6) — xem mục "⚠ QUAN TRỌNG NHẤT" đầu file. Dọn `/tmp` trước khi bắt đầu.
- **[ƯU TIÊN SỐ 2 phiên sau]** Build Edge Node (`smart-hotel-os/apps/edge-node/`) — chưa bắt đầu code. Ý tưởng đã thống nhất với người dùng: fork code `property-web/apps/api` (đã có sẵn chế độ DB nhúng offline-capable), thêm outbox + sync 2 chiều với Cloud khi có mạng, chạy trên phần cứng nhỏ luôn bật tại cơ sở (Raspberry Pi/mini PC), lắng nghe `0.0.0.0` để bất kỳ máy tính/điện thoại nào trong mạng LAN cũng vào dùng được ngay (trỏ `property-web/apps/web` có sẵn vào IP Edge Node qua `NEXT_PUBLIC_API_URL`) — máy lễ tân hỏng thì đổi thiết bị khác lập tức vì toàn bộ dữ liệu/logic nằm trên Edge Node, không nằm trên máy khách. Điều khiển thiết bị IoT cục bộ (khoá cửa/công tắc/công tơ) khi mất mạng.

- **[ĐÃ XONG 2026-07-27, phiên 3]** ~~`smart-hotel-os/property-web/` — các màn hình UI chưa implement~~ — toàn bộ 28 màn hình (`Hotel PMS.dc.html`) đã pixel-perfect, không còn `is...` nào trỏ `/stub/[key]`.
- **[ĐÃ XONG 2026-07-28, phiên 5]** ~~API/DB thật cho `property-web`~~ — **28/28 màn hình đã nối API thật** (xem mục phiên 5). Chỉ còn vài khối phụ dùng mock có chủ đích (nhật ký hoạt động tài khoản, biểu đồ thu/chi theo thời gian, gói phổ biến, hoạt động/khách mới, tab Gantt) vì thiếu bảng nguồn — cần thêm bảng `revenue_daily`/`activity_log` nếu muốn hoàn thiện.
- **[ĐÃ XONG MỘT PHẦN 2026-07-27, phiên 4]** ~~Code thật cho phần backend `smart-hotel-os`~~ — đã có code thật cho Channel Manager/AI Pricing/IoT/CRM (`smart-hotel-os/services/`) NHƯNG: (a) PMS Core hiện chỉ tồn tại dưới dạng API trong `property-web/apps/api/` (chưa tách thành service riêng theo đúng `services/pms-service/` như kiến trúc gốc dự kiến — quyết định thực dụng, ghi rõ trong `property-web/PROGRESS.md`), (b) 4 service mới chưa nối với nhau/với PMS Core (dùng seed riêng), (c) chưa có credential OTA/SMS/Zalo thật, chưa có MQTT broker thật — xem `smart-hotel-os/services/PROGRESS.md`.
- Code thật cho `kiosk-management` — mới chỉ có `kiosk.md` (spec gốc, không phải do Cowork tạo).
- `apps/property-windows` (PMS Windows Desktop App) — mới có tài liệu (`smart-hotel-os/docs/MODULE_PMS_WINDOWS_CLIENT.md`), **chưa có code**.
- Nối 4 service (Channel Manager/AI Pricing/IoT/CRM) với PMS Core thật của `property-web` (hiện tách rời, seed riêng).
- **[ĐÃ XONG 2026-07-27, phiên 4]** ~~`webadmin`: quản lý user/role qua UI, Release Console tổng hợp, module mua hàng/tồn kho chi tiết (`purchase_orders`)~~ — xem mục 2. Còn lại: MFA/VPN cho production.
- CI/CD, blue-green/canary deployment (RULES.md mục 14) — chưa làm cho bất kỳ repo nào.
- **Auth API-to-API giữa các service** (webadmin ↔ property-web ↔ 4 service mới) — hiện mỗi hệ thống có JWT/user riêng, chưa có cơ chế service-to-service auth (API key/OAuth2 client credentials như `PARTNER_API_STANDARDS.md` mô tả cho đối tác ngoài).
- **⚠ EDGE NODE / OFFLINE-FIRST — CHƯA CÓ CODE, đây là khoảng trống lớn nhất về kiến trúc** (phát hiện rõ khi vẽ sơ đồ DB ở phiên 5). Hiện `property-web` gọi thẳng API cloud → **mất Internet là quầy lễ tân đứng hình**, trái với yêu cầu offline-first trong `RULES.md` + `CLAUDE.md` mục 7. Cần: `apps/edge-node/` (dịch vụ chạy tại khách sạn) + DB cục bộ (cache booking hôm nay/mai, trạng thái phòng) + bảng `outbox` (xếp hàng thao tác khi offline) + cơ chế đẩy hàng đợi theo thứ tự khi có mạng lại + giải quyết xung đột do Cloud quyết định. Thiết kế đã có sẵn ở `smart-hotel-os/docs/SYSTEM_ARCHITECTURE.md` mục 4, chỉ chưa code.
- **⚠ Dữ liệu thiết bị đang TRÙNG ở 3 nơi, chưa có quy ước chủ sở hữu** (phát hiện phiên 5): `property-web.devices` (gán thiết bị vào phòng), `iot-service.devices` (lệnh + heartbeat), `webadmin.hardware_assets` (tài sản/bảo hành, có enum `IOT_CONTROLLER`/`KIOSK`... nhưng KHÔNG có `DOOR_LOCK`, `POWER_SWITCH`, `ELECTRIC_METER`, `EDGE_NODE`). Cần thống nhất: webadmin = vòng đời tài sản (mua/bảo hành/thanh lý), iot-service = trạng thái vận hành realtime, property-web = ánh xạ thiết bị ↔ phòng; liên kết bằng `device_id_external` (cột đã có sẵn trong `hardware_assets`). Nên bổ sung các loại thiết bị còn thiếu vào enum `HardwareAssetType`.

### Vụ "PowerShell không chạy được" (2026-07-27, phiên 4)
Người dùng báo chạy lệnh PowerShell không được, cả 3 cổng 3000/4000/3100 đều "connection refused" (đúng — chưa có server nào đang chạy). Đã thử dùng computer-use tạo file `D:\hotel\OSS\_start-property-web.bat` để tự động chạy giúp nhưng **double-click/"Open" không mở được Command Prompt** dù đã xin quyền — nghi có phần mềm bảo mật (Windows Defender/EDR) trên máy người dùng chặn chạy script, hoặc có hộp thoại SmartScreen hệ thống ẩn mà computer-use không thấy được (elevated dialog). Đã hướng dẫn người dùng tự gõ lệnh thủ công (gồm `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` để sửa lỗi phổ biến nhất). **Chưa xác nhận được người dùng đã chạy thành công** — phiên sau nếu người dùng báo lỗi cụ thể, ưu tiên đọc đúng nội dung lỗi trước khi đoán.

## 5. Lưu ý kỹ thuật quan trọng cho phiên sau

- **Không dùng Prisma** cho `webadmin` — dùng `pg` + SQL viết tay. Nếu thêm bảng mới: thêm file `database/migrations/002_....sql`, không sửa `001_init.sql`.
- **Sandbox build có tường lửa allowlist** — chặn `binaries.prisma.sh` (403). `registry.npmjs.org` và `github.com` thì gọi được bình thường.
- **File trong `D:\hotel\OSS` mặc định không xoá/đổi tên được** qua công cụ — nếu cần xoá, gọi `allow_cowork_file_delete` xin phép trước (đã làm 1 lần trong phiên 2026-07-26, hiện đã bật cho cả thư mục OSS trong phiên đó — **có thể phiên mới sẽ bị khoá lại, cần gọi lại nếu gặp lỗi "Operation not permitted"**).
- Build/test code nặng (npm install nhiều gói) nên làm ở `/tmp` (sandbox, nhanh, xoá được tự do) rồi mới copy source (không copy `node_modules`) sang `D:\hotel\OSS\...` — mount OSS chậm hơn và có giới hạn xoá.
- Next.js đã bump lên `16.2.12` (từ `14.2.5`) vì lỗi bảo mật đã biết ở 14.2.5 — nếu nâng cấp thêm, nhớ chạy lại `npm audit`.
- Người dùng dùng Windows, **không phải** macOS/Linux — mọi hướng dẫn dòng lệnh trong README phải có bản PowerShell/CMD riêng, không giả định `bash`/`&&` hoạt động được.
- **Bảng cổng đang dùng (để tránh xung đột khi chạy song song nhiều service)**: `webadmin` web=3000/api=4000/postgres=5432; `property-web` web=3100/api=4100/postgres=5433; `services/` channel-manager=4101, ai-pricing=4102, iot=4103, crm=4104 (1 postgres chung, 4 database riêng — cổng cụ thể xem `smart-hotel-os/services/docker-compose.yml`).
- File `D:\hotel\OSS\_start-property-web.bat` (tạo ở phiên 4, KHÔNG commit vào git) là script thử tự động chạy `property-web` qua computer-use nhưng KHÔNG chạy được trên máy người dùng (double-click không mở được cửa sổ) — có thể xoá nếu người dùng không cần, không phải một phần của sản phẩm.
- Từ phiên 4: khi cần làm nhiều nhánh việc lớn, độc lập (không đụng chung file) cùng lúc — dùng nhiều subagent chạy SONG SONG (1 message nhiều Agent call) để tiết kiệm thời gian, nhưng dặn từng agent KHÔNG được tự sửa `memory.md` và KHÔNG tự `git commit` (dễ xung đột khi chạy song song) — người điều phối (phiên chính) gộp lại và commit tập trung 1 lần ở cuối, sau khi kiểm tra `git status` không có file đè lên nhau.
