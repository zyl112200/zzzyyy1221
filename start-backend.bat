@echo off
REM Start the Spring Boot backend bound to 0.0.0.0:8080 (LAN reachable).
REM Uses the H2 in-memory profile so no MySQL install is required.
REM For MySQL mode: edit backend\src\main\resources\application.yml and run without the profile.
setlocal
cd /d "%~dp0backend"

REM 有些环境（IDE / 终端 / 云沙箱）会注入 SERVER__PORT 覆盖端口，这里统一清掉，确保监听 8080
set "SERVER__PORT="
set "SERVER_PORT="
set "SERVER__ADDRESS="

set "LANIP="
for /f "tokens=2 delims='" %%i in ('findstr /r /c:"export const LAN_IP" "..\src\config\lan.js" 2^>nul') do set "LANIP=%%i"
if not defined LANIP set "LANIP=192.168.68.9"

echo ============================================================
echo   Backend  : http://%LANIP%:8080
echo   Health   : http://%LANIP%:8080/api/health
echo   H2 console: http://%LANIP%:8080/h2-console
echo ============================================================
echo [i] First run downloads Maven (needs network once), then starts.
echo.

call mvnw.cmd -Dspring-boot.run.profiles=h2 spring-boot:run
pause
