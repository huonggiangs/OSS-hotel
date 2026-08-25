# Watch-Oss.ps1 — cập nhật Docker tự động khi source trong workspace thay đổi.
#
# Script này chỉ deploy sau khi typecheck thành công. Khi code đang được Claude,
# Codex hay Cursor lưu dở dang, image khỏe mạnh trước đó vẫn được giữ nguyên.
# Các file tài liệu/cache bị bỏ qua. Mỗi project được debounce 8 giây để nhiều
# lần save của cùng một tính năng chỉ tạo một lượt build/migrate.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $root "ops\.env"
$runtimeDir = Join-Path $root "ops\.runtime"
$logFile = Join-Path $runtimeDir "auto-update.log"
$backupScript = Join-Path $root "ops\scripts\Backup-Oss.ps1"

if (-not (Test-Path $envFile)) {
    throw "Thiếu $envFile. Chạy Initialize-OssEnvironment.ps1 trước."
}
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$projects = @(
    @{
        Name = "oss-webadmin"
        Compose = "webadmin\docker-compose.yml"
        Source = "webadmin"
        TypecheckPaths = @("webadmin\apps\api", "webadmin\apps\web")
    },
    @{
        Name = "oss-property"
        Compose = "smart-hotel-os\property-web\docker-compose.yml"
        Source = "smart-hotel-os\property-web"
        TypecheckPaths = @("smart-hotel-os\property-web\apps\api", "smart-hotel-os\property-web\apps\web")
    },
    @{
        Name = "oss-services"
        Compose = "smart-hotel-os\services\docker-compose.yml"
        Source = "smart-hotel-os\services"
        TypecheckPaths = @(
            "smart-hotel-os\services\channel-manager-service",
            "smart-hotel-os\services\ai-pricing-service",
            "smart-hotel-os\services\iot-service",
            "smart-hotel-os\services\crm-service"
        )
    },
    @{
        Name = "oss-edge"
        Compose = "smart-hotel-os\apps\edge-node\docker-compose.yml"
        Source = "smart-hotel-os\apps\edge-node"
        TypecheckPaths = @("smart-hotel-os\apps\edge-node")
    }
)

function Write-WatchLog {
    param([string]$Message)
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $Message"
    Add-Content -LiteralPath $logFile -Value $line
    Write-Output $line
}

function Test-DeployablePath {
    param([string]$Path)
    $normalized = $Path.Replace('/', '\\')
    if ($normalized -match '\\(node_modules|\.next|dist|\.data|\.git|backups|ops\\.runtime)\\') { return $false }
    $name = [System.IO.Path]::GetFileName($normalized)
    if ($name -in @("Dockerfile", "package.json", "package-lock.json")) { return $true }
    return [System.IO.Path]::GetExtension($name).ToLowerInvariant() -in @(
        ".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".sql", ".json", ".yml", ".yaml", ".html", ".svg", ".png", ".jpg", ".jpeg", ".webp"
    )
}

function Invoke-ProjectTypecheck {
    param($Project)
    foreach ($relativePath in $Project.TypecheckPaths) {
        $packagePath = Join-Path $root $relativePath
        Push-Location $packagePath
        try {
            & npm run typecheck --silent
            if ($LASTEXITCODE -ne 0) {
                throw "Typecheck thất bại tại $relativePath (exit $LASTEXITCODE)."
            }
        } finally {
            Pop-Location
        }
    }
}

function Invoke-ProjectUpdate {
    param($Project, [bool]$RequiresBackup = $false)
    try {
        Write-WatchLog "[$($Project.Name)] source changed; typecheck starting."
        Invoke-ProjectTypecheck $Project
        if ($RequiresBackup) {
            Write-WatchLog "[$($Project.Name)] migration changed; creating backup before deploy."
            & $backupScript -Label "before-$($Project.Name)"
            if ($LASTEXITCODE -ne 0) { throw "Backup trước migration thất bại." }
        }
        $env:OSS_VERSION = (& git -C $root rev-parse --short HEAD).Trim()
        Write-WatchLog "[$($Project.Name)] typecheck passed; building version $env:OSS_VERSION."
        & docker compose --project-name $Project.Name --env-file $envFile -f (Join-Path $root $Project.Compose) up --detach --build --remove-orphans --wait --wait-timeout 240
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Compose thất bại (exit $LASTEXITCODE)."
        }
        Write-WatchLog "[$($Project.Name)] update complete; healthcheck passed."
    } catch {
        Write-WatchLog "[$($Project.Name)] update skipped: $($_.Exception.Message)"
    }
}

$subscriptions = @()
try {
    foreach ($project in $projects) {
        $watcher = [System.IO.FileSystemWatcher]::new((Join-Path $root $project.Source), "*")
        $watcher.IncludeSubdirectories = $true
        $watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, DirectoryName, Size'
        $watcher.EnableRaisingEvents = $true
        foreach ($eventName in @("Changed", "Created", "Deleted", "Renamed")) {
            $subscriptions += Register-ObjectEvent -InputObject $watcher -EventName $eventName -MessageData $project.Name
        }
    }

    # Thay đổi secret/cấu hình vận hành cần restart toàn bộ stack, nhưng chính
    # file .env không bị Git theo dõi và không bao giờ được ghi vào log.
    $envWatcher = [System.IO.FileSystemWatcher]::new((Join-Path $root "ops"), ".env")
    $envWatcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, Size'
    $envWatcher.EnableRaisingEvents = $true
    foreach ($eventName in @("Changed", "Created", "Renamed")) {
        $subscriptions += Register-ObjectEvent -InputObject $envWatcher -EventName $eventName -MessageData "all"
    }

    Write-WatchLog "Watcher ready for $($projects.Count) Docker projects."
    $pending = @{}
    while ($true) {
        $received = Wait-Event -Timeout 2
        $events = @()
        if ($received) { $events += $received }
        $events += @(Get-Event)

        foreach ($event in $events) {
            $target = [string]$event.MessageData
            $fullPath = [string]$event.SourceEventArgs.FullPath
            Remove-Event -EventIdentifier $event.EventIdentifier -ErrorAction SilentlyContinue
            if ($target -eq "all" -or (Test-DeployablePath $fullPath)) {
                $isMigration = $fullPath.Replace('/', '\\') -match '\\database\\migrations\\.+\.sql$'
                if ($target -eq "all") {
                    foreach ($project in $projects) {
                        $pending[$project.Name] = [PSCustomObject]@{ LastEvent = Get-Date; RequiresBackup = $false }
                    }
                } else {
                    if ($pending.ContainsKey($target)) {
                        $pending[$target].LastEvent = Get-Date
                        $pending[$target].RequiresBackup = $pending[$target].RequiresBackup -or $isMigration
                    } else {
                        $pending[$target] = [PSCustomObject]@{ LastEvent = Get-Date; RequiresBackup = $isMigration }
                    }
                }
            }
        }

        $now = Get-Date
        foreach ($project in @($projects | Where-Object { $pending.ContainsKey($_.Name) })) {
            $pendingUpdate = $pending[$project.Name]
            if (($now - $pendingUpdate.LastEvent).TotalSeconds -ge 8) {
                $pending.Remove($project.Name)
                Invoke-ProjectUpdate $project $pendingUpdate.RequiresBackup
            }
        }
    }
} finally {
    foreach ($subscription in $subscriptions) {
        Unregister-Event -SubscriptionId $subscription.Id -ErrorAction SilentlyContinue
    }
    Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue
}
