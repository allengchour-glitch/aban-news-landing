@echo off
REM LuxeStyle - TikTok analysieren (eigene Videos -> Report + Gehirn). Doppelklick.
setlocal
set PORT=9222
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist %BRAVE% set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
netstat -ano | findstr ":9222 " >nul || start "" %BRAVE% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
timeout /t 8 >nul
cd /d "%~dp0\..\.."
node automation\local\tiktok-bot.mjs analyze --max 80
echo. & echo Fertig. Report in reports\tiktok-stats.csv
pause
