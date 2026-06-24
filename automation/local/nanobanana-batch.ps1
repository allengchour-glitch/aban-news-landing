# nanobanana-batch.ps1 — generiert KI-Lifestyle-Bilder fuer die Top-Produkte (Nano Banana 2 / Gemini Image)
# Liest automation/top_products.csv (name,image_url,label), nimmt das ECHTE Produktbild als Referenz.
# Idempotent: ueberspringt Produkte, fuer die social/ai-lifestyle/<slug>.png schon existiert.
# Braucht GEMINI_API_KEY (luxe-secrets.ps1/ENV). MAX via $env:NB_MAX (Default 5), Style via $env:NB_STYLE (Default lifestyle).
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path (Split-Path $PSScriptRoot)
Set-Location $root
$csv = Join-Path $root "automation\top_products.csv"
if (-not (Test-Path $csv)) { Write-Host "top_products.csv fehlt"; exit }
$max = if ($env:NB_MAX) { [int]$env:NB_MAX } else { 5 }
$style = if ($env:NB_STYLE) { $env:NB_STYLE } else { "lifestyle" }
$rows = Import-Csv $csv
$done = 0
foreach ($r in $rows) {
  if ($done -ge $max) { break }
  if (-not $r.image_url -or -not $r.label) { continue }
  $slug = ($r.label.ToLower() -replace '[^a-z0-9]+','-').Trim('-')
  if ($slug.Length -gt 40) { $slug = $slug.Substring(0,40) }
  $suffix = if ($style -eq "lifestyle") { "" } else { "-$style" }
  $out = Join-Path $root ("social\ai-lifestyle\" + $slug + $suffix + ".png")
  if (Test-Path $out) { Write-Host "skip (existiert): $slug$suffix"; continue }
  Write-Host "Nano Banana -> $($r.label) [$style]"
  & node "automation/nanobanana_lifestyle.mjs" --image $r.image_url --title $r.label --style $style --out $out
  if (Test-Path $out) { $done++ }
  Start-Sleep -Seconds 3
}
Write-Host "Fertig. Neue Bilder: $done (social/ai-lifestyle/)"
