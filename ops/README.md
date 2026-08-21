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

## URL cục bộ

| Thành phần | URL |
|---|---|
| Webadmin | http://localhost:3000 |
| Property Web | http://localhost:3100 |
| Edge Node | http://localhost:4200 |
| Microservice APIs | http://localhost:4101 đến http://localhost:4104 |

PostgreSQL chỉ bind `127.0.0.1` tại các cổng 5432–5434; không bị phơi ra mạng
LAN. Edge Node vẫn bind cổng 4200 ra LAN để đúng mô hình vận hành tại cơ sở.

## Bảo trì an toàn

- Xem log: `docker compose --project-name oss-property --env-file ops/.env -f smart-hotel-os/property-web/docker-compose.yml logs --tail 100 api`.
- Không chạy `docker compose down -v` nếu không chủ động muốn xóa toàn bộ dữ liệu test trong volume.
- Docker log dùng driver `local`, tối đa 3 file x 10 MB cho mỗi service.
- Mỗi khi thay đổi Dockerfile/compose, chạy lại `Start-Oss.ps1`; lệnh sẽ build lại phần cần thiết.
