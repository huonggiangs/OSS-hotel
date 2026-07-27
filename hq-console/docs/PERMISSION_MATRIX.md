# Permission Matrix — HQ Console

Đây là hệ thống nội bộ nhiều dữ liệu nhạy cảm nhất — RBAC kiểm tra ở backend cho mọi endpoint, không ngoại lệ.

## 1. Vai trò

| Role | Mô tả |
|---|---|
| `EXEC` | Ban điều hành — xem toàn bộ, không sửa dữ liệu vận hành chi tiết |
| `OPS_SUPPORT` | Xử lý ticket, xem trạng thái thiết bị/khách hàng, không thấy hoa hồng/tài chính |
| `SALES_MANAGER` | Quản lý pipeline khách hàng, gán đối tác, xem hoa hồng liên quan |
| `ACCOUNTANT` | Duyệt và ghi nhận thanh toán hoa hồng, xem công nợ nhà cung cấp, không sửa thiết bị/kỹ thuật |
| `SUPPLY_CHAIN` | Quản lý nhà cung cấp, đơn mua hàng, tồn kho, bảo hành |
| `RELEASE_MANAGER` | Xem Release Console tổng hợp, không có quyền vận hành trong Kiosk/SHO (chỉ xem) |
| `SUPER_ADMIN` | Toàn quyền HQ Console, quản lý user/role |

## 2. Ma trận (rút gọn)

| Module | EXEC | OPS_SUPPORT | SALES_MANAGER | ACCOUNTANT | SUPPLY_CHAIN | RELEASE_MANAGER |
|---|---|---|---|---|---|---|
| Xem tổng quan kinh doanh | ✓ | Xem giới hạn | ✓ | ✓ | Xem giới hạn | – |
| Quản lý thiết bị/tồn kho | Xem | Xem | – | Xem | ✓ | – |
| Quản lý đối tác/hợp đồng | Xem | – | ✓ | Xem | – | – |
| Khách hàng 360 | Xem | ✓ | ✓ | Xem (billing) | – | – |
| Tính & duyệt hoa hồng | Duyệt cấp cao | – | Đề xuất | ✓ | – | – |
| Release Console | Xem | Xem | – | – | – | ✓ |
| Quản lý user/role HQ Console | ✓ (SUPER_ADMIN only) | – | – | – | – | – |

## 3. Nguyên tắc

1. Không role nào (kể cả `EXEC`) có quyền ghi trực tiếp vào dữ liệu nghiệp vụ của Kiosk/Smart Hotel OS — chỉ đọc qua Admin API.
2. `ACCOUNTANT` là role duy nhất ghi nhận thanh toán hoa hồng thực tế (`commission_payouts`); `SALES_MANAGER` chỉ đề xuất/xem.
3. MFA bắt buộc cho toàn bộ role, không có ngoại lệ.
4. Mọi truy cập vào `customers_unified` (dữ liệu khách hàng tổng hợp) ghi audit log kèm mục đích truy cập nếu vượt phạm vi thông thường của role.
