# Progress — smart-hotel-os/services

Ghi lại trạng thái thật của 4 service backend (`channel-manager-service`,
`ai-pricing-service`, `iot-service`, `crm-service`) tính tới lần implement
này. Đọc `README.md` cùng thư mục trước để biết cách chạy.

## Tổng quan trạng thái

| Service | Migration | API | Build (`tsc --noEmit`) | Test chạy thật |
|---|---|---|---|---|
| channel-manager-service | ✅ `db/migrations/001_init.sql` | ✅ | ✅ sạch lỗi | ✅ (xem bên dưới) |
| ai-pricing-service | ✅ | ✅ | ✅ sạch lỗi | ✅ |
| iot-service | ✅ | ✅ | ✅ sạch lỗi | ✅ |
| crm-service | ✅ | ✅ | ✅ sạch lỗi | ✅ |

## Quyết định kiến trúc quan trọng

### 1. Gộp `db/` (migrate + seed) vào cùng package.json của mỗi service

Khác với `webadmin/` (tách `apps/api` và `database` thành 2 package riêng
trong 1 monorepo dùng chung), mỗi service ở đây là một microservice ĐỘC LẬP
hoàn toàn (không dùng chung database, không import code lẫn nhau), nên gộp
luôn `db/migrate.ts` + `db/seed.ts` + `db/migrations/*.sql` vào chính
`package.json` của service (script `npm run migrate` / `npm run seed`). Ít
package hơn, vẫn giữ đúng nguyên tắc "migration SQL đánh số riêng từ
`001_init.sql`".

### 2. Hạ tầng Postgres cho `services/docker-compose.yml`

Chọn **1 tiến trình Postgres dùng chung, 4 database riêng biệt** (mỗi service
1 database + 1 user riêng, tạo qua `infra/postgres-init.sql`), thay vì 4
container Postgres độc lập. Lý do: tiết kiệm tài nguyên khi chạy demo/dev cục
bộ trên máy người dùng (4 Postgres cùng lúc khá nặng), trong khi vẫn giữ đúng
yêu cầu "KHÔNG chung database với nhau" — về mặt logic, mỗi service có
database riêng, schema riêng, không JOIN chéo được, không có quyền truy cập
database của service khác (user Postgres riêng). Khi lên production ở quy mô
lớn, chỉ cần đổi `DATABASE_URL` của từng service để trỏ sang cụm Postgres
riêng — không phải sửa code.

### 3. Không dùng Prisma — SQL thuần qua `pg` (đồng nhất `webadmin/`)

Đúng yêu cầu bắt buộc của nhiệm vụ và nhất quán với `webadmin/database` —
migration runner viết tay (`db/migrate.ts`), theo dõi migration đã chạy qua
bảng `_migrations`, không phụ thuộc công cụ ngoài nào.

### 4. Sửa lỗi timezone khi đọc cột `DATE` từ `pg` (phát hiện trong lúc test)

Trong lúc test end-to-end (mục "Đã test chạy thật" bên dưới), phát hiện bug
thật: driver `pg` mặc định parse cột `DATE` (không có giờ/timezone) thành
JS `Date` ở NỬA ĐÊM GIỜ ĐỊA PHƯƠNG của máy chạy code — nếu sau đó code gọi
`.toISOString()` (quy đổi sang UTC) để lấy lại chuỗi ngày, kết quả bị lệch
sang NGÀY HÔM TRƯỚC ở múi giờ dương (vd. UTC+7, đúng môi trường sandbox dùng
để test). Bug này khiến `channel-manager-service` từ chối NHẦM một booking
hợp lệ là overbooking (vì so sai ngày trong `room_type_inventory_cache`), và
có thể khiến `crm-service` tính `Invalid Date` khi tính lead time/segment từ
`customers.last_stay_check_out`.

**Đã sửa** bằng cách ép kiểu OID 1082 (DATE) trả về CHUỖI `'YYYY-MM-DD'` thuần
thay vì `Date`, áp dụng ở `src/lib/db.ts` của `channel-manager-service`,
`ai-pricing-service`, `crm-service` (`iot-service` không có cột DATE nào nên
không cần). Cũng sửa các script seed dùng `toISOString()` để tính "N ngày kể
từ hôm nay" sang format theo giờ địa phương trực tiếp (tránh quy đổi UTC).
Sau khi sửa, đã test lại và xác nhận đúng (xem bên dưới).

## Đã test chạy thật (không chỉ build sạch)

Vì sandbox không có quyền root để cài PostgreSQL thật qua `apt`/`docker`, đã
dùng `@electric-sql/pglite-socket` (PGlite — Postgres thật biên dịch sang
WASM — bọc qua TCP theo đúng wire protocol Postgres) làm Postgres tạm thời để
chạy `npm run migrate && npm run seed` và cả API thật, gọi bằng `curl`/script
thật. Đây CHỈ là công cụ verify trong phiên làm việc này — khi chạy thật trên
máy người dùng hoặc qua `docker-compose.yml`, dùng Postgres 16 chính thức
(image `postgres:16-alpine`), không phụ thuộc PGlite.

Kết quả cụ thể:

- **channel-manager-service**: `POST /inventory/sync` đẩy tồn phòng sang cả 3
  kênh (booking/agoda/airbnb) qua `MockOtaAdapter`, ghi log `SUCCESS`.
  `POST /webhooks/booking/bookings` với 1 phòng trống: booking #1 `accepted:true`,
  booking #2 (kênh khác, cùng ngày) `accepted:false, reason:OVERBOOKING_PREVENTED`
  kèm `overbooking_alerts` + gọi `cancelBooking` mock. Gọi lại `idempotencyKey`
  của booking #1 trả về `idempotent_replay:true` với đúng bản ghi cũ, không tạo
  booking trùng.
- **ai-pricing-service**: `npm run demo:pricing` chạy 10 assertion (8 kịch
  bản) PASS 100% — xem output trong README. `POST /pricing/suggest` với 3
  ngày occupancy khác nhau trả đúng giá theo rule (occupancy cao -> x1.2,
  lead-time thấp + occupancy thấp -> x0.85, ngày bình thường -> giữ giá gốc),
  có lưu vào `pricing_suggestions`.
- **iot-service**: `npm run simulate:device` chạy đủ 4 bước end-to-end qua
  HTTP thật: tạo lệnh `POWER_ON` (202 PENDING) -> ack thành công (200 ACKED)
  -> gửi lại `idempotencyKey` cũ trả về đúng lệnh cũ (không tạo lệnh trùng)
  -> tạo lệnh `AC_SET_TEMPERATURE` timeout 2 giây không ack -> sau 4 giây tra
  lại thấy tự chuyển `TIMEOUT` (nhờ sweep job trong `src/index.ts`) -> thử ack
  trễ bị từ chối đúng `409 CONFLICT`.
- **crm-service**: `POST /segments/recompute` với 6 khách seed tính đúng cả 5
  loại segment (`VIP`, `RETURNING_GUEST` x2, `NEW_GUEST`, `INACTIVE_30D`,
  `INACTIVE_90D`). Gửi campaign `SMS` tới segment `VIP`: đúng 1 khách nhận,
  log console che số điện thoại (`*******111`). Gửi campaign tới
  `RETURNING_GUEST` (2 khách, 1 trong đó `opt_out=true`): chỉ 1 khách
  `SUCCESS`, khách còn lại `SKIPPED_OPT_OUT`. Gửi lại campaign đó ngay lập tức:
  khách vừa nhận bị `SKIPPED_FREQUENCY_CAP` đúng như cấu hình `frequency_cap_days`.

## Giới hạn / CHƯA làm (quan trọng — đọc trước khi lên production)

### channel-manager-service
- **Chưa có credential OTA thật** — `MockOtaAdapter` mô phỏng toàn bộ 3 kênh
  (Booking.com/Agoda/Airbnb đều yêu cầu ký hợp đồng đối tác + thẩm định trước
  khi cấp API key, không thể tự tạo tài khoản test). Khi có credential thật,
  implement adapter riêng theo `OtaAdapter` interface (`src/adapters/`),
  đăng ký ở `src/adapters/index.ts` — core logic (routes/repositories) không
  cần sửa.
- `ota_connections.credentials` lưu dạng JSONB rõ (chưa mã hoá tại tầng ứng
  dụng) — PHẢI mã hoá (vd. KMS envelope encryption) trước khi dùng credential
  thật ở production.
- Chưa có PMS Core thật để phát sự kiện `inventory.changed`/`rate.changed` —
  `POST /inventory/sync`/`POST /price/sync` hiện được gọi thủ công qua API
  thay vì tự động theo sự kiện.

### ai-pricing-service
- Chỉ có **Phase 1 (rule-based)** theo đúng phạm vi nhiệm vụ — Phase 2 (mô
  hình dự đoán học từ lịch sử + giá đối thủ) chưa làm, đúng lộ trình
  `MODULE_AI_PRICING.md` mục 3 (cần nguồn dữ liệu giá đối thủ hợp pháp trước).
- Chưa có bước "apply" (quản lý duyệt giá đề xuất -> cập nhật PMS Core -> đồng
  bộ OTA) — vì PMS Core chưa có code thật. `pricing_suggestions` mới dừng ở
  lưu lịch sử đề xuất, chưa có bảng `price_suggestion_overrides` theo
  `DATA_MODEL.md` (để Phase 2 làm cùng lúc với model thật, tránh thiết kế
  thừa trước khi có use case).

### iot-service
- **Đây là MÔ PHỎNG qua HTTP, không phải MQTT thật** — chưa có Edge Node,
  chưa có MQTT broker (vd. EMQX). Giải thích đầy đủ lý do + cách thay tầng
  transport khi có broker thật ở `iot-service/README.md`.
- Timeout sweep chạy bằng `setInterval` trong CÙNG process với API
  (`src/index.ts`) — chỉ phù hợp demo/dev. Production nên tách thành
  worker/scheduler riêng để không phụ thuộc vòng đời process API.
- `device_heartbeats` mới dừng ở tổng hợp theo cửa sổ 1 giờ (không phình vô
  hạn theo từng nhịp tim) — CHƯA có job xoá cửa sổ quá cũ (retention policy).
- Chưa có xác thực/định danh thiết bị (RULES.md mục 11 "Devices MUST have
  unique identity") — endpoint `/ack`/`/heartbeat` hiện không yêu cầu token
  riêng cho từng thiết bị, chỉ phù hợp demo nội bộ.

### crm-service
- Chỉ có `ConsoleNotificationProvider` (log console) — CHƯA tích hợp SMS/Zalo
  OA API/Email thật. Khi có, implement provider mới theo `NotificationProvider`
  interface (`src/providers/`), đổi `NOTIFICATION_PROVIDER` — routes không
  cần sửa.
- Chưa tách Notification Service riêng như kiến trúc mục tiêu
  (`SYSTEM_ARCHITECTURE.md`) — CRM Service hiện tự gọi thẳng
  `NotificationProvider` thay vì tạo yêu cầu gửi rồi để Notification Service
  điều phối/retry độc lập (đơn giản hoá vì Notification Service cũng chưa có
  code thật trong dự án).
- `customers.total_stays`/`total_spend`/`last_stay_check_out` hiện là dữ liệu
  SEED THỦ CÔNG, chưa đồng bộ thật từ PMS Core qua sự kiện `booking.checked_out`
  (vì PMS Core chưa có code thật).
- Chưa có trigger tự động (checkout -> cảm ơn, sinh nhật, chuyển VIP...) —
  `campaigns.trigger_type` đã có trong schema nhưng việc TỰ ĐỘNG kích hoạt
  theo sự kiện (thay vì gọi `POST /campaigns/:id/send` thủ công) cần Event Bus
  thật (`SYSTEM_ARCHITECTURE.md` mục 2), chưa triển khai trong phạm vi này.

## Chưa làm — chung cho cả 4 service

- Chưa có Auth/API key riêng giữa các service (RULES.md mục 11 "No shared
  credentials") — hiện API mở, phù hợp demo/dev nội bộ, KHÔNG được expose ra
  Internet ở dạng hiện tại.
- Chưa có CI/CD, blue-green/canary deployment (RULES.md mục 14) — đồng nhất
  tình trạng "chưa làm cho bất kỳ repo nào" đã ghi ở `memory.md` gốc.
- Chưa viết test tự động dạng framework (Jest/Vitest) — verify hiện tại dựa
  vào `tsc --noEmit` sạch lỗi + script demo/simulate chạy thật (assert bằng
  `node:assert/strict`) + test thủ công bằng `curl`, đủ để chứng minh logic
  đúng nhưng chưa có test suite chạy tự động trong CI.

## 2026-07-28 — iot-service: mã thiết bị chung (asset_code) + đếm mất kết nối thật

Bối cảnh: `webadmin.hardware_assets` (vòng đời tài sản), `iot-service.devices` (trạng thái vận
hành), `property-web.devices` (ánh xạ thiết bị↔phòng) trước đây là 3 nơi lưu thiết bị hoàn toàn
tách rời, không có cách nào biết "thiết bị #X trong webadmin" chính là "device #Y trong iot-service"
(ghi trong `memory.md` mục "⚠ Dữ liệu thiết bị đang TRÙNG ở 3 nơi"). Phiên này thêm liên kết LOGIC
qua mã thiết bị chung `asset_code` (webadmin sinh ra, iot-service + property-web chỉ LƯU LẠI khi
được "ghép nối"/pair) — KHÔNG chung DB, KHÔNG FK xuyên hệ thống, đúng `ARCHITECTURE_OVERVIEW.md`.
Xem đầy đủ thiết kế + kiểm chứng phía webadmin ở `../../webadmin/PROGRESS.md` mục "Hardware Assets
thành trung tâm giám sát thiết bị" (bao gồm CẢ phần tình trạng kiểm chứng thật — sự cố hạ tầng
sandbox khiến chưa chạy được curl end-to-end, đọc kỹ mục đó trước khi coi tính năng này là hoàn tất).

### Thay đổi trong `iot-service`

- `db/migrations/002_asset_code.sql` (KHÔNG sửa `001_init.sql`): thêm cột `devices.asset_code`
  (TEXT, UNIQUE PARTIAL INDEX cho phép nhiều NULL — hầu hết thiết bị mô phỏng trong demo/dev chưa
  cần ghép nối ngay) và `devices.disconnect_count` (INTEGER NOT NULL DEFAULT 0, cộng dồn).
- `disconnect_count` được tính THẬT chứ không giả lập cứng: `src/repositories/devices.repo.ts` có
  thêm `sweepOfflineDevices(timeoutMs)` — quét `devices` đang `ONLINE` nhưng quá lâu không có
  heartbeat mới (`last_heartbeat_at < now() - timeoutMs`), chuyển `OFFLINE` + `disconnect_count += 1`
  trong 1 câu `UPDATE ... RETURNING`. Trước phiên này, iot-service KHÔNG có cơ chế nào tự chuyển
  thiết bị sang `OFFLINE` (chỉ có `POST /:id/heartbeat` báo `ONLINE`) — thiếu sót này giờ đã có, chạy
  bằng `setInterval` trong `src/index.ts` (mặc định quét mỗi 15s, ngưỡng timeout 120s), cùng mô hình
  với "timeout sweep" đã có sẵn cho `device_commands`. Chỉnh qua env `HEARTBEAT_TIMEOUT_MS` /
  `OFFLINE_SWEEP_INTERVAL_MS`.
- Route mới trong `src/routes/devices.routes.ts`:
  - `POST /devices/:id/pair` (body `{ assetCode }`) — ghép nối 1 device đã tồn tại với mã thiết bị
    do webadmin sinh ra; 409 nếu `assetCode` đã ghép với device khác.
  - `GET /devices/by-asset-code/:code` — tra cứu ngược, đặt route TRƯỚC `/:id` để không bị nuốt path.
  - `POST /devices` (tạo mới) nhận thêm field tuỳ chọn `assetCode` — ghép nối ngay lúc tạo, khỏi cần
    gọi thêm request `/pair` riêng.
  - `GET /devices` (đã có sẵn, KHÔNG đổi field cũ) trả thêm `server` ở top-level response (từ env
    `SERVICE_INSTANCE_NAME`, mặc định `iot-service-dev`) — webadmin dùng giá trị này làm
    `connected_server` khi đồng bộ. Vì `asset_code`/`disconnect_count` giờ là cột thật trong bảng
    `devices`, `SELECT *` sẵn có của `devicesRepo.list()` đã tự trả về 2 field này — KHÔNG cần sửa
    gì thêm ở tầng repo cho việc đọc.
- `src/types/domain.ts`: thêm `asset_code`/`disconnect_count` vào interface `Device`.

### Build & kiểm chứng

- `npx tsc -p tsconfig.json --noEmit` → **sạch lỗi** (đã xác nhận thật trước khi gặp sự cố hạ tầng
  sandbox, xem chi tiết ở `webadmin/PROGRESS.md`).
- **CHƯA kịp chạy thật cùng webadmin để `curl` xác nhận luồng ghép nối → đồng bộ → cập nhật
  `connection_status`** — môi trường sandbox hết dung lượng đĩa giữa chừng (`no space left on
  device`), bash tool treo hoàn toàn, không kịp khởi động `iot-service` (dự định dùng
  `@electric-sql/pglite-socket` như cách đã kiểm chứng lúc build service này ở phiên trước, vì
  `iot-service` chưa có chế độ embedded tích hợp sẵn trong server như webadmin/property-web —
  **CỐ Ý KHÔNG thêm chế độ embedded vào `iot-service` trong phiên này** để giảm diện thay đổi, chỉ
  test qua pglite-socket tạm thời khi cần). Đây là việc BẮT BUỘC phải làm ở phiên sau trước khi coi
  tính năng liên kết `asset_code` là đã kiểm chứng đầy đủ.
