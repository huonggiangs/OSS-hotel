# Module Spec — Revenue Dashboard & Anti-Loss Prevention

Bắt buộc ở mọi gói — đây là màn hình chủ cơ sở/chủ chuỗi nhìn vào mỗi ngày, nên độ chính xác và độ trễ dữ liệu là ưu tiên cao nhất của module này.

## 1. Chỉ số bắt buộc

| Chỉ số | Công thức / nguồn |
|---|---|
| Doanh thu hôm nay/tháng | Tổng `payment_transactions` SUCCESS + phụ phí check-out, theo property/theo chuỗi |
| Tỷ lệ lấp phòng (Occupancy) | Số phòng đã bán / tổng số phòng khả dụng, theo ngày |
| ADR (Average Daily Rate) | Doanh thu phòng / số phòng đã bán |
| RevPAR | Doanh thu phòng / tổng số phòng khả dụng (= ADR × Occupancy) |
| So sánh kỳ trước | Cùng kỳ tháng trước / cùng kỳ năm trước |
| Lợi nhuận ước tính | Doanh thu − chi phí ước tính (điện, nhân sự nếu nhập được) — hiển thị ước lượng, ghi rõ đây là ước tính không phải kế toán chính thức |

## 2. Chống thất thoát (loss prevention)

1. So sánh số booking hệ thống ghi nhận với số check-in thực tế tại quầy/kiosk — lệch bất thường (booking không có check-in tương ứng, hoặc check-in không có booking) sinh `loss_prevention_flags`.
2. Phát hiện sửa giá bất thường: nhân viên sửa giá phòng lệch nhiều so với `rate_plans`/`price_suggestions` mà không có lý do ghi chú → cảnh báo cho quản lý/chủ.
3. Toàn bộ thao tác sửa giá, hủy booking, hoàn tiền ghi audit log đầy đủ (người, thời gian, giá trị trước/sau) — dữ liệu này chính là input cho anti-loss detection, không phải hệ thống riêng.

## 3. Đối tượng xem

- Super Admin Web: tổng hợp toàn bộ khách hàng (dùng nội bộ, không lộ dữ liệu tài chính giữa các tenant).
- Property Web: dữ liệu của một cơ sở.
- Owner Mobile App: tổng hợp toàn chuỗi nếu chủ có nhiều cơ sở, dạng rút gọn cho di động.

## 4. Ràng buộc

- Revenue Service đọc dữ liệu tổng hợp (không query trực tiếp OLTP của PMS/Payment) để tránh ảnh hưởng hiệu năng giao dịch.
- Dữ liệu hiển thị phải có timestamp "cập nhật lúc" rõ ràng vì có thể có độ trễ tổng hợp.

## 5. Tiêu chí chấp nhận module

1. Doanh thu hiển thị khớp với tổng `payment_transactions` SUCCESS trong cùng khoảng thời gian.
2. ADR/RevPAR tính đúng theo công thức chuẩn với dữ liệu giả lập.
3. Một trường hợp check-in không có booking tương ứng (giả lập) tạo ra flag chống thất thoát.
4. Owner Mobile App hiển thị đúng dữ liệu tổng hợp nhiều cơ sở cho một chủ chuỗi.
