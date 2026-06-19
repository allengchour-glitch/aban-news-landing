@echo off
REM LuxeStyle - Brave SAUBER mit Debug-Port 9222 + brave-agent-Profil starten. Doppelklick.
REM Killt zuerst ALLE Brave (sonst wird der Port ignoriert), startet neu, prueft den Port.
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist %BRAVE% set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
echo [1/3] Alle Brave-Fenster schliessen (noetig, sonst kein Port)...
taskkill /F /IM brave.exe >nul 2>&1
timeout /t 3 >nul
echo [2/3] Brave mit Port 9222 + brave-agent starten...
start "" %BRAVE% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent" https://www.tiktok.com/login
timeout /t 8 >nul
echo [3/3] Port-Check:
curl -s http://localhost:9222/json/version
echo.
echo  ^=^> Steht oben JSON (mit "Browser"/"webSocketDebuggerUrl") = Port LAEUFT.
echo  Jetzt im Brave-Fenster bei TikTok einloggen, dann TIKTOK-PORT-UPLOAD.bat starten.
pause
