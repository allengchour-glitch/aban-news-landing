# scheduled-youtube.ps1 - ASCII only. Geplant (woechentlich): YouTube-Creator analysieren -> Gehirn.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot); Set-Location $repo
$br = "claude/luxestyle-product-CizQ6"
git pull --rebase origin $br 2>$null | Out-Null
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }
node "automation/yt-learn.mjs" 2>$null
git add automation/brain/ reports/yt-learn-report.json automation/yt-learn-lehren.md 2>$null
git commit -m "auto(yt-learn): woechentlich von YouTube gelernt" 2>$null
git pull --rebase origin $br 2>$null | Out-Null
git push origin $br 2>$null
