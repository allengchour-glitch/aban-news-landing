# tiktok-giga-bot.ps1 - ASCII only. SUPER-GIGA TikTok-Bot: ALLE Wege als Fallback, erster Erfolg gewinnt.
# Reihenfolge (zuverlaessigster zuerst):
#   1) API      (tiktok-autopost.mjs, Inbox/DRAFT bzw. PUBLIC nach Audit) - braucht TT_ACCESS_TOKEN
#   2) Browser  (tiktok-upload-browser.mjs ueber Brave CDP 9222) - braucht eingeloggtes Brave
#   3) Browserbase (tiktok-cloud-autopost.mjs) - braucht BROWSERBASE_CONTEXT_ID
# Postet nur EINMAL (stoppt nach dem ersten erfolgreichen Weg). Idempotent ueber die jeweiligen Ledger.
# Danach: Analyse + Lernen + committen. No-op-sicher (ohne jeden Weg = sauberer Hinweis).
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }

function Ensure-Brave {
  $o = Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue
  if (-not $o -and (Test-Path $brave)) {
    Get-Process brave -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue; Start-Sleep 3
    Start-Process $brave -ArgumentList "--remote-debugging-port=9222","--user-data-dir=$env:USERPROFILE\brave-agent"; Start-Sleep 18
  }
}

git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
$done = $false
# Vor App-Audit liefert die Sandbox-API NICHT ans Live-Konto -> Browser ist der einzige Live-Weg.
# Nach Audit: in luxe-secrets.ps1  $env:TT_API_LIVE = "1"  setzen -> dann API zuerst (zuverlaessigster Live-Weg).
$apiLive = ($env:TT_API_LIVE -eq "1")

# --- Weg 1 (nur NACH Audit zuerst): offizielle API ---
if (-not $done -and $apiLive -and $env:TT_ACCESS_TOKEN) {
  Write-Host "[Giga] Weg 1: API (Live)..."
  if (-not $env:TT_PRIVACY_LEVEL) { $env:TT_PRIVACY_LEVEL = "PUBLIC_TO_EVERYONE" }
  $env:MAX_PER_RUN = "1"
  $o = (& node "automation/tiktok-autopost.mjs" 2>&1 | Out-String); Write-Host $o
  if ($o -match "publish_id" -or $o -match "1 TikTok-Post") { $done = $true; Write-Host "[Giga] OK via API" }
  elseif ($o -match "status=ready|No-op|kein") { $done = $true; Write-Host "[Giga] API: nichts faelliges -> fertig" }
}

# --- Weg 2: Browser (Brave CDP) = Live-Weg vor Audit ---
if (-not $done) {
  Write-Host "[Giga] Weg 2: Browser (Brave 9222)..."
  Ensure-Brave
  $o = (& node "automation/local/tiktok-upload-browser.mjs" 2>&1 | Out-String); Write-Host $o
  if ($o -notmatch "Kein Brave|nicht eingeloggt|Datei-Input nicht|Fehler|FAIL") { $done = $true; Write-Host "[Giga] OK via Browser" }
}

# --- Weg 3: Browserbase (Cloud-Browser) ---
if (-not $done -and $env:BROWSERBASE_CONTEXT_ID) {
  Write-Host "[Giga] Weg 3: Browserbase..."
  $o = (& node "automation/tiktok-cloud-autopost.mjs" 2>&1 | Out-String); Write-Host $o
  if ($o -notmatch "No-op|Fehler|FAIL") { $done = $true; Write-Host "[Giga] OK via Browserbase" }
}

# --- Weg 4 (Notnagel vor Audit): API in den Entwurf-Inbox (du tippst in der App "Posten") ---
if (-not $done -and -not $apiLive -and $env:TT_ACCESS_TOKEN) {
  Write-Host "[Giga] Weg 4: API-Entwurf (Inbox)..."
  $env:TT_PRIVACY_LEVEL = "DRAFT"; $env:MAX_PER_RUN = "1"
  $o = (& node "automation/tiktok-autopost.mjs" 2>&1 | Out-String); Write-Host $o
  if ($o -match "publish_id") { $done = $true; Write-Host "[Giga] OK via API-Entwurf (in der App veroeffentlichen)" }
}

if (-not $done) { Write-Host "[Giga] Kein Weg verfuegbar: Token (luxe-secrets.ps1) ODER Brave-Login ODER Browserbase noetig." }

# --- Analyse + Lernen (immer) = TikTok-King-Schleife ---
node "automation/local/tiktok-bot.mjs" analyze --max 80 2>$null
try { python "tools/tiktok_analyze.py" --user "@luxestyle.ch" --max 60 --insecure --out "reports/" } catch {}
node "automation/brain/brain.mjs" 2>$null
try { node "automation/trends/trend_scan.mjs" 2>$null } catch {}   # Trends klauen (CH/Mundart)
node "automation/local/tiktok-bot.mjs" engage --cap 10 2>$null     # Kommentare beantworten

# --- Stand committen ---
git add automation/reels_seed.csv social/tiktok_queue.csv automation/local/tiktok-upload-done.txt automation/brain/knowledge.json reports/ 2>$null
git commit -m "auto(Giga-Bot): TikTok gepostet (bester Weg) + analysiert ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" 2>$null
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
git push origin claude/luxestyle-product-CizQ6 2>$null
Write-Host "[Giga] fertig."
