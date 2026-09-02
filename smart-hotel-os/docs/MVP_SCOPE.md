# MVP_SCOPE — phạm vi khóa theo nhu cầu khách hàng

**Need refs:** `N1,N2,N3,N4,N5` trong [nhucau.md](../../nhucau.md).
**Quy tắc:** một việc không gắn được `N#` và KPI thì không được tự động đưa vào MVP.

## In scope — phải chạy được trong MVP

| Scope | Need refs | Tiêu chí |
|---|---|---|
| PMS core: phòng, đặt phòng, check-in/out, khách, dịch vụ, thanh toán, housekeeping | N1,N3,N5 | Dữ liệu DB, luồng có audit, trạng thái phòng nhất quán |
| Giá linh hoạt theo loại phòng và lấp đầy | N1 | Có giá sàn, phê duyệt, lịch sử; không tự đổi giá khi chưa được phép |
| Device registry và mapping HQ–PMS–Edge–IoT | N2,N3,N4,N5 | `asset_code` + property + vị trí + heartbeat + trạng thái vòng đời |
| Điều khiển điện có xác nhận | N2,N3,N4 | Có hàng đợi, idempotency, retry, ACK/FAILED; thiết bị chưa map không nhận lệnh |
| Báo hỏng/bảo trì | N3,N4,N5 | Nhiều lỗi, mô tả, ảnh/video, trạng thái, đối tác và audit |
| HQ customer onboarding và bàn giao tài khoản | N3,N4,N5 | Tạo property/OWNER, hiển thị credential một lần, email có trạng thái thật |
| Mobile-first cho các luồng vận hành | N3,N4,N5 | Không tràn ngang ở 390px; hành động chính nằm trong một màn hình |

## Out of scope cho tới khi có bằng chứng KPI

- AI cảnh báo/predictive maintenance không có dữ liệu lịch sử.
- Camera AI khi chưa có camera/NVR, chính sách riêng tư và người trực xử lý.
- Dashboard lợi nhuận hợp nhất khi chưa có dữ liệu kế toán, OTA, điện thật.
- Public Internet không có TLS/VPN/MFA/backup/monitoring.
- Tự động ngắt tải an toàn-critical mà không có chính sách và override thủ công.

## Definition of Done

`DONE = source + typecheck + migration/backup + API/UI test + dữ liệu/pilot thực + KPI evidence`.
`READY_FOR_PILOT` được phép khi mới đạt source/typecheck/test nhưng còn thiếu thiết bị thật hoặc baseline. Không gọi `READY_FOR_PILOT` là `PRODUCTION ROI`.
