# Sở hữu dữ liệu và trạng thái tích hợp

| Phạm vi | Nguồn sự thật | Dữ liệu fixture/test | Kết nối hiện tại |
|---|---|---|---|
| Webadmin | PostgreSQL `webadmin` | Seed HQ Console | Đọc property list và trạng thái IoT theo best-effort |
| Property Web | PostgreSQL `property_web` | Hotel ANIO + tài khoản demo | Nguồn Cloud cho Edge |
| Edge Node | PGlite volume cục bộ | Cache/seed offline tối thiểu | Push outbox, pull Cloud |
| Channel/AI/IoT/CRM | PostgreSQL riêng của từng service | Provider OTA mock, dữ liệu demo | Chưa có event bus/PMS integration thật |

## Quy ước đã áp dụng

- `property-web` là Cloud source of truth cho phòng, booking và dữ liệu vận hành PMS.
- `edge-node` chỉ là cache/executor offline; Cloud ghi đè trạng thái khi pull sync.
- `webadmin` gọi Property qua `X-Internal-Service-Key`; gọi IoT qua
  `X-Service-Api-Key`. Docker dùng `host.docker.internal` thay vì `localhost`
  bên trong container, tránh lỗi gọi nhầm chính container Webadmin.
- JWT, internal key, service key và khóa SMTP nằm trong `ops/.env`, không có
  default production trong Docker Compose.

## Những dữ liệu còn mock có chủ đích

- Property Web: các khối dashboard doanh thu, hoạt động tài khoản, newsletter,
  gói phổ biến và Gantt chưa có bảng/event nguồn tương ứng; UI không được coi là
  báo cáo nghiệp vụ thật cho đến khi có yêu cầu bổ sung mô hình dữ liệu.
- Channel Manager: adapter OTA là mock do chưa có credential/hợp đồng OTA thật.
- Seed tài khoản/phòng là fixture test. Không dùng dữ liệu này làm dữ liệu khách
  sạn thật hoặc suy ra hành vi production.

## Điểm cần quyết định trước khi mở rộng

1. Booking tạo offline chưa có `id` ánh xạ Cloud trả về; check-in/out tiếp theo
   của cùng booking cần endpoint sync idempotent chuyên dụng.
2. Tích hợp API-to-API dài hạn nên chuyển từ API key MVP sang OAuth2 client
   credentials trước khi các service tách máy/mạng.
3. Muốn dashboard/Gantt là dữ liệu thật cần duyệt schema event/analytics, không
   thể an toàn bằng cách tự thay mock bằng số liệu suy đoán.
