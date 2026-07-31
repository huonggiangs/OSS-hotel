# Edge Node

## Edge Node là gì?

Edge Node là một dịch vụ nhỏ, **chạy ngay tại cơ sở lưu trú** (trên 1 máy tính mini-PC/NUC/laptop cũ để cố định, không nhất thiết máy tính lễ tân đang dùng hằng ngày), trong cùng mạng LAN/WiFi với toàn bộ nhân viên. Nó tồn tại để trả lời trực tiếp yêu cầu đã nêu 2 lần: **"khi mất mạng vẫn phải vận hành được, khi máy tính chính hỏng thì chuyển ngay sang máy khác/điện thoại mà không mất dữ liệu."**

Ý tưởng cốt lõi: **trạng thái vận hành sống trên Edge Node, không sống trên bất kỳ máy tính cá nhân nào.** Máy tính lễ tân, máy tính quản lý, điện thoại nhân viên... tất cả chỉ là **trình duyệt** trỏ vào Edge Node (`http://<ip-lan-cua-edge-node>:4200`). Máy nào hỏng, cắm dây/kết nối WiFi từ máy khác vào là dùng tiếp ngay lập tức — không có "1 điểm lỗi" (single point of failure) ở tầng máy trạm.

Đây chính là phần "IoT Integration" + phần thực thi tại chỗ mô tả ở `CLAUDE.md` mục 2.5/2.6 và yêu cầu "offline-first" ở mục 7 — Edge Node là **hiện thân vật lý** của các yêu cầu đó.

## Kiến trúc tổng quan

```
[Điện thoại nhân viên] --\
[Máy tính lễ tân]      ---+--- WiFi/LAN khách sạn ---> [EDGE NODE :4200] <--- CSDL cục bộ (PGlite)
[Máy tính dự phòng]    --/                                    |
                                                    (khi có mạng, mỗi 15s)
                                                                v
                                            [Cloud property-web API :4100] (nguồn sự thật)
```

- **Cloud property-web VẪN LÀ NGUỒN SỰ THẬT** (đúng nguyên tắc chung toàn hệ thống) — Edge Node chỉ là **executor + cache tại chỗ**.
- Khi có mạng: Edge Node đẩy (push) mọi thay đổi cục bộ lên Cloud và kéo (pull) dữ liệu mới nhất từ Cloud về.
- Khi mất mạng: Edge Node **tự vận hành hoàn toàn độc lập** — đăng nhập, xem phòng, tạo/sửa đặt phòng, check-in/check-out, bật/tắt thiết bị IoT — không có thao tác nào trong danh sách này bị chặn bởi việc mất Internet.

## Mô hình đồng bộ (Outbox Pattern)

Đây là cơ chế quan trọng nhất của Edge Node, nằm ở `src/lib/sync.ts` + `src/utils/outbox.ts`:

1. **Mọi ghi cục bộ đều đi kèm 1 dòng `outbox_events`, TRONG CÙNG 1 transaction** với chính thao tác nghiệp vụ (xem `src/lib/db.ts` — `DbPool.transaction()`, và các hàm `create`/`checkin`/`checkout`/... trong `src/repositories/*.repo.ts`). Nếu Edge Node bị tắt điện đột ngột ngay sau khi 1 API trả response thành công, KHÔNG BAO GIỜ có tình trạng "đã đổi trạng thái phòng nhưng quên ghi sự kiện đồng bộ" — cả 2 đã nằm an toàn trên đĩa hoặc cả 2 đều chưa xảy ra.
2. **Job nền** (`setInterval`, mặc định 15s, biến môi trường `SYNC_INTERVAL_MS`, dùng `.unref()` để không giữ process sống — cùng pattern với `webadmin/apps/api/src/index.ts`) mỗi chu kỳ:
   - Kiểm tra Cloud có sống không (`GET {CLOUD_PROPERTY_API_URL}/health`, timeout 3s).
   - Nếu sống: **PUSH** toàn bộ `outbox_events` đang `PENDING` lên Cloud qua API property-web sẵn có, đánh dấu `SYNCED` khi Cloud trả 2xx, `FAILED` + tăng `attempts` + ghi `last_error` khi lỗi (vẫn giữ lại để thử lại chu kỳ sau — không xoá, không crash).
   - Rồi **PULL** `room_types`/`rooms`/`bookings`/`users` (hồ sơ, không mật khẩu) mới nhất từ Cloud, upsert cục bộ theo **last-write-wins** (so `updated_at`).
   - Không bao giờ `throw` ra ngoài — mọi lỗi mạng được bắt và trả về trong `SyncSummary`, giống hệt tinh thần "never throw on fetch failure" của `webadmin/apps/api/src/lib/iotSync.ts`.
3. `GET /health` (không cần đăng nhập) trả `{ status, db_mode, cloud_reachable, pending_outbox_count, last_sync_at, edge_node_id }` — dùng cho banner trạng thái trên UI khẩn cấp.
4. `GET /api/v1/sync/status` (cần đăng nhập) trả chi tiết hơn: số lượng theo trạng thái, 20 sự kiện gần nhất.
5. `POST /api/v1/sync/trigger` (cần đăng nhập) buộc chạy ngay 1 chu kỳ đồng bộ — dùng khi nhân viên vừa có mạng lại, không muốn đợi chu kỳ nền tiếp theo.

### Giới hạn đồng bộ push (ghi rõ, không giấu)

`property-web` hiện KHÔNG có endpoint "upsert theo ID do client tự sinh" (đúng thiết kế REST thông thường — `POST /bookings` luôn để Cloud tự sinh ID). Vì vậy:

- Booking **tạo mới lúc offline** tại Edge Node, khi đẩy lên Cloud qua `POST /api/v1/bookings`, sẽ được Cloud gán **ID mới, khác ID cục bộ**. Các sự kiện tiếp theo của CHÍNH booking đó (check-in/check-out) phát sinh trước khi đồng bộ round-trip đầu tiên hoàn tất sẽ không tìm thấy đúng bản ghi tương ứng ở Cloud (Cloud trả 404) — sự kiện đó được ghi `FAILED` + `last_error`, KHÔNG làm crash job, KHÔNG mất dữ liệu (vẫn đúng ở local), nhưng **không tự sửa được** trong bản MVP này.
- Muốn giải quyết triệt để cần 1 trong 2 hướng (không làm ở bản này, để lại cho phase sau): (a) thêm endpoint nội bộ ở `property-web` chấp nhận ID Edge Node tự sinh (bảo vệ bằng internal-service-key, giống `middleware/internalAuth.ts` đã có sẵn cho `GET /branches`), hoặc (b) Edge Node tự giữ bảng ánh xạ `local_id -> cloud_id`.
- Sự kiện loại `device_command` (issue/ack lệnh IoT) hiện **không có endpoint Cloud tương ứng** (`property-web` chỉ có khái niệm `power_on` đơn giản, không có mô hình lệnh idempotent như `iot-service`) — các sự kiện này được coi là "đã đồng bộ" ngay (không có gì để đẩy), việc kết nối thật với `services/iot-service` là bước tiếp theo hợp lý.
- Các sự kiện `room`/`device` (đổi trạng thái phòng, bật/tắt điện) đẩy đúng và đầy đủ qua `PATCH /api/v1/rooms/:id`, `PATCH /api/v1/rooms/:id/power`, `PATCH /api/v1/devices/:id/power` — các trường hợp này ID được chia sẻ đúng (vì bản ghi phòng/thiết bị luôn bắt nguồn từ pull-sync ban đầu từ Cloud), không gặp vấn đề lệch ID như booking.

### Đồng bộ `property_users`

`GET /api/v1/users` của Cloud property-web **cố tình không trả `password_hash`** ra ngoài (bảo mật đúng đắn — xem `property-web/apps/api/src/routes/users.routes.ts`). Vì vậy Edge Node **không thể** đồng bộ mật khẩu thật qua API công khai hiện có:

- Lúc bootstrap lần đầu, Edge Node tự seed sẵn 4 tài khoản demo giống hệt Cloud (`owner`/`manager`/`reception`/`housekeeping`, mật khẩu chung `Anio2026@`) để đăng nhập offline hoạt động ngay.
- Job pull-sync chỉ cập nhật các trường KHÔNG nhạy cảm (họ tên/email/vai trò/trạng thái) cho user đã tồn tại cục bộ (khớp theo `username`) — KHÔNG BAO GIỜ đụng `password_hash`, KHÔNG tự tạo user mới cục bộ nếu chưa biết mật khẩu.
- Theo dõi: muốn đồng bộ mật khẩu thật an toàn cần 1 endpoint nội bộ chuyên dụng ở `property-web` (bảo vệ bằng internal-service-key/mTLS, chỉ Edge Node đã xác thực gọi được) — chưa làm ở bản này.

### Xác thực (JWT) — quyết định

Edge Node dùng vòng đời JWT **độc lập** với Cloud property-web (biến môi trường `JWT_SECRET` riêng, mặc định khác giá trị dev của property-web). Đây là lựa chọn đơn giản nhất cho MVP — mỗi hệ thống tự cấp/tự kiểm tra token của chính nó, không phụ thuộc lẫn nhau. Nếu muốn 1 token issue ở Cloud dùng lại được ở Edge Node (và ngược lại), chỉ cần đặt **cùng giá trị** `JWT_SECRET` ở 2 nơi (cùng thuật toán HS256, cùng payload shape `{id, email, role, propertyId, tenantId}`) — không cần thêm cơ chế nào khác.

## Ranh giới phạm vi (có chủ đích, không phải thiếu sót)

Edge Node **KHÔNG** cố sao chép toàn bộ `property-web`. Phạm vi CHỈ đủ để lễ tân **tiếp tục vận hành được** khi mất mạng/máy chính hỏng:

| Có ở Edge Node | KHÔNG có (out of scope, vẫn ở Cloud) |
|---|---|
| `rooms`, `room_types` (bản sao + sửa cục bộ) | `customers` (booking lưu thẳng `guest_name`/`guest_phone` dạng text) |
| `bookings` (tạo/sửa/check-in/check-out) | `invoices`, `expenses` |
| `property_users` (subset, đăng nhập offline) | `property_settings`, `audit_log` đầy đủ |
| `devices`, `device_commands` (idempotent, mirror `iot-service`) | Channel Manager, AI Pricing, CRM (các service khác ngoài phạm vi PMS-critical) |
| `outbox_events` (đồng bộ 2 chiều) | Dashboard doanh thu đầy đủ (ADR/RevPAR...) |

UI khẩn cấp (`public/index.html`) cũng **cố tình tối giản** — HTML/CSS/JS thuần, KHÔNG build step, chỉ đủ: xem phòng, xem/check-in/check-out đặt phòng hôm nay, bật/tắt thiết bị IoT, banner trạng thái đồng bộ. Đây KHÔNG phải bản port lại toàn bộ giao diện Next.js của `property-web` (việc đó là 1 nhiệm vụ lớn riêng, không nằm trong phạm vi Edge Node — mục tiêu của Edge Node là "đủ dùng khi khẩn cấp", không phải "đẹp/đầy đủ tính năng").

## Chạy thử (không cần Docker)

```
cd smart-hotel-os/apps/edge-node
npm install
npm run dev
```

- Mặc định `DB_MODE=embedded` (PGlite, WASM Postgres chạy thẳng trong Node — không cần cài PostgreSQL/Docker), dữ liệu lưu tại `apps/edge-node/.data/edge-node-db`.
- **Lần chạy ĐẦU TIÊN** có thể mất tới ~30 giây (PGlite khởi tạo cụm CSDL WASM từ đầu — đã đo thực tế lúc kiểm thử, xem `PROGRESS.md`). Các lần chạy sau nhanh hơn nhiều vì dữ liệu đã có sẵn trên đĩa.
- Cổng mặc định **4200**, BẮT BUỘC bind `0.0.0.0` (xem `src/index.ts`) — mở trình duyệt bất kỳ máy nào trong cùng WiFi khách sạn tại `http://<ip-lan-cua-may-chay-edge-node>:4200`.
- Tài khoản demo (giống Cloud property-web): `owner` / `manager` / `reception` / `housekeeping`, mật khẩu chung `Anio2026@`.
- Copy `.env.example` sang `.env` nếu muốn chỉnh `CLOUD_PROPERTY_API_URL`, `SYNC_INTERVAL_MS`, `PORT`,...

## Quan hệ với `webadmin` (Hardware Assets)

`webadmin/apps/api` đã có sẵn kiểu tài sản `EDGE_NODE` trong enum `hardware_assets` (đăng ký sẵn cho tương lai). **Chưa làm ở bản này** (nằm ngoài phạm vi nhiệm vụ): Edge Node có thể tự báo cáo tình trạng sống (heartbeat/uptime/số sự kiện outbox đang chờ) lên `webadmin` qua đúng các endpoint asset-monitoring đã có sẵn ở đó, để đội vận hành HQ theo dõi tình trạng TOÀN BỘ Edge Node của mọi cơ sở trong 1 màn hình duy nhất — gợi ý bước tiếp theo hợp lý, không phải yêu cầu bắt buộc của nhiệm vụ hiện tại.

## Cấu trúc thư mục

```
apps/edge-node/
  database/migrations/001_init.sql   — schema tối giản (xem "Ranh giới phạm vi")
  public/index.html                  — UI khẩn cấp, không build step
  src/
    lib/db.ts                        — DbPool (postgres|embedded) + transaction() cho outbox pattern
    lib/embeddedBootstrap.ts         — migration + seed demo tự động khi npm run dev
    lib/sync.ts                      — outbox push + pull Cloud (trái tim offline-first)
    middleware/                      — auth (JWT riêng), rbac, errorHandler
    repositories/                    — rooms/roomTypes/bookings/devices/commands/outbox/propertyUsers
    routes/                          — REST API tương ứng + /api/v1/sync/{status,trigger}
    index.ts                         — bind 0.0.0.0, health check, job nền
```
