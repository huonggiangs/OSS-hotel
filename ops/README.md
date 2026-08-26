# Vận hành OSS bằng Docker Desktop

## Mục tiêu

Các container chạy nền với `restart: unless-stopped`; vì vậy không phụ thuộc vào
Codex, PowerShell hay terminal đang mở. Khi Docker Desktop khởi động lại, các
container đã bật sẽ được Docker tự khởi động lại.

Máy này có thêm `OSS-Start-Docker-Desktop.cmd` trong thư mục Windows Startup để
mở Docker Desktop sau khi đăng nhập. Windows từ chối tạo Scheduled Task từ tài
khoản hiện tại, nên Startup folder là cơ chế không cần quyền quản trị.

## Thiết lập một lần

Mở PowerShell tại `D:\hotel\OSS` rồi chạy:

```powershell
.\ops\scripts\Initialize-OssEnvironment.ps1
```

Lệnh tạo `ops/.env` với các JWT, API key và khóa mã hóa riêng của máy này. File
này bị Git bỏ qua; không commit hoặc chia sẻ nó. `CLOUD_SYNC_*` là tài khoản
fixture test để Edge đồng bộ với Property demo.

## Các lệnh dùng hằng ngày

```powershell
.\ops\scripts\Start-Oss.ps1
.\ops\scripts\Get-OssStatus.ps1
.\ops\scripts\Stop-Oss.ps1
```

`Start-Oss.ps1` tự bật Docker Desktop nếu cần, build image, chạy detached và
đợi healthcheck. Có thể đóng Codex ngay sau khi lệnh thành công.

Trước migration/deploy lớn, chạy `./ops/scripts/Backup-Oss.ps1`. Backup gồm mọi
database, Edge Node volume, Git bundle và SHA-256 checksum trong `backups/`.

## URL Docker/LAN và URL dev

| Thành phần | URL |
|---|---|
| Webadmin | http://localhost:3000 |
| Property Web | http://localhost:3100 |
| Edge Node | http://localhost:4200 |
| Microservice APIs | http://localhost:4101 đến http://localhost:4104 |

Trên mạng LAN, ưu tiên dùng tên máy OSS: `http://<TEN-MAY-OSS>:3000` (HQ Console),
`http://<TEN-MAY-OSS>:3100` (PMS) và `http://<TEN-MAY-OSS>:4200` (Edge Node).
Tên máy không đổi khi DHCP đổi IP sau khi chuyển Wi-Fi/router; chạy
`./ops/scripts/Test-OssLan.ps1` để in tên và IP hiện tại. Web/API đã dùng proxy
cùng origin nên người dùng ở máy khác không còn gọi nhầm `localhost` của chính họ.

Thiết lập Windows Firewall một lần bằng **PowerShell chạy Administrator**:

```powershell
.\ops\scripts\Enable-OssLanAccess.ps1
```

Script chỉ cho phép ba cổng giao diện từ `LocalSubnet`, kể cả khi Windows nhận
Wi-Fi mới là mạng `Public`; API Docker vẫn chỉ bind loopback. Không nên tự đổi
mạng công cộng sang `Private`. Khi biết chắc mạng đang tin cậy, có thể dùng
`Enable-OssLanAccess.ps1 -SetCurrentNetworkPrivate`.

Một số router hoặc điện thoại không phân giải tên Windows/mDNS. Trong trường hợp
đó hãy cấu hình một bản ghi DNS nội bộ (ví dụ `oss-hotel`) và DHCP reservation
trên từng router, hoặc dùng URL IP mà `Test-OssLan.ps1` in ra. Không thể giữ một
IPv4 duy nhất khi chuyển giữa các subnet khác nhau; DNS nội bộ hoặc một mạng
overlay là cách truy cập ổn định giữa nhiều mạng.

Chế độ dev không Docker luôn dùng dải cổng riêng: HQ `13000/14000`, PMS
`13100/14100`, Edge `14200`; chạy `start-all.ps1` không còn tranh cổng Docker.
PostgreSQL và API Docker chỉ bind loopback; không bị phơi trực tiếp ra mạng LAN.

## Bảo trì an toàn

- Xem log: `docker compose --project-name oss-property --env-file ops/.env -f smart-hotel-os/property-web/docker-compose.yml logs --tail 100 api`.
- Không chạy `docker compose down -v` nếu không chủ động muốn xóa toàn bộ dữ liệu test trong volume.
- Docker log dùng driver `local`, tối đa 3 file x 10 MB cho mỗi service.
- `Start-Oss.ps1` tự bật `Watch-Oss.ps1`: thay đổi mã nguồn hợp lệ từ Claude,
  Codex hay Cursor trong đúng workspace sẽ typecheck, build, migrate và healthcheck
  tự động. Xem log ở `ops/.runtime/auto-update.log`.
- Watcher giữ image khỏe mạnh khi typecheck/build thất bại. Một lượt thay image của
  môi trường một-replica vẫn có ngắt rất ngắn; xem checklist blue-green tại
  `ops/PUBLIC_DEPLOYMENT_CHECKLIST.md` nếu cần zero-downtime tuyệt đối.
- Nếu watcher nhận thay đổi SQL trong `database/migrations/`, nó tạo backup tự
  động trước khi chạy migration. Đừng sửa migration đã áp dụng; hãy thêm file có
  số thứ tự mới theo quy ước hiện có.
