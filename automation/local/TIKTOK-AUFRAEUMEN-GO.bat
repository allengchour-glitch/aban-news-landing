@echo off
REM LuxeStyle - TikTok Verlierer WIRKLICH loeschen (max 5/Lauf, Gewinner+keep geschuetzt).
setlocal
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist %BRAVE% set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
netstat -ano | findstr ":9222 " >nul || start "" %BRAVE% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
timeout /t 8 >nul
cd /d "%~dp0\..\.."
node automation\local\tiktok-bot.mjs analyze --max 80
node automation\local\tiktok-bot.mjs delete --losers --min-views 80 --max 5 --go
echo. & echo Geloescht (siehe reports\tiktok-deleted.txt)
pause
