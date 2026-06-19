@echo off
REM LuxeStyle - Worker selbst-deployen (nur bei Aenderung). Doppelklick.
cd /d "%~dp0\..\.."
git pull --rebase origin claude/luxestyle-product-CizQ6
powershell -ExecutionPolicy Bypass -File "%~dp0worker-autodeploy.ps1"
echo. & echo Fertig.
pause
