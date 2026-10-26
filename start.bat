@echo off
setlocal enabledelayedexpansion
title Bikini Bottom Fishing - Offline Launcher
cd /d "%~dp0"

echo ============================================================
echo   Bikini Bottom Fishing  /  offline single-file build
echo ============================================================

set "HTML=%~dp0spongebob-offline.html"
if exist "%HTML%" goto open

set "HTML=%~dp0dist\spongebob-standalone.html"
if exist "%HTML%" goto open

echo [i] Offline build not found, trying to build it...
where node >nul 2>nul
if errorlevel 1 goto nobuild
if not exist "%~dp0node_modules" goto nobuild

call npm run build:standalone
if exist "%~dp0spongebob-offline.html" (
  set "HTML=%~dp0spongebob-offline.html"
  goto open
)
goto nobuild

:nobuild
echo.
echo [X] Cannot find AND cannot build the offline page.
echo     - The offline file should be: spongebob-offline.html
echo     - To build it you need Node.js and one-time "npm install" (network).
echo.
pause
exit /b 1

:open
echo [OK] Opening: !HTML!
echo [i] No server, no network, no Java needed. Save data lives in this browser.
echo.

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "CHROME=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined CHROME if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "CHROME=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if defined CHROME (
  start "" "%CHROME%" "!HTML!"
) else (
  start "" "!HTML!"
)

echo [i] Default account: spongebob / 123456   (or register a new one)
echo [i] You can close this window now.
timeout /t 6 >nul
exit /b 0
