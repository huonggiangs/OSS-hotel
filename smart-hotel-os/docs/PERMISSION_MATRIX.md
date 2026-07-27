# Permission Matrix — Smart Hotel OS

RBAC bắt buộc kiểm tra ở backend cho mọi endpoint, UI chỉ ẩn/hiện hỗ trợ trải nghiệm.

## 1. Vai trò

| Role | Phạm vi | Mô tả |
|---|---|---|
| `SUPER_ADMIN` | Toàn hệ thống | Đội vận hành Smart Hotel OS, toàn quyền tenant/billing/feature flag |
| `OPS_SUPPORT` | Toàn hệ thống, giới hạn | Hỗ trợ kỹ thuật nhiều tenant, không xoá tenant/không đổi billing |
| `OWNER` | Theo tenant (nhiều property) | Chủ chuỗi/chủ cơ sở, xem toàn bộ dữ liệu tenant, duyệt thay đổi lớn |
| `PROPERTY_MANAGER` | Theo property | Quản lý vận hành, cấu hình giá/thiết bị/nhân sự của property |
| `FRONT_DESK` | Theo property | Booking, check-in/out, walk-in — không đổi cấu hình hệ thống |
| `HOUSEKEEPING` | Theo property | Xem/cập nhật trạng thái dọn phòng, báo sự cố — không xem dữ liệu tài chính |
| `MAINTENANCE` | Theo property | Xem/xử lý cảnh báo thiết bị IoT — không xem dữ liệu khách |
| `ACCOUNTANT` | Theo property/tenant | Xem báo cáo doanh thu, giao dịch — không sửa booking/thiết bị |
| `PARTNER_RESELLER` | Theo tập khách hàng phụ trách | Tạo/xem tenant do mình phụ trách, không xem tenant của đại lý khác |
| `API_CLIENT` | Theo scope cấp riêng | Bên thứ 3 (vd. Kiosk vendor) — chỉ gọi được endpoint tích hợp đã cấp scope |

## 2. Ma trận quyền theo module (rút gọn — chi tiết hoá khi viết OpenAPI)

| Module / Hành động | SUPER_ADMIN | OWNER | PROPERTY_MANAGER | FRONT_DESK | HOUSEKEEPING | MAINTENANCE | ACCOUNTANT | PARTNER_RESELLER |
|---|---|---|---|---|---|---|---|---|
| Quản lý tenant/subscription | ✓ | – | – | – | – | – | – | Tạo trong hạn mức |
| Booking (tạo/check-in/out) | – | Xem | ✓ | ✓ | – | – | Xem | – |
| Sửa giá / duyệt AI Pricing | – | ✓ | ✓ | – | – | – | Xem | – |
| Cấu hình OTA / Channel Manager | – | ✓ | ✓ | – | – | – | – | – |
| Điều khiển thiết bị IoT | – | Xem | ✓ | – | – | ✓ | – | – |
| Trạng thái dọn phòng | – | Xem | ✓ | Xem | ✓ | – | – | – |
| Báo cáo doanh thu | ✓ (toàn hệ thống, ẩn danh) | ✓ | ✓ | – | – | – | ✓ | – |
| Campaign CRM | – | Xem | ✓ | – | – | – | – | – |
| Audit log | ✓ | Theo tenant | Theo property | – | – | – | – | – |
| Người dùng & phân quyền | ✓ (toàn hệ thống) | Theo tenant | Theo property | – | – | – | – | – |

## 3. Nguyên tắc

1. Mọi endpoint API kiểm tra permission ở backend trước khi xử lý — không tin tưởng vào việc UI đã ẩn nút.
2. `FRONT_DESK`, `HOUSEKEEPING`, `MAINTENANCE` không truy cập được dữ liệu tài chính chi tiết.
3. `PARTNER_RESELLER` không bao giờ thấy dữ liệu của tenant không thuộc phạm vi mình.
4. `API_CLIENT` (tích hợp Kiosk hoặc bên thứ 3 khác) chỉ có scope tối thiểu cần thiết (booking lookup, check-in/out, IoT activate) — không có quyền quản trị.
5. Mọi thay đổi vai trò/quyền ghi audit log.
