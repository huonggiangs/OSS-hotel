# Decisions (Architecture Decision Records) — Smart Hotel OS

## ADR-001 — Tách repo/sản phẩm với Kiosk Remote Management
**Ngày**: 2026-07-25
**Quyết định**: `smart-hotel-os` và `kiosk-management` là hai sản phẩm, hai repo, hai codebase tách biệt, giao tiếp qua API mở.
**Lý do**: Xác nhận trực tiếp từ người yêu cầu; hai sản phẩm có chu kỳ bán hàng và khách hàng mục tiêu khác nhau (Kiosk bán cho khách sạn cần tự động hoá check-in; Smart Hotel OS bán "gói tối ưu vận hành" toàn diện).
**Hệ quả**: Không dùng chung database/session. Cần duy trì hợp đồng API ổn định (`docs/API_SPECIFICATION.md` mục "Tích hợp với sản phẩm Kiosk").

## ADR-002 — Backend framework: NestJS + TypeScript
**Ngày**: 2026-07-25
**Quyết định**: Thống nhất NestJS cho toàn bộ services, đồng bộ với lựa chọn đề xuất cho sản phẩm Kiosk để tái dùng nhân sự/kỹ năng.
**Trạng thái**: Đề xuất, chưa triển khai code — có thể đổi nếu review kỹ thuật phát hiện lý do chính đáng, phải cập nhật ADR mới nếu đổi.

## ADR-003 — Kiến trúc microservice theo domain nghiệp vụ
**Ngày**: 2026-07-25
**Quyết định**: Tách service theo domain (PMS, Channel Manager, Direct Booking, AI Pricing, IoT, CRM, Revenue) thay vì theo tầng kỹ thuật.
**Lý do**: Khớp với mô hình bán 3 gói (feature theo domain bật/tắt độc lập theo subscription), và cho phép scale độc lập từng domain khi tải lệch nhau (vd. IoT/telemetry tải cao hơn nhiều so với CRM).

## ADR-004 — Offline-first qua Edge Node tại từng cơ sở
**Ngày**: 2026-07-25
**Quyết định**: Mỗi property chạy một Edge Node cục bộ giữ cache PMS + IoT Local Controller, thay vì chỉ dựa vào cloud.
**Lý do**: Yêu cầu bắt buộc "offline-first" trong CLAUDE.md gốc; đồng nhất với mô hình đã áp dụng cho Windows Kiosk Agent.

## ADR-005 — Chưa chốt message bus cụ thể
**Trạng thái**: Mở — xem `ASSUMPTIONS.md` mục 6. Cần quyết định trước khi bắt đầu code Event Bus.

## ADR-006 — Chưa chốt cổng thanh toán cụ thể
**Trạng thái**: Mở — xem `ASSUMPTIONS.md` mục 2. Cần quyết định trước khi code Direct Booking Service (Giai đoạn 2).

## ADR-007 — Thêm client Windows Desktop cho PMS (`apps/property-windows`)
**Ngày**: 2026-07-26
**Quyết định**: PMS Core hoạt động trên hai nền tảng — Property Web và Property Windows App — dùng chung một API/BFF, không rẽ nhánh nghiệp vụ. Windows App đóng gói bằng Electron, tái dùng `packages/ui-components`.
**Lý do**: Yêu cầu người dùng — nhiều khách sạn quen phần mềm cài đặt tại quầy, cần in hóa đơn/kết nối thiết bị cục bộ tốt hơn qua desktop app, và mạng quầy lễ tân không phải lúc nào cũng ổn định.
**Hệ quả**: Cần chuẩn hoá cơ chế outbox/offline cục bộ dùng chung giữa Edge Node và `property-windows` (xem `docs/MODULE_PMS_WINDOWS_CLIENT.md`); cần cơ chế auto-update ký số riêng cho ứng dụng này, độc lập với license/agent của sản phẩm Kiosk.

## ADR-009 — Cổng thanh toán thật đầu tiên cho Property Web: SePay; các cổng khác tạm khoá UI
**Ngày**: 2026-08-22
**Quyết định**: Trong số các "kênh thanh toán" hiển thị ở `/payment` (VNPay, MoMo, ZaloPay, Stripe, thẻ, ví...), chỉ **SePay** (chuyển khoản ngân hàng qua VietQR động, theo tài liệu công khai `docs.sepay.vn`) được tích hợp thật (API Token xác thực, webhook nhận giao dịch, đồng bộ thủ công qua API Giao dịch, nhúng ảnh QR động). Các kênh còn lại vẫn hiển thị trong danh sách (không xoá — đúng yêu cầu người dùng) nhưng được đánh dấu "Chưa hỗ trợ"/"Chưa cấu hình — cần tích hợp API đối tác" và vô hiệu hoá thao tác, thay vì giả vờ đã hoạt động.
**Lý do**: Người dùng cung cấp đúng 1 bộ tài liệu đối tác thanh toán (SePay) kèm yêu cầu tường minh; các cổng khác (VNPay/MoMo/ZaloPay/Stripe) trước đó chỉ là dữ liệu mẫu tĩnh trong bản thiết kế gốc, không có hợp đồng/API key đối tác — dựng giả một tích hợp "hoạt động" cho các cổng đó sẽ vi phạm nguyên tắc "không bịa, không sáng tạo" người dùng đặt ra.
**Hệ quả**: API Token SePay mã hoá AES-256-GCM khi lưu (tái dùng đúng cơ chế đã có cho mật khẩu SMTP ở `settingsSecrets.ts`), không bao giờ trả về dạng rõ. Webhook SePay (`POST /api/v1/payments/sepay/webhook`) hiện chỉ hoạt động khi ứng dụng có URL công khai (không hoạt động khi chạy `localhost` cục bộ) — đồng bộ thủ công qua nút "Đồng bộ giao dịch ngay" là phương án dự phòng khi chạy nội bộ.

## ADR-010 — "Đồng bộ hoá OTA" chỉ lưu cấu hình kết nối, KHÔNG đồng bộ thật với Booking/Agoda/Airbnb
**Ngày**: 2026-08-22
**Quyết định**: Trang `/sync` cho phép khai báo/sửa/xoá danh sách kết nối OTA (nhà cung cấp, mã cơ sở, API key mã hoá, cờ đồng bộ phòng/giá/tồn) — đây là lớp CẤU HÌNH, không gọi API thật của bất kỳ OTA nào.
**Lý do**: Đồng bộ thật đòi hỏi trở thành đối tác kỹ thuật được chứng thực của từng OTA (hợp đồng, credential cấp riêng) — chưa có; `smart-hotel-os/services/channel-manager-service` cũng đang dùng `MockOtaAdapter` với đúng lý do này (xem PROGRESS của service đó). Không có căn cứ xác thực nào về "quy trình chuẩn năm 2026" của từng nhà cung cấp để dựng cứng vào code — làm vậy sẽ là bịa đặc tả kỹ thuật không kiểm chứng được.
**Hệ quả**: Khi có hợp đồng/API đối tác thật, chỉ cần bổ sung service gọi API tương ứng — schema kết nối (provider/propertyCode/apiKey/cờ đồng bộ) đã sẵn sàng tái sử dụng.

## ADR-011 — "Vai trò" ở Property Web là bảng mô tả, không phải RBAC động
**Ngày**: 2026-08-22
**Quyết định**: `/users` cho phép thêm/sửa mô tả vai trò (tên + phạm vi quyền) lưu trong `property_settings` nhóm `roles`, nhưng phân quyền THẬT ở tầng API (`requireRole(...)` trong từng route) vẫn chỉ nhận đúng 4 giá trị cố định: `OWNER/MANAGER/RECEPTIONIST/HOUSEKEEPING` (khớp cột enum trong `property_users`).
**Lý do**: Biến `roles` thành RBAC động thật (vai trò tuỳ ý có quyền hạn thực sự) đòi hỏi sửa tầng enum DB + mọi lệnh gọi `requireRole` trong toàn bộ API — thay đổi mô hình bảo mật, cần được duyệt riêng, không nằm trong yêu cầu "sửa nội dung hiển thị/CRUD" của phiên này.
**Hệ quả**: UI hiển thị cảnh báo rõ ràng ngay trong modal khi người dùng đặt tên vai trò không khớp 1 trong 4 vai trò thật, tránh hiểu nhầm vai trò mới có hiệu lực phân quyền thật.

## ADR-008 — Xuất hiện lớp quản trị mới: HQ Console
**Ngày**: 2026-07-26
**Quyết định**: Tạo `hq-console/` làm hệ thống quản trị nội bộ công ty, tách biệt khỏi `smart-hotel-os` và `kiosk-management`, gọi Admin API của cả hai để tổng hợp (tenant, subscription, thiết bị, đối tác, hoa hồng...).
**Hệ quả cho `smart-hotel-os`**: Cần đảm bảo `docs/API_SPECIFICATION.md` mục 9 (Admin API) đủ để HQ Console đồng bộ tenant/subscription/usage; bổ sung webhook `tenant.created`, `subscription.changed`, `subscription.cancelled` nếu chưa có trong đặc tả (ghi theo dõi ở `ASSUMPTIONS.md`).
