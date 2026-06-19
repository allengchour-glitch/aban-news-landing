@echo off
REM ============================================================================
REM  LuxeStyle - SUPERBOT-SETUP (User 2026-06-19 "fix fuer super autonome bot")
REM  EIN Doppelklick. Selbst-heilend: raeumt Git-Lock weg, holt neuesten Code,
REM  schaltet den lock-verursachenden Dauer-Listener AB und registriert die
REM  ROBUSTEN Direkt-Tasks (VOLLAUTOMAT) - kein Worker-Poll, kein Listener, kein
REM  git im Hot-Path. Danach laeuft der Bot vollautonom + aktualisiert sich selbst.
REM ============================================================================
setlocal
set "DIR=%~dp0"
set "REPO=%~dp0..\.."
set "PSF=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File"
set "VA=%DIR%VOLLAUTOMAT.ps1"

echo [1/6] Haengende Prozesse beenden (loest Git-Lock)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM powershell.exe >nul 2>&1
REM Listener-Autostart entfernen (der hielt Dateien gesperrt):
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LuxeStyle-Bot.lnk" >nul 2>&1
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LuxeStyle-Listener.lnk" >nul 2>&1
schtasks /delete /tn "LuxeListener" /f >nul 2>&1
schtasks /delete /tn "LuxeWatchdog" /f >nul 2>&1

echo [2/6] Neuesten Code holen (lock-proof reset)...
cd /d "%REPO%"
attrib -R "%REPO%\*.*" /S /D >nul 2>&1
git fetch origin claude/luxestyle-product-CizQ6
git reset --hard origin/claude/luxestyle-product-CizQ6
git clean -fd

echo [3/6] Direkt-Tasks registrieren (VOLLAUTOMAT, kein git im Hot-Path)...
schtasks /create /f /tn "LuxeUpdate"  /sc daily /st 05:00 /tr "%PSF% \"%VA%\" -Mode update"
schtasks /create /f /tn "LuxePost-10" /sc daily /st 10:00 /tr "%PSF% \"%VA%\" -Mode post"
schtasks /create /f /tn "LuxePost-19" /sc daily /st 19:00 /tr "%PSF% \"%VA%\" -Mode post"
schtasks /create /f /tn "LuxeEng-09"  /sc daily /st 09:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeEng-12"  /sc daily /st 12:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeEng-15"  /sc daily /st 15:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeEng-21"  /sc daily /st 21:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeWeekly"  /sc weekly /d SUN /st 12:00 /tr "%PSF% \"%VA%\" -Mode weekly"

echo [4/6] Tasks duerfen PC wecken + aus Standby starten...
for %%T in (LuxeUpdate LuxePost-10 LuxePost-19 LuxeEng-09 LuxeEng-12 LuxeEng-15 LuxeEng-21) do (
  powershell -NoProfile -Command "$t=Get-ScheduledTask -TaskName '%%T' -ErrorAction SilentlyContinue; if($t){$s=$t.Settings;$s.WakeToRun=$true;$s.StartWhenAvailable=$true;$s.DisallowStartIfOnBatteries=$false;Set-ScheduledTask -TaskName '%%T' -Settings $s|Out-Null}" >nul 2>&1
)

echo [5/6] Brave-Port sicherstellen + JETZT 1x posten (Test)...
%PSF% "%VA%" -Mode post

echo [6/6] FERTIG. Der Bot laeuft jetzt vollautonom:
echo   - Update 05:00 (holt neuen Code, lock-proof)
echo   - Posten 10:00 + 19:00 (TikTok analyze+post+engage + Inserate)
echo   - Engagement 09/12/15/21 (analysieren/chatten/folgen)
echo   - Meta IG/FB laeuft separat ueber den Cloud-Worker (6x/Tag)
echo.
echo  Voraussetzung bleibt: Brave-Profil 'brave-agent' bei TikTok/IG eingeloggt.
pause
