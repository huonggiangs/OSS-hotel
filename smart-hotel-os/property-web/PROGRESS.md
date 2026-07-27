# Progress — property-web

## 2026-07-27 — Khởi tạo + implement 5 màn hình ưu tiên

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

### Chưa làm — liệt kê rõ theo tên `is...` trong bản gốc (đợt sau làm tiếp, ưu tiên theo thứ tự người dùng đưa ra)

Nhóm main nav (sidebar):
- `isExpenses` (con: `isExpenseTabExpenses`, `isExpenseTabDaily`) — dòng 1126-1234.
- `isNightAudit` — dòng 1235-1273.
- Marketing (`isMarketing`, dòng 1978), Customers (`isCustomers`, dòng 2031), Services (`isServices`, dòng 2111), Utilities (`isUtilities`, dòng 2246), Modules (`isModules`, dòng 2262).

Nhóm panel Cài đặt (settingsTree):
- `isBranches` (1481), `isBasic` (1553, con info/owner/payment), `isAmenities` (1610, con info/activities/services), `isImages` (1662), `isEmail` (1692, con settings/content), `isSecurity` (1733), `isCurrency` (1757), `isTax` (1772), `isTime` (1809), `isPrinter` (2333).
- `isChannel` (1274), `isSync` (1892).
- `isDb` (1943), `isUsers` (1289).
- `isSocial` (1958), `isAssets` (1383).

Tất cả các mục trên hiện đang trỏ vào `/stub/[key]` (component `StubPage`, dùng `stubLabels` trong `src/lib/nav.ts` để hiển thị đúng tên tiếng Việt) — bấm vào không bị lỗi/link chết, chỉ hiển thị thông báo "sẽ được thiết kế ở đợt tiếp theo" đúng như hành vi gốc.

### Điểm mơ hồ / tự quyết định trong lúc đọc thiết kế (ghi lại để người dùng xác nhận nếu cần)

1. **Điều hướng SPA → route thật**: bản gốc chuyển màn hình bằng `setState({tab})` trong 1 trang duy nhất; ở đây dùng route Next.js App Router riêng cho từng màn hình (`/dashboard`, `/booking`...). Quyết định vì phù hợp hơn với target codebase (webadmin cũng dùng route thật, không phải SPA state) và README bundle cho phép "đừng copy y nguyên cấu trúc nội bộ prototype, miễn khớp visual output".
2. **Chèn tham số vào mẫu hợp đồng**: bản gốc để `onInsert: () => {}` (rỗng, chưa cài đặt thật). Đã bổ sung hành vi tối thiểu (`contentEditable` + `execCommand insertText`) để nút không vô dụng — có thể cần thay bằng editor rich-text thật (vd. TipTap) nếu triển khai production.
3. **Kéo-chọn (drag-select) trên Gantt**: đã implement đầy đủ theo đúng state machine gốc (`onMouseDown`/`onMouseEnter`/`onMouseUp`), nhưng dữ liệu booking hiển thị trên Gantt (vị trí/độ dài từng booking) là dữ liệu sinh ngẫu nhiên có seed cố định theo thuật toán gốc, **không đổi theo tuần đang xem** — đây là hành vi y hệt bản gốc (không phải lỗi của bản dịch), chỉ phần header ngày/cột đổi theo `weekOffset`.
4. **Chưa có `apps/api` riêng** cho property-web — toàn bộ dữ liệu là mock trong `lib/mock-data.ts`, theo đúng ưu tiên người dùng đưa ra ("ưu tiên UI đúng và chạy được hơn có backend đầy đủ"). Khi cần dữ liệu thật, thay các import từ `mock-data.ts` bằng gọi Admin API (`../docs/API_SPECIFICATION.md`).
