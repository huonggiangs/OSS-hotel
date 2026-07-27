# Product Requirements Document — Smart Hotel OS

Trạng thái: Draft v0.1 — chờ duyệt trước khi code (xem quy tắc ở `README.md`).

## 1. Bối cảnh và mục tiêu

Chủ cơ sở lưu trú vừa và nhỏ tại Việt Nam hiện phụ thuộc: (a) OTA cho phần lớn doanh thu, (b) nhân sự trực 24/7 cho lễ tân/dọn phòng, (c) vận hành thủ công điện/điều hòa gây lãng phí, (d) không có công cụ định giá linh hoạt. Smart Hotel OS giải quyết cả bốn điểm nghẽn trong một nền tảng, bán theo mô hình "gói tối ưu vận hành" chứ không bán phần mềm đơn thuần.

### 1.1 KPI mục tiêu (cam kết với khách hàng)

| KPI | Mục tiêu |
|---|---|
| Giảm chi phí nhân sự | 30–50% |
| Giảm chi phí điện năng | 20–40% |
| Tăng doanh thu | 10–25% |
| Giảm phụ thuộc OTA | Tỷ trọng doanh thu OTA giảm dần qua Direct Booking Engine |

Các KPI này phải đo được bằng dữ liệu hệ thống tự thu thập (Revenue Dashboard, Energy Log), không dựa vào ước lượng thủ công, để dùng làm bằng chứng bán hàng.

## 2. Đối tượng người dùng (personas)

| Persona | Vai trò | Nhu cầu chính |
|---|---|---|
| Chủ chuỗi / chủ cơ sở | Owner | Xem doanh thu, tỷ lệ lấp phòng, phê duyệt từ xa, không cần có mặt |
| Quản lý cơ sở | Property Manager | Vận hành hàng ngày, báo cáo, phân ca |
| Lễ tân | Front Desk | Booking, check-in/out, walk-in, xử lý sự cố khách |
| Nhân viên dọn phòng | Housekeeping | Nhận việc theo phòng, cập nhật trạng thái dọn phòng, báo hỏng thiết bị |
| Kỹ thuật | Maintenance | Xử lý cảnh báo IoT/thiết bị |
| Nhà cung cấp dịch vụ (chúng ta) | Super Admin / Ops | Vận hành nền tảng cho nhiều khách hàng, billing, hỗ trợ |
| Đại lý/Partner | Reseller | Bán và triển khai cho khách hàng khu vực mình phụ trách |

## 3. Mô hình kinh doanh — 3 gói (bắt buộc phản ánh trong phân quyền & feature flag)

| Gói | Bao gồm |
|---|---|
| Gói 1 — Entry | PMS Core + Kiosk integration (nếu khách có), giá thấp |
| Gói 2 — Growth | + Channel Manager, AI Pricing (rule-based), Revenue Dashboard |
| Gói 3 — Pro | + IoT Energy, CRM Automation, AI Pricing nâng cao, Full automation loop |

Hệ thống phải kiểm soát tính năng theo gói ở tầng backend (feature flag theo `subscription_id`), không chỉ ẩn UI.

## 4. Yêu cầu chức năng theo module

### 4.1 PMS Core (bắt buộc, mọi gói)
Quản lý phòng (loại phòng, số phòng, trạng thái: trống/đang ở/dọn phòng/bảo trì), giá phòng theo ngày/mùa, booking (đặt/check-in/check-out/gia hạn/hủy/walk-in/nhóm phòng), hồ sơ khách (thông tin, lịch sử lưu trú, hành vi tiêu dùng). Chi tiết: `MODULE_PMS_CORE.md`.

### 4.2 Channel Manager (Gói 2+)
Tích hợp Booking.com, Agoda, Traveloka, Airbnb, Facebook/Zalo/TikTok; đồng bộ tồn phòng và giá hai chiều real-time; nhận booking từ OTA; chống overbooking bằng inventory lock tập trung. Chi tiết: `MODULE_CHANNEL_MANAGER_BOOKING.md`.

### 4.3 Direct Booking Engine (Gói 2+)
Website booking, QR booking, landing page, mini app Zalo/Web; thanh toán online; voucher, combo, upsell dịch vụ. Chi tiết: `MODULE_CHANNEL_MANAGER_BOOKING.md`.

### 4.4 AI Pricing Engine (Gói 2+ rule-based, Gói 3 nâng cao)
Phase 1: rule-based theo occupancy/ngày trong tuần/sự kiện. Phase 2: mô hình dự đoán dùng lịch sử giá, mùa vụ, giá đối thủ. Output: giá đề xuất theo ngày/giờ, con người vẫn duyệt trước khi áp dụng (không tự động đẩy giá không giám sát ở Phase 1). Chi tiết: `MODULE_AI_PRICING.md`.

### 4.5 IoT Energy Management (Gói 3)
Điều khiển điện phòng, điều hòa, nước nóng; luật: tắt khi check-out, giảm khi không có người, bật trước N phút khi có check-in dự kiến. Phải hoạt động được ở chế độ edge-offline khi mất kết nối cloud. Chi tiết: `MODULE_IOT_ENERGY.md`.

### 4.6 Kiosk Integration (tùy chọn, tích hợp ngoài)
Không tự phát triển lại kiosk trong repo này. Cung cấp API cho hệ thống Kiosk Remote Management (sản phẩm riêng) gọi vào: lấy booking để check-in, xác nhận thanh toán, kích hoạt IoT phòng, cập nhật trạng thái phòng.

### 4.7 Revenue Dashboard (bắt buộc, mọi gói)
Doanh thu ngày/tháng, tỷ lệ lấp phòng, ADR, RevPAR, so sánh kỳ trước, lợi nhuận ước tính; kèm module chống thất thoát (so sánh booking vs check-in thực tế, phát hiện sửa giá bất thường). Chi tiết: `MODULE_REVENUE_DASHBOARD.md`.

### 4.8 CRM & Marketing Automation (Gói 3)
Phân loại khách (mới/quay lại), gửi SMS/Zalo/Email tự động theo trigger (check-out → mã giảm giá, 30 ngày không quay lại → nhắc, sinh nhật → voucher). Chi tiết: `MODULE_CRM_MARKETING.md`.

## 5. Yêu cầu phi chức năng

1. **Offline-first**: PMS Core và IoT edge phải tiếp tục vận hành khi mất Internet; đồng bộ lại khi có mạng, có cơ chế phát hiện và giải quyết xung đột dữ liệu (conflict resolution) khi hai nguồn ghi đè cùng bản ghi.
2. **Multi-property**: một chủ có nhiều cơ sở, một cơ sở có nhiều loại phòng/phòng; Super Admin và Owner phải xem được dashboard tổng hợp toàn chuỗi.
3. **Real-time sync**: thay đổi tồn phòng/giá phải phản ánh sang các kênh OTA trong thời gian ngắn (mục tiêu < 60 giây) để tránh overbooking.
4. **Khả năng mở rộng**: kiến trúc phải scale-out được tới hàng nghìn cơ sở lưu trú và hàng trăm nghìn thiết bị IoT/kiosk đồng thời mà không phải viết lại kiến trúc (chi tiết ở `SYSTEM_ARCHITECTURE.md`).
5. **API mở**: cho phép bên thứ ba (OTA nội địa, ERP, kiosk vendor khác) tích hợp qua API có version, có API key/OAuth2, có rate limit.
6. **Phân quyền chặt**: Chủ, Quản lý, Lễ tân, Kỹ thuật có quyền khác nhau; mọi kiểm tra quyền thực hiện ở backend.
7. **Audit đầy đủ**: mọi thao tác sửa giá, hủy booking, thay đổi cấu hình IoT phải ghi log có người thực hiện, thời gian, giá trị trước/sau.

## 6. Ràng buộc (constraints)

- Không tự ý bịa giao thức của thiết bị IoT hoặc API của OTA — nếu tài liệu OTA/thiết bị chưa xác nhận, phải ghi rõ giả định trong `ASSUMPTIONS.md`.
- Không gộp codebase với sản phẩm Kiosk Remote Management.
- Không tự động áp giá AI mà không cho phép override thủ công ở Phase 1.
- Không tắt điện/điều hòa khi phòng đang có khách check-in hợp lệ, kể cả khi có luật tiết kiệm năng lượng.
- Không gửi dữ liệu cá nhân khách (passport, khuôn mặt) ra ngoài phạm vi cần thiết; tuân thủ nguyên tắc che dữ liệu nhạy cảm như trong `kiosk.md` mục 12.

## 7. Ngoài phạm vi (out of scope, giai đoạn hiện tại)

- Không tự phát triển phần cứng kiosk (đã có sản phẩm riêng).
- Không tự phát triển cổng thanh toán riêng — tích hợp cổng thanh toán bên thứ ba (VNPay/Momo/ZaloPay/Stripe tùy thị trường), quyết định cụ thể ghi ở `DECISIONS.md`.
- Không cam kết high-availability đa vùng (multi-region) ở MVP — nằm trong roadmap Giai đoạn 3, xem `ROADMAP.md`.

## 8. Tiêu chí chấp nhận PRD này

PRD được coi là đủ để bắt đầu thiết kế kiến trúc khi: (1) toàn bộ module ở mục 4 có tài liệu chi tiết tương ứng, (2) mô hình 3 gói ánh xạ được vào feature flag, (3) các ràng buộc offline-first và multi-property có phương án kỹ thuật rõ trong `SYSTEM_ARCHITECTURE.md`.
