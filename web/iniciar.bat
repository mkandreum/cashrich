@echo off
title FLUJO LIBRE - servidor local
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Necesitas Node.js para jugar la version digital.
  echo  Descargalo gratis en https://nodejs.org
  echo.
  pause
  exit /b
)

echo.
echo  Abriendo el tablero en el navegador...
start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:3000"
node server.js

pause
