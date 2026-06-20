@echo off
REM OAUTH-PASTE.bat - TikTok-Token holen OHNE Portal-Aenderung (nutzt Redirect luxestyle.ch/).
REM Du gibst Key+Secret ein, oeffnest 1 URL, fuegst den Code ein -> Token landet in luxe-secrets.ps1.
cd /d "%~dp0..\.."
echo === TikTok OAuth (Paste-Weg, kein localhost noetig) ===
echo Sandbox-Client-Key ist: sbawgg40q8nkfuwl5k
set /p KEY=TikTok Client Key (Enter = sbawgg40q8nkfuwl5k):
if "%KEY%"=="" set KEY=sbawgg40q8nkfuwl5k
set /p SECRET=TikTok Client Secret:
set TT_CLIENT_KEY=%KEY%
set TT_CLIENT_SECRET=%SECRET%
node automation/tiktok-oauth-paste.mjs
echo.
pause
