$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $root "ops\.env"

# Dừng watcher trước để nó không lập tức build và khởi động lại các container
# vừa được yêu cầu dừng. Chỉ chọn đúng PowerShell đang chạy script workspace.
$watchers = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "powershell.exe" -and $_.CommandLine -like "*Watch-Oss.ps1*" }
foreach ($watcher in $watchers) {
    Stop-Process -Id $watcher.ProcessId -Force
}

function Stop-ComposeProject {
    param([string]$Project, [string]$ComposeFile)
    & docker compose --project-name $Project --env-file $envFile -f $ComposeFile down
    if ($LASTEXITCODE -ne 0) { throw "Không thể dừng project $Project." }
}

Stop-ComposeProject -Project "oss-edge" -ComposeFile (Join-Path $root "smart-hotel-os\apps\edge-node\docker-compose.yml")
Stop-ComposeProject -Project "oss-services" -ComposeFile (Join-Path $root "smart-hotel-os\services\docker-compose.yml")
Stop-ComposeProject -Project "oss-property" -ComposeFile (Join-Path $root "smart-hotel-os\property-web\docker-compose.yml")
Stop-ComposeProject -Project "oss-webadmin" -ComposeFile (Join-Path $root "webadmin\docker-compose.yml")

Write-Host "Đã dừng môi trường OSS và watcher. Docker volumes được giữ nguyên." -ForegroundColor Yellow
