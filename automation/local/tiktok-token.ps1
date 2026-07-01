# tiktok-token.ps1 - holt den TikTok Marketing-API Access-Token (einmalig) und speichert ihn
# sicher in luxe-secrets.ps1 (NIE ins Repo). Danach sofortiger Test via tiktok-stats.mjs.
# Aufruf ueber TIKTOK-TOKEN.bat. Keine Emojis, einfache Strings (PowerShell-sicher).
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repo

Write-Host "=== TikTok Marketing-API Token-Setup ==="
Write-Host "Du brauchst 3 Dinge aus dem Developer-Portal (business-api.tiktok.com):"
Write-Host "  1. App-ID   2. Secret   3. auth_code (aus der Redirect-URL nach der Autorisierung)"
Write-Host ""
$appId = Read-Host "App-ID"
$secret = Read-Host "Secret"
$authCode = Read-Host "auth_code"

$body = @{ app_id = $appId; secret = $secret; auth_code = $authCode } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/" -Method Post -ContentType "application/json" -Body $body
if ($r.code -ne 0) {
  Write-Host ("FEHLER von TikTok: code " + $r.code + " - " + $r.message)
  Write-Host "Hinweis: auth_code ist nur ~1 Stunde gueltig und nur 1x nutzbar - ggf. neu autorisieren."
  exit 1
}
$tok = $r.data.access_token
$advList = $r.data.advertiser_ids
$adv = ""
if ($advList -and $advList.Count -gt 0) { $adv = [string]$advList[0] } else { $adv = "7646349875793182738" }
Write-Host ("OK - Token erhalten. Advertiser: " + $adv)

# In luxe-secrets.ps1 schreiben (alte TIKTOK-Zeilen ersetzen)
$sf = Join-Path $env:USERPROFILE "luxe-secrets.ps1"
$lines = @()
if (Test-Path $sf) { $lines = Get-Content $sf | Where-Object { $_ -notmatch "TIKTOK_ACCESS_TOKEN|TIKTOK_ADVERTISER_ID" } }
$lines += ('$env:TIKTOK_ACCESS_TOKEN=' + "'" + $tok + "'")
$lines += ('$env:TIKTOK_ADVERTISER_ID=' + "'" + $adv + "'")
Set-Content -Path $sf -Value $lines
Write-Host "Gespeichert in luxe-secrets.ps1 (nicht im Repo)."

# Sofort-Test
. $sf
Write-Host "Teste Marketing-API..."
node automation/vps/tiktok-stats.mjs
Write-Host ""
Write-Host "FERTIG. Wenn oben keine 40105-Meldung kam: schreib Claude 'token ok'."
