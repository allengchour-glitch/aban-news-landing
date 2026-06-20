@echo off
REM SETUP-TIKTOK-AUTOBOT.bat - registriert den TikTok-Autobot als taeglichen Zeitplan (2x/Tag).
REM Einmal als Admin doppelklicken. Danach postet der Bot selbst (DRAFT vor Audit, PUBLIC danach).
set A=powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tiktok-autobot.ps1"
schtasks /create /f /tn "LuxeTikTokAutobot-11" /sc daily /st 11:00 /tr "%A%"
schtasks /create /f /tn "LuxeTikTokAutobot-18" /sc daily /st 18:00 /tr "%A%"
echo.
echo Autobot registriert (11:00 + 18:00 taeglich). Voraussetzung: TT_* in luxe-secrets.ps1.
pause
