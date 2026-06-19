@echo off
REM LuxeStyle - Brave mit Debug-Port 9222 + brave-agent-Profil starten (fuer TikTok-Bot). Doppelklick.
REM Danach in DIESEM Fenster bei tiktok.com (+ instagram.com) EINLOGGEN - das Profil merkt es sich.
set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist %BRAVE% set BRAVE="C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"
echo Schliesse zuerst ALLE normalen Brave-Fenster (sonst bindet der Port nicht).
echo Starte Brave (Profil brave-agent) mit Port 9222...
start "" %BRAVE% --remote-debugging-port=9222 --user-data-dir="%USERPROFILE%\brave-agent" https://www.tiktok.com/login
echo.
echo  Jetzt im neuen Brave-Fenster bei TikTok einloggen. Dann TIKTOK-PORT-UPLOAD.bat starten.
pause
