# scheduled-learn.ps1 - ASCII only. Geplanter Lern-Task (taeglich, OHNE User): der Bot WAECHST + LERNT selbst.
# Kette: analysieren (Social/Trends) -> ins Gehirn lernen -> Autopost-Queue aus Gewinnern nachfuellen -> committen.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$br = "claude/luxestyle-product-CizQ6"
git pull --rebase origin $br 2>$null | Out-Null
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }

# 1) Lernen aus Social-Analytics (TikTok-Performance -> gelernte Hashtag/Caption-Pools, Ratsche)
if (Test-Path "automation/learn_from_analytics.mjs") { node "automation/learn_from_analytics.mjs" 2>$null }
# 2) Trends scannen (gratis Google-Trends-CH + KI-Ideen, strikt CH/Mundart)
if (Test-Path "automation/trends/trend_scan.mjs") { node "automation/trends/trend_scan.mjs" 2>$null }
# 3) Meta-Engagement-Analyse (wenn META_ACCESS_TOKEN da)
if (Test-Path "automation/reel-analytics.mjs") { node "automation/reel-analytics.mjs" 2>$null }
# 4) Volle Auto-Kette via git-bash, falls vorhanden (analyse->lernen->Queue nachfuellen->naechste Aktionen)
$bash = "C:\Program Files\Git\bin\bash.exe"
if ((Test-Path $bash) -and (Test-Path "automation/brain/auto.sh")) { & $bash -lc "cd '$($repo -replace '\\','/' -replace '^C:','/c')' && bash automation/brain/auto.sh" 2>$null }

# Gelerntes committen (Gehirn/Pools/Queue/Reports) -> jede Session + der Worker nutzen es sofort
git add automation/brain/ automation/cloudflare/luxe-poster/src/queue.json reports/ social/ 2>$null
git commit -m "auto(learn): taeglich analysiert + gelernt + Queue mit Gewinnern nachgefuellt" 2>$null
git pull --rebase origin $br 2>$null | Out-Null
git push origin $br 2>$null
