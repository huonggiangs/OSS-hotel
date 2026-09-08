# TASK ASSIGNMENT — GO-LIVE

Ngày cập nhật: 08/09/2026  
Phạm vi: đồng bộ nhãn trạng thái từ MVP/Pilot sang Go-live; không thay đổi logic tính năng.

## Feature đã chuyển sang Go-live

| Feature ID | Need refs | Trạng thái mới |
|---|---|---|
| F-PMS-OPS-001 | N1,N3,N5 | Go-live |
| F-PRICE-001 | N1 | Go-live |
| F-IOT-CTRL-001 | N2,N3,N4 | Go-live |
| F-REMOTE-001 | N4,N5 | Go-live |
| F-MAINT-001 | N3,N4,N5 | Go-live |
| F-HQ-ONBOARD-001 | N3,N4,N5 | Go-live |
| F-HQ-ASSET-001 | N2,N3,N4,N5 | Go-live |
| F-COMMISSION-001 | N1,N4 | Go-live |
| F-MODULE-FLOW-001 | N3,N4 | Go-live |
| F-UTILITY-FLOW-001 | N2,N4,N5 | Go-live |
| F-SERVICE-FLOW-001 | N1,N3 | Go-live |
| F-BOOKING-ARRIVAL-001 | N1,N3,N5 | Go-live |
| F-CRM-CARE-001 | N1,N3,N4 | Go-live |
| F-OTA-RECON-001 | N1,N4 | Go-live |
| F-VALUE-001 | N1,N2,N3,N4,N5 | Go-live |
| F-ALERT-001 | N2,N4,N5 | Go-live |

`F-AI-REV-001`, `F-AI-ENERGY-001` giữ nguyên Backlog.  
`F-AI-CAMERA-001` giữ nguyên Out of scope.

## File code đã chỉnh nhãn trạng thái

- `webadmin/apps/web/src/app/(dashboard)/releases/page.tsx`
- `webadmin/apps/api/src/lib/propertyWebClient.ts`
- `webadmin/apps/api/src/lib/iotSync.ts`
- `webadmin/apps/api/src/index.ts`
- `webadmin/apps/api/src/repositories/releases.repo.ts`
- `webadmin/apps/api/src/routes/users.routes.ts`
- `smart-hotel-os/apps/edge-node/src/lib/sync.ts`
- `smart-hotel-os/property-web/apps/api/src/middleware/internalAuth.ts`
- `smart-hotel-os/property-web/apps/api/src/repositories/dashboard.repo.ts`
- `smart-hotel-os/property-web/apps/web/src/components/dashboard/DashboardOverview.tsx`
- `smart-hotel-os/property-web/apps/web/src/app/(pms)/customers/page.tsx`

Tên miền nghiệp vụ `energy_pilots`, API `/energy-pilots`, biến `pilot` và thuật toán đánh giá pilot không phải nhãn trạng thái nên được giữ nguyên để không thay đổi hợp đồng API hoặc logic dữ liệu.

## Checklist giao Developer

| Ưu tiên | Người phụ trách gợi ý | Công việc | Điều kiện hoàn thành |
|---|---|---|---|
| P0 | Codex | Chạy typecheck/build cho HQ, PMS và Edge | Tất cả tiến trình kết thúc thành công, không có lỗi TypeScript/build |
| P0 | Claude | Viết hoặc cập nhật test cho 16 feature Go-live | Có test luồng chính, phân quyền và trường hợp lỗi; lưu bằng chứng kết quả |
| P0 | Codex | Kiểm tra regression HQ → PMS → Edge → IoT | Luồng đăng nhập, phòng, booking, thiết bị, cảnh báo và giá trị không bị lỗi |
| P0 | Claude | Đối chiếu tài liệu kỹ thuật với `FEATURE_CATALOG.md` | PRD, API, traceability và runbook không còn trạng thái mâu thuẫn |
| P0 | Codex | Kiểm tra migration và backup/restore trên staging | Backup hợp lệ; migrate thành công; restore thử không dùng dữ liệu production |
| P0 | Claude | Rà soát bảo mật trước triển khai | Secret production, RBAC, audit, TLS/VPN/MFA và giới hạn API được xác nhận |
| P1 | Codex | Chạy kiểm thử Docker health và LAN | HQ 3000, PMS 3100, Edge 4200 phản hồi từ máy chủ và một máy LAN khác |
| P1 | Claude | Rà soát checklist triển khai public | Hoàn thành từng mục trong `ops/PUBLIC_DEPLOYMENT_CHECKLIST.md`; ghi owner và bằng chứng |
| P1 | Codex | Chuẩn bị regression report và rollback plan | Có danh sách phiên bản, migration tương thích và lệnh quay lui đã kiểm tra |
| P1 | Claude / Codex | Theo dõi sau phát hành | Health, lỗi, độ trễ, lệnh thiết bị và cảnh báo có dashboard/SLA rõ ràng |

## Lệnh kiểm tra đề xuất

```text
HQ API/Web: typecheck + build
PMS API/Web: typecheck + build
Edge Node: typecheck + build
Docker/LAN: ops/scripts/Get-OssStatus.ps1 và ops/scripts/Test-OssLan.ps1
Public: đối chiếu ops/PUBLIC_DEPLOYMENT_CHECKLIST.md
```
