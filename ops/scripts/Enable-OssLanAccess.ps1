#requires -RunAsAdministrator
<#
.SYNOPSIS
Cho phép các giao diện OSS truy cập từ thiết bị cùng mạng LAN.

.DESCRIPTION
Tạo các rule Windows Firewall cho TCP 3000, 3100, 4200 và UDP discovery 53535
từ LocalSubnet.
Không mở API Docker hoặc các cổng này cho Internet. Chạy một lần sau khi clone
hoặc khi Windows Firewall đã được reset.
#>
[CmdletBinding()]
param(
    [switch]$SetCurrentNetworkPrivate
)

$ErrorActionPreference = "Stop"
$services = @(
    @{ Name = "HQ Console"; Port = 3000; Protocol = "TCP" },
    @{ Name = "PMS"; Port = 3100; Protocol = "TCP" },
    @{ Name = "Edge Node"; Port = 4200; Protocol = "TCP" },
    @{ Name = "PMS Discovery"; Port = 53535; Protocol = "UDP" }
)

foreach ($service in $services) {
    $displayName = "OSS LAN - $($service.Name) ($($service.Port))"

    # Recreate only rules owned by OSS so the command remains idempotent and
    # does not alter any unrelated Windows Firewall configuration.
    Get-NetFirewallRule -DisplayName $displayName -ErrorAction SilentlyContinue |
        Remove-NetFirewallRule -ErrorAction Stop

    $ruleParameters = @{
        DisplayName = $displayName
        Description = "Allow $($service.Name) from the current local subnet only."
        Direction = "Inbound"
        Action = "Allow"
        Protocol = $service.Protocol
        LocalPort = $service.Port
        RemoteAddress = "LocalSubnet"
        Profile = "Any"
    }
    New-NetFirewallRule @ruleParameters | Out-Null

    Write-Host "Đã cho phép LAN: $($service.Name) ($($service.Protocol) $($service.Port), LocalSubnet)" -ForegroundColor Green
}

if ($SetCurrentNetworkPrivate) {
    Get-NetConnectionProfile |
        Where-Object {
            $_.IPv4Connectivity -ne "Disconnected" -and
            $_.NetworkCategory -ne "DomainAuthenticated" -and
            $_.NetworkCategory -ne "Private"
        } |
        ForEach-Object {
            Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private
            Write-Host "Đã đặt '$($_.Name)' thành mạng Private." -ForegroundColor Green
        }
} else {
    Write-Host "Giữ nguyên loại mạng hiện tại. Rule LocalSubnet vẫn hoạt động cả khi Wi-Fi là Public." -ForegroundColor Yellow
}

$hostName = [System.Net.Dns]::GetHostName()
Write-Host "`nDùng URL tên máy (không đổi khi DHCP đổi IP):" -ForegroundColor Cyan
foreach ($service in $services | Where-Object { $_.Protocol -eq "TCP" }) {
    Write-Host "  $($service.Name): http://${hostName}:$($service.Port)"
}
Write-Host "App ANIO tự tìm PMS qua UDP 53535 nên điện thoại không cần phân giải tên máy hoặc nhập IP." -ForegroundColor Yellow
