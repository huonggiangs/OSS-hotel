# GO-LIVE READINESS — SMART HOTEL OS

Ngày rà soát: 08/09/2026; cập nhật triển khai: 09/09/2026
Nguồn: mã nguồn hiện tại, `docs/`, các file `PROGRESS.md`, kết quả typecheck và kiểm tra runtime đã lưu.  
Nguyên tắc: chỉ tính **Đã sẵn sàng Go-live** khi có code, tài liệu và bằng chứng kiểm thử phù hợp; phần mềm đã viết nhưng thiếu thiết bị, credential hoặc KPI thật được xếp **READY_FOR_PILOT**.

## 1. Kết luận điều hành

Hệ thống đã có nền PMS/HQ/Edge/IoT và nhiều luồng phần mềm chạy được, nhưng **chưa đủ bằng chứng để phát hành toàn bộ sản phẩm như một hệ thống thương mại hoàn chỉnh**. Sáu feature độc lập đã đủ bằng chứng phần mềm để Go-live trong phạm vi nội bộ/LAN. Mười feature cần pilot, credential hoặc kiểm thử tích hợp. Hai feature AI vẫn Backlog; Camera AI vẫn Out of scope.

Không dùng nhãn Go-live của một feature phần mềm để suy ra rằng thiết bị vật lý, public Internet, SLA, ROI hoặc tải lớn đã được nghiệm thu.

### Cập nhật triển khai dùng chung ngày 09/09/2026

- Đã tạo backup đầy đủ trước migration tại `backups/oss_20260909_100721_before-go-live-progress-migration`.
- Đã rebuild HQ, PMS, Services và Edge; các giao diện `3000/3100/4200` và API `4000/4100-4104/4200` đều trả HTTP thành công.
- Migration `006_go_live_progress.sql` đã được áp dụng vào PostgreSQL dùng chung lúc `2026-09-09 03:09:15 UTC`; bảng tiến độ có 8 bản ghi sau kiểm thử API thực tế.
- Watcher tự cập nhật đã được kiểm thử bằng một thay đổi thời gian tệp không đổi nội dung: watcher nhận sự kiện, typecheck đạt, rebuild đúng commit `ed3670f` và healthcheck thành công.
- Edge heartbeat còn mới, Cloud reachable và outbox bằng 0. Đây là bằng chứng kết nối phần mềm, chưa phải ACK thiết bị vật lý.
- Đối soát thiết bị: HQ `2/2` tài sản có `asset_code` nhưng `0` online; PMS `33` thiết bị nhưng chỉ `1` có `asset_code` và `1` có `iot_device_id`; IoT Service `3` thiết bị, `1` có `asset_code`, `0` online. Vì vậy nghiệm thu relay/công tơ/khóa thật vẫn **Đang làm**.
- Kiểm tra ngay trên máy chủ đạt `http://192.168.1.99:3000`, `:3100`, `:4200`. Windows Firewall chưa thể cấu hình trong phiên không có quyền Administrator; cần chạy `ops/scripts/Enable-OssLanAccess.ps1` bằng PowerShell Administrator trước khi nghiệm thu từ máy khác.

## 2. Thống kê tổng hợp

### 2.1 Theo Feature Catalog

| Nhóm | Số lượng | Tỷ lệ trên 18 feature trong phạm vi |
|---|---:|---:|
| Go-live | 6 | 33% |
| READY_FOR_PILOT / thiếu bằng chứng | 10 | 56% |
| Backlog | 2 | 11% |
| Out of scope | 1 | Không tính mẫu số |

### 2.2 Theo Need refs

Tỷ lệ dưới đây là tỷ lệ **strict Go-live** trên các F# tham chiếu Need tương ứng; một feature có thể thuộc nhiều Need.

| Need | Go-live / trong phạm vi | Hoàn thành | Nhận định |
|---|---:|---:|---|
| N1 — tăng lợi nhuận | 3/9 | 33% | Dịch vụ, đặt phòng và hoa hồng có nền; OTA thật, pricing end-to-end và lợi nhuận hợp nhất còn thiếu. |
| N2 — giảm chi phí | 2/6 | 33% | Danh mục tài sản/tiện ích đã có; meter, ACK thật và baseline chưa nghiệm thu. |
| N3 — giảm phụ thuộc nhân sự | 4/9 | 44% | Luồng vận hành chính đã có; offline conflict, thẻ/khóa và CRM tự động còn thiếu. |
| N4 — quản lý từ xa | 4/14 | 29% | HQ và các màn hình quản trị có nền; MFA/VPN/HA, notification và SLA thật còn thiếu. |
| N5 — giảm rủi ro | 3/9 | 33% | RBAC/audit có một phần; pentest, restore drill và nghiệm thu thiết bị chưa hoàn tất. |

### 2.3 Theo module và Acceptance Criteria

| Phạm vi | Đã xong | Đang làm / thiếu bằng chứng | Còn thiếu | Strict complete |
|---|---:|---:|---:|---:|
| 7 module đặc tả | 0 | 6 | 1 | 0% |
| 20 Acceptance Criteria | 9 | 7 | 4 | 45% |

Sáu module sẵn sàng kiểm thử gồm PMS Core, Channel/Direct Booking, AI Pricing rule-based, IoT Energy, CRM và Revenue Dashboard. `property-windows` còn thiếu bản client/đóng gói, kiểm thử offline, máy in và auto-update thực tế.

### 2.4 Đối chiếu 20 Acceptance Criteria

| # | Trạng thái | Bằng chứng / khoảng trống |
|---:|---|---|
| 1 | Đã xong | HQ onboarding tạo customer/property/OWNER, có trạng thái và idempotency. |
| 2 | Đã xong | PMS API/UI tạo loại phòng và phòng; migration/CRUD đã test. |
| 3 | Đã xong | Front Desk tạo booking qua PMS. |
| 4 | Đã xong | Walk-in/nhận phòng nhanh đã có luồng DB. |
| 5 | Đã xong | Check-in chuyển phòng sang OCCUPIED trong transaction. |
| 6 | Đang làm | Hàng đợi/ACK có code; thiếu thiết bị IoT thật. |
| 7 | Đã xong | Check-out và dịch vụ/phụ phí có luồng tính tiền. |
| 8 | Đang làm | VACANT_DIRTY có; tắt điện thật còn phụ thuộc ACK/driver. |
| 9 | Đang làm | Trạng thái dọn phòng có; thiếu Housekeeping Mobile App/realtime test độc lập. |
| 10 | Đang làm | Dashboard có doanh thu/occupancy; ADR/RevPAR và đối soát nguồn cần test đầy đủ. |
| 11 | Còn thiếu | Owner Mobile App mục tiêu chưa có bản nghiệm thu. |
| 12 | Đã xong | Channel Manager mock adapter đã test đồng bộ inventory/rate. |
| 13 | Đã xong | Test đồng thời mock OTA đã từ chối booking thứ hai, không overbook. |
| 14 | Đang làm | Direct/public booking và SePay có phần riêng; thiếu một test sandbox xuyên luồng hoàn chỉnh. |
| 15 | Đang làm | Rule pricing có test; bước apply → PMS → OTA/rollback chưa hoàn chỉnh. |
| 16 | Còn thiếu | CRM provider/trigger checkout tự động thật chưa có. |
| 17 | Đang làm | Edge offline chạy được nhưng còn khoảng trống map booking local ↔ cloud. |
| 18 | Còn thiếu | Chưa có bằng chứng audit đầy đủ cho toàn bộ 17 bước trong một run. |
| 19 | Đã xong | Backend RBAC đã test các vai trò cấp cơ sở. |
| 20 | Còn thiếu | API client scope/OAuth2 chưa được kiểm thử; một số luồng còn shared key. |

### 2.5 Đối chiếu từng module

| Module | Trạng thái | Bằng chứng / khoảng trống chính |
|---|---|---|
| PMS Core | READY_FOR_PILOT | API/UI/DB đã chạy; còn group/housekeeping/offline/audit acceptance xuyên luồng. |
| Channel Manager & Direct Booking | READY_FOR_PILOT | Mock OTA chống overbooking đã test; credential OTA và payment sandbox end-to-end còn thiếu. |
| AI Pricing Phase 1 | READY_FOR_PILOT | Rule engine có assertion; apply/override → PMS → OTA chưa hoàn chỉnh. |
| IoT Energy | READY_FOR_PILOT | Command/ACK/timeout có code; MQTT/driver/relay/meter thật chưa nghiệm thu. |
| CRM & Marketing | READY_FOR_PILOT | Segment/opt-out/frequency cap có test; provider và trigger thật chưa có. |
| Revenue Dashboard | READY_FOR_PILOT | KPI cơ bản có dữ liệu; ADR/RevPAR/CVG và nguồn kế toán cần đối soát. |
| PMS Windows Client | Còn thiếu | Chưa có bằng chứng đóng gói, offline outbox, driver in và cập nhật ký số. |

## 3. Phân loại chi tiết

### 3.1 Đã xong / sẵn sàng Go-live trong phạm vi phần mềm

| Feature | Bằng chứng chính | Giới hạn phạm vi |
|---|---|---|
| F-HQ-ASSET-001 | HQ asset registry, CRUD/lifecycle, asset_code, cảnh báo và kiểm thử runtime ghi trong `webadmin/PROGRESS.md` | Không đồng nghĩa thiết bị thật đã online. |
| F-COMMISSION-001 | API/UI tạo, sửa, xóa trước duyệt, xem chi tiết, duyệt và thanh toán | Cần đối soát tài chính vận hành định kỳ. |
| F-MODULE-FLOW-001 | PMS `/modules`, cấu hình DB và bước tiếp theo | Module bên ngoài vẫn có điều kiện riêng. |
| F-UTILITY-FLOW-001 | PMS `/utilities`, cấu hình và hành động | Tích hợp đối tác thực phụ thuộc credential. |
| F-SERVICE-FLOW-001 | PMS `/services`, CRUD và ghi nhận vào phòng/hóa đơn | Cần regression với dữ liệu production-like. |
| F-BOOKING-ARRIVAL-001 | Xác nhận đến/no-show, chính sách cọc, QR HID và OTA reconciliation nhập tay | Hoàn tiền/cổng thanh toán thật là tích hợp riêng. |

Hạ tầng theo dõi Go-live của phiên này đã có migration, API, webhook, HTML generator, metrics và CI workflow; đây là công cụ release, không tự nâng trạng thái các feature khác.

### 3.2 Đang làm / READY_FOR_PILOT / thiếu bằng chứng

| Feature/module | Còn thiếu để Go-live | Phụ thuộc |
|---|---|---|
| F-PMS-OPS-001 | Chạy đủ 20 acceptance; kiểm tra group booking, housekeeping và audit xuyên luồng | Dữ liệu staging và test suite |
| F-PRICE-001 | Apply/rollback end-to-end, đồng bộ OTA, báo cáo ADR/RevPAR trước-sau | OTA sandbox/credential |
| F-IOT-CTRL-001 | Relay, meter, khóa/thẻ và Edge thật; ≥95% ACK/30 ngày; không sai phòng | Thiết bị/driver tại cơ sở |
| F-REMOTE-001 | VPN/TLS/MFA, notification, HA và kiểm tra từ mạng ngoài | Hạ tầng production |
| F-MAINT-001 | Ticket tự sinh từ thiết bị, assignee/escalation, MTTR/SLA | Telemetry thật/đối tác |
| F-HQ-ONBOARD-001 | SMTP thật, bàn giao credential và xác nhận nhận email | SMTP/domain |
| F-CRM-CARE-001 | Provider Zalo/Facebook/Email, opt-in, webhook và trigger tự động | Tài khoản doanh nghiệp |
| F-OTA-RECON-001 | Adapter/API OTA và đối soát tự động | Hợp đồng/credential OTA |
| F-VALUE-001 | Sửa công thức lợi nhuận hợp nhất; meter thật; baseline/before-after | Kế toán + meter 30 ngày |
| F-ALERT-001 | Assignee/escalation, đa kênh, SLA breach và kiểm thử cảnh báo thật | Notification + telemetry |
| Offline-first | Ánh xạ booking local/cloud, conflict test và auth máy-tới-máy | Edge staging |
| Multi-tenant | Test cô lập tenant ở API/DB và kiểm tra truy cập chéo | Security test suite |

### 3.3 Còn thiếu / Backlog / chưa làm

- F-AI-REV-001: trợ lý lợi nhuận/RAG có nguồn.
- F-AI-ENERGY-001: phát hiện bất thường sau khi có 30–90 ngày dữ liệu meter sạch.
- Owner Mobile và Housekeeping Mobile độc lập như sitemap mục tiêu.
- Property Windows đóng gói, in driver, offline outbox và cập nhật có chữ ký.
- OAuth2/mTLS cho service-to-service và từng Edge/device; hiện còn shared key ở một số luồng.
- CI/CD production blue-green/canary, Kubernetes/cell architecture và load test quy mô mục tiêu.
- Pentest độc lập, MFA quản trị/chủ, secret manager, WAF/rate limit phân tán và rà soát pháp lý dữ liệu cá nhân.
- Camera AI giữ nguyên Out of scope.

## 4. Gap analysis và rủi ro

| Gap | Rủi ro | Mức | Điều kiện đóng |
|---|---|---|---|
| Trạng thái catalog trước đây được nâng đồng loạt | Hiểu nhầm tài liệu là bằng chứng production | P0 | Catalog được phân loại lại; mỗi Go-live có test/evidence. |
| Thiết bị thật chưa nghiệm thu | Tắt/bật sai, ACK giả, lệnh cũ chạy lại | P0 | Hoàn thành `REAL_HARDWARE_ACCEPTANCE.md`, ký biên bản. |
| Shared internal key / thiếu device identity | Chiếm quyền service/IoT | P0 | OAuth2/mTLS, key riêng từng Edge, rotation và revoke. |
| OTA/payment/CRM thiếu credential | Luồng chỉ mô phỏng hoặc nhập tay | P0 | Sandbox + credential thật + webhook ký số + đối soát. |
| Edge còn lỗi mapping local/cloud | Mất đồng bộ booking khi offline | P0 | Bảng mapping, idempotent upsert, test ngắt mạng/reconnect. |
| Acceptance chưa chạy đủ | Regression nghiệp vụ và phân quyền | P0 | 20/20 có log/test artifact hoặc N/A được duyệt. |
| Backup Edge cũ từng rỗng | Không phục hồi được tại cơ sở | P0 | Backup đúng volume, restore drill và checksum. |
| Một replica Docker | Có gián đoạn khi build/restart | P1 | ≥2 replica, load balancer, readiness, rolling/blue-green. |
| Chưa có tải kiểm chứng | Không thể cam kết 5 triệu người dùng | P1 | Capacity model, k6 staged test, SLO và báo cáo bottleneck. |

## 5. Checklist Go-live bắt buộc

### Phần mềm

- [ ] 20/20 Acceptance Criteria có test artifact hoặc quyết định N/A được phê duyệt.
- [ ] Typecheck, unit, integration, API contract, UI regression và migration test chạy trong CI.
- [ ] Không còn dữ liệu hardcode/mock trong luồng tiền, phòng, khách, thiết bị và báo cáo.
- [ ] Idempotency, transaction, audit và tenant isolation được test cả đường thành công/lỗi.
- [ ] Kế hoạch rollback không sửa ngược migration đã áp dụng.

### Phần cứng

- [ ] Nghiệm thu 1 relay, 1 meter, 1 khóa/thẻ, 1 Edge theo đúng asset_code/phòng.
- [ ] 30 ngày, ≥95% ACK trong SLA; không có lệnh trùng/sai phòng.
- [ ] Mất mạng/reconnect không thực hiện lệnh hết hạn; tải critical không bị tự ngắt.
- [ ] Có override, log người thao tác và driver/vendor runbook.

### Vận hành và KPI

- [ ] Owner/assignee/escalation cho cảnh báo; lịch trực và SLA rõ ràng.
- [ ] Backup mã hóa, offsite; restore drill cho từng DB và Edge volume.
- [ ] KPI before/after: doanh thu, ADR, RevPAR, kWh/phòng, chi phí, MTTR, downtime.
- [ ] Credential OTA/payment/CRM có owner, expiry và quy trình rotation.

### Bảo mật và hạ tầng

- [ ] TLS, VPN/private ingress, MFA, secret manager, rate limit/WAF.
- [ ] OAuth2/mTLS service-to-service; định danh riêng từng Edge/device.
- [ ] Pentest, scan dependency/image, policy dữ liệu cá nhân và retention.
- [ ] Tối thiểu hai replica cho dịch vụ public; readiness/graceful drain/rollback.
- [ ] Load test theo SLO; không tuyên bố chịu 5 triệu concurrent nếu chưa có báo cáo thực tế.

## 6. API/script cập nhật tiến trình

### Ghi một phiên làm việc

```http
POST /api/v1/go-live/progress
X-Go-Live-Secret: <GO_LIVE_PROGRESS_SECRET>
Content-Type: application/json

{
  "timestamp": "2026-09-08T08:15:00+07:00",
  "description": "Kiểm tra regression PMS",
  "relatedItems": ["N1", "N3", "F-PMS-OPS-001", "MODULE:PMS_CORE"],
  "status": "DONE",
  "evidence": "URL artifact hoặc đường dẫn file/commit",
  "performedBy": "Codex",
  "notes": "Không chứa token hoặc dữ liệu khách",
  "idempotencyKey": "pms-regression-<commit-sha>"
}
```

API ghi `go_live_progress_logs` và `audit_logs` trong transaction, sau đó sinh lại `docs/GO_LIVE_PROGRESS.html`. Gọi lại cùng key/cùng payload trả bản ghi cũ; cùng key/khác payload trả `409`. Có thể lọc bằng `from`, `to`, `status`, `performedBy`; dùng `/summary` để xem tổng hợp và `/metrics` cho Prometheus.

Biến môi trường:

```text
GO_LIVE_PROGRESS_SECRET=<secret cho agent/internal API>
CI_PROGRESS_WEBHOOK_SECRET=<GitHub webhook secret>
GO_LIVE_PROGRESS_HTML_PATH=<đường dẫn tuyệt đối nếu API không chạy từ repo>
```

## 7. Webhook CI/CD

GitHub gửi `workflow_run`, `check_run` hoặc event CI tới `POST /api/v1/go-live/progress/webhook` với `X-GitHub-Delivery`, `X-GitHub-Event` và chữ ký `X-Hub-Signature-256: sha256=...`. API map `success/completed → DONE`, `queued/in_progress → IN_PROGRESS`, các kết quả lỗi → `MISSING`; URL run trở thành evidence. Có thể dùng `X-Go-Live-Secret` bằng `CI_PROGRESS_WEBHOOK_SECRET` cho CI nội bộ không hỗ trợ chữ ký GitHub.

Workflow `.github/workflows/go-live-readiness.yml` chạy typecheck các ứng dụng liên quan, kiểm tra migration/catalog, sinh artifact HTML và có bước gọi API nếu secret/repository variable đã cấu hình. Không pull DB production vào runner công cộng; lịch sử DB không bị ghi đè.

## 8. Giám sát

- Thu thập `api`, `db_write`, `html_regenerate` p50/p95 và webhook success/failure.
- Cảnh báo p95 API >1 giây/10 phút, regenerate >5 giây, 3 webhook lỗi liên tiếp hoặc không có bản cập nhật sau 24 giờ kể từ deploy.
- API progress ở HQ và DB riêng; không chạy trên request path PMS/IoT.
- Production nhiều replica phải xuất OpenTelemetry và để một worker/CI có lease sinh HTML.

## 9. Task assignment P0/P1

| Ưu tiên | Owner gợi ý | Công việc | Definition of Done |
|---|---|---|---|
| P0 | Codex | Test migration 006 + API idempotency/filter/webhook signature | Test tự động PASS; duplicate không tạo dòng; payload khác trả 409. |
| P0 | Claude | Viết matrix 20 Acceptance Criteria và automation | 20/20 có test/artifact hoặc N/A được BA duyệt. |
| P0 | Codex | Sửa Edge local/cloud mapping và service auth | Offline/reconnect không mất/trùng booking; OAuth2/mTLS hoặc kế hoạch migration được test. |
| P0 | Claude | Kết nối sandbox OTA/payment/CRM | Webhook ký số, idempotent, đối soát và opt-in có bằng chứng. |
| P0 | Codex | Nghiệm thu relay/meter/khóa/Edge | Biên bản 30 ngày, ACK ≥95%, không sai phòng/tải critical. |
| P0 | Claude | Security gate | MFA, secrets, tenant isolation, scan và pentest không còn lỗi Critical/High mở. |
| P1 | Codex | CI/CD rolling + rollback | ≥2 replica staging, readiness và rollback drill thành công. |
| P1 | Claude | KPI/reporting reconciliation | ADR/RevPAR/CVG khớp dữ liệu nguồn và có báo cáo trước/sau. |
| P1 | Codex | Observability/alerting | Dashboard metrics, alert test và runbook on-call hoạt động. |

Chi tiết dùng chung cho agent nằm tại `TASK_ASSIGNMENT_GO_LIVE.md`; mọi phiên tiếp theo phải gọi API hoặc thêm log bằng nguồn DB trước khi cập nhật trạng thái.
