@echo off
REM LuxeStyle - TikTok MAX: analysieren + posten + Kommentare beantworten. Doppelklick.
setlocal
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist %BRAVE% set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
netstat -ano | findstr ":9222 " >nul || start "" %BRAVE% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent"
timeout /t 8 >nul
cd /d "%~dp0\..\.."
git pull --rebase origin claude/luxestyle-product-CizQ6 2>nul
node automation\local\tiktok-bot.mjs max
echo. & echo TikTok MAX fertig (analysiert + gepostet + engaged).
pause
