# Smart Hotel OS

Hệ điều hành vận hành khách sạn tự động (PMS + Channel Manager + AI Pricing + IoT Energy + CRM Automation), thiết kế multi-property, offline-first, mục tiêu mở rộng tới hàng trăm nghìn – triệu thiết bị/cơ sở lưu trú.

## Quan hệ với sản phẩm Kiosk Remote Management

`smart-hotel-os` và `kiosk-management` (xem `kiosk.md` ở thư mục gốc) là **hai sản phẩm thương mại tách biệt**, bán riêng, phát triển và vận hành độc lập:

| | Kiosk Remote Management | Smart Hotel OS |
|---|---|---|
| Đối tượng bán | Khách sạn cần quản lý xa kiosk check-in tự động | Chủ khách sạn/chuỗi cần vận hành tự động toàn bộ cơ sở |
| Phạm vi | Provisioning, license, cấu hình thiết bị ngoại vi, cập nhật OTA cho Windows Kiosk App | PMS, Channel Manager, Direct Booking, AI Pricing, IoT Energy, CRM, Revenue Dashboard |
| Repo | `kiosk-management/` (spec: `kiosk.md`) | `smart-hotel-os/` (thư mục này) |
| Tích hợp | Có thể **tích hợp làm khách hàng** của Smart Hotel OS qua API mở (Kiosk check-in gọi PMS để lấy booking, trả phòng, kích hoạt IoT) | Cung cấp API để Kiosk hoặc bất kỳ kiosk vendor nào khác tích hợp vào |

Không gộp hai codebase. Nếu một khách sạn dùng cả hai, chúng giao tiếp qua API công khai (`docs/API_SPECIFICATION.md`), không dùng chung database hay session.

## Giá trị cốt lõi (bán lợi nhuận, không bán phần mềm)

1. Giảm downtime — chạy được khi mất điện/mất mạng (offline-first).
2. Giảm chi phí điện — IoT tự động tắt/mở theo trạng thái phòng (mục tiêu 20–40%).
3. Giảm nhân sự — self-service + automation (mục tiêu 30–50% chi phí nhân sự).
4. Tăng doanh thu — AI pricing + đa kênh bán (mục tiêu 10–25%).
5. Giảm phụ thuộc OTA — Direct Booking Engine.
6. Quản lý từ xa — chủ cơ sở không cần có mặt tại chỗ.

## Năm ứng dụng client (tách biệt khi build)

| Ứng dụng | Đối tượng dùng | Thư mục |
|---|---|---|
| Super Admin Web | Đội vận hành Smart Hotel OS (nhà cung cấp dịch vụ), quản trị toàn bộ khách hàng/chuỗi | `apps/super-admin-web/` |
| Hotel Property Web | Lễ tân, quản lý, kế toán tại một cơ sở lưu trú | `apps/property-web/` |
| Hotel Property Windows App | Cùng nghiệp vụ Property Web, bản desktop cho quầy lễ tân (in hóa đơn, mạng không ổn định) | `apps/property-windows/` |
| Owner Mobile App | Chủ cơ sở / chủ chuỗi, xem báo cáo và duyệt từ xa | `apps/owner-mobile/` |
| Housekeeping Mobile App | Nhân viên dọn phòng, kỹ thuật | `apps/housekeeping-mobile/` |

PMS Core vì vậy hoạt động trên **hai nền tảng** (web và Windows desktop) dùng chung một API — xem `docs/MODULE_PMS_WINDOWS_CLIENT.md`.

Chi tiết kiến trúc, sitemap và cấu trúc thư mục đầy đủ: xem `docs/SYSTEM_ARCHITECTURE.md` và `docs/UI_SITEMAP.md`.

## Tài liệu (đọc theo thứ tự trước khi code)

```text
docs/
├── PRODUCT_REQUIREMENTS.md
├── SYSTEM_ARCHITECTURE.md
├── DATA_MODEL.md
├── API_SPECIFICATION.md
├── MODULE_PMS_CORE.md
├── MODULE_PMS_WINDOWS_CLIENT.md
├── MODULE_CHANNEL_MANAGER_BOOKING.md
├── MODULE_AI_PRICING.md
├── MODULE_IOT_ENERGY.md
├── MODULE_CRM_MARKETING.md
├── MODULE_REVENUE_DASHBOARD.md
├── UI_SITEMAP.md
├── SECURITY_THREAT_MODEL.md
├── PERMISSION_MATRIX.md
├── ACCEPTANCE_CRITERIA.md
└── ROADMAP.md
```

Cộng với `ASSUMPTIONS.md`, `DECISIONS.md`, `PROGRESS.md` ở thư mục gốc.

**Không bắt đầu code trước khi PRD, kiến trúc, data model, API contract, UI sitemap và acceptance criteria được duyệt** — theo đúng nguyên tắc đã áp dụng cho sản phẩm Kiosk (`kiosk.md` mục 19).

## Nguồn tài liệu gốc

Bộ tài liệu này được xây dựng dựa trên `Sanpham.docx` (đề bài sản phẩm) và phần bổ sung "PMS + AUTOMATION SYSTEM REQUIREMENTS" trong `CLAUDE.md` gốc của thư mục `D:\hotel\OSS`.
