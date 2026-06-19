# worker-autodeploy.ps1 — LuxeStyle: Cloudflare-Worker SELBST deployen, wenn sich der Code geändert hat.
# User 2026-06-19 „maximum auto": kein Klick mehr. Läuft im Tages-Zyklus mit; deployt NUR bei Änderung
# (Hash-Wächter) → billig + selbstheilend. Voraussetzung: am PC 1× `wrangler login` (OAuth bleibt gespeichert)
# ODER CLOUDFLARE_API_TOKEN in luxe-secrets.ps1. Ohne Auth = sauberer No-op (meldet nur, deployt nicht).
$ErrorActionPreference = "SilentlyContinue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$wdir = Join-Path $repo "automation\cloudflare\luxe-poster"
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"
if (Test-Path $secrets) { . $secrets }   # evtl. CLOUDFLARE_API_TOKEN
$src = Join-Path $wdir "src\index.js"
$toml = Join-Path $wdir "wrangler.toml"
$q = Join-Path $wdir "src\queue.json"
if (-not (Test-Path $src)) { Write-Host "Worker-Src nicht gefunden"; exit 0 }

# Hash über die deploy-relevanten Dateien (Inhalt = was live geht). queue.json liest der Worker live → egal.
$cur = (Get-FileHash $src -Algorithm SHA256).Hash + (Get-FileHash $toml -Algorithm SHA256).Hash
$stamp = "$env:USERPROFILE\.luxe-worker-deployed.txt"   # ausserhalb Repo → kein git-Konflikt
$last = if (Test-Path $stamp) { Get-Content $stamp -Raw } else { "" }
if ($cur.Trim() -eq $last.Trim()) { Write-Host "Worker unverändert → kein Deploy nötig."; exit 0 }

# wrangler vorhanden?
$wr = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wr) { npx --yes wrangler --version *> $null; $useNpx = $true } else { $useNpx = $false }

# Auth prüfen (OAuth-Login ODER API-Token)
$hasAuth = $false
if ($env:CLOUDFLARE_API_TOKEN) { $hasAuth = $true }
else {
  $who = if ($useNpx) { npx --yes wrangler whoami 2>&1 } else { wrangler whoami 2>&1 }
  if ($who -notmatch "not authenticated|You are not|Unable") { if ($who -match "@|account|Account") { $hasAuth = $true } }
}
if (-not $hasAuth) { Write-Host "⚠️ Kein Cloudflare-Login. Am PC 1x `wrangler login` ODER CLOUDFLARE_API_TOKEN in luxe-secrets.ps1. Deploy übersprungen."; exit 0 }

Set-Location $wdir
Write-Host "→ Worker-Code geändert → deploye…"
if ($useNpx) { npx --yes wrangler deploy } else { wrangler deploy }
if ($LASTEXITCODE -eq 0) {
  Set-Content -Path $stamp -Value $cur.Trim()
  Write-Host "✅ Worker deployed (neuer Stand gemerkt)."
} else {
  Write-Host "⚠️ Deploy fehlgeschlagen (Exit $LASTEXITCODE) — Stand NICHT gemerkt, probiert nächsten Lauf wieder."
}
