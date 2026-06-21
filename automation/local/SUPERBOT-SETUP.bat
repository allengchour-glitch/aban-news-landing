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

echo [3/6] Direkt-Tasks registrieren (VOLLAUTOMAT, kein git im Hot-Path)...
schtasks /create /f /tn "LuxeUpdate"  /sc daily /st 05:00 /tr "%PSF% \"%VA%\" -Mode update"
schtasks /create /f /tn "LuxePost-10" /sc daily /st 10:00 /tr "%PSF% \"%VA%\" -Mode post"
schtasks /create /f /tn "LuxePost-19" /sc daily /st 19:00 /tr "%PSF% \"%VA%\" -Mode post"
schtasks /create /f /tn "LuxeEng-09"  /sc daily /st 09:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeEng-12"  /sc daily /st 12:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeEng-15"  /sc daily /st 15:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeEng-21"  /sc daily /st 21:00 /tr "%PSF% \"%VA%\" -Mode engage"
schtasks /create /f /tn "LuxeWeekly"  /sc weekly /d SUN /st 12:00 /tr "%PSF% \"%VA%\" -Mode weekly"

echo [3b/6] NEU: GIGA-Bot (ALLE TikTok-Wege Fallback) + Fernsteuerung + SEO...
set "AB=%DIR%tiktok-giga-bot.ps1"
set "CP=%DIR%cmd-poll.ps1"
set "SP=%REPO%\automation\seo_polish.mjs"
REM GIGA-Bot 2x/Tag: API -> Browser -> Browserbase (erster Erfolg gewinnt, postet nur 1x)
schtasks /create /f /tn "LuxeAutobot-11" /sc daily /st 11:30 /tr "%PSF% \"%AB%\""
schtasks /create /f /tn "LuxeAutobot-18" /sc daily /st 18:30 /tr "%PSF% \"%AB%\""
REM Fernsteuerung: holt Cloud-Befehle alle 10 Min (du steuerst vom Handy)
schtasks /create /f /tn "LuxeCmd" /sc minute /mo 10 /tr "%PSF% \"%CP%\""
REM SEO-Meta in Batches (taeglich, idempotent - fuellt die ~2900 leeren nach und nach)
schtasks /create /f /tn "LuxeSEO" /sc daily /st 04:30 /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command \"cd '%REPO%'; . $env:USERPROFILE\luxe-secrets.ps1; $env:MAX=200; node automation/seo_polish.mjs\""
REM PRODUKTE HOLEN (taeglich): BigBuy-Premium = bestes Markenmaterial, alle Kategorien, idempotent
schtasks /create /f /tn "LuxeProducts" /sc daily /st 03:30 /tr "%PSF% \"%DIR%bigbuy-premium.ps1\""
REM SELBST-CHECK (alle 6h, OHNE User): Posting-Live-Check gepostet/doppel/Fehler -> committet Report
schtasks /create /f /tn "LuxeHealth" /sc hourly /mo 6 /tr "%PSF% \"%DIR%scheduled-health.ps1\""

echo [4/6] Tasks duerfen PC wecken + aus Standby starten...
for %%T in (LuxeUpdate LuxePost-10 LuxePost-19 LuxeEng-09 LuxeEng-12 LuxeEng-15 LuxeEng-21 LuxeAutobot-11 LuxeAutobot-18 LuxeCmd LuxeSEO LuxeProducts) do (
  powershell -NoProfile -Command "$t=Get-ScheduledTask -TaskName '%%T' -ErrorAction SilentlyContinue; if($t){$s=$t.Settings;$s.WakeToRun=$true;$s.StartWhenAvailable=$true;$s.DisallowStartIfOnBatteries=$false;Set-ScheduledTask -TaskName '%%T' -Settings $s|Out-Null}" >nul 2>&1
)

echo [4b/6] Zeitlimit setzen (haengt ein Task, killt Windows ihn -> Brave+Locks frei, Bot friert nie ein)...
for %%T in (LuxeCmd) do (
  powershell -NoProfile -Command "$t=Get-ScheduledTask -TaskName '%%T' -ErrorAction SilentlyContinue; if($t){$s=$t.Settings;$s.ExecutionTimeLimit='PT20M';Set-ScheduledTask -TaskName '%%T' -Settings $s|Out-Null}" >nul 2>&1
)
for %%T in (LuxePost-10 LuxePost-19 LuxeEng-09 LuxeEng-12 LuxeEng-15 LuxeEng-21 LuxeAutobot-11 LuxeAutobot-18) do (
  powershell -NoProfile -Command "$t=Get-ScheduledTask -TaskName '%%T' -ErrorAction SilentlyContinue; if($t){$s=$t.Settings;$s.ExecutionTimeLimit='PT45M';Set-ScheduledTask -TaskName '%%T' -Settings $s|Out-Null}" >nul 2>&1
)

echo [5/6] Brave-Port sicherstellen (KEIN Test-Post mehr - sonst Doppel-Posts bei mehrfachem Start)...
powershell -NoProfile -Command "if(-not(Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue)){$b='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'; if(-not(Test-Path $b)){$b='C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'}; if(Test-Path $b){Start-Process $b -ArgumentList '--remote-debugging-port=9222',('--user-data-dir='+$env:USERPROFILE+'\brave-agent'); Start-Sleep 18}}"

echo [5b/6] EINMAL-EINRICHTUNG jetzt ausfuehren (Konten+Pixel, IG/TikTok-Profil, Marktplatz, Health)...
cd /d "%REPO%"
node "automation\local\tiktok-accounts-analyze.mjs"
node "automation\local\social-profile-update.mjs"
node "automation\local\marketplace-capture.mjs"
node "automation\local\marketplace-profile.mjs"
node "automation\local\ai-browser-test.mjs"
node "automation\local\post-health.mjs"
git add -f automation/local/account-shots/* automation/local/profile-shots/* automation/local/marketplace-shots/* reports/*.json 2>nul
git commit -m "auto(setup): Einmal-Einrichtung via SUPERBOT (Konten/Profile/Markt/Pixel/Health)" 2>nul
git pull --rebase origin claude/luxestyle-product-CizQ6 2>nul
git push origin claude/luxestyle-product-CizQ6 2>nul

echo [6/6] FERTIG. Der EINE Bot laeuft jetzt vollautonom:
echo   - Update 05:00 (holt neuen Code, lock-proof)
echo   - Produkte holen 03:30 (BigBuy-Premium, bestes Material)
echo   - SEO 04:30 (fuellt Meta-Beschreibungen in Batches)
echo   - TikTok-API-Autobot 11:30 + 18:30 (postet per API - zuverlaessig, kein Brave)
echo   - Posten 10:00 + 19:00 (Browser-Backup: analyze+post+engage + Inserate)
echo   - Engagement 09/12/15/21 (analysieren/chatten/folgen)
echo   - Fernsteuerung alle 10 Min (du steuerst vom Handy)
echo   - Meta IG/FB laeuft separat ueber den Cloud-Worker (6x/Tag)
echo.
echo  Voraussetzung: luxe-secrets.ps1 mit TT_*-Tokens (nach OAuth/Audit) +
echo  Brave-Profil 'brave-agent' bei TikTok/IG eingeloggt (fuer Browser-Backup).
pause
