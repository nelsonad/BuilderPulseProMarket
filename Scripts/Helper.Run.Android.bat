@echo off
setlocal

REM =====================================================
REM Logging
REM =====================================================
set "SCRIPT_DIR=%~dp0"
set "LOG=%SCRIPT_DIR%run-android.log"

echo ===================================================== > "%LOG%"
echo %DATE% %TIME% >> "%LOG%"
echo Script: %~f0 >> "%LOG%"
echo ===================================================== >> "%LOG%"

echo Writing log to: %LOG%
echo.

REM =====================================================
REM Args
REM =====================================================
set "DO_CLEAN=0"
set "NO_METRO=0"

:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="clean" set "DO_CLEAN=1" & shift & goto parse_args
if /i "%~1"=="nometro" set "NO_METRO=1" & shift & goto parse_args
goto args_done

:args_done

REM =====================================================
REM Locate app dir
REM =====================================================
set "APP_DIR=%SCRIPT_DIR%..\BuilderPulsePro.App"

echo [INFO] App dir: %APP_DIR%
echo [INFO] App dir: %APP_DIR%>>"%LOG%"

if not exist "%APP_DIR%\package.json" (
  echo [ERROR] package.json not found at "%APP_DIR%"
  echo [ERROR] package.json not found at "%APP_DIR%">>"%LOG%"
  goto :done
)

pushd "%APP_DIR%"

echo =====================================================
echo BuilderPulsePro React Native Android Runner
echo Script: %~f0
echo =====================================================
echo =====================================================>>"%LOG%"
echo BuilderPulsePro React Native Android Runner>>"%LOG%"
echo =====================================================>>"%LOG%"

echo [INFO] CWD: %CD%
echo [INFO] CWD: %CD%>>"%LOG%"

echo [INFO] package.json present
echo [INFO] package.json present>>"%LOG%"

REM =====================================================
REM Node/NPM
REM =====================================================
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node not found in PATH
  echo [ERROR] Node not found in PATH>>"%LOG%"
  goto :done_popd
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found in PATH
  echo [ERROR] npm not found in PATH>>"%LOG%"
  goto :done_popd
)

echo [INFO] node:
node -v
echo [INFO] node:>>"%LOG%"
node -v >>"%LOG%" 2>&1

echo [INFO] npm:
call npm -v
echo [INFO] npm:>>"%LOG%"
call npm -v >>"%LOG%" 2>&1

REM =====================================================
REM Java (use JAVA_HOME)
REM =====================================================
if "%JAVA_HOME%"=="" (
  echo [ERROR] JAVA_HOME is not set. Set it to the Android Studio JDK and retry.
  echo [ERROR] JAVA_HOME is not set. Set it to the Android Studio JDK and retry.>>"%LOG%"
  goto :done_popd
)

set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [INFO] JAVA_HOME=%JAVA_HOME%
echo [INFO] JAVA_HOME=%JAVA_HOME%>>"%LOG%"

echo [INFO] java:
echo [INFO] java:>>"%LOG%"
java -version >>"%LOG%" 2>&1
java -version
if errorlevel 1 (
  echo [ERROR] java not found in PATH. Check JAVA_HOME and retry.
  echo [ERROR] java not found in PATH. Check JAVA_HOME and retry.>>"%LOG%"
  goto :done_popd
)

REM =====================================================
REM Android SDK
REM =====================================================
set "DEFAULT_ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if "%ANDROID_HOME%"=="" set "ANDROID_HOME=%DEFAULT_ANDROID_HOME%"

echo [INFO] ANDROID_HOME=%ANDROID_HOME%
echo [INFO] ANDROID_HOME=%ANDROID_HOME%>>"%LOG%"

if not exist "%ANDROID_HOME%" (
  echo [ERROR] ANDROID_HOME does not exist: "%ANDROID_HOME%"
  echo [ERROR] ANDROID_HOME does not exist: "%ANDROID_HOME%">>"%LOG%"
  goto :done_popd
)

set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\tools;%ANDROID_HOME%\tools\bin;%PATH%"

echo [INFO] adb:
echo [INFO] adb:>>"%LOG%"
where adb >>"%LOG%" 2>&1
where adb

REM =====================================================
REM Optional clean (NO parenthesis blocks)
REM =====================================================
if "%DO_CLEAN%"=="1" goto do_clean
goto after_clean

:do_clean
echo [CLEAN] Removing metro-cache, node_modules, package-lock.json
echo [CLEAN] Removing metro-cache, node_modules, package-lock.json>>"%LOG%"
rmdir /s /q "%TEMP%\metro-cache" >>"%LOG%" 2>&1
rmdir /s /q node_modules >>"%LOG%" 2>&1
del /q package-lock.json >>"%LOG%" 2>&1

:after_clean

REM =====================================================
REM Install deps if needed
REM =====================================================
if exist "node_modules\" goto deps_check

goto deps_install

:deps_check
echo [INFO] Verifying node_modules...
echo [INFO] Verifying node_modules...>>"%LOG%"
call npm ls --depth=0 >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [WARN] node_modules incomplete; reinstalling...
  echo [WARN] node_modules incomplete; reinstalling...>>"%LOG%"
  goto deps_install
)

goto deps_done

:deps_install

echo [INFO] npm install...
echo [INFO] npm install...>>"%LOG%"
call npm install --no-audit --no-fund >>"%LOG%" 2>&1
if errorlevel 1 (
  if exist "node_modules\react-native-webview" (
    echo [WARN] npm install returned non-zero, but deps appear present. Continuing...
    echo [WARN] npm install returned non-zero, but deps appear present. Continuing...>>"%LOG%"
  ) else (
    echo [ERROR] npm install failed (see log)
    echo [ERROR] npm install failed>>"%LOG%"
    goto :done_popd
  )
)

:deps_done

REM =====================================================
REM DIAG: RN config
REM =====================================================
echo -----------------------------------------------------
echo [DIAG] npx react-native config --verbose
echo -----------------------------------------------------
echo [DIAG] npx react-native config --verbose>>"%LOG%"

call npx react-native config --verbose >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] Failed to load RN config. Open the log:
  echo         %LOG%
  goto :done_popd
)

REM =====================================================
REM Start Metro (only after config ok)
REM =====================================================
if "%NO_METRO%"=="1" goto skip_metro

echo [INFO] Starting Metro...
echo [INFO] Starting Metro...>>"%LOG%"

if "%DO_CLEAN%"=="1" (
  start "Metro - BuilderPulsePro.App" cmd /k "cd /d %CD% && npx react-native start --reset-cache"
) else (
  start "Metro - BuilderPulsePro.App" cmd /k "cd /d %CD% && npx react-native start"
)

timeout /t 2 /nobreak >nul

:skip_metro

REM =====================================================
REM Run Android
REM =====================================================
echo -----------------------------------------------------
echo [RUN] npx react-native run-android --verbose
echo -----------------------------------------------------
echo [RUN] npx react-native run-android --verbose>>"%LOG%"

call npx react-native run-android --verbose >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] run-android failed. See log:
  echo         %LOG%
  goto :done_popd
)

echo [OK] App launched.

:done_popd
popd

:done
echo.
echo Done. Log file:
echo   %LOG%
echo.
pause
exit /b 0
