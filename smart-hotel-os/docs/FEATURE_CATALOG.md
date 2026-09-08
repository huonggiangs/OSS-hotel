# FEATURE_CATALOG — F# và liên kết ngược `N#`

Mỗi feature mới phải có mã `F#`, `Need refs`, KPI, owner, trạng thái và link tới UI/AI/Hardware. Đây là sổ tra cứu ngắn; chi tiết kỹ thuật nằm trong tài liệu module tương ứng.

| F# | Need refs | Feature | UI | AI | Hardware | Trạng thái |
|---|---|---|---|---|---|---|
| F-PMS-OPS-001 | N1,N3,N5 | Nghiệp vụ PMS cốt lõi | `/rooms`, `/booking`, nhận phòng nhanh, housekeeping | Rule engine | Phòng/thiết bị điều khiển nếu có | Go-live |
| F-PRICE-001 | N1 | Giá linh hoạt theo lấp đầy | `/price` | Rule-based; AI chưa bật | Không bắt buộc | Go-live |
| F-IOT-CTRL-001 | N2,N3,N4 | Lệnh PMS → Edge → IoT | Trạng thái lệnh/ACK trong phòng | Không dùng AI cho IF/ELSE | `asset_code`, `iot_device_id`, relay/driver | Go-live |
| F-REMOTE-001 | N4,N5 | Giám sát Edge và tài sản | HQ `/hardware-assets`, PMS edge-status | Cảnh báo AI chưa có | heartbeat, connection status, edge outbox | Go-live |
| F-MAINT-001 | N3,N4,N5 | Báo hỏng và bảo trì | maintenance modal, partner, ticket | Dự báo chưa có | warranty, supplier, asset history | Go-live |
| F-HQ-ONBOARD-001 | N3,N4,N5 | Setup nhanh cơ sở mới | HQ `/customers`, bàn giao credential, email trạng thái | Không dùng AI | property + owner + asset assignment | Go-live |
| F-HQ-ASSET-001 | N2,N3,N4,N5 | Vòng đời tài sản HQ | HQ `/hardware-assets/[id]`: sửa, gán cơ sở, kích hoạt/ngừng, báo lỗi/xử lý | Rule alert; AI chưa bật | `asset_code`, `property_id`, vị trí, lifecycle, alert | Go-live |
| F-COMMISSION-001 | N1,N4 | Đối soát hoa hồng đối tác | HQ `/commissions`: tạo, sửa/xóa trước duyệt, chi tiết, duyệt, thanh toán | Không dùng AI | Không bắt buộc | Go-live |
| F-MODULE-FLOW-001 | N3,N4 | Bật module và dẫn bước kế tiếp | PMS `/modules`: bật/tắt, thông báo, nút thiết lập tiếp theo | Rule-based | Thiết bị được gán ở bước cấu hình | Go-live |
| F-UTILITY-FLOW-001 | N2,N4,N5 | Tiện ích có luồng hành động | PMS `/utilities`: địa chỉ bản đồ, kênh đặt phòng, đồng bộ, đối tác hỗ trợ | Rule-based | Đối tác/thiết bị tham chiếu theo cơ sở | Go-live |
| F-SERVICE-FLOW-001 | N1,N3 | Dịch vụ từ tạo đến thu tiền | PMS `/services`: thêm/sửa/xóa, công khai, tìm kiếm, ghi nhận tại phòng/hóa đơn | Rule-based | Không bắt buộc; thiết bị dịch vụ là phase sau | Go-live |
| F-BOOKING-ARRIVAL-001 | N1,N3,N5 | Xác nhận đến/no-show và chính sách cọc | PMS `/customers`, `/booking`, cài đặt cơ sở | Rule trạng thái; AI chỉ gợi ý kịch bản | Máy đọc QR căn cước (tuỳ chọn) | Go-live |
| F-CRM-CARE-001 | N1,N3,N4 | Lịch chăm sóc khách có duyệt kịch bản | PMS `/customers` — Zalo/Facebook/email | Học thói quen ở chế độ đề xuất, không tự gửi | Không bắt buộc | Go-live |
| F-OTA-RECON-001 | N1,N4 | Đối soát tiền nhận từ OTA | PMS `/sync` — mã giao dịch, gộp/hoa hồng/thực nhận | Không dùng AI | Không bắt buộc | Go-live |
| F-VALUE-001 | N1,N2,N3,N4,N5 | Value Dashboard + CVG ledger | PMS `/value-dashboard`, KPI trên `/dashboard` | Chưa dùng AI; chỉ ghi nhận nguồn thật | meter/room/asset_code khi có telemetry | Go-live |
| F-ALERT-001 | N2,N4,N5 | Alert và SLA | PMS `/alerts`, severity, due_at, ACK/resolve | Rule trước, AI sau | offline/fault/energy telemetry | Go-live |
| F-AI-REV-001 | N1,N4 | Trợ lý lợi nhuận | CEO dashboard/chat (cần bổ sung) | RAG + tool calling có nguồn | Revenue/expense/OTA/energy data | Backlog |
| F-AI-ENERGY-001 | N2,N4 | Tối ưu năng lượng | Value Dashboard (cần bổ sung) | anomaly/time-series | meter + occupancy + power switch | Backlog sau pilot |
| F-AI-CAMERA-001 | N4,N5 | Camera AI | camera events (chưa có) | YOLO/vision (chưa có) | RTSP/NVR/IP camera | Out of scope |

## Template cho PR/commit

```text
Need refs: N2,N4
Feature: F-IOT-CTRL-001
KPI: command_ack_rate, kWh_per_room, downtime_minutes
UI: /rooms — Tiền → Vấn đề → Hành động
AI: không dùng; rule xác định
Hardware: asset_code, property_id, protocol, heartbeat
Evidence: test/link/pilot
```
