@echo off
REM One click: start backend (8080) + web server (8081), then open the browser.
REM LAN IP comes from src\config\lan.js - change it there only.
setlocal enabledelayedexpansion
title XianDiao - Start All (LAN)
cd /d "%~dp0"

set "LANIP="
for /f "tokens=2 delims='" %%i in ('findstr /r /c:"export const LAN_IP" "src\config\lan.js" 2^>nul') do set "LANIP=%%i"
if not defined LANIP set "LANIP=192.168.68.9"

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found. Install Node.js 18+ first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [i] First run, installing dependencies ...
  call npm install
)

if not exist "dist\index.html" (
  echo [i] Building frontend ...
  call npm run build
)

echo ============================================================
echo   [1/2] backend  http://%LANIP%:8080
echo   [2/2] frontend http://%LANIP%:8081
echo ============================================================
echo [i] Two windows will open. Keep both of them running.
echo.

start "XianDiao Backend" cmd /k call "%~dp0start-backend.bat"
echo [i] Waiting for the backend to come up (about 25s on first run) ...
timeout /t 25 >nul

start "XianDiao Web Server" cmd /k node serve-lan.mjs
timeout /t 2 >nul

echo [i] Running LAN self-check ...
node check-lan.mjs

start "" "http://%LANIP%:8081"
echo.
echo [i] Other devices on the LAN: http://%LANIP%:8081
echo [i] If they cannot open it, allow ports 8081 / 8080 in Windows Firewall.
timeout /t 6 >nul
exit /b 0
