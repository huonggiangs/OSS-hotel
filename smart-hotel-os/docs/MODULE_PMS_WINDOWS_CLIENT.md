# Module Spec — PMS Windows Desktop App (property-windows)

## 1. Vì sao cần thêm bản Windows (ngoài Property Web)

Nhiều khách sạn vừa/nhỏ tại Việt Nam vẫn quen dùng phần mềm cài đặt tại quầy, mạng Internet quầy lễ tân không ổn định, và một số thiết bị ngoại vi (máy in hóa đơn, ngăn kéo tiền) giao tiếp tốt hơn qua ứng dụng desktop có quyền truy cập phần cứng cục bộ. `property-windows` không phải sản phẩm PMS khác — nó là **client thứ hai** của cùng một nghiệp vụ PMS Core, dùng chung API với `property-web`.

## 2. Nguyên tắc dùng chung

1. `property-windows` và `property-web` gọi **chung một BFF/API** (`docs/API_SPECIFICATION.md` nhóm PMS Core) — không có nghiệp vụ nào chỉ tồn tại ở một trong hai client.
2. Giao diện/luồng nghiệp vụ đồng nhất với `docs/UI_SITEMAP.md` mục 2 (Hotel Property Web) — `property-windows` là một "shell" desktop bọc quanh cùng bộ màn hình, không tự sáng tạo nghiệp vụ riêng (đồng nhất nguyên tắc `kiosk.md` mục 21.13 áp dụng chung cho toàn hệ thống).
3. `property-windows` là client **online-first với khả năng chịu mất mạng ngắn hạn cục bộ** (dùng chung cơ chế outbox với Edge Node — xem `SYSTEM_ARCHITECTURE.md` mục 4), không phải một bản sao logic nghiệp vụ độc lập.

## 3. Công nghệ đề xuất

Electron + cùng codebase React/TypeScript với `property-web` (tái dùng `packages/ui-components`) — giữ một bộ component, hai target build (web + desktop), giống mô hình đã dùng cho Windows Kiosk App có thể tham khảo cách đóng gói/cập nhật (`kiosk.md` mục 7.2 electron-updater) nhưng đây là ứng dụng PMS riêng, không dùng chung license/agent với sản phẩm Kiosk.

## 4. Chức năng đặc thù desktop (ngoài nghiệp vụ PMS chung)

1. Kết nối máy in hóa đơn/ngăn kéo tiền qua driver Windows cục bộ.
2. Lưu hàng đợi thao tác cục bộ khi mất mạng ngắn hạn (đặt phòng, check-in, check-out) — đồng bộ khi có mạng lại, theo đúng cơ chế outbox đã định nghĩa cho Edge Node.
3. Tự động cập nhật phiên bản (auto-update), có kiểm tra checksum/chữ ký gói cập nhật trước khi cài — đồng nhất nguyên tắc bảo mật cập nhật đã áp dụng cho Windows Kiosk App (`kiosk.md` mục 7.3).
4. Đăng nhập bằng tài khoản PMS thông thường (không cần license key riêng biệt như Kiosk — đây không phải sản phẩm license theo thiết bị, mà là ứng dụng client của một tài khoản property đã có sẵn).

## 5. Ràng buộc

- Không lưu bản sao đầy đủ dữ liệu khách của toàn bộ property vô thời hạn trên máy cục bộ — chỉ cache dữ liệu vận hành ngắn hạn cần thiết (booking hôm nay/ngày mai, trạng thái phòng), đồng nhất nguyên tắc bảo mật dữ liệu khách.
- Không tạo API riêng cho `property-windows` — mọi endpoint mới phải dùng chung với `property-web`, nếu thiếu tính năng thì bổ sung vào API chung, không rẽ nhánh.

## 6. Tiêu chí chấp nhận

1. Đăng nhập, xem sơ đồ phòng, tạo booking, check-in/check-out hoạt động giống hệt `property-web` với cùng tài khoản.
2. Ngắt mạng cục bộ, vẫn check-in/check-out được, đồng bộ đúng khi có mạng lại.
3. In hóa đơn thành công qua máy in kết nối USB/LAN cục bộ.
4. Bản cập nhật ứng dụng cài đặt thành công, kiểm tra được chữ ký/checksum trước khi áp dụng.
