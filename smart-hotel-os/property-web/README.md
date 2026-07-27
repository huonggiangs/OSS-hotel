# property-web — PMS Property Web (PWEB)

Đây là bản triển khai thực tế (runnable) của ứng dụng **Property Web** dùng tại từng cơ sở
lưu trú, mô tả trong `../docs/MODULE_PMS_WINDOWS_CLIENT.md` và `../docs/UI_SITEMAP.md` (mục
"Property Web / PWEB" — web PMS chạy trên máy tính tại quầy lễ tân, cho phép điều khiển
thiết bị local qua Kiosk/IoT theo `../../RULES.md`). Không có gì ở `../docs/` bị chỉnh
sửa/di chuyển khi tạo thư mục này — `property-web/` là mã nguồn mới, độc lập, chỉ tham
chiếu tới tài liệu đặc tả đó (giống hệt cách `webadmin/` tách biệt với `hq-console/docs/`).

## Nguồn thiết kế

Giao diện được dựng **pixel-perfect** từ bundle thiết kế do người dùng xuất ra từ
Claude Design, đặt tại `../../hotel-pms-software-design-phase-1/project/Hotel PMS.dc.html`
(kèm `BA - Luong nghiep vu PMS.dc.html` mô tả nghiệp vụ). File `.dc.html` là định dạng
"declarative component" nội bộ của công cụ thiết kế (HTML + `{{ binding }}` + `sc-if`/`sc-for`
+ 1 class JS `Component extends DCLogic` chứa toàn bộ state/mock data) — **không chạy được
trực tiếp**, chỉ dùng để đọc và dịch sang React/Tailwind. Toàn bộ màu sắc/khoảng cách/chữ
lấy đúng theo giá trị hex/px trong file gốc đó, không tự sáng tạo thêm.

## Quan hệ với các thư mục khác trong dự án

| Thư mục | Vai trò |
|---|---|
| `../docs/` | Đặc tả PMS SaaS đầy đủ (PRD, kiến trúc, data model, API spec, module spec) — đọc trước khi sửa code ở đây |
| `../../hotel-pms-software-design-phase-1/` | Bundle thiết kế nguồn (UI tham chiếu) — không sửa các file `.dc.html` trong đó |
| `../../webadmin/` | HQ Console — hệ thống tách biệt, không chung DB |
| `../../RULES.md` | Nguyên tắc kiến trúc phân tán bắt buộc (Cloud là nguồn sự thật, Local/Edge chỉ là executor+cache, idempotent commands...) |

## Trạng thái hiện tại

Ở đợt này **chỉ có phần giao diện (Next.js + dữ liệu mock)**, chưa có API/DB riêng — ưu
tiên đúng theo yêu cầu "UI đúng và chạy được hơn là có backend đầy đủ". Toàn bộ dữ liệu
mẫu (tên khách, số phòng, doanh thu...) nằm gọn trong `apps/web/src/lib/mock-data.ts`, để
sau này thay bằng gọi Admin API thật (`../docs/API_SPECIFICATION.md`) chỉ cần sửa 1 chỗ.

Đã implement pixel-perfect: **Tổng quan (Dashboard)**, **Đặt phòng / Hợp đồng (Booking)**,
**Trạng thái phòng (Rooms)**, **Phòng và giá (Price)**, **Thanh toán (Payment)**. Các màn
hình còn lại trong sidebar/panel Cài đặt hiện dẫn tới trang giữ chỗ (`/stub/[key]`) — đúng
tinh thần khối `isStub` có sẵn trong bản thiết kế gốc ("sẽ được thiết kế chi tiết ở đợt tiếp
theo"), không phải làm giả thêm. Xem chi tiết danh sách đã làm/chưa làm ở `PROGRESS.md`
(thư mục này) và `../../memory.md` (mục 3/4).

## Công nghệ

Next.js 16 (App Router) + TypeScript + Tailwind CSS — đúng convention của `webadmin/apps/web`.
Chưa có `apps/api` riêng (để dành khi cần dữ liệu thật thay cho mock); nếu thêm sau, sẽ theo
đúng convention Express + TypeScript + `pg` (raw SQL, KHÔNG dùng Prisma — lý do kỹ thuật xem
`../../hq-console/DECISIONS.md` ADR-006).

## Chạy thử (Windows)

Yêu cầu: Node.js 20+ (khuyến nghị dùng đúng bản Node đã build/test, xem `package.json`).

**PowerShell**:

```powershell
Set-Location D:\hotel\OSS\smart-hotel-os\property-web\apps\web
npm install
npm run dev
```

**CMD (Command Prompt)**:

```bat
cd /d D:\hotel\OSS\smart-hotel-os\property-web\apps\web
npm install
npm run dev
```

Mặc định chạy ở cổng 3100 (`http://localhost:3100`) để không đụng cổng 3000 mà `webadmin`
đang dùng — có thể chạy song song cả hai. Truy cập `/` sẽ tự chuyển tới `/dashboard`.

Build production:

```powershell
npm run build
npm run start
```

Kiểm tra kiểu dữ liệu (không phát sinh file):

```powershell
npm run typecheck
```

## Cấu trúc thư mục

```text
property-web/
├── apps/
│   └── web/                 # Next.js (App Router) + Tailwind
│       └── src/
│           ├── app/
│           │   ├── (pms)/   # Layout dùng chung (Sidebar + Topbar + panel Cài đặt)
│           │   │   ├── dashboard/  # Tổng quan cơ sở + Lịch đặt phòng (Gantt)
│           │   │   ├── booking/    # Đặt phòng / Hợp đồng
│           │   │   ├── rooms/      # Trạng thái phòng
│           │   │   ├── price/      # Phòng và giá
│           │   │   ├── payment/    # Thanh toán
│           │   │   └── stub/[key]/ # Trang giữ chỗ cho các màn hình chưa làm
│           │   └── layout.tsx, page.tsx, globals.css
│           ├── components/  # layout/, dashboard/, booking/, rooms/, price/, ui/, icons.tsx
│           └── lib/         # mock-data.ts, nav.ts
├── .gitignore
└── README.md                 # file này
```

Chi tiết tiến độ (đã làm / đang làm / chưa làm theo từng màn hình `is...`): xem
`PROGRESS.md` trong thư mục này.
