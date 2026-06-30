@echo off
REM ========================================================================
REM  LuxeStyle - GIT-KANAL WIEDERBELEBEN (1 Doppelklick).
REM  Loest den haengenden Zustand: ein abgebrochener Befehl hat die Datei
REM  cloud-commands-done.txt "dirty" liegen lassen -> jeder git pull --rebase
REM  bricht ab -> der ganze Bot steht. Dieses Skript wirft die Junk-Aenderung
REM  weg, holt den frischen Stand und startet den Poller 1x.
REM ========================================================================
cd /d "%~dp0..\.."
echo [1/5] Aktueller git-Status:
git status --short
echo.
echo [2/5] Lokale Junk-Aenderungen wegstashen (Screenshots/done-file)...
git stash --include-untracked
echo.
echo [3/5] Frischen Stand holen (rebase)...
git pull --rebase origin claude/luxestyle-product-CizQ6
echo.
echo [4/5] Gestashte Junk-Aenderung verwerfen (wird nicht gebraucht)...
git stash drop
echo.
echo [5/5] Brave-Debug-Port sicherstellen + Poller 1x laufen lassen...
powershell -ExecutionPolicy Bypass -Command "$o=Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue; if(-not $o){ $b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not (Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; Start-Process $b ('--remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir=\"'+$env:USERPROFILE+'\brave-agent\"'); Start-Sleep 18 }"
powershell -ExecutionPolicy Bypass -File "%~dp0cmd-poll.ps1"
echo.
echo Fertig. Der git-Kanal sollte wieder frei sein und der Bot laeuft.
pause
