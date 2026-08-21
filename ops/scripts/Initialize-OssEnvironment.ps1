param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $root "ops\.env"

if ((Test-Path $envFile) -and -not $Force) {
    throw "Đã có $envFile. Không ghi đè bí mật đang dùng; thêm -Force nếu thật sự cần tạo mới."
}

function New-Base64Secret {
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes)
}

$content = @"
WEBADMIN_JWT_SECRET=$(New-Base64Secret)
PROPERTY_JWT_SECRET=$(New-Base64Secret)
EDGE_JWT_SECRET=$(New-Base64Secret)
SETTINGS_ENCRYPTION_KEY=$(New-Base64Secret)
INTERNAL_SERVICE_KEY=$(New-Base64Secret)
SERVICE_API_KEY=$(New-Base64Secret)

# Tài khoản fixture chỉ dành cho môi trường test Docker.
CLOUD_SYNC_USERNAME=reception
CLOUD_SYNC_PASSWORD=Anio2026@

TENANT_ID=00000000-0000-0000-0000-00000000d001
PROPERTY_ID=00000000-0000-0000-0000-00000000d101
EDGE_NODE_ID=edge-node-anio-riverside-01
EDGE_WEB_ORIGIN=*
"@

[System.IO.File]::WriteAllText($envFile, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Đã tạo $envFile với các bí mật cục bộ mới." -ForegroundColor Green
Write-Host "Không commit hoặc gửi file này; file đã nằm trong .gitignore." -ForegroundColor Yellow
