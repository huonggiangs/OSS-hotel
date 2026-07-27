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
- `database/` — **MỚI**: migration SQL đánh số (`database/migrations/001_init.sql`) + seed
  demo, chạy bằng `database/migrate.ts` / `database/seed.ts` (migration runner viết tay,
  không phụ thuộc ORM code-gen — giống hệt `webadmin/database`).

**Đã có đăng nhập thật** — vá lỗ hổng "ai mở link cũng vào thẳng được" của các phiên trước.
Xem chi tiết màn nào đã nối API thật / màn nào còn mock ở `PROGRESS.md`.

## Chạy toàn bộ hệ thống bằng một lệnh (Docker)

Yêu cầu: đã cài Docker Desktop (bao gồm Docker Compose) và đang chạy.

**Lưu ý Windows**: `&&` chỉ nối lệnh được trong Git Bash/WSL, KHÔNG chạy được trực tiếp
trong CMD hay PowerShell — dùng cú pháp riêng cho từng loại terminal bên dưới.

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

Lần đầu chạy: service `migrate` tự động tạo schema (`database/migrations/001_init.sql`)
rồi seed dữ liệu demo trước khi `api` khởi động. Sau khi cả 4 service
(`postgres`, `migrate`, `api`, `web`) lên xong:

- Web: http://localhost:3100 (khác cổng `webadmin` 3000 — chạy song song được)
- API: http://localhost:4100 (health check: `GET /health`; khác cổng `webadmin` 4000)
- Postgres: cổng 5433 (khác cổng `webadmin` 5432)
- Đăng nhập demo: xem bảng "Vai trò demo" bên dưới, mật khẩu chung `ChangeMe123!`

## Chạy không dùng Docker (phát triển local, Windows)

Cần PostgreSQL 16 chạy sẵn (local hoặc container riêng, cổng bất kỳ — chỉnh `DATABASE_URL`
cho khớp) và Node.js 20+.

**PowerShell**:

```powershell
# 1. Tạo schema + seed
Set-Location D:\hotel\OSS\smart-hotel-os\property-web\database
npm install
Copy-Item ..\.env.example .env
# sửa DATABASE_URL trong .env nếu Postgres không chạy đúng ở localhost:5433
npm run migrate
npm run seed

# 2. Chạy API (mở cửa sổ PowerShell khác)
Set-Location D:\hotel\OSS\smart-hotel-os\property-web\apps\api
npm install
Copy-Item ..\..\.env.example .env
npm run dev                # http://localhost:4100

# 3. Chạy Web (mở cửa sổ PowerShell khác)
Set-Location D:\hotel\OSS\smart-hotel-os\property-web\apps\web
npm install
npm run dev                # http://localhost:3100
```

**CMD (Command Prompt)** — thay `Set-Location` bằng `cd /d`, thay `Copy-Item` bằng `copy`,
giữ nguyên các lệnh `npm`:

```bat
cd /d D:\hotel\OSS\smart-hotel-os\property-web\database
npm install
copy ..\.env.example .env
npm run migrate
npm run seed
```

```bat
cd /d D:\hotel\OSS\smart-hotel-os\property-web\apps\api
npm install
copy ..\..\.env.example .env
npm run dev
```

```bat
cd /d D:\hotel\OSS\smart-hotel-os\property-web\apps\web
npm install
npm run dev
```

Truy cập `/` sẽ tự chuyển tới `/dashboard`, nhưng vì đã có đăng nhập thật, nếu chưa có
JWT hợp lệ sẽ redirect ngay sang `/login`.

Build production:

```powershell
npm run build
npm run start
```

Kiểm tra kiểu dữ liệu (không phát sinh file) ở cả `apps/api` và `apps/web`:

```powershell
npm run typecheck
```

## Vai trò demo cấp cơ sở (mật khẩu chung: `ChangeMe123!`)

| Email | Vai trò |
|---|---|
| owner@anio-riverside.local | OWNER |
| manager@anio-riverside.local | MANAGER |
| reception@anio-riverside.local | RECEPTIONIST |
| housekeeping@anio-riverside.local | HOUSEKEEPING |

Đây là bảng `property_users` — người dùng **cấp cơ sở** (lễ tân/quản lý/buồng phòng),
KHÁC HOÀN TOÀN với bảng `users` bên `webadmin` (nhân sự nội bộ công ty). Hai hệ thống
không dùng chung database, không JOIN chéo được — đúng `ARCHITECTURE_OVERVIEW.md`.

Phân quyền chi tiết theo route: mã hoá thành `requireRole(...)` ở từng file trong
`apps/api/src/routes/`, đối chiếu `../docs/PERMISSION_MATRIX.md` (có điều chỉnh tên vai trò
tối thiểu, xem `PROGRESS.md` mục quyết định).

## Cấu trúc thư mục

```text
property-web/
├── apps/
│   ├── api/                 # MỚI — Express + TypeScript, SQL thuần qua node-postgres
│   │   └── src/
│   │       ├── routes/       # auth, room-types, rooms, customers, bookings, payments, expenses, devices, dashboard
│   │       ├── repositories/ # 1 file / bảng, không ORM
│   │       ├── middleware/   # requireAuth, requireRole, audit log, error handler
│   │       └── types/        # domain.ts — kiểu TS viết tay khớp schema SQL
│   └── web/                  # Next.js (App Router) + Tailwind
│       └── src/
│           ├── app/
│           │   ├── login/    # MỚI — trang đăng nhập
│           │   └── (pms)/    # Layout dùng chung, bọc RequireAuth (redirect /login nếu chưa đăng nhập)
│           ├── components/   # layout/, dashboard/, booking/, rooms/, price/, ui/, auth/, icons.tsx
│           └── lib/           # mock-data.ts (còn dùng cho màn chưa nối API), api-client.ts, auth.tsx (MỚI)
├── database/                 # MỚI — giống hệt convention webadmin/database
│   ├── migrations/001_init.sql
│   ├── migrate.ts
│   ├── seed.ts
│   └── package.json
├── docker-compose.yml         # MỚI — web 3100 / api 4100 / postgres 5433
├── .env.example                # MỚI
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
