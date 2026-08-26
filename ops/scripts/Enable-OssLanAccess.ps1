#requires -RunAsAdministrator
<#
.SYNOPSIS
Cho phép các giao diện OSS truy cập từ thiết bị cùng mạng LAN.

.DESCRIPTION
Tạo các rule Windows Firewall chỉ cho TCP 3000, 3100 và 4200 từ LocalSubnet.
Không mở API Docker hoặc các cổng này cho Internet. Chạy một lần sau khi clone
hoặc khi Windows Firewall đã được reset.
#>
[CmdletBinding()]
param(
    [switch]$SetCurrentNetworkPrivate
)

$ErrorActionPreference = "Stop"
$services = @(
    @{ Name = "HQ Console"; Port = 3000 },
    @{ Name = "PMS"; Port = 3100 },
    @{ Name = "Edge Node"; Port = 4200 }
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
        Protocol = "TCP"
        LocalPort = $service.Port
        RemoteAddress = "LocalSubnet"
        Profile = "Any"
    }
    New-NetFirewallRule @ruleParameters | Out-Null

    Write-Host "Đã cho phép LAN: $($service.Name) (TCP $($service.Port), LocalSubnet)" -ForegroundColor Green
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
foreach ($service in $services) {
    Write-Host "  $($service.Name): http://${hostName}:$($service.Port)"
}
Write-Host "Nếu điện thoại/máy khác không phân giải được tên máy, cấu hình DNS nội bộ trên router hoặc dùng IP do Test-OssLan.ps1 in ra." -ForegroundColor Yellow
