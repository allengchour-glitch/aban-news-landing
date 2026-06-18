@echo off
REM ========================================================================
REM  LuxeStyle — TikTok autonom scharfschalten (EINMALIG, 1 Login).
REM  1) fragt Client Key + Secret (werden NIE ins Repo geschrieben)
REM  2) OAuth: Browser oeffnet -> bei TikTok einloggen + erlauben
REM  3) Tokens werden in luxe-secrets.ps1 GEMERGT (andere Secrets bleiben)
REM  4) setzt Worker-Secrets (TT_CLIENT_KEY/SECRET/REFRESH) + deployt
REM  Danach laedt der Worker autonom TikTok-Drafts hoch (du tippst in der App "Posten").
REM
REM  VORHER in developers.tiktok.com (deine App):
REM   - Redirect URI:  http://localhost:8723/callback
REM   - Products: Login Kit + Content Posting API · Scopes: user.info.basic, video.upload, video.publish
REM ========================================================================
cd /d "%~dp0..\.."
set /p KEY=TikTok Client Key:
set /p SECRET=TikTok Client Secret:
set TT_CLIENT_KEY=%KEY%
set TT_CLIENT_SECRET=%SECRET%
echo.
echo  Browser oeffnet sich -> bei TikTok EINLOGGEN + erlauben...
node automation/tiktok-oauth.mjs
echo.
echo  Setze Worker-Secrets + deploye (kann 1 Min dauern)...
powershell -ExecutionPolicy Bypass -Command ". \"$env:USERPROFILE\luxe-secrets.ps1\"; if(-not $env:TT_REFRESH_TOKEN){Write-Host 'Kein Refresh-Token - OAuth nicht abgeschlossen?'; exit 1}; Push-Location automation/cloudflare/luxe-poster; Write-Output $env:TT_CLIENT_KEY | wrangler secret put TT_CLIENT_KEY; Write-Output $env:TT_CLIENT_SECRET | wrangler secret put TT_CLIENT_SECRET; Write-Output $env:TT_REFRESH_TOKEN | wrangler secret put TT_REFRESH_TOKEN; wrangler deploy; Pop-Location"
echo.
echo  FERTIG! Der Worker laedt ab jetzt bei jedem Cron TikTok-Video-Drafts hoch.
pause
