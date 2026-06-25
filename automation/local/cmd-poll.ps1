# cmd-poll.ps1 - ASCII only. FERNSTEUERUNG: holt Cloud-Befehle (Worker-Queue) alle paar Min + fuehrt aus.
# Leichtgewichtig: KEIN git, KEINE Analyse -> kein Lock, schnell. Du gibst Befehle von ueberall, PC fuehrt aus.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
# FIX 2026-06-21 (teuer): npm i (Stagehand) macht package.json dirty -> git pull --rebase scheitert -> Bot-Pushes
# kamen nie an (sah aus wie AVG-Block, war es aber NICHT). Vor jedem Lauf die npm-Aenderungen verwerfen:
git checkout -- package.json package-lock.json 2>$null
# PURE-AUTOMATION (User 2026-06-21 "fuer spaeter pure automation"): vor jedem Kampagne-Lauf die Keys laden
# (GROQ/GEMINI -> Stagehand-AI klickt selbst; Shopify-Creds) + Stagehand-Paket sicherstellen. Damit laeuft eine
# aus der Cloud gequeuete Kampagne vollautonom am PC, ohne dass der User einen Befehl tippt.
function Ensure-Campaign {
  if (Test-Path "$env:USERPROFILE\luxe-secrets.ps1") { . "$env:USERPROFILE\luxe-secrets.ps1" }
  if (-not (Test-Path "node_modules\@browserbasehq\stagehand")) { npm i @browserbasehq/stagehand --no-audit --no-fund 2>$null | Out-Null }
  git checkout -- package.json package-lock.json 2>$null   # npm-Dirt verwerfen -> Push am Befehlsende klappt
}
# SELBST-PULL + NEUSTART (FIX 2026-06-21 Timing-Falle): neuesten Code holen BEVOR Befehle laufen, damit
# NEUE Befehle/Scripts sofort erkannt werden (sonst verwirft die alte cmd-poll unbekannte Befehle). Aendert
# der Pull die cmd-poll.ps1 selbst -> EINMAL mit neuem Code neu starten. Vor dem Lock -> kein Konflikt.
if (-not ($args -contains '-reexec')) {
  $before = (git rev-parse HEAD 2>$null)
  git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null | Out-Null
  $after = (git rev-parse HEAD 2>$null)
  if ($before -and $after -and ($before -ne $after)) {
    # SMOKE-TEST + AUTO-ROLLBACK (Recherche 2026-06-21): bricht ein gepulltes node-Script syntaktisch,
    # zurueck auf last-good-SHA, damit ein kaputter Push den PC NIE lahmlegt.
    $bad = $false
    foreach ($s in @("automation/local/cmd-poll-helpers.check","automation/local/post-health.mjs","automation/local/tiktok-upload-browser.mjs","automation/lib/resilience.mjs")) {
      if ((Test-Path $s) -and ($s -like "*.mjs")) { node --check $s 2>$null; if ($LASTEXITCODE -ne 0) { $bad = $true } }
    }
    if ($bad) { git reset --hard $before 2>$null | Out-Null; "ROLLBACK $((Get-Date).ToString('o')): kaputter Pull -> zurueck auf $before" | Out-File -Append "reports\selfupdate-rollback.txt" }
    else { & powershell -ExecutionPolicy Bypass -File $PSCommandPath -reexec; exit }
  }
}
# HEARTBEAT (Recherche 2026-06-21): jeder Poll schreibt Lebenszeichen -> Cloud/Worker sieht ob PC laeuft.
try { @{ ts = (Get-Date).ToString("o"); task = "cmd-poll"; head = (git rev-parse --short HEAD 2>$null) } | ConvertTo-Json -Compress | Set-Content "reports\heartbeat.json" -EA SilentlyContinue } catch {}
# SINGLE-INSTANCE, aber STALE-TOLERANT (FIX 2026-06-20 v2 "PC immer aktiv, Queue waechst trotzdem"):
# Der alte Global-Mutex blockierte FUER IMMER, wenn ein Lauf an einem Browser/node-Aufruf haengen blieb
# (Lock nie freigegeben -> jeder neue Poll stieg sofort aus -> Kanal tot). Jetzt: Lock-DATEI mit Zeitstempel.
# Ist der Lock juenger als 12 Min = echte laufende Instanz -> nicht stapeln. Aelter = haengengeblieben -> uebernehmen.
$lock = Join-Path $env:TEMP "luxe-cmdpoll.lock"
if (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -lt 12) { exit }   # frischer Lock = laeuft noch -> raus
}                                            # sonst: stale -> uebernehmen
Set-Content -Path $lock -Value "$PID" -ErrorAction SilentlyContinue
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
function Ensure-Brave {
  $o = Get-NetTCPConnection -LocalPort 9222 -State Listen -EA SilentlyContinue
  if (-not $o -and (Test-Path $brave)) {
    Get-Process brave -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue; Start-Sleep 3
    Start-Process $brave -ArgumentList "--remote-debugging-port=9222","--user-data-dir=$env:USERPROFILE\brave-agent"; Start-Sleep 18
  }
}
try {
  $cmds = @()
  # QUELLE 1: Cloudflare-Worker (drain) - kann ausfallen (Tageslimit/1101).
  try { $r = Invoke-RestMethod -Uri "https://luxe-poster.allengchour.workers.dev/?key=Abanaban192%2B&drain=1" -TimeoutSec 25; if ($r.commands) { foreach ($it in $r.commands) { $cmds += "$($it.cmd)" } } } catch { Write-Host "[worker] down (Cloudflare-Limit?) -> nutze git-Kanal" }
  # QUELLE 2: GIT-BEFEHLSKANAL (worker-unabhaengig, "immer ein Weg"): Cloud committet automation/local/cloud-commands.json
  # -> PC pullt + fuehrt neue Befehle aus (Dedup via lokalem done-file). Funktioniert auch wenn der Worker tot ist.
  git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null | Out-Null
  $doneFile = "automation/local/cloud-commands-done.txt"
  if (Test-Path "automation/local/cloud-commands.json") {
    try {
      $done = if (Test-Path $doneFile) { Get-Content $doneFile } else { @() }
      foreach ($g in (Get-Content "automation/local/cloud-commands.json" -Raw | ConvertFrom-Json)) {
        if ($done -notcontains "$($g.id)") { $cmds += "$($g.cmd)"; Add-Content $doneFile "$($g.id)"; Write-Host "[git-cmd] $($g.cmd) (id $($g.id))" }
      }
    } catch { Write-Host "[git-cmd] Lesefehler: $($_.Exception.Message)" }
  }
  if (-not $cmds -or $cmds.Count -eq 0) { exit }
  foreach ($c in $cmds) {
    Write-Host "[cmd] $c"; Ensure-Brave
    switch ($c) {
      "tiktok"       { if ($env:TT_ACCESS_TOKEN) { $env:TT_PRIVACY_LEVEL="DRAFT"; & node "automation/tiktok-autopost.mjs" } else { & node "automation/local/tiktok-upload-browser.mjs" } }
      "post"         { if ($env:TT_ACCESS_TOKEN) { $env:TT_PRIVACY_LEVEL="DRAFT"; & node "automation/tiktok-autopost.mjs" } else { & node "automation/local/tiktok-upload-browser.mjs" } }
      "tiktok-api"   { $env:TT_PRIVACY_LEVEL="DRAFT"; & node "automation/tiktok-autopost.mjs" }
      "autobot"      { & powershell -ExecutionPolicy Bypass -File "automation/local/tiktok-autobot.ps1" }
      "giga"         { & powershell -ExecutionPolicy Bypass -File "automation/local/tiktok-giga-bot.ps1" }
      "tiktok-photo" { & node "automation/tiktok-photo-post.mjs" }
      "ig-delete"   { & node "automation/local/ig-delete-dupes.mjs"; git add automation/local/ig-delete-shots/* 2>$null; git commit -m "ig-delete screenshots" 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "ig-delete-papillon" { $env:PLATFORM="ig"; $env:MATCH="Armkette Papillon (butterfly bracelet on white knit)"; & node "automation/local/ig-delete-dupes.mjs" --go --n 2; git add -f automation/local/ig-delete-shots/* reports/ig-delete.json 2>$null; git commit -m "auto(ig-delete-papillon): 2 Papillon-Dubletten gelöscht (behält 1) + Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "ig-cover"    { & node "automation/local/ig-reel-cover.mjs"; git add -f automation/local/ig-cover-shots/* reports/ig-cover.json 2>$null; git commit -m "auto(ig-cover): Reel-Cover-Versuch + Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "fb-check"    { & node "automation/local/fb-check.mjs"; git add -f automation/local/fb-check-shots/* reports/fb-check.json 2>$null; git commit -m "auto(fb-check): Facebook-Seite Screenshots + Dubletten-Check" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "tt-delete-hat" { $env:PLATFORM="tiktok"; $env:MATCH="a black wide-brim felt fedora hat on white background (Fedora/Filzhut Montana)"; & node "automation/local/tiktok-delete-dupes.mjs" --go --n 2; git add -f automation/local/tiktok-delete-shots/* reports/tiktok-delete.json 2>$null; git commit -m "auto(tt-delete-hat): 2 Fedora-Dubletten gelöscht (behält 1) + Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "ads-setup"   { & node "automation/local/tiktok-ads-setup.mjs"; git add -f automation/local/tiktok-ads-shots/* reports/tiktok-ads-setup.json 2>$null; git commit -m "auto(ads-setup): TikTok-Ads-Onboarding selbst ausgefüllt (stoppt vor Karte) + Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "tiktok-delete-dry" { $env:PLATFORM="tiktok"; $env:MATCH="a man or men's clothing (Herren)"; & node "automation/local/tiktok-delete-dupes.mjs" --n 3; git add -f automation/local/tiktok-delete-shots/* reports/tiktok-delete.json 2>$null; git commit -m "auto(tiktok-delete-dry): Herren-Video-Kandidaten Screenshots (kein Löschen)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "konto-analyse" { & node "automation/local/tiktok-accounts-analyze.mjs"; git add -f automation/local/account-shots/* reports/tiktok-accounts.json 2>$null; git commit -m "auto(konto): TikTok-Konten-Analyse + Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "post-health" { & node "automation/local/post-health.mjs"; git add -f reports/post-health.json reports/tiktok-last-run.json 2>$null; git commit -m "auto(health): Posting-Live-Check (gepostet/doppel/Fehler)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "profil"      { & node "automation/local/social-profile-update.mjs"; git add -f automation/local/profile-shots/* reports/profile-update.json 2>$null; git commit -m "auto(profil): IG+TikTok Profi-Bio + Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "markt-capture" { & node "automation/local/marketplace-capture.mjs"; git add -f automation/local/marketplace-shots/* reports/marketplace-capture.json 2>$null; git commit -m "auto(markt): tutti/anibis/ricardo Inbox+Profil Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "ai-test"     { & node "automation/local/ai-browser-test.mjs"; git add -f reports/ai-browser-test.json 2>$null; git commit -m "auto(ai-test): Stagehand-Installation verifiziert" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "markt-profil" { & node "automation/local/marketplace-profile.mjs"; git add -f automation/local/marketplace-shots/* reports/marketplace-profile.json 2>$null; git commit -m "auto(markt-profil): tutti/anibis/ricardo Profil + Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "trust-fix"   { if(Test-Path "$env:USERPROFILE\luxe-secrets.ps1"){ . "$env:USERPROFILE\luxe-secrets.ps1" }; & node "automation/fix_trust_consistency.mjs" }
      "tt-delete-dry" { & node "automation/local/tiktok-delete-dupes.mjs"; git add -f automation/local/tiktok-delete-shots/* reports/tiktok-delete.json 2>$null; git commit -m "auto(tt-delete): DRY Dubletten-Vorschau" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "tt-delete-go" { & node "automation/local/tiktok-delete-dupes.mjs" --go --n 3; git add -f automation/local/tiktok-delete-shots/* reports/tiktok-delete.json 2>$null; git commit -m "auto(tt-delete): 3 Dubletten geloescht" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "ig-delete-dry" { $env:PLATFORM="ig"; & node "automation/local/tiktok-delete-dupes.mjs"; $env:PLATFORM=$null; git add -f automation/local/ig-delete-shots/* reports/ig-delete.json 2>$null; git commit -m "auto(ig-delete): DRY Dubletten-Vorschau (AI)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "ig-delete-go" { $env:PLATFORM="ig"; & node "automation/local/tiktok-delete-dupes.mjs" --go --n 2; $env:PLATFORM=$null; git add -f automation/local/ig-delete-shots/* reports/ig-delete.json 2>$null; git commit -m "auto(ig-delete): 2 Dubletten geloescht (AI)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "fb-join"     { & node "automation/local/fb-groups.mjs" join; git add -f automation/local/fb-groups-shots/* automation/local/fb-groups-done.txt reports/fb-groups.json 2>$null; git commit -m "auto(fb-join): Gruppen beitreten (langsam)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "fb-group-post" { & node "automation/local/fb-groups.mjs" post; git add -f automation/local/fb-groups-shots/* automation/local/fb-groups-done.txt reports/fb-groups.json 2>$null; git commit -m "auto(fb-group-post): 1 nativer Post in Gruppe" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "sources"      { & node "automation/check-sources.mjs" --fix; git add -A 2>$null; git commit -m "auto(Quellen-Check): Dubletten bereinigt" 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "seo"          { Start-Process powershell -WindowStyle Hidden -ArgumentList '-ExecutionPolicy','Bypass','-Command',"`$env:MAX=200; node automation/seo_polish.mjs; git add -A; git commit -m auto-seo; git pull --rebase origin claude/luxestyle-product-CizQ6; git push origin claude/luxestyle-product-CizQ6" }
      "enrich"       { Start-Process powershell -WindowStyle Hidden -ArgumentList '-ExecutionPolicy','Bypass','-Command',"if(Test-Path `"`$env:USERPROFILE\luxe-secrets.ps1`"){ . `"`$env:USERPROFILE\luxe-secrets.ps1`" }; `$env:MAX=120; node automation/enrich_apparel_descriptions.mjs; git add -A; git commit -m auto-enrich; git pull --rebase origin claude/luxestyle-product-CizQ6; git push origin claude/luxestyle-product-CizQ6" }
      "feed"         { Start-Process powershell -WindowStyle Hidden -ArgumentList '-ExecutionPolicy','Bypass','-Command',"if(Test-Path `"`$env:USERPROFILE\luxe-secrets.ps1`"){ . `"`$env:USERPROFILE\luxe-secrets.ps1`" }; `$env:MAX=300; node automation/feed_polish.mjs; git add -A; git commit -m auto-feed; git pull --rebase origin claude/luxestyle-product-CizQ6; git push origin claude/luxestyle-product-CizQ6" }
      "shippingtext" { $env:MAX="500"; & node "automation/fix_shipping_text.mjs"; Remove-Item Env:MAX -EA SilentlyContinue }
      "follower"     { & node "automation/local/ch-follower-growth.mjs" }
      "engage"       { & node "automation/local/tiktok-bot.mjs" engage --cap 12 }
      "meta-dm"      { $env:MAX="10"; & node "automation/local/ig-dm-browser.mjs"; & node "automation/local/tiktok-dm-browser.mjs"; & node "automation/local/tiktok-bot.mjs" engage --cap 10; $env:MAX=$null; git add -f ig-dm-done.json tiktok-dm-done.json automation/local/ig-dm-shots/* automation/local/tiktok-dm-shots/* 2>$null; git commit -m "auto(meta-dm): IG+TikTok DMs + Kommentare beantwortet" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "analyse"      { & node "automation/local/tiktok-bot.mjs" analyze --max 80; & node "automation/tiktok-pixel-check.mjs" }
      "health"       { & node "automation/health-check.mjs"; git add reports/ 2>$null; git commit -m "auto(health): Provider/Key-Check" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "image-audit"  { Start-Process powershell -WindowStyle Hidden -ArgumentList '-ExecutionPolicy','Bypass','-Command',"`$env:MAX=300; node automation/image-audit.mjs; git add reports/; git commit -m auto-imageaudit; git pull --rebase origin claude/luxestyle-product-CizQ6; git push origin claude/luxestyle-product-CizQ6" }
      "cleanup"      { & powershell -ExecutionPolicy Bypass -File "automation/local/cleanup-storage.ps1" }
      "yt-learn"     { Start-Process powershell -WindowStyle Hidden -ArgumentList '-ExecutionPolicy','Bypass','-Command',"node automation/yt-learn.mjs; git add reports/; git commit -m auto-ytlearn; git pull --rebase origin claude/luxestyle-product-CizQ6; git push origin claude/luxestyle-product-CizQ6" }
      "tutti"        { $env:AUTO_PUBLISH="1"; & node "automation/local/tutti-post.mjs"; $env:AUTO_PUBLISH=$null }
      "anibis"       { $env:AUTO_PUBLISH="1"; & node "automation/local/anibis-post.mjs"; $env:AUTO_PUBLISH=$null }
      "campaign-dry" { Ensure-Campaign; & node "automation/local/tiktok-campaign-port.mjs" --dry; git add -f automation/local/campaign-shots/* reports/campaign-last-run.json 2>$null; git commit -m "auto(campaign-dry): Screenshots zur Kontrolle" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "campaign-go"  { Ensure-Campaign; $env:AUTO_LAUNCH="1"; & node "automation/local/tiktok-campaign-port.mjs"; $env:AUTO_LAUNCH=$null; git add -f automation/local/campaign-shots/* reports/campaign-last-run.json 2>$null; git commit -m "auto(campaign-go): Screenshots zur Kontrolle" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "datasharing"    { Ensure-Campaign; & node "automation/local/shopify-datasharing.mjs"; git add -f automation/local/datasharing-shots/* reports/datasharing-last-run.json 2>$null; git commit -m "auto(datasharing): Datenfreigabe DRY" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "datasharing-go" { Ensure-Campaign; $env:AUTO_GO="1"; & node "automation/local/shopify-datasharing.mjs"; $env:AUTO_GO=$null; git add -f automation/local/datasharing-shots/* reports/datasharing-last-run.json 2>$null; git commit -m "auto(datasharing-go): Datenfreigabe Maximum gesetzt" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "storefront-audit" { Ensure-Campaign; & node "automation/local/storefront-audit.mjs"; git add -f automation/local/storefront-shots/* reports/storefront-audit.json 2>$null; git commit -m "auto(storefront-audit): jede Seite Screenshot+Vision" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "shopify-campaign"    { Ensure-Campaign; & node "automation/local/shopify-tiktok-campaign.mjs"; git add -f automation/local/shopify-campaign-shots/* reports/shopify-campaign-last-run.json 2>$null; git commit -m "auto(shopify-campaign): Shopify-TikTok Smart+ DRY Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "shopify-campaign-go" { Ensure-Campaign; $env:AUTO_LAUNCH="1"; $env:TT_DAILY_BUDGET="10"; & node "automation/local/shopify-tiktok-campaign.mjs"; $env:AUTO_LAUNCH=$null; $env:TT_DAILY_BUDGET=$null; git add -f automation/local/shopify-campaign-shots/* reports/shopify-campaign-last-run.json 2>$null; git commit -m "auto(shopify-campaign-go): Smart+ Kampagne abgesendet" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "campaign-traffic" { Ensure-Campaign; $env:AUTO_LAUNCH="1"; $env:TT_OBJECTIVE="Traffic"; $env:TT_DAILY_BUDGET="20"; $env:TT_TOTAL_BUDGET="70"; "" | Out-File -Encoding ascii automation/local/tiktok-campaign-ledger.txt; & node "automation/local/tiktok-campaign-port.mjs"; $env:AUTO_LAUNCH=$null; $env:TT_OBJECTIVE=$null; $env:TT_DAILY_BUDGET=$null; $env:TT_TOTAL_BUDGET=$null; git add -f automation/local/campaign-shots/* reports/campaign-last-run.json 2>$null; git commit -m "auto(campaign-traffic): Traffic-Kampagne (kein Pixel) Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "audit-ig"     { Ensure-Campaign; & node "automation/local/post-audit.mjs" --platform ig; git add -f automation/local/post-audit-shots/* reports/post-audit-ig.json 2>$null; git commit -m "auto(audit-ig): Post-Audit Vision (DRY)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "audit-tiktok" { Ensure-Campaign; & node "automation/local/post-audit.mjs" --platform tiktok; git add -f automation/local/post-audit-shots/* reports/post-audit-tiktok.json 2>$null; git commit -m "auto(audit-tiktok): Post-Audit Vision (DRY)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "audit-fb"     { Ensure-Campaign; & node "automation/local/post-audit.mjs" --platform fb; git add -f automation/local/post-audit-shots/* reports/post-audit-fb.json 2>$null; git commit -m "auto(audit-fb): Post-Audit Vision (DRY)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "audit-fb-go"  { Ensure-Campaign; & node "automation/local/post-audit.mjs" --platform fb --go; git add -f automation/local/post-audit-shots/* reports/post-audit-fb.json 2>$null; git commit -m "auto(audit-fb-go): Verstoesse geloescht" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "campaign-data" { Ensure-Campaign; $env:AUTO_LAUNCH="1"; $env:TT_EVENT="Add to Cart"; $env:TT_DAILY_BUDGET="10"; $env:TT_TOTAL_BUDGET="70"; "" | Out-File -Encoding ascii automation/local/tiktok-campaign-ledger.txt; & node "automation/local/tiktok-campaign-port.mjs"; $env:AUTO_LAUNCH=$null; $env:TT_EVENT=$null; $env:TT_DAILY_BUDGET=$null; $env:TT_TOTAL_BUDGET=$null; git add -f automation/local/campaign-shots/* reports/campaign-last-run.json 2>$null; git commit -m "auto(campaign-data): ATC-Daten-Kampagne Screenshots" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "bigbuy-beauty" { Start-Process powershell -ArgumentList '-ExecutionPolicy','Bypass','-Command','$env:ROOT_NAME=''cosmet'';$env:MAX=''12'';node dropship/bigbuy_import.mjs' -WindowStyle Hidden }
      "bigbuy-makeup" { Start-Process powershell -ArgumentList '-ExecutionPolicy','Bypass','-Command','$env:ROOT_NAME=''perfum'';$env:MAX=''12'';node dropship/bigbuy_import.mjs' -WindowStyle Hidden }
      "bigbuy-premium" { Start-Process powershell -ArgumentList '-ExecutionPolicy','Bypass','-File','automation/local/bigbuy-premium.ps1' -WindowStyle Hidden }
      "tt-review-check" { & node "automation/local/tt-review-check.mjs"; git add -f automation/local/tt-review-shots/* reports/tt-review-check.json 2>$null; git commit -m "auto(tt-review-check): Ablehnungs-Grund der abgelehnten Ad ausgelesen" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "tt-events" { & node "automation/local/tt-events-check.mjs"; git add -f automation/local/tt-events-shots/* reports/tt-events-check.json 2>$null; git commit -m "auto(tt-events): TikTok Events Manager Screenshots (Pixel-Daten-Beweis)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "video-audit" { if(Test-Path "$env:USERPROFILE\luxe-secrets.ps1"){ . "$env:USERPROFILE\luxe-secrets.ps1" }; $env:MAX="60"; & node "automation/video-audit.mjs"; $env:MAX=$null; git add -f reports/video-audit.json 2>$null; git commit -m "auto(video-audit): Gemini-Vision QA aller Werbe-Videos" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "nanobanana" { Ensure-Campaign; & powershell -ExecutionPolicy Bypass -File "automation/local/nanobanana-batch.ps1"; git add -f social/ai-lifestyle/* 2>$null; git commit -m "auto(nanobanana): KI-Lifestyle-Bilder aus echten Produktbildern (Nano Banana 2)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "nanobanana-hero" { Ensure-Campaign; $env:NB_STYLE="hero"; $env:NB_MAX="6"; & powershell -ExecutionPolicy Bypass -File "automation/local/nanobanana-batch.ps1"; $env:NB_STYLE=$null; $env:NB_MAX=$null; git add -f social/ai-lifestyle/* 2>$null; git commit -m "auto(nanobanana-hero): dramatische Hero-Studio-Produktbilder (Nano Banana 2)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      "luma-hero" { Ensure-Campaign; & node "automation/luma_product_video.mjs" --pids 15402998792577 --ugc --no-attach --queue; git add -f reels/*.mp4 social/video_queue.csv 2>$null; git commit -m "auto(luma-hero): 1 Luma-Winner-Clip (cost-safe, Flame Diffuser)" 2>$null; git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null; git push origin claude/luxestyle-product-CizQ6 2>$null }
      default        { Write-Host "  (unbekannt: $c)" }
    }
  }
} catch { } finally { Remove-Item $lock -ErrorAction SilentlyContinue }
