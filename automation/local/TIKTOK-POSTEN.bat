@echo off
REM ========================================================================
REM  LuxeStyle — TikTok-Reel als ENTWURF hochladen (Doppelklick, kein Tippen).
REM  Laedt die TikTok-Tokens aus luxe-secrets.ps1 und postet das naechste Reel.
REM  Du legst dann in der TikTok-App den Trend-Sound drauf + veroeffentlichst.
REM ========================================================================
cd /d "%~dp0..\.."
powershell -ExecutionPolicy Bypass -Command ". \"$env:USERPROFILE\luxe-secrets.ps1\"; if (-not $env:TT_PRIVACY_LEVEL) { $env:TT_PRIVACY_LEVEL='DRAFT' }; node automation/tiktok-autopost.mjs"
echo.
echo  Fertig. Schau in der TikTok-App unter Entwuerfe.
pause
