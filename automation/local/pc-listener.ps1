# pc-listener.ps1 — macht dein Handy zur Fernbedienung für die PC-Browser-Aufgaben.
#
# WARUM: tutti & TikTok haben kein API → brauchen den eingeloggten Brave-Port (9222) auf DEINEM PC.
# Die Cloud kann den PC nicht erreichen. Lösung: Dieser Listener läuft auf dem PC und fragt den
# Cloudflare-Worker alle ~90 s, ob du am Handy einen Knopf gedrückt hast — und führt ihn dann aus.
#
# STARTEN (1×, dann läuft's im Hintergrund): Doppelklick auf START-LISTENER.bat
# Befehle (vom Handy über control.html oder direkt per URL):
#   &cmd=tutti     -> tutti-Inserate posten (Auto-Publish)
#   &cmd=tiktok    -> nächstes Reel auf TikTok (Port)
#   &cmd=follower  -> CH-Follower-Lauf
#   &cmd=all       -> komplette Tagesroutine (run-follower-daily.ps1)
#   &cmd=deploy        -> Cloudflare-Worker neu deployen (wrangler)
#   &cmd=campaign-dry  -> TikTok-Kampagne TESTLAUF (kein Geld) + Screenshots ins Repo pushen
#   &cmd=campaign-go   -> TikTok-Kampagne erstellen + absenden (Budget-Cap 350, erst nach campaign-dry)

$ErrorActionPreference = "SilentlyContinue"
$WORKER = "https://luxe-poster.allengchour.workers.dev"
$KEY    = "Abanaban192+"                      # = TRIGGER_KEY des Workers
$repo   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }

# ROOT-FIX (2026-06-17): Brave mit Debug-Port 9222 SICHERSTELLEN — sonst scheitern ALLE Browser-Befehle
# (campaign-dry/tiktok/follower/tutti/anibis) bevor sie etwas tun (connectOverCDP findet kein Brave).
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$open = Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue
if (-not $open -and (Test-Path $brave)) {
  Start-Process $brave "--remote-debugging-port=9222 --user-data-dir=`"$env:USERPROFILE\brave-agent`""
  Start-Sleep -Seconds 20
}

function Run-Cmd($c) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] Befehl: $c"
  switch ($c) {
    "tutti"    { $env:AUTO_PUBLISH="1"; $env:TUTTI_CAP="2"; node "automation/local/tutti-post.mjs" }
    "anibis"   { $env:AUTO_PUBLISH="1"; $env:ANIBIS_CAP="2"; node "automation/local/anibis-post.mjs" }
    "tiktok"   { node "automation/local/tiktok-upload-browser.mjs" }
    "follower" { node "automation/local/ch-follower-growth.mjs" }
    "all"      { powershell -ExecutionPolicy Bypass -File "automation/local/run-follower-daily.ps1" }
    "deploy"   { Push-Location "automation/cloudflare/luxe-poster"; wrangler deploy; Pop-Location }
    "campaign-dry" {
      # Handy-tauglich: Kampagne-Bot im Test-Modus laufen lassen + Screenshots ins Repo pushen,
      # damit Cloud-Claude die Selektoren prüfen kann. Gibt KEIN Geld aus.
      node "automation/local/tiktok-campaign-port.mjs" --dry
      git add automation/local/campaign-shots/* 2>$null
      git commit -m "campaign-dry: Ads-Manager Screenshots zum Pruefen" 2>$null
      git push origin claude/luxestyle-product-CizQ6 2>$null
    }
    "campaign-go" {
      # NUR wenn Selektoren bestaetigt: Kampagne erstellen + absenden (Budget-Cap 350 im Skript).
      $env:AUTO_LAUNCH="1"; node "automation/local/tiktok-campaign-port.mjs"; $env:AUTO_LAUNCH=$null
    }
    default    { Write-Host "  (unbekannter Befehl, übersprungen)" }
  }
}

Write-Host "LuxeStyle PC-Listener läuft. Pollt $WORKER alle 90s. (Fenster offen lassen / minimieren.)"
git pull origin claude/luxestyle-product-CizQ6 2>$null
while ($true) {
  try {
    $r = Invoke-RestMethod -Uri "$WORKER/?key=$([uri]::EscapeDataString($KEY))&drain=1" -TimeoutSec 30
    if ($r.commands -and $r.commands.Count -gt 0) {
      git pull origin claude/luxestyle-product-CizQ6 2>$null   # neueste Skripte holen
      foreach ($item in $r.commands) { Run-Cmd $item.cmd }
    }
  } catch { Write-Host "[$(Get-Date -Format HH:mm:ss)] Poll-Fehler (ignoriert): $($_.Exception.Message)" }
  Start-Sleep -Seconds 90
}
