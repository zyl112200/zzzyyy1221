@echo off
setlocal ENABLEEXTENSIONS
REM ============================================================
REM  Maven launcher (Windows) for Bikini Bottom Fishing
REM  ------------------------------------------------------------
REM  The project's Maven Wrapper (mvnw) is a *bash* script and its
REM  bundled bin/mvn boot-classpath is broken in this environment,
REM  so we launch Maven directly through plexus-classworlds'
REM  Launcher, using the Maven distribution that the wrapper already
REM  cached under  %USERPROFILE%\.m2\wrapper\dists .
REM  This makes `mvnw.bat <goal>` behave exactly like `mvn <goal>`,
REM  with no Maven install required on PATH.
REM ============================================================
set "MVN_DIST="

REM 1) Prefer the known-good, complete 3.9.16 distribution (another
REM    cached 3.9.9 dist also exists but is incomplete, so avoid it).
if exist "%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.16-bin" (
  for /d %%V in ("%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.16-bin\*") do (
    if exist "%%V\bin\m2.conf" if exist "%%V\lib\maven-core-*.jar" set "MVN_DIST=%%V"
  )
)

REM 2) Fallback: any complete apache-maven-* distribution in the wrapper cache.
if not defined MVN_DIST (
  for /d %%B in ("%USERPROFILE%\.m2\wrapper\dists\apache-maven-*") do (
    for /d %%V in ("%%B\*") do (
      if exist "%%V\bin\m2.conf" if exist "%%V\lib\maven-core-*.jar" set "MVN_DIST=%%V"
    )
  )
)

if not defined MVN_DIST (
  echo [ERROR] Maven distribution not found under %USERPROFILE%\.m2\wrapper\dists
  echo         (expected apache-maven-*/.../apache-maven-*/bin/m2.conf + lib/maven-core-*.jar)
  echo         Connect to the internet once and run this script; the wrapper will download Maven.
  exit /b 1
)

set "CLASSWORLDS_JAR="
for %%J in ("%MVN_DIST%\boot\plexus-classworlds-*.jar") do set "CLASSWORLDS_JAR=%%J"
if not defined CLASSWORLDS_JAR (
  echo [ERROR] plexus-classworlds jar missing in %MVN_DIST%\boot
  exit /b 1
)

set "PROJECT_DIR=%~dp0."
if defined JAVA_HOME (set "JAVA_EXE=%JAVA_HOME%\bin\java") else (set "JAVA_EXE=java")
"%JAVA_EXE%" -classpath "%CLASSWORLDS_JAR%" ^
  -Dclassworlds.conf="%MVN_DIST%\bin\m2.conf" ^
  -Dmaven.home="%MVN_DIST%" ^
  "-Dlibrary.jansi.path=%MVN_DIST%\lib\jansi-native" ^
  -Dmaven.multiModuleProjectDirectory="%PROJECT_DIR%" ^
  org.codehaus.plexus.classworlds.launcher.Launcher %*
endlocal
