@echo off
title CashRich - servidor local
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Necesitas Node.js: https://nodejs.org
  echo.
  pause
  exit /b
)

if not exist node_modules call npm install
if not exist dist\server.cjs call npm run build
start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:3000/tv"
set NODE_ENV=production
node dist\server.cjs
pause
