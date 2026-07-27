# Module Spec — PMS Core

Bắt buộc ở mọi gói dịch vụ. "Trái tim" của hệ thống — mọi module khác đọc/ghi qua PMS Core.

## 1. Quản lý phòng

- Loại phòng (`room_types`): tên, sức chứa, tiện nghi, giá cơ bản, hình ảnh.
- Phòng (`rooms`): số phòng, tầng, thuộc loại phòng, trạng thái hiện tại.
- Trạng thái phòng: `VACANT_CLEAN`, `OCCUPIED`, `VACANT_DIRTY`, `CLEANING`, `MAINTENANCE` (state machine đầy đủ ở `DATA_MODEL.md`).
- Giá phòng cơ bản + giá theo ngày/mùa (`rate_plans`, `seasonal_rates`) — là input cho AI Pricing Engine, không phải do AI Pricing sở hữu dữ liệu gốc.

## 2. Booking lifecycle

Trạng thái: `PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT`, nhánh `CANCELLED`, `NO_SHOW`.

Luồng bắt buộc hỗ trợ:
1. Đặt phòng (từ Direct Booking, OTA qua Channel Manager, hoặc nhập tay tại quầy).
2. Check-in: gán phòng cụ thể, xác nhận danh tính khách, cập nhật trạng thái phòng → `OCCUPIED`, kích hoạt sự kiện `booking.checked_in` lên Event Bus (IoT Service lắng nghe để bật điện/điều hòa).
3. Check-out: tính phí phát sinh, cập nhật trạng thái phòng → `VACANT_DIRTY`, phát sự kiện `booking.checked_out` (IoT tắt điện, CRM kích hoạt campaign, Revenue ghi nhận doanh thu).
4. Gia hạn lưu trú (extend stay) — kiểm tra phòng còn trống đêm tiếp theo trước khi cho phép.
5. Hủy booking — hoàn tiền theo chính sách, giải phóng tồn phòng, đồng bộ lại OTA qua Channel Manager.
6. Walk-in: tạo booking + check-in trong một thao tác, không yêu cầu đặt trước.
7. Group booking: một `group_booking` liên kết nhiều `booking_rooms`, cho phép check-in/check-out hàng loạt.

## 3. Hồ sơ khách (guest profile)

- Thông tin cơ bản, lịch sử lưu trú (`guest_stay_history`), hành vi tiêu dùng (dịch vụ đã dùng, chi tiêu trung bình) — là input cho CRM Service phân loại khách.
- Không lưu passport/dữ liệu sinh trắc học đầy đủ trừ khi bắt buộc theo pháp luật lưu trú; nếu tích hợp Kiosk, chỉ nhận kết quả xác thực (đã check-in thành công), không nhận lại ảnh khuôn mặt/scan hộ chiếu gốc.

## 4. Ràng buộc chống overbooking (nội bộ)

Trước khi xác nhận bất kỳ booking nào (bất kể nguồn: web, OTA, walk-in), PMS Core phải khoá tồn phòng (row-level lock hoặc distributed lock theo `room_type_id` + ngày) để tránh hai request cùng giữ chỗ một phòng cuối cùng. Đây là nguồn sự thật duy nhất (source of truth) mà Channel Manager phải đồng bộ theo, không ngược lại.

## 5. Sự kiện phát ra (Event Bus)

```
booking.created
booking.confirmed
booking.checked_in
booking.checked_out
booking.cancelled
booking.no_show
room.status_changed
```

## 6. Tiêu chí chấp nhận module

1. Tạo booking từ 3 nguồn (web nội bộ, walk-in, giả lập OTA) không tạo ra overbooking khi chạy đồng thời.
2. Check-in cập nhật đúng trạng thái phòng và phát sự kiện để IoT nhận được trong vòng vài giây.
3. Check-out tính đúng phụ phí và tồn tại bản ghi doanh thu tương ứng ở Revenue Service.
4. Hủy booking giải phóng tồn phòng và Channel Manager phản ánh lại OTA.
5. Toàn bộ thao tác trên có audit log với người/thời gian/giá trị trước-sau.
