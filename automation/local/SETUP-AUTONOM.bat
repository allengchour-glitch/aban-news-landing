@echo off
REM ============================================================================
REM  LuxeStyle — MASTER-AUTONOM-SETUP (User 2026-06-17 „mach e Bot das autonom louft")
REM  EINMAL als Administrator ausfuehren (Rechtsklick -> Als Administrator).
REM  Danach laeuft ALLES von selbst (PC ist eh immer an) — KEIN Tippen mehr noetig:
REM
REM   * PC-Listener  -> startet automatisch bei jedem Login + laeuft dauernd (Handy-Befehle + Bot)
REM   * Posten       -> 2x/Tag (10:00, 19:00)   beste Reels auf TikTok
REM   * Engagement   -> 4x/Tag (09/12/15/21)    analysieren + chatten + folgen (IG/TikTok) + FB-Gruppen
REM   * Tagesroutine -> 1x/Tag (08:00)          IG/FB-Kommentare, tutti/anibis, Merchant, BigBuy, lernen
REM   * Kampagne-Test-> 1x (heute 1h spaeter)   campaign-dry (kein Geld) -> Screenshots ins Repo fuer Pruefung
REM
REM  Voraussetzung (1x): Brave-Profil bei tiktok.com + instagram.com + facebook.com eingeloggt,
REM  und luxe-secrets.ps1 im Benutzerordner (Tokens). Dann nie mehr anfassen.
REM ============================================================================
setlocal
set "DIR=%~dp0"
set "PSF=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File"

echo [1/5] PC-Listener: Auto-Start bei jedem Login (Dauer-Bot) ...
schtasks /create /f /tn "LuxeListener" /sc onlogon /rl highest /tr "%PSF% \"%DIR%pc-listener.ps1\""
echo    (startet auch jetzt gleich)
start "" %PSF% "%DIR%pc-listener.ps1"

echo [2/5] Posten 2x/Tag ...
schtasks /create /f /tn "LuxePost-10" /sc daily /st 10:00 /tr "%PSF% \"%DIR%tiktok-cycle.ps1\""
schtasks /create /f /tn "LuxePost-19" /sc daily /st 19:00 /tr "%PSF% \"%DIR%tiktok-cycle.ps1\""

echo [3/5] Engagement 4x/Tag (analysieren/chatten/folgen) ...
schtasks /create /f /tn "LuxeEng-09" /sc daily /st 09:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""
schtasks /create /f /tn "LuxeEng-12" /sc daily /st 12:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""
schtasks /create /f /tn "LuxeEng-15" /sc daily /st 15:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""
schtasks /create /f /tn "LuxeEng-21" /sc daily /st 21:00 /tr "%PSF% \"%DIR%engagement-cycle.ps1\""

echo [4/5] Tages-Hauptroutine 1x/Tag (08:00) ...
schtasks /create /f /tn "LuxeDaily" /sc daily /st 08:00 /tr "%PSF% \"%DIR%run-follower-daily.ps1\""

echo [5/5] Kampagne-TESTLAUF einmalig heute (kein Geld, nur Screenshots zur Pruefung) ...
schtasks /create /f /tn "LuxeCampaignDry" /sc once /st 23:30 /tr "%PSF% -Command \"cd '%DIR%..\..'; node automation/local/tiktok-campaign-port.mjs --dry; git add automation/local/campaign-shots/*; git commit -m 'campaign-dry screenshots'; git push origin claude/luxestyle-product-CizQ6\""

echo.
echo ============================================================
echo  FERTIG. Alles laeuft jetzt autonom. Du musst NICHTS mehr tippen.
echo  Die Kampagne wird erst nach Pruefung der Screenshots scharf
echo  geschaltet (Sicherheit: 350 CHF). Status siehst du im Shop/Profil.
echo ============================================================
pause
