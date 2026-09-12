# Ứng dụng mobile ANIO

## API dùng chung

Android/iOS gọi qua gateway PMS, không truy cập PostgreSQL và không gọi Edge trực tiếp:

- `POST /api/v1/auth/login` — nhận JWT 12 giờ.
- `GET /api/v1/mobile/bootstrap` — người dùng, quyền, danh sách cơ sở và tổng quan ban đầu.
- `GET /api/v1/mobile/overview` — KPI phòng, thiết bị, yêu cầu bảo trì. OWNER/MANAGER được chọn cơ sở cùng tenant bằng header `X-Property-Id`; vai trò khác chỉ được cơ sở của token.
- `GET /api/v1/mobile/work-queue` — hàng đợi theo vai trò: buồng phòng, kỹ thuật viên, bảo trì.
- Các nghiệp vụ còn lại dùng cùng `/api/v1/rooms`, `/api/v1/devices`, `/api/v1/maintenance`, `/api/v1/bookings`, `/api/v1/dashboard` với header `Authorization: Bearer <token>`.

## Android chủ cơ sở

`android-owner` là ứng dụng native Kotlin, không dùng DB cục bộ. Với emulator, địa chỉ mặc định là `http://10.0.2.2:3100/api/backend`; thiết bị Android trong LAN dùng `http://<IP-máy-chạy-Docker>:3100/api/backend`. Production bắt buộc dùng HTTPS và tắt cleartext trong manifest.

Phiên bản 0.2.1 có năm menu sử dụng dữ liệu thật:

- **Trang chủ:** KPI, tìm khách/mã đặt phòng, biểu đồ phòng, biểu đồ thu chi và cảnh báo cần xử lý.
- **Phòng:** lọc/tìm phòng, xem chi tiết, nhận phòng, bật/tắt điện, hoàn tất dọn phòng và báo hỏng.
- **Đặt phòng:** tạo và xem đặt phòng, xác nhận khách đến/không đến, nhận phòng, khách ra/về, xem trước và chốt thanh toán.
- **Thông báo:** thiết bị mất kết nối, phòng chờ dọn, yêu cầu bảo trì; cho phép hoàn tất hoặc chuyển trạng thái phù hợp.
- **Tài khoản:** xem thông tin, đổi cơ sở, đổi địa chỉ API, kiểm tra kết nối, làm mới và đăng xuất.

Mở thư mục `android-owner` bằng Android Studio, đồng bộ Gradle và chạy `app`. iOS có thể dùng cùng hợp đồng API.

### Build APK trên Windows

Từ thư mục gốc repo, chạy PowerShell:

```powershell
.\smart-hotel-os\mobile\build-owner-apk.ps1
```

Script tự tải JDK 17, Gradle 8.7 và Android SDK vào `.android-build` (không cài vào hệ thống), cài API 35/build-tools và tạo APK debug tại `android-owner\app\build\outputs\apk\debug\app-debug.apk`. Nếu máy đã có đủ toolchain, dùng `-SkipDownload` để build offline.
