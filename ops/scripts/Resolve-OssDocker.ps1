<#
.SYNOPSIS
Trả về đường dẫn Docker CLI, kể cả trong PowerShell chưa nạp lại PATH sau cài đặt.
#>

$ErrorActionPreference = "Stop"
$dockerCommand = @(Get-Command docker -CommandType Application -ErrorAction SilentlyContinue |
    Where-Object { $_.Source -and (Test-Path -LiteralPath $_.Source) } |
    Select-Object -First 1)
if ($dockerCommand.Count -gt 0) {
    # `Get-Command` có thể trả nhiều shim docker trong một số PATH. Chỉ trả
    # đúng executable đầu tiên, nếu không các caller nhận mảng và PowerShell
    # ghép chúng thành một command name không hợp lệ.
    Write-Output ([string]$dockerCommand[0].Source)
    return
}

$candidates = @(
    (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe"),
    "C:\ProgramData\DockerDesktop\version-bin\docker.exe"
)
$dockerPath = [string]($candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
if (-not $dockerPath) {
    throw "Không tìm thấy Docker CLI. Cài Docker Desktop hoặc mở PowerShell mới sau khi cài."
}

Write-Output $dockerPath
