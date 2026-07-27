# Security Threat Model — Smart Hotel OS

## 1. Tài sản cần bảo vệ

- Dữ liệu khách (thông tin cá nhân, lịch sử lưu trú).
- Dữ liệu tài chính (doanh thu, giao dịch thanh toán).
- Credential kết nối OTA/payment/thiết bị IoT.
- Quyền điều khiển thiết bị vật lý (điện/điều hòa) — rủi ro an toàn vật lý nếu bị chiếm quyền.
- Tính toàn vẹn tồn phòng/giá (chống overbooking/gian lận giá).

## 2. Threat theo nhóm (STRIDE rút gọn)

| Nhóm | Rủi ro cụ thể | Biện pháp |
|---|---|---|
| Spoofing | Giả mạo webhook OTA/payment | Xác thực chữ ký webhook, whitelist IP nếu nhà cung cấp hỗ trợ |
| Tampering | Sửa giá trực tiếp trong DB, sửa dữ liệu telemetry IoT giả | Mọi thay đổi qua API có validate + audit log; IoT command ký số |
| Repudiation | Nhân viên chối đã sửa giá/hủy booking | Audit log đầy đủ, không thể xoá, có trước/sau |
| Information Disclosure | Lộ dữ liệu khách giữa các tenant | Cô lập `tenant_id` ở tầng schema + kiểm tra ở mọi query, không dựa vào lọc tầng UI |
| Denial of Service | OTA gửi webhook dồn dập, IoT gửi telemetry tần suất cao | Rate limiting theo tenant/client, queue đệm, backpressure |
| Elevation of Privilege | Lễ tân truy cập chức năng quản lý/chủ | RBAC kiểm tra ở backend cho mọi endpoint (xem `PERMISSION_MATRIX.md`) |

## 3. Rủi ro đặc thù hệ thống

1. **Chiếm quyền điều khiển IoT**: kẻ tấn công gửi lệnh tắt điện hàng loạt gây gián đoạn dịch vụ hoặc ảnh hưởng an toàn khách. Biện pháp: xác thực mTLS hoặc token thiết bị theo từng Edge Node, lệnh có `expires_at` và idempotency theo `command_id`, giới hạn tốc độ gửi lệnh theo property.
2. **Giả mạo booking OTA để chiếm phòng miễn phí**: xác thực webhook + đối soát định kỳ với API chính thức của OTA.
3. **Lộ giá đối thủ/dữ liệu AI Pricing nội bộ**: giới hạn quyền xem `competitor_prices` và rule giá theo role, không public qua API không xác thực.
4. **Tấn công vào Edge Node tại cơ sở** (thiết bị vật lý tại khách sạn dễ bị truy cập trực tiếp hơn cloud): giới hạn quyền hệ điều hành, mã hoá dữ liệu cục bộ, cập nhật vá lỗi định kỳ, không mở cổng quản trị ra Internet công khai.

## 4. Yêu cầu bảo mật bắt buộc (đồng nhất chuẩn đã áp dụng cho Kiosk — `kiosk.md` mục 14)

HTTPS bắt buộc; băm mật khẩu; MFA cho tài khoản quản trị/chủ; rate limiting; khoá tài khoản sau nhiều lần đăng nhập sai; xoay vòng refresh token; mã hoá secret khi lưu trữ (credential OTA, payment, camera nếu tích hợp); ký số cho gói cập nhật Edge Node nếu có cơ chế OTA update; kiểm tra input; chống SQL injection/XSS; secure headers; validate file upload; không ghi mật khẩu/token/dữ liệu cá nhân đầy đủ vào log.

## 5. Việc cần làm trước khi thương mại hoá

- Pentest độc lập trước khi bán cho khách hàng đầu tiên có dữ liệu thật.
- Rà soát tuân thủ bảo vệ dữ liệu cá nhân theo quy định hiện hành (Nghị định về bảo vệ dữ liệu cá nhân tại Việt Nam) — cần tư vấn pháp lý, ghi nhận ở `ASSUMPTIONS.md` là chưa xác nhận tại thời điểm viết tài liệu này.
