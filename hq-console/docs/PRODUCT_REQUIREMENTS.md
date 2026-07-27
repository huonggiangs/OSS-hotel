# Product Requirements — HQ Console

Trạng thái: Draft v0.1 — chờ duyệt.

## 1. Mục tiêu

Một điểm quản trị duy nhất cho đội vận hành công ty để kiểm soát **tối đa** mọi sản phẩm và quan hệ kinh doanh, không phải đăng nhập rời rạc vào từng hệ thống con để lấy dữ liệu tổng hợp.

## 2. Người dùng

| Vai trò | Nhu cầu |
|---|---|
| Ban điều hành | Xem tổng quan kinh doanh: doanh thu SaaS, số thiết bị đã bán, hoa hồng phải trả, sức khoẻ đối tác |
| Vận hành/Support | Xử lý sự cố khách hàng xuyên sản phẩm, xem trạng thái thiết bị, gán ticket |
| Kinh doanh/Sales | Quản lý pipeline khách hàng, tạo hợp đồng, gán đối tác phụ trách |
| Kế toán | Đối soát doanh thu, tính và duyệt hoa hồng, quản lý công nợ nhà cung cấp |
| Chuỗi cung ứng | Quản lý tồn kho thiết bị, đơn mua hàng nhà cung cấp, bảo hành |
| DevOps/Release Manager | Theo dõi phiên bản ứng dụng đang chạy ở khách hàng, điều phối phát hành |

## 3. Yêu cầu chức năng theo module

### 3.1 Quản lý thiết bị phần cứng
Theo dõi vòng đời thiết bị từ nhập kho → xuất kho → lắp đặt tại khách hàng → bảo hành/bảo trì → thu hồi. Khác với "Kiosk Remote Management" (theo dõi thiết bị đang hoạt động: online/offline, license) — HQ Console theo dõi khía cạnh **chuỗi cung ứng và tài sản vật lý** (serial number, chi phí nhập, nhà cung cấp, vị trí kho, hợp đồng bảo hành), liên kết tới `device_id` bên Kiosk qua API khi thiết bị đã kích hoạt. Chi tiết: `MODULE_HARDWARE_INVENTORY.md`.

### 3.2 Quản lý PMS SaaS
Tổng hợp danh sách tenant, gói dịch vụ (Entry/Growth/Pro), trạng thái subscription, mức sử dụng của toàn bộ khách hàng Smart Hotel OS — lấy qua API quản trị của `smart-hotel-os` (`/api/v1/admin/...`), không lưu bản sao nghiệp vụ đầy đủ, chỉ cache dữ liệu tổng hợp cho hiển thị nhanh.

### 3.3 Quản lý đối tác & nhà cung cấp
Hồ sơ đối tác/đại lý (khu vực phụ trách, hợp đồng, hạn mức tạo khách hàng), hồ sơ nhà cung cấp phần cứng (linh kiện cung cấp, giá, thời gian giao hàng). Chi tiết: `MODULE_PARTNER_SUPPLIER.md`.

### 3.4 Quản lý khách hàng 360
Một hồ sơ khách hàng (khách sạn) hợp nhất, hiển thị: đang dùng Kiosk/Smart Hotel OS/cả hai, gói dịch vụ, đối tác phụ trách, lịch sử hỗ trợ, tình trạng thanh toán. Chi tiết: `MODULE_CUSTOMER_360.md`.

### 3.5 Quản lý hoa hồng
Tính hoa hồng cho đối tác/đại lý dựa trên doanh số bán (thiết bị + subscription), theo quy tắc cấu hình được (% theo gói, theo khách hàng mới/gia hạn), có quy trình duyệt và ghi nhận thanh toán. Chi tiết: `MODULE_COMMISSION.md`.

### 3.6 Quản lý ứng dụng/bản phát hành
Nhìn tổng hợp phiên bản đang chạy của: Windows Kiosk App, Windows PMS App (Smart Hotel OS Property), Owner Mobile App, Housekeeping Mobile App — trên toàn bộ khách hàng, để đội DevOps biết ai đang chạy bản cũ cần nhắc cập nhật. Đây là **view tổng hợp**, việc phát hành/rollout thật vẫn thực hiện trong từng sản phẩm (Kiosk có Release Manager riêng theo `kiosk.md` mục 9-10; Smart Hotel OS quản lý version app riêng). Chi tiết: `MODULE_APP_RELEASE_CONSOLE.md`.

## 4. Yêu cầu phi chức năng

1. Không phải hệ thống real-time giao dịch — có thể chấp nhận độ trễ tổng hợp dữ liệu vài phút (đọc qua API/replica, không ảnh hưởng hiệu năng sản phẩm gốc).
2. Phân quyền chặt theo phòng ban (kế toán không thấy được thao tác kỹ thuật, sales không thấy chi tiết kỹ thuật thiết bị) — xem `PERMISSION_MATRIX.md`.
3. Audit log đầy đủ cho mọi thao tác nhạy cảm (duyệt hoa hồng, thay đổi hạn mức đối tác, thay đổi feature flag khách hàng).
4. Không được có quyền ghi trực tiếp vào database của Kiosk/Smart Hotel OS — mọi thay đổi nghiệp vụ đi qua admin API của sản phẩm tương ứng.

## 5. Ràng buộc

- HQ Console không phải nơi vận hành nghiệp vụ khách sạn (đặt phòng, check-in...) — những việc đó thuộc Smart Hotel OS/Kiosk.
- Không tự bịa API quản trị của từng sản phẩm nếu chưa có — nếu `smart-hotel-os`/`kiosk-management` chưa expose endpoint cần thiết, phải bổ sung ở phía sản phẩm đó trước, ghi rõ ở `ASSUMPTIONS.md`.
