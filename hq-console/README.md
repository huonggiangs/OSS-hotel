# HQ Console — Trang quản trị nội bộ toàn công ty

Nền tảng quản trị nội bộ, **không bán cho khách hàng**, dùng để kiểm soát tối đa toàn bộ sản phẩm và hoạt động kinh doanh của công ty: thiết bị phần cứng, PMS SaaS (Smart Hotel OS), Kiosk, đối tác, nhà cung cấp, khách hàng, hoa hồng, và các ứng dụng đã phát hành (Windows App, mobile app...).

## Vị trí trong hệ thống tổng thể

Xem `../ARCHITECTURE_OVERVIEW.md` cho sơ đồ đầy đủ. Tóm tắt: HQ Console là lớp quản trị **trên cùng**, gọi API quản trị của `kiosk-management` và `smart-hotel-os` để tổng hợp dữ liệu, không dùng chung database, không cấy nghiệp vụ PMS/Kiosk vào chính nó.

## Vì sao cần một hệ thống riêng (không mở rộng Super Admin của từng sản phẩm)

- Một đối tác/đại lý có thể bán cả Kiosk lẫn Smart Hotel OS — hoa hồng phải tính gộp trên cả hai, không thể nằm trong một sản phẩm.
- Một nhà cung cấp phần cứng (camera, máy đọc hộ chiếu, máy phát thẻ...) cung cấp linh kiện cho cả kiosk vật lý lẫn thiết bị IoT của Smart Hotel OS.
- Một khách hàng (khách sạn) có thể là khách hàng của một hoặc cả hai sản phẩm — cần một "khách hàng 360" duy nhất cho kế toán/chăm sóc khách hàng.
- Quản lý phát hành ứng dụng (Windows Kiosk App, Windows PMS App, mobile Owner/Housekeeping) cần một điểm nhìn tổng hợp cho đội DevOps dù mỗi app build/deploy riêng.

## Module

| Module | Tài liệu |
|---|---|
| Quản lý thiết bị phần cứng (kho, bảo hành, chuỗi cung ứng) | `docs/MODULE_HARDWARE_INVENTORY.md` |
| Quản lý PMS SaaS (tổng hợp tenant/subscription của Smart Hotel OS) | `docs/SYSTEM_ARCHITECTURE.md` mục 3 |
| Quản lý đối tác & nhà cung cấp | `docs/MODULE_PARTNER_SUPPLIER.md` |
| Quản lý khách hàng 360 | `docs/MODULE_CUSTOMER_360.md` |
| Quản lý hoa hồng | `docs/MODULE_COMMISSION.md` |
| Quản lý ứng dụng/bản phát hành | `docs/MODULE_APP_RELEASE_CONSOLE.md` |
| Chuẩn bảo mật API cho đối tác bên ngoài | `docs/PARTNER_API_STANDARDS.md` |

## Tài liệu

```text
docs/
├── PRODUCT_REQUIREMENTS.md
├── SYSTEM_ARCHITECTURE.md
├── DATA_MODEL.md
├── MODULE_HARDWARE_INVENTORY.md
├── MODULE_PARTNER_SUPPLIER.md
├── MODULE_CUSTOMER_360.md
├── MODULE_COMMISSION.md
├── MODULE_APP_RELEASE_CONSOLE.md
├── PARTNER_API_STANDARDS.md
└── PERMISSION_MATRIX.md
```

Cộng `ASSUMPTIONS.md`, `DECISIONS.md`, `PROGRESS.md` ở thư mục gốc — cùng quy ước với `smart-hotel-os` và `kiosk-management`: không code trước khi tài liệu này được duyệt.
