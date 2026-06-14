# run-follower-daily.ps1 — LuxeStyle Marketing OHNE Befehl (für Windows-Taskplaner)
# Macht 1x/Tag automatisch: (1) Brave starten, (2) CH-Follower holen, (3) TikTok-Reel posten (API),
# (sonntags) Entfolgen. Meta/IG+FB läuft separat & ohne PC über den Cloudflare-Worker.
#
# EINMALIGE EINRICHTUNG (dann täglich von selbst, kein Tippen):
#   1) Secrets-Datei anlegen:  notepad $env:USERPROFILE\luxe-secrets.ps1
#      Inhalt (deine echten Werte; Datei bleibt NUR lokal, nie ins Repo):
#        $env:TT_ACCESS_TOKEN  = "…"
#        $env:TT_REFRESH_TOKEN = "…"
#        $env:TT_CLIENT_KEY    = "…"
#        $env:TT_CLIENT_SECRET = "…"
#        # $env:TT_PRIVACY_LEVEL = "PUBLIC_TO_EVERYONE"   # erst NACH TikTok-App-Audit
#   2) Task registrieren (PowerShell als Admin, 1 Zeile):
#      schtasks /create /tn "LuxeMarketing" /sc daily /st 10:00 /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\allen\aban-news-landing\automation\local\run-follower-daily.ps1"

$ErrorActionPreference = "SilentlyContinue"
$port = 9222
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$profile = "$env:USERPROFILE\brave-agent"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo

# Lokale Secrets laden (TT_*-Tokens) — liegen NUR auf dem PC, nie im Repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"
if (Test-Path $secrets) { . $secrets }

# 1) Brave mit Debug-Port starten, falls Port nicht lauscht (für Follower-Wachstum)
$open = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $open) {
  Start-Process $brave "--remote-debugging-port=$port --user-data-dir=`"$profile`""
  Start-Sleep -Seconds 25
}

# 2) Repo aktuell halten (neue Reels/Captions vom Cloud-Claude)
git pull origin claude/luxestyle-product-CizQ6 2>$null

# 3) CH-Follower holen (Browser/CDP)
node "automation/local/ch-follower-growth.mjs"

# 4) TikTok-Reel posten über die offizielle Content-Posting-API (KEIN Browser nötig)
#    No-op, solange TT_ACCESS_TOKEN nicht gesetzt ist.
if ($env:TT_ACCESS_TOKEN) { node "automation/tiktok-autopost.mjs" }

# 5) Sonntags zusätzlich entfolgen (Nicht-Zurückfolger nach ~14 Tagen)
if ((Get-Date).DayOfWeek -eq "Sunday") { node "automation/local/ch-unfollow.mjs" }
