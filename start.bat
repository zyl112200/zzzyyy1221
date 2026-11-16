@echo off
setlocal enabledelayedexpansion
title XianDiao - LAN Online Server
cd /d "%~dp0"

REM LAN IP is read from src\config\lan.js so it only needs to be changed there.
set "LANIP="
for /f "tokens=2 delims='" %%i in ('findstr /r /c:"export const LAN_IP" "src\config\lan.js" 2^>nul') do set "LANIP=%%i"
if not defined LANIP set "LANIP=192.168.68.9"

echo ============================================================
echo   Bikini Bottom Fishing - online browsing (LAN)
echo ============================================================

where node >nul 2>nul
if errorlevel 1 goto nonode

if not exist "node_modules" (
  echo [i] First run, installing dependencies ...
  call npm install
  if errorlevel 1 goto nonode
)

if not exist "dist\index.html" (
  echo [i] Building frontend ...
  call npm run build
  if errorlevel 1 (
    echo [X] Build failed.
    pause
    exit /b 1
  )
)

echo.
echo   This PC      : http://localhost:8081
echo   LAN          : http://%LANIP%:8081
echo   Backend LAN  : http://%LANIP%:8080   (start it with start-backend.bat)
echo.
echo [i] Starting web server in a new window, then opening the browser ...
start "XianDiao LAN Server" cmd /k node serve-lan.mjs
timeout /t 2 >nul
start "" "http://%LANIP%:8081"
echo [i] Keep the "XianDiao LAN Server" window open while playing.
echo [i] Other devices on the LAN: open http://%LANIP%:8081
timeout /t 5 >nul
exit /b 0

:nonode
echo.
echo [X] Node.js not found, or npm install failed.
echo     Fallback: open the single-file offline page instead:
echo       spongebob-offline.html
echo.
pause
exit /b 1
