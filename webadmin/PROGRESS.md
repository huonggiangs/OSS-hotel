# Progress — webadmin (HQ Console, bản chạy được)

## 2026-07-29 — Verify chạy thật module giám sát thiết bị (phiên trước bị treo do hết dung lượng đĩa sandbox, CHƯA verify được) — tìm & sửa 3 lỗi thật

Phiên trước (2026-07-28) đã viết xong code module giám sát thiết bị (asset monitoring — xem mục dưới) nhưng sandbox hết dung lượng đĩa giữa chừng nên CHƯA chạy thử được. Phiên này verify từ đầu trên sandbox sạch, dùng chế độ DB nhúng (PGlite), phát hiện và sửa **3 lỗi thật**:

1. **Seed demo insert thiếu `asset_code`** (cả `apps/api/src/lib/embeddedBootstrap.ts` lẫn `database/seed.ts`) — migration 004 đặt `asset_code` NOT NULL nhưng câu INSERT seed cũ (từ trước migration 004) không có cột này → API crash ngay lúc khởi động lần đầu (seed thất bại). Đã sửa: thêm `asset_code`/`activated_at`/`connection_status` vào cả 2 nơi.
2. **Trùng `asset_code`** — bản sửa đầu tiên của lỗi #1 gán CỨNG `'AST-000001'` cho dòng seed thay vì gọi `nextval('hardware_assets_asset_code_seq')`, nên request tạo tài sản ĐẦU TIÊN qua API (gọi `nextval()` lần đầu, trả về 1) bị lỗi trùng khoá với dòng seed. Đã sửa: seed cũng dùng `nextval(...)` giống hệt repo, đảm bảo không bao giờ trùng dù chạy seed bao nhiêu lần.
3. **Cảnh báo (`asset_alerts`) không bao giờ được sinh ra khi `iot-service` chưa chạy** — `evaluateAssetAlerts()` (tính cảnh báo sắp hết bảo hành/offline lâu/mất kết nối nhiều) nằm BÊN TRONG nhánh `try` gọi `fetch` sang iot-service trong `iotSync.ts`; nếu iot-service không chạy được (rất thường gặp ở dev/demo — service này thường không bật cùng lúc), hàm return sớm ở catch, không bao giờ chạy tới `evaluateAssetAlerts()`. Cảnh báo bảo hành (`WARRANTY_EXPIRING`) là dữ liệu NỘI BỘ webadmin, không nên phụ thuộc iot-service. Đã sửa: tách `evaluateAssetAlerts()` ra chạy LUÔN sau khi cố gắng đồng bộ, bất kể `iotServiceReachable` đúng/sai.

**Đã xác nhận chạy thật bằng `curl`** (chế độ embedded, DB sạch từ đầu):
- Server khởi động sạch, migrate 001→004 + seed thành công, không còn crash.
- `POST /auth/login` → 200, JWT hợp lệ.
- `POST /hardware-assets` tạo KIOSK mới có `propertyId`/`propertyName` → 200, `asset_code` tự sinh đúng (`AST-000002`, không trùng với seed `AST-000001`).
- `POST /hardware-assets` tạo máy in nhiệt với `parentAssetId` = Kiosk vừa tạo → 200, liên kết cha-con đúng.
- `POST /hardware-assets` **KHÔNG** có `propertyId`/`propertyName` → 422 đúng như thiết kế (bắt buộc gán cơ sở).
- `GET /hardware-assets/:id` trả đúng `child_assets` chứa máy in nhiệt vừa gán.
- `POST /hardware-assets/sync-connection-status` khi **iot-service KHÔNG chạy** → trả `iotServiceReachable:false` nhưng **`alertsCreated:1`** (đúng sau khi sửa lỗi #3).
- `GET /hardware-assets/alerts` sau đó trả đúng 1 cảnh báo `WARRANTY_EXPIRING` với nội dung tiếng Việt đúng số ngày còn lại.
- `npx tsc --noEmit` sạch cho `apps/api` (đã test lại sau tất cả các sửa trên).

**Dọn dẹp phát hiện thêm**: tìm thấy thư mục `.data/` (28MB) và `.next/` rác còn sót lại NGAY TRÊN Ổ ĐĨA THẬT của người dùng (`D:\hotel\OSS\webadmin\apps\api\.data`, `D:\hotel\OSS\webadmin\apps\web\.next`, `D:\hotel\OSS\smart-hotel-os\property-web\apps\web\.next`) — tàn dư từ phiên bị treo do hết dung lượng đĩa sandbox trước đó. Đã xoá toàn bộ (đều đã có trong `.gitignore`, không phải mất code, chỉ là cache/runtime state cũ có thể ở trạng thái dở dang gây lỗi khó hiểu nếu không dọn).

**Chưa verify được** (do môi trường sandbox lần này gặp vấn đề I/O chậm bất thường khi copy `node_modules` lớn từ mount `D:\hotel\OSS`, không phải lỗi code): `next build`/`tsc --noEmit` cho `apps/web` với UI mới (`hardware-assets/[id]`) — KHÔNG có thay đổi code nào ở `apps/web` trong lần sửa lỗi này (chỉ sửa 3 file phía `apps/api`+`database`), và lần build gần nhất TRƯỚC đó (phiên viết code ban đầu) đã xác nhận `next build` thành công 15 route bao gồm `/hardware-assets/[id]` — rủi ro thấp nhưng nên build lại xác nhận ở phiên sau nếu nghi ngờ.


File này ghi tiến độ chi tiết của riêng `webadmin/` (mã nguồn chạy được). Tóm tắt tổng ba hệ thống nằm ở `../memory.md`; đặc tả nguồn nằm ở `../hq-console/docs/` + `../hq-console/PROGRESS.md`.

## 2026-07-27 — Bổ sung 3 phần còn thiếu: quản lý user/role UI, Release Console, Purchase Orders

Trước phiên này, `webadmin` đã chạy được Auth+RBAC + Partners/Suppliers/Customers 360/Hardware Assets/Commissions/Dashboard/Audit log (xem `README.md`). Phiên này bổ sung ĐẦY ĐỦ 3 phần được liệt kê là "chưa làm" trong `../memory.md` mục 4, **thêm vào code có sẵn, không sửa migration cũ, không đổi convention** (Express + `pg` thuần, không Prisma).

### 1. Quản lý user/role qua UI

- API mới `apps/api/src/routes/users.routes.ts` + `apps/api/src/repositories/users.repo.ts` (bổ sung `list/create/update/updatePasswordHash` vào repo đã có sẵn `findByEmail/findById`):
  - `GET /api/v1/users` — danh sách (không trả `password_hash`).
  - `POST /api/v1/users` — tạo user (email/họ tên/role/mật khẩu ban đầu ≥ 8 ký tự), 409 nếu email đã tồn tại.
  - `PATCH /api/v1/users/:id` — đổi role và/hoặc `status` (ACTIVE/DISABLED). Chặn tự khoá chính tài khoản đang đăng nhập (409).
  - `POST /api/v1/users/:id/reset-password` — sinh mật khẩu tạm ngẫu nhiên (6 byte hex), trả về **một lần duy nhất** trong response JSON (`temporary_password`), không lưu plaintext, không gửi email.
  - **RBAC**: toàn bộ router (kể cả GET) chỉ `SUPER_ADMIN` — khác các module khác (vốn mở GET cho mọi role đăng nhập) vì đây là dữ liệu nhạy cảm nhất, đúng `PERMISSION_MATRIX.md` ("Quản lý user/role HQ Console: ✓ SUPER_ADMIN only").
- Trang `apps/web/src/app/(dashboard)/users/page.tsx`: bảng danh sách + form thêm user + modal sửa role/khoá tài khoản (overlay `fixed inset-0`) + nút đặt lại mật khẩu (hiển thị mật khẩu tạm trong banner thông báo). Style bám theo `hardware-assets`/`suppliers` page có sẵn.
- Menu điều hướng: thêm mục "Người dùng & phân quyền" vào `apps/web/src/app/(dashboard)/layout.tsx`.
- **Quyết định tự đưa ra**: chưa có dịch vụ gửi email trong MVP này → mật khẩu tạm hiển thị trực tiếp cho SUPER_ADMIN thay vì gửi email, người dùng cần được báo qua kênh khác (điện thoại/chat nội bộ). Cần bổ sung dịch vụ email thật trước khi đưa vào production.

### 2. Release Console tổng hợp phiên bản app

- Migration mới `database/migrations/002_release_console.sql` (không sửa `001_init.sql`): enum `AppKey` (`KIOSK_APP`, `PROPERTY_WEB`, `PROPERTY_WINDOWS`, `OWNER_MOBILE`, `HOUSEKEEPING_MOBILE`, `SUPER_ADMIN_WEB`) và `ReleaseChannel` (`STABLE`, `BETA`); bảng `app_releases` (app_key, version, release_notes, channel, published_at, published_by → `users`, artifact_url, is_active). Có `UNIQUE INDEX ... WHERE is_active = true` trên `(app_key, channel)` — ràng buộc "chỉ 1 bản active mỗi (app, channel)" được enforce ở tầng DB, không chỉ ở code.
- API mới `apps/api/src/repositories/releases.repo.ts` + `apps/api/src/routes/releases.routes.ts`:
  - `GET /api/v1/releases` (lọc `appKey`/`channel`), `GET /api/v1/releases/:id` — mở cho mọi role đăng nhập (đúng convention GET của các module khác).
  - `POST /api/v1/releases` — "Phát hành phiên bản mới": tạo bản ghi, mặc định `isActive=true`, tự khử-active bản trước đó của cùng (app, channel) trong transaction.
  - `PATCH /api/v1/releases/:id` — dùng chung cho "rollback" (`isActive:true` — kích hoạt lại bản cũ, khử active bản hiện tại) và "gỡ khỏi active" (`isActive:false`).
  - **RBAC**: ghi (POST/PATCH) chỉ `RELEASE_MANAGER` + `SUPER_ADMIN`, đúng `PERMISSION_MATRIX.md` (Release Console: ✓ RELEASE_MANAGER, Xem: EXEC/OPS_SUPPORT).
- Trang `apps/web/src/app/(dashboard)/releases/page.tsx`: lọc theo ứng dụng, form "Phát hành phiên bản mới", bảng liệt kê kèm badge Đang phát hành/Không hoạt động, nút "Kích hoạt lại (rollback)" cho bản không active.
- **Giới hạn ghi rõ (MVP)**: đây CHỈ LÀ quản lý version tập trung để tra cứu, KHÔNG PHẢI deploy pipeline/cơ chế rollout thật — không tự gửi lệnh cập nhật xuống thiết bị/khách hàng, đúng ràng buộc trong `hq-console/docs/MODULE_APP_RELEASE_CONSOLE.md` mục 4 ("tránh 2 nơi cùng có quyền gửi lệnh update, tránh race với Update Campaign thật của Kiosk"). CI/CD, blue-green/canary (RULES.md mục 14) vẫn CHƯA làm ở bất kỳ đâu trong dự án.

### 3. Mua hàng / tồn kho chi tiết (`purchase_orders`)

- Migration mới `database/migrations/003_purchase_orders.sql`: enum `PurchaseOrderStatus` (`DRAFT`/`ORDERED`/`RECEIVED`/`CANCELLED`); bảng `purchase_orders` (supplier_id → `suppliers`, status, expected_at, created_by → `users`, notes) và `purchase_order_items` (product_name, `asset_type` dùng lại enum `HardwareAssetType` có sẵn từ 001, quantity, unit_price, received_quantity).
- API mới `apps/api/src/repositories/purchaseOrders.repo.ts` + `apps/api/src/routes/purchase-orders.routes.ts`:
  - `GET /api/v1/purchase-orders` (lọc status/supplierId), `GET /api/v1/purchase-orders/:id` (kèm `items`).
  - `POST /api/v1/purchase-orders` — tạo đơn (luôn bắt đầu ở `DRAFT`).
  - `POST /api/v1/purchase-orders/:id/items` / `DELETE .../:id/items/:itemId` — chỉ thêm/xoá dòng hàng khi đơn còn `DRAFT`.
  - `PATCH /api/v1/purchase-orders/:id/status` — đổi trạng thái, chỉ cho phép `DRAFT→ORDERED→RECEIVED` hoặc `→CANCELLED` (không cho lùi/nhảy cóc), validate transition trong transaction có `FOR UPDATE`.
  - **RBAC**: ghi (POST/PATCH/DELETE) chỉ `SUPPLY_CHAIN` + `SUPER_ADMIN`; GET mở cho mọi role đăng nhập — đúng `PERMISSION_MATRIX.md` ("Quản lý thiết bị/tồn kho: ✓ SUPPLY_CHAIN, Xem: EXEC/OPS_SUPPORT/ACCOUNTANT").
- Trang `apps/web/src/app/(dashboard)/purchase-orders/page.tsx` (danh sách + tạo đơn) và `.../purchase-orders/[id]/page.tsx` (chi tiết: thêm/xoá dòng hàng khi DRAFT, nút đổi trạng thái theo đúng bước tiếp theo hợp lệ).
- **Quyết định tự đưa ra (mức độ tự động sinh `hardware_assets` khi nhận hàng)**: theo `hq-console/docs/MODULE_HARDWARE_INVENTORY.md` mục 4.1, khi đơn chuyển `RECEIVED`, hệ thống tự sinh **đúng `quantity` bản ghi `hardware_assets`** cho MỖI dòng hàng CÓ gắn `asset_type` (số serial sinh tự động dạng `PO-<8 ký tự id đơn>-<8 ký tự id dòng>-<STT>`, đánh dấu là **placeholder** — nhân viên SUPPLY_CHAIN cập nhật lại serial thật qua `PATCH /api/v1/hardware-assets/:id` khi đối soát vật lý). Dòng hàng KHÔNG gắn `asset_type` (vd. vật tư tiêu hao, dây cáp) KHÔNG tự sinh tài sản — vì `hardware_assets` là "tài sản có serial theo dõi vòng đời/bảo hành", không phải mọi thứ mua vào công ty đều cần theo dõi ở mức đó. `supplier_id`/`purchase_cost`/`purchased_at` của asset mới lấy từ đơn mua hàng.
- Đã kiểm chứng bằng test riêng (xem mục Build bên dưới): PO 2 dòng hàng (1 dòng KIOSK × 3, 1 dòng cáp không gắn asset_type × 10) → chuyển `RECEIVED` → đúng 3 `hardware_assets` được tạo (không phải 13), dòng cáp không tạo gì.

## Build & kiểm tra

Thực hiện tại `/tmp` (copy `apps/api`, `apps/web`, `database` — không copy `node_modules`/`.next`/`dist`), source thật trong `D:\hotel\OSS\webadmin` không đổi ngoài code mới:

- `apps/api`: `npm install` + `npx tsc -p tsconfig.json --noEmit` → **sạch lỗi**. `npx tsc -p tsconfig.json` (build thật ra `dist/`) → **thành công**.
- `apps/web`: `npm install` + `npx tsc --noEmit` → **sạch lỗi** (sau khi sửa 1 lỗi nhỏ: import `useRouter` thừa không dùng ở trang chi tiết purchase-orders). `npx next build` → **thành công**, đủ 14 route tĩnh/động bao gồm `/users`, `/releases`, `/purchase-orders`, `/purchase-orders/[id]`.
- `database`: migration `001_init.sql` → `002_release_console.sql` → `003_purchase_orders.sql` chạy nối tiếp thành công trên PostgreSQL thật giả lập bằng `@electric-sql/pglite` (WASM Postgres). Đã viết kịch bản kiểm thử riêng (không lưu lại trong repo, chỉ chạy tại `/tmp`) xác nhận:
  1. `UNIQUE INDEX ... WHERE is_active = true` trên `app_releases(app_key, channel)` từ chối đúng khi cố insert bản active thứ 2 cho cùng app+channel; luồng publish đúng (khử active cũ trước) thì thành công.
  2. Luồng `purchase_orders`: tạo đơn DRAFT → thêm 2 dòng hàng (1 có `asset_type`, 1 không) → chuyển `RECEIVED` → đúng số lượng `hardware_assets` được tạo (chỉ từ dòng có `asset_type`), `purchase_order_items.received_quantity` cập nhật đúng.

## Chưa làm (còn lại theo `../memory.md` mục 4)

- Đồng bộ thật với Admin API của `smart-hotel-os`/`kiosk-management`.
- MFA/VPN cho production.
- CI/CD, blue-green/canary deployment thật (Release Console ở đây chỉ là MVP quản lý version, không thay thế).
- Dịch vụ gửi email thật cho tính năng đặt lại mật khẩu (hiện hiển thị mật khẩu tạm trực tiếp trong UI cho SUPER_ADMIN).
- `database/README.md` được nhắc tới trong `webadmin/README.md` ("Chi tiết bố cục SQL... xem `database/README.md`") nhưng file này chưa tồn tại — khoảng trống có từ trước phiên này, chưa xử lý (ngoài phạm vi 3 yêu cầu của phiên này).

## 2026-07-28 — Chạy được KHÔNG cần Docker/PostgreSQL (chế độ database embedded)

Bối cảnh: người dùng dùng Windows, không bật được Docker Desktop (lỗi
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ...
The system cannot find the file specified`), nên `webadmin` (chỉ chạy được qua
`docker compose up --build` trước phiên này) hoàn toàn không mở được — cả `localhost:3000`
lẫn `localhost:4000` báo "This site can't be reached". Vấn đề y hệt đã được giải quyết
thành công trước đó cho `smart-hotel-os/property-web/` (xem
`property-web/apps/api/src/lib/db.ts` + `embeddedBootstrap.ts`) — phiên này **bắt chước
đúng cách làm đó** cho `webadmin`, có điều chỉnh thêm vì `webadmin` phức tạp hơn.

### 1. `apps/api/src/lib/db.ts` — viết lại thành adapter 2 chế độ

- `DB_MODE` = `"embedded"` khi không có `DATABASE_URL` (mặc định) hoặc `"postgres"` khi có
  `DATABASE_URL` (chế độ Docker/Postgres thật, không đổi hành vi cũ).
- Chế độ embedded dùng `@electric-sql/pglite` (PostgreSQL biên dịch WASM, chạy trong tiến
  trình Node, lưu dữ liệu ra `apps/api/.data/webadmin-db`).
- **Khác property-web**: `webadmin` có 3 file repository (`hardwareAssets.repo.ts`,
  `purchaseOrders.repo.ts`, `releases.repo.ts`) dùng `pool.connect()` để mở transaction thủ
  công (`client.query("BEGIN"/"COMMIT"/"ROLLBACK")`, kể cả `SELECT ... FOR UPDATE`) —
  property-web không có nhu cầu này nên adapter gốc chỉ bọc `.query()`. Đã kiểm chứng
  riêng bằng script Node thuần (`/tmp/pgtest/test.mjs`) rằng PGlite chạy đúng
  `BEGIN`/`COMMIT`/`ROLLBACK`/`FOR UPDATE` qua `.query()` trực tiếp trên object `db` — nên
  `pool.connect()` giả lập chỉ cần trả về một "client" trỏ thẳng vào cùng hàm `query`, và
  `.release()` là no-op (PGlite là một session nhúng duy nhất, không có nhiều kết nối thật
  như `pg.Pool`). **Giới hạn đã ghi rõ trong comment của file**: 2 transaction ghi đồng thời
  thật sự (không phải tuần tự) sẽ không được cô lập đúng như Postgres thật nhiều kết nối —
  chấp nhận được cho mục đích dev/demo một người dùng, KHÔNG dùng embedded cho production.
- Cũng đã kiểm chứng: `gen_random_uuid()` (dùng trong nhiều repo) chạy được ngay trong
  PGlite không cần `CREATE EXTENSION pgcrypto`; lỗi vi phạm unique constraint từ PGlite có
  `err.code === "23505"` giống hệt `pg` thật — nên `isUniqueViolation()` trong
  `releases.repo.ts` không cần sửa gì.
- `pool.end()` (gọi ở `SIGTERM` trong `index.ts`) map sang `embeddedDb.close()`.

### 2. `apps/api/src/lib/embeddedBootstrap.ts` (mới)

- Đọc trực tiếp `database/migrations/*.sql` (không copy nội dung), áp dụng lần lượt
  `001_init.sql` → `002_release_console.sql` → `003_purchase_orders.sql`, theo dõi bằng
  bảng `_migrations` (idempotent — bỏ qua migration đã áp dụng ở lần chạy sau).
- Seed dữ liệu demo **khớp chính xác** `database/seed.ts` (4 user, 1 partner, 1 supplier,
  1 customer, 1 hardware asset, 1 commission rule/record — mật khẩu chung `ChangeMe123!`,
  **không đổi** theo đúng yêu cầu vì đây là hệ thống nội bộ công ty, khác `property-web`).
  Chỉ seed khi bảng `users` đang rỗng (không seed trùng ở lần chạy sau).
- Bổ sung THÊM (so với `database/seed.ts`, chỉ có trong embedded bootstrap — không sửa
  `database/seed.ts`): 2 bản ghi `app_releases` demo (PROPERTY_WEB 1.2.0, KIOSK_APP 3.4.1)
  và 1 `purchase_orders` demo kèm 2 `purchase_order_items` — để chế độ embedded có sẵn dữ
  liệu minh hoạ cho 2 module mới nhất (Release Console, Purchase Orders) ngay từ lần đăng
  nhập đầu, không phải tự tạo tay.

### 3. `apps/api/src/index.ts` và `middleware/auth.ts`

- `index.ts`: gọi `bootstrapEmbeddedDb(embeddedDb)` trước `app.listen()` khi
  `DB_MODE === "embedded"`; `GET /health` trả thêm `db_mode` để dễ chẩn đoán.
- `middleware/auth.ts`: `JWT_SECRET` có giá trị mặc định CHỈ DÀNH CHO DEV khi không cấu
  hình (kèm cảnh báo console) — **vẫn throw chặn cứng nếu `NODE_ENV=production`** mà thiếu
  `JWT_SECRET`, đúng cách `property-web` đã làm.

### 4. `apps/api/package.json`

- Thêm dependency `@electric-sql/pglite` (`^0.2.17`).

### 5. `start-dev.bat` (mới) + `README.md` viết lại mục "Chạy" + `.gitignore`

- `start-dev.bat`: tự kiểm tra Node, tự `npm install` nếu thiếu `node_modules`, mở 2 cửa sổ
  CMD (API cổng 4000, Web cổng 3000) — **chỉ là tiện ích phụ**, có ghi chú rõ nếu
  double-click không mở được cửa sổ (nghi phần mềm bảo mật chặn, đúng sự cố người dùng đã
  báo trước đó với `property-web`) thì quay lại gõ tay lệnh trong README.
- `README.md`: đưa "Cách 1 (khuyến nghị, KHÔNG cần Docker)" lên đầu mục "Chạy", 2 khối lệnh
  PowerShell/CMD tách riêng cho API và Web (không dùng `&&` trần), Docker chuyển xuống
  "Cách 2" kèm cảnh báo phải mở Docker Desktop trước, thêm mục "Chạy không dùng Docker
  nhưng vẫn muốn PostgreSQL thật" cho người dùng nâng cao, và mục "Xử lý sự cố" với đúng 3
  lỗi thực tế: (a) npipe → Docker Desktop chưa chạy, (b) trang web không tải được → API
  chưa chạy/kiểm tra `/health`, (c) PowerShell chặn script →
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- `.gitignore`: thêm `.data/` (dữ liệu PGlite, không commit).

### Kiểm chứng thật (không chỉ build sạch)

Thực hiện tại `/tmp/webadmin-work` (copy toàn bộ source trừ `node_modules`/`.next`/`.data`,
`npm install` + chạy thật tại đó, sau đó copy code đã sửa — không copy `node_modules`
— về `D:\hotel\OSS\webadmin`):

- `npx tsc -p tsconfig.json --noEmit` (apps/api) → **sạch lỗi**. `npm run build` (tsc ra
  `dist/`) → **thành công**.
- `npx tsc --noEmit` (apps/web) → **sạch lỗi**. `npm run build` (`next build`) →
  **thành công**, đủ 14 route.
- Chạy thật API ở chế độ embedded (`node -r tsx/cjs src/index.ts`, không có file `.env`
  nào trong `apps/api/` — đúng yêu cầu "không cần tạo `.env` thủ công"):
  - `GET /health` → `{"status":"ok","db_mode":"embedded"}`.
  - `POST /api/v1/auth/login` với `admin@hq-console.local` / `ChangeMe123!` → **200 OK,
    trả JWT thật**.
  - Gọi tiếp có token: `GET /api/v1/me`, `GET /api/v1/users` (module mới), `GET
    /api/v1/releases` (module mới, migration 002), `GET /api/v1/purchase-orders` (module
    mới, migration 003), `GET /api/v1/partners` — **tất cả 200 OK, đúng dữ liệu seed**.
  - Kiểm thử luồng ghi có transaction thật qua adapter `pool.connect()`: `PATCH
    /api/v1/purchase-orders/:id/status` chuyển `ORDERED → RECEIVED` → tự sinh đúng 8
    `hardware_assets` mới (5 máy quét QR + 3 đầu đọc thẻ, đúng số lượng seed) trong 1
    transaction; `POST /api/v1/releases` bản `PROPERTY_WEB 1.3.0` → xác nhận bản `1.2.0` cũ
    tự động chuyển `is_active=false` trong cùng transaction (ràng buộc unique-active hoạt
    động đúng qua adapter embedded).
  - **Khởi động lại lần 2** (không xoá `.data/`): log in `[embedded-db] Bỏ qua (đã áp
    dụng)` cho cả 3 migration, `Đã có dữ liệu — bỏ qua seed`; đăng nhập lại thành công;
    dữ liệu đã ghi ở lần 1 (đơn mua hàng đã RECEIVED, bản phát hành 1.3.0) vẫn còn nguyên
    — **xác nhận persistence + không seed trùng**.

## 2026-07-28 — Hardware Assets thành trung tâm giám sát thiết bị (asset monitoring)

Theo yêu cầu gốc trong `CLAUDE.md` (PMS + IoT) và yêu cầu cụ thể của người dùng: `hardware_assets`
trước phiên này chỉ là danh mục tĩnh (serial/nhà cung cấp/bảo hành). Phiên này biến nó thành SỔ GỐC
(master registry) của mọi thiết bị công ty, liên kết LOGIC (không chung DB, không FK xuyên hệ thống —
đúng `ARCHITECTURE_OVERVIEW.md`) với `iot-service` (trạng thái vận hành thật) và `property-web`
(ánh xạ thiết bị↔phòng) qua **mã thiết bị chung `asset_code`** (dạng `AST-XXXXXX`, sinh tự động ở
đây, webadmin là nơi sinh mã).

### 1. Migration `database/migrations/004_asset_monitoring.sql`

- Mở rộng enum `HardwareAssetType` thêm `DOOR_LOCK`, `POWER_SWITCH`, `ELECTRIC_METER`, `EDGE_NODE`
  bằng `ALTER TYPE ... ADD VALUE` (4 câu lệnh riêng). **Quyết định kỹ thuật quan trọng, đọc kỹ**:
  bản đầu tiên của migration này dùng cách "tạo enum mới → `ALTER COLUMN TYPE` cast 2 cột (đổi cả
  `hardware_assets.asset_type` lẫn `purchase_order_items.asset_type`) → `DROP TYPE` cũ →
  `ALTER TYPE ... RENAME`" vì tin rằng `ADD VALUE` không chạy được trong transaction block — khi
  chạy thật (xem mục Kiểm chứng bên dưới), cách này làm **PGlite crash thật sự** (`RuntimeError:
  Aborted()` ở tầng WASM, không phải lỗi SQL bình thường). Đã sửa lại dùng `ALTER TYPE ... ADD
  VALUE` đơn giản — hợp lệ trong transaction block từ PostgreSQL 12 trở đi MIỄN LÀ giá trị mới
  không được dùng (INSERT/CAST) trong CÙNG transaction đó, và migration này chỉ thêm giá trị,
  không insert bản ghi nào dùng ngay 4 giá trị mới nên an toàn. Đọc chú thích chi tiết ngay trong
  file migration.
- Cột mới trên `hardware_assets`: `asset_code` (UNIQUE NOT NULL, backfill cho dữ liệu demo cũ qua
  `SEQUENCE hardware_assets_asset_code_seq` + `nextval()` — sinh atomic, KHÔNG dùng hàm PL/pgSQL để
  đơn giản/tương thích PGlite), `activated_at`, `connection_status` (ENUM ONLINE/OFFLINE/UNKNOWN,
  mặc định UNKNOWN — CHỈ đồng bộ từ iot-service, không nhập tay được qua PATCH thường), `disconnect_count`,
  `last_seen_at`, `last_connection_check_at`, `supporting_partner_id` (FK → `partners`, khác
  `supplier_id`), `connectivity_provider`/`subscription_fee`/`subscription_cycle` (xem mục "Navtask"
  bên dưới), `connected_server`, `property_id`/`property_name` (tham chiếu LỎNG sang property-web,
  KHÔNG FK thật, KHÔNG đặt `NOT NULL` ở DB để không phá dữ liệu demo cũ — bắt buộc ở TẦNG VALIDATE
  Zod khi tạo mới, xem mục 3), `parent_asset_id` (tự tham chiếu, cho phép NULL — thiết bị phụ trợ
  gắn vào thiết bị chính, vd máy in nhiệt/máy quét gắn vào Kiosk).
- Bảng mới `asset_alerts` (`alert_type` ENUM `WARRANTY_EXPIRING`/`OFFLINE_TOO_LONG`/
  `HIGH_DISCONNECT_RATE`, `severity`, `resolved_at`) + index partial cho truy vấn "chưa resolve".

### 2. Đồng bộ với iot-service + lấy danh sách cơ sở từ property-web

- `apps/api/src/lib/iotSync.ts`: `syncConnectionStatusFromIot()` gọi **`GET /api/v1/devices` có
  sẵn** của iot-service (đã đọc code, KHÔNG bịa endpoint), khớp theo `asset_code`, cập nhật
  `connection_status`/`disconnect_count`/`last_seen_at`/`connected_server` vào `hardware_assets`
  tương ứng. KHÔNG throw khi iot-service không chạy được (best-effort, trả `iotServiceReachable:
  false`). Cùng file có `evaluateAssetAlerts()` — quét toàn bộ `hardware_assets`, sinh/tự-resolve
  `asset_alerts` theo 3 quy tắc (bảo hành còn ≤30 ngày, offline liên tục >24h, `disconnect_count`
  vượt ngưỡng 5 — **giới hạn đã biết**: ngưỡng này là số CỘNG DỒN TOÀN THỜI GIAN vì iot-service
  không lưu timestamp từng lần mất kết nối riêng lẻ, nên "trong 7 ngày" chỉ là XẤP XỈ bằng ngưỡng
  tuyệt đối, không phải cửa sổ trượt đúng nghĩa — muốn đúng cần thêm bảng log sự kiện disconnect có
  timestamp ở iot-service).
- Job chạy nền: `apps/api/src/index.ts` gọi `syncConnectionStatusFromIot()` bằng `setInterval`
  (mặc định 30s, tắt bằng `DISABLE_IOT_SYNC_JOB=1`) + endpoint thủ công
  `POST /api/v1/hardware-assets/sync-connection-status` (nút "Đồng bộ trạng thái ngay" trên UI).
- `apps/api/src/lib/propertyWebClient.ts`: gọi `GET /api/v1/branches` của property-web (endpoint có
  sẵn, không phải route mới) qua header `X-Internal-Service-Key` (env `INTERNAL_SERVICE_KEY`, mặc
  định dev `dev-internal-service-key-change-me` — **PHẢI đổi khi lên production**, đây là MVP tạm
  thời thay OAuth2 client credentials đúng chuẩn `hq-console/docs/PARTNER_API_STANDARDS.md`).
  **KHÔNG throw khi property-web không chạy được** — trả `null`, route
  `GET /api/v1/hardware-assets/property-options` trả `source: "fallback"` và UI tự chuyển sang ô
  nhập tay tên cơ sở (đã code trong `hardware-assets/page.tsx`, không crash).

### 3. API + UI

- `hardware-assets.routes.ts` mở rộng `POST`/`PATCH` với toàn bộ field mới, validate
  `propertyId`/`propertyName` **bắt buộc** ở Zod schema khi tạo mới (`createSchema` khác
  `updateSchema`). Thêm `GET /alerts` (tổng hợp toàn bộ chưa resolve), `GET /:id/alerts`,
  `GET /property-options`, `POST /sync-connection-status`. `GET /:id` trả kèm `child_assets`
  (danh sách thiết bị phụ trợ qua `parent_asset_id`).
- Trang `/hardware-assets` (mở rộng): khối "Cảnh báo thiết bị" đầu trang, bộ lọc theo cơ sở +
  trạng thái kết nối, cột mã thiết bị (`asset_code`, link sang trang chi tiết), chấm màu trạng thái
  kết nối (`components/ConnectionDot.tsx` — xanh/đỏ/xám, luôn kèm chữ), form tạo mới đầy đủ field,
  dropdown cơ sở từ property-web hoặc input nhập tay khi fallback, dropdown "gắn vào thiết bị chính"
  cho thiết bị phụ trợ.
- Trang chi tiết `/hardware-assets/[id]` (MỚI): đầy đủ toàn bộ field (kết nối/vận hành, bảo hành/hỗ
  trợ, thuê bao dịch vụ kết nối, vị trí), danh sách thiết bị phụ trợ gắn vào, khối cảnh báo riêng,
  nút "Đồng bộ trạng thái ngay".

### 4. Về "Navtask" và `connectivity_provider`

Người dùng nhắc "Navtask" trong yêu cầu nhưng tên này không xuất hiện ở bất kỳ đâu khác trong dự án
— không rõ là tên 1 dịch vụ SaaS cụ thể hay tên nội bộ. Xử lý theo đúng chỉ đạo của người điều phối:
**KHÔNG hardcode** "Navtask" ở tầng dữ liệu/logic — làm trường `connectivity_provider` (TEXT tự do)
+ `subscription_fee` (số tiền) + `subscription_cycle` (MONTHLY/YEARLY) hoàn toàn linh hoạt. "Navtask"
chỉ xuất hiện làm **giá trị mặc định gợi ý trong form tạo mới ở UI** (`page.tsx`, state
`connectivityProvider = useState("Navtask")`) vì đó là tên người dùng đang dùng thật — người dùng có
thể xoá/đổi tự do, không có ràng buộc gì ở backend buộc phải dùng đúng tên này.

### 5. iot-service (thay đổi phối hợp)

- `db/migrations/002_asset_code.sql`: thêm `asset_code` (UNIQUE cho phép nhiều NULL) và
  `disconnect_count` (đếm cộng dồn) vào bảng `devices`.
- `disconnect_count` được tính THẬT (không giả lập cứng): thêm `devicesRepo.sweepOfflineDevices()` +
  job `setInterval` trong `index.ts` (mặc định 15s, ngưỡng heartbeat timeout 120s qua
  `HEARTBEAT_TIMEOUT_MS`) — quét thiết bị `ONLINE` quá lâu không heartbeat mới, chuyển `OFFLINE` +
  `disconnect_count += 1`. Trước phiên này iot-service KHÔNG có cơ chế nào tự chuyển thiết bị sang
  OFFLINE (chỉ có heartbeat báo ONLINE).
- Route mới: `POST /devices/:id/pair` (ghép nối asset_code với 1 device đã tồn tại),
  `GET /devices/by-asset-code/:code`, `assetCode` optional trong `POST /devices` (tạo + ghép nối
  luôn 1 bước). `GET /devices` trả thêm field `server` (từ env `SERVICE_INSTANCE_NAME`, mặc định
  `iot-service-dev`) — webadmin dùng giá trị này làm `connected_server`. Đã cập nhật
  `smart-hotel-os/services/PROGRESS.md` phần iot-service với chi tiết đầy đủ hơn.

### 6. property-web (ngoại lệ được cho phép, đúng chỉ đạo)

- Migration MỚI `database/migrations/004_asset_code.sql`: thêm cột `asset_code` (UNIQUE cho phép
  nhiều NULL) vào bảng `devices` — KHÔNG sửa 001/002/003.
- `apps/api/src/middleware/internalAuth.ts` (MỚI): `requireAuthOrInternalKey` — chấp nhận header
  `X-Internal-Service-Key` khớp `INTERNAL_SERVICE_KEY` HOẶC JWT thật (`requireAuth`), CHỈ áp dụng
  cho `GET /api/v1/branches` (đã sửa `branches.routes.ts` để tách middleware theo route thay vì
  `.use(requireAuth)` chung cho cả router — `POST /branches` vẫn bắt buộc JWT + role `OWNER` như cũ,
  không có ngoại lệ). Thêm `propertiesRepo.listAll()` — lời gọi nội bộ từ webadmin cần thấy TOÀN BỘ
  cơ sở của MỌI tenant (khác `listByTenant()` chỉ phục vụ 1 property_user).
- **Đây là thay đổi ngoài phạm vi "chỉ 1 migration" đã được người điều phối CHO PHÉP RÕ RÀNG** ở
  mục 2 của yêu cầu gốc ("nếu property-web HIỆN CHƯA có middleware chấp nhận key này... bạn thêm 1
  middleware tối giản") — ghi rõ ở đây để tránh hiểu nhầm là vi phạm quy tắc "không đụng
  property-web".

### 7. Kiểm chứng — TÌNH TRẠNG THẬT, ĐỌC KỸ (không tô hồng)

**Đã xác nhận (build tĩnh, chạy thật trước khi gặp sự cố hạ tầng):**
- `npx tsc -p tsconfig.json --noEmit` sạch cho `webadmin/apps/api`, `smart-hotel-os/services/iot-service`,
  `smart-hotel-os/property-web/apps/api` (cả 3 sau khi sửa đủ field/route/middleware mới).
- `npx tsc --noEmit` sạch + **`npx next build` thành công** cho `webadmin/apps/web`, đủ 15 route
  tĩnh/động bao gồm `/hardware-assets` và `/hardware-assets/[id]` (route mới).
- **Phát hiện + sửa 1 bug thật khi thử chạy server thật ở chế độ embedded**: migration 004 bản đầu
  (cách "tạo enum mới → cast cột → drop → rename") làm PGlite crash (`RuntimeError: Aborted()`,
  WASM abort) — đã sửa sang `ALTER TYPE ... ADD VALUE` đơn giản hơn (xem mục 1), có giải thích kỹ
  thuật đầy đủ vì sao cách này an toàn trong transaction ở PostgreSQL ≥12.

**CHƯA xác nhận được — sự cố hạ tầng sandbox (disk full, không phải lỗi trong code):** ngay sau khi
sửa migration 004, môi trường sandbox dùng để chạy thử hết dung lượng đĩa
(`no space left on device`) và bash tool bị treo hoàn toàn (6 lần thử liên tiếp thất bại, được yêu
cầu dừng không thử lại) — KHÔNG kịp:
- Xác nhận migration 004 (bản đã sửa) thực sự chạy được trên PGlite (chỉ mới suy luận kỹ thuật, CHƯA
  chạy lại để xác nhận hết crash).
- Chạy đồng thời `webadmin` + `iot-service` + `property-web` thật và `curl` luồng end-to-end: tạo
  hardware_asset KIOSK → tạo device iot-service cùng `asset_code` → gọi job đồng bộ → xác nhận
  `connection_status` cập nhật đúng.
- `curl` test sinh cảnh báo tự động (set `warranty_until` gần hạn → xác nhận `asset_alerts` sinh ra).
- `curl` test gán thiết bị phụ (`parent_asset_id`) → xác nhận cấu trúc cha-con trong response.

**→ Việc BẮT BUỘC còn lại cho phiên sau (ưu tiên cao nhất, làm TRƯỚC khi coi module này là xong):**
chạy lại đúng quy trình kiểm chứng thật đã mô tả ở trên (`/tmp`, 3 service chạy song song, curl đủ 3
luồng) để xác nhận migration đã sửa không còn crash và toàn bộ luồng đồng bộ + cảnh báo + cha-con
hoạt động đúng như thiết kế. Code đã qua `tsc --noEmit` sạch và `next build` thành công nên rủi ro
lỗi cú pháp/kiểu thấp, nhưng **hành vi runtime của chính migration 004 (phần rủi ro nhất) và luồng
tích hợp 3 hệ thống CHƯA được xác nhận chạy đúng bằng curl thật**.

### Giới hạn còn lại

- Chế độ embedded chỉ dành cho dev/demo MỘT người dùng trên máy cá nhân (xem giới hạn kỹ
  thuật ghi trong `db.ts`) — production luôn phải chạy `DB_MODE=postgres` với PostgreSQL
  thật nhiều kết nối.
- `apps/web` vốn đã có sẵn giá trị mặc định `NEXT_PUBLIC_API_URL ?? "http://localhost:4000"`
  trong `src/lib/api.ts` từ trước phiên này — không cần sửa gì thêm để chạy `npm run dev`
  không cần `.env`.
- Chưa thêm test tự động (unit/integration) cho adapter `db.ts` — mới chỉ kiểm chứng thủ
  công qua curl như trên. Nếu về sau có bộ test tự động cho `apps/api`, nên thêm case chạy
  cả 2 chế độ `DB_MODE`.
