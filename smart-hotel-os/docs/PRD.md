# PRD — Remote Hospitality Operating System (MVP)

**Need refs:** `nhucau.md:N1,N2,N3,N4,N5`
**Nguồn duy nhất của nhu cầu:** [../../nhucau.md](../../nhucau.md)
**Cách đọc:** mỗi mục dưới đây phải giữ nguyên `N#`; thiết kế UI, AI, hardware và commit tham chiếu lại mã đó.

## Mục tiêu sản phẩm

Giúp chủ cơ sở lưu trú vận hành hiệu quả hơn, ít phụ thuộc nhân sự hơn và biết được tiền đang tạo ra/lãng phí ở đâu. MVP ưu tiên phần có thể đo được và chạy được khi Edge mất mạng cục bộ.

## Câu hỏi dashboard phải trả lời

| Need refs | Câu hỏi | KPI nguồn |
|---|---|---|
| N1 | Hôm nay kiếm được bao nhiêu? | Revenue, ADR, RevPAR, Occupancy |
| N2 | Đang lãng phí tiền ở đâu? | kWh, chi phí điện, chi phí vận hành |
| N3 | Hệ thống đã tự xử lý gì? | số workflow/lệnh, phút lao động tiết kiệm |
| N4 | Có vấn đề gì cần quan tâm? | Edge/device uptime, sự cố mở, MTTR |
| N5 | Cần quyết định gì ngay? | cảnh báo ưu tiên, SLA, value at risk |

## Nguyên tắc kiến trúc

- Rule engine/code thường cho điều kiện xác định: check-out → tạo tác vụ dọn và lệnh điện; heartbeat quá ngưỡng → cảnh báo.
- AI chỉ dùng cho suy luận, ngôn ngữ, dự báo và bất định; mọi câu trả lời phải ghi nguồn dữ liệu.
- HQ là sổ gốc tài sản/khách hàng; PMS là sổ nghiệp vụ cơ sở; Edge là lớp điều khiển offline-friendly; IoT Service là lớp giao thức thiết bị.
- Không dùng một `FK` xuyên database. Liên kết bằng `asset_code`, `property_id` và idempotency key.

## Chỉ tiêu MVP đề xuất

1. Luồng nhận phòng, ở, gia hạn, chuyển phòng, trả phòng và tạo housekeeping không mất dữ liệu.
2. Lệnh điện có `QUEUED → ACKNOWLEDGED/FAILED`, retry và audit; không giả trạng thái ONLINE.
3. Edge heartbeat hiển thị được mốc `last_seen`, cloud reachability và outbox.
4. 100% thiết bị được khai báo `asset_code` và gán một cơ sở trước khi kích hoạt.
5. Pilot 10 phòng có baseline kWh và báo cáo tiền tiết kiệm trước/sau; chưa cam kết tỷ lệ cho tới khi đo xong.

## Đã cập nhật sau khi duyệt P0/P1/P2

- **N1,N2,N3,N4,N5 · F-VALUE-001:** PMS có `/value-dashboard`, API tổng hợp doanh thu/chi phí/kWh/CVG, sổ `value_ledger` và form ghi nhận baseline/after pilot có idempotency + audit.
- **N2,N4,N5 · F-ALERT-001:** PMS có `/alerts`, bảng `operational_alerts`, severity/due_at, ACK/resolve; Edge stale và maintenance đang mở tự tạo hàng đợi cảnh báo.
- **N2,N3,N4,N5 · F-IOT-CTRL-001:** Luồng phần mềm giữ nguyên `asset_code → iot_device_id → Edge`; checklist nghiệm thu thật nằm ở [REAL_HARDWARE_ACCEPTANCE.md](REAL_HARDWARE_ACCEPTANCE.md).
- **Trạng thái:** phần mềm đã sẵn sàng kiểm thử/pilot; ROI, ACK thiết bị thật và baseline 30 ngày chưa được gọi là hoàn tất cho tới khi có bằng chứng thực địa.

## Ngoài phạm vi MVP

Camera AI, predictive maintenance, LLM query dữ liệu, Data Lake/Kafka/Qdrant, tự động đẩy giá OTA và public Internet multi-property chỉ triển khai sau khi MVP có dữ liệu và KPI pilot.
