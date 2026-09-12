# Mobile API — Android / iOS

API mobile dùng chung với PMS, đặt sau gateway `3100` (LAN) hoặc HTTPS ở môi trường public. Mobile không truy cập PostgreSQL, Edge Node hay service nội bộ trực tiếp.

App không yêu cầu người dùng nhập địa chỉ máy chủ. Bản public dùng endpoint HTTPS cố định từ cấu hình build; trong LAN app phát UDP `ANIO_DISCOVER_V1` tới cổng `53535`, lấy IP nguồn của phản hồi rồi xác minh bằng `GET /api/backend/api/v1/mobile/discovery` trước khi đăng nhập. Endpoint đã xác minh gần nhất được lưu và tự thay khi người dùng đổi mạng.

## Xác thực

```http
POST /api/backend/api/v1/auth/login
Content-Type: application/json

{"username":"owner","password":"..."}
```

Response trả `access_token` JWT 12 giờ. Gửi token ở mọi request tiếp theo:

```http
Authorization: Bearer <access_token>
```

Không lưu mật khẩu; token phải nằm trong Android Keystore / iOS Keychain. Production chỉ cho phép HTTPS, giới hạn origin/gateway và ghi audit cho lệnh điện, khóa, thiết bị, thanh toán.

## Bootstrap và nhiều cơ sở

`GET /api/v1/mobile/bootstrap` trả user, `capabilities`, `properties`, `current_property_id` và summary. OWNER/MANAGER có thể chọn cơ sở cùng `tenant_id` bằng header `X-Property-Id: <id>` trên mọi API nghiệp vụ. HOUSEKEEPING/TECHNICIAN/RECEPTIONIST chỉ được cơ sở trong access token. Máy chủ trả `403` nếu cơ sở yêu cầu không thuộc phạm vi tài khoản.

## Màn hình tổng quan

`GET /api/v1/mobile/overview?propertyId=<id>` trả:

- `summary`: KPI dashboard hiện có.
- `counts.rooms`: VACANT/OCCUPIED/DIRTY/MAINTENANCE.
- `counts.devices`: ONLINE/OFFLINE/ERROR.
- `counts.open_maintenance`: phiếu mở hoặc đang xử lý.
- `updated_at`: thời điểm server tổng hợp.

`GET /api/v1/mobile/work-queue` trả hàng đợi theo vai trò:

- Chủ cơ sở/quản lý: phòng bẩn, thiết bị mất kết nối/lỗi, bảo trì mở.
- Nhân viên dọn phòng: chỉ phòng `DIRTY` và phiếu được giao.
- Kỹ thuật viên: thiết bị không online và phiếu bảo trì đang xử lý.

## API nghiệp vụ dùng lại

Mobile dùng cùng token với PMS cho `/api/v1/rooms`, `/api/v1/bookings`, `/api/v1/devices`, `/api/v1/maintenance`, `/api/v1/dashboard`, `/api/v1/value`. Lệnh thiết bị vẫn đi qua PMS → Edge → IoT; không cho app gọi thẳng IoT.

## Mã lỗi cần xử lý trên app

`401` yêu cầu đăng nhập lại; `403` không đủ vai trò hoặc cơ sở; `409` thiết bị chưa sẵn sàng/không an toàn; `429/503` thử lại theo backoff; `5xx` hiển thị trạng thái tạm thời và không tự lặp lệnh điện/khóa.
