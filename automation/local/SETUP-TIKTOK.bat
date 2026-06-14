@echo off
REM ============================================================================
REM  LuxeStyle — TikTok-Autopost komplett scharfschalten. DOPPELKLICK.
REM  Macht OAuth -> Worker-Secrets -> Deploy. Du: 1x in der App Redirect-URI/Scopes
REM  setzen + 1x "Autorisieren" klicken. Rest laeuft automatisch.
REM ============================================================================
cd /d "%~dp0..\.."
git pull origin claude/luxestyle-product-CizQ6 2>nul
powershell -ExecutionPolicy Bypass -File "%~dp0setup-tiktok.ps1"
pause
