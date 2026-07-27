# Progress — webadmin (HQ Console, bản chạy được)

File này ghi tiến độ chi tiết của riêng `webadmin/` (mã nguồn chạy được). Tóm tắt tổng ba hệ thống nằm ở `../memory.md`; đặc tả nguồn nằm ở `../hq-console/docs/` + `../hq-console/PROGRESS.md`.

## 2026-07-27 — Bổ sung 3 phần còn thiếu: quản lý user/role UI, Release Console, Purchase Orders

Trước phiên này, `webadmin` đã chạy được Auth+RBAC + Partners/Suppliers/Customers 360/Hardware Assets/Commissions/Dashboard/Audit log (xem `README.md`). Phiên này bổ sung ĐẦY ĐỦ 3 phần được liệt kê là "chưa làm" trong `../memory.md` mục 4, **thêm vào code có sẵn, không sửa migration cũ, không đổi convention** (Express + `pg` thuần, không Prisma).

### 1. Quản lý user/role qua UI

- API mới `apps/api/src/routes/users.routes.ts` + `apps/api/src/repositories/users.repo.ts` (bổ sung `list/create/update/updatePasswordHash` vào repo đã có sẵn `findByEmail/findById`):
  - `GET /api/v1/users` — danh sách (không trả `password_hash`).
  - `POST /api/v1/users` — tạo user (email/họ tên/role/mật khẩu ban đầu ≥ 8 ký tự), 409 nếu email đã tồn tại.
  - `PATCH /api/v1/users/:id` — đổi role và/hoặc `status` (ACTIVE/DISABLED). Chặn tự khoá chính tài khoản đang đăng nhập (409).
  - `POST /api/v1/users/:id/reset-password` — sinh mật khẩu tạm ngẫu nhiên (6 byte hex), trả về **một lần duy nhất** trong response JSON (`temporary_password`), không lưu plaintext, không gửi email.
  - **RBAC**: toàn bộ router (kể cả GET) chỉ `SUPER_ADMIN` — khác các module khác (vốn mở GET cho mọi role đăng nhập) vì đây là dữ liệu nhạy cảm nhất, đúng `PERMISSION_MATRIX.md` ("Quản lý user/role HQ Console: ✓ SUPER_ADMIN only").
- Trang `apps/web/src/app/(dashboard)/users/page.tsx`: bảng danh sách + form thêm user + modal sửa role/khoá tài khoản (overlay `fixed inset-0`) + nút đặt lại mật khẩu (hiển thị mật khẩu tạm trong banner thông báo). Style bám theo `hardware-assets`/`suppliers` page có sẵn.
- Menu điều hướng: thêm mục "Người dùng & phân quyền" vào `apps/web/src/app/(dashboard)/layout.tsx`.
- **Quyết định tự đưa ra**: chưa có dịch vụ gửi email trong MVP này → mật khẩu tạm hiển thị trực tiếp cho SUPER_ADMIN thay vì gửi email, người dùng cần được báo qua kênh khác (điện thoại/chat nội bộ). Cần bổ sung dịch vụ email thật trước khi đưa vào production.

### 2. Release Console tổng hợp phiên bản app

- Migration mới `database/migrations/002_release_console.sql` (không sửa `001_init.sql`): enum `AppKey` (`KIOSK_APP`, `PROPERTY_WEB`, `PROPERTY_WINDOWS`, `OWNER_MOBILE`, `HOUSEKEEPING_MOBILE`, `SUPER_ADMIN_WEB`) và `ReleaseChannel` (`STABLE`, `BETA`); bảng `app_releases` (app_key, version, release_notes, channel, published_at, published_by → `users`, artifact_url, is_active). Có `UNIQUE INDEX ... WHERE is_active = true` trên `(app_key, channel)` — ràng buộc "chỉ 1 bản active mỗi (app, channel)" được enforce ở tầng DB, không chỉ ở code.
- API mới `apps/api/src/repositories/releases.repo.ts` + `apps/api/src/routes/releases.routes.ts`:
  - `GET /api/v1/releases` (lọc `appKey`/`channel`), `GET /api/v1/releases/:id` — mở cho mọi role đăng nhập (đúng convention GET của các module khác).
  - `POST /api/v1/releases` — "Phát hành phiên bản mới": tạo bản ghi, mặc định `isActive=true`, tự khử-active bản trước đó của cùng (app, channel) trong transaction.
  - `PATCH /api/v1/releases/:id` — dùng chung cho "rollback" (`isActive:true` — kích hoạt lại bản cũ, khử active bản hiện tại) và "gỡ khỏi active" (`isActive:false`).
  - **RBAC**: ghi (POST/PATCH) chỉ `RELEASE_MANAGER` + `SUPER_ADMIN`, đúng `PERMISSION_MATRIX.md` (Release Console: ✓ RELEASE_MANAGER, Xem: EXEC/OPS_SUPPORT).
- Trang `apps/web/src/app/(dashboard)/releases/page.tsx`: lọc theo ứng dụng, form "Phát hành phiên bản mới", bảng liệt kê kèm badge Đang phát hành/Không hoạt động, nút "Kích hoạt lại (rollback)" cho bản không active.
- **Giới hạn ghi rõ (MVP)**: đây CHỈ LÀ quản lý version tập trung để tra cứu, KHÔNG PHẢI deploy pipeline/cơ chế rollout thật — không tự gửi lệnh cập nhật xuống thiết bị/khách hàng, đúng ràng buộc trong `hq-console/docs/MODULE_APP_RELEASE_CONSOLE.md` mục 4 ("tránh 2 nơi cùng có quyền gửi lệnh update, tránh race với Update Campaign thật của Kiosk"). CI/CD, blue-green/canary (RULES.md mục 14) vẫn CHƯA làm ở bất kỳ đâu trong dự án.

### 3. Mua hàng / tồn kho chi tiết (`purchase_orders`)

- Migration mới `database/migrations/003_purchase_orders.sql`: enum `PurchaseOrderStatus` (`DRAFT`/`ORDERED`/`RECEIVED`/`CANCELLED`); bảng `purchase_orders` (supplier_id → `suppliers`, status, expected_at, created_by → `users`, notes) và `purchase_order_items` (product_name, `asset_type` dùng lại enum `HardwareAssetType` có sẵn từ 001, quantity, unit_price, received_quantity).
- API mới `apps/api/src/repositories/purchaseOrders.repo.ts` + `apps/api/src/routes/purchase-orders.routes.ts`:
  - `GET /api/v1/purchase-orders` (lọc status/supplierId), `GET /api/v1/purchase-orders/:id` (kèm `items`).
  - `POST /api/v1/purchase-orders` — tạo đơn (luôn bắt đầu ở `DRAFT`).
  - `POST /api/v1/purchase-orders/:id/items` / `DELETE .../:id/items/:itemId` — chỉ thêm/xoá dòng hàng khi đơn còn `DRAFT`.
  - `PATCH /api/v1/purchase-orders/:id/status` — đổi trạng thái, chỉ cho phép `DRAFT→ORDERED→RECEIVED` hoặc `→CANCELLED` (không cho lùi/nhảy cóc), validate transition trong transaction có `FOR UPDATE`.
  - **RBAC**: ghi (POST/PATCH/DELETE) chỉ `SUPPLY_CHAIN` + `SUPER_ADMIN`; GET mở cho mọi role đăng nhập — đúng `PERMISSION_MATRIX.md` ("Quản lý thiết bị/tồn kho: ✓ SUPPLY_CHAIN, Xem: EXEC/OPS_SUPPORT/ACCOUNTANT").
- Trang `apps/web/src/app/(dashboard)/purchase-orders/page.tsx` (danh sách + tạo đơn) và `.../purchase-orders/[id]/page.tsx` (chi tiết: thêm/xoá dòng hàng khi DRAFT, nút đổi trạng thái theo đúng bước tiếp theo hợp lệ).
- **Quyết định tự đưa ra (mức độ tự động sinh `hardware_assets` khi nhận hàng)**: theo `hq-console/docs/MODULE_HARDWARE_INVENTORY.md` mục 4.1, khi đơn chuyển `RECEIVED`, hệ thống tự sinh **đúng `quantity` bản ghi `hardware_assets`** cho MỖI dòng hàng CÓ gắn `asset_type` (số serial sinh tự động dạng `PO-<8 ký tự id đơn>-<8 ký tự id dòng>-<STT>`, đánh dấu là **placeholder** — nhân viên SUPPLY_CHAIN cập nhật lại serial thật qua `PATCH /api/v1/hardware-assets/:id` khi đối soát vật lý). Dòng hàng KHÔNG gắn `asset_type` (vd. vật tư tiêu hao, dây cáp) KHÔNG tự sinh tài sản — vì `hardware_assets` là "tài sản có serial theo dõi vòng đời/bảo hành", không phải mọi thứ mua vào công ty đều cần theo dõi ở mức đó. `supplier_id`/`purchase_cost`/`purchased_at` của asset mới lấy từ đơn mua hàng.
- Đã kiểm chứng bằng test riêng (xem mục Build bên dưới): PO 2 dòng hàng (1 dòng KIOSK × 3, 1 dòng cáp không gắn asset_type × 10) → chuyển `RECEIVED` → đúng 3 `hardware_assets` được tạo (không phải 13), dòng cáp không tạo gì.

## Build & kiểm tra

Thực hiện tại `/tmp` (copy `apps/api`, `apps/web`, `database` — không copy `node_modules`/`.next`/`dist`), source thật trong `D:\hotel\OSS\webadmin` không đổi ngoài code mới:

- `apps/api`: `npm install` + `npx tsc -p tsconfig.json --noEmit` → **sạch lỗi**. `npx tsc -p tsconfig.json` (build thật ra `dist/`) → **thành công**.
- `apps/web`: `npm install` + `npx tsc --noEmit` → **sạch lỗi** (sau khi sửa 1 lỗi nhỏ: import `useRouter` thừa không dùng ở trang chi tiết purchase-orders). `npx next build` → **thành công**, đủ 14 route tĩnh/động bao gồm `/users`, `/releases`, `/purchase-orders`, `/purchase-orders/[id]`.
- `database`: migration `001_init.sql` → `002_release_console.sql` → `003_purchase_orders.sql` chạy nối tiếp thành công trên PostgreSQL thật giả lập bằng `@electric-sql/pglite` (WASM Postgres). Đã viết kịch bản kiểm thử riêng (không lưu lại trong repo, chỉ chạy tại `/tmp`) xác nhận:
  1. `UNIQUE INDEX ... WHERE is_active = true` trên `app_releases(app_key, channel)` từ chối đúng khi cố insert bản active thứ 2 cho cùng app+channel; luồng publish đúng (khử active cũ trước) thì thành công.
  2. Luồng `purchase_orders`: tạo đơn DRAFT → thêm 2 dòng hàng (1 có `asset_type`, 1 không) → chuyển `RECEIVED` → đúng số lượng `hardware_assets` được tạo (chỉ từ dòng có `asset_type`), `purchase_order_items.received_quantity` cập nhật đúng.

## Chưa làm (còn lại theo `../memory.md` mục 4)

- Đồng bộ thật với Admin API của `smart-hotel-os`/`kiosk-management`.
- MFA/VPN cho production.
- CI/CD, blue-green/canary deployment thật (Release Console ở đây chỉ là MVP quản lý version, không thay thế).
- Dịch vụ gửi email thật cho tính năng đặt lại mật khẩu (hiện hiển thị mật khẩu tạm trực tiếp trong UI cho SUPER_ADMIN).
- `database/README.md` được nhắc tới trong `webadmin/README.md` ("Chi tiết bố cục SQL... xem `database/README.md`") nhưng file này chưa tồn tại — khoảng trống có từ trước phiên này, chưa xử lý (ngoài phạm vi 3 yêu cầu của phiên này).
