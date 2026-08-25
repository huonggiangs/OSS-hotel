# Test-OssLan.ps1 — kiểm tra các giao diện người dùng qua địa chỉ LAN của máy chủ.
# Lệnh chạy trên máy OSS; một máy/điện thoại khác cần mở chính các URL in ra để
# xác nhận Windows Firewall và Wi-Fi không chặn kết nối giữa hai thiết bị.

$ErrorActionPreference = "Stop"
$lanIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object {
        $_.AddressState -eq "Preferred" -and
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.InterfaceAlias -notmatch "WSL|Docker|vEthernet"
    } |
    Select-Object -ExpandProperty IPAddress -Unique

if (-not $lanIps) { throw "Không tìm thấy IPv4 LAN. Kiểm tra Wi-Fi/Ethernet rồi chạy lại." }

$services = @(
    @{ Name = "HQ Console"; Port = 3000 },
    @{ Name = "Property Web (PMS)"; Port = 3100 },
    @{ Name = "Edge Node"; Port = 4200 }
)

foreach ($ip in $lanIps) {
    Write-Host "`n=== LAN IP: $ip ===" -ForegroundColor Cyan
    foreach ($service in $services) {
        $url = "http://${ip}:$($service.Port)"
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 8
            Write-Host "OK   $($service.Name): $url ($($response.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Host "FAIL $($service.Name): $url — $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`nTừ máy khác cùng Wi-Fi, mở ba URL OK ở trên và thử đăng nhập. Nếu không mở được," -ForegroundColor Yellow
Write-Host "hãy kiểm tra cả hai thiết bị đang cùng mạng Private và cho phép Docker Desktop qua Windows Firewall." -ForegroundColor Yellow
