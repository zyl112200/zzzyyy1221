@echo off
setlocal ENABLEEXTENSIONS
REM ============================================================
REM  Maven launcher (Windows) for Bikini Bottom Fishing
REM  Launches Maven via plexus-classworlds using the distribution
REM  already cached by the Maven Wrapper under:
REM    USERPROFILE\.m2\wrapper\dists\apache-maven-X-bin\(hash)\apache-maven-X
REM  No Maven install on PATH is required.
REM  NOTE: keep this file free of angle brackets in comments/text,
REM        cmd parses them as redirection even inside REM lines.
REM ============================================================
set "DIST_ROOT=%USERPROFILE%\.m2\wrapper\dists"
set "MVN_DIST="

REM 1) prefer the complete 3.9.16 distribution
for /d %%H in ("%DIST_ROOT%\apache-maven-3.9.16-bin\*") do for /d %%D in ("%%H\apache-maven-*") do call :try_dist "%%D"
if defined MVN_DIST goto found

REM 2) fall back to any complete cached distribution
for /d %%B in ("%DIST_ROOT%\apache-maven-*") do for /d %%H in ("%%B\*") do for /d %%D in ("%%H\apache-maven-*") do call :try_dist "%%D"
if defined MVN_DIST goto found

echo [ERROR] Maven distribution not found under %DIST_ROOT%
echo Expected: apache-maven-X-bin folder containing hash folder with apache-maven-X,
echo           which must include bin\m2.conf and lib\maven-core-*.jar.
echo Connect to the internet once and run this script so the wrapper downloads Maven.
exit /b 1

:found
set "CLASSWORLDS_JAR="
for %%J in ("%MVN_DIST%\boot\plexus-classworlds-*.jar") do set "CLASSWORLDS_JAR=%%J"
if not defined CLASSWORLDS_JAR (
  echo [ERROR] plexus-classworlds jar missing in %MVN_DIST%\boot
  exit /b 1
)

set "PROJECT_DIR=%~dp0."
if defined JAVA_HOME (set "JAVA_EXE=%JAVA_HOME%\bin\java") else (set "JAVA_EXE=java")
"%JAVA_EXE%" -classpath "%CLASSWORLDS_JAR%" -Dclassworlds.conf="%MVN_DIST%\bin\m2.conf" -Dmaven.home="%MVN_DIST%" "-Dlibrary.jansi.path=%MVN_DIST%\lib\jansi-native" -Dmaven.multiModuleProjectDirectory="%PROJECT_DIR%" org.codehaus.plexus.classworlds.launcher.Launcher %*
endlocal
exit /b %ERRORLEVEL%

:try_dist
if defined MVN_DIST goto :eof
if not exist "%~1\bin\m2.conf" goto :eof
dir /b "%~1\lib\maven-core-*.jar" >nul 2>nul || goto :eof
set "MVN_DIST=%~1"
goto :eof
