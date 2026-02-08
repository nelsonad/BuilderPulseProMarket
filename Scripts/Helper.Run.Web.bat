@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "WEB_DIR=%SCRIPT_DIR%..\BuilderPulsePro.Web"

cd /d "%WEB_DIR%" || exit /b 1
npm run dev

endlocal