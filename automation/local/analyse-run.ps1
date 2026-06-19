# analyse-run.ps1 - ASCII only. STUENDLICH: TikTok analysieren + Pixel in allen Varianten pruefen + lernen.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }
Write-Host "[analyse] TikTok analysieren..."
& node "automation/local/tiktok-bot.mjs" analyze --max 80
Write-Host "[analyse] Pixel-Check (alle Varianten)..."
& node "automation/tiktok-pixel-check.mjs"
Write-Host "[analyse] Gehirn lernen..."
& node "automation/brain/brain.mjs"
Write-Host "[analyse] fertig."
