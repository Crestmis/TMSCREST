@echo off
setlocal EnableExtensions EnableDelayedExpansion

title ABC ENTERPRISE HRMS - BACKEND

echo.
echo ==============================================
echo          ABC ENTERPRISE HRMS
echo          BACKEND STARTER
echo ==============================================
echo.

REM ==================================================
REM 1. AUTO-DETECT THIS BAT FILE LOCATION
REM ==================================================

set "ROOT=%~dp0"

REM Remove trailing slash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BACKEND=%ROOT%\backend"

echo Project:
echo %ROOT%
echo.

REM ==================================================
REM 2. CHECK BACKEND FOLDER
REM ==================================================

if not exist "%BACKEND%" (
    echo ERROR: Backend folder was not found.
    echo.
    echo Expected:
    echo %BACKEND%
    echo.
    pause
    exit /b 1
)

cd /d "%BACKEND%"

echo Backend folder detected successfully.
echo.

REM ==================================================
REM 3. CHECK NVM
REM ==================================================

where nvm >nul 2>&1

if errorlevel 1 (
    echo ERROR: NVM was not found.
    echo.
    echo Please install NVM for Windows and restart CMD.
    echo.
    pause
    exit /b 1
)

echo NVM detected.
echo.

REM ==================================================
REM 4. SELECT NODE VERSION
REM ==================================================

echo Detecting available Node.js version...
echo.

set "NODE_SELECTED="

REM First try exact requested version
nvm list | findstr /C:"22.23.2" >nul 2>&1

if not errorlevel 1 (
    echo Node.js 22.23.2 found.
    set "NODE_SELECTED=22.23.2"
)

REM If exact version is unavailable, find Node 22
if not defined NODE_SELECTED (
    for /f "tokens=1" %%A in ('nvm list ^| findstr /R /C:"22\.[0-9]"') do (
        if not defined NODE_SELECTED set "NODE_SELECTED=%%A"
    )
)

REM If Node 22 is unavailable, use current NVM version
if not defined NODE_SELECTED (
    for /f "tokens=*" %%A in ('nvm current') do set "NODE_SELECTED=%%A"
)

REM Remove possible "v" prefix
if defined NODE_SELECTED (
    set "NODE_SELECTED=!NODE_SELECTED:v=!"
)

if not defined NODE_SELECTED (
    echo ERROR: No usable Node.js version was found.
    echo.
    echo Installed versions:
    nvm list
    echo.
    pause
    exit /b 1
)

echo Selected Node.js: !NODE_SELECTED!
echo.

REM ==================================================
REM 5. ACTIVATE NODE
REM ==================================================

echo Activating Node.js...
call nvm use !NODE_SELECTED!

if errorlevel 1 (
    echo.
    echo ERROR: NVM could not activate Node.js.
    echo.
    pause
    exit /b 1
)

echo.

REM ==================================================
REM 6. REFRESH NODE PATH
REM ==================================================

set "NVM_NODE=%NVM_SYMLINK%"

if not defined NVM_NODE (
    set "NVM_NODE=C:\nvm4w\nodejs"
)

if exist "%NVM_NODE%\node.exe" (
    set "PATH=%NVM_NODE%;%PATH%"
)

if exist "%NVM_NODE%\npm.cmd" (
    set "PATH=%NVM_NODE%;%PATH%"
)

REM ==================================================
REM 7. FIND NODE
REM ==================================================

set "NODE_EXE="

if exist "%NVM_NODE%\node.exe" (
    set "NODE_EXE=%NVM_NODE%\node.exe"
)

if not defined NODE_EXE (
    for /f "delims=" %%A in ('where node 2^>nul') do (
        if not defined NODE_EXE set "NODE_EXE=%%A"
    )
)

if not defined NODE_EXE (
    echo ERROR: Node.js executable could not be found.
    echo.
    pause
    exit /b 1
)

REM ==================================================
REM 8. FIND NPM
REM ==================================================

set "NPM_CMD="

if exist "%NVM_NODE%\npm.cmd" (
    set "NPM_CMD=%NVM_NODE%\npm.cmd"
)

if not defined NPM_CMD (
    for /f "delims=" %%A in ('where npm.cmd 2^>nul') do (
        if not defined NPM_CMD set "NPM_CMD=%%A"
    )
)

if not defined NPM_CMD (
    echo ERROR: npm.cmd could not be found.
    echo.
    echo Node location:
    echo %NODE_EXE%
    echo.
    pause
    exit /b 1
)

REM ==================================================
REM 9. VERIFY NODE + NPM
REM ==================================================

echo ==============================================
echo          ENVIRONMENT CHECK
echo ==============================================
echo.

echo Node executable:
echo %NODE_EXE%

echo.
echo Node version:
"%NODE_EXE%" -v

if errorlevel 1 (
    echo.
    echo ERROR: Node.js could not be executed.
    echo.
    pause
    exit /b 1
)

echo.
echo npm executable:
echo %NPM_CMD%

echo.
echo npm version:
call "%NPM_CMD%" -v

if errorlevel 1 (
    echo.
    echo ERROR: npm could not be executed.
    echo.
    pause
    exit /b 1
)

REM ==================================================
REM 10. CHECK package.json
REM ==================================================

echo.
echo Checking backend package.json...

if not exist "%BACKEND%\package.json" (
    echo.
    echo ERROR: package.json was not found in backend.
    echo.
    pause
    exit /b 1
)

echo package.json found.

REM ==================================================
REM 11. START BACKEND
REM ==================================================

echo.
echo ==============================================
echo          SETUP CHECK COMPLETE
echo ==============================================
echo.
echo Node : 
"%NODE_EXE%" -v

echo npm  :
call "%NPM_CMD%" -v

echo.
echo Backend:
echo %BACKEND%

echo.
echo ==============================================
echo          STARTING BACKEND
echo ==============================================
echo.

call "%NPM_CMD%" start

echo.
echo ==============================================
echo          BACKEND STOPPED
echo ==============================================
echo.
echo The backend process has ended.
echo Close this window or press any key to exit.
echo.

pause
endlocal