@echo off
REM ============================================================================
REM webadmin (HQ Console) — khoi dong nhanh KHONG CAN DOCKER (Windows,
REM double-click hoac chay trong CMD). Tu kiem tra Node.js, tu "npm install"
REM neu thieu node_modules, roi mo 2 cua so CMD: 1 chay API (che do database
REM embedded, khong can Postgres/Docker), 1 chay Web.
REM
REM LUU Y QUAN TRONG: neu double-click file nay KHONG mo duoc cua so (thuong
REM do phan mem bao mat/EDR chan chay script tren may ban), dung co sua file
REM nay — hay mo README.md, muc "Chay thu — Cach 1", va go tay tung lenh
REM PowerShell hoac CMD liet ke o do. Do la duong chinh, file .bat nay chi la
REM tien ich phu.
REM ============================================================================

setlocal
set "ROOT=%~dp0"

echo ============================================================
echo   HQ Console (webadmin) - khong can Docker
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Khong tim thay Node.js trong PATH.
  echo Hay cai Node.js 20+ tu https://nodejs.org/ roi chay lai file nay.
  pause
  exit /b 1
)

echo [OK] Da tim thay Node.js:
node -v
echo.

if not exist "%ROOT%apps\api\node_modules" (
  echo [1/2] Cai dat goi cho apps\api ...
  pushd "%ROOT%apps\api"
  call npm install
  popd
)

if not exist "%ROOT%apps\web\node_modules" (
  echo [2/2] Cai dat goi cho apps\web ...
  pushd "%ROOT%apps\web"
  call npm install
  popd
)

echo.
echo Dang mo 2 cua so DEV: API (cong 14000, che do database embedded) va Web (cong 13000)...
echo.

start "webadmin API (14000)" cmd /k "cd /d "%ROOT%apps\api" && npm run dev"
start "webadmin WEB (13000)" cmd /k "cd /d "%ROOT%apps\web" && npm run dev"

echo ============================================================
echo   Web:  http://localhost:13000
echo   API:  http://localhost:14000/health
echo.
echo   Tai khoan demo (mat khau chung: ChangeMe123!):
echo     - admin@hq-console.local       (SUPER_ADMIN)
echo     - sales@hq-console.local       (SALES_MANAGER)
echo     - accountant@hq-console.local  (ACCOUNTANT)
echo     - supply@hq-console.local      (SUPPLY_CHAIN)
echo ============================================================
echo.
echo Cua so nay co the dong lai - 2 cua so API/Web se tiep tuc chay rieng.
pause
endlocal
