@echo off
REM ========================================================================
REM  LuxeStyle — TikTok-Kampagne TESTLAUF (kein Geld). GIT-FREI:
REM  kein git pull, kein Listener, kein Worker -> kein Git-Lock moeglich.
REM  Stellt Brave (Profil brave-agent) mit Debug-Port 9222 selbst sicher,
REM  dann laeuft der Bot direkt + zeigt jeden Schritt im Fenster.
REM  Voraussetzung: im brave-agent-Brave bei ads.tiktok.com eingeloggt.
REM ========================================================================
cd /d "%~dp0..\.."
echo Stelle Brave-Debug-Port 9222 sicher...
powershell -ExecutionPolicy Bypass -Command "$o=Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue; if(-not $o){ $b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not (Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; Start-Process $b ('--remote-debugging-port=9222 --user-data-dir=\"'+$env:USERPROFILE+'\brave-agent\"'); Start-Sleep 18; Write-Host 'Brave gestartet - bitte bei ads.tiktok.com einloggen, falls noetig.' } else { Write-Host 'Port 9222 bereits offen - gut.' }"
echo.
echo Starte Kampagnen-TESTLAUF (--dry, gibt KEIN Geld aus)...
node automation\local\tiktok-campaign-port.mjs --dry
echo.
echo Fertig. Screenshots in automation\local\campaign-shots\ . Fenster offen lassen.
pause
