# Chuẩn API cho Đối tác/Bên thứ ba — Smart Hotel Group

Áp dụng chung cho mọi API expose ra ngoài công ty: API tích hợp Kiosk ↔ Smart Hotel OS, API cho đối tác/đại lý, API cho ERP/OTA nội địa bên thứ ba tích hợp vào Smart Hotel OS. Đây là tài liệu chuẩn dùng chung — từng sản phẩm áp dụng, không tự định nghĩa lại chuẩn bảo mật riêng.

## 1. Nguyên tắc

1. **Không tin tưởng mặc định (zero trust)**: mọi request từ bên ngoài phải xác thực + phân quyền, kể cả từ đối tác đã ký hợp đồng lâu năm.
2. **Nguyên tắc đặc quyền tối thiểu (least privilege)**: mỗi API key/OAuth client chỉ có scope tối thiểu cần thiết cho mục đích tích hợp đã đăng ký.
3. **Mọi thứ có version**: `/api/v1/...`, thay đổi breaking phải lên version mới, giữ version cũ chạy song song theo thời hạn deprecation đã thông báo (tối thiểu 90 ngày).

## 2. Xác thực

| Loại đối tác | Cơ chế |
|---|---|
| Server-to-server (ERP, OTA nội địa, tích hợp Kiosk↔SHO) | OAuth 2.0 Client Credentials — cấp `client_id`/`client_secret`, đổi lấy access token ngắn hạn (≤1 giờ) |
| Thiết bị/Edge Node | mTLS (chứng thư client riêng theo thiết bị) hoặc device token xoay vòng — đồng nhất mô hình đã áp dụng cho Windows Kiosk App (`kiosk.md` mục 3.1: "device credential/certificate riêng") |
| Webhook nhận từ đối tác (OTA, payment) | Xác thực chữ ký HMAC trên payload (header `X-Signature`), kèm kiểm tra `timestamp` để chống replay (từ chối nếu lệch quá 5 phút) |

Không dùng API key tĩnh dài hạn làm cơ chế xác thực chính cho tích hợp server-to-server mới — chỉ chấp nhận cho tích hợp cũ chưa nâng cấp được, phải ghi trong `DECISIONS.md` kèm kế hoạch thay thế.

## 3. Cấp quyền (authorization)

- Mỗi `api_client` gắn với danh sách scope cụ thể, ví dụ: `pms:booking:read`, `pms:checkin:write`, `iot:room:activate`. Không có scope `*` (toàn quyền) cấp cho bên ngoài.
- Scope kiểm tra ở API Gateway/BFF trước khi vào service nghiệp vụ, và kiểm tra lại lần hai ở service (defense in depth).

## 4. Giới hạn tốc độ & chống lạm dụng

- Rate limit mặc định theo tier hợp đồng (vd. 100 request/phút cho tier cơ bản, cao hơn cho đối tác lớn), cấu hình theo `api_client_id`.
- Chặn tạm thời (circuit breaker) một `api_client` nếu tỷ lệ lỗi bất thường cao (nghi ngờ tích hợp lỗi hoặc bị tấn công), thông báo cho đối tác qua kênh đã đăng ký.

## 5. Webhook (gửi tới đối tác)

- Ký mọi webhook gửi đi bằng HMAC-SHA256 với secret riêng theo từng đối tác.
- Retry có backoff, tối đa 24 giờ, sau đó đánh dấu `FAILED` và thông báo qua HQ Console (Release/Ops team xử lý thủ công).
- Idempotency: mỗi webhook có `event_id` duy nhất; đối tác được khuyến nghị (và tài liệu hoá rõ) xử lý idempotent phía họ.

## 6. Onboarding một đối tác/API client mới

```
1. Đối tác đăng ký qua HQ Console (Partner & Supplier module) hoặc Sales tạo hồ sơ
2. Xác định scope cần thiết theo mục đích tích hợp
3. Cấp client_id/client_secret (hoặc chứng thư mTLS) — hiển thị secret một lần duy nhất, sau đó chỉ hiện 4 ký tự cuối (đồng nhất nguyên tắc license key trong kiosk.md mục 5.1)
4. Cấp môi trường sandbox trước, đối tác test đầy đủ luồng trước khi lên production
5. Review bảo mật tối thiểu (checklist OWASP API Top 10, mục 7) trước khi bật production
6. Giám sát 30 ngày đầu, có thể thu hồi quyền truy cập bất kỳ lúc nào nếu phát hiện bất thường
```

## 7. Checklist bảo mật bắt buộc trước khi bật một API đối tác lên production (dựa trên OWASP API Security Top 10)

1. Kiểm soát truy cập cấp đối tượng (object-level authorization) — đối tác A không truy cập được dữ liệu của đối tác/khách hàng B dù đoán được ID.
2. Không lộ dữ liệu thừa trong response (trả đúng field cần thiết theo scope, không trả toàn bộ object nội bộ).
3. Rate limiting đã bật và test.
4. Xác thực đầy đủ cho mọi endpoint, không có endpoint "quên" auth.
5. Validate input nghiêm ngặt (schema validation), chống injection.
6. Log đầy đủ nhưng không log secret/token/dữ liệu cá nhân đầy đủ (đồng nhất `kiosk.md` mục 14).
7. Giám sát bất thường (nhiều lỗi 401/403 liên tiếp từ một client → cảnh báo).
8. Có kế hoạch thu hồi/xoay vòng credential khẩn cấp nếu lộ.

## 8. Không tuân thủ / vi phạm hợp đồng

Nếu một đối tác vi phạm giới hạn scope, cố truy cập ngoài phạm vi, hoặc rate-limit bị vượt liên tục có chủ đích, HQ Console (Ops/Support) có quyền tạm khoá `api_client` ngay lập tức, ghi audit log, và thông báo Sales/Partner Manager phụ trách xử lý hợp đồng.
