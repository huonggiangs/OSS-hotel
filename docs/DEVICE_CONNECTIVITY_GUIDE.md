# Hướng dẫn kết nối thiết bị bên thứ ba

## 1. Mô hình chung

HQ Console là sổ gốc quản lý tài sản. Kỹ thuật viên mở **Thiết bị phần cứng**, gán thiết bị vào cơ sở và chọn **Cấu hình kết nối**. Hệ thống cấp:

- `asset_code`: mã định danh không đổi của thiết bị;
- `device_key`: khóa bí mật chỉ hiển thị một lần, máy chủ chỉ lưu bản băm;
- địa chỉ/kênh giao tiếp tương ứng HTTP, MQTT, TCP hoặc Firebase bridge.

Thiết bị gửi nhịp sống và số đo lên server. Lệnh từ PMS/HQ được ghi DB trước, có `command_id`, khóa chống gửi trùng, thời hạn và trạng thái xác nhận. Vì vậy broker hoặc mạng tạm gián đoạn không làm mất dấu lệnh.

## 2. HTTP qua cổng HQ 3000

Base URL trong LAN:

```text
http://<IP-máy-chủ>:3000/api/backend/api/v1/device-gateway/<asset_code>
```

Mọi request gửi header `X-Device-Key`.

| Hành động | Method và path | Body |
| --- | --- | --- |
| Báo còn trực tuyến | `POST /heartbeat` | `{}` hoặc dữ liệu chẩn đoán |
| Gửi số đo | `POST /telemetry` | `{ "payload": { ... } }` |
| Nhận lệnh chờ xử lý | `GET /commands` | Không có |
| Xác nhận lệnh | `POST /commands/<command_id>/ack` | `{ "success": true, "message": "..." }` |

Thiết bị HTTP nên heartbeat mỗi 30–60 giây và poll lệnh mỗi 2–5 giây. Retry ACK được phép vì ACK là idempotent.

## 3. MQTT

Cấu hình broker cho IoT service bằng `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` trong file môi trường của services. Nên dùng `mqtts://`, tài khoản riêng và ACL theo topic.

- Thiết bị gửi lên: `hotel/<asset_code>/up`, QoS 1.
- Server gửi lệnh xuống: `hotel/<asset_code>/down`, QoS 1.
- Bản tin lên là JSON: `{"type":"heartbeat|telemetry|ack","deviceKey":"...","payload":{},"commandId":"...","result":{"success":true}}`.

## 4. TCP Socket

Thiết bị kết nối `<IP-máy-chủ>:7100`. Mỗi bản tin là một JSON kết thúc bằng ký tự xuống dòng. Bản tin đầu tiên bắt buộc:

```json
{"type":"auth","assetCode":"AST-000001","deviceKey":"..."}
```

Sau `auth_ok`, thiết bị gửi `heartbeat`, `telemetry`, `ack` cùng cấu trúc MQTT. Server có thể đẩy bản tin `command` trên chính socket. Bật TLS qua reverse proxy/TCP load balancer trước khi mở ra Internet.

## 5. Firebase bridge

Firebase không được nhúng khóa quản trị vào firmware. Một Cloud Function hoặc service bridge nhận/sinh sự kiện Firebase rồi gọi HTTP gateway bằng khóa riêng của thiết bị. Để đẩy lệnh ra bridge, cấu hình `FIREBASE_BRIDGE_URL` và `FIREBASE_BRIDGE_TOKEN`. Bridge phải trả mã HTTP 2xx khi đã nhận lệnh, sau đó gửi ACK về gateway khi thiết bị thực thi xong.

## 6. Checklist tích hợp cho kỹ thuật viên

- Khai báo serial, hãng/model, cơ sở, phòng/khu vực và giao thức tại HQ.
- Lưu `asset_code` và `device_key` vào vùng lưu trữ bảo mật của thiết bị; không ghi khóa vào log.
- Kiểm tra heartbeat làm thiết bị chuyển ONLINE ở HQ.
- Gửi một gói telemetry và kiểm tra `last_seen_at`.
- Gửi lệnh kiểm tra trạng thái, nhận đúng `command_id`, ACK và xem trạng thái ACKED.
- Ngắt mạng quá ngưỡng để kiểm tra OFFLINE/cảnh báo, sau đó nối lại.
- Cấp lại khóa ngay khi nghi ngờ lộ khóa; khóa cũ mất hiệu lực tức thì.

## 7. An toàn vận hành

- Không tự động ngắt tải quan trọng; firmware phải có override tại chỗ.
- Mỗi thiết bị có khóa riêng, khóa thô chỉ hiển thị một lần.
- Không mở API nội bộ cổng 4103 ra LAN/Internet; HTTP thiết bị dùng cổng HQ 3000.
- MQTT Internet phải dùng TLS/ACL; TCP Internet phải có TLS; Firebase bridge phải xác thực token.
- Mọi lệnh điện/khóa đều được ghi trước khi gửi và chỉ hoàn tất sau ACK.
