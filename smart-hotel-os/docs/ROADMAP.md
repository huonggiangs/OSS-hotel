# Roadmap — Smart Hotel OS

Gắn liền với mô hình 3 gói bán hàng (xem `PRODUCT_REQUIREMENTS.md` mục 3) và KPI cam kết.

## Giai đoạn 1 — MVP (Gói 1: Entry)

- Auth, RBAC cơ bản, audit log.
- PMS Core đầy đủ (phòng, booking, check-in/out, walk-in, group booking).
- Revenue Dashboard cơ bản (doanh thu, occupancy, ADR, RevPAR).
- Housekeeping Mobile App (nhận việc, cập nhật trạng thái dọn phòng).
- Owner Mobile App bản rút gọn (xem KPI).
- Offline-first tại Edge Node cho PMS Core.
- API tích hợp mở cho Kiosk (nếu khách hàng có sản phẩm Kiosk).
- Điều kiện hoàn thành: đạt toàn bộ tiêu chí liên quan trong `ACCEPTANCE_CRITERIA.md`.

## Giai đoạn 2 (Gói 2: Growth)

- Channel Manager: Booking.com, Agoda, Airbnb.
- Direct Booking Engine: website booking, QR booking, thanh toán online, voucher.
- AI Pricing Engine Phase 1 (rule-based).
- Chống overbooking đa kênh.
- Super Admin Web đầy đủ (multi-tenant, billing, feature flag).
- Partner/Reseller portal.

## Giai đoạn 3 (Gói 3: Pro)

- IoT Energy Management đầy đủ (điện, điều hòa, nước nóng, luật tiết kiệm điện).
- CRM & Marketing Automation (segment, campaign tự động, đa kênh gửi).
- AI Pricing Engine Phase 2 (mô hình dự đoán, giá đối thủ, sự kiện khu vực).
- Chống thất thoát nâng cao (loss prevention, phát hiện sửa giá bất thường).
- Full automation loop: Booking → Check-in → IoT → Checkout → Marketing.

## Giai đoạn 4 (Mở rộng quy mô/thị trường)

- High availability đa vùng (multi-region).
- Sharding dữ liệu theo tenant khi vượt ngưỡng.
- Thêm kênh OTA/mạng xã hội (Traveloka, TikTok, Facebook, Zalo Shop).
- API mở đầy đủ cho ERP/OTA nội địa bên thứ ba.
- Chứng nhận bảo mật/tuân thủ nâng cao, pentest định kỳ.

## Theo dõi KPI xuyên suốt roadmap

Mỗi giai đoạn triển khai cho một khách hàng thí điểm phải đo lại 4 KPI ở `PRODUCT_REQUIREMENTS.md` mục 1.1 (chi phí nhân sự, chi phí điện, doanh thu, tỷ trọng OTA) trước/sau để làm bằng chứng thương mại hoá cho khách hàng tiếp theo.
