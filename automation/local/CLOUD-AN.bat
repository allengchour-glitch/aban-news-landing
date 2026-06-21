@echo off
REM ============================================================================
REM  LuxeStyle - CLOUD-AN  (User 2026-06-21 "pc mit klick tool dann kannst du selber ausfuehren")
REM  EIN Doppelklick = der PC haengt sich dauerhaft an die Cloud:
REM   - stellt Brave-Agent auf Port 9222 sicher (fuer TikTok/IG/Marktplatz-Bots)
REM   - holt + fuehrt Cloud-Befehle (campaign-data / markt-profil / ...) alle 2 Min aus
REM   - laeuft in einer Endlos-Schleife (zuverlaessiger als der Scheduled-Task, der nicht feuerte)
REM  Fenster offen lassen. Damit kann die Cloud-Session ALLES selbst ausloesen - kein Tippen mehr.
REM ============================================================================
title LuxeStyle CLOUD-AN  (NICHT schliessen - PC hoert auf Cloud-Befehle)
cd /d "%~dp0..\.."
echo ============================================================
echo   LuxeStyle CLOUD-AN laeuft. Fenster offen lassen.
echo   Der PC fuehrt jetzt Cloud-Befehle automatisch aus.
echo ============================================================

:loop
REM --- SELBSTHEILUNG (2026-06-21): npm/Build kann package.json dirty machen -> blockiert git pull -> Deadlock.
REM     Jede Runde aufraeumen, damit cmd-poll sich IMMER updaten + pushen kann. So gibt es nie wieder einen Deadlock.
git checkout -- package.json package-lock.json 2>nul
git fetch origin claude/luxestyle-product-CizQ6 2>nul

REM --- Brave-Agent auf 9222 sicherstellen (fuer die Browser-Bots) ---
powershell -NoProfile -Command "if(-not(Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue)){$b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not(Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; if(Test-Path $b){Start-Process $b -ArgumentList '--remote-debugging-port=9222',('--user-data-dir='+$env:USERPROFILE+'\brave-agent'); Start-Sleep 12}}" 2>nul

REM --- Cloud-Befehle holen + ausfuehren (cmd-poll self-pullt neuen Code + drained die Queue + pusht Ergebnisse) ---
powershell -ExecutionPolicy Bypass -File "automation\local\cmd-poll.ps1" 2>nul

echo [%date% %time%] Poll fertig - naechster in 2 Min...
timeout /t 120 /nobreak >nul
goto loop
