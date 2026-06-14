@echo off
REM ========================================================================
REM  LuxeStyle — JETZT doppelklicken, um den Marketing-Lauf sofort zu starten
REM  (Follower holen, TikTok posten, IG+TikTok-DMs + Kommentare beantworten).
REM  Holt vorher automatisch die neuesten Aenderungen (git pull).
REM ========================================================================
powershell -ExecutionPolicy Bypass -File "%~dp0run-follower-daily.ps1"
echo.
echo  Lauf beendet. Fenster kann geschlossen werden.
pause
