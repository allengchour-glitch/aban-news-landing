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
#   &cmd=deploy    -> Cloudflare-Worker neu deployen (wrangler)

$ErrorActionPreference = "SilentlyContinue"
$WORKER = "https://luxe-poster.allengchour.workers.dev"
$KEY    = "Abanaban192+"                      # = TRIGGER_KEY des Workers
$repo   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }

function Run-Cmd($c) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] Befehl: $c"
  switch ($c) {
    "tutti"    { $env:AUTO_PUBLISH="1"; $env:TUTTI_CAP="2"; node "automation/local/tutti-post.mjs" }
    "anibis"   { $env:AUTO_PUBLISH="1"; $env:ANIBIS_CAP="2"; node "automation/local/anibis-post.mjs" }
    "tiktok"   { node "automation/local/tiktok-upload-browser.mjs" }
    "follower" { node "automation/local/ch-follower-growth.mjs" }
    "all"      { powershell -ExecutionPolicy Bypass -File "automation/local/run-follower-daily.ps1" }
    "deploy"   { Push-Location "automation/cloudflare/luxe-poster"; wrangler deploy; Pop-Location }
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
