# channel-manager-service

Đặc tả nghiệp vụ đầy đủ: `../../docs/MODULE_CHANNEL_MANAGER_BOOKING.md` (Phần A).
Kiến trúc tổng thể: `../../docs/SYSTEM_ARCHITECTURE.md`.

## Việc service này làm

- Giữ bản sao cục bộ tồn phòng (`room_type_inventory_cache`) do PMS Core đẩy sang qua `POST /inventory/sync`.
- Đẩy tồn phòng/giá sang OTA đã kết nối qua `OtaAdapter` (hiện chỉ có `MockOtaAdapter` — xem `src/adapters/`).
- Nhận booking từ OTA qua `POST /webhooks/:provider/bookings`, kiểm tra tồn phòng cục bộ trước khi ghi nhận để chống overbooking, idempotent theo `idempotencyKey`.

## Chạy cục bộ (Windows)

PowerShell:
```powershell
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

CMD:
```cmd
copy .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Mặc định chạy ở cổng 4101 (`http://localhost:4101/health`).

## Giới hạn hiện tại

Xem `../PROGRESS.md` mục "channel-manager-service" — quan trọng nhất: chưa có credential OTA thật, `MockOtaAdapter` mô phỏng toàn bộ; `credentials` trong `ota_connections` chưa mã hoá tại tầng ứng dụng.
