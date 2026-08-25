# ============================================================================
# start-all.ps1 — Khoi dong TOAN BO he thong Smart Hotel Group (KHONG can Docker)
#
# Mo 5 cua so PowerShell rieng theo DAY CONG DEV (13000-14200), tach hoan toan
# voi Docker/LAN (3000-4200). Dung DB nhung (PGlite) co san trong code, tu tao
# du lieu mau lan dau chay, khong can cai PostgreSQL/Docker.
#
# Cua so thu 5 (Edge Node - apps/edge-node) la thiet bi dieu phoi tai cho, van
# hoat dong khi property-web API Docker (cong 4100) bi tat/mat mang - xem
# smart-hotel-os/apps/edge-node/README.md.
#
# CACH CHAY (dan nguyen dong nay vao PowerShell roi Enter):
#
#   powershell -ExecutionPolicy Bypass -File "D:\hotel\OSS\start-all.ps1"
#
# Dong "-ExecutionPolicy Bypass" chi ap dung cho MOT LAN chay file nay, KHONG
# doi cai dat may tinh vinh vien - an toan, khong can quyen quan tri (admin).
# ============================================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-DevWindow {
    param(
        [string]$Title,
        [string]$Path,
        [string]$Port
    )
    if (-not (Test-Path $Path)) {
        Write-Host "[BO QUA] Khong thay thu muc: $Path" -ForegroundColor Yellow
        return
    }
    Write-Host "Dang mo: $Title (cong $Port) ..." -ForegroundColor Cyan
    $cmd = "Set-Location '$Path'; " +
           "Write-Host '=== $Title (cong $Port) ===' -ForegroundColor Green; " +
           "if (-not (Test-Path 'node_modules')) { Write-Host 'Dang cai dat goi lan dau (npm install)...' -ForegroundColor Yellow; npm install }; " +
           "npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $cmd
}

Write-Host ""
Write-Host "=== Khoi dong Smart Hotel Group OSS — khong can Docker ===" -ForegroundColor Magenta
Write-Host ""

Start-DevWindow -Title "webadmin API"     -Path "$root\webadmin\apps\api"                          -Port "14000"
Start-Sleep -Seconds 2
Start-DevWindow -Title "webadmin WEB"     -Path "$root\webadmin\apps\web"                           -Port "13000"
Start-Sleep -Seconds 2
Start-DevWindow -Title "property-web API" -Path "$root\smart-hotel-os\property-web\apps\api"        -Port "14100"
Start-Sleep -Seconds 2
Start-DevWindow -Title "property-web WEB" -Path "$root\smart-hotel-os\property-web\apps\web"         -Port "13100"
Start-Sleep -Seconds 2
Start-DevWindow -Title "Edge Node"        -Path "$root\smart-hotel-os\apps\edge-node"                -Port "14200"

Write-Host ""
Write-Host "Da mo 5 cua so PowerShell — DUNG DONG cac cua so nay khi con dang test." -ForegroundColor Yellow
Write-Host "Lan dau chay se mat khoang 30-90 giay de cai dat + tao du lieu mau (rieng Edge Node co the" -ForegroundColor Yellow
Write-Host "mat toi ~30 giay o lan khoi dong DAU TIEN de PGlite khoi tao CSDL WASM - lan sau se nhanh hon nhieu)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Sau khi ca 5 cua so hien dong 'Ready'/'dang chay', mo trinh duyet:" -ForegroundColor White
Write-Host "  - webadmin DEV:     http://localhost:13000   (dang nhap: admin@hq-console.local / ChangeMe123!)" -ForegroundColor White
Write-Host "  - property-web DEV: http://localhost:13100   (dang nhap: manager / Anio2026@)" -ForegroundColor White
Write-Host "  - Edge Node DEV:    http://localhost:14200   (giao dien khan cap - dang nhap: reception / Anio2026@)" -ForegroundColor White
Write-Host "  Docker/LAN giu cac cong 3000, 3100, 4200 va co the chay song song voi DEV." -ForegroundColor White
Write-Host ""
Write-Host "Neu 1 cua so bao loi mau do, chup man hinh / copy nguyen van dong loi gui lai de kiem tra." -ForegroundColor White
Write-Host ""
