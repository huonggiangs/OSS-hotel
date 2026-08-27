# Backup-Oss.ps1 — backup có thể khôi phục trước migration/deploy quan trọng.
# Tạo pg_dump custom cho mọi DB, archive dữ liệu Edge Node và Git bundle để có
# thể khôi phục cả dữ liệu lẫn source hiện tại. Không in secret vào màn hình/log.

param(
    [string]$Label = "manual"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
# Giữ đúng một đường dẫn Docker CLI; tránh mảng output bị PowerShell ghép lại
# thành một command name khi script được watcher gọi nền.
$dockerValues = @(& (Join-Path $PSScriptRoot "Resolve-OssDocker.ps1") | Where-Object { $_ })
$docker = [string]$dockerValues[0]
if (-not $docker -or -not (Test-Path -LiteralPath $docker)) {
    throw "Không xác định được Docker CLI hợp lệ để backup."
}
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safeLabel = ($Label -replace "[^a-zA-Z0-9_-]", "-").Trim("-")
if (-not $safeLabel) { $safeLabel = "manual" }
$backupDir = Join-Path $root "backups\oss_${stamp}_${safeLabel}"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$backups = @(
    @{ Container = "oss-webadmin-postgres-1"; User = "hq_console"; Database = "hq_console"; File = "webadmin.dump" },
    @{ Container = "oss-property-postgres-1"; User = "property_web"; Database = "property_web"; File = "property_web.dump" },
    @{ Container = "oss-services-postgres-1"; User = "channel_manager"; Database = "channel_manager"; File = "channel_manager.dump" },
    @{ Container = "oss-services-postgres-1"; User = "ai_pricing"; Database = "ai_pricing"; File = "ai_pricing.dump" },
    @{ Container = "oss-services-postgres-1"; User = "iot_service"; Database = "iot_service"; File = "iot_service.dump" },
    @{ Container = "oss-services-postgres-1"; User = "crm_service"; Database = "crm_service"; File = "crm_service.dump" }
)

try {
    foreach ($backup in $backups) {
        $containerPath = "/tmp/$($backup.File)"
        & $docker exec $backup.Container sh -c "rm -f $containerPath && pg_dump -U $($backup.User) -Fc -f $containerPath $($backup.Database)"
        if ($LASTEXITCODE -ne 0) { throw "Không backup được database $($backup.Database)." }
        & $docker cp "$($backup.Container):$containerPath" (Join-Path $backupDir $backup.File)
        if ($LASTEXITCODE -ne 0) { throw "Không copy được database backup $($backup.Database)." }
        & $docker exec $backup.Container rm -f $containerPath
    }

    & $docker run --rm -v oss-edge_node_data:/from -v "${backupDir}:/to" alpine:3.20 sh -c "cd /from && tar -czf /to/edge_node_data.tar.gz ."
    if ($LASTEXITCODE -ne 0) { throw "Không backup được Edge Node volume." }

    & git -C $root bundle create (Join-Path $backupDir "oss-source.bundle") --all
    if ($LASTEXITCODE -ne 0) { throw "Không tạo được Git bundle." }

    Get-ChildItem -LiteralPath $backupDir -File |
        Get-FileHash -Algorithm SHA256 |
        ForEach-Object { "{0}  {1}" -f $_.Hash, $_.Path.Substring($backupDir.Length + 1) } |
        Set-Content -LiteralPath (Join-Path $backupDir "SHA256SUMS.txt") -Encoding utf8

    Write-Host "Backup hoàn tất: $backupDir" -ForegroundColor Green
} catch {
    Write-Host "Backup chưa hoàn tất; kiểm tra thư mục: $backupDir" -ForegroundColor Red
    throw
}
