# smart-hotel-os/services — Backend microservice

Đây là CODE CHẠY ĐƯỢC (không chỉ tài liệu) cho 4 service backend còn thiếu của
Smart Hotel OS: `channel-manager-service`, `ai-pricing-service`, `iot-service`,
`crm-service`. Đặc tả nghiệp vụ đầy đủ nằm ở `../docs/` — thư mục này chỉ hiện
thực hoá đúng những gì đặc tả mô tả, không tự bịa thêm nghiệp vụ:

| Service | Đặc tả nghiệp vụ | Kiến trúc tổng thể |
|---|---|---|
| `channel-manager-service/` | `../docs/MODULE_CHANNEL_MANAGER_BOOKING.md` (Phần A) | `../docs/SYSTEM_ARCHITECTURE.md` |
| `ai-pricing-service/` | `../docs/MODULE_AI_PRICING.md` | nt |
| `iot-service/` | `../docs/MODULE_IOT_ENERGY.md` | nt |
| `crm-service/` | `../docs/MODULE_CRM_MARKETING.md` | nt |

Mô hình dữ liệu tham chiếu tổng thể: `../docs/DATA_MODEL.md`. API tổng thể toàn
hệ thống: `../docs/API_SPECIFICATION.md` (4 service ở đây implement một phần
của đặc tả đó, phần liên quan tới module của mình).

## Quan hệ với phần còn lại của dự án

- **KHÔNG đụng tới** `webadmin/` (HQ Console) hay `smart-hotel-os/property-web/`
  (PMS UI) — 3 hệ thống độc lập hoàn toàn, không chung database, không import
  code lẫn nhau (đúng `RULES.md` và `ARCHITECTURE_OVERVIEW.md` ở gốc `D:\hotel\OSS`).
- 4 service ở đây là các mảnh còn thiếu của `smart-hotel-os` (PMS Core/Auth
  chưa có code thật — xem `../PROGRESS.md` gốc — property-web hiện dùng mock
  data, chưa gọi API thật sang các service này).
- Khi PMS Core có code thật, các service ở đây sẽ nhận dữ liệu tồn phòng/
  booking/khách qua API hoặc event bus thay vì dữ liệu seed thủ công như hiện tại.

## Cấu trúc thư mục

```text
services/
├── channel-manager-service/   # OTA sync (inventory/price) + webhook booking + chống overbooking
├── ai-pricing-service/        # Rule-based dynamic pricing (Phase 1)
├── iot-service/               # Idempotent device command + ack + timeout (mô phỏng qua HTTP)
├── crm-service/                # Phân khúc khách + campaign marketing
├── infra/
│   └── postgres-init.sql      # Tạo 4 database riêng trên 1 Postgres dùng chung khi chạy demo
├── docker-compose.yml          # Chạy cả 4 service + Postgres bằng 1 lệnh
├── README.md                   # File này
└── PROGRESS.md                 # Trạng thái từng service + quyết định kiến trúc + giới hạn
```

Mỗi service có `package.json`/`tsconfig.json`/`.env.example`/`Dockerfile`/
`README.md` RIÊNG, migration SQL riêng đánh số từ `001_init.sql` trong
`db/migrations/`, và độc lập hoàn toàn (không import code của service khác).

## Chạy TOÀN BỘ 4 service bằng 1 lệnh (Docker)

Yêu cầu: đã cài Docker Desktop (có Docker Compose v2).

PowerShell:
```powershell
Set-Location D:\hotel\OSS\smart-hotel-os\services
docker compose up --build
```

CMD:
```cmd
cd /d D:\hotel\OSS\smart-hotel-os\services
docker compose up --build
```

Lần đầu chạy: mỗi service có một job "migrate" tự tạo schema + seed dữ liệu
demo trước khi service API khởi động. Sau khi lên hết:

| Service | URL |
|---|---|
| channel-manager-service | http://localhost:4101/health |
| ai-pricing-service | http://localhost:4102/health |
| iot-service | http://localhost:4103/health |
| crm-service | http://localhost:4104/health |

Dừng toàn bộ: `Ctrl+C` rồi `docker compose down` (thêm `-v` nếu muốn xoá luôn dữ liệu Postgres).

## Chạy TỪNG service riêng lẻ (không Docker, để phát triển)

Mỗi service đọc `Postgres` riêng — cần một Postgres đang chạy cục bộ (có thể
dùng `docker compose up postgres` từ thư mục này để chỉ bật mỗi Postgres, hoặc
cài Postgres trực tiếp). Ví dụ với `ai-pricing-service` (PowerShell):

```powershell
Set-Location D:\hotel\OSS\smart-hotel-os\services\ai-pricing-service
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

CMD tương đương:
```cmd
cd /d D:\hotel\OSS\smart-hotel-os\services\ai-pricing-service
copy .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Lặp lại cho `channel-manager-service` (cổng 4101), `iot-service` (cổng 4103),
`crm-service` (cổng 4104) — mỗi service có `.env.example` riêng với
`DATABASE_URL` mặc định trỏ Postgres cục bộ (đổi username/password/database
name nếu Postgres cục bộ của bạn khác cấu hình trong `infra/postgres-init.sql`).

**Không dùng `&&` trần trên CMD/PowerShell** — chạy từng dòng lệnh riêng như
trên (bài học từ `webadmin/README.md`, xem `memory.md` mục 5).

## Kiểm chứng đã chạy được thật (không chỉ build sạch)

- `ai-pricing-service`: `npm run demo:pricing` chạy 8 kịch bản thuật toán tính
  giá, assert bằng `node:assert/strict`, không cần DB.
- `iot-service`: `npm run simulate:device` (sau khi `npm run dev` đang chạy)
  mô phỏng một thiết bị thật nhận lệnh, ack, chứng minh idempotency và timeout.
- `channel-manager-service`/`crm-service`: xem ví dụ `curl` trong `PROGRESS.md`
  mục "Đã test chạy thật".

## Quy tắc bắt buộc đã tuân thủ (RULES.md)

- Idempotent command + unique ID + ack + timeout: `iot-service` (`device_commands`), `channel-manager-service` (`booking_ingestion_log.idempotency_key`).
- Mọi bảng nghiệp vụ có `tenant_id`/`property_id`.
- Không dùng ORM code-gen (Prisma/Drizzle...) — SQL thuần qua `pg`, đúng convention `webadmin/database`.
- Migration SQL đánh số thứ tự, chạy qua migration runner viết tay (không phụ thuộc công cụ ngoài).
