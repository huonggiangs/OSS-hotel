# webadmin — HQ Console (bản chạy được)

Đây là bản triển khai thực tế (runnable) của **HQ Console** — trang quản trị nội bộ toàn công ty đã được đặc tả tại `../hq-console/` (PRD, kiến trúc, module spec, permission matrix). Toàn bộ code, SQL, cấu hình chạy của HQ Console nằm gọn trong thư mục `webadmin/` này để tránh xung đột với tài liệu đặc tả (`../hq-console/docs/`) và với hai sản phẩm khác (`../kiosk-management` qua `kiosk.md`, `../smart-hotel-os/`).

Không có gì ở `../hq-console/`, `../smart-hotel-os/`, `../kiosk.md` bị chỉnh sửa/di chuyển khi tạo thư mục này — `webadmin/` là mã nguồn mới, độc lập, chỉ tham chiếu tới các tài liệu đó.

## Quan hệ với các thư mục khác trong dự án

| Thư mục | Vai trò |
|---|---|
| `../hq-console/docs/` | Đặc tả (PRD, kiến trúc, module, permission matrix) — đọc trước khi sửa code ở đây |
| `../smart-hotel-os/` | Sản phẩm PMS SaaS bán cho khách sạn — **tách biệt**, webadmin chỉ gọi Admin API của nó, không chung DB |
| `../kiosk.md` | Đặc tả sản phẩm Kiosk Remote Management — **tách biệt**, tương tự |
| `../RULES.md` | Nguyên tắc kiến trúc phân tán bắt buộc — xem `RULES_COMPLIANCE.md` để biết webadmin tuân thủ ra sao |
| `../ARCHITECTURE_OVERVIEW.md` | Sơ đồ tổng quan cả 3 hệ thống |

## Chạy được KHÔNG cần Docker/PostgreSQL

`apps/api` hỗ trợ chế độ database **embedded** (`@electric-sql/pglite` — PostgreSQL biên dịch
sang WASM, chạy thẳng trong tiến trình Node, lưu dữ liệu ra thư mục file `apps/api/.data/`).
Đây là chế độ **mặc định** (tự bật khi không có biến môi trường `DATABASE_URL`) — không cần
cài Docker, không cần cài PostgreSQL, **không cần tạo file `.env` thủ công**. Lần đầu chạy,
API tự tạo schema (chạy hết 4 file trong `database/migrations/`: `001_init.sql`,
`002_release_console.sql`, `003_purchase_orders.sql`, `004_asset_monitoring.sql`) và tự seed
dữ liệu demo — chỉ cần `npm run dev` là có ngay dữ liệu để đăng nhập.

Dùng cách này nếu Docker Desktop trên máy bạn không bật được (vd. lỗi
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ...
The system cannot find the file specified`) — xem mục "Xử lý sự cố" bên dưới.

### Cách 1 (khuyến nghị, KHÔNG cần Docker)

Mở **2 cửa sổ terminal riêng** (1 chạy API, 1 chạy Web) — không dùng `&&` trần vì không
chạy được trực tiếp trong CMD/PowerShell.

**PowerShell — cửa sổ 1 (API, cổng 4000):**

```powershell
Set-Location D:\hotel\OSS\webadmin\apps\api
npm install
npm run dev
```

**PowerShell — cửa sổ 2 (Web, cổng 3000):**

```powershell
Set-Location D:\hotel\OSS\webadmin\apps\web
npm install
npm run dev
```

**CMD (Command Prompt) — cửa sổ 1 (API):**

```bat
cd /d D:\hotel\OSS\webadmin\apps\api
npm install
npm run dev
```

**CMD (Command Prompt) — cửa sổ 2 (Web):**

```bat
cd /d D:\hotel\OSS\webadmin\apps\web
npm install
npm run dev
```

Sau khi cả 2 cửa sổ đều chạy (giữ nguyên, không đóng):

- Web: http://localhost:3000
- API: http://localhost:4000 (health check: mở http://localhost:4000/health, phải thấy
  `{"status":"ok","db_mode":"embedded"}`)
- Đăng nhập demo: xem bảng "Vai trò demo" bên dưới, mật khẩu chung `ChangeMe123!`

Có thể thử double-click `webadmin\start-dev.bat` để tự động hoá 2 bước trên (tự kiểm tra
Node, tự `npm install`, tự mở 2 cửa sổ) — **nhưng nếu double-click không mở được cửa sổ
nào** (thường do phần mềm bảo mật/EDR trên máy chặn chạy script), đừng cố sửa file `.bat`
— hãy quay lại gõ tay 2 khối lệnh PowerShell/CMD phía trên, đó mới là đường chính.

Tắt (Ctrl+C) rồi chạy lại `npm run dev` bất cứ lúc nào — dữ liệu embedded được lưu ở
`apps/api/.data/`, không mất khi tắt/mở lại, và API sẽ KHÔNG seed lại lần hai (kiểm tra
bảng `users` đã có dữ liệu trước khi seed).

### Cách 2 (nếu có Docker Desktop đang chạy tốt)

Yêu cầu: đã cài Docker Desktop (bao gồm Docker Compose) và **đã mở Docker Desktop, đợi
biểu tượng con cá voi ở khay hệ thống hết xoay** (chạy ổn định) trước khi gõ lệnh dưới
đây — nếu Docker Desktop chưa chạy, `docker compose` sẽ báo đúng lỗi
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ...
The system cannot find the file specified`, xem mục "Xử lý sự cố" bên dưới.

**PowerShell** (mở "Windows PowerShell", không phải CMD):

```powershell
Set-Location D:\hotel\OSS\webadmin
Copy-Item .env.example .env
docker compose up --build
```

**CMD (Command Prompt)**:

```bat
cd /d D:\hotel\OSS\webadmin
copy .env.example .env
docker compose up --build
```

Sau khi copy `.env`, mở file bằng Notepad và đổi `JWT_SECRET` thành một chuỗi ngẫu nhiên
dài trước khi chạy `docker compose up`.

Nếu muốn gõ một dòng duy nhất: PowerShell dùng `;` thay cho `&&`
(`Set-Location D:\hotel\OSS\webadmin; docker compose up --build`); CMD dùng `&`
(`cd /d D:\hotel\OSS\webadmin & docker compose up --build`).

Lần đầu chạy: service `migrate` tự động tạo schema (`database/migrations/001_init.sql`,
`002_release_console.sql`, `003_purchase_orders.sql`, `004_asset_monitoring.sql`) rồi seed
dữ liệu demo trước khi `api` khởi động (xem thứ tự phụ thuộc trong `docker-compose.yml`).
Không cần chạy thêm lệnh nào khác.

### Biến môi trường mới — đồng bộ giám sát thiết bị (module Hardware Assets)

Thêm từ phiên nâng cấp Hardware Assets thành trung tâm giám sát thiết bị (xem `PROGRESS.md`),
tất cả có giá trị mặc định an toàn cho dev — không bắt buộc phải tạo `.env` để chạy thử:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `IOT_SERVICE_URL` | `http://localhost:4103` | Địa chỉ `smart-hotel-os/services/iot-service` để đồng bộ `connection_status`/`disconnect_count`. |
| `PROPERTY_WEB_API_URL` | `http://localhost:4100` | Địa chỉ `smart-hotel-os/property-web/apps/api` để lấy danh sách cơ sở (`GET /branches`). |
| `INTERNAL_SERVICE_KEY` | `dev-internal-service-key-change-me` | Header `X-Internal-Service-Key` gửi kèm khi gọi property-web — PHẢI đặt CÙNG giá trị ở cả 2 phía, **PHẢI đổi khi lên production** (MVP tạm thời, xem `PROGRESS.md`). |
| `IOT_SYNC_INTERVAL_MS` | `30000` | Chu kỳ chạy job đồng bộ nền (setInterval). |
| `DISABLE_IOT_SYNC_JOB` | (không đặt) | Đặt `1` để tắt job nền (vd. khi test không muốn job can thiệp). |

Nếu `iot-service`/`property-web` không chạy, webadmin vẫn hoạt động bình thường — job đồng bộ
chỉ log lỗi, endpoint `property-options` trả về danh sách rỗng kèm `source: "fallback"` để UI
tự chuyển sang nhập tay tên cơ sở (không crash).

Sau khi cả 4 service (`postgres`, `migrate`, `api`, `web`) lên xong:

- Web: http://localhost:3000
- API: http://localhost:4000 (health check: `GET /health`)
- Postgres: cổng 5432
- Đăng nhập demo: xem bảng "Vai trò demo" bên dưới, mật khẩu chung `ChangeMe123!`

### Chạy không dùng Docker nhưng vẫn muốn dùng PostgreSQL thật (nâng cao)

Nếu bạn đã tự cài PostgreSQL 16 (không qua Docker) và muốn API kết nối vào đó thay vì
dùng database nhúng: tạo file `.env` trong `apps/api/` với `DATABASE_URL` trỏ tới
PostgreSQL của bạn (xem `.env.example` ở thư mục gốc để biết định dạng), rồi chạy
migration/seed thủ công như trước:

```powershell
Set-Location D:\hotel\OSS\webadmin\database
npm install
npm run migrate
npm run seed
```

Đây KHÔNG phải đường chính — chỉ dùng khi bạn chủ động muốn PostgreSQL thật mà không qua
Docker. Mặc định (không có `DATABASE_URL`) luôn là chế độ embedded ở Cách 1.

### Build production / kiểm tra kiểu dữ liệu

```powershell
npm run build
npm run start
npm run typecheck   # chạy trong apps/api hoặc apps/web — không phát sinh file
```

### Xử lý sự cố

**a) `docker compose up` báo lỗi `failed to connect to the docker API at
npipe:////./pipe/dockerDesktopLinuxEngine ... The system cannot find the file specified`**
→ Docker Desktop chưa chạy (daemon chưa lên). Mở ứng dụng Docker Desktop, đợi biểu tượng
con cá voi ở khay hệ thống hết xoay rồi thử lại. Nếu vẫn lỗi hoặc máy bạn không bật được
Docker Desktop, dùng thẳng **Cách 1 (không cần Docker)** ở trên — đây là lý do cách đó
được thêm vào.

**b) Mở `http://localhost:3000/` hoặc `http://localhost:4000/` báo "This site can't be
reached" / "Đăng nhập thất bại"** → API (cổng 4000) chưa chạy hoặc chưa kết nối được
database. Kiểm tra bằng cách mở trình duyệt tới http://localhost:4000/health — nếu không
tải được trang này (connection refused), quay lại chạy `npm run dev` trong `apps/api`
(Cách 1) và đọc log lỗi in ra ngay trong cửa sổ đó. Trang web chỉ chạy được (cổng 3000)
SAU KHI cả API lẫn Web đều đã `npm run dev` xong trong 2 cửa sổ riêng — mở web trước khi
API sẵn sàng cũng sẽ báo lỗi tương tự.

**c) PowerShell báo không cho chạy script (`... cannot be loaded because running scripts
is disabled on this system`)** → chạy lệnh sau 1 lần (mở PowerShell, không cần quyền
Admin) rồi thử lại:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Cấu trúc thư mục

```text
webadmin/
├── apps/
│   ├── api/                 # Express + TypeScript, SQL thuần qua node-postgres
│   │   ├── .data/             # (không commit) dữ liệu PGlite khi chạy DB_MODE=embedded
│   │   └── src/
│   │       ├── routes/       # auth, partners, suppliers, customers, hardware-assets,
│   │       │                  # commissions, dashboard, audit-logs, users, releases,
│   │       │                  # purchase-orders
│   │       ├── repositories/ # 1 file / bảng (hoặc nhóm bảng), không ORM
│   │       ├── middleware/   # requireAuth, requireRole (rbac), audit log, error handler
│   │       ├── lib/          # db.ts (adapter pg.Pool/PGlite), embeddedBootstrap.ts (tự migrate+seed)
│   │       └── types/        # domain.ts — kiểu TS viết tay khớp schema SQL
│   └── web/                  # Next.js (App Router) + Tailwind — giao diện quản trị
├── database/
│   ├── migrations/           # SQL thuần, đánh số thứ tự (001_, 002_, 003_...) — xem database/README.md
│   ├── migrate.ts             # migration runner tối giản, không phụ thuộc ORM code-gen
│   ├── seed.ts                 # dữ liệu demo (chế độ Docker/Postgres thật), tách biệt production
│   └── package.json
├── docker-compose.yml          # web 3000 / api 4000 / postgres 5432 (Cách 2)
├── start-dev.bat                # Tiện ích khởi động 1 cú double-click (Cách 1) — .bat, xem mục "Chạy"
├── .env.example
├── .gitignore
└── README.md                     # file này
```

Chi tiết bố cục SQL và cách mở rộng: `database/README.md`.

## Vì sao không dùng Prisma/ORM code-gen

Bản nháp đầu tiên dùng Prisma, nhưng môi trường build lúc đó không tải được engine binary của Prisma (mạng bị chặn ở CDN `binaries.prisma.sh`), nên không thể tự kiểm chứng là chạy được. Đã đổi sang `pg` (node-postgres) thuần + SQL viết tay — không cần binary/CDN nào, và cũng đúng tinh thần "SQL bố cục rõ ràng" được yêu cầu hơn: schema nằm trong các file `.sql` đọc trực tiếp được, không qua lớp trừu tượng. Xem `../hq-console/DECISIONS.md` (ADR liên quan) và `../smart-hotel-os` để biết các quyết định kiến trúc khác của dự án.

Vì cùng lý do (không phụ thuộc binary/CDN bị chặn), chế độ chạy embedded ở trên dùng
`@electric-sql/pglite` — cũng là PostgreSQL thật (biên dịch sang WASM) chứ không phải một
database khác giả lập cú pháp Postgres, nên schema/SQL dùng chung 100% với chế độ Docker,
không cần viết 2 bộ migration.

## Vai trò demo (mật khẩu chung: `ChangeMe123!`)

| Email | Vai trò |
|---|---|
| admin@hq-console.local | SUPER_ADMIN |
| sales@hq-console.local | SALES_MANAGER |
| accountant@hq-console.local | ACCOUNTANT |
| supply@hq-console.local | SUPPLY_CHAIN |

Đây là hệ thống quản trị nội bộ công ty (nhân sự HQ), **khác hoàn toàn** bảng
`property_users` bên `smart-hotel-os/property-web` (nhân viên khách sạn) — hai hệ thống
không dùng chung database. Tài khoản/mật khẩu demo giữ nguyên như các phiên trước, không
đổi.

Phân quyền chi tiết theo module: `../hq-console/docs/PERMISSION_MATRIX.md` (mã hoá thành `requireRole(...)` ở từng route trong `apps/api/src/routes/`).

## Đã triển khai ở bản MVP này

Auth (JWT) + RBAC theo role, Đối tác (partners), Nhà cung cấp (suppliers), Khách hàng 360 (customers + support tickets), Thiết bị phần cứng (hardware assets + warranty claims), Hoa hồng (commission rules + records + duyệt/thanh toán), Dashboard tổng hợp, Audit log, **Quản lý user/role qua UI** (`/users`, chỉ SUPER_ADMIN), **Release Console** tổng hợp phiên bản app (`/releases`), **Mua hàng/tồn kho chi tiết** (`/purchase-orders` — `purchase_orders` + `purchase_order_items`, tự sinh `hardware_assets` khi nhận hàng). **[Mới]** Chạy được không cần Docker/PostgreSQL qua chế độ database embedded (`@electric-sql/pglite`). Chi tiết đầy đủ: `PROGRESS.md`.

## Chưa triển khai (xem `PROGRESS.md` gốc dự án và `../hq-console/PROGRESS.md`)

Đồng bộ thật với Admin API của `smart-hotel-os`/`kiosk-management` (hiện các API đó cần bổ sung endpoint/webhook — xem `../hq-console/ASSUMPTIONS.md`), MFA/VPN cho production, CI/CD và blue-green/canary deployment thật (Release Console hiện chỉ là MVP quản lý version, không phải pipeline deploy — xem `PROGRESS.md`). Chế độ database embedded chỉ dành cho dev/demo một người dùng trên máy cá nhân — production luôn phải dùng PostgreSQL thật (`DB_MODE=postgres`), xem giới hạn kỹ thuật ghi trong `apps/api/src/lib/db.ts`.
