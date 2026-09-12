# Ứng dụng mobile ANIO

## API dùng chung

Android/iOS gọi qua gateway PMS, không truy cập PostgreSQL và không gọi Edge trực tiếp:

- `POST /api/v1/mobile/pairing/request` — người dùng chỉ nhập tên đăng nhập; máy chủ tạo mã đối chiếu 6 số và yêu cầu HQ duyệt thiết bị.
- `POST /api/v1/mobile/pairing/status` — ứng dụng chờ trạng thái duyệt; chỉ sau khi được duyệt mới nhận JWT 12 giờ.
- `POST /api/v1/mobile/pairing/refresh` — tự cấp lại JWT cho thiết bị còn hiệu lực, không yêu cầu nhập lại mật khẩu.
- `GET /api/v1/mobile/bootstrap` — người dùng, quyền, danh sách cơ sở và tổng quan ban đầu.
- `GET /api/v1/mobile/overview` — KPI phòng, thiết bị, yêu cầu bảo trì. OWNER/MANAGER được chọn cơ sở cùng tenant bằng header `X-Property-Id`; vai trò khác chỉ được cơ sở của token.
- `GET /api/v1/mobile/work-queue` — hàng đợi theo vai trò: buồng phòng, kỹ thuật viên, bảo trì.
- Các nghiệp vụ còn lại dùng cùng `/api/v1/rooms`, `/api/v1/devices`, `/api/v1/maintenance`, `/api/v1/bookings`, `/api/v1/dashboard` với header `Authorization: Bearer <token>`.

## Android chủ cơ sở

`android-owner` là ứng dụng native Kotlin, không dùng DB cục bộ. Phiên bản LAN tự chọn `http://10.0.2.2:3100/api/backend` trên emulator và `http://sonanio25:3100/api/backend` trên điện thoại thật; người dùng không phải nhập địa chỉ máy chủ. Production bắt buộc thay hostname này bằng tên miền HTTPS ổn định và tắt cleartext trong manifest.

Phiên bản 0.3.1 dùng chung cho chủ cơ sở, quản lý, lễ tân, buồng phòng và kỹ thuật viên. Ứng dụng chỉ hiện các menu/hành động thuộc quyền do PMS trả về. Giao diện dùng bộ icon vector 24 × 24 đồng nhất và tự co chữ/card theo chiều rộng màn hình cùng cỡ chữ hệ thống:

- **Trang chủ:** KPI, tìm khách/mã đặt phòng, biểu đồ phòng, biểu đồ thu chi và cảnh báo cần xử lý.
- **Phòng:** lọc/tìm phòng, xem chi tiết, nhận phòng, bật/tắt điện, hoàn tất dọn phòng và báo hỏng.
- **Đặt phòng:** tạo và xem đặt phòng, xác nhận khách đến/không đến, nhận phòng, khách ra/về, xem trước và chốt thanh toán.
- **Thông báo:** thiết bị mất kết nối, phòng chờ dọn, yêu cầu bảo trì; cho phép hoàn tất hoặc chuyển trạng thái phù hợp.
- **Tài khoản:** xem thông tin, đổi cơ sở nếu được phép, kiểm tra kết nối, làm mới và gỡ kết nối khỏi thiết bị.

Luồng bàn giao: mở ứng dụng → nhập username → đọc mã 6 số → vào HQ Console, menu **Kết nối ứng dụng**, đối chiếu đúng người/thiết bị/mã → **Duyệt thiết bị**. HQ có thể từ chối yêu cầu hoặc thu hồi tức thời; access token cũ cũng bị chặn ở middleware ngay sau khi thu hồi.

Mở thư mục `android-owner` bằng Android Studio, đồng bộ Gradle và chạy `app`. iOS dùng cùng hợp đồng pairing/API và gửi `platform: "IOS"`.

### Build APK trên Windows

Từ thư mục gốc repo, chạy PowerShell:

```powershell
.\smart-hotel-os\mobile\build-owner-apk.ps1
```

Script tự tải JDK 17, Gradle 8.7 và Android SDK vào `.android-build` (không cài vào hệ thống), cài API 35/build-tools và tạo APK debug tại `android-owner\app\build\outputs\apk\debug\app-debug.apk`. Nếu máy đã có đủ toolchain, dùng `-SkipDownload` để build offline.
