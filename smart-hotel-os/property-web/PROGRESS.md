# Progress — property-web

## 2026-08-22 — 9 màn hình Cài đặt: CRUD thật, sync/QR/SePay/xuất dữ liệu

Yêu cầu người dùng (nguyên văn, đã rà soát code thật trước khi sửa — không suy diễn):
sửa `/price` (Action Sửa/Xóa loại phòng+phòng, Sync theo phòng, QR Code cho khách),
`/payment` (khoá kênh chưa có API + thêm SePay thật), `/currency` (CRUD + tự động lấy tỷ
giá), `/tax` (CRUD + popup thêm), `/time` (mọi trường sửa được), `/printer` (chọn/kết nối
máy in + CRUD mẫu in), `/sync` (tuỳ chỉnh theo từng kết nối + danh sách thêm mới), `/db`
(cho phép lưu lại dữ liệu), `/users` (CRUD vai trò), `/assets` (CRUD + xuất file kiểm kê).

Thực hiện bằng 4 nhánh song song (không đụng file chung nhờ phân vùng trước: migration
006/007 tách riêng, `defaultSettings.ts`/`settingsSecrets.ts`/`settings.routes.ts` mỗi
nhánh chỉ chạm đúng phần của mình), sau đó gộp trung tâm (`index.ts`, kiểm thử tích hợp
toàn bộ) — xem chi tiết đầy đủ hơn tại `smart-hotel-os/DECISIONS.md` ADR-009/010/011 cho
các quyết định phạm vi quan trọng.

### Migration mới
- `006_room_pricing_sync_qr.sql`: `room_types` thêm `pricing_method`/`discount_percent`;
  `rooms` thêm `room_code` (hệ thống tự sinh, không nhận từ client), `qr_token` (khoá truy
  cập công khai), `sync_enabled`. Backfill 32 phòng demo có sẵn.
- `007_payment_sepay.sql`: `invoices` thêm `sepay_ref` (unique, chống khớp trùng 1 giao
  dịch 2 lần); bảng mới `sepay_webhook_events` (dedupe + audit trail webhook).

### `/price` — CRUD thật + Sync + QR khách
- `AddRoomTypeModal`/`AddRoomModal` từ form tĩnh → form thật (POST/PATCH), có chế độ Sửa.
  Bỏ trường "Tầng và phòng"/"Số lượng phòng" ở modal loại phòng (không khớp schema — phòng
  tạo riêng lẻ, không phải theo lô).
- "Sửa"/"Xóa" hoạt động thật cho cả 2 bảng; xoá loại phòng còn phòng gắn vào → 409 rõ ràng
  bằng tiếng Việt, không cho xoá ngầm.
- Cột "Sync" là công tắc thật (`PATCH /rooms/:id/sync`) — CHỈ đánh dấu phòng sẵn sàng đồng
  bộ, KHÔNG tự gọi API OTA thật (xem ADR-010).
- Cột "QR Code": mở ảnh QR (PNG, sinh server-side qua thư viện `qrcode`) trỏ tới trang công
  khai mới `/guest/room/[token]` (không cần đăng nhập) — khách quét mã thấy tên cơ sở/loại
  phòng/giá, và nếu SePay đã bật, có khung "Quét mã để thanh toán trước".

### `/payment` — khoá kênh chưa có API + tích hợp SePay thật
- Toàn bộ kênh cũ (VNPay/MoMo/ZaloPay/Stripe/thẻ/ví...) **vẫn hiển thị** nhưng bị khoá
  thao tác + nhãn "Chưa hỗ trợ"/"Chưa cấu hình — cần tích hợp API đối tác" (đúng yêu cầu:
  không xoá, chỉ tạm khoá vì chưa có API thật).
- SePay: form cấu hình thật (số TK/tên NH/chủ TK/API Token — Token mã hoá AES-256-GCM,
  không bao giờ trả về dạng rõ), nút "Đồng bộ giao dịch ngay" (gọi API Giao dịch SePay,
  khớp hoá đơn PENDING theo số tiền + mã hoá đơn trong nội dung chuyển khoản), webhook
  nhận real-time `POST /api/v1/payments/sepay/webhook` (idempotent theo `id` giao dịch),
  hộp thông tin URL webhook để dán vào dashboard SePay. Đã kiểm thử: webhook khớp đúng hoá
  đơn thành PAID, gọi trùng `id` không xử lý lại; token không bao giờ lộ ra response.

### `/currency`, `/tax` — CRUD thật
- Bảng tiền tệ: thêm/sửa/xoá dòng, checkbox "Lấy tỷ giá tự động" gọi endpoint mới
  `GET /api/v1/settings/currency/fx-rate?code=X` (server gọi `open.er-api.com`, không lộ
  CORS/API key ra trình duyệt). **Đã thử nối từ sandbox nhưng bị chặn bởi allowlist mạng
  của môi trường thử nghiệm** (không phải lỗi code) — endpoint và logic đã đúng, sẽ hoạt
  động khi triển khai ở môi trường có Internet đầy đủ; đã kiểm thử đường lỗi (502 rõ ràng)
  hoạt động đúng khi không gọi được.
- Bảng thuế/phí: `AddTaxModal` từ tĩnh → form thật (thêm/sửa/xoá), có lựa chọn "Tính vào
  hoá đơn khách"/"Chỉ hạch toán nội bộ".

### `/time` — mọi trường sửa được
- `checkinTime`/`checkoutTime` (trước đây chỉ hiển thị, không sửa được dù đã có API) nay
  là ô nhập thật. Định dạng giờ/múi giờ/giờ qua đêm/làm tròn giờ/thời gian dọn phòng/ngày
  chốt điện nước/ngày cắt điện/dịch vụ trả trước — tất cả chuyển từ tĩnh sang có state thật
  + lưu qua 1 nút "Cập nhật" duy nhất.
- `DatePickerModal` (trước đây luôn hiện cứng "Tháng 7/2026", bấm ngày nào cũng chỉ đóng
  modal, không gán vào đâu cả) viết lại hoàn toàn: điều hướng tháng thật, chọn ngày gán
  đúng vào đúng ô (ngày lễ Từ/Đến, ngày chốt điện nước, ngày cắt điện).

### `/printer` — giới hạn trung thực + CRUD mẫu in
- **Giới hạn kỹ thuật nêu rõ cho người dùng**: trình duyệt web KHÔNG có API để tự phát
  hiện/liệt kê danh sách máy in đã cài trên máy tính, và không thể âm thầm kết nối thẳng
  tới driver máy in nhiệt mà không có phần mềm trung gian cài trên máy — đây là giới hạn
  của mọi ứng dụng web, không riêng hệ thống này. Đã làm đúng mức tối đa khả thi: ô "Máy in
  mặc định" nhập tên thật (ghi nhớ, không phải kết nối trực tiếp), nút "In thử" mở hộp
  thoại in thật của hệ điều hành (`window.print()`) — đây là cách web chuẩn để thực sự in
  ra máy in thật.
- Mẫu in: CRUD thật (thêm/sửa/xoá), "Xem mẫu" mở rộng xem chi tiết dòng thay vì không làm
  gì.

### `/sync` — cấu hình theo từng kết nối (không đồng bộ thật, xem ADR-010)
- Từ danh sách checkbox phẳng → danh sách kết nối riêng từng OTA (mã cơ sở, API key mã hoá,
  cờ đồng bộ phòng/giá/tồn phòng, trạng thái Hoạt động/Tạm dừng), có form "+ Thêm kênh OTA"
  thật, Sửa/Tạm dừng/Xoá từng kết nối. Có đoạn giải thích rõ trên trang: đây là CẤU HÌNH,
  chưa phải đồng bộ thật với Booking/Agoda/Airbnb (cần hợp đồng đối tác + credential thật).

### `/db` — cho phép khách hàng lưu lại dữ liệu
- Endpoint mới `GET /api/v1/data-export` (chỉ OWNER/MANAGER): xuất toàn bộ dữ liệu cơ sở
  (phòng, loại phòng, khách hàng, đặt phòng, hoá đơn, chi phí, thiết bị, tài khoản — KHÔNG
  gồm mật khẩu, đã xác minh 0 lần xuất hiện `password_hash` trong kết quả — và toàn bộ 21
  nhóm cấu hình) thành 1 file JSON tải về trình duyệt. Cả nút "Sao lưu ngay" và "Xuất dữ
  liệu" đều gọi hành động thật này (không dựng hạ tầng sao lưu đám mây tự động giả — ngoài
  phạm vi một ứng dụng web thuần).

### `/users` — CRUD vai trò (xem giới hạn ở ADR-011)
- `RolePopupModal` từ tĩnh → form thật, gắn đúng vào dữ liệu `roles.permissionGroups` thật
  (trước đây đọc nhầm từ mảng tĩnh không liên quan trong `mock-data.ts`). Sửa/thêm vai trò
  lưu thật. Cảnh báo rõ trong modal khi tên vai trò không khớp 1 trong 4 vai trò có phân
  quyền thật ở tầng API.

### `/assets` — CRUD thật + xuất file kiểm kê
- `AddAssetModal` từ tĩnh → form thật (thêm/sửa), menu "⋯" có Sửa/Xóa thật, nút "📄 Export"
  xuất file CSV (có BOM UTF-8 để mở bằng Excel không lỗi font) đúng phục vụ mục đích kiểm
  kê tài sản. Quyền sửa vẫn giới hạn OWNER/MANAGER (đã có sẵn từ cơ chế settings chung, xem
  RECEPTIONIST/HOUSEKEEPING chỉ xem được).

### Đã kiểm chứng THẬT (curl end-to-end, không chỉ build sạch)
- `npx tsc --noEmit` sạch cho cả `apps/api` và `apps/web`; `next build` thành công đủ 32
  route kể cả `/guest/room/[token]` mới.
- DB nhúng từ đầu (migration 001→007 chạy tuần tự không lỗi), seed lại đúng.
- Toàn bộ endpoint mới đã curl-test thật: CRUD loại phòng/phòng (kèm case xoá bị chặn do
  còn phòng gắn vào), công tắc sync, ảnh QR PNG hợp lệ, trang công khai theo token (200 khi
  đúng / 404 khi sai), SePay (redact token, webhook khớp + chống trùng), xuất dữ liệu (401
  khi chưa đăng nhập, không lộ password_hash), sửa vai trò, tỷ giá tự động (đường lỗi khi
  mạng sandbox chặn).

### Giới hạn còn lại (không che giấu)
- Tỷ giá tự động cần môi trường có Internet đầy đủ để test hết đường thành công (đã test
  đường lỗi, code đúng nhưng chưa thấy phản hồi thành công thật do allowlist sandbox).
- SePay webhook cần URL công khai mới nhận được real-time từ SePay — chạy `localhost` chỉ
  dùng được nút đồng bộ thủ công.
- `/sync` chỉ là cấu hình, chưa đồng bộ thật OTA (ADR-010). `/users` roles chỉ là mô tả,
  chưa phải RBAC động thật (ADR-011). Máy in không thể tự phát hiện danh sách máy in cài
  trên máy (giới hạn nền tảng web, đã giải thích trong UI).

## 2026-07-28 (phiên 6) — Nối NỐT 24/24 màn hình còn lại vào API thật

Nhiệm vụ: trước phiên này chỉ 4/28 màn hình (Đăng nhập, Dashboard, Rooms,
Booking) nối API thật, 24 màn còn lại đọc `mock-data.ts` tĩnh. Phiên này nối
**TOÀN BỘ 24/24 màn hình còn lại** vào API thật — property-web giờ **KHÔNG
còn màn hình nào dùng mock-data cho dữ liệu nghiệp vụ** (chỉ còn vài mảng
tĩnh không thể/không cần nối API — liệt kê ở mục "Còn mock" cuối phần này).

**Lưu ý quan trọng về lịch sử phiên này**: khi bắt đầu, phần lớn nhóm vận
hành (9 màn: price/payment/expenses/night-audit/customers/services/marketing/
utilities/modules) và 5/16 màn Cài đặt (branches/basic/amenities/images/
email) đã được một lượt làm việc trước đó (cùng phiên, ngữ cảnh bị ngắt giữa
chừng — chưa kịp cập nhật PROGRESS.md/memory.md) nối xong, kèm sẵn hạ tầng
`database/migrations/003_property_settings.sql` + `apps/api/src/lib/
defaultSettings.ts` + `settingsBootstrap.ts` + `apps/api/src/repositories/
settings.repo.ts` + `apps/api/src/routes/settings.routes.ts` +
`apps/web/src/lib/useSettings.ts` + route `branches`/`users`/`audit-log`.
Phiên này: xác minh lại toàn bộ phần đã có, rồi nối nốt **11 màn Cài đặt còn
lại** (security, currency, tax, time, printer, channel, sync, db, social,
assets, users) theo đúng hạ tầng có sẵn, dọn `mock-data.ts`, và làm đầy đủ
bước kiểm chứng bắt buộc (tsc/build/curl) cho toàn bộ 24 màn.

### Quyết định kiến trúc (đã có sẵn từ trước, xác nhận lại + áp dụng tiếp)

1. **1 bảng `property_settings` (key-value theo nhóm) thay vì ~18 bảng
   riêng** cho các màn hình dạng "form cấu hình" (basic/amenities/images/
   email/security/currency/tax/time/printer/channel/sync/db/social/modules/
   utilities/assets/services/marketing/daily_entries/payment/roles — 21 nhóm).
   Schema: `database/migrations/003_property_settings.sql` — cột `property_id`
   + `tenant_id` + `group_key` + `data JSONB`, unique `(property_id,
   group_key)`. Lý do: các màn này đều có hình dạng "đọc 1 blob cấu hình →
   hiển thị → sửa → lưu lại nguyên blob", không cần join quan hệ; gọn hơn
   nhiều so với 18+ bảng cho MVP; dễ mở rộng nhóm mới không cần migration.
   Giá trị mặc định cho từng nhóm nằm ở `apps/api/src/lib/defaultSettings.ts`
   (copy đúng số liệu mẫu từ `mock-data.ts` cũ để giao diện không đổi), được
   seed lúc API khởi động qua `apps/api/src/lib/settingsBootstrap.ts` (chạy
   SAU bootstrap embedded/seed property demo — vì cần `property_id` đã tồn
   tại — idempotent, chỉ insert nhóm còn thiếu).
2. **`GET/PUT /api/v1/settings/:group`** (`apps/api/src/routes/
   settings.routes.ts`) — GET cho mọi role đã đăng nhập đọc được (kể cả
   RECEPTIONIST/HOUSEKEEPING, đã test — vì nhiều form chỉ hiển thị thông tin
   tham khảo không nhạy cảm); PUT chỉ OWNER/MANAGER (đối chiếu
   `docs/PERMISSION_MATRIX.md` — RECEPTIONIST/HOUSEKEEPING không được sửa
   cấu hình hệ thống). `VALID_GROUPS` chặn client ghi vào group_key tuỳ ý.
3. **`/branches`** dùng lại bảng `properties` có sẵn (không bảng mới) —
   `apps/api/src/repositories/properties.repo.ts` + `routes/branches.routes.ts`.
   Xem toàn tenant (chuỗi khách sạn), chỉ OWNER được thêm cơ sở mới.
4. **`/users`** dùng lại bảng `property_users` có sẵn (không bảng mới) —
   bổ sung `propertyUsersRepo.listByProperty/countByRole/create/
   updateRoleStatus` + `routes/users.routes.ts` (`GET/POST /users`,
   `PATCH /users/:id` đổi role/status). Cả GET lẫn PUT chỉ OWNER/MANAGER
   (khác các nhóm settings khác — danh sách tài khoản là dữ liệu nhạy cảm
   nên hạn chế đọc luôn, không chỉ hạn chế ghi).
   **UI `/users` được MỞ RỘNG so với bản gốc** (bản gốc pixel-perfect chỉ có
   bảng "Danh sách vai trò" tĩnh, không có bảng tài khoản thật): giữ nguyên
   bảng vai trò (đọc từ `property_settings` nhóm "roles" — mô tả phạm vi
   quyền — ghép với số người dùng THẬT tính từ `property_users`), và **thêm
   mới** khối "Tài khoản người dùng" bên dưới (không có trong bản gốc) để
   thoả đúng yêu cầu nghiệp vụ "xem danh sách, thêm user, đổi vai trò,
   khoá/mở" — có modal thêm tài khoản thật (trả mật khẩu tạm 1 lần, giống
   cách `webadmin` xử lý), dropdown đổi vai trò, nút khoá/mở tại chỗ. Đã
   test: khoá tài khoản → đăng nhập tài khoản đó trả 401 ngay (route
   `/auth/login` vốn đã kiểm tra `status !== 'ACTIVE'` sẵn từ trước, không
   cần sửa gì thêm).
5. **`/channel` và `/sync`** (kênh bán OTA/đồng bộ) lưu cấu hình cấp cơ sở
   trong `property_settings` (nhóm "channel"/"sync") của property-web —
   **KHÔNG gọi chéo trực tiếp** sang `smart-hotel-os/services/
   channel-manager-service` (đúng ranh giới kiến trúc `ARCHITECTURE_OVERVIEW.md`
   — 2 hệ thống không dùng chung DB, chỉ giao tiếp qua API nếu cần, và việc
   đó chưa nằm trong phạm vi phiên này). Đồng bộ THẬT với service kia (OTA
   thật, credential thật) là bước sau — hiện tại dữ liệu ở đây thuần là cấu
   hình/khai báo hiển thị trên UI, khớp đúng dữ liệu mẫu cũ.
6. **Công tắc bật/tắt (`security`, `social`, `sync`) lưu NGAY khi bấm** (gọi
   `save()` trực tiếp trong `onClick`, không cần nút "Cập nhật" riêng) — hợp
   lý hơn cho hành vi bật/tắt tức thời. Khác quyết định cũ ở phiên 2 (giữ 3
   công tắc trang `/sync` tĩnh vì bản gốc không có `onClick`) — nay đã có
   bảng cấu hình thật để đọc/ghi nên bật `onClick` thật cho cả 3, đổi quyết
   định cũ (ghi rõ ở đây để không mâu thuẫn với ghi chú phiên 2).
7. **`/time`**: nút "Cập nhật" (bản gốc tĩnh, không có `onClick`) nay gọi
   PUT thật, lưu lại danh sách ngày lễ (thêm dòng bằng nút "+") +
   `checkinTime`/`checkoutTime`. Các trường còn lại (định dạng giờ, múi giờ,
   làm tròn giờ, cấu hình giờ qua đêm) vẫn tĩnh — không có cột dữ liệu tương
   ứng trong nhóm "time", để dành mở rộng sau nếu cần.
8. **`/currency`, `/tax`, `/printer`, `/channel`, `/db`, `/assets`**: chỉ có
   bảng hiển thị (đọc thật từ API), nút "+ Thêm..." giữ tĩnh đúng hành vi
   bản gốc (modal placeholder có sẵn từ phiên 2, không có form thật) — vì
   bản gốc không có trường nào sửa được tại chỗ trong các bảng này, "lưu"
   không áp dụng ở đây (đã đọc thật là đủ thoả yêu cầu tối thiểu).

### Đã xoá khỏi `mock-data.ts` (dữ liệu mẫu tĩnh — không xoá các type/interface còn dùng)

`channels`/`ChannelRow`, `roles`/`RoleRow`, `assets`/`AssetRow`,
`branches`/`BranchRow`, `floorInputs`, `amenityGroups`+`zip3`+`activitiesList`+
`amenityServicesList`, `photoGalleryCount`+`roomImageTypes`, `emailFields`+
`autoEmails`, `securityItemsSeed`, `currencies`, `taxes`, `holidaysSeed`+
`prepaidServices`, `otaChannels`, `dbInfo`, `socialLinksSeed`/`SocialLink`,
`printTemplates`, `campaignsSeed`, `customersSeed`, `ownServicesSeed`,
`partnerServicesList`, `utilityLinksSeed`, `advancedModulesSeed`. Giữ lại các
type/interface còn được import làm kiểu dữ liệu ở nơi khác (`CampaignRow`,
`CustomerRow`, `OwnServiceRow`, `PartnerServiceRow`, `UtilityLink`,
`AdvancedModule`, `permissionGroups`, `accountActivity`...) — file
`mock-data.ts` co lại đáng kể nhưng chưa xoá hẳn (còn Dashboard/Rooms/
Booking/Price/Payment/Expenses dùng type + vài hàm dựng dữ liệu Gantt, xem
mục "Còn mock" bên dưới).

### Trạng thái CHÍNH XÁC 28/28 màn hình (sau phiên 6)

**Đã nối API thật (28/28 — TOÀN BỘ):**

| Nhóm | Màn hình | Nguồn dữ liệu |
|---|---|---|
| Lõi (phiên 4) | Đăng nhập, Dashboard, Rooms, Booking | bảng nghiệp vụ riêng |
| Vận hành | `/price` | `room_types`+`rooms` |
| Vận hành | `/payment` | `invoices` + `property_settings` nhóm "payment" |
| Vận hành | `/expenses` (2 tab) | `expenses` + `property_settings` nhóm "daily_entries" |
| Vận hành | `/night-audit` | `invoices` |
| Vận hành | `/customers` | `customers` |
| Vận hành | `/services` | `property_settings` nhóm "services" |
| Vận hành | `/marketing` | `property_settings` nhóm "marketing" |
| Vận hành | `/utilities` | `property_settings` nhóm "utilities" |
| Vận hành | `/modules` | `property_settings` nhóm "modules" |
| Cài đặt | `/branches` | bảng `properties` |
| Cài đặt | `/basic` (3 tab), `/amenities` (3 tab), `/images`, `/email` (2 tab) | `property_settings` |
| Cài đặt | `/security`, `/currency`, `/tax`, `/time`, `/printer` | `property_settings` |
| Cài đặt | `/channel`, `/sync`, `/db`, `/social`, `/assets` | `property_settings` |
| Cài đặt | `/users` | bảng `property_users` + `property_settings` nhóm "roles" |

**Còn mock (không phải dữ liệu nghiệp vụ chính, giữ tĩnh có chủ đích):**

- `accountActivity` (nhật ký hoạt động tài khoản, trang `/security`) — chưa
  có bảng trình bày riêng cho UI này (bảng `audit_log` thật đã có nhưng shape
  khác — ghi mọi hành động hệ thống, không riêng "đăng nhập/đổi mật khẩu" —
  để dành phiên sau nối đúng qua `GET /api/v1/audit-log` đã có sẵn route).
- Dashboard: 3 khối cột 1 (thu/chi theo thời gian, lợi nhuận thuần), "Gói
  được lựa chọn nhiều nhất", cột 3 (hoạt động mới nhất, khách hàng mới), tab
  Gantt Lịch đặt phòng — như đã ghi từ phiên 4, chưa có bảng nguồn tương ứng
  (`revenue_daily`...), ngoài phạm vi phiên này.
- Các modal "+Thêm" placeholder tĩnh (AddTaxModal, AddAssetModal, AddOtaModal,
  RolePopupModal, AddPartnerModal...) — kế thừa đúng hành vi bản gốc (không
  có form thật trong thiết kế gốc), không tự chế thêm ngoài đặc tả.
- `booking`/`rooms`/`price`/`payment`/`expenses` vẫn import vài `interface`/
  hàm tiện ích từ `mock-data.ts` (`RoomCard`, `BookingRow`, `buildGanttGroups`,
  `roomStatusInfo`...) — đây là kiểu dữ liệu dùng chung, KHÔNG phải dữ liệu
  mock hiển thị, giữ nguyên.

### Đã kiểm chứng THẬT (bắt buộc — không chỉ build sạch)

Cài đặt + build tại `/tmp/pw` (rsync từ `D:\hotel\OSS\...`, loại trừ
`node_modules`/`.next`/`.data`/`.git`), source thật đã sửa trực tiếp tại
`D:\hotel\OSS\smart-hotel-os\property-web\...` từ đầu:

- `npx tsc --noEmit` sạch cho cả `apps/api` và `apps/web` (test lại 2 lần —
  trước và sau khi dọn `mock-data.ts` — cả 2 lần đều sạch).
- `next build` (Turbopack) thành công đủ **32 route** (28 màn PMS + `/login`
  + `/` + `/_not-found` + `/stub/[key]`).
- Chạy API thật `npx tsx src/index.ts` ở `DB_MODE=embedded` (không Docker),
  DB xoá sạch mỗi lần test để xác nhận migration 001→003 + seed chạy lại từ
  đầu đúng, sau đó `curl` qua JWT thật (`manager`/`Anio2026@`):
  - `GET/PUT /api/v1/settings/security|currency|tax|social|roles|printer|db|channel|sync|payment|marketing|services|utilities|modules|assets|amenities|basic|images|email` — **tất cả 200**, PUT `/settings/tax` xác nhận ghi rồi đọc lại đúng dữ liệu vừa lưu.
  - `GET /api/v1/branches` — 200, trả đúng property demo + `room_count`.
  - `GET /api/v1/users` — 200, trả 4 tài khoản demo + `role_counts`.
  - `POST /api/v1/users` — 201, tạo tài khoản mới kèm `temp_password`.
  - `PATCH /api/v1/users/:id` — đổi `status: DISABLED` rồi thử đăng nhập lại
    → **401 INVALID_CREDENTIALS đúng như kỳ vọng**; đổi lại `ACTIVE` +
    `role: HOUSEKEEPING` → đăng nhập lại thành công, JWT phản ánh role mới.
  - RBAC: RECEPTIONIST gọi `GET /api/v1/users` → **403**; RECEPTIONIST gọi
    `PUT /api/v1/settings/tax` → **403**; RECEPTIONIST gọi
    `GET /api/v1/settings/tax` → **200** (đọc vẫn được, đúng thiết kế); MANAGER
    gọi `POST /api/v1/branches` (chỉ OWNER) → **403**.
  - `GET /api/v1/dashboard/summary`, `/rooms`, `/bookings`, `/payments`,
    `/expenses` — vẫn 200 sau toàn bộ thay đổi (không phá luồng lõi phiên 4).
  - `GET /api/v1/settings/badgroup` (nhóm không hợp lệ) → đúng **404**.

### Giới hạn còn lại (rõ ràng, không che giấu)

- `accountActivity` (trang Bảo vệ) và 3-4 khối Dashboard vẫn mock — xem mục
  "Còn mock" ở trên, không phải lỗi bỏ sót mà là thiếu bảng nguồn tương ứng
  trong phạm vi MVP hiện tại.
- `/channel`, `/sync` chỉ là cấu hình cấp cơ sở lưu trong DB property-web,
  CHƯA đồng bộ thật với `services/channel-manager-service` (đúng ranh giới
  kiến trúc, xem mục quyết định #5) — việc nối 2 hệ thống này là bước sau,
  cần thiết kế API-to-API auth trước (đã ghi trong `memory.md` mục "Chưa
  làm" từ phiên 4).
- `JWT_SECRET` mặc định dev vẫn là giá trị cố định trong code (kế thừa phiên
  5, không đổi ở phiên này) — chỉ an toàn cho máy cá nhân.
- Chưa test `docker compose up --build` thật (không có Docker trong sandbox)
  — chỉ test qua chế độ embedded, đúng phạm vi "test bằng curl trong sandbox"
  theo yêu cầu.

## 2026-07-28 (phiên 5) — Chạy được KHÔNG CẦN DOCKER + đổi tài khoản demo đơn giản

Nhiệm vụ: người dùng dùng Windows, không bật được Docker Desktop (lỗi
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ...
The system cannot find the file specified`) nên bị chặn hoàn toàn — mở được
`http://localhost:3100/login` (Next.js dev chạy độc lập, không cần backend) nhưng bấm đăng
nhập luôn báo "Đăng nhập thất bại" vì API (4100) và Postgres (5433) trước đây CHỈ chạy được
qua `docker compose`.

### 1. Chế độ database "embedded" — không cần Docker, không cần cài PostgreSQL

- Thêm `@electric-sql/pglite` vào `apps/api/package.json` (PostgreSQL biên dịch WASM, chạy
  thẳng trong tiến trình Node, lưu ra thư mục file — tải qua `registry.npmjs.org`, không bị
  chặn bởi allowlist sandbox khác với `binaries.prisma.sh`).
- `apps/api/src/lib/db.ts` — viết lại: biến `DB_MODE` (`"postgres"` khi có `DATABASE_URL`,
  ngược lại mặc định `"embedded"`, có thể ép bằng biến môi trường `DB_MODE`). Chế độ embedded
  bọc PGlite bằng 1 adapter mỏng khớp đúng interface `pool.query(text, params) ->
  { rows, rowCount }` mà TOÀN BỘ 9 file repository đang dùng — **không sửa bất kỳ file
  repository nào**. Đã kiểm tra kỹ: không có file nào dùng `pool.connect()`/transaction thủ
  công (`grep pool\.connect` ra rỗng) nên không cần adapter transaction phức tạp hơn.
- `apps/api/src/lib/embeddedBootstrap.ts` (MỚI) — khi API khởi động ở chế độ embedded: tự
  chạy các file `database/migrations/*.sql` còn thiếu (theo dõi qua bảng `_migrations`, dùng
  `db.transaction()` của PGlite để BEGIN/COMMIT từng file), rồi tự seed dữ liệu demo NẾU bảng
  `property_users` đang rỗng — idempotent, an toàn gọi lại mỗi lần khởi động. `index.ts` gọi
  `bootstrapEmbeddedDb()` trước `app.listen()`.
- `apps/api/src/middleware/auth.ts` — `JWT_SECRET` giờ có giá trị mặc định CHỈ DÀNH CHO DEV
  khi `NODE_ENV !== "production"` và biến môi trường không được set (kèm `console.warn`) —
  để `npm run dev` chạy được ngay không cần tạo `.env` thủ công, đúng yêu cầu "càng ít bước
  thủ công càng tốt". Production vẫn bắt buộc phải set `JWT_SECRET` (throw nếu thiếu).
- Sự cố gặp khi test: PGlite không tự tạo thư mục cha đệ quy → lỗi `ENOENT` khi thư mục
  `apps/api/.data/` chưa tồn tại — đã sửa bằng `mkdirSync(dir, { recursive: true })` trước
  khi khởi tạo `new PGlite(...)`.
- `.data/` (thư mục dữ liệu PGlite) đã thêm vào `.gitignore`.

### 2. Đổi tài khoản demo — bỏ đuôi email, mật khẩu mới

- Migration MỚI `database/migrations/002_add_username.sql` (KHÔNG sửa `001_init.sql`) —
  thêm cột `username TEXT UNIQUE NOT NULL` vào `property_users` (backfill từ phần trước `@`
  của email cho bản ghi cũ nếu có). Cột `email` VẪN GIỮ nguyên (tương thích ngược).
- `POST /auth/login` — đổi schema Zod từ `email: z.string().email()` (từ chối tên đăng nhập
  ngắn không có `@`) sang `username: z.string().min(1)`. `propertyUsers.repo.ts` thêm
  `findByUsernameOrEmail(identifier)` — tra theo `username = $1 OR email = $1`, tra cứu được
  cả username ngắn LẪN email đầy đủ dạng cũ.
- Tài khoản demo mới: `owner` / `manager` / `reception` / `housekeeping` (bỏ đuôi
  `@anio-riverside.local`), mật khẩu chung đổi từ `ChangeMe123!` → `Anio2026@`.
- Cập nhật đồng bộ: `database/seed.ts`, `apps/api/src/lib/embeddedBootstrap.ts` (seed riêng
  cho chế độ embedded, cùng dữ liệu), trang `apps/web/src/app/login/page.tsx` (label "Tên
  đăng nhập" thay "Email", khối gợi ý tài khoản demo), `apps/web/src/lib/auth.tsx` (đổi tham
  số `login(email, password)` → `login(username, password)`, payload gửi API đổi key), `README.md`,
  `docker-compose.yml` (comment đầu file), `.env.example`.

### 3. Script khởi động 1 cú bấm cho Windows + tài liệu

- `property-web/start-dev.bat` (MỚI) — tự kiểm tra Node, tự `npm install` nếu thiếu
  `node_modules`, mở 2 cửa sổ CMD (API chế độ embedded + Web), in rõ URL/tài khoản demo.
  Có cảnh báo ngay trong file: nếu double-click không mở được cửa sổ (nghi phần mềm bảo
  mật/EDR chặn, đã từng gặp ở phiên 4 với `_start-property-web.bat` tại gốc `D:\hotel\OSS`),
  đây chỉ là tiện ích phụ — đường chính là gõ tay lệnh trong README.
- `README.md` — viết lại hoàn toàn mục "Chạy thử": **Cách 1 (khuyến nghị, không cần
  Docker)** lên đầu, lệnh PowerShell + CMD riêng biệt (không dùng `&&` trần), 2 cửa sổ
  terminal; **Cách 2 (nếu có Docker)** giữ nguyên `docker compose up --build`, nhấn mạnh
  phải mở Docker Desktop và đợi hết xoay trước. Thêm mục "Xử lý sự cố" — 3 lỗi thực tế người
  dùng đã gặp: (a) lỗi npipe `dockerDesktopLinuxEngine` → Docker Desktop chưa chạy; (b)
  "Đăng nhập thất bại" → kiểm tra `http://localhost:4100/health`; (c) PowerShell chặn script
  → `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### 4. Đã kiểm chứng THẬT (không chỉ build sạch)

Làm việc nặng (`npm install`) tại `/tmp/pw` (copy source, KHÔNG copy `node_modules`/`.next`/
`.data`/`.git`), test chạy thật rồi mới đối chiếu lại source ở `D:\hotel\OSS\...` (source đã
sửa trực tiếp tại đường dẫn thật ngay từ đầu, `/tmp` chỉ dùng để cài gói + chạy thử):

- `npx tsc --noEmit` sạch cho cả `apps/api` và `apps/web`; `database/` cũng sạch.
- `next build` (Turbopack) thành công đủ 32 route kể cả `/login`.
- Chạy thật `npx tsx src/index.ts` ở `DB_MODE=embedded` KHÔNG cần Docker/PostgreSQL: log cho
  thấy tự áp dụng `001_init.sql` + `002_add_username.sql`, tự seed demo lần đầu.
- `curl POST /api/v1/auth/login` với `{"username":"manager","password":"Anio2026@"}` →
  **trả về JWT thành công** (200, `access_token` + `user` object).
- `curl GET /api/v1/auth/me` và `curl GET /api/v1/rooms` kèm `Authorization: Bearer <token>`
  → đều trả dữ liệu thật (32 phòng seed sẵn) — chứng minh luồng đăng nhập chạy end-to-end,
  không chỉ trả token suông.
- Login sai mật khẩu → đúng lỗi `INVALID_CREDENTIALS` (401).
- Khởi động lại lần 2 (không xoá `.data/`) → log cho thấy bỏ qua migration đã áp dụng, bỏ
  qua seed (đã có dữ liệu), đăng nhập lại vẫn thành công, kể cả bằng email cũ
  `owner@anio-riverside.local` (tương thích ngược) — xác nhận persistence + idempotency.

### Giới hạn còn lại

- Chưa test được `docker compose up --build` thật trong sandbox (không có Docker) — chỉ sửa
  comment/README, dựa trên cấu trúc docker-compose không đổi từ phiên 4 (đã test lúc đó).
  Nếu người dùng bật được Docker Desktop sau này và gặp lỗi mới, cần test lại.
- `start-dev.bat` chưa test được double-click thật trên máy Windows của người dùng (sandbox
  không có GUI Windows) — dựa trên bài học từ `_start-property-web.bat` ở phiên 4 (không mở
  được cửa sổ trên máy người dùng) nên README đã nhấn mạnh lệnh gõ tay là đường chính.
- Chưa nối 24/28 màn hình còn lại vào API thật (việc của một agent khác đang chạy song
  song, xem `memory.md` mục "Đang làm") — nhiệm vụ phiên này chỉ tập trung "chạy được không
  cần Docker" + đổi tài khoản demo, không mở rộng phạm vi.
- `JWT_SECRET` mặc định dev là giá trị cố định trong code — CHỈ an toàn cho máy cá nhân chạy
  cục bộ, không dùng cho môi trường nhiều người dùng/production (đã có cảnh báo `console.warn`
  + code chặn cứng nếu `NODE_ENV=production`).

## 2026-07-27 (phiên 4) — Xây `apps/api` thật + Auth thật, nối API cho luồng lõi

Nhiệm vụ: property-web trước phiên này 100% dữ liệu mock và KHÔNG có đăng nhập (ai mở
link cũng vào thẳng được) — lỗ hổng nghiêm trọng. Phiên này xây API thật song song với
`apps/web/` đã có (đúng cấu trúc `webadmin/apps/api`: Express + TypeScript + `pg` thuần,
KHÔNG dùng Prisma, JWT auth, migration SQL đánh số, docker-compose riêng) + vá lỗ hổng đăng
nhập.

### Migration / database (MỚI — `database/`)

`database/migrations/001_init.sql` — 10 bảng, đầy đủ enum, index, đúng convention SQL thuần
của `webadmin/database` (không ORM):

- `properties` — cơ sở lưu trú, có `tenant_id` (multi-tenant: 1 tenant nhiều property).
- `property_users` — người dùng CẤP CƠ SỞ (lễ tân/quản lý/buồng phòng), **TÁCH BIỆT HOÀN
  TOÀN** với bảng `users` của `webadmin` (không dùng chung, không JOIN chéo được — đúng
  `ARCHITECTURE_OVERVIEW.md`). Vai trò: `OWNER`, `MANAGER`, `RECEPTIONIST`, `HOUSEKEEPING`.
- `room_types`, `rooms` (có cột `power_on boolean` — nối thẳng vào UI công tắc điện IoT đã
  có sẵn trong `RoomGrid.tsx`), `customers`, `bookings` (hợp đồng/đặt phòng), `invoices`
  (đóng vai trò payments/hoá đơn), `expenses`, `devices` (đăng ký thiết bị theo phòng, tối
  thiểu cho UI công tắc điện — mỗi phòng có 1 device `POWER_SWITCH` sau seed), `audit_log`
  (append-only).
- MỌI bảng nghiệp vụ có cả `tenant_id` VÀ `property_id` (RULES.md + SYSTEM_ARCHITECTURE.md
  mục 3 multi-tenant — đối chiếu đúng yêu cầu).
- `database/migrate.ts`/`seed.ts`/`package.json`/`Dockerfile` — copy nguyên convention từ
  `webadmin/database`, chỉ đổi tên bảng/seed data. Seed sinh 32 phòng theo ĐÚNG thuật toán
  `buildRooms()` trong `mock-data.ts` (cùng công thức modulo tầng/loại/khu/trạng thái) để
  dữ liệu thật gần giống bản mock cũ nhất có thể.

### API (MỚI — `apps/api/`, cổng 4100)

Cấu trúc y hệt `webadmin/apps/api` (routes/repositories/middleware/types/utils, `pg` thuần,
`zod` validate, `bcryptjs` hash mật khẩu, `jsonwebtoken` JWT 12h, `asyncHandler`,
`ApiError`/`errorHandler` dùng chung format lỗi).

- **Auth**: `POST /api/v1/auth/login` (email+password → JWT chứa `propertyId`/`tenantId`/
  `role`), `GET /api/v1/auth/me`. Middleware `requireAuth` (verify JWT) + `requireRole(...)`
  (RBAC theo 4 vai trò, đối chiếu `docs/PERMISSION_MATRIX.md` — có điều chỉnh tên vai trò,
  xem mục quyết định bên dưới). Mọi query business đều lọc theo `property_id` lấy từ JWT
  (không tin `property_id` gửi từ client).
- **Room Types**: `GET/POST/PATCH /api/v1/room-types`.
- **Rooms**: `GET/POST/PATCH /api/v1/rooms` + `PATCH /api/v1/rooms/:id/power` (bật/tắt điện
  — endpoint riêng, tách khỏi PATCH cấu hình phòng, để mọi vai trò cấp cơ sở kể cả buồng
  phòng/lễ tân đều bấm được công tắc, đúng RULES.md mục 10 "lệnh phải idempotent": set thẳng
  `power_on = true/false`, không phải toggle mù ở DB).
- **Customers**: `GET/POST/PATCH /api/v1/customers` (có `?search=`).
- **Bookings**: `GET/POST/PATCH/GET:id /api/v1/bookings` — JOIN sẵn customer/room/room_type
  để trả về đúng shape UI cần (`guest_name`, `room_number`, `room_type_name`), tự sinh mã
  `HD-2026NNN`.
- **Payments/Invoices**: `GET/POST/PATCH /api/v1/payments` (bảng `invoices`).
- **Expenses**: `GET/POST /api/v1/expenses`.
- **Devices**: `GET/POST /api/v1/devices` + `PATCH /api/v1/devices/:id/power`.
- **Dashboard**: `GET /api/v1/dashboard/summary` (KPI tổng hợp: tổng đặt phòng, công suất
  phòng, nhân sự hoạt động, tổng khách hàng, phân bổ loại phòng/trạng thái phòng/trạng thái
  đặt phòng, doanh thu đã thu hôm nay, tổng chi phí) + `GET /api/v1/dashboard/gantt` (dữ
  liệu đặt phòng theo phòng, JOIN room/room_type/customer, cho tab Lịch đặt phòng — **đã có
  endpoint nhưng CHƯA nối vào UI Gantt**, xem mục "Còn mock" bên dưới).
- Audit log ghi cho mọi hành động ghi (login, tạo/sửa phòng, bật/tắt điện, tạo/sửa hợp
  đồng, tạo khách hàng, tạo hoá đơn/chi phí/thiết bị).

### Frontend — nối API thật (`apps/web/`)

**MỚI**: `src/lib/api-client.ts` (fetch thuần gắn JWT từ `localStorage` key
`property_web_token` — đổi tên khác `webadmin` để 2 app không đụng token khi chạy song
song trên cùng trình duyệt), `src/lib/auth.tsx` (`AuthProvider`/`useAuth`, cùng pattern
`webadmin/apps/web/src/lib/auth.tsx`), `src/app/login/page.tsx` (trang đăng nhập MỚI —
xem mục quyết định), `src/components/auth/RequireAuth.tsx` (redirect `/login` nếu chưa có
JWT hợp lệ).

`src/app/layout.tsx` bọc toàn app bằng `AuthProvider`; `src/app/(pms)/layout.tsx` bọc thêm
`RequireAuth` — **toàn bộ 28 màn hình PMS giờ bắt buộc đăng nhập**, không còn "ai mở link
cũng vào thẳng được". `Sidebar.tsx`/`Topbar.tsx`/`UserProfileModal.tsx` đổi từ đọc
`currentUser` (mock tĩnh) sang đọc user thật từ `useAuth()`; `UserProfileModal` có thêm nút
"Đăng xuất" (không có trong bản gốc vì bản gốc không có đăng nhập).

**Màn hình đã nối API thật** (ưu tiên đúng theo yêu cầu — luồng lõi nhất):

- **Đăng nhập** (`/login`) — thật 100%, JWT lưu localStorage, `RequireAuth` chặn mọi route
  `(pms)` nếu chưa đăng nhập.
- **Dashboard** (`/dashboard`, tab "Tổng quan cơ sở") — 4 thẻ KPI đầu trang (tổng đặt phòng/
  công suất phòng/nhân sự hoạt động/tổng khách hàng) + 2 donut ("Biểu đồ sử dụng phòng",
  "Tổng quan lịch sử đặt") gọi `GET /api/v1/dashboard/summary`, tính trực tiếp từ dữ liệu
  rooms/bookings/customers/property_users thật. 3 khối còn lại của cột 1 (thu nhập/chi phí
  theo thời gian, lợi nhuận thuần) + "Gói được lựa chọn nhiều nhất" + cột 3 (hoạt động mới
  nhất, khách hàng mới) **CÒN MOCK** — chưa có bảng nguồn tương ứng trong migration MVP này
  (`revenue_daily`, activity log theo sự kiện... xem `docs/DATA_MODEL.md` mục Revenue &
  Reporting, để dành phase sau).
- **Rooms** (`/rooms`) — `GET /api/v1/rooms` thật, ánh xạ (map) sang đúng shape `RoomCard`
  cũ nên `RoomFilterPanels`/`RoomGrid`/3 modal (Nhận phòng nhanh/Quản lý lưu trú/Đã gửi dọn
  phòng) **giữ nguyên không sửa 1 dòng nào**. Công tắc điện gọi thật
  `PATCH /api/v1/rooms/:id/power` (optimistic update + rollback nếu lỗi).
- **Booking** (`/booking`) — `GET /api/v1/bookings` thật (map sang `BookingRow` cũ, bảng +
  modal Xem/Sửa/Mẫu hợp đồng giữ nguyên); `AddBookingModal` viết lại thành form thật (trước
  đây toàn bộ ô là placeholder tĩnh) — tạo khách hàng rồi tạo hợp đồng
  (`POST /api/v1/customers` → `POST /api/v1/bookings`), chỉ hiện phòng đang trống trong
  select.

**Còn mock (chưa nối API, KHÔNG lỗi build, hiển thị bình thường)**: Price, Payment,
Expenses, Night Audit, Marketing, Customers (trang danh sách khách hàng riêng — có API
`/api/v1/customers` rồi nhưng UI trang này chưa đổi sang gọi, chỉ `AddBookingModal` đang
dùng), Services, Utilities, Modules, toàn bộ 16 màn hình panel Cài đặt, và tab "Lịch đặt
phòng" (Gantt) trong Dashboard (endpoint `GET /api/v1/dashboard/gantt` đã có sẵn ở API
nhưng UI vẫn dùng `buildGanttGroups()` mock — việc tính lại `startCol`/`span` từ ngày
checkin/checkout thật theo đúng cột tuần đang xem là khối việc riêng, để dành phiên sau).

### Quyết định tự đưa ra (cần người dùng biết)

1. **Trang đăng nhập là thiết kế MỚI, không có trong bundle gốc** (bản gốc giả định đã đăng
   nhập sẵn) — dùng lại đúng token màu/logo "ANIO PMS" từ `Sidebar.tsx` để không lạc tông,
   nhưng bố cục card-trắng-giữa-màn-hình là tự thiết kế.
2. **Đổi tên vai trò cấp cơ sở**: yêu cầu nêu tối thiểu `OWNER, MANAGER, RECEPTIONIST,
   HOUSEKEEPING`, trong khi `docs/PERMISSION_MATRIX.md` dùng tên `OWNER, PROPERTY_MANAGER,
   FRONT_DESK, HOUSEKEEPING, MAINTENANCE` (5 vai trò, có `MAINTENANCE` riêng). Quyết định:
   theo đúng danh sách 4 vai trò yêu cầu tường minh (`MANAGER`/`RECEPTIONIST` thay vì
   `PROPERTY_MANAGER`/`FRONT_DESK`, bỏ `MAINTENANCE` riêng — gộp vào `HOUSEKEEPING` cho MVP
   này). Nếu cần khớp đúng permission matrix gốc, thêm migration `002_...sql` mở rộng enum
   sau.
3. **bcrypt + JWT**: dùng đúng `bcryptjs` + `jsonwebtoken` (không phải `bcrypt` native) —
   đồng nhất 100% với lựa chọn đã có ở `webadmin/apps/api`, tránh phải build lại native
   addon trong môi trường sandbox.
4. **`invoices` đóng vai trò "payments"**: yêu cầu gốc nói "payments/invoices" — gộp thành
   1 bảng `invoices` duy nhất (có `method`, `status`, `paid_at`) thay vì tách riêng
   `payments` + `invoices` 2 bảng, vì UI (`InvoiceRow`) chỉ cần 1 khái niệm hoá đơn.
5. **Rooms trạng thái 4 giá trị** (`OCCUPIED/VACANT/DIRTY/MAINTENANCE`) thay vì mô hình đầy
   đủ hơn ở `docs/DATA_MODEL.md` mục 3 (`VACANT_CLEAN → OCCUPIED → VACANT_DIRTY →
   CLEANING...`) — chọn khớp đúng `RoomStatusKey` đã có sẵn trong `mock-data.ts` để nối UI
   không phải viết lại `RoomGrid`/`RoomFilterPanels`. Mô hình đầy đủ để dành khi làm
   Housekeeping module riêng.
6. **`AddBookingModal` đơn giản hoá so với bản pixel-perfect ban đầu**: bỏ bước chọn riêng
   "Loại phòng" trước "Phòng" (bản gốc/pixel-perfect có 2 select), chỉ còn 1 select "Phòng"
   (chỉ hiện phòng `VACANT`) — vì tạo hợp đồng cần `room_id` cụ thể, chọn thẳng phòng đơn
   giản hơn mà vẫn đủ nghiệp vụ.
7. **Phòng "Đang ở" chưa có tên khách/giờ đã ở thật**: MVP API `GET /api/v1/rooms` chưa
   JOIN booking đang hiệu lực vào phòng (cần thêm logic "booking nào đang CHECKED_IN cho
   phòng này" — để dành phiên sau), nên `rooms/page.tsx` tạm gán nhãn chung "Khách đang lưu
   trú" / "—" cho các trường này thay vì để trống hẳn hoặc hiện "undefined".

## 2026-07-27 (phiên 2) — Implement toàn bộ 23 màn hình còn lại (nhóm main nav + panel Cài đặt)

### Đã xong thêm (pixel-perfect, đối chiếu trực tiếp với `Hotel PMS.dc.html`)

**Nhóm main nav (sidebar) — 7 màn hình:**

| Route | Tương ứng `is...` | Ghi chú |
|---|---|---|
| `/expenses` | `isExpenses` (dòng 1126-1234) | 2 tab con (Chi phí / Thu chi trong ngày), modal Thêm chi phí. Trạng thái phê duyệt sổ thu chi (Duyệt/Từ chối) giữ tại chỗ bằng `useState`, tương ứng `dailyStatuses` bản gốc. |
| `/night-audit` | `isNightAudit` (1235-1273) | 4 thẻ KPI đối soát + bảng hoá đơn (dùng chung `invoices` với `/payment`). Nút "Chạy kế toán đêm" giữ tĩnh đúng bản gốc (không có `onClick` trong bản gốc). |
| `/marketing` | `isMarketing` (1978) | Bảng chiến dịch + modal "Tạo chiến dịch mới" — modal này **có form thật** (bind state, `addCampaign` prepend vào bảng) đúng hành vi khác biệt của bản gốc so với các modal Thêm khác (đa số modal Thêm khác trong app là placeholder tĩnh). |
| `/customers` | `isCustomers` (2031) | Bảng khách hàng (bấm 1 dòng mở modal chi tiết) + đổi phân khúc (segment) tại chỗ qua dropdown trong modal, đồng bộ ngược lại bảng danh sách — đúng `customerSegmentOverrides` bản gốc. |
| `/services` | `isServices` (2111) | Bảng "Gói dịch vụ của cơ sở" (menu ⋯ Sửa/Xoá, modal Sửa dịch vụ có form thật) + bảng "Đối tác xung quanh" (modal Thêm đối tác — placeholder tĩnh đúng bản gốc). |
| `/utilities` | `isUtilities` (2246) | 2 thẻ liên kết Google Maps/Google Hotel, modal cấu hình riêng — modal Google Hotel có 2 công tắc thật (`hotelSyncAvail`/`hotelSyncPromo`). |
| `/modules` | `isModules` (2262) | Lưới 4 cột × 27 module, mỗi thẻ có công tắc bật/tắt thật đúng `advancedModules.toggle` bản gốc. |

**Nhóm panel Cài đặt — 16 màn hình:**

| Route | Tương ứng `is...` | Ghi chú |
|---|---|---|
| `/branches` | `isBranches` (1481) | Bảng cơ sở + menu ⋯ (Sửa → điều hướng `/basic`, Xóa) + modal Thêm cơ sở mới (tĩnh). |
| `/basic` | `isBasic` (1553, con info/owner/payment) | 3 tab con, toàn bộ trường placeholder tĩnh đúng bản gốc; có nút "←" quay về `/branches`. |
| `/amenities` | `isAmenities` (1610, con info/activities/services) | 3 tab con; copy **đầy đủ** danh sách tiện ích/hoạt động/dịch vụ gốc (7 nhóm tiện ích cơ bản + 46 hoạt động + ~188 dịch vụ, trộn bằng hàm `zip3` y hệt bản gốc để giữ đúng thứ tự 3 cột). |
| `/images` | `isImages` (1662) | Thư viện ảnh cơ sở + hình ảnh theo từng loại phòng (Single/Double), modal Thêm ảnh. |
| `/email` | `isEmail` (1692, con settings/content) | 2 tab con (Cài đặt email / Nội dung email). |
| `/security` | `isSecurity` (1733) | Chính sách bảo mật (công tắc bật/tắt — **đã bổ sung `onClick` thật**, bản gốc không có `onClick` trên các công tắc này) + nhật ký hoạt động tài khoản. |
| `/currency` | `isCurrency` (1757) | Bảng tiền tệ, đánh dấu "Mặc định". |
| `/tax` | `isTax` (1772) | Bảng thuế/phí + modal Thêm (tĩnh). |
| `/time` | `isTime` (1809) | Cấu hình giờ nhận/trả phòng, ngày lễ (nút "+" thêm dòng thật — đúng `addHolidayRow` bản gốc), thời gian tiện ích lưu trú ngắn hạn. Dùng chung `DatePickerModal` (component mới `components/ui/DatePickerModal.tsx`) cho mọi ô ngày — bấm 1 ngày bất kỳ đóng modal, đúng hành vi `closeDatePicker` gán cho mọi ô ngày ở bản gốc. |
| `/printer` | `isPrinter` (2333) | Cấu hình máy in mặc định + bảng mẫu in theo loại chứng từ (10 dòng mẫu). |
| `/channel` | `isChannel` (1274) | Lưới 3 cột thẻ kênh OTA (Booking/Agoda/Airbnb/Traveloka) với trạng thái kết nối. |
| `/sync` | `isSync` (1892) | Checkbox đồng bộ từng kênh OTA + modal Thêm kênh OTA + 3 công tắc **giữ tĩnh đúng bản gốc** (bản gốc hard-code `background:#284AB1`, không có `onClick`). |
| `/db` | `isDb` (1943) | Lưới thông tin sao lưu + 2 nút hành động tĩnh. |
| `/users` | `isUsers` (1289) | Bảng vai trò + modal Thêm/Sửa quyền (danh sách quyền checkbox tĩnh đúng bản gốc). |
| `/social` | `isSocial` (1958) | Bảng kênh MXH, mỗi dòng 2 công tắc — **đã bổ sung `onClick` thật** (bản gốc không có `onClick` trên các công tắc dòng này, chỉ đọc từ mock data tĩnh). |
| `/assets` | `isAssets` (1383) | Bảng tài sản theo phòng + modal Thêm tài sản mới (riêng ô "Thời gian khấu hao" có nút −/+ **đã bổ sung state thật** để nút không vô dụng, bản gốc chỉ có UI −/số/+ không có logic). |

Dữ liệu mẫu cho toàn bộ 23 màn hình trên: nối thêm vào `apps/web/src/lib/mock-data.ts` (không sửa dữ liệu cũ), lấy đúng giá trị mẫu trong bản gốc — bao gồm cả 2 danh sách rất dài (`activitiesList` ~46 mục, `amenityServicesList` ~188 mục) copy nguyên văn từ bản gốc.

Cập nhật `apps/web/src/lib/nav.ts`: toàn bộ `mainNav` và `settingsTree` giờ trỏ thẳng vào route thật thay vì `/stub/[key]`; `stubLabels` để rỗng (không còn key nào cần placeholder — giữ export rỗng để không phá route `/stub/[key]` nếu còn nơi tham chiếu).

Build: `npm install` + `npx tsc --noEmit` + `next build` (Next 16.2.12, Turbopack) chạy sạch — tổng cộng 31 route (8 cũ + 23 mới), không lỗi kiểu, không lỗi build. Test tại `/tmp/property-web-build`.

### Điểm mơ hồ/tự quyết định (bổ sung, nối thêm — không xoá các mục cũ)

5. **Công tắc (toggle) không có `onClick` trong bản gốc**: 2 nơi phát hiện — `securityItems` (trang Bảo vệ) và `socialLinks` (trang Mạng xã hội) đọc giá trị `on`/`autoOn` từ mock data nhưng bản gốc không gắn `onClick` cho các div công tắc đó (chỉ đọc tĩnh). Quyết định: bổ sung `onClick` thật (đổi state tại chỗ) để công tắc không "chết" trên UI thật — hợp lý hơn để tĩnh hoàn toàn vì đây rõ ràng là checkbox cấu hình, không phải hiển thị số liệu. Ngược lại, 3 công tắc ở trang Đồng bộ hoá (`isSync`) được giữ **tĩnh hoàn toàn** vì bản gốc hard-code luôn `background:#284AB1` (luôn bật) không đọc từ state nào cả — không có cơ sở dữ liệu để suy ra hành vi bật/tắt nên không tự thêm.
6. **Nút "+ Thêm" ở bảng "Gói dịch vụ của cơ sở" (trang Dịch vụ)**: bản gốc gán `openAddOwnService` cho nút này nhưng hàm đó lại mở `showAddPartner` (modal "Thêm đối tác mới") — rõ ràng là 1 lỗi/thiếu sót trong bản gốc (không có modal "Thêm dịch vụ" riêng). Quyết định: **không copy y nguyên hành vi gây nhầm lẫn đó** — để nút này chỉ đóng menu đang mở (không mở nhầm modal đối tác), không tự chế thêm 1 modal "Thêm dịch vụ" mới ngoài đặc tả.
7. **Ô "Thời gian khấu hao" (−/số/+) trong modal Thêm tài sản**: bản gốc chỉ có UI tĩnh (không có `onClick`) hiển thị số "12" cố định. Quyết định: bổ sung `useState` tối thiểu để 2 nút −/+ hoạt động thật (tăng/giảm số tháng), tương tự cách đã xử lý nút chèn tham số ở Mẫu hợp đồng (điểm 2 ở trên).
8. **`DatePickerModal` dùng chung cho mọi ô chọn ngày** (Ngày lễ Từ/Đến ngày, Ngày chốt số điện nước, Ngày cắt điện ở trang Thời gian): bản gốc cũng dùng chung 1 modal `showDatePicker` tĩnh (chỉ hiển thị tháng 7/2026 cố định, bấm ngày nào cũng đóng modal, không thật sự chọn ngày gán vào đúng ô nào) cho tất cả các ô — giữ nguyên hành vi đó (modal không phân biệt đang mở từ ô nào), không tự thêm logic gán giá trị ngày đã chọn vì bản gốc không có logic đó.

## 2026-07-27 (phiên 1) — Khởi tạo + implement 5 màn hình ưu tiên

### Đã xong (pixel-perfect, đối chiếu trực tiếp với `Hotel PMS.dc.html`)

Shared layout (áp dụng cho mọi route trong route group `(pms)`):
- Sidebar "ANIO PMS" thu gọn/mở rộng (208px ↔ 64px), 9 mục `navMain`, icon lấy đúng path SVG từ `const ICONS` trong bản gốc.
- Panel "Cài đặt" (264px, mở/đóng qua icon bánh răng) — cây điều hướng đầy đủ 5 nhóm theo `settingsTree`.
- Topbar 80px: ô tìm kiếm, chọn ngôn ngữ (tĩnh), menu cỡ chữ "Aa" (Nhỏ/Trung bình/Lớn — áp `zoom` lên vùng nội dung), icon thông báo (tĩnh), avatar mở modal "Thông tin người dùng".

Màn hình (route Next.js — khác bản gốc dùng SPA `state.tab`, ở đây dùng route App Router thật cho phù hợp với target codebase, xem README bundle "match visual output, đừng copy y nguyên cấu trúc nội bộ"):

| Route | Tương ứng `is...` trong bản gốc | Ghi chú |
|---|---|---|
| `/dashboard` | `isDashboard` > `isDashOverview` / `isDashCalendar` | Overview: 4 KPI + lưới 3 cột đầy đủ (thu nhập/chi phí, chi phí cố định/phát sinh, lợi nhuận thuần, biểu đồ sử dụng phòng, lịch sử đặt, gói phổ biến, hoạt động, khách hàng mới). Calendar: thanh công cụ, biểu đồ lượt đặt theo ngày, bảng Gantt theo loại phòng có nhóm gập/mở + **kéo-chọn (drag-select) ngày trống để mở modal Đặt phòng nhanh** — có implement tương tác thật, không chỉ tĩnh. |
| `/booking` | `isBooking` + `showAddBooking`/`showViewBooking`/`showEditBooking`/`showContractTemplate` | Bảng danh sách hợp đồng + 3 modal + editor Mẫu hợp đồng (panel tham số bấm chèn vào vị trí con trỏ bằng `contentEditable` + `execCommand('insertText')` — bản gốc để hàm `onInsert` rỗng, đây là phần bổ sung tối thiểu hợp lý để nút thực sự hoạt động, xem ghi chú trong `ContractTemplateModal.tsx`). |
| `/rooms` | `isRooms` + `showQuickCheckin`/`showStayManage`/`showHousekeepingSent` | 4 panel donut lọc nhanh (khu vực/tầng/trạng thái/loại phòng, bấm legend để lọc lưới bên dưới), 4 thẻ KPI, lưới 32 phòng mẫu (thuật toán sinh dữ liệu lấy đúng theo bản gốc), công tắc bật/tắt nguồn điện tại chỗ theo từng phòng. Bấm vào phòng: Đang ở → Quản lý lưu trú (điều khiển nguồn tự động, đổi phòng, tạm ứng, trả phòng 2 bước); Chờ dọn → thông báo đã gửi housekeeping; Trống sạch → Nhận phòng nhanh (Kiosk self check-in). |
| `/price` | `isPrice` + `showAddRoomType`/`showAddRoom` | Bảng "Danh sách loại phòng" + bảng "Danh sách phòng", mỗi dòng có menu ⋯ (Sửa/Xóa), 2 modal Thêm loại phòng / Thêm phòng (kèm khối gán Device IoT). |
| `/payment` | `isPayment` | Cấu hình kênh thanh toán (checkbox 11 kênh), 3 khối cổng thanh toán (VNPay/MoMo-ZaloPay/Stripe), hình thức thanh toán, bảng Hoá đơn hôm nay. |
| `/stub/[key]` | `isStub` | Trang giữ chỗ dùng chung cho mọi màn hình chưa implement — **đúng nguyên văn** câu chữ trong bản gốc: "Chức năng ... sẽ được thiết kế chi tiết ở đợt tiếp theo." |

Dữ liệu mẫu: toàn bộ nằm trong `apps/web/src/lib/mock-data.ts` (bookings, rooms, roomTypesFull, roomsFull, invoices, dashboard KPI/biểu đồ, gantt generator...) — lấy đúng giá trị mẫu trong bản gốc, không tự chế thêm.

Build: `npm install` + `npx tsc --noEmit` + `next build` (Next 16.2.12, Turbopack) chạy sạch, không lỗi kiểu, không lỗi build. Đã test tại `/tmp/property-web-build` (không copy `node_modules`/`.next` về mount `D:\hotel\OSS`).

### Chưa làm (tại thời điểm phiên 1) — ĐÃ HOÀN THÀNH TOÀN BỘ ở phiên 2 (2026-07-27)

> Toàn bộ danh sách bên dưới (7 màn hình main nav + 16 màn hình panel Cài đặt = 23 màn hình) đã được implement pixel-perfect ở phiên 2 — xem bảng chi tiết + route thật ở mục "2026-07-27 (phiên 2)" phía trên đầu file này. Giữ lại danh sách gốc dưới đây chỉ để tham chiếu lịch sử, không còn màn hình nào ở trạng thái "chưa làm" tính đến cuối phiên 2.

Nhóm main nav (sidebar) — đã xong:
- `isExpenses` (con: `isExpenseTabExpenses`, `isExpenseTabDaily`) — dòng 1126-1234. → `/expenses`
- `isNightAudit` — dòng 1235-1273. → `/night-audit`
- Marketing (`isMarketing`, dòng 1978) → `/marketing`, Customers (`isCustomers`, dòng 2031) → `/customers`, Services (`isServices`, dòng 2111) → `/services`, Utilities (`isUtilities`, dòng 2246) → `/utilities`, Modules (`isModules`, dòng 2262) → `/modules`.

Nhóm panel Cài đặt (settingsTree) — đã xong:
- `isBranches` (1481) → `/branches`, `isBasic` (1553, con info/owner/payment) → `/basic`, `isAmenities` (1610, con info/activities/services) → `/amenities`, `isImages` (1662) → `/images`, `isEmail` (1692, con settings/content) → `/email`, `isSecurity` (1733) → `/security`, `isCurrency` (1757) → `/currency`, `isTax` (1772) → `/tax`, `isTime` (1809) → `/time`, `isPrinter` (2333) → `/printer`.
- `isChannel` (1274) → `/channel`, `isSync` (1892) → `/sync`.
- `isDb` (1943) → `/db`, `isUsers` (1289) → `/users`.
- `isSocial` (1958) → `/social`, `isAssets` (1383) → `/assets`.

**Còn lại sau phiên 2**: không còn màn hình UI nào của `Hotel PMS.dc.html` ở trạng thái stub — toàn bộ `mainNav` + `settingsTree` đã trỏ route thật. Việc còn lại cho các phiên sau (ngoài phạm vi UI pixel-perfect): `apps/api` thật thay cho mock data, và các phần backend PMS Core/Channel Manager/AI Pricing/IoT/CRM theo `../docs/`.

Tất cả các mục trên hiện đang trỏ vào `/stub/[key]` (component `StubPage`, dùng `stubLabels` trong `src/lib/nav.ts` để hiển thị đúng tên tiếng Việt) — bấm vào không bị lỗi/link chết, chỉ hiển thị thông báo "sẽ được thiết kế ở đợt tiếp theo" đúng như hành vi gốc.

### Điểm mơ hồ / tự quyết định trong lúc đọc thiết kế (ghi lại để người dùng xác nhận nếu cần)

1. **Điều hướng SPA → route thật**: bản gốc chuyển màn hình bằng `setState({tab})` trong 1 trang duy nhất; ở đây dùng route Next.js App Router riêng cho từng màn hình (`/dashboard`, `/booking`...). Quyết định vì phù hợp hơn với target codebase (webadmin cũng dùng route thật, không phải SPA state) và README bundle cho phép "đừng copy y nguyên cấu trúc nội bộ prototype, miễn khớp visual output".
2. **Chèn tham số vào mẫu hợp đồng**: bản gốc để `onInsert: () => {}` (rỗng, chưa cài đặt thật). Đã bổ sung hành vi tối thiểu (`contentEditable` + `execCommand insertText`) để nút không vô dụng — có thể cần thay bằng editor rich-text thật (vd. TipTap) nếu triển khai production.
3. **Kéo-chọn (drag-select) trên Gantt**: đã implement đầy đủ theo đúng state machine gốc (`onMouseDown`/`onMouseEnter`/`onMouseUp`), nhưng dữ liệu booking hiển thị trên Gantt (vị trí/độ dài từng booking) là dữ liệu sinh ngẫu nhiên có seed cố định theo thuật toán gốc, **không đổi theo tuần đang xem** — đây là hành vi y hệt bản gốc (không phải lỗi của bản dịch), chỉ phần header ngày/cột đổi theo `weekOffset`.
4. **Chưa có `apps/api` riêng** cho property-web — toàn bộ dữ liệu là mock trong `lib/mock-data.ts`, theo đúng ưu tiên người dùng đưa ra ("ưu tiên UI đúng và chạy được hơn có backend đầy đủ"). Khi cần dữ liệu thật, thay các import từ `mock-data.ts` bằng gọi Admin API (`../docs/API_SPECIFICATION.md`).
