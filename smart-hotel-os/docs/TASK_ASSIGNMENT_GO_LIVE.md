# TASK ASSIGNMENT — GO-LIVE

Ngày cập nhật: 08/09/2026  
Nguồn chi tiết: `GO_LIVE_READINESS.md`; trang theo dõi: `GO_LIVE_PROGRESS.html`.

## Trạng thái Feature Catalog

### Đã sẵn sàng Go-live

- F-HQ-ASSET-001
- F-COMMISSION-001
- F-MODULE-FLOW-001
- F-UTILITY-FLOW-001
- F-SERVICE-FLOW-001
- F-BOOKING-ARRIVAL-001

### READY_FOR_PILOT / thiếu bằng chứng

- F-PMS-OPS-001
- F-PRICE-001
- F-IOT-CTRL-001
- F-REMOTE-001
- F-MAINT-001
- F-HQ-ONBOARD-001
- F-CRM-CARE-001
- F-OTA-RECON-001
- F-VALUE-001
- F-ALERT-001

### Giữ nguyên phạm vi

- Backlog: F-AI-REV-001, F-AI-ENERGY-001.
- Out of scope: F-AI-CAMERA-001.

## Phân công

| Ưu tiên | Owner gợi ý | Task | Definition of Done |
|---|---|---|---|
| P0 | Codex | Test API/migration theo dõi Go-live | Migration PostgreSQL/PGlite, idempotency, filter, webhook signature và HTML regeneration đều PASS. |
| P0 | Claude | Chuyển 20 Acceptance Criteria thành test matrix | Mỗi tiêu chí có trạng thái, test, artifact/commit hoặc N/A được BA duyệt. |
| P0 | Codex | Sửa offline mapping Edge ↔ Cloud | Booking offline đồng bộ lại đúng ID; retry không trùng; conflict có cảnh báo. |
| P0 | Claude | Kiểm thử cô lập tenant/RBAC/audit | Không truy cập chéo tenant; mọi thay đổi nhạy cảm có audit. |
| P0 | Codex | Nghiệm thu relay + meter + khóa/thẻ + Edge | 30 ngày, ACK ≥95%, không sai phòng, tải critical không tự ngắt. |
| P0 | Claude | Tích hợp OTA/payment/CRM sandbox | Credential/secret an toàn, webhook ký số, idempotent, đối soát đúng. |
| P0 | Codex | Backup/restore drill | Khôi phục từng DB và Edge volume; checksum và thời gian RTO/RPO được ghi. |
| P1 | Claude | Đối soát KPI tài chính/năng lượng | ADR, RevPAR, CVG, kWh và chi phí khớp nguồn; có before/after. |
| P1 | Codex | CI/CD rolling và rollback | Staging ≥2 replica, readiness, migration compatible và rollback thành công. |
| P1 | Claude | Bảo mật trước public | MFA, TLS/VPN, secret manager, rate limit, scan và pentest không còn High/Critical. |
| P1 | Codex | Observability | Prometheus/OpenTelemetry, cảnh báo p95/webhook/CI và runbook on-call được test. |

## Cách ghi nhận mỗi phiên

Gọi HQ API sau khi hoàn thành từng batch; không sửa trực tiếp lịch sử trong HTML:

```http
POST /api/v1/go-live/progress
X-Go-Live-Secret: <GO_LIVE_PROGRESS_SECRET>
Content-Type: application/json

{
  "timestamp": "2026-09-08T08:15:00+07:00",
  "description": "Mô tả batch đã làm",
  "relatedItems": ["N2", "F-IOT-CTRL-001", "MODULE:IOT_ENERGY"],
  "status": "DONE",
  "evidence": "commit/test artifact/log/screenshot",
  "performedBy": "Claude hoặc Codex",
  "notes": "Không ghi secret hoặc dữ liệu khách",
  "idempotencyKey": "task-name-<commit-sha>"
}
```

API ghi DB + audit trước, sau đó sinh lại `docs/GO_LIVE_PROGRESS.html`. Cùng key/cùng payload là replay an toàn; cùng key/payload khác phải trả `409`.

CI dùng `.github/workflows/go-live-readiness.yml`. Cấu hình repository secret `GO_LIVE_PROGRESS_SECRET` và variable `GO_LIVE_PROGRESS_API_URL` để workflow gửi kết quả; GitHub webhook dùng `CI_PROGRESS_WEBHOOK_SECRET`, `X-GitHub-Delivery` và `X-Hub-Signature-256`.

## Quy tắc hoàn thành

- Không đổi READY_FOR_PILOT thành Go-live nếu chỉ có typecheck/build.
- Hardware cần ACK/heartbeat và biên bản thật.
- OTA/payment/CRM cần credential và webhook sandbox/thật.
- KPI cần dữ liệu trước/sau; không dùng dữ liệu mô phỏng làm bằng chứng thương mại.
- Mọi batch có test, evidence, log tiến trình và cập nhật tài liệu liên quan.
- Không đưa token, mật khẩu, PII khách vào log/evidence.
