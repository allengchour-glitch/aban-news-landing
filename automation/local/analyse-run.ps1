# analyse-run.ps1 - ASCII only. STUENDLICH: Analyse + Pixel + Gehirn + CLOUD-BEFEHLE abholen/ausfuehren.
# = Fernsteuerung OHNE Dauer-Listener (kein Git-Lock): Cloud pusht &cmd=..., diese Task fuehrt es aus.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
function Ensure-Brave {
  $o = Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue
  if (-not $o -and (Test-Path $brave)) {
    Get-Process brave -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
    Start-Sleep 3
    Start-Process $brave -ArgumentList "--remote-debugging-port=9222","--user-data-dir=$env:USERPROFILE\brave-agent"
    Start-Sleep 18
  }
}

Write-Host "[analyse] TikTok + Pixel + Gehirn..."
& node "automation/local/tiktok-bot.mjs" analyze --max 80
& node "automation/tiktok-pixel-check.mjs"
& node "automation/brain/brain.mjs"

# CLOUD-BEFEHLE abholen (Worker-Queue leeren) + ausfuehren
try {
  $r = Invoke-RestMethod -Uri "https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&drain=1" -TimeoutSec 30
  if ($r.commands) { foreach ($it in $r.commands) {
    $c = "$($it.cmd)"; Write-Host "[cmd] $c"
    switch ($c) {
      "tiktok"       { Ensure-Brave; & node "automation/local/tiktok-upload-browser.mjs" }
      "follower"     { Ensure-Brave; & node "automation/local/ch-follower-growth.mjs" }
      "tutti"        { Ensure-Brave; $env:AUTO_PUBLISH="1"; & node "automation/local/tutti-post.mjs"; $env:AUTO_PUBLISH=$null }
      "anibis"       { Ensure-Brave; $env:AUTO_PUBLISH="1"; & node "automation/local/anibis-post.mjs"; $env:AUTO_PUBLISH=$null }
      "campaign-dry" { Ensure-Brave; & node "automation/local/tiktok-campaign-port.mjs" --dry; git add automation/local/campaign-shots/* 2>$null; git commit -m "campaign-dry screenshots" 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "campaign-go"  { Ensure-Brave; $env:AUTO_LAUNCH="1"; & node "automation/local/tiktok-campaign-port.mjs"; $env:AUTO_LAUNCH=$null }
      "engage"       { Ensure-Brave; & node "automation/local/tiktok-bot.mjs" engage --cap 12 }
      default        { Write-Host "  (unbekannter Befehl)" }
    }
  } } else { Write-Host "[cmd] keine offenen Befehle" }
} catch { Write-Host "[cmd] Fehler/keine Verbindung: $_" }

Write-Host "[analyse] fertig."
