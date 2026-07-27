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

## Chạy toàn bộ hệ thống bằng một lệnh

Yêu cầu: đã cài Docker Desktop (bao gồm Docker Compose) và đang chạy (mở Docker Desktop trước).

**Lưu ý Windows**: `&&` chỉ nối lệnh được trong Git Bash/WSL, KHÔNG chạy được trực tiếp trong CMD hay PowerShell — dùng cú pháp riêng cho từng loại terminal bên dưới. Nếu ổ đĩa dự án khác ổ hệ thống (vd. dự án ở `D:` nhưng terminal đang mở ở `C:`), phải đổi ổ đĩa trước khi `cd`, nếu không sẽ báo "cannot find the path specified".

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

Sau khi copy `.env`, mở file `.env` (vd. bằng Notepad) và đổi `JWT_SECRET` thành một chuỗi ngẫu nhiên dài trước khi chạy `docker compose up`.

Nếu muốn gõ một dòng duy nhất: PowerShell dùng `;` thay cho `&&` (`Set-Location D:\hotel\OSS\webadmin; docker compose up --build`); CMD dùng `&` (`cd /d D:\hotel\OSS\webadmin & docker compose up --build`).

Lần đầu chạy: service `migrate` tự động tạo schema (`database/migrations/001_init.sql`) rồi seed dữ liệu demo trước khi `api` khởi động (xem thứ tự phụ thuộc trong `docker-compose.yml`). Không cần chạy thêm lệnh nào khác.

Sau khi cả 4 service (`postgres`, `migrate`, `api`, `web`) lên xong:

- Web: http://localhost:3000
- API: http://localhost:4000 (health check: `GET /health`)
- Đăng nhập demo: `admin@hq-console.local` / `ChangeMe123!` (đổi ngay ở môi trường thật)

## Chạy không dùng Docker (phát triển local)

Cần PostgreSQL 16 chạy sẵn (local hoặc container riêng) và Node.js 20+. Lệnh `cp`/`copy` bên dưới ghi theo macOS/Linux — trên Windows PowerShell dùng `Copy-Item`, trên CMD dùng `copy`.

```bash
# 1. Tạo schema + seed
cd database
npm install
cp ../.env.example .env   # Windows PowerShell: Copy-Item ..\.env.example .env
                           # Windows CMD:        copy ..\.env.example .env
# sửa DATABASE_URL trong .env nếu Postgres không chạy ở localhost:5432
npm run migrate
npm run seed

# 2. Chạy API (terminal khác)
cd apps/api
npm install
cp ../../.env.example .env
npm run dev                # http://localhost:4000

# 3. Chạy Web (terminal khác)
cd apps/web
npm install
npm run dev                 # http://localhost:3000
```

## Cấu trúc thư mục

```text
webadmin/
├── apps/
│   ├── api/            # Express + TypeScript — REST API, SQL thuần qua node-postgres
│   └── web/             # Next.js (App Router) + Tailwind — giao diện quản trị
├── database/
│   ├── migrations/      # SQL thuần, đánh số thứ tự (001_, 002_...) — xem database/README.md
│   ├── migrate.ts        # migration runner tối giản, không phụ thuộc ORM code-gen
│   ├── seed.ts            # dữ liệu demo, tách biệt production
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md              # file này
```

Chi tiết bố cục SQL và cách mở rộng: `database/README.md`.

## Vì sao không dùng Prisma/ORM code-gen

Bản nháp đầu tiên dùng Prisma, nhưng môi trường build lúc đó không tải được engine binary của Prisma (mạng bị chặn ở CDN `binaries.prisma.sh`), nên không thể tự kiểm chứng là chạy được. Đã đổi sang `pg` (node-postgres) thuần + SQL viết tay — không cần binary/CDN nào, và cũng đúng tinh thần "SQL bố cục rõ ràng" được yêu cầu hơn: schema nằm trong các file `.sql` đọc trực tiếp được, không qua lớp trừu tượng. Xem `../hq-console/DECISIONS.md` (ADR liên quan) và `../smart-hotel-os` để biết các quyết định kiến trúc khác của dự án.

## Vai trò demo (mật khẩu chung: `ChangeMe123!`)

| Email | Vai trò |
|---|---|
| admin@hq-console.local | SUPER_ADMIN |
| sales@hq-console.local | SALES_MANAGER |
| accountant@hq-console.local | ACCOUNTANT |
| supply@hq-console.local | SUPPLY_CHAIN |

Phân quyền chi tiết theo module: `../hq-console/docs/PERMISSION_MATRIX.md` (mã hoá thành `requireRole(...)` ở từng route trong `apps/api/src/routes/`).

## Đã triển khai ở bản MVP này

Auth (JWT) + RBAC theo role, Đối tác (partners), Nhà cung cấp (suppliers), Khách hàng 360 (customers + support tickets), Thiết bị phần cứng (hardware assets + warranty claims), Hoa hồng (commission rules + records + duyệt/thanh toán), Dashboard tổng hợp, Audit log.

## Chưa triển khai (xem `PROGRESS.md` gốc dự án và `../hq-console/PROGRESS.md`)

Đồng bộ thật với Admin API của `smart-hotel-os`/`kiosk-management` (hiện các API đó cần bổ sung endpoint/webhook — xem `../hq-console/ASSUMPTIONS.md`), quản lý user/role qua UI (hiện chỉ seed sẵn), Release Console tổng hợp phiên bản app, quản lý mua hàng/tồn kho chi tiết (`purchase_orders`).
