# analyse-run.ps1 - ASCII only. 24/7 SELBST-VERBESSERUNG (stuendlich): analysieren -> Pixel -> lernen ->
# Top-Produkte sortieren -> Queue aus Gewinnern neu bauen -> committen/pushen -> Cloud-Befehle ausfuehren.
# Wird nur besser, ohne den User. Fernsteuerung ohne Dauer-Listener (kein Git-Lock).
$ErrorActionPreference = "Continue"
$branch = "claude/luxestyle-product-CizQ6"
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

# 1) ANALYSIEREN
Write-Host "[1] Analyse (TikTok-Studio + oeffentlich) + Pixel..."
Ensure-Brave
& node "automation/local/tiktok-bot.mjs" analyze --max 80
& python "tools/tiktok_analyze.py" --user "@luxestyle.ch" --max 60 --insecure --out "reports/" 2>$null
& node "automation/tiktok-pixel-check.mjs"

# 2) LERNEN + besser werden
Write-Host "[2] Lernen + Top-Produkte sortieren + Queue neu bauen..."
& node "automation/brain/brain.mjs"
& node "automation/brain/self_learn.mjs" 2>$null
& node "automation/brain/build_queue.mjs" 2>$null

# 3) SICHERN (committen + pushen, damit Cloud-Worker die frische Queue kriegt) - best effort
Write-Host "[3] Gelerntes + frische Queue sichern..."
& git add automation/brain/ automation/cloudflare/luxe-poster/src/queue.json reports/ automation/top_products.csv 2>$null
& git commit -m ("auto-improve: stuendlich analysiert+gelernt+Queue (" + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ")") 2>$null
& git pull --rebase -X ours origin $branch 2>$null
& git push origin $branch 2>$null

# 4) CLOUD-BEFEHLE abholen + ausfuehren
Write-Host "[4] Cloud-Befehle..."
try {
  $r = Invoke-RestMethod -Uri "https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&drain=1" -TimeoutSec 30
  if ($r.commands) { foreach ($it in $r.commands) {
    $c = "$($it.cmd)"; Write-Host "  [cmd] $c"; Ensure-Brave
    switch ($c) {
      "tiktok"       { & node "automation/local/tiktok-upload-browser.mjs" }
      "follower"     { & node "automation/local/ch-follower-growth.mjs" }
      "engage"       { & node "automation/local/tiktok-bot.mjs" engage --cap 12 }
      "tutti"        { $env:AUTO_PUBLISH="1"; & node "automation/local/tutti-post.mjs"; $env:AUTO_PUBLISH=$null }
      "anibis"       { $env:AUTO_PUBLISH="1"; & node "automation/local/anibis-post.mjs"; $env:AUTO_PUBLISH=$null }
      "campaign-dry" { & node "automation/local/tiktok-campaign-port.mjs" --dry }
      "campaign-go"  { $env:AUTO_LAUNCH="1"; & node "automation/local/tiktok-campaign-port.mjs"; $env:AUTO_LAUNCH=$null }
      default        { Write-Host "    (unbekannt)" }
    }
  } } else { Write-Host "  keine offenen Befehle" }
} catch { Write-Host "  (keine Verbindung)" }
Write-Host "[fertig] Selbst-Verbesserung durch."
