@echo off
REM ============================================================
REM  Lightweight Maven launcher for the spongebob backend.
REM  Prefers "mvn" on PATH, then falls back to common install
REM  locations (including the WorkBuddy isolated Maven).
REM  Usage:  mvnw.bat <any mvn args>
REM ============================================================
setlocal ENABLEEXTENSIONS

set "MVN_BIN="

where mvn.cmd >nul 2>nul && set "MVN_BIN=mvn.cmd"
if not defined MVN_BIN (
  if exist "C:\Users\Administrator\.workbuddy\binaries\maven\apache-maven-3.9.9\bin\mvn.cmd" (
    set "MVN_BIN=C:\Users\Administrator\.workbuddy\binaries\maven\apache-maven-3.9.9\bin\mvn.cmd"
  )
)
if not defined MVN_BIN (
  if exist "C:\Program Files\Apache\maven\bin\mvn.cmd" (
    set "MVN_BIN=C:\Program Files\Apache\maven\bin\mvn.cmd"
  )
)
if not defined MVN_BIN (
  if exist "C:\Program Files (x86)\Apache\maven\bin\mvn.cmd" (
    set "MVN_BIN=C:\Program Files (x86)\Apache\maven\bin\mvn.cmd"
  )
)

if not defined MVN_BIN (
  echo [ERROR] Maven not found. Install Maven 3.6+ and add it to PATH,
  echo         or place it at the WorkBuddy fallback path:
  echo         C:\Users\Administrator\.workbuddy\binaries\maven\apache-maven-3.9.9
  exit /b 1
)

"%MVN_BIN%" %*
