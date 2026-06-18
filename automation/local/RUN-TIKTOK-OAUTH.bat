@echo off
REM ========================================================================
REM  LuxeStyle — TikTok-Token holen (EINMALIG). Fragt Client Key + Secret,
REM  oeffnet den TikTok-Login, faengt den Code ab und druckt
REM  TT_ACCESS_TOKEN + TT_REFRESH_TOKEN. Diese dann als Worker-Secrets setzen.
REM
REM  VORHER in developers.tiktok.com (deine App):
REM   - Redirect URI:  http://localhost:8723/callback
REM   - Products: Login Kit + Content Posting API
REM   - Scopes: user.info.basic, video.upload, video.publish
REM ========================================================================
cd /d "%~dp0..\.."
set /p KEY=TikTok Client Key:
set /p SECRET=TikTok Client Secret:
set TT_CLIENT_KEY=%KEY%
set TT_CLIENT_SECRET=%SECRET%
node automation/tiktok-oauth.mjs
echo.
echo  Kopiere TT_ACCESS_TOKEN + TT_REFRESH_TOKEN von oben.
echo  Naechster Schritt: SET-TIKTOK-SECRETS.bat (setzt sie im Worker + deployt).
pause
