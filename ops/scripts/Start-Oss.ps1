$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $root "ops\.env"

if (-not (Test-Path $envFile)) {
    throw "Thiếu $envFile. Chạy .\ops\scripts\Initialize-OssEnvironment.ps1 trước."
}

& docker desktop start --timeout 120
if ($LASTEXITCODE -ne 0) { throw "Không thể khởi động Docker Desktop." }

function Start-ComposeProject {
    param([string]$Project, [string]$ComposeFile)
    Write-Host "Khởi động $Project..." -ForegroundColor Cyan
    & docker compose --project-name $Project --env-file $envFile -f $ComposeFile up --detach --build --remove-orphans
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose thất bại ở project $Project." }
}

Start-ComposeProject -Project "oss-webadmin" -ComposeFile (Join-Path $root "webadmin\docker-compose.yml")
Start-ComposeProject -Project "oss-property" -ComposeFile (Join-Path $root "smart-hotel-os\property-web\docker-compose.yml")
Start-ComposeProject -Project "oss-services" -ComposeFile (Join-Path $root "smart-hotel-os\services\docker-compose.yml")
Start-ComposeProject -Project "oss-edge" -ComposeFile (Join-Path $root "smart-hotel-os\apps\edge-node\docker-compose.yml")

$healthUrls = @(
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100",
    "http://127.0.0.1:4000/health",
    "http://127.0.0.1:4100/health",
    "http://127.0.0.1:4101/health",
    "http://127.0.0.1:4102/health",
    "http://127.0.0.1:4103/health",
    "http://127.0.0.1:4104/health",
    "http://127.0.0.1:4200/health"
)

$deadline = (Get-Date).AddMinutes(4)
foreach ($url in $healthUrls) {
    do {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { break }
        } catch { }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    if ((Get-Date) -ge $deadline) { throw "Quá thời gian chờ healthcheck: $url" }
    Write-Host "Sẵn sàng: $url" -ForegroundColor Green
}

Write-Host "Môi trường OSS đang chạy nền bằng Docker. Có thể đóng Codex/PowerShell." -ForegroundColor Green
