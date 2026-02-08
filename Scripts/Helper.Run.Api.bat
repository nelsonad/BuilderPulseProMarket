@echo off
setlocal

cd /d %~dp0
dotnet watch --project ..\BuilderPulsePro.Api\BuilderPulsePro.Api.csproj

endlocal
