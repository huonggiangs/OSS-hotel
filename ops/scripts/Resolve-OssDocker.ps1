<#
.SYNOPSIS
Trả về đường dẫn Docker CLI, kể cả trong PowerShell chưa nạp lại PATH sau cài đặt.
#>

$ErrorActionPreference = "Stop"
$dockerCommand = Get-Command docker -CommandType Application -ErrorAction SilentlyContinue
if ($dockerCommand) {
    Write-Output $dockerCommand.Source
    return
}

$candidates = @(
    (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe"),
    "C:\ProgramData\DockerDesktop\version-bin\docker.exe"
)
$dockerPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $dockerPath) {
    throw "Không tìm thấy Docker CLI. Cài Docker Desktop hoặc mở PowerShell mới sau khi cài."
}

Write-Output $dockerPath
