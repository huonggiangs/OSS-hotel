# crm-service

Đặc tả nghiệp vụ đầy đủ: `../../docs/MODULE_CRM_MARKETING.md`.

## Việc service này làm

- Phân khúc khách rule-based (`src/segmentation/engine.ts`, hàm thuần) theo `total_stays`/`total_spend`/số ngày không quay lại — 5 segment: `NEW_GUEST`, `RETURNING_GUEST`, `VIP`, `INACTIVE_30D`, `INACTIVE_90D`.
- `POST /segments/recompute` tính lại segment cho toàn bộ khách của 1 property (mô phỏng batch job hàng ngày).
- `POST /campaigns` tạo chiến dịch (trigger/segment mục tiêu/kênh/nội dung/giới hạn tần suất).
- `POST /campaigns/:id/send` gửi qua `NotificationProvider` đang cấu hình (mặc định `ConsoleNotificationProvider` — chỉ log ra console), tôn trọng `opt_out` và `frequency_cap_days`.

## Chạy cục bộ (Windows)

PowerShell:
```powershell
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Mặc định chạy ở cổng 4104 (`http://localhost:4104/health`). Dữ liệu seed có sẵn 6 khách, mỗi khách rơi vào đúng 1 segment khác nhau (xem `db/seed.ts`) để test `POST /segments/recompute` thấy kết quả ngay.

## Giới hạn hiện tại

Xem `../PROGRESS.md` — chưa có nhà cung cấp SMS/Zalo OA/Email thật (chỉ có `ConsoleNotificationProvider`), chưa tách Notification Service riêng như kiến trúc mục tiêu (`SYSTEM_ARCHITECTURE.md`), `guest_stay_history`/`total_stays`/`total_spend` hiện là dữ liệu seed thủ công thay vì đồng bộ thật từ PMS Core.
