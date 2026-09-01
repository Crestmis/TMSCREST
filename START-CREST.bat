@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo          CREST - STARTER APP
echo ========================================

echo.
node -v >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js 20 LTS or newer, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies. This may take a minute...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting CREST...
echo Open the URL shown by Vite, normally http://localhost:5173
call npm run dev
pause
