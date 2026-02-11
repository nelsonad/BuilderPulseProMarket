@echo off
setlocal

set /p MIGRATION_NAME=Enter migration name: 
if "%MIGRATION_NAME%"=="" (
  echo [ERROR] Migration name is required.
  pause
  exit /b 1
)

echo About to run:
echo   dotnet ef migrations add "%MIGRATION_NAME%"
echo   dotnet ef database update
set /p CONFIRM=Proceed? (y/n): 
if /i not "%CONFIRM%"=="y" (
  echo [INFO] Cancelled.
  pause
  exit /b 0
)

pushd "%~dp0..\BuilderPulsePro.Api"
dotnet ef migrations add "%MIGRATION_NAME%"
if errorlevel 1 (
  set EXITCODE=%ERRORLEVEL%
  popd
  echo [ERROR] Migration add failed with exit code %EXITCODE%.
  pause
  exit /b %EXITCODE%
)

dotnet ef database update
set EXITCODE=%ERRORLEVEL%
popd

if not %EXITCODE%==0 (
  echo [ERROR] Database update failed with exit code %EXITCODE%.
  pause
  exit /b %EXITCODE%
)

echo [OK] Migration added and database updated.
pause
exit /b 0
