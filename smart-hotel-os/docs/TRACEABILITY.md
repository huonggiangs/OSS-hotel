# Truy vết nhu cầu `N#` — từ giá trị khách hàng đến triển khai

`nhucau.md` là nguồn nhu cầu kinh doanh (Customer Need / Business Value Source of Truth). Các mã `N1`–`N5` trong đó là mã ổn định; không đổi mã khi viết lại câu chữ.

## Luồng tham chiếu ngược

```text
nhucau.md (N#)
   ↓
PRD.md (mục tiêu + KPI của N#)
   ↓
MVP_SCOPE.md (in/out của N#)
   ↓
FEATURE_CATALOG.md (F# và tiêu chí chấp nhận)
   ├─ UI (màn hình, hành động, trạng thái lỗi)
   ├─ AI (dữ liệu nguồn, giải thích, guardrail)
   └─ Hardware (asset_code, vị trí, giao thức, heartbeat)
```

Mỗi artefact phải có trường `Need refs: N#`. Nếu một PR/commit không chỉ ra được `N#`, đó là dấu hiệu tính năng chưa chứng minh được giá trị và phải đưa về backlog để xem xét.

## Quy tắc bắt buộc cho một feature

1. `F#` tham chiếu ít nhất một `N#` và một KPI đo được.
2. UI trình bày theo thứ tự **Tiền → Vấn đề → Hành động**, không bắt chủ cơ sở đọc thông số IoT trước.
3. AI chỉ đọc dữ liệu có nguồn, trả lời kèm nguồn thời gian/phạm vi và không tự ghi lệnh nguy hiểm.
4. Hardware luôn có `asset_code`, `property_id`, vị trí lắp, trạng thái vòng đời, kết nối và người chịu trách nhiệm.
5. Tiêu chí “Đã xong” cần bằng chứng: typecheck/test, dữ liệu thật hoặc pilot thiết bị thật, và KPI trước/sau.

## Bảng truy vết hiện tại

| Need | Mục tiêu | Feature | UI | AI | Hardware | KPI nghiệm thu |
|---|---|---|---|---|---|---|
| N1 | Tăng doanh thu/lợi nhuận | F-REV-001 Dashboard doanh thu; F-PRICE-001 Giá linh hoạt | Dashboard CEO, phòng & giá | F-AI-REV-001 trợ lý lợi nhuận (chưa triển khai) | Nguồn doanh thu/thiết bị ghi nhận chi phí | Revenue, ADR, RevPAR, Occupancy, CVG |
| N2 | Biết và giảm chi phí | F-ENERGY-001 Điều khiển/đo điện; F-VALUE-001 Value Dashboard (chưa triển khai) | Tiền điện → vấn đề → hành động | F-AI-ENERGY-001 phát hiện bất thường (chưa triển khai) | ELECTRIC_METER, POWER_SWITCH, asset_code | kWh/phòng, đồng tiết kiệm, payback |
| N3 | Giảm phụ thuộc con người | F-PMS-OPS-001 Check-in/out, housekeeping; F-IOT-CTRL-001 Luồng lệnh | Nhận phòng nhanh, trạng thái phòng | Rule engine trước; AI chỉ hỗ trợ phần bất định | EDGE_NODE, khóa/thẻ/relay khi có driver | phút xử lý, số thao tác, năng suất/người |
| N4 | Quản lý từ xa | F-REMOTE-001 HQ/PMS/Edge monitoring; F-ALERT-001 Cảnh báo (một phần) | CEO Dashboard, cảnh báo, bản đồ (còn thiếu) | F-AI-OPS-001 trợ lý vận hành (chưa triển khai) | heartbeat, connection status, SLA | uptime, MTTR, sự cố mở, thời gian phản hồi |
| N5 | Yên tâm, giảm rủi ro | F-MAINT-001 Bảo trì/ticket; F-SEC-001 RBAC/audit | Phiếu bảo trì, nhật ký, quyền | AI dự báo chỉ sau khi đủ lịch sử | warranty, supplier, lịch sử sửa | downtime tránh được, SLA, số cuộc gọi xử lý |

## Hiện trạng và lỗ hổng

- PMS nghiệp vụ, giá linh hoạt, bảo trì báo hỏng, hoa hồng đối tác và luồng PMS → Edge → IoT đã có ở mức MVP/pilot.
- HQ đã có luồng setup nhanh tạo property + OWNER idempotent; mật khẩu tạm chỉ hiển thị một lần, email chỉ gửi khi SMTP được cấu hình.
- Heartbeat Edge và danh mục `asset_code` HQ–PMS–IoT đã có, nhưng cần thiết bị vật lý gửi heartbeat/ACK để nghiệm thu tác động thật.
- Chưa có Value Dashboard chứng minh `CVG = Cost Saved + Additional Profit + Loss Prevented`.
- Chưa có AI Operations Brain, AI Energy Optimizer, AI Camera hoặc thông báo/SLA tự động.

Tài liệu kế hoạch chi tiết: [PRD.md](PRD.md), [MVP_SCOPE.md](MVP_SCOPE.md), [FEATURE_CATALOG.md](FEATURE_CATALOG.md).
