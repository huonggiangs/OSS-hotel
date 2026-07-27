# Đối chiếu với RULES.md

`../RULES.md` là bộ nguyên tắc kiến trúc phân tán bắt buộc cho toàn dự án (viết cho hệ thống PMS + Kiosk có Edge/Local App). HQ Console (webadmin) là một hệ thống quản trị nội bộ, không có "Local App"/thiết bị edge riêng, nên một số mục áp dụng trực tiếp, một số áp dụng ở mức nguyên tắc thiết kế API mà webadmin phải tuân theo khi gọi sang hai sản phẩm kia. Đối chiếu từng mục:

| Mục RULES.md | Áp dụng cho webadmin như thế nào |
|---|---|
| 1. Dual-mode Edge/Cloud, một nguồn sự thật | Không áp dụng trực tiếp (webadmin không có edge mode) — nhưng webadmin **tôn trọng** nguyên tắc một nguồn sự thật: PostgreSQL riêng của webadmin chỉ là nguồn sự thật cho dữ liệu nó **sở hữu** (đối tác, nhà cung cấp, hoa hồng, tài sản phần cứng). Dữ liệu tenant/subscription của Smart Hotel OS hay device fleet của Kiosk KHÔNG được coi là nguồn sự thật ở đây — chỉ là bản cache đọc (`*_summary_cache`, xem `../hq-console/docs/SYSTEM_ARCHITECTURE.md` mục 1). |
| 2. Cloud là nguồn thẩm quyền cho booking/revenue/customer/pricing/inventory | webadmin không sở hữu các dữ liệu này — chúng thuộc Smart Hotel OS. webadmin chỉ đọc qua Admin API, không bao giờ ghi đè. |
| 3. Device không tự chọn server | Áp dụng cho Kiosk/Edge Node, không áp dụng trực tiếp cho webadmin (không có "device" trong hệ thống này ngoài trình duyệt của người dùng nội bộ). |
| 4. Failover Local↔Cloud | Không áp dụng — webadmin không có chế độ offline. Nếu Postgres down, API trả lỗi rõ ràng thay vì giả vờ hoạt động. |
| 5–6. Single writer, event-based sync, conflict resolution bởi Cloud | webadmin là **single writer** cho dữ liệu nó sở hữu (một Postgres, không có ghi đồng thời từ nhiều nguồn). Khi đồng bộ tenant/subscription từ Smart Hotel OS trong tương lai, webadmin đóng vai trò "Local" — chỉ đọc, mọi xung đột do hệ thống nguồn (Smart Hotel OS) quyết định, đúng nguyên tắc mục 6 "Local MUST NOT resolve conflicts independently". |
| 7. Configuration versioning | Áp dụng cho `commission_rules`: không sửa rule đang áp dụng cho kỳ đã tính, luôn tạo bản ghi mới (xem `apps/api/src/repositories/commissions.repo.ts`). |
| 8. Update safety (checksum, signature, health check, rollback) | Áp dụng cho Windows App/Kiosk update, không áp dụng cho webadmin (không phát hành update package tới thiết bị). |
| 9. Offline operation | Không áp dụng — webadmin luôn cần kết nối tới Postgres và (khi tích hợp thật) tới Admin API của hai sản phẩm kia. |
| 10. Command execution: unique ID, idempotent, acknowledged, timeout | Áp dụng tinh thần cho các thao tác nghiệp vụ có trạng thái (duyệt/thanh toán hoa hồng) — mỗi bản ghi có `id` riêng, thao tác `approve`/`mark-paid` idempotent theo trạng thái hiện tại (không duyệt lại bản ghi đã `PAID`). |
| 11. Security: authenticated, unique identity, no shared credentials, TLS | JWT bắt buộc cho mọi API (trừ `/health`, `/api/v1/auth/login`); mỗi user có tài khoản riêng (không có credential dùng chung); TLS là trách nhiệm của reverse proxy khi triển khai thật (ngoài phạm vi `docker-compose.yml` dev). |
| 12. Logging: mọi event/command/failure/sync | `audit_logs` ghi mọi thao tác tạo/sửa/duyệt (xem `apps/api/src/middleware/audit.ts`); lỗi hệ thống log ra console qua `errorHandler.ts` (production nên nối vào hệ thống log tập trung — chưa làm ở MVP). |
| 13. No breaking changes | API có version `/api/v1/...` từ đầu; đổi schema luôn thêm migration mới (`002_...sql`), không sửa migration cũ. |
| 14. Blue-green/canary/rollback-first | Chưa áp dụng ở MVP (chưa có pipeline CI/CD) — ghi nhận là việc cần làm trước khi vận hành production thật, xem `PROGRESS.md` gốc dự án. |
| 15. Acceptance: seamless failover, no duplicate/data loss, no downtime update, no conflict business error | Không áp dụng trực tiếp cho webadmin (không có thiết bị edge) — tiêu chí nghiệm thu tương ứng cho webadmin nằm ở `../hq-console/docs/PRODUCT_REQUIREMENTS.md` mục 8. |

## Kết luận

Các mục RULES.md viết cho kiến trúc **Edge/Cloud của PMS + Kiosk** (mục 1, 3, 4, 8, 9, 15) không áp dụng trực tiếp cho webadmin vì webadmin không quản lý thiết bị/edge node. Các mục về **bảo mật, logging, versioning, không phá vỡ tương thích** (2, 5, 6, 7, 10, 11, 12, 13) áp dụng đầy đủ và đã được mã hoá vào code như liệt kê ở trên. Khi webadmin tích hợp thật với Admin API của Smart Hotel OS/Kiosk (việc còn để mở, xem `README.md`), toàn bộ luồng đọc dữ liệu phải tuân theo đúng vai trò "Local/consumer không tự quyết định" như RULES.md mục 6 quy định.
