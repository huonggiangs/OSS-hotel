# Restart-OssWatcher.ps1 — nạp lại phiên bản Watch-Oss.ps1 sau khi chính
# watcher được nâng cấp, không cần rebuild hoặc dừng các container đang healthy.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$watcherScript = Join-Path $root "ops\scripts\Watch-Oss.ps1"

$running = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "powershell.exe" -and $_.CommandLine -like "*Watch-Oss.ps1*" }
foreach ($process in $running) {
    Stop-Process -Id $process.ProcessId -Force
}

Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $watcherScript `
    -WindowStyle Hidden
Write-Host "Đã nạp lại OSS watcher." -ForegroundColor Green
