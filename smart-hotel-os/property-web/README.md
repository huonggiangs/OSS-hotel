# property-web — PMS Property Web (PWEB)

Đây là bản triển khai thực tế (runnable) của ứng dụng **Property Web** dùng tại từng cơ sở
lưu trú, mô tả trong `../docs/MODULE_PMS_WINDOWS_CLIENT.md` và `../docs/UI_SITEMAP.md` (mục
"Property Web / PWEB"). Không có gì ở `../docs/` bị chỉnh sửa/di chuyển khi tạo thư mục
này — `property-web/` là mã nguồn mới, độc lập, chỉ tham chiếu tới tài liệu đặc tả đó
(giống hệt cách `webadmin/` tách biệt với `hq-console/docs/`).

## Nguồn thiết kế

Giao diện được dựng **pixel-perfect** từ bundle thiết kế do người dùng xuất ra từ
Claude Design, đặt tại `../../hotel-pms-software-design-phase-1/project/Hotel PMS.dc.html`.
Chi tiết xem mục "Nguồn thiết kế" trong `PROGRESS.md`.

## Quan hệ với các thư mục khác trong dự án

| Thư mục | Vai trò |
|---|---|
| `../docs/` | Đặc tả PMS SaaS đầy đủ (PRD, kiến trúc, data model, API spec, module spec) — đọc trước khi sửa code ở đây |
| `../../webadmin/` | HQ Console — hệ thống tách biệt, KHÔNG chung DB, KHÔNG chung bảng người dùng (`property_users` ở đây khác hoàn toàn `users` bên webadmin) |
| `../../RULES.md` | Nguyên tắc kiến trúc phân tán bắt buộc (Cloud là nguồn sự thật, Local/Edge chỉ là executor+cache, idempotent commands...) |

## Trạng thái hiện tại (đã có API + Auth thật)

Từ đợt cập nhật này, `property-web` có **2 phần chạy được**:

- `apps/web/` — Next.js 16 + TypeScript + Tailwind, 28 màn hình PMS pixel-perfect.
- `apps/api/` — **MỚI**: Express + TypeScript + `pg` (node-postgres thuần, KHÔNG dùng Prisma,
  đúng convention `webadmin/apps/api`), JWT Auth thật, RBAC theo vai trò cấp cơ sở.
- `database/` — **MỚI**: migration SQL đánh số (`database/migrations/001_init.sql`,
  `002_add_username.sql`) + seed demo, chạy bằng `database/migrate.ts` / `database/seed.ts`
  (migration runner viết tay, không phụ thuộc ORM code-gen — giống hệt `webadmin/database`).
  Dùng cho chế độ chạy qua Docker/Postgres thật.

**Đã có đăng nhập thật** — vá lỗ hổng "ai mở link cũng vào thẳng được" của các phiên trước.
Xem chi tiết màn nào đã nối API thật / màn nào còn mock ở `PROGRESS.md`.

**Chạy được không cần Docker/PostgreSQL**: `apps/api` hỗ trợ chế độ database "embedded"
(`@electric-sql/pglite`) — tự chạy migration + seed khi khởi động, lưu dữ liệu ra
`apps/api/.data/`. Xem mục "Chạy thử" ngay bên dưới.

## Chạy thử

Có 2 cách. **Cách 1 được khuyến nghị** — không cần Docker, không cần cài PostgreSQL, chỉ
cần Node.js đã có sẵn trên máy. Dùng Cách 2 chỉ khi Docker Desktop của bạn đang chạy tốt.

### Cách 1 (khuyến nghị, KHÔNG cần Docker)

API dùng chế độ database **embedded** (`@electric-sql/pglite` — PostgreSQL biên dịch sang
WASM, chạy thẳng trong tiến trình Node, lưu dữ liệu ra thư mục file `apps/api/.data/`).
Không cần cài Docker, không cần cài PostgreSQL, không cần tạo file `.env` thủ công. Lần
đầu chạy, API tự tạo schema (chạy hết các file trong `database/migrations/`) và tự seed
dữ liệu demo — chỉ cần `npm run dev` là có ngay dữ liệu để đăng nhập.

Mở **2 cửa sổ terminal riêng** (1 chạy API, 1 chạy Web) — không dùng `&&` trần vì không
chạy được trực tiếp trong CMD/PowerShell.

**PowerShell — cửa sổ 1 (API, cổng 4100):**

```powershell
Set-Location D:\hotel\OSS\smart-hotel-os\property-web\apps\api
npm install
npm run dev
```

**PowerShell — cửa sổ 2 (Web, cổng 3100):**

```powershell
Set-Location D:\hotel\OSS\smart-hotel-os\property-web\apps\web
npm install
npm run dev
```

**CMD (Command Prompt) — cửa sổ 1 (API):**

```bat
cd /d D:\hotel\OSS\smart-hotel-os\property-web\apps\api
npm install
npm run dev
```

**CMD (Command Prompt) — cửa sổ 2 (Web):**

```bat
cd /d D:\hotel\OSS\smart-hotel-os\property-web\apps\web
npm install
npm run dev
```

Sau khi cả 2 cửa sổ đều chạy (giữ nguyên, không đóng):

- Web DEV: http://localhost:13100 (khác cổng Docker/LAN 3100 — chạy song song được)
- API DEV: http://localhost:14100 (health check: mở http://localhost:14100/health, phải thấy
  `{"status":"ok"}`)
- Đăng nhập demo: xem bảng "Tài khoản demo" bên dưới, mật khẩu chung `Anio2026@`

Có thể thử double-click `property-web\start-dev.bat` để tự động hoá 2 bước trên (tự kiểm
tra Node, tự `npm install`, tự mở 2 cửa sổ) — **nhưng nếu double-click không mở được cửa
sổ nào** (thường do phần mềm bảo mật/EDR trên máy chặn chạy script), đừng cố sửa file
`.bat` — hãy quay lại gõ tay 2 khối lệnh PowerShell/CMD phía trên, đó mới là đường chính.

### Cách 2 (nếu có Docker Desktop đang chạy tốt)

Yêu cầu: đã cài Docker Desktop (bao gồm Docker Compose) và **đã mở Docker Desktop, đợi
biểu tượng con cá voi ở khay hệ thống hết xoay** (chạy ổn định) trước khi gõ lệnh dưới
đây — nếu Docker Desktop chưa chạy, `docker compose` sẽ báo đúng lỗi
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ...
The system cannot find the file specified`, xem mục "Xử lý sự cố" bên dưới.

**PowerShell** (mở "Windows PowerShell", không phải CMD):

```powershell
Set-Location D:\hotel\OSS\smart-hotel-os\property-web
Copy-Item .env.example .env
docker compose up --build
```

**CMD (Command Prompt)**:

```bat
cd /d D:\hotel\OSS\smart-hotel-os\property-web
copy .env.example .env
docker compose up --build
```

Sau khi copy `.env`, mở file bằng Notepad và đổi `JWT_SECRET` thành một chuỗi ngẫu nhiên
dài trước khi chạy `docker compose up`.

Nếu muốn gõ một dòng duy nhất: PowerShell dùng `;` thay cho `&&`
(`Set-Location D:\hotel\OSS\smart-hotel-os\property-web; docker compose up --build`);
CMD dùng `&` (`cd /d D:\hotel\OSS\smart-hotel-os\property-web & docker compose up --build`).

Lần đầu chạy: service `migrate` tự động tạo schema (toàn bộ migration hiện có) rồi seed
dữ liệu demo trước khi `api` khởi động. Sau khi cả 4
service (`postgres`, `migrate`, `api`, `web`) lên xong:

- Web: http://localhost:3100 (khác cổng `webadmin` 3000 — chạy song song được)
- API: http://localhost:4100 (health check: `GET /health`; khác cổng `webadmin` 4000)
- Postgres: cổng 5433 (khác cổng `webadmin` 5432)
- Đăng nhập demo: xem bảng "Tài khoản demo" bên dưới, mật khẩu chung `Anio2026@`

### Build production / kiểm tra kiểu dữ liệu

```powershell
npm run build
npm run start
npm run typecheck   # chạy trong apps/api hoặc apps/web — không phát sinh file
```

Truy cập `/` sẽ tự chuyển tới `/dashboard`, nhưng vì đã có đăng nhập thật, nếu chưa có
JWT hợp lệ sẽ redirect ngay sang `/login`.

### Xử lý sự cố

**a) `docker compose up` báo lỗi `failed to connect to the docker API at
npipe:////./pipe/dockerDesktopLinuxEngine ... The system cannot find the file specified`**
→ Docker Desktop chưa chạy (daemon chưa lên). Mở ứng dụng Docker Desktop, đợi biểu tượng
con cá voi ở khay hệ thống hết xoay rồi thử lại. Nếu vẫn lỗi hoặc máy bạn không bật được
Docker Desktop, dùng thẳng **Cách 1 (không cần Docker)** ở trên — đây là lý do cách đó
được thêm vào.

**b) Trang `/login` dev báo "Đăng nhập thất bại. Vui lòng thử lại"** → API dev (cổng 14100) chưa
chạy hoặc chưa kết nối được database. Kiểm tra bằng cách mở trình duyệt tới
http://localhost:14100/health — nếu không tải được trang này (connection refused), quay lại
chạy `npm run dev` trong `apps/api` (Cách 1) và đọc log lỗi in ra ngay trong cửa sổ đó.

**c) PowerShell báo không cho chạy script (`... cannot be loaded because running scripts
is disabled on this system`)** → chạy lệnh sau 1 lần (mở PowerShell, không cần quyền
Admin) rồi thử lại:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Tài khoản demo (mật khẩu chung: `Anio2026@`)

| Tên đăng nhập | Vai trò |
|---|---|
| owner | OWNER |
| manager | MANAGER |
| reception | RECEPTIONIST |
| housekeeping | HOUSEKEEPING |

Đây là bảng `property_users` — người dùng **cấp cơ sở** (lễ tân/quản lý/buồng phòng),
KHÁC HOÀN TOÀN với bảng `users` bên `webadmin` (nhân sự nội bộ công ty). Hai hệ thống
không dùng chung database, không JOIN chéo được — đúng `ARCHITECTURE_OVERVIEW.md`.

Đăng nhập chấp nhận cả tên đăng nhập ngắn ở trên LẪN email đầy đủ dạng cũ
(`manager@anio-riverside.local`...) để tương thích ngược — xem
`database/migrations/002_add_username.sql`.

Phân quyền chi tiết theo route: mã hoá thành `requireRole(...)` ở từng file trong
`apps/api/src/routes/`, đối chiếu `../docs/PERMISSION_MATRIX.md` (có điều chỉnh tên vai trò
tối thiểu, xem `PROGRESS.md` mục quyết định).

## Cấu trúc thư mục

```text
property-web/
├── apps/
│   ├── api/                 # Express + TypeScript, SQL thuần qua node-postgres
│   │   ├── .data/             # (không commit) dữ liệu PGlite khi chạy DB_MODE=embedded
│   │   └── src/
│   │       ├── routes/       # auth, room-types, rooms, customers, bookings, payments, expenses, devices, dashboard
│   │       ├── repositories/ # 1 file / bảng, không ORM
│   │       ├── middleware/   # requireAuth, requireRole, audit log, error handler
│   │       ├── lib/          # db.ts (adapter pg.Pool/PGlite), embeddedBootstrap.ts (tự migrate+seed)
│   │       └── types/        # domain.ts — kiểu TS viết tay khớp schema SQL
│   └── web/                  # Next.js (App Router) + Tailwind
│       └── src/
│           ├── app/
│           │   ├── login/    # Trang đăng nhập (tên đăng nhập ngắn, không cần "@")
│           │   └── (pms)/    # Layout dùng chung, bọc RequireAuth (redirect /login nếu chưa đăng nhập)
│           ├── components/   # layout/, dashboard/, booking/, rooms/, price/, ui/, auth/, icons.tsx
│           └── lib/           # mock-data.ts (còn dùng cho màn chưa nối API), api-client.ts, auth.tsx
├── database/                 # Giống hệt convention webadmin/database — dùng cho chế độ Docker/Postgres
│   ├── migrations/001_init.sql
│   ├── migrations/002_add_username.sql
│   ├── migrate.ts
│   ├── seed.ts
│   └── package.json
├── docker-compose.yml         # web 3100 / api 4100 / postgres 5433 (Cách 2)
├── start-dev.bat               # Tiện ích khởi động 1 cú double-click (Cách 1) — .bat, xem mục "Chạy thử"
├── .env.example
├── .gitignore
└── README.md                    # file này
```

## Vì sao không dùng Prisma/ORM code-gen

Đồng nhất lựa chọn của `webadmin/` (xem `../../hq-console/DECISIONS.md` ADR-006): SQL thuần
qua `pg` (node-postgres), không cần binary/CDN nào, schema nằm trong file `.sql` đọc trực
tiếp được, không qua lớp trừu tượng.

## Đã triển khai ở bản cập nhật này

Auth (JWT, bcrypt) + RBAC theo 4 vai trò cấp cơ sở, Room Types, Rooms (kèm bật/tắt điện
IoT), Customers, Bookings (đặt phòng/hợp đồng), Payments/Invoices, Expenses, Devices (đăng
ký thiết bị IoT theo phòng), Dashboard (KPI tổng hợp + endpoint dữ liệu Gantt), Audit log.
Đăng nhập + Dashboard (4 KPI + 2 donut) + Rooms (list + bật/tắt điện) + Booking (list + tạo
mới) đã nối API thật trên UI. Chi tiết đầy đủ từng màn hình: `PROGRESS.md`.

## Chưa triển khai / còn mock

Xem `PROGRESS.md` mục cập nhật mới nhất — liệt kê rõ từng màn hình còn dùng
`lib/mock-data.ts` và lý do (chưa có bảng dữ liệu nguồn tương ứng trong migration MVP này,
vd. revenue_daily, activity log theo sự kiện, campaign gửi tin nhắn thật...).
