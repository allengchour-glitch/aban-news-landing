# cmd-poll.ps1 - ASCII only. FERNSTEUERUNG: holt Cloud-Befehle (Worker-Queue) alle paar Min + fuehrt aus.
# Leichtgewichtig: KEIN git, KEINE Analyse -> kein Lock, schnell. Du gibst Befehle von ueberall, PC fuehrt aus.
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
try {
  $r = Invoke-RestMethod -Uri "https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&drain=1" -TimeoutSec 25
  if (-not $r.commands) { exit }
  foreach ($it in $r.commands) {
    $c = "$($it.cmd)"; Write-Host "[cmd] $c"; Ensure-Brave
    switch ($c) {
      "tiktok"       { if ($env:TT_ACCESS_TOKEN) { $env:TT_PRIVACY_LEVEL="DRAFT"; & node "automation/tiktok-autopost.mjs" } else { & node "automation/local/tiktok-upload-browser.mjs" } }
      "post"         { if ($env:TT_ACCESS_TOKEN) { $env:TT_PRIVACY_LEVEL="DRAFT"; & node "automation/tiktok-autopost.mjs" } else { & node "automation/local/tiktok-upload-browser.mjs" } }
      "tiktok-api"   { $env:TT_PRIVACY_LEVEL="DRAFT"; & node "automation/tiktok-autopost.mjs" }
      "autobot"      { & powershell -ExecutionPolicy Bypass -File "automation/local/tiktok-autobot.ps1" }
      "giga"         { & powershell -ExecutionPolicy Bypass -File "automation/local/tiktok-giga-bot.ps1" }
      "tiktok-photo" { & node "automation/tiktok-photo-post.mjs" }
      "ig-delete"   { & node "automation/local/ig-delete-dupes.mjs"; git add automation/local/ig-delete-shots/* 2>$null; git commit -m "ig-delete screenshots" 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "sources"      { & node "automation/check-sources.mjs" --fix; git add -A 2>$null; git commit -m "auto(Quellen-Check): Dubletten bereinigt" 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "seo"          { $env:MAX="200"; & node "automation/seo_polish.mjs"; Remove-Item Env:MAX -EA SilentlyContinue; git add -A 2>$null; git commit -m "auto(SEO): Meta-Beschreibungen gefuellt" 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "shippingtext" { $env:MAX="500"; & node "automation/fix_shipping_text.mjs"; Remove-Item Env:MAX -EA SilentlyContinue }
      "follower"     { & node "automation/local/ch-follower-growth.mjs" }
      "engage"       { & node "automation/local/tiktok-bot.mjs" engage --cap 12 }
      "analyse"      { & node "automation/local/tiktok-bot.mjs" analyze --max 80; & node "automation/tiktok-pixel-check.mjs" }
      "health"       { & node "automation/health-check.mjs"; git add reports/ 2>$null; git commit -m "auto(health): Provider/Key-Check" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "tutti"        { $env:AUTO_PUBLISH="1"; & node "automation/local/tutti-post.mjs"; $env:AUTO_PUBLISH=$null }
      "anibis"       { $env:AUTO_PUBLISH="1"; & node "automation/local/anibis-post.mjs"; $env:AUTO_PUBLISH=$null }
      "campaign-dry" { & node "automation/local/tiktok-campaign-port.mjs" --dry }
      "campaign-go"  { $env:AUTO_LAUNCH="1"; & node "automation/local/tiktok-campaign-port.mjs"; $env:AUTO_LAUNCH=$null }
      "bigbuy-beauty" { $env:ROOT_NAME="cosmet"; $env:MAX="12"; & node "dropship/bigbuy_import.mjs"; Remove-Item Env:ROOT_NAME,Env:MAX -EA SilentlyContinue }
      "bigbuy-makeup" { $env:ROOT_NAME="perfum"; $env:MAX="12"; & node "dropship/bigbuy_import.mjs"; Remove-Item Env:ROOT_NAME,Env:MAX -EA SilentlyContinue }
      "bigbuy-premium" { & powershell -ExecutionPolicy Bypass -File "automation/local/bigbuy-premium.ps1" }
      default        { Write-Host "  (unbekannt: $c)" }
    }
  }
} catch { }
