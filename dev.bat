@echo off
REM Dev mode: Vite dev server on http://localhost:5173
REM The frontend is fully self-contained (local game engine), no backend needed.
REM Requires Node.js and one-time "npm install" (network).
setlocal
cd /d "%~dp0"

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
    echo [X] npm install failed. Use start.bat for the offline build instead.
    pause
    exit /b 1
  )
)

echo [i] Dev server: http://localhost:5173
echo [i] API mode: local (offline engine). Add ?api=server to use Spring Boot if you run it later.
call npm run dev
