# Memory — Smart Hotel Group OSS Project

File này tồn tại để **phiên làm việc (Cowork session) sau có thể tiếp tục ngay** mà không phải đọc lại toàn bộ lịch sử chat. Luôn đọc file này đầu tiên khi bắt đầu một phiên mới trên dự án `D:\hotel\OSS`, và **cập nhật lại file này ở cuối mỗi phiên** (mục "Đã xong" / "Đang làm" / "Chưa làm" + ngày).

Cập nhật lần cuối: **2026-07-27 22:56** (phiên 4: Auth+API/DB thật cho `property-web`, 4 service backend `smart-hotel-os/services/` (Channel Manager/AI Pricing/IoT/CRM), webadmin thêm User/Role UI + Release Console + Purchase Orders — chạy 3 nhánh song song bằng subagent)

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

- **[ĐÃ XONG 2026-07-27, phiên 3]** ~~`smart-hotel-os/property-web/` — các màn hình UI chưa implement~~ — toàn bộ 28 màn hình (`Hotel PMS.dc.html`) đã pixel-perfect, không còn `is...` nào trỏ `/stub/[key]`.
- **[ĐÃ XONG MỘT PHẦN 2026-07-27, phiên 4]** ~~API/DB thật cho `property-web`~~ — đã có API/DB thật, nhưng **chỉ 4/28 màn hình đã nối** (Đăng nhập, Dashboard, Rooms, Booking). **Còn lại 24 màn hình vẫn dùng `mock-data.ts`** — việc tiếp theo rõ ràng: nối nốt Price/Payment/Expenses/Night Audit/Marketing/Customers/Services/Utilities/Modules + toàn bộ 16 màn Cài đặt vào API thật (tự thêm bảng/endpoint khi cần, theo đúng convention đã có trong `property-web/apps/api/`).
- **[ĐÃ XONG MỘT PHẦN 2026-07-27, phiên 4]** ~~Code thật cho phần backend `smart-hotel-os`~~ — đã có code thật cho Channel Manager/AI Pricing/IoT/CRM (`smart-hotel-os/services/`) NHƯNG: (a) PMS Core hiện chỉ tồn tại dưới dạng API trong `property-web/apps/api/` (chưa tách thành service riêng theo đúng `services/pms-service/` như kiến trúc gốc dự kiến — quyết định thực dụng, ghi rõ trong `property-web/PROGRESS.md`), (b) 4 service mới chưa nối với nhau/với PMS Core (dùng seed riêng), (c) chưa có credential OTA/SMS/Zalo thật, chưa có MQTT broker thật — xem `smart-hotel-os/services/PROGRESS.md`.
- Code thật cho `kiosk-management` — mới chỉ có `kiosk.md` (spec gốc, không phải do Cowork tạo).
- `apps/property-windows` (PMS Windows Desktop App) — mới có tài liệu (`smart-hotel-os/docs/MODULE_PMS_WINDOWS_CLIENT.md`), **chưa có code**.
- Nối 4 service (Channel Manager/AI Pricing/IoT/CRM) với PMS Core thật của `property-web` (hiện tách rời, seed riêng).
- **[ĐÃ XONG 2026-07-27, phiên 4]** ~~`webadmin`: quản lý user/role qua UI, Release Console tổng hợp, module mua hàng/tồn kho chi tiết (`purchase_orders`)~~ — xem mục 2. Còn lại: MFA/VPN cho production.
- CI/CD, blue-green/canary deployment (RULES.md mục 14) — chưa làm cho bất kỳ repo nào.
- **Auth API-to-API giữa các service** (webadmin ↔ property-web ↔ 4 service mới) — hiện mỗi hệ thống có JWT/user riêng, chưa có cơ chế service-to-service auth (API key/OAuth2 client credentials như `PARTNER_API_STANDARDS.md` mô tả cho đối tác ngoài).

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
