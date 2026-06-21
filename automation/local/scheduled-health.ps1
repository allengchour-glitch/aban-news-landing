# scheduled-health.ps1 - ASCII only. Geplanter Task: autonomer Posting-Live-Check (+ committet Ergebnis).
# Laeuft mehrmals taeglich OHNE User -> erkennt gepostet/doppel/Fehler, damit jede Session es sofort sieht.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$br = "claude/luxestyle-product-CizQ6"
git pull --rebase origin $br 2>$null | Out-Null
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }
# 1) Posting-Live-Check (TikTok/Kampagne/Meta + echte Doppel + Fehler)
node "automation/local/post-health.mjs" 2>$null
# 2) Health-Check des Automations-Stacks (Provider/Keys), falls vorhanden
if (Test-Path "automation/health-check.mjs") { node "automation/health-check.mjs" 2>$null }
git add -f reports/post-health.json reports/tiktok-last-run.json reports/health-*.json 2>$null
git commit -m "auto(health): geplanter Live-Check (gepostet/doppel/Fehler)" 2>$null
git pull --rebase origin $br 2>$null | Out-Null
git push origin $br 2>$null
