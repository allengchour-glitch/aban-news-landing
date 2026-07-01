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
REM SINGLE-INSTANZ (User 2026-07-01 "10 mal gepostet" = mehrere Fenster liefen parallel):
REM wenn schon eine CLOUD-AN-Schleife lebt (Lock < 150 s alt), beendet sich dieses Fenster sofort.
powershell -NoProfile -Command "$l=Join-Path $env:TEMP 'luxe-cloudan.lock'; if(Test-Path $l){ $a=((Get-Date)-(Get-Item $l).LastWriteTime).TotalSeconds; if($a -lt 150){ exit 7 } }; exit 0"
if errorlevel 7 (
  echo.
  echo   CLOUD-AN laeuft BEREITS in einem anderen Fenster.
  echo   Dieses Fenster schliesst sich - NIE mehrere gleichzeitig laufen lassen.
  echo.
  pause
  exit /b
)
echo ============================================================
echo   LuxeStyle CLOUD-AN laeuft. Fenster offen lassen.
echo   Der PC fuehrt jetzt Cloud-Befehle automatisch aus.
echo ============================================================

:loop
REM Lebenszeichen fuer den Single-Instanz-Check (alle 2 Min erneuert)
powershell -NoProfile -Command "Set-Content -Path (Join-Path $env:TEMP 'luxe-cloudan.lock') -Value $PID" 2>nul
REM --- HAENGE-WACHHUND (2026-06-24): killt node-Bots >15 Min (echte Haenger). 15 statt 8, damit der LANGE
REM     Campaign-Wizard (~12 Min, eigener Watchdog) NICHT vorzeitig gekillt wird. Loop kann trotzdem nicht ewig einfrieren.
powershell -NoProfile -Command "Get-Process node -EA SilentlyContinue | Where-Object {$_.StartTime -lt (Get-Date).AddMinutes(-15)} | Stop-Process -Force -EA SilentlyContinue" 2>nul
REM --- SELBSTHEILUNG (2026-06-21): npm/Build kann package.json dirty machen -> blockiert git pull -> Deadlock.
REM     Jede Runde aufraeumen, damit cmd-poll sich IMMER updaten + pushen kann. So gibt es nie wieder einen Deadlock.
git checkout -- package.json package-lock.json 2>nul
git fetch origin claude/luxestyle-product-CizQ6 2>nul
REM SELBST-UPDATE ERZWINGEN (2026-06-23): fetch allein aktualisiert den Arbeitsbaum NICHT -> neuer Code
REM (cmd-poll, git-Befehlskanal) kaeme nie an. Hard-Reset auf Remote = PC laeuft IMMER mit neuestem Code.
REM Safe: cmd-poll committet+pusht seine Screenshots SELBST -> nichts Uncommittetes geht verloren.
git reset --hard origin/claude/luxestyle-product-CizQ6 2>nul

REM --- Brave-Agent auf 9222 sicherstellen (fuer die Browser-Bots) ---
powershell -NoProfile -Command "if(-not(Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue)){$b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not(Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; if(Test-Path $b){Start-Process $b -ArgumentList '--remote-debugging-port=9222','--remote-allow-origins=*',('--user-data-dir='+$env:USERPROFILE+'\brave-agent'); Start-Sleep 12}}" 2>nul

REM --- Cloud-Befehle holen + ausfuehren (cmd-poll self-pullt neuen Code + drained die Queue + pusht Ergebnisse) ---
powershell -ExecutionPolicy Bypass -File "automation\local\cmd-poll.ps1" 2>nul

echo [%date% %time%] Poll fertig - naechster in 2 Min...
REM FIX 2026-06-22: 'timeout' bricht ab, wenn stdin umgeleitet ist (Start-Process/Task-Kontext) -> der
REM Loop machte nur EINE Runde und stoppte. 'ping' ist ein robuster Sleep ohne stdin-Abhaengigkeit.
ping -n 121 127.0.0.1 >nul
goto loop
