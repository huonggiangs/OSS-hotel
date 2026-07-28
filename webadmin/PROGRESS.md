# Progress — webadmin (HQ Console, bản chạy được)

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
