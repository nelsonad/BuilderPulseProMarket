@echo off
setlocal
set "SCRIPT_DIR=%~dp0"

start "" "%SCRIPT_DIR%Helper.Run.Api.bat"
start "" "%SCRIPT_DIR%Helper.Run.Web.bat"