# Module Spec — Channel Manager & Direct Booking Engine

Gói 2 (Growth) trở lên. Đây là điểm cạnh tranh trực tiếp với OTA và điểm giảm phụ thuộc OTA — coi là ưu tiên cao sau PMS Core.

## Phần A — Channel Manager

### A.1 Phạm vi kênh (MVP)

Booking.com, Agoda, Airbnb (theo yêu cầu CLAUDE.md gốc). Traveloka, Facebook/Zalo/TikTok đưa vào giai đoạn sau (xem `ROADMAP.md`). Mỗi kênh là một adapter riêng trong `channel-manager-service`, không giả định tất cả kênh dùng chung một giao thức — nhất quán nguyên tắc "không bịa SDK" áp dụng cho thiết bị ở `kiosk.md` mục 21, áp dụng tương tự cho OTA API.

### A.2 Đồng bộ tồn phòng và giá

- PMS Core là nguồn sự thật (source of truth). Mọi thay đổi tồn phòng/giá tại PMS phát sự kiện `inventory.changed` / `rate.changed` → Channel Manager đẩy sang từng OTA đã kết nối.
- Đồng bộ hai chiều: OTA gửi booking mới về qua webhook → Channel Manager ghi `ota_bookings_inbound` → gọi PMS Core để khoá phòng như một booking bình thường.
- Mục tiêu độ trễ đồng bộ: dưới 60 giây kể từ khi thay đổi tại PMS.

### A.3 Chống overbooking

1. PMS Core là nơi khoá tồn phòng cuối cùng (xem `MODULE_PMS_CORE.md` mục 4).
2. Nếu hai OTA cùng gửi booking cho phòng cuối cùng gần như đồng thời, request thứ hai bị PMS từ chối; Channel Manager phải tự động gọi API OTA để đóng băng/huỷ booking thừa và ghi nhận vào `overbooking_incidents` để admin xử lý thủ công với khách nếu cần.
3. Mọi sự cố overbooking phải cảnh báo real-time tới Property Web và Owner Mobile App.

### A.4 Trạng thái đồng bộ hiển thị trên UI

```
CHƯA ĐỒNG BỘ → ĐANG ĐỒNG BỘ → ĐÃ ĐỒNG BỘ → LỖI ĐỒNG BỘ
```

## Phần B — Direct Booking Engine

### B.1 Kênh bán trực tiếp

- Website booking (mỗi property có trang riêng, tuỳ biến thương hiệu).
- QR booking (đặt phòng qua QR tại quầy/marketing offline).
- Mini app Zalo/Web landing page.

### B.2 Thanh toán

- Tích hợp cổng thanh toán bên thứ ba (VNPay/Momo/ZaloPay tối thiểu cho thị trường VN — quyết định cụ thể ghi ở `DECISIONS.md`).
- `payment_transactions` lưu trạng thái: `INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`.
- Webhook thanh toán phải idempotent theo `transaction_id` của provider.

### B.3 Voucher, combo, upsell

- Voucher: mã giảm giá, % hoặc số tiền cố định, giới hạn số lần dùng, ngày hết hạn — liên kết được với campaign CRM (vd. mã tự động cấp sau checkout).
- Combo: gói phòng + dịch vụ (đưa đón, spa, ăn sáng) bán như một sản phẩm.
- Upsell: gợi ý nâng loại phòng/thêm dịch vụ tại bước thanh toán.

## Tiêu chí chấp nhận module

1. Thay đổi giá tại PMS phản ánh đúng sang OTA giả lập (sandbox) trong SLA đồng bộ.
2. Booking tạo song song từ Direct Booking và OTA giả lập cho cùng phòng cuối cùng không gây double-booking.
3. Một giao dịch thanh toán trực tiếp thành công tạo booking `CONFIRMED` và trừ tồn phòng ở PMS.
4. Voucher áp dụng đúng điều kiện, không dùng được quá số lần cho phép.
