@echo off
title LuxeStyle - TikTok Klick-Starter
REM ========================================================================
REM  LuxeStyle — TikTok KLICK-STARTER (1 Doppelklick, kein Tippen, kein git).
REM  Macht alles selbst: Brave (brave-agent, Port 9222) starten, TikTok-Studio
REM  oeffnen, naechstes Reel posten. Postet DIREKT in den Feed (kein Entwickler-App/Review).
REM  Einzige Voraussetzung: im Brave-Fenster 1x bei tiktok.com eingeloggt sein.
REM ========================================================================
cd /d "%~dp0..\.."
echo === LuxeStyle TikTok Klick-Starter ===
echo Starte Brave (brave-agent) + oeffne TikTok-Upload...
powershell -ExecutionPolicy Bypass -Command "$b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not(Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; $o=Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue; if($o){ Start-Process $b 'https://www.tiktok.com/tiktokstudio/upload' } else { Start-Process $b ('--remote-debugging-port=9222 --user-data-dir=\"'+$env:USERPROFILE+'\brave-agent\" https://www.tiktok.com/tiktokstudio/upload'); Start-Sleep 20 }"
echo.
echo  Falls TikTok nach LOGIN fragt: im Brave-Fenster EINMAL einloggen.
echo  Wenn du eingeloggt bist und die Upload-Seite siehst:
pause
echo.
echo Lade naechstes Reel hoch...
node automation/local/tiktok-upload-browser.mjs
echo.
echo  FERTIG. Bei Fehler liegt ein Screenshot "tiktok-upload-diag.png" hier -
echo  den an Claude schicken, dann wird der Starter angepasst.
pause
