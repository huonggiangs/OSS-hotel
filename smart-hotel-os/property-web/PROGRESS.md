# Progress — property-web

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
