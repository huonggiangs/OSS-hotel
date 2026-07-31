# ============================================================================
# start-all.ps1 — Khoi dong TOAN BO he thong Smart Hotel Group (KHONG can Docker)
#
# Mo 5 cua so PowerShell rieng, moi cua so chay 1 dich vu (giu nguyen, dung
# dong lai khi con dang test). Dung DB nhung (PGlite) co san trong code, tu
# tao du lieu mau lan dau chay, khong can cai PostgreSQL/Docker.
#
# Cua so thu 5 (Edge Node - apps/edge-node) la thiet bi dieu phoi tai cho, van
# hoat dong khi property-web API (cong 4100) bi tat/mat mang - xem
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

Start-DevWindow -Title "webadmin API"     -Path "$root\webadmin\apps\api"                          -Port "4000"
Start-Sleep -Seconds 2
Start-DevWindow -Title "webadmin WEB"     -Path "$root\webadmin\apps\web"                           -Port "3000"
Start-Sleep -Seconds 2
Start-DevWindow -Title "property-web API" -Path "$root\smart-hotel-os\property-web\apps\api"        -Port "4100"
Start-Sleep -Seconds 2
Start-DevWindow -Title "property-web WEB" -Path "$root\smart-hotel-os\property-web\apps\web"         -Port "3100"
Start-Sleep -Seconds 2
Start-DevWindow -Title "Edge Node"        -Path "$root\smart-hotel-os\apps\edge-node"                -Port "4200"

Write-Host ""
Write-Host "Da mo 5 cua so PowerShell — DUNG DONG cac cua so nay khi con dang test." -ForegroundColor Yellow
Write-Host "Lan dau chay se mat khoang 30-90 giay de cai dat + tao du lieu mau (rieng Edge Node co the" -ForegroundColor Yellow
Write-Host "mat toi ~30 giay o lan khoi dong DAU TIEN de PGlite khoi tao CSDL WASM - lan sau se nhanh hon nhieu)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Sau khi ca 5 cua so hien dong 'Ready'/'dang chay', mo trinh duyet:" -ForegroundColor White
Write-Host "  - webadmin:     http://localhost:3000   (dang nhap: admin@hq-console.local / ChangeMe123!)" -ForegroundColor White
Write-Host "  - property-web: http://localhost:3100   (dang nhap: manager / Anio2026@)" -ForegroundColor White
Write-Host "  - Edge Node:    http://localhost:4200   (giao dien khan cap - dang nhap: reception / Anio2026@)" -ForegroundColor White
Write-Host "                  Tu dien thoai/may khac cung mang WiFi khach san: http://<ip-lan-cua-may-nay>:4200" -ForegroundColor White
Write-Host ""
Write-Host "Neu 1 cua so bao loi mau do, chup man hinh / copy nguyen van dong loi gui lai de kiem tra." -ForegroundColor White
Write-Host ""
