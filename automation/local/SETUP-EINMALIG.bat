@echo off
REM ========================================================================
REM  LuxeStyle — EINMALIG doppelklicken. Richtet den taeglichen Marketing-Task ein.
REM  Danach laeuft ALLES taeglich automatisch (Follower, TikTok-Post, DMs,
REM  Kommentare) — du musst NIE wieder PowerShell tippen.
REM ========================================================================
schtasks /create /tn "LuxeMarketing" /sc daily /st 10:00 /f /rl LIMITED ^
  /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0run-follower-daily.ps1\""
echo.
if %errorlevel%==0 (
  echo  FERTIG! Der Task "LuxeMarketing" laeuft ab jetzt taeglich um 10:00 automatisch.
  echo  Voraussetzung: PC ist an + Brave-Profil "brave-agent" ist bei IG/TikTok eingeloggt.
) else (
  echo  Fehler beim Anlegen. Diese Datei als Administrator ausfuehren ^(Rechtsklick^).
)
echo.
pause
