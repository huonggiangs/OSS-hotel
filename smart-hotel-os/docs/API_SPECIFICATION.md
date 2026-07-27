# API Specification — Smart Hotel OS

Chuẩn chung: REST, JSON, versioning từ đầu `/api/v1/...`, OpenAPI/Swagger cho từng service. Mỗi endpoint phải có: request schema, response schema, validation, permission yêu cầu, error codes, ví dụ request/response — sinh tài liệu OpenAPI khi implement, không viết tay trùng lặp ở đây.

## 1. Auth & IAM

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/mfa/verify
GET    /api/v1/me
GET    /api/v1/me/permissions
```

## 2. PMS Core

```
GET    /api/v1/properties/{id}/rooms
POST   /api/v1/properties/{id}/rooms
PATCH  /api/v1/rooms/{id}/status
GET    /api/v1/properties/{id}/bookings
POST   /api/v1/bookings
POST   /api/v1/bookings/{id}/checkin
POST   /api/v1/bookings/{id}/checkout
POST   /api/v1/bookings/{id}/cancel
POST   /api/v1/bookings/walkin
POST   /api/v1/bookings/group
GET    /api/v1/pms/bookings/lookup          # dùng bởi Kiosk / bên thứ 3
POST   /api/v1/pms/checkins                 # dùng bởi Kiosk / bên thứ 3
POST   /api/v1/pms/checkouts                # dùng bởi Kiosk / bên thứ 3
```

## 3. Channel Manager

```
POST   /api/v1/channels/connections
GET    /api/v1/channels/connections
POST   /api/v1/channels/sync/inventory
POST   /api/v1/channels/sync/rates
POST   /api/v1/channels/webhooks/{ota}/bookings   # nhận booking từ OTA
GET    /api/v1/channels/overbooking-incidents
```

## 4. Direct Booking

```
GET    /api/v1/booking-pages/{property_id}
POST   /api/v1/public/bookings                # public-facing, rate-limited
POST   /api/v1/public/payments/intent
POST   /api/v1/public/payments/webhook/{provider}
POST   /api/v1/vouchers
POST   /api/v1/vouchers/{code}/redeem
```

## 5. AI Pricing

```
GET    /api/v1/pricing/suggestions?property_id=&date_from=&date_to=
POST   /api/v1/pricing/rules
POST   /api/v1/pricing/suggestions/{id}/apply
POST   /api/v1/pricing/suggestions/{id}/override
GET    /api/v1/pricing/competitor-prices
```

## 6. IoT Energy

```
GET    /api/v1/iot/devices
POST   /api/v1/iot/devices/{id}/commands
POST   /api/v1/iot/devices/{id}/telemetry     # thiết bị/edge gửi lên
GET    /api/v1/iot/rooms/{room_id}/status
POST   /api/v1/iot/rooms/{room_id}/activate   # dùng bởi Kiosk sau phát thẻ
POST   /api/v1/iot/energy-rules
GET    /api/v1/iot/energy-usage?property_id=&period=
```

## 7. CRM & Marketing

```
GET    /api/v1/crm/segments
POST   /api/v1/crm/campaigns
POST   /api/v1/crm/campaigns/{id}/trigger-test
GET    /api/v1/crm/message-log
```

## 8. Revenue & Reporting

```
GET    /api/v1/reports/revenue?property_id=&period=
GET    /api/v1/reports/adr-revpar?property_id=&period=
GET    /api/v1/reports/occupancy?property_id=&period=
GET    /api/v1/reports/loss-prevention-flags
```

## 9. Admin (Super Admin Web)

```
POST   /api/v1/admin/tenants
POST   /api/v1/admin/subscriptions
POST   /api/v1/admin/feature-flags
GET    /api/v1/admin/audit-logs
GET    /api/v1/admin/tenants/{id}/usage
```

## 10. Quy ước chung

- Auth: Bearer JWT (nội bộ), OAuth2 client credentials (bên thứ 3/API key).
- Mọi list endpoint hỗ trợ phân trang (`page`, `page_size`), lọc, sắp xếp.
- Rate limit áp theo `tenant_id`/`api_client_id`.
- Webhook (OTA, payment) phải idempotent theo `event_id`, lưu log nhận để chống xử lý trùng.
- Error response chuẩn hoá: `{ "error_code": "...", "message": "...", "details": {...} }` — danh sách mã lỗi khởi tạo:

```
ROOM_NOT_AVAILABLE
BOOKING_NOT_FOUND
BOOKING_ALREADY_CHECKED_IN
OVERBOOKING_DETECTED
OTA_SYNC_FAILED
PRICING_RULE_INVALID
DEVICE_COMMAND_EXPIRED
DEVICE_OFFLINE
PAYMENT_FAILED
VOUCHER_INVALID_OR_EXPIRED
PERMISSION_DENIED
FEATURE_NOT_IN_SUBSCRIPTION
```

Không trả lỗi chung chung 500 cho các trường hợp nghiệp vụ dự đoán được — nhất quán nguyên tắc với `kiosk.md` mục 17.
