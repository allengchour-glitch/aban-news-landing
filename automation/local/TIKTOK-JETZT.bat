@echo off
REM LuxeStyle - TIKTOK-JETZT: Brave-Port + Posten in EINEM Doppelklick.
REM 1x bei TikTok einloggen (beim ersten Mal), danach laeuft alles in einem Rutsch.
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist %BRAVE% set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
cd /d "%~dp0..\.."
echo [1/4] Alle Brave schliessen (sonst kein Port)...
taskkill /F /IM brave.exe >nul 2>&1
timeout /t 3 >nul
echo [2/4] Brave mit Port 9222 + brave-agent starten...
start "" %BRAVE% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent" https://www.tiktok.com/login
timeout /t 10 >nul
echo [3/4] Port-Check:
curl -s http://localhost:9222/json/version | findstr webSocketDebuggerUrl >nul && echo PORT LAEUFT || echo PORT NICHT OFFEN - nochmal starten
echo.
echo  ==^> Falls noch NICHT bei TikTok eingeloggt: jetzt im Brave-Fenster einloggen, dann Enter druecken.
pause
echo [4/4] Poste naechstes Reel auf TikTok (stumm)...
node automation\local\tiktok-upload-browser.mjs
echo.
echo  Fertig. (Trend-Sound in der TikTok-App drueberlegen.)
pause
