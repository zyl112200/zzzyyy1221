@echo off
REM Dev mode: Vite dev server (hot reload), LAN accessible.
REM Frontend IP / backend IP are defined in src\config\lan.js
setlocal
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
  echo [i] Installing dependencies, this needs network once...
  call npm install
  if errorlevel 1 (
    echo [X] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo   Dev (this PC) : http://localhost:5173
echo   Dev (LAN)     : http://%LANIP%:5173
echo   API proxy     : /api  -^>  http://%LANIP%:8080
echo.
echo [i] Page is served over HTTP, so the online backend is used by default.
echo [i] Backend offline? add ?api=local to the URL to use the built-in local engine.
echo.
call npm run dev
