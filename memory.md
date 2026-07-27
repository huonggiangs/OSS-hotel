# Memory — Smart Hotel Group OSS Project

File này tồn tại để **phiên làm việc (Cowork session) sau có thể tiếp tục ngay** mà không phải đọc lại toàn bộ lịch sử chat. Luôn đọc file này đầu tiên khi bắt đầu một phiên mới trên dự án `D:\hotel\OSS`, và **cập nhật lại file này ở cuối mỗi phiên** (mục "Đã xong" / "Đang làm" / "Chưa làm" + ngày).

Cập nhật lần cuối: **2026-07-27**

## 1. Tổng quan dự án

Ba hệ thống độc lập (không dùng chung database, giao tiếp qua API — xem `ARCHITECTURE_OVERVIEW.md`):

| Repo | Vai trò | Trạng thái |
|---|---|---|
| `kiosk.md` (+ `kiosk-management/` tương lai) | Spec sản phẩm Kiosk Remote Management | Chỉ có spec gốc (không phải do phiên Cowork tạo), **chưa có code** |
| `smart-hotel-os/` | Spec sản phẩm PMS SaaS (PMS + Channel Manager + AI Pricing + IoT + CRM) | **Chỉ có tài liệu đầy đủ, chưa có code** |
| `hq-console/` | Spec HQ Console (quản trị nội bộ công ty) | **Chỉ có tài liệu đầy đủ** |
| `webadmin/` | Code chạy được của HQ Console (implementation của `hq-console/`) | **Có code MVP chạy được**, đã build/test thành công |

Quy tắc bắt buộc phải nhớ: `RULES.md` (kiến trúc phân tán, Cloud là nguồn sự thật) và `CLAUDE.md` (yêu cầu gốc PMS+Automation) ở thư mục gốc — mọi thiết kế mới phải đối chiếu hai file này.

## 2. Đã xong

### Tài liệu (docs-only)
- `smart-hotel-os/docs/*` — đầy đủ 14 file: PRD, kiến trúc, data model, API spec, module spec (PMS Core, PMS Windows Client, Channel Manager/Booking, AI Pricing, IoT Energy, CRM, Revenue Dashboard), UI sitemap, security threat model, permission matrix, acceptance criteria, roadmap.
- `hq-console/docs/*` — đầy đủ: PRD, kiến trúc, data model, permission matrix, module spec (Hardware Inventory, Partner/Supplier, Customer 360, Commission, App Release Console), Partner API Standards.
- `ARCHITECTURE_OVERVIEW.md` — sơ đồ tổng quan 3 hệ thống (mermaid).
- Mỗi repo con có `ASSUMPTIONS.md` / `DECISIONS.md` (ADR) / `PROGRESS.md` riêng — **đọc các file này để biết chi tiết kỹ thuật**, memory.md chỉ tóm tắt.

### Code chạy được — `webadmin/` (HQ Console MVP)
- **API**: Express + TypeScript + `pg` (node-postgres thuần, KHÔNG dùng Prisma — lý do: sandbox build chặn CDN tải engine Prisma, xem `hq-console/DECISIONS.md` ADR-006). Auth JWT + RBAC, module Partners/Suppliers/Customers(360)/Hardware Assets(+warranty)/Commissions(rules+records+duyệt/thanh toán)/Dashboard/Audit log.
- **Web**: Next.js 16.2.12 (đã bump từ 14.2.5 vì lỗi bảo mật) + Tailwind. Login + 7 trang quản trị.
- **Database**: SQL thuần trong `database/migrations/001_init.sql`, migration runner viết tay (`database/migrate.ts`), seed demo (`database/seed.ts`). Đã build & test: `tsc` sạch lỗi, `next build` thành công, migration chạy được trên Postgres thật (test bằng `@electric-sql/pglite`).
- `docker-compose.yml` — 4 service (postgres, migrate, api, web), chạy 1 lệnh `docker compose up --build`.
- **README.md đã sửa lại hướng dẫn chạy cho đúng Windows** (PowerShell dùng `;`/`Set-Location`, CMD dùng `cd /d`/`&`, không dùng `&&` trực tiếp) — vì người dùng báo lỗi `&&` không chạy được trên CMD/PowerShell của họ (2026-07-27).
- `RULES_COMPLIANCE.md` — đối chiếu từng mục `RULES.md` với thiết kế webadmin.

### Hạ tầng version control
- **Git repo cục bộ đã khởi tạo tại `D:\hotel\OSS`** (2026-07-27), branch `main`, có `.gitignore` (loại trừ node_modules/.next/dist/.env), đã có 1 commit ban đầu (107 file, "Initial commit"). **CHƯA kết nối remote GitHub** — bạn sẽ tự tạo repo + push, xem hướng dẫn ở mục 3.

### Skill tự động
- Đã tạo skill `smart-hotel-group-progress` (qua `save_skill`) — tự trigger khi có phiên làm việc chạm vào `D:\hotel\OSS`, đọc `memory.md` trước khi làm việc và nhắc cập nhật lại cuối phiên.

## 3. Đang làm / đang bị chặn (cần bạn cung cấp thêm thông tin)

1. **Tham khảo thiết kế PMS Windows từ Claude.ai Design** — bạn gửi 2 link `claude.ai/design/p/b57eb999-...` (file "Hotel PMS.dc.html" và "BA - Luong nghiep vu PMS.dc.html"). Đã thử fetch trực tiếp và qua Claude in Chrome (2026-07-27) — cả hai đều redirect về trang đăng nhập / extension báo chưa kết nối. Bạn đã chọn phương án "kết nối Claude in Chrome rồi thử lại" — **vẫn đang chờ bạn cài/đăng nhập extension** (link: https://chromewebstore.google.com/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn). Khi xong, nhắn để tôi thử lại `navigate` tới 2 link đó. Chưa có nội dung design nào được dùng để code PMS Windows — `apps/property-windows` chưa bắt đầu code.
2. **Backup GitHub** — bạn chọn "tự push từ máy mình". Git repo cục bộ đã có sẵn tại `D:\hotel\OSS` (branch `main`, 1 commit) — vì thư mục này mount thẳng vào máy thật của bạn, repo đó CŨNG đã tồn tại trên máy bạn, mở PowerShell/CMD tại `D:\hotel\OSS` là thấy ngay. **Việc còn lại là của bạn**: tạo repo trống trên GitHub rồi chạy (PowerShell):
   ```powershell
   Set-Location D:\hotel\OSS
   git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
   git push -u origin main
   ```
   (CMD: `cd /d D:\hotel\OSS` rồi hai lệnh git giữ nguyên). Lần đầu push GitHub sẽ hỏi đăng nhập/token — dùng Git Credential Manager (thường có sẵn nếu cài Git for Windows) hoặc Personal Access Token thay mật khẩu. Từ phiên sau, nếu `git remote -v` đã thấy `origin`, chỉ cần `git add -A; git commit -m "..."; git push` sau mỗi lần có thay đổi lớn.

## 4. Chưa làm (rõ ràng, chưa bắt đầu)

- Code thật cho `smart-hotel-os` (PMS Core, Channel Manager, AI Pricing, IoT, CRM) — mới chỉ có tài liệu.
- Code thật cho `kiosk-management` — mới chỉ có `kiosk.md` (spec gốc, không phải do Cowork tạo).
- `apps/property-windows` (PMS Windows Desktop App) — mới có tài liệu (`smart-hotel-os/docs/MODULE_PMS_WINDOWS_CLIENT.md`), **chưa có code**; đang chờ nội dung design ở mục 3.1 trước khi bắt đầu.
- Admin API thật phía `smart-hotel-os`/`kiosk-management` để `webadmin` đồng bộ (hiện `webadmin` chỉ có dữ liệu riêng, chưa gọi sang hai hệ thống kia).
- `webadmin`: quản lý user/role qua UI, Release Console tổng hợp, module mua hàng/tồn kho chi tiết (`purchase_orders`), MFA/VPN cho production.
- CI/CD, blue-green/canary deployment (RULES.md mục 14) — chưa làm cho bất kỳ repo nào.

## 5. Lưu ý kỹ thuật quan trọng cho phiên sau

- **Không dùng Prisma** cho `webadmin` — dùng `pg` + SQL viết tay. Nếu thêm bảng mới: thêm file `database/migrations/002_....sql`, không sửa `001_init.sql`.
- **Sandbox build có tường lửa allowlist** — chặn `binaries.prisma.sh` (403). `registry.npmjs.org` và `github.com` thì gọi được bình thường.
- **File trong `D:\hotel\OSS` mặc định không xoá/đổi tên được** qua công cụ — nếu cần xoá, gọi `allow_cowork_file_delete` xin phép trước (đã làm 1 lần trong phiên 2026-07-26, hiện đã bật cho cả thư mục OSS trong phiên đó — **có thể phiên mới sẽ bị khoá lại, cần gọi lại nếu gặp lỗi "Operation not permitted"**).
- Build/test code nặng (npm install nhiều gói) nên làm ở `/tmp` (sandbox, nhanh, xoá được tự do) rồi mới copy source (không copy `node_modules`) sang `D:\hotel\OSS\...` — mount OSS chậm hơn và có giới hạn xoá.
- Next.js đã bump lên `16.2.12` (từ `14.2.5`) vì lỗi bảo mật đã biết ở 14.2.5 — nếu nâng cấp thêm, nhớ chạy lại `npm audit`.
- Người dùng dùng Windows, **không phải** macOS/Linux — mọi hướng dẫn dòng lệnh trong README phải có bản PowerShell/CMD riêng, không giả định `bash`/`&&` hoạt động được.
