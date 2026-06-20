# tiktok-autobot.ps1 - ASCII only. MAX-AUTO TikTok-Bot (API-Weg, kein Brave/PC-Browser noetig).
# Laeuft im Zeitplan. Macht ALLES selbst:
#   1) luxe-secrets.ps1 laden (TT_CLIENT_KEY/SECRET/ACCESS_TOKEN/REFRESH_TOKEN, TT_PRIVACY_LEVEL)
#   2) Token selbst erneuern (tiktok-autopost.mjs validiert + refresht via refresh_token, 1 Jahr gueltig)
#   3) Naechstes faelliges Reel posten:
#        - VOR App-Audit:  TT_PRIVACY_LEVEL=DRAFT  -> landet im TikTok-Posteingang (Sandbox = nur Test!)
#        - NACH App-Audit: TT_PRIVACY_LEVEL=PUBLIC_TO_EVERYONE -> direkt OEFFENTLICH, vollautomatisch, null Taps
#   4) Analyse (oeffentlich via yt-dlp + Gehirn) + Stand committen.
# Voraussetzung: luxe-secrets.ps1 mit TT_*-Werten (Production nach Audit). Ohne Token = sauberer No-op.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }

if (-not $env:TT_ACCESS_TOKEN) {
  Write-Host "Kein TT_ACCESS_TOKEN in luxe-secrets.ps1 -> No-op. (Nach OAuth/Audit eintragen.)"
  exit 0
}
# Standard = DRAFT (sicher vor Audit). Nach Audit in luxe-secrets.ps1: $env:TT_PRIVACY_LEVEL = "PUBLIC_TO_EVERYONE"
if (-not $env:TT_PRIVACY_LEVEL) { $env:TT_PRIVACY_LEVEL = "DRAFT" }
$env:MAX_PER_RUN = "1"

git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null

Write-Host "=== TikTok-Autobot: poste naechstes Reel (Privacy: $($env:TT_PRIVACY_LEVEL)) ==="
node "automation/tiktok-autopost.mjs"

# Analyse (oeffentlich, kein Login noetig) + Gehirn lernt
try { python "tools/tiktok_analyze.py" --user "@luxestyle.ch" --max 60 --insecure --out "reports/" } catch {}
node "automation/brain/brain.mjs" 2>$null

# Stand zurueck ins Repo (Queue-Status + Lernen)
git add automation/reels_seed.csv social/tiktok_queue.csv automation/brain/knowledge.json reports/ 2>$null
git commit -m "auto(TikTok-Autobot): Reel gepostet + analysiert ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" 2>$null
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
git push origin claude/luxestyle-product-CizQ6 2>$null
Write-Host "=== Autobot fertig. ==="
