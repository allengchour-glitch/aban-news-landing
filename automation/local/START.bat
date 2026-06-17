@echo off
REM ============================================================================
REM  LuxeStyle — START.bat  (EINFACHSTE Aktivierung: 1 DOPPELKLICK, KEIN Admin)
REM  User „mach irgendwie dass es geit". Startet den PC-Listener jetzt + sorgt fuer Auto-Start
REM  bei jedem Login (Startup-Ordner, kein Admin noetig) + registriert die taeglichen Cycles
REM  als Benutzer-Tasks (ohne Admin-Rechte). Einfach doppelklicken — fertig.
REM  Voraussetzung: Brave bei tiktok/instagram/facebook eingeloggt; luxe-secrets.ps1 im %USERPROFILE%.
REM ============================================================================
setlocal
set "DIR=%~dp0"
set "PSF=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File"

echo [1/4] Neueste Skripte holen ...
cd /d "%DIR%..\.."
git pull origin claude/luxestyle-product-CizQ6

echo [2/4] PC-Listener JETZT starten (Dauer-Bot, Handy-Befehle) ...
start "" %PSF% "%DIR%pc-listener.ps1"

echo [3/4] Auto-Start bei jedem Login (Startup-Ordner, kein Admin) ...
powershell -NoProfile -Command "$wsh=New-Object -ComObject WScript.Shell; $lnk=$wsh.CreateShortcut([Environment]::GetFolderPath('Startup')+'\LuxeStyle-Bot.lnk'); $lnk.TargetPath='%~f0'; $lnk.WorkingDirectory='%DIR%'; $lnk.WindowStyle=7; $lnk.Save()"

echo [4/4] Taegliche Cycles registrieren (Benutzer-Tasks, kein Admin) ...
schtasks /create /f /tn "LuxePost-10"  /sc daily /st 10:00 /tr "%PSF% \"%DIR%tiktok-cycle.ps1\""      >nul 2>&1
schtasks /create /f /tn "LuxePost-19"  /sc daily /st 19:00 /tr "%PSF% \"%DIR%tiktok-cycle.ps1\""      >nul 2>&1
schtasks /create /f /tn "LuxeEng-09"   /sc daily /st 09:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""  >nul 2>&1
schtasks /create /f /tn "LuxeEng-12"   /sc daily /st 12:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""  >nul 2>&1
schtasks /create /f /tn "LuxeEng-15"   /sc daily /st 15:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""  >nul 2>&1
schtasks /create /f /tn "LuxeEng-21"   /sc daily /st 21:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""  >nul 2>&1
schtasks /create /f /tn "LuxeDaily"    /sc daily /st 08:00 /tr "%PSF% \"%DIR%run-follower-daily.ps1\"" >nul 2>&1

echo.
echo ============================================================
echo  FERTIG! Der Bot laeuft jetzt + startet bei jedem Login automatisch.
echo  Du kannst dieses Fenster schliessen. Nie mehr noetig.
echo ============================================================
timeout /t 8
