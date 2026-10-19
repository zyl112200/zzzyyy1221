@echo off
REM ============================================================
REM  Bikini Bottom Fishing - Windows one-click launcher
REM  Requires : Node.js 18+ (with npm) and JDK 17+
REM  Maven    : uses PATH "mvn" if available, else a bundled
REM             fallback path (WorkBuddy isolated Maven)
REM  Backend   : runs on H2 in-memory DB, no MySQL needed
REM ============================================================
setlocal ENABLEEXTENSIONS

REM ---- clear injected port override ---------------------------------
REM Some sandboxes / cloud shells inject SERVER__PORT into the env,
REM which Spring Boot reads as server.port and hijacks our 8080.
REM Clear it so application.yml's server.port: 8080 takes effect.
set "SERVER__PORT="

REM ---- project root = folder containing this script ----
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

REM ---- locate Java (JAVA_HOME) ----
set "JAVA_OK=0"
where java >nul 2>nul && set "JAVA_OK=1"
if "%JAVA_OK%"=="0" (
  if exist "C:\Program Files\Zulu\zulu-21\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Zulu\zulu-21"
    set "JAVA_OK=1"
  ) else if exist "C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21"
    set "JAVA_OK=1"
  )
)
if "%JAVA_OK%"=="0" (
  echo [ERROR] Java not found. Install JDK 17+ and set JAVA_HOME.
  pause
  exit /b 1
)

REM ---- locate Maven ----
set "MVN=mvn"
where mvn >nul 2>nul || (
  if exist "C:\Users\Administrator\.workbuddy\binaries\maven\apache-maven-3.9.9\bin\mvn.cmd" (
    set "MVN=C:\Users\Administrator\.workbuddy\binaries\maven\apache-maven-3.9.9\bin\mvn.cmd"
  ) else (
    echo [ERROR] Maven not found. Install it and add to PATH (https://maven.apache.org).
    pause
    exit /b 1
  )
)

REM ---- locate Node ----
where node >nul 2>nul || (
  echo [ERROR] Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

echo ============================================================
echo   Bikini Bottom Fishing is starting ...
echo     backend : http://localhost:8080  (H2 in-memory, no MySQL)
echo     frontend: http://localhost:5173
echo     account : spongebob / 123456
echo ============================================================

REM backend in a new window (h2 profile)
REM --server.port=8080 is passed as a command-line argument (highest Spring Boot
REM precedence) so it always wins over any injected SERVER__PORT env variable.
start "bikini-backend(8080)" cmd /k "cd /d ""%ROOT%backend"" && ""%MVN%"" -Dspring-boot.run.profiles=h2 -Dspring-boot.run.arguments=--server.port=8080 spring-boot:run"

REM frontend in a new window (install deps then serve)
start "bikini-frontend(5173)" cmd /k "cd /d ""%ROOT%"" && call npm install && call npm run dev"

echo Both services launched in separate windows. First run downloads deps (1-3 min).
echo Open http://localhost:5173 when ready. Close both windows to stop.
pause
