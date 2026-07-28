@echo off
REM ============================================================================
REM property-web — khởi động nhanh KHÔNG CẦN DOCKER (Windows, double-click hoặc
REM chạy trong CMD). Tự kiểm tra Node.js, tự "npm install" nếu thiếu node_modules,
REM rồi mở 2 cửa sổ CMD: 1 chạy API (chế độ database embedded, không cần
REM Postgres/Docker), 1 chạy Web.
REM
REM LƯU Ý QUAN TRỌNG: nếu double-click file này KHÔNG mở được cửa sổ (thường do
REM phần mềm bảo mật/EDR chặn chạy script trên máy bạn), đừng cố sửa file này —
REM hãy mở README.md, mục "Chạy thử — Cách 1", và gõ tay từng lệnh PowerShell
REM hoặc CMD liệt kê ở đó. Đó là đường chính, file .bat này chỉ là tiện ích phụ.
REM ============================================================================

setlocal
set "ROOT=%~dp0"

echo ============================================================
echo   ANIO PMS - property-web (khong can Docker)
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
echo Dang mo 2 cua so: API (cong 4100, che do database embedded) va Web (cong 3100)...
echo.

start "property-web API (4100)" cmd /k "cd /d "%ROOT%apps\api" && npm run dev"
start "property-web WEB (3100)" cmd /k "cd /d "%ROOT%apps\web" && npm run dev"

echo ============================================================
echo   Web:  http://localhost:3100
echo   API:  http://localhost:4100/health
echo.
echo   Tai khoan demo (mat khau chung: Anio2026@):
echo     - owner          (OWNER)
echo     - manager        (MANAGER)
echo     - reception      (RECEPTIONIST)
echo     - housekeeping   (HOUSEKEEPING)
echo ============================================================
echo.
echo Cua so nay co the dong lai - 2 cua so API/Web se tiep tuc chay rieng.
pause
endlocal
