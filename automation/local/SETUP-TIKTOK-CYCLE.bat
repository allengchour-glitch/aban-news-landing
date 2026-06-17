@echo off
REM ============================================================================
REM  LuxeStyle — EI-KLICK-SETUP: TikTok/Social autonom (User 2026-06-17)
REM  „PC louft immer, mehrmals analysiere/chatte/folge, selten poste"
REM
REM  POSTEN (tiktok-cycle.ps1)         = 2x/Tag  (10:00, 19:00)   -> frisches Top-Reel + Analyse
REM  ENGAGEMENT (engagement-cycle.ps1) = 4x/Tag  (09/12/15/21)    -> analysieren+chatten+folgen (KEIN Posten)
REM
REM  EINMAL als Administrator ausfuehren (Rechtsklick -> Als Administrator).
REM  Laeuft danach fuer immer (PC ist eh an). Loeschen: schtasks /delete /tn "LuxeXX" /f
REM  Voraussetzung: Brave-Profil bei tiktok.com + instagram.com eingeloggt.
REM ============================================================================
setlocal
set "POST=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0tiktok-cycle.ps1\""
set "ENG=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0engagement-cycle.ps1\""

echo Registriere POSTEN 2x/Tag ...
schtasks /create /f /tn "LuxePost-10" /sc daily /st 10:00 /tr "%POST%"
schtasks /create /f /tn "LuxePost-19" /sc daily /st 19:00 /tr "%POST%"

echo Registriere ENGAGEMENT 4x/Tag (analysieren/chatten/folgen) ...
schtasks /create /f /tn "LuxeEng-09" /sc daily /st 09:00 /tr "%ENG%"
schtasks /create /f /tn "LuxeEng-12" /sc daily /st 12:00 /tr "%ENG%"
schtasks /create /f /tn "LuxeEng-15" /sc daily /st 15:00 /tr "%ENG%"
schtasks /create /f /tn "LuxeEng-21" /sc daily /st 21:00 /tr "%ENG%"
echo.
echo FERTIG. Posten 2x/Tag + Engagement (analyse/chat/folge) 4x/Tag - autonom.
pause
