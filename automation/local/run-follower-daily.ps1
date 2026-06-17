# run-follower-daily.ps1 — LuxeStyle Marketing OHNE Befehl (für Windows-Taskplaner)
# Macht 1x/Tag automatisch: Brave starten · CH-Follower · TikTok-Reel posten · IG+TikTok-DMs
# beantworten · IG/FB-Kommentare beantworten · (sonntags) Entfolgen · ZULETZT analysieren + Gehirn
# lernen + Autopost-Queue neu bauen (auto.sh-Kette, Windows-tauglich) und ins Repo zurückspeichern.
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
#        $env:SHOPIFY_CLIENT_ID     = "…"                 # Custom-App (für Feed-Politur)
#        $env:SHOPIFY_CLIENT_SECRET = "shpss_…"           #   → setzt Kategorie+condition katalogweit
#        $env:GEMINI_API_KEY        = "…"                 # gratis aistudio.google.com → Bild-Audit + KI-Router
#        $env:GROQ_API_KEY          = "…"                 # GRATIS console.groq.com → KI-Router #1 (Captions/Trends)
#        # optional mehr KI-Fallbacks: OPENROUTER_API_KEY · MISTRAL_API_KEY · CF_ACCOUNT_ID+CF_API_TOKEN
#        $env:HEYGEN_API_KEY        = "sk_V2_…"           # AI-Spokesperson-Reels (heygen_video.mjs)
#          # ⚠️ HeyGen trennt API-Credits ≠ Dashboard-Credits → API-Quota in HeyGen aufladen, sonst INSUFFICIENT_CREDIT
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

# 4) TikTok-Posten läuft jetzt in der EIGENEN, mehrmals-täglichen Task `tiktok-cycle.ps1`
#    (User 2026-06-17 „mehrmals am Tag TikTok"). Hier NICHT mehr posten → keine Doppel-Posts.
#    Einrichtung der 3×/Tag-Trigger: siehe Kopf von automation/local/tiktok-cycle.ps1.

# 5) DMs beantworten (Browser/CDP — TikTok hat keine DM-API, IG-API ist app-gesperrt)
node "automation/local/ig-dm-browser.mjs"
node "automation/local/tiktok-dm-browser.mjs"

# 5b) IG-Posts LÖSCHEN die nicht erlaubt sind (Botox/Serum/Rosehip/Gua-Sha) — IG-API kann published
#     NICHT löschen → Browser/CDP. Liest automation/local/ig-delete-queue.txt, idempotent. No-op wenn leer.
node "automation/local/ig-delete-browser.mjs"

# 6) IG/FB-Kommentare unter den Posts automatisch beantworten (Meta-API, FAQ-Stil)
#    No-op ohne META_ACCESS_TOKEN.
if ($env:META_ACCESS_TOKEN) { node "automation/social-comment-reply.mjs" }

# 6b) IG-CAROUSEL (Bilderreihe in 1 Kachel, 1 Beschreibung) — Di+Fr autonom posten (kein Spam).
#     Nutzt die Top-Text-Karten (text_image_map). No-op ohne META_ACCESS_TOKEN.
if ($env:META_ACCESS_TOKEN -and ((Get-Date).DayOfWeek -in "Tuesday","Friday")) {
  node "automation/post_ig_carousel.mjs" --n 6
}

# 7) tutti.ch autonom inserieren (Browser/CDP — tutti hat kein API). Voll-Auto: lädt Bild + wählt Kategorie +
#    veröffentlicht NUR wenn alles sauber gesetzt ist (sonst überspringen). Cap 2/Tag, idempotent (tutti-ledger.txt).
#    Voraussetzung: Brave-Profil ist auf tutti.ch eingeloggt. Auto-Veröffentlichung auf Ricardo ist im Konto aktiv → doppelte Reichweite.
$env:AUTO_PUBLISH = "1"; $env:TUTTI_CAP = "2"
node "automation/local/tutti-post.mjs"

# 7b) anibis.ch autonom inserieren (zweiter Gratis-CH-Marktplatz, gleiche Liste, eigener Ledger).
$env:AUTO_PUBLISH = "1"; $env:ANIBIS_CAP = "2"
node "automation/local/anibis-post.mjs"

# 8) Entfolgen — TÄGLICH (User 2026-06-17: Ratio 878 Gefolgt > 592 Follower = ungesund → schneller trimmen).
#    Sicher: Cap 50/Lauf, nur Nicht-Zurückfolger nach ~14 Tagen, Stopp bei Block. Idempotent.
node "automation/local/ch-unfollow.mjs"

# 8b) KATALOG-FEED-POLITUR (autonom, User 2026-06-16 „ds söt scho i richtige kategorie si"):
#     setzt katalogweit die richtige Shopify-/Google-Produktkategorie + condition/gender/age.
#     Braucht SHOPIFY_CLIENT_ID/SECRET in luxe-secrets.ps1. Idempotent + resümierbar → MAX/Tag,
#     der nächste Lauf macht weiter, bis der ganze Katalog poliert ist. No-op ohne Creds.
#     ($env:SHOPIFY_SHOP default au3j0y-hq.myshopify.com; $env:SHOPIFY_CLIENT_ID/SECRET = Custom-App.)
if ($env:SHOPIFY_CLIENT_ID -and $env:SHOPIFY_CLIENT_SECRET) {
  $env:MAX = "800"; node "automation/feed_polish.mjs"; $env:MAX = $null
  # 8c) MODE-BESCHREIBIGE: Google-„Key details" (Farbe/Grösse/Material/Muster) ergänzen
  #     (Merchant-Report „Update product descriptions"). Idempotent → MAX/Tag, resümierbar.
  $env:MAX = "400"; node "automation/enrich_apparel_descriptions.mjs"; $env:MAX = $null
  # 8d) BILD-COMPLIANCE-AUDIT (Gemini Vision): findet Botox/Vorher-Nachher/asiat. Schrift/
  #     Watermark/Med-Claims auf Produktbildern → Treffer auf DRAFT + Tag (reversibel).
  #     Braucht GEMINI_API_KEY (gratis, aistudio.google.com) in luxe-secrets.ps1. Idempotent.
  # REPORT-Modus (kein Auto-DRAFT): erzeugt reports/image-audit-*.json zum Sichten.
  # (FIX nur manuell nach Review — verhindert Fehlalarm-DRAFTs von echten Markenprodukten/POD.)
  if ($env:GEMINI_API_KEY) { $env:MAX = "400"; node "automation/image-audit.mjs"; $env:MAX = $null }
}

# 8e) NEUE PRODUKTE autonom (BigBuy EU → Merchant-ready) — vom PC (frische API-Quota, anders als Cloud-IP).
#     User 2026-06-17 „fülle maximum, ma nüm de token igä". 10/Tag = stetig, ohne BigBuy-Quota zu sprengen.
#     ROOT rotiert nach Wochentag (Schmuck/Mode/Beauty/Taschen/Schuhe = Gewinner-Kategorien zuerst).
#     Braucht BIGBUY_TOKEN + SHOPIFY_CLIENT_ID/SECRET in luxe-secrets.ps1. Idempotent (EAN-Ledger).
if ($env:BIGBUY_TOKEN -and $env:SHOPIFY_CLIENT_ID) {
  $roots = @("19662","19668","19662","19668","19662","19668","19662")  # Schmuck/Mode rotierend (Gewinner)
  $env:ROOT = $roots[[int](Get-Date).DayOfWeek]; $env:MAX = "10"; $env:MARKUP = "1.9"; $env:BB_DELAY = "1500"
  node "dropship/bigbuy_import.mjs"
  $env:ROOT = $null; $env:MAX = $null
}

# 9) IMMER NACH DEM POSTEN: ANALYSIEREN + LERNEN (User 2026-06-16 „wenn du fertig postest, dann immer Analyse").
#    Kette wie auto.sh, aber Windows-tauglich via node/python direkt (kein bash nötig). Alles no-op-safe:
#    (a) frische TikTok-Analyse (best-effort, yt-dlp kann blockieren → nutzt sonst vorhandene Reports),
#    (b) Gehirn lernen (kumulativ + Ratsche → knowledge.json/pools.json/BRAIN.md),
#    (c) Autopost-Queue aus Gelerntem neu bauen (mit Dedup-Garantie gegen doppelte Posts).
try { python "tools/tiktok_analyze.py" --user "@luxestyle.ch" --max 60 --insecure --out "reports/" } catch {}
# 9b) HEALTH-CHECK (welche GRATIS-KI-Provider/Tools leben) + TREND/MUSIK-SCAN (Schweiz) — gratis,
#     no-op-safe ohne Keys. Multi-Provider-Router fällt automatisch zurück, falls einer ausfällt.
node "automation/health-check.mjs"
node "automation/trends/trend_scan.mjs"
node "automation/brain/brain.mjs"
node "automation/brain/build_queue.mjs"

# 10) Gelerntes Gehirn + frische Queue zurück ins Repo (sonst geht das Lernen verloren; der Worker
#     bäckt die Queue beim nächsten `wrangler deploy` ein). Defensiv: erst rebase-pullen, dann pushen.
git add automation/brain/knowledge.json automation/brain/pools.json automation/brain/queue.json automation/brain/BRAIN.md automation/cloudflare/luxe-poster/src/queue.json reports/ 2>$null
git commit -m "auto(PC-Task): tägliche Analyse + Gehirn-Lernen + frische Queue" 2>$null
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
git push origin claude/luxestyle-product-CizQ6 2>$null
Write-Host "✅ Tageslauf fertig: Marketing + analysiert + gelernt + Queue aktualisiert."
