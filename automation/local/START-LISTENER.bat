@echo off
REM ========================================================================
REM  LuxeStyle — Handy-Fernbedienung EINSCHALTEN (1x doppelklicken).
REM  Startet den PC-Listener: lauscht am Cloudflare-Worker auf deine Handy-
REM  Knoepfe und fuehrt tutti / TikTok / Follower auf dem PC aus.
REM  Voraussetzung: PC an + Brave-Profil "brave-agent" auf tutti.ch + TikTok eingeloggt.
REM  Fenster offen lassen (oder minimieren). Schliessen = Fernbedienung aus.
REM ========================================================================
start "LuxeStyle Listener" powershell -ExecutionPolicy Bypass -File "%~dp0pc-listener.ps1"
echo.
echo  Listener gestartet. Ab jetzt kannst du vom Handy ueber control.html
echo  (oder die Worker-URL ?key=...&cmd=tutti) tutti/TikTok ausloesen.
echo.
