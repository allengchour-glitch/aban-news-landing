@echo off
REM ============================================================================
REM  LuxeStyle - TIKTOK-AUTONOM (User 2026-06-19 "alles nur fuer tiktok")
REM  EIN Doppelklick. Macht TikTok dauerhaft + neustart-fest autonom:
REM   - raeumt Git-Lock weg, holt neuesten Code
REM   - registriert NUR TikTok-Tasks (posten 11:00 + 18:00, engagen 14:00)
REM   - jeder Lauf startet Brave-Port selbst (killt zu, startet brave-agent) + postet
REM   - Update 05:00 holt neue Reels
REM  Voraussetzung 1x: brave-agent-Profil bei TikTok eingeloggt (TIKTOK-JETZT.bat).
REM ============================================================================
setlocal
set "DIR=%~dp0"
set "REPO=%~dp0..\.."
set "PSF=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File"
set "VA=%DIR%VOLLAUTOMAT.ps1"

echo [1/5] Locks loesen + neuesten Code holen...
taskkill /F /IM node.exe >nul 2>&1
cd /d "%REPO%"
attrib -R "%REPO%\*.*" /S /D >nul 2>&1
git fetch origin claude/luxestyle-product-CizQ6
git reset --hard origin/claude/luxestyle-product-CizQ6

echo [2/5] Alte Tasks weg (sauberer Stand)...
for %%T in (LuxePost-10 LuxePost-19 LuxeEng-09 LuxeEng-12 LuxeEng-15 LuxeEng-21 LuxeListener LuxeWatchdog) do schtasks /delete /tn "%%T" /f >nul 2>&1

echo [3/5] NUR TikTok-Tasks registrieren...
schtasks /create /f /tn "LuxeUpdate"   /sc daily /st 05:00 /tr "%PSF% \"%VA%\" -Mode update"
schtasks /create /f /tn "LuxeTikTok-11" /sc daily /st 11:00 /tr "%PSF% \"%VA%\" -Mode tiktok"
schtasks /create /f /tn "LuxeTikTok-18" /sc daily /st 18:00 /tr "%PSF% \"%VA%\" -Mode tiktok"
schtasks /create /f /tn "LuxeTikTok-Eng" /sc daily /st 14:00 /tr "%PSF% \"%VA%\" -Mode tiktok"

echo [4/5] Tasks duerfen PC wecken + aus Standby starten...
for %%T in (LuxeUpdate LuxeTikTok-11 LuxeTikTok-18 LuxeTikTok-Eng) do (
  powershell -NoProfile -Command "$t=Get-ScheduledTask -TaskName '%%T' -ErrorAction SilentlyContinue; if($t){$s=$t.Settings;$s.WakeToRun=$true;$s.StartWhenAvailable=$true;$s.DisallowStartIfOnBatteries=$false;Set-ScheduledTask -TaskName '%%T' -Settings $s|Out-Null}" >nul 2>&1
)

echo [5/5] JETZT 1x TikTok posten (Test)...
%PSF% "%VA%" -Mode tiktok
echo.
echo  FERTIG. TikTok laeuft jetzt autonom + neustart-fest:
echo   posten 11:00 + 18:00, engagen 14:00, Update 05:00.
echo   (Voraussetzung: brave-agent bei TikTok eingeloggt + PC an/eingeloggt.)
pause
