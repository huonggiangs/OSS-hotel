# Module Spec — Khách hàng 360

## 1. Mục tiêu

Một hồ sơ khách hàng (khách sạn) duy nhất, hợp nhất dữ liệu từ cả hai sản phẩm, để bất kỳ ai ở công ty (sales, support, kế toán, ban điều hành) tra cứu một nơi thay vì đăng nhập nhiều hệ thống.

## 2. Dữ liệu hợp nhất

| Trường | Nguồn |
|---|---|
| Thông tin khách sạn (tên, địa chỉ, người liên hệ) | Nhập tại HQ Console hoặc đồng bộ từ sản phẩm đầu tiên khách dùng |
| Sản phẩm đang dùng (Kiosk / Smart Hotel OS / cả hai) | `customer_products`, liên kết `tenant_id` (SHO) và/hoặc `kiosk_customer_id` |
| Gói dịch vụ & trạng thái subscription | Đồng bộ từ Admin API từng sản phẩm |
| Đối tác phụ trách | `partner_customer_assignments` |
| Lịch sử hỗ trợ | `customer_support_tickets` (tạo trực tiếp tại HQ Console, hoặc đồng bộ ticket từ hệ thống support nếu có riêng) |
| Tình trạng thanh toán/công nợ | `customer_billing_status`, tổng hợp từ billing hai sản phẩm |

## 3. Chức năng

1. Tìm kiếm khách hàng theo tên/khu vực/đối tác/sản phẩm đang dùng.
2. Xem lịch sử đầy đủ: ngày ký hợp đồng, ngày kích hoạt từng sản phẩm, lịch sử nâng/hạ gói.
3. Tạo ticket hỗ trợ nội bộ, gán người xử lý.
4. Cảnh báo khách hàng rủi ro rời bỏ (churn risk): không gia hạn, giảm sử dụng bất thường, nhiều ticket chưa xử lý.

## 4. Ràng buộc

- Không lưu trùng lặp dữ liệu nghiệp vụ chi tiết (booking, room) — chỉ tổng hợp cấp khách hàng/subscription.
- Đối tác chỉ xem được khách hàng mình phụ trách (đồng nhất `PERMISSION_MATRIX.md`).

## 5. Tiêu chí chấp nhận

1. Một khách hàng dùng cả Kiosk và Smart Hotel OS hiển thị đúng cả hai sản phẩm trong hồ sơ.
2. Tạo ticket hỗ trợ và theo dõi được tới khi đóng.
3. Cảnh báo churn risk kích hoạt đúng khi mô phỏng một khách hàng không gia hạn.
