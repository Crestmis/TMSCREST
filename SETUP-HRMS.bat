@echo off
setlocal EnableExtensions EnableDelayedExpansion

title ABC ENTERPRISE HRMS - DEPENDENCY SETUP

REM ==========================================================
REM        ABC ENTERPRISE HRMS
REM        AUTO DEPENDENCY SETUP / REPAIR
REM ==========================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

set "NVM_STATUS=NOT CHECKED"
set "NODE_STATUS=NOT CHECKED"
set "NPM_STATUS=NOT CHECKED"
set "PYTHON_STATUS=NOT CHECKED"
set "BACKEND_STATUS=NOT CHECKED"
set "FRONTEND_STATUS=NOT CHECKED"
set "SQLITE_STATUS=NOT CHECKED"

set "NODE_EXE="
set "NPM_CMD="
set "NODE_SELECTED="

cls

echo.
echo ==========================================================
echo              ABC ENTERPRISE HRMS
echo              DEPENDENCY SETUP / REPAIR
echo ==========================================================
echo.
echo Project folder:
echo %ROOT%
echo.

REM ==========================================================
REM STEP 1 - PROJECT CHECK
REM ==========================================================

echo [1/8] Checking project structure...
echo.

if not exist "%ROOT%" (
    echo [FAILED] Project folder not found.
    echo.
    goto FINAL_SUMMARY
)

if not exist "%BACKEND%\package.json" (
    echo [FAILED] Backend package.json not found.
    echo Expected:
    echo %BACKEND%\package.json
    echo.
    goto FINAL_SUMMARY
)

if not exist "%FRONTEND%\package.json" (
    echo [FAILED] Frontend package.json not found.
    echo Expected:
    echo %FRONTEND%\package.json
    echo.
    goto FINAL_SUMMARY
)

echo [OK] Project structure found.
echo [OK] Backend found.
echo [OK] Frontend found.
echo.

REM ==========================================================
REM STEP 2 - WINGET
REM ==========================================================

echo [2/8] Checking Windows Package Manager...
echo.

where winget >nul 2>&1

if errorlevel 1 (
    echo [WARNING] winget is not available.
    echo Automatic installation cannot be performed.
    echo.
    echo Install Microsoft App Installer and run this setup again.
    echo.
    goto FINAL_SUMMARY
)

echo [OK] winget available.
echo.

REM ==========================================================
REM STEP 3 - NVM
REM ==========================================================

echo [3/8] Checking NVM for Windows...
echo.

where nvm >nul 2>&1

if errorlevel 1 (

    echo NVM is not installed.
    echo.
    echo Installing NVM for Windows...
    echo.

    winget install CoreyButler.NVMforWindows --accept-package-agreements --accept-source-agreements

    if errorlevel 1 (
        echo [FAILED] NVM installation failed.
        set "NVM_STATUS=FAILED"
        echo.
        goto FINAL_SUMMARY
    )

    echo.
    echo [INSTALLED] NVM installation completed.
    set "NVM_STATUS=INSTALLED"
    echo.

    echo ==========================================================
    echo IMPORTANT
    echo ==========================================================
    echo.
    echo Windows environment variables have just changed.
    echo This setup will NOT close this window automatically.
    echo.
    echo Please press any key to continue after Windows has
    echo finished the installation.
    echo.

    pause >nul

    echo.
    echo Rechecking NVM...
    echo.

    where nvm >nul 2>&1

    if errorlevel 1 (
        echo [ACTION NEEDED] NVM is installed but this CMD session
        echo cannot see it yet.
        echo.
        echo Close this window manually and run SETUP.bat again.
        echo.
        goto FINAL_SUMMARY
    )
)

if "%NVM_STATUS%"=="NOT CHECKED" set "NVM_STATUS=ALREADY PRESENT"

echo [OK] NVM available.
echo.
nvm version
echo.

REM ==========================================================
REM STEP 4 - NODE 22
REM ==========================================================

echo [4/8] Checking Node.js 22...
echo.

echo Installed Node versions:
echo.
nvm list
echo.

REM Prefer exact 22.23.2
nvm list | findstr /C:"22.23.2" >nul 2>&1

if not errorlevel 1 (
    set "NODE_SELECTED=22.23.2"
    echo Preferred version 22.23.2 found.
)

REM Otherwise find any Node 22
if not defined NODE_SELECTED (

    for /f "tokens=1" %%A in ('nvm list ^| findstr /R /C:"22\.[0-9]"') do (
        if not defined NODE_SELECTED (
            set "NODE_SELECTED=%%A"
        )
    )

)

REM Remove possible v prefix
if defined NODE_SELECTED (
    set "NODE_SELECTED=!NODE_SELECTED:v=!"
)

REM Install Node 22 if unavailable
if not defined NODE_SELECTED (

    echo Node.js 22 is not installed.
    echo.
    echo Installing Node.js 22...
    echo.

    nvm install 22

    if errorlevel 1 (
        echo [FAILED] Node.js 22 installation failed.
        set "NODE_STATUS=FAILED"
        echo.
        goto FINAL_SUMMARY
    )

    echo.
    echo [INSTALLED] Node.js 22 installation completed.
    echo.

    for /f "tokens=1" %%A in ('nvm list ^| findstr /R /C:"22\.[0-9]"') do (
        if not defined NODE_SELECTED (
            set "NODE_SELECTED=%%A"
        )
    )
)

if not defined NODE_SELECTED (
    echo [FAILED] No Node.js 22 version could be found.
    set "NODE_STATUS=FAILED"
    echo.
    goto FINAL_SUMMARY
)

echo Selected Node.js: !NODE_SELECTED!
echo.

REM Activate
call nvm use !NODE_SELECTED!

if errorlevel 1 (
    echo [FAILED] Could not activate Node.js !NODE_SELECTED!.
    set "NODE_STATUS=FAILED"
    echo.
    goto FINAL_SUMMARY
)

echo.
echo NVM reports:
nvm current
echo.

REM ==========================================================
REM FIND NVM NODE LOCATION
REM ==========================================================

set "NVM_NODE=%NVM_SYMLINK%"

if not defined NVM_NODE (
    set "NVM_NODE=C:\nvm4w\nodejs"
)

echo NVM Node directory:
echo %NVM_NODE%
echo.

REM Add NVM location to current session
if exist "%NVM_NODE%" (
    set "PATH=%NVM_NODE%;%PATH%"
)

REM ==========================================================
REM FIND NODE.EXE
REM ==========================================================

set "NODE_EXE="

if exist "%NVM_NODE%\node.exe" (
    set "NODE_EXE=%NVM_NODE%\node.exe"
)

if not defined NODE_EXE (

    for /f "delims=" %%A in ('where node 2^>nul') do (
        if not defined NODE_EXE (
            set "NODE_EXE=%%A"
        )
    )

)

REM ==========================================================
REM FIND NPM.CMD
REM ==========================================================

set "NPM_CMD="

if exist "%NVM_NODE%\npm.cmd" (
    set "NPM_CMD=%NVM_NODE%\npm.cmd"
)

if not defined NPM_CMD (

    for /f "delims=" %%A in ('where npm.cmd 2^>nul') do (
        if not defined NPM_CMD (
            set "NPM_CMD=%%A"
        )
    )

)

REM ==========================================================
REM VERIFY NODE
REM ==========================================================

if not defined NODE_EXE (

    echo [FAILED] node.exe could not be found.
    echo.
    echo NVM says Node is installed, but the executable is unavailable.
    echo.
    set "NODE_STATUS=NEEDS REPAIR"
    goto NPM_CHECK
)

echo Testing Node.js:
echo "%NODE_EXE%"
echo.

"%NODE_EXE%" -v

if errorlevel 1 (

    echo.
    echo [FAILED] Node.js executable cannot be started.
    echo.
    set "NODE_STATUS=NEEDS REPAIR"

) else (

    echo.
    echo [OK] Node.js is working.
    set "NODE_STATUS=READY"

)

REM ==========================================================
REM VERIFY NPM
REM ==========================================================

:NPM_CHECK

echo.
echo Checking npm...
echo.

if not defined NPM_CMD (

    echo [FAILED] npm.cmd could not be found.
    set "NPM_STATUS=NEEDS REPAIR"
    goto PYTHON_CHECK
)

echo npm executable:
echo "%NPM_CMD%"
echo.

call "%NPM_CMD%" -v

if errorlevel 1 (

    echo.
    echo [FAILED] npm cannot be executed.
    set "NPM_STATUS=NEEDS REPAIR"

) else (

    echo.
    echo [OK] npm is working.
    set "NPM_STATUS=READY"

)

REM ==========================================================
REM STEP 5 - PYTHON
REM ==========================================================

:PYTHON_CHECK

echo.
echo [5/8] Checking Python...
echo.

where python >nul 2>&1

if errorlevel 1 (

    echo Python is not installed.
    echo.
    echo Python may be required for native Node modules.
    echo.

    choice /C YN /N /M "Install Python 3.12 now? [Y/N]: "

    if errorlevel 2 (

        echo.
        echo [SKIPPED] Python installation skipped.
        set "PYTHON_STATUS=SKIPPED"

    ) else (

        echo.
        echo Installing Python 3.12...
        echo.

        winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements

        if errorlevel 1 (

            echo.
            echo [FAILED] Python installation failed.
            set "PYTHON_STATUS=FAILED"

        ) else (

            echo.
            echo [INSTALLED] Python 3.12 installation completed.
            set "PYTHON_STATUS=INSTALLED"
            echo.
            echo Press any key to continue.
            pause >nul

            where python >nul 2>&1

            if errorlevel 1 (
                echo.
                echo [ACTION NEEDED] Python is installed but this CMD
                echo session cannot see the new PATH yet.
                set "PYTHON_STATUS=INSTALLED - RESTART CMD"
            )
        )
    )

) else (

    python --version
    echo [OK] Python available.
    set "PYTHON_STATUS=READY"

)

echo.

REM ==========================================================
REM STEP 6 - BACKEND
REM ==========================================================

echo [6/8] Installing / repairing Backend dependencies...
echo.

if not defined NPM_CMD (

    echo [SKIPPED] npm unavailable.
    set "BACKEND_STATUS=SKIPPED - npm unavailable"
    goto FRONTEND_INSTALL

)

if not "%NPM_STATUS%"=="READY" (

    echo [SKIPPED] npm is not working.
    set "BACKEND_STATUS=SKIPPED - npm unavailable"
    goto FRONTEND_INSTALL

)

cd /d "%BACKEND%"

echo Backend:
echo %BACKEND%
echo.

echo Running npm install...
echo.

call "%NPM_CMD%" install

if errorlevel 1 (

    echo.
    echo [FAILED] Backend npm install failed.
    set "BACKEND_STATUS=FAILED"

) else (

    echo.
    echo [OK] Backend npm install completed.
    set "BACKEND_STATUS=INSTALLED"

)

REM ==========================================================
REM STEP 7 - FRONTEND
REM ==========================================================

:FRONTEND_INSTALL

echo.
echo [7/8] Installing / repairing Frontend dependencies...
echo.

if not defined NPM_CMD (

    echo [SKIPPED] npm unavailable.
    set "FRONTEND_STATUS=SKIPPED - npm unavailable"
    goto FINAL_VERIFY

)

if not "%NPM_STATUS%"=="READY" (

    echo [SKIPPED] npm is not working.
    set "FRONTEND_STATUS=SKIPPED - npm unavailable"
    goto FINAL_VERIFY

)

cd /d "%FRONTEND%"

echo Frontend:
echo %FRONTEND%
echo.

echo Running npm install...
echo.

call "%NPM_CMD%" install

if errorlevel 1 (

    echo.
    echo [FAILED] Frontend npm install failed.
    set "FRONTEND_STATUS=FAILED"

) else (

    echo.
    echo [OK] Frontend npm install completed.
    set "FRONTEND_STATUS=INSTALLED"

)

REM ==========================================================
REM STEP 8 - FINAL VERIFICATION
REM ==========================================================

:FINAL_VERIFY

echo.
echo [8/8] Final installation verification...
echo.

if exist "%BACKEND%\node_modules" (
    echo Backend node_modules: PRESENT
) else (
    echo Backend node_modules: MISSING
    set "BACKEND_STATUS=FAILED - node_modules missing"
)

if exist "%BACKEND%\node_modules\better-sqlite3" (
    echo better-sqlite3: PRESENT
    set "SQLITE_STATUS=INSTALLED"
) else (
    echo better-sqlite3: NOT FOUND
    set "SQLITE_STATUS=NOT FOUND"
)

if exist "%FRONTEND%\node_modules" (
    echo Frontend node_modules: PRESENT
) else (
    echo Frontend node_modules: MISSING
    set "FRONTEND_STATUS=FAILED - node_modules missing"
)

echo.

REM ==========================================================
REM FINAL SUMMARY
REM ==========================================================

:FINAL_SUMMARY

echo.
echo.
echo ==========================================================
echo                 ABC ENTERPRISE HRMS
echo                    SETUP SUMMARY
echo ==========================================================
echo.

echo PROJECT
echo ----------------------------------------------------------
if exist "%ROOT%" (
    echo Project folder       : PRESENT
) else (
    echo Project folder       : NOT FOUND
)

if exist "%BACKEND%" (
    echo Backend folder       : PRESENT
) else (
    echo Backend folder       : NOT FOUND
)

if exist "%FRONTEND%" (
    echo Frontend folder      : PRESENT
) else (
    echo Frontend folder      : NOT FOUND
)

echo.

echo NVM / NODE.JS / NPM
echo ----------------------------------------------------------
echo NVM                   : !NVM_STATUS!
echo Node.js               : !NODE_STATUS!
echo npm                   : !NPM_STATUS!

if defined NODE_SELECTED (
    echo Selected Node       : !NODE_SELECTED!
)

echo.

echo PYTHON
echo ----------------------------------------------------------
echo Python                : !PYTHON_STATUS!

echo.

echo BACKEND
echo ----------------------------------------------------------
echo Backend dependencies  : !BACKEND_STATUS!
echo better-sqlite3        : !SQLITE_STATUS!

if exist "%BACKEND%\node_modules" (
    echo node_modules         : PRESENT
) else (
    echo node_modules         : MISSING
)

echo.

echo FRONTEND
echo ----------------------------------------------------------
echo Frontend dependencies : !FRONTEND_STATUS!

if exist "%FRONTEND%\node_modules" (
    echo node_modules         : PRESENT
) else (
    echo node_modules         : MISSING
)

echo.

REM ==========================================================
REM DETERMINE OVERALL RESULT
REM ==========================================================

set "OVERALL=READY"

if "!NODE_STATUS!"=="FAILED" set "OVERALL=ACTION REQUIRED"
if "!NODE_STATUS!"=="NEEDS REPAIR" set "OVERALL=ACTION REQUIRED"

if "!NPM_STATUS!"=="FAILED" set "OVERALL=ACTION REQUIRED"
if "!NPM_STATUS!"=="NEEDS REPAIR" set "OVERALL=ACTION REQUIRED"

if "!BACKEND_STATUS!"=="FAILED" set "OVERALL=ACTION REQUIRED"
if "!FRONTEND_STATUS!"=="FAILED" set "OVERALL=ACTION REQUIRED"

if not exist "%BACKEND%\node_modules" set "OVERALL=ACTION REQUIRED"
if not exist "%FRONTEND%\node_modules" set "OVERALL=ACTION REQUIRED"

echo ==========================================================
echo                    FINAL STATUS
echo ==========================================================
echo.

if "!OVERALL!"=="READY" (

    echo                  SETUP COMPLETE
    echo.
    echo All required HRMS dependencies are ready.
    echo.
    echo You can now run:
    echo.
    echo     START-HRMS.bat
    echo.

) else (

    echo               SETUP NEEDS ATTENTION
    echo.
    echo One or more components need attention.
    echo.
    echo Review the status above.
    echo.
    echo Recommended action:
    echo     1. Fix any item marked FAILED or NEEDS REPAIR.
    echo     2. Run SETUP.bat again.
    echo     3. Run START-HRMS.bat only after dependencies are READY.
    echo.

)

echo ==========================================================
echo.
echo SETUP PROCESS FINISHED
echo.
echo This window will NOT close automatically.
echo.
echo Press any key to close this window.
echo ==========================================================
echo.

pause >nul

endlocal
exit /b 0