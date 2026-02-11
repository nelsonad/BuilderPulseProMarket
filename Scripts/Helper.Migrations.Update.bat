@echo off
setlocal

echo About to run:
echo   dotnet ef database update
set /p CONFIRM=Proceed? (y/n): 
if /i not "%CONFIRM%"=="y" (
  echo [INFO] Cancelled.
  pause
  exit /b 0
)

pushd "%~dp0..\BuilderPulsePro.Api"
dotnet ef database update
set EXITCODE=%ERRORLEVEL%
popd

if not %EXITCODE%==0 (
  echo [ERROR] Database update failed with exit code %EXITCODE%.
  pause
  exit /b %EXITCODE%
)

echo [OK] Database updated.
pause
exit /b 0
