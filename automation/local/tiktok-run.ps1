# tiktok-run.ps1 - ASCII only, parse-safe. Brave-Port 9222 sicherstellen + naechstes Reel auf TikTok posten.
# Von den Tasks LuxeTikTok-11 / LuxeTikTok-18 aufgerufen. Voraussetzung: brave-agent bei TikTok eingeloggt.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"
if (Test-Path $secrets) { . $secrets }
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$open = Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue
if (-not $open -and (Test-Path $brave)) {
  Write-Host "Port 9222 zu: alle Brave beenden + brave-agent mit Port neu starten"
  Get-Process brave -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
  Start-Process $brave -ArgumentList "--remote-debugging-port=9222","--user-data-dir=$env:USERPROFILE\brave-agent"
  Start-Sleep -Seconds 18
}
Write-Host "Poste naechstes Reel auf TikTok (stumm)..."
& node "automation/local/tiktok-upload-browser.mjs"
Write-Host "Fertig."
