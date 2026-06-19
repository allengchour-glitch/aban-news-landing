# tiktok-cycle.ps1 — LICHTGWICHTIGI TikTok-Schleife, MEHRMALS AM TAG (User 2026-06-17).
# ---------------------------------------------------------------------------------------------
# Macht NUR TikTok (kein Follower/DM/Import → drum gefahrlos mehrfach/Tag):
#   1) Brave-Port sicherstellen   2) Repo aktualisieren (neue Reels/Captions)
#   3) NÄCHSTES Top-Reel auf TikTok posten (idempotent, Hero zuerst)   4) TikTok ANALYSIEREN + lernen
#   5) done-Ledger + Reports zurück ins Repo committen.
# TikTok hat KEINE Post-API → läuft über den eingeloggten Brave (Port 9222). Das ist der saubere Weg
# für „mehrmals am Tag" ohne API: dieselbe Task einfach zu mehreren Uhrzeiten triggern.
#
# EINRICHTUNG (1×, PowerShell als Admin) — 3× pro Tag (sicher gegen Spam-Drosselung; 11/16/20 Uhr):
#   $A = "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\luxe\automation\local\tiktok-cycle.ps1"
#   schtasks /create /tn "LuxeTikTok-11" /sc daily /st 11:00 /tr $A
#   schtasks /create /tn "LuxeTikTok-16" /sc daily /st 16:00 /tr $A
#   schtasks /create /tn "LuxeTikTok-20" /sc daily /st 20:00 /tr $A
#   (Mehr/weniger Uhrzeiten = mehr/weniger Posts/Tag. 2–3× ist für TikTok optimal; >4 riskiert Drosselung.)
#
# Voraussetzung: Brave-Profil bei tiktok.com eingeloggt; luxe-secrets.ps1 im Profil (optional).

$ErrorActionPreference = "SilentlyContinue"
$port = 9222
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$profile = "$env:USERPROFILE\brave-agent"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"
if (Test-Path $secrets) { . $secrets }

# 1) Brave mit Debug-Port starten, falls nötig
$open = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $open) { Start-Process $brave "--remote-debugging-port=$port --user-data-dir=`"$profile`""; Start-Sleep -Seconds 25 }

# 2) Repo aktuell halten (neue Reels/Captions vom Cloud-Claude)
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null

# 2b) WORKER SELBST-DEPLOY (maximum auto): deployt den Cloudflare-Worker NUR wenn sich der Code geändert hat.
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\worker-autodeploy.ps1" 2>$null

# 3) NÄCHSTES Top-Reel posten (Hero zuerst, idempotent via tiktok-upload-done.txt)
node "automation/local/tiktok-upload-browser.mjs"

# 4) TikTok ANALYSIEREN + lernen (jeder Lauf = frische Daten → Gehirn lernt schneller)
#    a) eingeloggte Analyse über den Bot (genauer, private Metriken) — b) öffentliche yt-dlp als Fallback
node "automation/local/tiktok-bot.mjs" analyze --max 80 2>$null
try { python "tools/tiktok_analyze.py" --user "@luxestyle.ch" --max 60 --insecure --out "reports/" } catch {}
node "automation/brain/brain.mjs" 2>$null

# 4a2) ENGAGE — Kommentare auf eigenen Videos beantworten (Spam-Filter, Cap 12, anti-Block-Pausen)
node "automation/local/tiktok-bot.mjs" engage --cap 12 2>$null

# 4b) AUTO-AUFRÄUMEN (User 2026-06-19 „automatisch"): Verlierer löschen — NUR 1×/Tag (frühester Lauf < 12 Uhr),
#     mit harten Sicherheits-Caps: max 3/Lauf, unter 60 Views, Top-5-Gewinner + tiktok-keep.txt geschützt, Ledger.
if ((Get-Date).Hour -lt 12) {
  node "automation/local/tiktok-bot.mjs" delete --losers --min-views 60 --max 3 --go 2>$null
}

# 5) Gelerntes + Ledger zurück ins Repo (defensiv: erst rebase, dann push)
git add automation/local/tiktok-upload-done.txt automation/brain/knowledge.json automation/brain/pools.json automation/brain/BRAIN.md reports/ 2>$null
git commit -m "auto(TikTok-Cycle): Reel gepostet + analysiert + gelernt ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" 2>$null
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
git push origin claude/luxestyle-product-CizQ6 2>$null
Write-Host "TikTok-Cycle fertig: 1 Reel gepostet + analysiert."
