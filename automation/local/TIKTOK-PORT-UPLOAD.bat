@echo off
REM ========================================================================
REM  LuxeStyle — naechstes Reel auf TikTok hochladen ueber den Port (Brave-CDP).
REM  Doppelklick. Voraussetzung: Brave mit --remote-debugging-port=9222, bei TikTok eingeloggt.
REM  Zuerst Trockenlauf (Diagnose), dann nachfragen.
REM ========================================================================
cd /d "%~dp0..\.."
git pull origin claude/luxestyle-product-CizQ6 2>nul
echo TROCKENLAUF (zeigt nur, ob alles erkannt wird)...
node automation/local/tiktok-upload-browser.mjs --dry
echo.
set /p ok="Jetzt wirklich hochladen + posten? (j/n): "
if /i "%ok%"=="j" ( node automation/local/tiktok-upload-browser.mjs ) else ( echo Abgebrochen. )
echo.
pause
