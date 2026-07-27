# Module Spec — CRM & Marketing Automation

Gói 3 (Pro). Mục tiêu: tăng tỷ lệ khách quay lại, khép kín vòng lặp tự động Booking → Check-in → IoT → Checkout → Marketing (CLAUDE.md mục 3).

## 1. Phân loại khách (segmentation)

Segment mặc định: `NEW_GUEST`, `RETURNING_GUEST`, `VIP` (theo tổng chi tiêu/số lần lưu trú, ngưỡng cấu hình được), `INACTIVE_30D`, `INACTIVE_90D`. Segment tính lại định kỳ (batch job hàng ngày) dựa trên `guest_stay_history` từ PMS Core.

## 2. Campaign & trigger tự động

| Trigger | Hành động mặc định (cấu hình được) |
|---|---|
| `booking.checked_out` | Gửi cảm ơn + mã giảm giá cho lần đặt tiếp theo |
| Không quay lại sau 30 ngày | Gửi nhắc nhở/ưu đãi kích hoạt lại |
| Sinh nhật khách | Gửi voucher |
| Khách chuyển sang `VIP` | Thông báo nội bộ cho lễ tân + ưu đãi riêng |

Mỗi campaign gồm: điều kiện trigger, segment mục tiêu, template nội dung, kênh gửi, giới hạn tần suất (tránh spam một khách nhiều lần).

## 3. Kênh gửi

SMS, Zalo (qua Zalo OA API), Email. Notification Service điều phối gửi và retry; CRM Service chỉ tạo yêu cầu gửi, không tự gọi thẳng nhà cung cấp — tách để dễ thêm kênh mới (vd. push app) mà không sửa CRM Service.

## 4. Dữ liệu và quyền riêng tư

- `message_log` lưu nội dung đã gửi, trạng thái gửi (SUCCESS/FAILED), nhưng che số điện thoại khi hiển thị trên UI không cần thiết (đồng nhất nguyên tắc che dữ liệu nhạy cảm ở `kiosk.md` mục 12).
- Khách có thể được đánh dấu `opt_out` — campaign phải tôn trọng, không gửi tiếp.

## 5. Tiêu chí chấp nhận module

1. Một booking check-out giả lập kích hoạt đúng campaign cảm ơn trong thời gian ngắn sau sự kiện.
2. Khách đánh dấu `opt_out` không nhận được bất kỳ campaign nào sau đó.
3. Segment khách cập nhật đúng sau khi có thêm lịch sử lưu trú mới.
4. `message_log` phản ánh đúng trạng thái gửi thực tế từ nhà cung cấp kênh.
