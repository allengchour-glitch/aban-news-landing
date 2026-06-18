@echo off
REM ========================================================================
REM  LuxeStyle — Fernbedienung EINSCHALTEN (1x doppelklicken).
REM  Holt neueste Skripte (git pull), startet Brave mit Debug-Port + den
REM  PC-Listener. Danach steuert die Cloud alle PC-Browser-Aufgaben.
REM  Voraussetzung: im Brave-Fenster 'brave-agent' bei ads.tiktok.com +
REM  Instagram/TikTok EINGELOGGT sein. Fenster offen lassen.
REM ========================================================================
cd /d "%~dp0..\.."
echo Hole neueste Skripte...
git pull origin claude/luxestyle-product-CizQ6
echo Starte Listener (neues Fenster offen lassen)...
start "LuxeStyle Listener" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0pc-listener.ps1"
echo.
echo  Listener gestartet. Im neuen Fenster steht, ob Port 9222 offen ist
echo  und ob du im brave-agent-Brave bei ads.tiktok.com eingeloggt sein musst.
echo.
pause
