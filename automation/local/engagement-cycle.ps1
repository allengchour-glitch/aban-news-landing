# engagement-cycle.ps1 — MEHRMALS AM TAG: NUR analysieren + chatten + folgen + engagieren (KEIN Posten).
# ---------------------------------------------------------------------------------------------
# User 2026-06-17 „mehrmals nur analysiere und chatte, folge, öbis im Profil schribe" — Posten ist
# selten (Spam-Schutz), aber Engagement lauft oft. Dieser Cycle (z.B. 4x/Tag) macht NUR:
#   1) TikTok analysieren (frische Daten -> Gehirn lernt schneller)
#   2) IG/FB-Kommentare beantworten (Meta-API, FAQ-Stil, idempotent)
#   3) IG + TikTok-DMs beantworten (Browser/CDP)
#   4) CH-Follower folgen — KLEINE Charge pro Lauf (Tages-Summe bleibt sicher: 4x8=32 IG / 4x6=24 TT)
#      + dabei Liken = „öbis im Profil" / Engagement der Zielgruppe.
#   5) lernen + zurueck ins Repo committen.
# KEIN Posten hier (das macht tiktok-cycle.ps1 1-2x/Tag). Mehrfach/Tag = unbedenklich, da nur Engagement.
#
# EINRICHTUNG: ueber SETUP-TIKTOK-CYCLE.bat (registriert auch diese Cycles). PC ist eh immer an.

$ErrorActionPreference = "SilentlyContinue"
$port = 9222
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$profile = "$env:USERPROFILE\brave-agent"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"
if (Test-Path $secrets) { . $secrets }

# 1) Brave-Port sicherstellen
$open = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $open) { Start-Process $brave "--remote-debugging-port=$port --user-data-dir=`"$profile`""; Start-Sleep -Seconds 25 }

git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null

# 2) ANALYSIEREN (jeder Lauf)
try { python "tools/tiktok_analyze.py" --user "@luxestyle.ch" --max 60 --insecure --out "reports/" } catch {}

# 3) CHATTEN — Kommentare (Meta-API) + DMs (Browser). No-op ohne Token/Login.
if ($env:META_ACCESS_TOKEN) { node "automation/social-comment-reply.mjs" }
node "automation/local/ig-dm-browser.mjs"
node "automation/local/tiktok-dm-browser.mjs"

# 4) RATIO-RETTUNG (2026-06-17: IG verliert Follower wegen 814:147-Ratio = Spam-Signal → Reichweite gedrosselt):
#    IG-FOLGEN PAUSIERT (IG_FOLLOWS=0, macht Ratio nur schlimmer). Nur TikTok weiter (kleine Charge).
$env:IG_FOLLOWS = "0"; $env:TT_FOLLOWS = "6"
node "automation/local/ch-follower-growth.mjs"
$env:IG_FOLLOWS = $null; $env:TT_FOLLOWS = $null
# 4a) AGGRESSIV ENTFOLGEN jeden Lauf bis Ratio gesund (814 → ~150). DAYS=5 (schneller), MAX=45/Lauf.
$env:DAYS = "5"; $env:MAX = "25"
node "automation/local/ch-unfollow.mjs"
$env:DAYS = $null; $env:MAX = $null

# 4b) FACEBOOK-FOLLOWER: 1x/Tag (Mittags-Cycle) in CH-Gruppe posten -> Reichweite -> Page-Follows.
if ((Get-Date).Hour -eq 12) { node "automation/local/fb-group-post.mjs" }
# 4c) CH-GRUPPEN AUTONOM BEITRETEN: 1x/Tag (15-Uhr-Cycle), konservativ 2/Lauf -> baut fb-groups.txt aus.
#     (CH-Marktplätze tutti/anibis/ricardo werden separat im Haupt-Tagestask bespielt; Konto = 1x manuell.)
if ((Get-Date).Hour -eq 15) { node "automation/local/fb-group-join.mjs" }

# 5) LERNEN + zurueck ins Repo
node "automation/brain/brain.mjs" 2>$null
# Selbstlern: IG-Performance messen -> Gewinner verstaerken (top_products neu sortieren)
if ($env:META_ACCESS_TOKEN) { node "automation/brain/self_learn.mjs" }
git add automation/brain/knowledge.json automation/brain/pools.json automation/brain/BRAIN.md automation/top_products.csv reports/ automation/local/ch-growth-ledger.txt 2>$null
git commit -m "auto(Engagement-Cycle): analysiert + gechattet + gefolgt ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" 2>$null
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
git push origin claude/luxestyle-product-CizQ6 2>$null
Write-Host "Engagement-Cycle fertig: analysiert + gechattet + gefolgt (kein Posten)."
