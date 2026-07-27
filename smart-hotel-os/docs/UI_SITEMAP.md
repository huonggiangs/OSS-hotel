# UI Sitemap — 4 ứng dụng client

Giao diện tiếng Việt mặc định, mở rộng tiếng Anh sau. Trạng thái luôn thể hiện bằng chữ + biểu tượng, không chỉ màu (đồng nhất `kiosk.md` mục 21.14).

## 1. Super Admin Web (`apps/super-admin-web`)

Đối tượng: đội vận hành Smart Hotel OS. Desktop-first.

```
Dashboard tổng (toàn bộ tenant)
Khách hàng (Tenants)
  ├── Danh sách / Tạo / Chi tiết
  ├── Cơ sở lưu trú theo tenant
  ├── Gói dịch vụ & Subscription
  └── Feature flags
Billing & Sử dụng
Người dùng & Vai trò (toàn hệ thống)
Cấu hình tích hợp OTA (danh mục kênh hỗ trợ)
Cấu hình cổng thanh toán
Audit Logs (toàn hệ thống)
Cảnh báo hệ thống (incidents, overbooking, lỗi đồng bộ)
Cài đặt bảo mật
```

## 2. Hotel Property Web / Windows App (`apps/property-web`, `apps/property-windows`)

Đối tượng: lễ tân, quản lý, kế toán tại một cơ sở. Desktop-first, hỗ trợ tablet quầy lễ tân. Sitemap dưới đây dùng chung cho cả hai client — `property-windows` là bản đóng gói desktop của cùng nghiệp vụ (chi tiết: `MODULE_PMS_WINDOWS_CLIENT.md`), không có màn hình riêng biệt.

```
Dashboard cơ sở
  ├── KPI hôm nay (doanh thu, lấp phòng, check-in/out chờ xử lý)
  └── Cảnh báo cần xử lý
Booking
  ├── Lịch đặt phòng (calendar view)
  ├── Tạo booking / Walk-in / Group booking
  ├── Check-in / Check-out
  └── Hủy / Gia hạn
Phòng
  ├── Sơ đồ trạng thái phòng (room grid)
  ├── Loại phòng & Giá
  └── Bảo trì
Kênh bán (nếu Gói 2+)
  ├── Kết nối OTA
  ├── Trạng thái đồng bộ
  └── Booking Engine trực tiếp (website/QR/voucher)
Giá & AI Pricing (nếu Gói 2+)
  ├── Đề xuất giá theo ngày
  └── Lịch sử áp dụng/override
Thiết bị phòng / IoT (nếu Gói 3)
  ├── Trạng thái thiết bị theo phòng
  ├── Luật tiết kiệm điện
  └── Báo cáo năng lượng
Khách hàng & CRM (nếu Gói 3)
  ├── Danh sách khách, phân loại
  └── Campaign đang chạy
Báo cáo doanh thu
  ├── Doanh thu ngày/tháng, ADR, RevPAR
  └── Cảnh báo chống thất thoát
Nhân viên & Phân quyền (theo property)
```

## 3. Owner Mobile App (`apps/owner-mobile`)

Đối tượng: chủ cơ sở/chủ chuỗi. Mobile-first, ưu tiên xem nhanh + duyệt từ xa, hạn chế thao tác cấu hình sâu.

```
Tổng quan chuỗi (nếu nhiều cơ sở) → chọn cơ sở xem chi tiết
Doanh thu & KPI (biểu đồ rút gọn)
Tỷ lệ lấp phòng theo cơ sở
Cảnh báo cần chủ duyệt (thay đổi giá lớn, sự cố overbooking, chi phí bất thường)
Báo cáo năng lượng (nếu Gói 3)
Thông báo đẩy (push) cho sự kiện quan trọng
Xem nhanh trạng thái phòng
```

## 4. Housekeeping Mobile App (`apps/housekeeping-mobile`)

Đối tượng: nhân viên dọn phòng, kỹ thuật. Mobile-first, thao tác tối giản, dùng được với tay đang mang thiết bị.

```
Danh sách phòng cần dọn hôm nay (theo ca)
  ├── Nhận việc / Bắt đầu dọn / Hoàn thành
  └── Báo cáo sự cố phòng (hỏng thiết bị, thiếu đồ)
Trạng thái phòng realtime (đồng bộ ngay với Property Web)
Thông báo phòng cần dọn gấp (check-in sớm)
Lịch sử công việc cá nhân
```

## 5. Nguyên tắc chung cho cả 4 app

1. Mọi hành động ảnh hưởng dữ liệu (hủy booking, tắt điện, gửi campaign) phải có hộp xác nhận.
2. Không tự ý thêm trường/nghiệp vụ ngoài tài liệu — đồng nhất nguyên tắc `kiosk.md` mục 21.13.
3. Phân quyền kiểm tra ở backend cho mọi action, UI chỉ ẩn/hiện để hỗ trợ trải nghiệm (không phải cơ chế bảo mật) — xem `PERMISSION_MATRIX.md`.
4. Có chế độ tối (dark mode) cho Property Web và Super Admin Web (dùng lâu, nhiều ca đêm).
