@echo off
REM ============================================================================
REM  LuxeStyle - SETUP-NOCLICK (User 2026-06-19 „mach e Bot wo klickt", nicht zuhause)
REM  EINMAL ausfuehren (am besten als Administrator). Danach faehrt der Bot nach
REM  Crash / Reboot / Login KOMPLETT VON SELBST wieder hoch - nie mehr ein Klick.
REM
REM   1) Watchdog (alle 10 Min) - belebt den Listener wieder, wenn er stirbt
REM   2) Listener-Autostart bei jedem Login + Startup-Ordner (Doppel-Sicherung)
REM   3) Tages-Tasks WECKEN den PC + laufen auch aus dem Standby
REM   4) OPTIONAL Auto-Login: PC loggt sich nach Neustart selbst ein (Passwort wird
REM      nur jetzt abgefragt, landet NICHT im Repo) - so klappt's auch ferngesteuert.
REM ============================================================================
setlocal
set "DIR=%~dp0"
set "PSF=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File"

echo [1/4] Watchdog alle 10 Min ...
schtasks /create /f /tn "LuxeWatchdog" /sc minute /mo 10 /tr "%PSF% \"%DIR%WATCHDOG.ps1\""

echo [2/4] Listener Autostart bei Login + jetzt starten ...
schtasks /create /f /tn "LuxeListener" /sc onlogon /tr "%PSF% \"%DIR%pc-listener.ps1\""
start "" %PSF% "%DIR%pc-listener.ps1"

echo [3/4] Tages-Tasks duerfen den PC WECKEN (aus Standby laufen) ...
for %%T in (LuxePost-10 LuxePost-19 LuxeEng-09 LuxeEng-12 LuxeEng-15 LuxeEng-21 LuxeDaily LuxeWatchdog) do (
  schtasks /change /tn "%%T" /ENABLE >nul 2>&1
  powershell -NoProfile -Command "$t=Get-ScheduledTask -TaskName '%%T' -ErrorAction SilentlyContinue; if($t){$s=$t.Settings; $s.WakeToRun=$true; $s.StartWhenAvailable=$true; $s.DisallowStartIfOnBatteries=$false; Set-ScheduledTask -TaskName '%%T' -Settings $s | Out-Null}" 2>nul
)

echo.
echo [4/4] Auto-Login einrichten? (PC loggt sich nach Neustart SELBST ein)
echo      Damit laeuft der Bot auch wenn du nicht zuhause bist und der PC neu startet.
set /p AL="   Auto-Login aktivieren? (j/n): "
if /i "%AL%"=="j" (
  set /p PW="   Windows-Passwort (wird NUR in die lokale Registry geschrieben, NICHT ins Repo): "
  powershell -NoProfile -Command "$u=$env:USERNAME; $k='HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'; Set-ItemProperty $k AutoAdminLogon '1'; Set-ItemProperty $k DefaultUserName $u; Set-ItemProperty $k DefaultPassword '%PW%'; Write-Host '   Auto-Login aktiv fuer' $u" 2>nul
  echo    Fertig. (Auto-Login wieder aus: AutoAdminLogon auf 0 setzen.)
) else (
  echo    Auto-Login uebersprungen. Tipp: PC einfach an + eingeloggt lassen, dann reicht der Watchdog.
)

echo.
echo ============================================================
echo  FERTIG. Der Bot heilt sich jetzt selbst (Watchdog) und startet
echo  nach Reboot/Login automatisch. Solange der PC AN ist, klickt
echo  nie wieder jemand. (Einen AUSgeschalteten PC kann keine Software
echo  einschalten - dafuer Auto-Login + PC anlassen.)
echo ============================================================
pause
