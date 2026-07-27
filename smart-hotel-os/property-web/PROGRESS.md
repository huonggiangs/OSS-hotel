# Progress — property-web

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
