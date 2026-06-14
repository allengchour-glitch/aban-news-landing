@echo off
REM ========================================================================
REM  LuxeStyle — alte FB-Posts (vor 10.06.) loeschen. Doppelklick, kein Tippen.
REM  Nur Facebook (Instagram kann man per API NICHT loeschen -> in der App).
REM  Erst Vorschau (DRY), dann nachfragen.
REM ========================================================================
cd /d "%~dp0..\.."
echo VORSCHAU (es wird noch NICHTS geloescht):
powershell -ExecutionPolicy Bypass -Command ". \"$env:USERPROFILE\luxe-secrets.ps1\"; $env:DRY_RUN='1'; node automation/local/delete-old-fb-posts.mjs"
echo.
set /p ok="Diese alten FB-Posts wirklich loeschen? (j/n): "
if /i "%ok%"=="j" (
  powershell -ExecutionPolicy Bypass -Command ". \"$env:USERPROFILE\luxe-secrets.ps1\"; node automation/local/delete-old-fb-posts.mjs"
) else (
  echo Abgebrochen - nichts geloescht.
)
echo.
pause
