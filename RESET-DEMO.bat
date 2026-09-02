@echo off
echo To reset the CREST demo database:
echo 1. Open the app in your browser.
echo 2. Press F12 to open DevTools, then click "Console".
echo 3. Paste this line and press Enter:
echo.
echo    localStorage.removeItem('crest_demo_store_v7'); localStorage.removeItem('crest_calendar_view_v1'); localStorage.removeItem('crest_settings_v1'); location.reload();
echo.
pause
