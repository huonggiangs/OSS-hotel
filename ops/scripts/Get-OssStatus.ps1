$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $root "ops\.env"
$docker = & (Join-Path $PSScriptRoot "Resolve-OssDocker.ps1")

$watchers = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "powershell.exe" -and $_.CommandLine -like "*Watch-Oss.ps1*" }
Write-Host "=== Auto-update watcher ===" -ForegroundColor Cyan
if ($watchers) {
    $watchers | Select-Object ProcessId, CreationDate, CommandLine | Format-Table -AutoSize
} else {
    Write-Host "CHƯA CHẠY — chạy .\ops\scripts\Start-Oss.ps1 để bật lại." -ForegroundColor Yellow
}

foreach ($project in @(
    @{ Name = "oss-webadmin"; File = "webadmin\docker-compose.yml" },
    @{ Name = "oss-property"; File = "smart-hotel-os\property-web\docker-compose.yml" },
    @{ Name = "oss-services"; File = "smart-hotel-os\services\docker-compose.yml" },
    @{ Name = "oss-edge"; File = "smart-hotel-os\apps\edge-node\docker-compose.yml" }
)) {
    Write-Host "`n=== $($project.Name) ===" -ForegroundColor Cyan
    & $docker compose --project-name $project.Name --env-file $envFile -f (Join-Path $root $project.File) ps
}

Write-Host "`n=== Health endpoints ===" -ForegroundColor Cyan
foreach ($url in @("http://127.0.0.1:4000/health", "http://127.0.0.1:4100/health", "http://127.0.0.1:4101/health", "http://127.0.0.1:4102/health", "http://127.0.0.1:4103/health", "http://127.0.0.1:4104/health", "http://127.0.0.1:4200/health")) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
        Write-Host "OK  $url ($($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "FAIL $url" -ForegroundColor Red
    }
}
