# LuxeStyle — setup-tiktok.ps1 · TikTok-Autopost komplett scharfschalten (am PC).
# Macht ALLES Skriptbare: OAuth -> Tokens -> Worker-Secrets -> Deploy.
# Du machst nur: 1× in der TikTok-App die Redirect-URI/Scopes setzen (s.u.) + 1× "Autorisieren" klicken.
#
# VORAUSSETZUNG (1×, in der TikTok-Developer-App "LuxeStyle Poster"):
#   - Produkte: "Login Kit" + "Content Posting API"
#   - Scopes:   user.info.basic, video.upload, video.publish
#   - Redirect URI:  http://localhost:8723/callback      <-- EXAKT so
#   - wrangler muss bei Cloudflare eingeloggt sein (sonst macht das Skript `wrangler login`).

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # ..\..\ = Repo-Root
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"

Write-Host "=== LuxeStyle TikTok-Setup ===" -ForegroundColor Cyan
Write-Host "Hast du in der TikTok-App die Redirect-URI http://localhost:8723/callback + Scopes (video.upload/publish) gesetzt?" -ForegroundColor Yellow
Read-Host "Wenn ja, Enter druecken (sonst Strg+C, erst in der App eintragen)"

# Client Key/Secret holen (aus luxe-secrets.ps1 falls da, sonst fragen)
if (Test-Path $secrets) { . $secrets }
if (-not $env:TT_CLIENT_KEY)    { $env:TT_CLIENT_KEY    = Read-Host "TikTok Client Key" }
if (-not $env:TT_CLIENT_SECRET) { $env:TT_CLIENT_SECRET = Read-Host "TikTok Client Secret" }

Write-Host "`n[1/3] OAuth — Browser oeffnet sich, bitte EINMAL 'Autorisieren' klicken ..." -ForegroundColor Green
node automation/tiktok-oauth.mjs
if (-not (Test-Path $secrets)) { Write-Host "[FEHLER] OAuth hat keine Tokens geschrieben. Abbruch." -ForegroundColor Red; exit 1 }
. $secrets   # laedt jetzt TT_REFRESH_TOKEN
if (-not $env:TT_REFRESH_TOKEN) { Write-Host "[FEHLER] Kein Refresh-Token. Abbruch." -ForegroundColor Red; exit 1 }

Write-Host "`n[2/3] Cloudflare-Login pruefen ..." -ForegroundColor Green
Push-Location automation/cloudflare/luxe-poster
try { npx wrangler whoami | Out-Null } catch { npx wrangler login }

Write-Host "`n[3/3] Worker-Secrets setzen + deployen ..." -ForegroundColor Green
$env:TT_CLIENT_KEY    | npx wrangler secret put TT_CLIENT_KEY
$env:TT_CLIENT_SECRET | npx wrangler secret put TT_CLIENT_SECRET
$env:TT_REFRESH_TOKEN | npx wrangler secret put TT_REFRESH_TOKEN
npx wrangler deploy
Pop-Location

Write-Host "`n✅ FERTIG. Der Worker laedt ab jetzt 3x/Tag ein Reel in deine TikTok-Entwuerfe." -ForegroundColor Cyan
Write-Host "   Du legst nur den Trend-Sound drauf + tippst 'Posten'." -ForegroundColor Cyan
