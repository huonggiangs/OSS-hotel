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

$hostName = [System.Net.Dns]::GetHostName()
$profiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4Connectivity -ne "Disconnected" }
$ossRules = Get-NetFirewallRule -DisplayName "OSS LAN - *" -ErrorAction SilentlyContinue

Write-Host "=== URL theo tên máy (không đổi khi DHCP đổi IP) ===" -ForegroundColor Cyan
foreach ($service in $services) {
    Write-Host "$($service.Name): http://${hostName}:$($service.Port)"
}

if ($profiles) {
    $profiles | ForEach-Object {
        Write-Host "Mạng: $($_.InterfaceAlias) / $($_.Name) — $($_.NetworkCategory)" -ForegroundColor $(if ($_.NetworkCategory -eq "Public") { "Yellow" } else { "Green" })
    }
}

if (-not $ossRules) {
    Write-Host "CHƯA CÓ rule Windows Firewall cho OSS LAN. Mở PowerShell Administrator và chạy .\ops\scripts\Enable-OssLanAccess.ps1" -ForegroundColor Yellow
}

foreach ($ip in $lanIps) {
    Write-Host "`n=== LAN IP: $ip ===" -ForegroundColor Cyan
    foreach ($service in $services) {
        $url = "http://${ip}:$($service.Port)"
        try {
            # HQ trả 307 về /dashboard khi chưa đăng nhập; đó vẫn là dấu hiệu
            # TCP/HTTP hoạt động. Không để Invoke-WebRequest coi redirect là lỗi.
            $handler = [System.Net.Http.HttpClientHandler]::new()
            $handler.AllowAutoRedirect = $false
            $client = [System.Net.Http.HttpClient]::new($handler)
            try {
                $response = $client.GetAsync($url).GetAwaiter().GetResult()
                $status = [int]$response.StatusCode
            } finally {
                $client.Dispose()
                $handler.Dispose()
            }
            if ($status -ge 200 -and $status -lt 400) {
                Write-Host "OK   $($service.Name): $url ($status)" -ForegroundColor Green
            } else {
                Write-Host "FAIL $($service.Name): $url (HTTP $status)" -ForegroundColor Red
            }
        } catch {
            Write-Host "FAIL $($service.Name): $url — $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Tự phát hiện PMS cho mobile ===" -ForegroundColor Cyan
$udp = [System.Net.Sockets.UdpClient]::new()
try {
    $udp.EnableBroadcast = $true
    $udp.Client.ReceiveTimeout = 4000
    $nonce = [guid]::NewGuid().ToString()
    $payload = [Text.Encoding]::UTF8.GetBytes((@{ type = "ANIO_DISCOVER_V1"; nonce = $nonce } | ConvertTo-Json -Compress))
    $target = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Broadcast, 53535)
    [void]$udp.Send($payload, $payload.Length, $target)
    $remote = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Any, 0)
    $responseBytes = $udp.Receive([ref]$remote)
    $response = [Text.Encoding]::UTF8.GetString($responseBytes) | ConvertFrom-Json
    if ($response.service -eq "ANIO_PMS" -and $response.nonce -eq $nonce) {
        Write-Host "OK   Mobile discovery: $($remote.Address):$($response.port)$($response.apiPath)" -ForegroundColor Green
    } else {
        Write-Host "FAIL Mobile discovery: phản hồi không hợp lệ." -ForegroundColor Red
    }
} catch {
    Write-Host "FAIL Mobile discovery UDP 53535 — kiểm tra Docker và rule 'OSS LAN - PMS Discovery (53535)'." -ForegroundColor Red
} finally {
    $udp.Dispose()
}

Write-Host "`nTrên trình duyệt máy khác, có thể dùng URL theo tên máy hoặc IP ở trên." -ForegroundColor Yellow
Write-Host "Ứng dụng ANIO tự tìm IP PMS qua UDP 53535; người dùng không nhập địa chỉ máy chủ." -ForegroundColor Yellow
