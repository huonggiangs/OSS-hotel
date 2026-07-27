# iot-service

Đặc tả nghiệp vụ đầy đủ: `../../docs/MODULE_IOT_ENERGY.md`.

## QUAN TRỌNG — đây là MÔ PHỎNG, không phải luồng MQTT thật

Kiến trúc mục tiêu (`../../docs/SYSTEM_ARCHITECTURE.md` mục 4, 8.3 và `MODULE_IOT_ENERGY.md` mục 2) là: thiết bị phòng → Edge Node tại cơ sở → MQTT → IoT Service trên Cloud. Dự án hiện **chưa có Edge Node, chưa có MQTT broker (vd. EMQX), chưa có phần cứng thật**.

Để vẫn chứng minh được đúng luồng nghiệp vụ bắt buộc theo `RULES.md` mục 10 (mọi lệnh có unique ID, idempotent, có ack, có timeout), service này mô phỏng luồng đó qua HTTP thuần:

- `POST /devices/:id/commands` = thay cho việc publish lệnh lên topic MQTT của thiết bị.
- `POST /devices/:id/ack` = thay cho việc thiết bị publish ack lên topic phản hồi.
- Sweep timeout chạy bằng `setInterval` trong cùng process (`src/index.ts`) = thay cho cơ chế QoS/timeout của broker MQTT hoặc một scheduler riêng.

**Khi có MQTT broker thật:** chỉ cần thay tầng transport (route Express → subscriber MQTT nhận lệnh, publish ack), giữ nguyên toàn bộ business logic: state machine `PENDING → ACKED/TIMEOUT/FAILED`, bảng `device_commands`, cách tính `expires_at`, cách xử lý idempotency theo `idempotency_key`. Không cần viết lại logic nghiệp vụ.

## Việc service này làm

- `devices`: danh sách thiết bị (switch/aircon) theo phòng.
- `device_commands`: mỗi lệnh có `id` (= command id duy nhất) + `idempotency_key` UNIQUE, `status` PENDING → ACKED/TIMEOUT/FAILED, `expires_at`.
- `device_heartbeats`: tổng hợp theo cửa sổ 1 giờ/lần (KHÔNG lưu từng nhịp tim thô vô hạn, đúng SYSTEM_ARCHITECTURE.md mục 8.4).

## Chứng minh luồng chạy end-to-end (không cần phần cứng thật)

```powershell
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Mở một cửa sổ PowerShell/CMD khác (giữ `npm run dev` đang chạy), rồi:

```powershell
npm run simulate:device
```

`scripts/simulate-device.ts` đóng vai "thiết bị thật": nhận lệnh, ack, chứng minh gọi lại `idempotencyKey` cũ không tạo lệnh trùng, và chứng minh lệnh không được ack đúng hạn sẽ tự chuyển `TIMEOUT` rồi từ chối ack trễ.

## Giới hạn hiện tại

Xem `../PROGRESS.md` — chưa có Edge Node, chưa có MQTT broker thật, chưa có retention/xoá dữ liệu `device_heartbeats` cũ (mới dừng ở tổng hợp theo cửa sổ, chưa có job xoá cửa sổ quá cũ).
