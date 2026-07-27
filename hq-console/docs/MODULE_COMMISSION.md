# Module Spec — Quản lý Hoa hồng

## 1. Nguyên tắc

Hoa hồng tính theo **quy tắc cấu hình được** (`commission_rules`), không hard-code — vì tỷ lệ có thể khác nhau theo đối tác, theo sản phẩm (Kiosk phần cứng vs Smart Hotel OS subscription định kỳ), theo khách hàng mới vs gia hạn.

## 2. Loại hoa hồng

| Loại | Ví dụ quy tắc |
|---|---|
| Một lần (bán thiết bị Kiosk) | % trên giá trị đơn hàng phần cứng |
| Định kỳ (subscription Smart Hotel OS) | % trên doanh thu subscription mỗi kỳ, có thể giảm dần theo thời gian (recurring commission decay) |
| Thưởng đạt mốc (bonus) | Đạt số khách hàng mới trong quý → thưởng thêm |

## 3. Quy trình

```
Sự kiện bán hàng (đơn thiết bị / subscription mới / gia hạn)
   → tính commission_calculations theo commission_rules áp dụng cho đối tác đó
   → hiển thị cho SALES_MANAGER xem trước (đề xuất)
   → ACCOUNTANT duyệt (commission_approvals)
   → ghi nhận thanh toán (commission_payouts)
```

Trạng thái: `CALCULATED → PENDING_APPROVAL → APPROVED → PAID`, nhánh `REJECTED → ĐIỀU CHỈNH (bản ghi mới)`.

## 4. Ràng buộc

1. `commission_calculations` sau khi `APPROVED` là immutable (xem `DATA_MODEL.md` mục 3.4) — điều chỉnh tạo bản ghi mới có tham chiếu ngược.
2. Mọi thay đổi `commission_rules` phải versioning — không sửa rule đang áp dụng cho kỳ đã tính, để không làm sai lệch số đã duyệt trước đó.
3. Một đối tác chỉ xem được hoa hồng của chính mình (không xem của đối tác khác).

## 5. Tiêu chí chấp nhận

1. Một sự kiện bán thiết bị giả lập tính đúng hoa hồng theo rule cấu hình cho đối tác đó.
2. Một subscription gia hạn giả lập tính đúng hoa hồng định kỳ theo kỳ.
3. Quy trình duyệt hoạt động đúng thứ tự trạng thái, không cho thanh toán khi chưa `APPROVED`.
4. Đối tác đăng nhập chỉ thấy hoa hồng của mình.
