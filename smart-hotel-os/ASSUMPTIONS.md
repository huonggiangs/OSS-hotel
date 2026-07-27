# Assumptions — Smart Hotel OS

Ghi lại mọi giả định khi tài liệu gốc (`Sanpham.docx`, `CLAUDE.md`) chưa xác định rõ. Không được âm thầm tự quyết định — mọi giả định phải xuất hiện ở đây.

1. **Kiosk và Smart Hotel OS là hai sản phẩm bán riêng** (đã xác nhận với người yêu cầu ngày 2026-07-25) — Kiosk tích hợp vào Smart Hotel OS qua API mở, không dùng chung codebase/database.
2. **Cổng thanh toán**: chưa xác nhận nhà cung cấp cụ thể (VNPay/Momo/ZaloPay/Stripe). Giả định ưu tiên thị trường Việt Nam trước, để trống lựa chọn cuối trong `DECISIONS.md` cho tới khi có xác nhận.
3. **Nguồn dữ liệu giá đối thủ (competitor prices)** cho AI Pricing Phase 2: chưa xác định nhà cung cấp/phương pháp thu thập hợp pháp. Không tự bịa API cào dữ liệu OTA.
4. **Nguồn dữ liệu sự kiện khu vực** (lễ hội, hội nghị) cho AI Pricing Phase 2: chưa xác định, tương tự mục 3.
5. **Giao thức API chính thức của Booking.com/Agoda/Airbnb**: cần xác nhận theo tài liệu đối tác chính thức (nhiều OTA yêu cầu đăng ký Channel Manager Partner trước khi có API key) — chưa giả định chi tiết request/response cụ thể trong `MODULE_CHANNEL_MANAGER_BOOKING.md`, chỉ mô tả hành vi nghiệp vụ.
6. **Message bus cụ thể** (NATS JetStream vs Kafka): đề xuất NATS JetStream cho phù hợp offline-friendly edge, nhưng đây là đề xuất chưa phải quyết định cuối — xem `DECISIONS.md`.
7. **Tuân thủ pháp lý bảo vệ dữ liệu cá nhân**: chưa có tư vấn pháp lý chính thức tại thời điểm viết tài liệu, cần rà soát trước khi thương mại hoá (xem `SECURITY_THREAT_MODEL.md` mục 5).
8. **Mô hình Edge Node phần cứng**: giả định chạy trên máy tính lễ tân hiện có hoặc một mini-server nhẹ tại chỗ; chưa xác định SKU phần cứng cụ thể — nằm ngoài phạm vi tài liệu phần mềm này.
9. **Webhook cho HQ Console**: `docs/API_SPECIFICATION.md` mục 9 (Admin API) hiện chỉ có endpoint kéo (pull) — giả định sẽ bổ sung webhook đẩy (`tenant.created`, `subscription.changed`, `subscription.cancelled`) khi triển khai `hq-console/docs/SYSTEM_ARCHITECTURE.md` mục 3, chưa thiết kế chi tiết payload.
10. **`property-windows` không dùng cơ chế license theo thiết bị** như sản phẩm Kiosk — giả định đăng nhập bằng tài khoản property thông thường là đủ; cần xác nhận lại nếu về sau phát sinh nhu cầu kiểm soát số lượng máy cài đặt trên mỗi property.
