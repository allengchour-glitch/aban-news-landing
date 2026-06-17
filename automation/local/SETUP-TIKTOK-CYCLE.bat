@echo off
REM ============================================================================
REM  LuxeStyle — EI-KLICK-SETUP: TikTok mehrmals am Tag posten+analysieren
REM  (User 2026-06-17 „PC louft immer, TikTok louft am beste, gib alles")
REM  Registriert 4 taegliche Windows-Tasks, die tiktok-cycle.ps1 ausfuehren:
REM    10:00 / 13:00 / 16:00 / 20:00  = 4 frische Posts/Tag + Analyse je Lauf.
REM  EINMAL als Administrator ausfuehren (Rechtsklick -> Als Administrator).
REM  Laeuft danach fuer immer (PC ist eh an). Deinstallieren: schtasks /delete /tn "LuxeTikTok-XX"
REM ============================================================================
setlocal
set "PS=%~dp0tiktok-cycle.ps1"
set "CMD=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS%\""

echo Registriere TikTok-Cycle-Tasks fuer: %PS%
schtasks /create /f /tn "LuxeTikTok-10" /sc daily /st 10:00 /tr "%CMD%"
schtasks /create /f /tn "LuxeTikTok-13" /sc daily /st 13:00 /tr "%CMD%"
schtasks /create /f /tn "LuxeTikTok-16" /sc daily /st 16:00 /tr "%CMD%"
schtasks /create /f /tn "LuxeTikTok-20" /sc daily /st 20:00 /tr "%CMD%"
echo.
echo FERTIG. TikTok postet+analysiert jetzt 4x/Tag automatisch (10/13/16/20 Uhr).
echo Voraussetzung: Brave-Profil bei tiktok.com eingeloggt.
pause
