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

## ADR-008 — Xuất hiện lớp quản trị mới: HQ Console
**Ngày**: 2026-07-26
**Quyết định**: Tạo `hq-console/` làm hệ thống quản trị nội bộ công ty, tách biệt khỏi `smart-hotel-os` và `kiosk-management`, gọi Admin API của cả hai để tổng hợp (tenant, subscription, thiết bị, đối tác, hoa hồng...).
**Hệ quả cho `smart-hotel-os`**: Cần đảm bảo `docs/API_SPECIFICATION.md` mục 9 (Admin API) đủ để HQ Console đồng bộ tenant/subscription/usage; bổ sung webhook `tenant.created`, `subscription.changed`, `subscription.cancelled` nếu chưa có trong đặc tả (ghi theo dõi ở `ASSUMPTIONS.md`).
