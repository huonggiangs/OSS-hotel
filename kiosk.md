# NHIỆM VỤ XÂY DỰNG HỆ THỐNG KIOSK REMOTE MANAGEMENT

## 1. Vai trò

Bạn là Principal Software Architect, Senior Full-stack Engineer, DevOps Engineer và Security Engineer.

Nhiệm vụ của bạn là thiết kế và xây dựng một hệ thống Web Dashboard tách biệt với Windows Kiosk App, dùng để quản lý khách hàng, mã kích hoạt, kiosk, thiết bị ngoại vi, cấu hình từ xa, trạng thái online/offline, phiên bản phần mềm và cập nhật ứng dụng.

Không được tự ý thêm nghiệp vụ không có trong yêu cầu. Khi có nội dung chưa xác định, phải ghi rõ giả định trong tài liệu `ASSUMPTIONS.md`; không được âm thầm tự quyết định.

---

## 2. Mục tiêu hệ thống

Hệ thống phải cho phép:

1. Tạo khách hàng và cơ sở khách sạn.
2. Cấp mã kích hoạt dạng chuỗi số cho Windows App.
3. Một license mặc định chỉ được kích hoạt trên một máy tính.
4. Ngăn hai máy sử dụng đồng thời cùng một license.
5. Cho phép quản trị viên thu hồi hoặc chuyển license sang máy mới.
6. Khai báo cấu hình thiết bị ngoại vi trên web.
7. Windows App tự tải cấu hình theo Device ID sau khi kích hoạt.
8. Theo dõi trạng thái kiosk online hoặc offline.
9. Theo dõi phiên bản App đang chạy.
10. Upload, phát hành và triển khai bản cập nhật.
11. Gửi lệnh cập nhật cho từng kiosk hoặc nhóm kiosk.
12. Theo dõi tiến trình cập nhật.
13. Rollback khi bản cập nhật lỗi.
14. Hiển thị trạng thái của từng thiết bị ngoại vi.
15. Ghi lại toàn bộ thay đổi và thao tác quản trị.

---

## 3. Kiến trúc bắt buộc

Hệ thống phải được tách thành các thành phần:

### 3.1. Web Admin

Web giao diện quản trị.

### 3.2. Backend API

Xử lý:

- Authentication.
- Authorization.
- Customer management.
- License management.
- Device management.
- Configuration management.
- Release management.
- Remote commands.
- Alert management.
- Audit logging.

### 3.3. Realtime Gateway

Sử dụng WebSocket hoặc MQTT để:

- Nhận heartbeat.
- Cập nhật trạng thái online/offline.
- Gửi lệnh từ server xuống kiosk.
- Gửi thông báo có cấu hình mới.
- Gửi thông báo có bản cập nhật mới.

Phải có cơ chế HTTP polling dự phòng nếu realtime connection không hoạt động.

### 3.4. Windows Agent

Windows App hoặc service đi kèm App phải:

- Kích hoạt thiết bị.
- Duy trì danh tính thiết bị.
- Gửi heartbeat.
- Báo trạng thái thiết bị ngoại vi.
- Nhận cấu hình.
- Nhận lệnh từ xa.
- Tải và cài đặt bản cập nhật.
- Gửi kết quả thực hiện.
- Lưu hàng đợi khi mất internet.
- Không làm ảnh hưởng hoạt động check-in khi server offline.

### 3.5. Database

Sử dụng PostgreSQL.

### 3.6. File Storage

Lưu:

- Gói cập nhật.
- Release manifest.
- Log được upload.
- File cấu hình xuất/nhập.

Có thể dùng S3-compatible object storage.

---

## 4. Công nghệ đề xuất

Có thể sử dụng:

### Frontend

- Next.js.
- TypeScript.
- Tailwind CSS.
- Component library thống nhất.
- TanStack Query.
- React Hook Form.
- Zod.

### Backend

Chọn một trong hai:

- NestJS + TypeScript.
- ASP.NET Core.

Không được trộn nhiều backend framework.

### Data

- PostgreSQL.
- Redis cho cache, realtime state và command queue.
- Object storage cho release files.

### Deployment

- Docker.
- Docker Compose cho môi trường development.
- CI/CD.
- Reverse proxy.
- HTTPS bắt buộc.

Tạo file Architecture Decision Record nếu thay đổi công nghệ.

---

## 5. Quy tắc License

### 5.1. Mã kích hoạt

- Là chuỗi số.
- Mặc định 12–16 chữ số.
- Có checksum hoặc cơ chế phát hiện nhập sai.
- Không lưu key dạng plain text trong database.
- Database chỉ lưu hash của key.
- Chỉ hiển thị full key một lần khi tạo.
- Sau đó chỉ hiển thị bốn số cuối.

### 5.2. Kích hoạt

App gửi:

- Activation key.
- Device fingerprint.
- App version.
- Agent version.
- Windows version.
- Device-generated public key.

Server phản hồi:

- Device ID.
- Access token ngắn hạn.
- Refresh token.
- Device credential.
- Customer ID.
- Site ID.
- Device configuration version.

### 5.3. Giới hạn thiết bị

- `max_devices` mặc định bằng 1.
- Khi đạt giới hạn, không cho kích hoạt máy mới.
- Không được tự động đẩy máy cũ ra khỏi hệ thống.
- Chỉ quản trị viên mới được reset hoặc chuyển license.
- Mọi lần reset phải ghi audit log.

### 5.4. Offline

App đã kích hoạt phải tiếp tục hoạt động khi mất internet.

License có trường:

- `offline_grace_days`.
- `last_validated_at`.
- `expires_at`.

Không được khóa kiosk ngay khi mất internet.

---

## 6. Quản lý thiết bị ngoại vi

Phải hỗ trợ các loại:

1. Passport scanner.
2. QR scanner.
3. Automatic room-card dispenser.
4. Cash acceptor.
5. IP camera.
6. Thermal printer.

Mỗi thiết bị có:

- ID.
- Device type.
- Manufacturer.
- Model.
- Enabled.
- Connection type.
- Connection configuration.
- Driver/SDK version.
- Current status.
- Last seen.
- Last error.
- Desired configuration.
- Reported configuration.
- Configuration version.

Connection types:

- USB HID.
- USB Serial.
- COM.
- TCP.
- HTTP.
- RTSP.
- ONVIF.
- Windows Printer.

Thông tin bí mật như mật khẩu camera phải được mã hóa ở database và che trên giao diện.

---

## 7. Đồng bộ cấu hình

Mỗi lần thay đổi cấu hình phải tạo một immutable configuration version.

Không được cập nhật trực tiếp cấu hình đang hoạt động mà không lưu phiên bản.

Quy trình:

1. Admin chỉnh sửa.
2. Validate dữ liệu.
3. Tạo configuration version.
4. Tạo deployment.
5. Gửi thông báo tới kiosk.
6. Kiosk tải cấu hình.
7. Kiosk validate.
8. Kiosk lưu bản cũ.
9. Kiosk áp dụng.
10. Kiosk kiểm tra thiết bị.
11. Kiosk báo kết quả.
12. Nếu thất bại, kiosk rollback.

Các trạng thái:

- PENDING.
- WAITING_DEVICE.
- DELIVERED.
- ACKNOWLEDGED.
- APPLYING.
- SUCCESS.
- FAILED.
- ROLLED_BACK.
- EXPIRED.

---

## 8. Heartbeat và trạng thái realtime

Kiosk gửi heartbeat định kỳ.

Heartbeat gồm:

- Device ID.
- Timestamp.
- App version.
- Agent version.
- Windows version.
- Uptime.
- CPU usage.
- RAM usage.
- Disk free.
- Network status.
- Current workflow state.
- Peripheral summary.
- Last completed check-in.
- Current configuration version.

Server xác định:

- ONLINE.
- DEGRADED.
- OFFLINE.
- MAINTENANCE.
- UPDATING.
- LOCKED.

Không lưu heartbeat vô hạn. Phải có chính sách tổng hợp và xóa dữ liệu cũ.

---

## 9. Quản lý bản phát hành

Một release gồm:

- Version.
- Build number.
- Release channel.
- Release notes.
- Package URL.
- File size.
- SHA-256.
- Digital signature.
- Minimum upgrade version.
- Mandatory flag.
- Rollback supported.
- Published status.
- Published by.
- Published at.

Release channel:

- DEV.
- TEST.
- BETA.
- STABLE.

Không cho phép chỉnh sửa file của một release đã publish. Muốn thay đổi phải tạo release mới.

---

## 10. Update Campaign

Cho phép triển khai bản cập nhật theo:

- Một kiosk.
- Một khách hàng.
- Một cơ sở.
- Một nhóm thiết bị.
- Tất cả thiết bị.

Cấu hình chiến dịch:

- Release.
- Target devices.
- Start time.
- Maintenance window.
- Max concurrent devices.
- Rollout percentage.
- Auto pause threshold.
- Retry count.
- Mandatory or optional.
- Allow rollback.

Không cập nhật khi kiosk đang thực hiện phiên check-in, trừ bản cập nhật khẩn cấp đã được xác nhận.

Update job có trạng thái:

- QUEUED.
- WAITING_ONLINE.
- NOTIFIED.
- DOWNLOADING.
- VERIFYING.
- INSTALLING.
- RESTARTING.
- HEALTH_CHECKING.
- SUCCESS.
- FAILED.
- ROLLED_BACK.
- CANCELLED.
- EXPIRED.

---

## 11. Remote Commands

Hỗ trợ các lệnh:

- SYNC_CONFIGURATION.
- CHECK_PERIPHERALS.
- RESTART_APP.
- RESTART_AGENT.
- RESTART_WINDOWS.
- ENTER_MAINTENANCE.
- EXIT_MAINTENANCE.
- PRINT_TEST.
- CAMERA_SNAPSHOT_TEST.
- PASSPORT_READER_TEST.
- QR_SCANNER_TEST.
- CARD_DISPENSER_TEST.
- CASH_ACCEPTOR_TEST.
- DOWNLOAD_LOGS.
- CLEAR_TEMP_CACHE.
- LOCK_DEVICE.
- UNLOCK_DEVICE.
- INSTALL_UPDATE.
- ROLLBACK_UPDATE.

Mỗi command phải có:

- Unique command ID.
- Device ID.
- Command type.
- Payload.
- Created by.
- Created at.
- Expires at.
- Acknowledged at.
- Started at.
- Completed at.
- Status.
- Result.
- Error code.

Agent phải bảo đảm idempotency, không thực hiện lại một command ID đã hoàn thành.

---

## 12. Trang giao diện bắt buộc

### Dashboard

- KPI cards.
- Online/offline chart.
- Device health chart.
- Version distribution.
- Recent alerts.
- Failed updates.
- Expiring licenses.
- Devices requiring attention.

### Customers

- Customer list.
- Search/filter.
- Create/edit/detail.
- Sites.
- Licenses.
- Devices.
- Subscription status.

### Licenses

- Generate key.
- View status.
- Assign customer.
- Set expiry.
- Set maximum devices.
- Revoke.
- Suspend.
- Reset activation.
- Transfer activation.
- View activation history.

### Devices

- Device list.
- Online/offline filters.
- Customer filter.
- App version filter.
- Alert filter.
- Device detail.
- Peripheral status.
- Metrics.
- Configuration.
- Commands.
- Updates.
- Logs.
- Timeline.

### Configurations

- Configuration templates.
- Configuration version history.
- Compare two versions.
- Deploy.
- Rollback.
- Copy configuration.

### Releases

- Release list.
- Upload release.
- Publish release.
- Release notes.
- Channel.
- Signature/checksum.
- Deployment statistics.

### Update Campaigns

- Create campaign.
- Select targets.
- Follow progress.
- Pause.
- Resume.
- Cancel.
- Retry failed.
- Rollback.

### Alerts

- Active alerts.
- Acknowledged alerts.
- Resolved alerts.
- Severity.
- Alert rules.
- Notification channels.

### Users and Roles

- User list.
- Role list.
- Permission matrix.
- Login history.
- Disable account.
- Reset MFA.

### Audit Logs

- Filter by user.
- Filter by customer.
- Filter by device.
- Filter by action.
- View before/after values.
- Export.

---

## 13. Phân quyền

Tạo RBAC với các role:

- SUPER_ADMIN.
- OPERATIONS_ADMIN.
- SUPPORT_TECHNICIAN.
- RELEASE_MANAGER.
- PARTNER_ADMIN.
- CUSTOMER_ADMIN.
- READ_ONLY.

Mỗi API endpoint phải kiểm tra permission tại backend. Không được chỉ ẩn nút ở frontend.

---

## 14. Bảo mật

Bắt buộc:

- HTTPS.
- Password hashing.
- MFA cho tài khoản quản trị.
- Rate limiting.
- Account lockout.
- Refresh token rotation.
- Device token rotation.
- Secret encryption at rest.
- Signed update packages.
- SHA-256 verification.
- Audit logging.
- CSRF protection nếu dùng cookie.
- Input validation.
- SQL injection protection.
- XSS protection.
- Secure headers.
- File upload validation.
- Malware scanning hoặc quarantine cho update package.
- Không ghi mật khẩu, token, số hộ chiếu hoặc dữ liệu khuôn mặt vào log.

Tạo `SECURITY_THREAT_MODEL.md`.

---

## 15. Database

Phải tạo schema và migration cho:

- users
- roles
- permissions
- user_roles
- customers
- customer_sites
- subscriptions
- licenses
- license_activations
- license_events
- devices
- device_identities
- device_heartbeats
- device_metrics
- device_status_history
- peripheral_devices
- peripheral_configs
- configuration_versions
- configuration_deployments
- app_releases
- release_files
- update_campaigns
- update_targets
- update_jobs
- update_events
- remote_commands
- command_results
- alerts
- alert_rules
- alert_events
- notification_channels
- device_logs
- business_logs
- audit_logs

Tạo ERD bằng Mermaid trong `docs/DATA_MODEL.md`.

---

## 16. API Documentation

Phải tạo OpenAPI/Swagger.

Mỗi API phải có:

- Request schema.
- Response schema.
- Validation.
- Permission.
- Error codes.
- Example request.
- Example response.

Tạo API versioning từ đầu:

```text
/api/v1/...
```

---

## 17. Error Codes

Tạo error code rõ ràng, ví dụ:

- LICENSE_NOT_FOUND.
- LICENSE_EXPIRED.
- LICENSE_REVOKED.
- DEVICE_LIMIT_REACHED.
- DEVICE_NOT_REGISTERED.
- DEVICE_CREDENTIAL_INVALID.
- CONFIGURATION_INVALID.
- CONFIGURATION_APPLY_FAILED.
- UPDATE_PACKAGE_INVALID.
- UPDATE_SIGNATURE_INVALID.
- UPDATE_INSTALL_FAILED.
- COMMAND_EXPIRED.
- PERIPHERAL_OFFLINE.
- PERMISSION_DENIED.

Không chỉ trả về lỗi chung chung 500.

---

## 18. Testing

Phải có:

### Unit tests

- License activation.
- Device limit.
- Token rotation.
- Configuration versioning.
- Command idempotency.
- Update state machine.
- RBAC.

### Integration tests

- Activate device.
- Send heartbeat.
- Deploy configuration.
- Execute remote command.
- Deploy update.
- Update failure and rollback.

### End-to-end tests

- Admin creates customer.
- Admin generates license.
- Device activates.
- Device appears online.
- Admin configures camera.
- Device receives configuration.
- Admin deploys update.
- Device reports success.

### Security tests

- Brute-force activation key.
- Reused token.
- Expired command.
- Unauthorized role.
- Invalid package.
- Modified checksum.
- Duplicate command.

---

## 19. Tài liệu phải tạo trước khi code

Tạo thư mục:

```text
docs/
├── PRODUCT_REQUIREMENTS.md
├── SYSTEM_ARCHITECTURE.md
├── DATA_MODEL.md
├── API_SPECIFICATION.md
├── DEVICE_ACTIVATION_FLOW.md
├── CONFIG_SYNC_FLOW.md
├── UPDATE_FLOW.md
├── REMOTE_COMMAND_FLOW.md
├── SECURITY_THREAT_MODEL.md
├── PERMISSION_MATRIX.md
├── ERROR_CODES.md
├── DEPLOYMENT_GUIDE.md
├── WINDOWS_AGENT_SPEC.md
├── UI_SPEC.md
└── ACCEPTANCE_CRITERIA.md
```

Ngoài ra tạo:

```text
CLAUDE.md
AGENTS.md
README.md
ASSUMPTIONS.md
DECISIONS.md
PROGRESS.md
HANDOFF.md
```

Không bắt đầu code trước khi hoàn thành:

- PRD.
- Architecture.
- Data model.
- API contract.
- UI sitemap.
- Acceptance criteria.

---

## 20. Cấu trúc source code đề xuất

```text
kiosk-management/
├── apps/
│   ├── admin-web/
│   ├── api-server/
│   └── windows-agent-simulator/
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── api-client/
│   ├── ui-components/
│   └── device-protocol/
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── database/
│   └── scripts/
├── docs/
├── tests/
├── .github/
│   └── workflows/
├── docker-compose.yml
├── CLAUDE.md
├── AGENTS.md
├── README.md
├── ASSUMPTIONS.md
├── DECISIONS.md
├── PROGRESS.md
└── HANDOFF.md
```

---

## 21. Quy tắc thực hiện

1. Không bịa SDK của thiết bị.
2. Không giả định tất cả thiết bị đều cùng giao thức.
3. Tách interface adapter cho từng hãng và model.
4. Không lưu mật khẩu thiết bị dạng plain text.
5. Không dùng activation key làm token lâu dài.
6. Không khóa App chỉ vì mất internet tạm thời.
7. Không cập nhật App trong lúc khách đang check-in.
8. Không xóa hoặc ghi đè release đã phát hành.
9. Không thực hiện command trùng.
10. Không báo cập nhật thành công nếu chưa qua health check.
11. Mọi thay đổi cấu hình phải có phiên bản và rollback.
12. Mọi thao tác quản trị phải có audit log.
13. UI không được tự ý thêm nghiệp vụ ngoài tài liệu.
14. Mọi trạng thái phải hiển thị bằng chữ, không chỉ dùng màu.
15. Code phải có type safety, validation và error handling.
16. Phải có dữ liệu demo nhưng tách biệt hoàn toàn với production.

---

## 22. Thứ tự triển khai

### Step 1

Viết toàn bộ tài liệu yêu cầu và kiến trúc.

### Step 2

Thiết kế database, migrations và seed data.

### Step 3

Xây dựng authentication, RBAC và audit log.

### Step 4

Xây dựng customer, site và license management.

### Step 5

Xây dựng device activation và heartbeat.

### Step 6

Xây dựng giao diện danh sách và chi tiết kiosk.

### Step 7

Xây dựng peripheral configuration và configuration versioning.

### Step 8

Xây dựng realtime command gateway.

### Step 9

Xây dựng release và update campaign.

### Step 10

Xây dựng cảnh báo, log và báo cáo.

### Step 11

Xây Windows Agent Simulator để kiểm thử trước khi kết nối App thật.

### Step 12

Chạy unit test, integration test và end-to-end test.

### Step 13

Viết deployment guide và acceptance report.

Sau mỗi step phải cập nhật:

- `PROGRESS.md`
- `DECISIONS.md`
- `HANDOFF.md`

---

## 23. Tiêu chí nghiệm thu MVP

MVP chỉ được coi là hoàn thành khi chứng minh được luồng sau:

1. Admin tạo khách hàng.
2. Admin tạo license.
3. Máy Windows A nhập key và kích hoạt thành công.
4. Máy Windows B nhập cùng key và bị từ chối.
5. Máy A xuất hiện online trên dashboard.
6. Web hiển thị đúng phiên bản App của máy A.
7. Admin khai báo camera, máy in và máy phát hành thẻ.
8. Máy A nhận được cấu hình.
9. Máy A phản hồi trạng thái áp dụng cấu hình.
10. Web hiển thị desired và reported configuration.
11. Admin upload một release mới.
12. Admin gửi lệnh cập nhật cho máy A.
13. Máy A tải file và kiểm tra checksum.
14. Máy A báo tiến trình cập nhật.
15. Máy A khởi động phiên bản mới.
16. Web hiển thị update success.
17. Nếu health check thất bại, máy A tự rollback.
18. Mọi thao tác đều xuất hiện trong audit log.
19. Khi mất internet, máy A vẫn chạy với cấu hình gần nhất.
20. Khi có internet lại, máy A tự đồng bộ trạng thái và lệnh đang chờ.

Không được tuyên bố hoàn thành nếu chưa có bằng chứng test cho đủ 20 tiêu chí trên.