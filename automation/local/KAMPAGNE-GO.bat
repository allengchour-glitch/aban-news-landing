@echo off
REM ========================================================================
REM  LuxeStyle — TikTok-Kampagne ECHT STARTEN (Budget-Cap 350 im Skript).
REM  GIT-FREI: kein git pull, kein Listener, kein Worker. NUR ausfuehren,
REM  wenn der TESTLAUF (KAMPAGNE-DRY.bat) sauber durchlief!
REM ========================================================================
cd /d "%~dp0..\.."
echo ACHTUNG: Das erstellt + sendet eine ECHTE Kampagne (Budget-Cap 350 CHF).
echo Nur weiter, wenn der Testlauf ok war.
pause
echo Stelle Brave-Debug-Port 9222 sicher...
powershell -ExecutionPolicy Bypass -Command "$o=Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue; if(-not $o){ $b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not (Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; Start-Process $b ('--remote-debugging-port=9222 --user-data-dir=\"'+$env:USERPROFILE+'\brave-agent\"'); Start-Sleep 18 }"
set AUTO_LAUNCH=1
node automation\local\tiktok-campaign-port.mjs
echo.
echo Fertig. Pruefe im Ads Manager, ob die Kampagne in Pruefung ist.
pause
