# Module Spec — IoT Energy Management

Gói 3 (Pro). Lợi thế cạnh tranh chính so với PMS thuần phần mềm — kết hợp phần cứng thực tế tại phòng.

## 1. Phạm vi thiết bị

Điện phòng (ổ cắm/relay tổng), điều hòa (qua bộ điều khiển hồng ngoại/relay hoặc API hãng nếu có), nước nóng, công tắc thông minh. Không giả định tất cả thiết bị dùng chung giao thức — tách adapter theo hãng/model, theo đúng nguyên tắc đã áp dụng cho thiết bị ngoại vi ở `kiosk.md` mục 21.2–21.3.

## 2. Kiến trúc kết nối

Thiết bị phòng → kết nối tới **Edge Node tại cơ sở** (không kết nối thẳng lên Cloud) qua Wi-Fi/Zigbee/relay LAN → Edge Node giao tiếp MQTT với IoT Service trên Cloud. Điều này bảo đảm luật tiết kiệm điện vẫn chạy được khi mất Internet (offline-first).

## 3. Luật điều khiển (energy rules, cấu hình được per property/per room type)

```
booking.checked_out     → tắt điện + điều hòa sau N phút (mặc định 5 phút, có thể chỉnh)
room.no_motion_detected → giảm công suất điều hòa sau M phút không phát hiện người (nếu có cảm biến)
booking.checked_in dự kiến trong X phút → bật điện/điều hòa trước giờ nhận phòng dự kiến
booking.checked_in thực tế → bảo đảm điện đang bật, không tắt trong lúc khách ở
```

Ràng buộc bắt buộc: **không bao giờ tắt điện/điều hòa khi phòng đang ở trạng thái `OCCUPIED` với booking hợp lệ**, kể cả khi trigger tiết kiệm điện kích hoạt nhầm — đây là ràng buộc cứng, vi phạm coi là bug nghiêm trọng (P0).

## 4. Dữ liệu thu thập

- `device_telemetry`: công suất tiêu thụ theo thời gian (time-series), trạng thái bật/tắt, lỗi thiết bị.
- `energy_usage_daily`: tổng hợp theo phòng/property/ngày — dùng để chứng minh KPI giảm 20–40% điện năng cho khách hàng, và hiển thị trên Owner Mobile App.

## 5. Lệnh điều khiển hỗ trợ

```
POWER_ON
POWER_OFF
AC_SET_TEMPERATURE
AC_SET_MODE
DEVICE_STATUS_CHECK
DEVICE_RESTART
```

Mỗi lệnh có `command_id`, idempotent, có `expires_at`, ghi `device_command_results` — đồng nhất mô hình Remote Commands ở `kiosk.md` mục 11.

## 6. Trạng thái thiết bị hiển thị UI

```
ONLINE / OFFLINE / ERROR / MAINTENANCE_MODE
```

Không chỉ dùng màu để thể hiện trạng thái — phải kèm chữ (đồng nhất `kiosk.md` mục 21.14).

## 7. Tích hợp Kiosk (nếu khách hàng có)

Sau khi Kiosk phát thẻ phòng, Kiosk gọi `POST /api/v1/iot/rooms/{room_id}/activate` để bật điện/điều hòa ngay, không chờ chu kỳ luật tự động — trải nghiệm khách vào phòng có điện ngay lập tức.

## 8. Tiêu chí chấp nhận module

1. Check-out một booking giả lập → điện/điều hòa phòng tương ứng tắt trong thời gian cấu hình.
2. Trong lúc phòng `OCCUPIED`, không có lệnh tắt điện nào được gửi dù trigger tiết kiệm điện kích hoạt.
3. Mất kết nối Cloud, Edge Node vẫn thực hiện đúng luật cục bộ đã tải trước đó.
4. Báo cáo năng lượng theo ngày khớp với tổng telemetry ghi nhận.
