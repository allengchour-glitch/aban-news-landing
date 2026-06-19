@echo off
REM LuxeStyle - TikTok-Kampagne TESTLAUF (--dry, KEIN Geld). Git-frei, mit Brave-Port-Fix.
REM Voraussetzung: im brave-agent-Brave bei ads.tiktok.com EINGELOGGT.
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist %BRAVE% set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
cd /d "%~dp0..\.."
echo [1/3] Brave-Port 9222 sicherstellen (alle Brave killen, falls Port zu)...
netstat -ano | findstr ":9222 " >nul
if errorlevel 1 (
  taskkill /F /IM brave.exe >nul 2>&1
  timeout /t 3 >nul
  start "" %BRAVE% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent" https://ads.tiktok.com
  timeout /t 12 >nul
)
echo [2/3] Falls noetig: im Brave-Fenster bei ads.tiktok.com einloggen, dann Enter.
pause
echo [3/3] Kampagnen-TESTLAUF (--dry, gibt KEIN Geld aus)...
node automation\local\tiktok-campaign-port.mjs --dry
echo.
echo Fertig. Screenshots in automation\local\campaign-shots\ -> schick sie mir, ich pruefe + dann KAMPAGNE-GO.bat.
pause
