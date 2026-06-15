# run-follower-daily.ps1 — LuxeStyle Marketing OHNE Befehl (für Windows-Taskplaner)
# Macht 1x/Tag automatisch: Brave starten · CH-Follower · TikTok-Reel posten (API) · IG+TikTok-DMs
# beantworten · IG/FB-Kommentare beantworten · (sonntags) Entfolgen.
# IG/FB-POSTEN läuft separat & ohne PC über den Cloudflare-Worker.
#
# EINMALIGE EINRICHTUNG (dann täglich von selbst, kein Tippen):
#   1) Secrets-Datei anlegen:  notepad $env:USERPROFILE\luxe-secrets.ps1
#      Inhalt (deine echten Werte; Datei bleibt NUR lokal, nie ins Repo):
#        $env:TT_ACCESS_TOKEN  = "…"
#        $env:TT_REFRESH_TOKEN = "…"
#        $env:TT_CLIENT_KEY    = "…"
#        $env:TT_CLIENT_SECRET = "…"
#        $env:META_ACCESS_TOKEN = "EAA…"                 # für IG/FB-Kommentar-Auto-Antwort
#        $env:IG_USER_ID = "17841480560863361"           # @luxestyle.ch
#        $env:FB_PAGE_ID = "1049840534888592"            # LuxeStyle CH
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

# 4) TikTok-Reel hochladen ÜBER DEN PORT (Brave-CDP) — wie der Follower-Bot, kein API-Audit nötig.
#    Postet das nächste reels/*-9x16-meta.mp4 (mit Eigen-Track) direkt aufs eingeloggte TikTok.
#    (Trend-Sound gibt's nur in der Handy-App; der Port-Weg nutzt die eingebackene Musik.)
node "automation/local/tiktok-upload-browser.mjs"

# 5) DMs beantworten (Browser/CDP — TikTok hat keine DM-API, IG-API ist app-gesperrt)
node "automation/local/ig-dm-browser.mjs"
node "automation/local/tiktok-dm-browser.mjs"

# 6) IG/FB-Kommentare unter den Posts automatisch beantworten (Meta-API, FAQ-Stil)
#    No-op ohne META_ACCESS_TOKEN.
if ($env:META_ACCESS_TOKEN) { node "automation/social-comment-reply.mjs" }

# 7) tutti.ch autonom inserieren (Browser/CDP — tutti hat kein API). Voll-Auto: lädt Bild + wählt Kategorie +
#    veröffentlicht NUR wenn alles sauber gesetzt ist (sonst überspringen). Cap 2/Tag, idempotent (tutti-ledger.txt).
#    Voraussetzung: Brave-Profil ist auf tutti.ch eingeloggt. Auto-Veröffentlichung auf Ricardo ist im Konto aktiv → doppelte Reichweite.
$env:AUTO_PUBLISH = "1"; $env:TUTTI_CAP = "2"
node "automation/local/tutti-post.mjs"

# 8) Sonntags zusätzlich entfolgen (Nicht-Zurückfolger nach ~14 Tagen)
if ((Get-Date).DayOfWeek -eq "Sunday") { node "automation/local/ch-unfollow.mjs" }
