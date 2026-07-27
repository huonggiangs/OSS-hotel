# Module Spec — Quản lý Đối tác & Nhà cung cấp

## 1. Đối tác / Đại lý (Partner)

### Hồ sơ đối tác
Tên, khu vực phụ trách (`partner_territories`), thông tin liên hệ, hợp đồng (`partner_contracts`: thời hạn, tỷ lệ hoa hồng mặc định, hạn mức tạo khách hàng), trạng thái (Hoạt động/Tạm dừng/Chấm dứt).

### Gán khách hàng cho đối tác
Mỗi khách hàng (`customers_unified`) có thể gán một đối tác phụ trách (`partner_customer_assignments`) — dùng làm cơ sở tính hoa hồng và phân quyền xem dữ liệu (đối tác chỉ thấy khách hàng mình phụ trách, đồng nhất nguyên tắc `PARTNER_ADMIN`/`Dealer` đã có trong `kiosk.md` mục 13).

### Hạn mức
Đối tác có `max_customers` hoặc `max_devices_per_month` tuỳ hợp đồng — hệ thống cảnh báo khi gần đạt hạn mức, chặn tạo mới khi vượt (trừ khi được duyệt ngoại lệ).

## 2. Nhà cung cấp (Supplier)

### Hồ sơ nhà cung cấp
Tên, loại linh kiện cung cấp, thông tin liên hệ, điều khoản thanh toán, thời gian giao hàng trung bình, đánh giá chất lượng (dựa trên tỷ lệ `warranty_claims`).

### Đơn mua hàng
Xem chi tiết quy trình ở `MODULE_HARDWARE_INVENTORY.md` mục 4.1 — nhà cung cấp là bên nhận đơn mua hàng.

## 3. Không nhầm lẫn với nghiệp vụ trong sản phẩm

- "Đại lý/Dealer" đã xuất hiện trong `kiosk.md` (mục 13) là **role trong hệ thống Kiosk**, dùng để giới hạn quyền xem trong Web Admin của Kiosk. Module này ở tầng công ty, quản lý **quan hệ hợp đồng, hoa hồng, hạn mức kinh doanh** — hai khái niệm liên quan nhưng không phải một bảng dữ liệu; nếu cùng một đối tác, `partners.id` ở đây nên lưu tham chiếu mềm tới tài khoản `PARTNER_ADMIN`/`Dealer` tương ứng bên từng sản phẩm.

## 4. Tiêu chí chấp nhận

1. Tạo đối tác, gán khách hàng, đối tác đó xem được đúng danh sách khách hàng mình phụ trách (và chỉ khách hàng đó).
2. Đối tác vượt hạn mức tạo khách hàng bị chặn, có thông báo rõ lý do.
3. Tạo nhà cung cấp và một đơn mua hàng liên kết đúng nhà cung cấp đó.
4. Báo cáo đánh giá nhà cung cấp phản ánh đúng số lượng warranty claims liên quan.
