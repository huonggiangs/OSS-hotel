# Biên bản nghiệm thu thiết bị thật — HQ → PMS → Edge → IoT

Tài liệu này là điều kiện để chuyển trạng thái **pilot phần cứng** sang **đã nghiệm thu**. `power_on` trong PMS chỉ là trạng thái nghiệp vụ; chỉ ghi nhận thành công khi có `iot_command_id`, ACK của Edge/IoT và heartbeat còn mới.

## Chuẩn bị

- [ ] Tạo tài sản ở HQ và cấp `asset_code` duy nhất.
- [ ] Tạo thiết bị trong PMS, gán đúng phòng/tầng/khu và nhập cùng `asset_code`.
- [ ] Gán `iot_device_id` của driver/IoT Service; kiểm tra không trùng mã.
- [ ] Edge có `edge_node_id`, property đúng, heartbeat < 5 phút và `pending_outbox_count = 0`.
- [ ] Ghi nhận công tơ/meter cho tối đa 10 phòng pilot; chụp baseline tối thiểu 7 ngày.

## Kịch bản bắt buộc cho từng thiết bị

| Bước | Thao tác | Kết quả cần lưu |
|---|---|---|
| 1 | PMS bật điện phòng | `device_control_events = QUEUED`, có `iot_command_id` |
| 2 | Edge nhận và chuyển lệnh | `dispatched_at`, `dispatch_attempts` tăng đúng |
| 3 | Thiết bị thật ACK | `delivery_status = ACKNOWLEDGED`, có `acknowledged_at` |
| 4 | Tắt điện khi khách ra ngoài/trả phòng | Có audit log và ACK tương tự |
| 5 | Rút mạng Edge/thiết bị | Hiện cảnh báo stale/FAILED, không hiển thị thành công giả |
| 6 | Khôi phục mạng | Outbox retry idempotent, không phát lệnh trùng |
| 7 | Thu hồi/cấp thẻ (nếu có) | Đúng `CARD_DISPENSER`, ghi lịch sử cấp/thu hồi và người thao tác |

## Tiêu chí thoát pilot

- 30 ngày, tối thiểu 95% lệnh có ACK trong SLA đã cấu hình.
- Không có lệnh trùng hoặc sai phòng; mọi lỗi có alert, người nhận và thời điểm xử lý.
- Có bảng trước/sau cho kWh, chi phí điện, số lần gọi hỗ trợ và downtime.
- Chủ cơ sở ký biên bản; sau đó mới dùng số liệu làm đầu vào cho AI tối ưu.
