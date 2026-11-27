@echo off
REM ============================================================
REM  Start the Spring Boot backend with LOCAL MySQL (persistent).
REM  Database : jdbc:mysql://127.0.0.1:3306/spongebob_db
REM  Account  : root / 123456 (override with MYSQL_USER / MYSQL_PASSWORD)
REM  Bind     : 0.0.0.0:8080 (LAN reachable)
REM ============================================================
setlocal
cd /d "%~dp0backend"

REM 清理可能注入的环境变量，确保监听 8080 / 0.0.0.0
set "SERVER__PORT="
set "SERVER_PORT="
set "SERVER__ADDRESS="

REM 数据源：默认本机 MySQL；如需连别的机器，可在此或环境变量覆盖
if not defined MYSQL_URL set "MYSQL_URL=jdbc:mysql://127.0.0.1:3306/spongebob_db?useUnicode=true^&characterEncoding=UTF-8^&serverTimezone=Asia/Shanghai^&useSSL=false^&allowPublicKeyRetrieval=true"
if not defined MYSQL_USER set "MYSQL_USER=root"
if not defined MYSQL_PASSWORD set "MYSQL_PASSWORD=123456"

set "LANIP="
for /f "tokens=2 delims='" %%i in ('findstr /r /c:"export const LAN_IP" "..\src\config\lan.js" 2^>nul') do set "LANIP=%%i"
if not defined LANIP set "LANIP=192.168.68.9"

echo ============================================================
echo   Backend (MySQL) : http://%LANIP%:8080
echo   Health          : http://%LANIP%:8080/api/health
echo   Database        : 127.0.0.1:3306 / spongebob_db
echo ============================================================
echo [i] First run downloads Maven (needs network once), then starts.
echo.

call mvnw.cmd spring-boot:run
pause
