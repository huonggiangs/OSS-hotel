# Decisions (ADR) — HQ Console

## ADR-001 — HQ Console là aggregator, không phải nguồn sự thật
**Ngày**: 2026-07-26
**Quyết định**: HQ Console không lưu bản sao đầy đủ dữ liệu nghiệp vụ của Kiosk/Smart Hotel OS, chỉ tổng hợp qua Admin API + webhook, có `last_synced_at` rõ ràng.
**Lý do**: Tránh hai nguồn sự thật (dual source of truth) gây sai lệch dữ liệu khách hàng/tài chính; giữ đúng ranh giới đã thống nhất ở `../ARCHITECTURE_OVERVIEW.md`.

## ADR-002 — Không thao tác cập nhật/rollback thiết bị trực tiếp từ HQ Console
**Ngày**: 2026-07-26
**Quyết định**: Release Console (`MODULE_APP_RELEASE_CONSOLE.md`) chỉ hiển thị tổng hợp và điều hướng (deep link), không tự gửi lệnh cập nhật.
**Lý do**: Tránh race condition với Update Campaign của từng sản phẩm (rủi ro hai hệ thống cùng gửi lệnh cập nhật trùng — vi phạm nguyên tắc "không thực hiện command trùng" ở `kiosk.md` mục 21.9).

## ADR-003 — Schema database riêng, không chia sẻ với hai sản phẩm
**Ngày**: 2026-07-26
**Quyết định**: `hq_console` là schema/database riêng biệt hoàn toàn.
**Lý do**: Đồng nhất nguyên tắc "không dùng chung database" đã áp dụng xuyên suốt cả ba hệ thống.

## ADR-004 — Truy cập nội bộ, không public
**Ngày**: 2026-07-26
**Quyết định**: HQ Console chỉ truy cập qua VPN/IP whitelist nội bộ, MFA bắt buộc toàn bộ tài khoản.
**Lý do**: Đây là hệ thống nắm dữ liệu tài chính/hợp đồng/khách hàng tổng hợp nhạy cảm nhất trong ba hệ thống.

**Cập nhật 2026-07-26 (MVP `webadmin/`)**: MFA và VPN/IP whitelist CHƯA triển khai ở bản chạy được đầu tiên (chỉ có JWT + RBAC) — đây là việc bắt buộc phải làm trước khi đưa ra môi trường production thật, ghi nhận trong `../webadmin/README.md` và `PROGRESS.md`.

## ADR-005 — Code thật nằm ở `../webadmin/`, không ở trong `hq-console/`
**Ngày**: 2026-07-26
**Quyết định**: Toàn bộ code, SQL, Dockerfile của HQ Console được đặt trong một thư mục riêng `webadmin/` ngang cấp `hq-console/`, thay vì trộn vào `hq-console/` (vốn chỉ chứa đặc tả) hoặc rải rác nhiều nơi.
**Lý do**: Theo yêu cầu người dùng — tách biệt rõ "tài liệu đặc tả" và "code chạy được" để tránh xung đột, và để nếu sau này có thêm client khác (vd. mobile cho HQ Console) vẫn theo đúng mô hình `apps/<tên-app>` đã thống nhất ở `docs/SYSTEM_ARCHITECTURE.md` mục 6.
**Hệ quả**: `hq-console/docs/` là nguồn sự thật cho YÊU CẦU; `webadmin/` là nguồn sự thật cho CODE. Khi có mâu thuẫn giữa hai nơi, ưu tiên cập nhật lại `hq-console/docs/` rồi mới sửa code, không để code trôi khỏi đặc tả mà không ghi lại.

## ADR-006 — Đổi từ Prisma (NestJS + Prisma theo đề xuất ban đầu) sang Express + node-postgres (`pg`) thuần
**Ngày**: 2026-07-26
**Quyết định**: `apps/api` dùng Express + TypeScript + `pg`, SQL viết tay trong `database/migrations/*.sql`, không dùng Prisma hay ORM code-gen nào khác. Đây là thay đổi so với đề xuất ban đầu ở `docs/SYSTEM_ARCHITECTURE.md` mục 5 (NestJS) và bản nháp đầu tiên (đã thử Prisma).
**Lý do**: Trong lúc build, môi trường không tải được engine binary của Prisma (bị chặn ở CDN `binaries.prisma.sh`), nên không thể tự kiểm chứng `prisma generate`/`migrate` hoạt động. Chuyển sang `pg` thuần (driver JS/TS, không cần binary native) giải quyết được việc kiểm chứng, đồng thời khớp tinh thần "SQL bố cục rõ ràng, dễ mở rộng" mà người dùng yêu cầu rõ hơn Prisma (schema là SQL thật, không phải DSL sinh mã).
**Đã kiểm chứng**: TypeScript của `apps/api` và `database/` compile sạch (`tsc --noEmit`), `apps/api` build thành công (`npm run build`), migration `001_init.sql` chạy thành công trên một PostgreSQL thật (dùng `@electric-sql/pglite` — WASM Postgres — để test vì sandbox build không có PostgreSQL server sẵn), `apps/web` (Next.js) build production thành công cho cả 9 trang.
**Hệ quả**: Nếu sau này cần NestJS (vd. để chuẩn hoá với `kiosk-management`/`smart-hotel-os` cũng dùng NestJS), đây là việc refactor có chủ đích, không phải mặc định — cần ADR mới.
