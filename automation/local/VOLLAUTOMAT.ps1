# VOLLAUTOMAT.ps1 — SUPER-AUTONOMER PC-Bot. Robuste Architektur (User 2026-06-19 „fix für super autonome bot"):
# Direkte Skript-Ausführung über Windows-Tasks — KEIN Cloudflare-Worker-Poll, KEIN Listener-Dauerpoll,
# KEIN git-pull im Hot-Path → KEIN Git-Lock. Updates laufen separat im Modus 'update' (ruhiges Fenster).
#
# Aufruf:  powershell -ExecutionPolicy Bypass -File VOLLAUTOMAT.ps1 -Mode update|post|engage|weekly
#   update (1x/Tag früh, allein): lock-proof Repo-Sync (kill node, reset --hard) → neuester Code
#   post   (10:00 + 19:00): TikTok analyze→post→engage + tutti/anibis + lernen
#   engage (09/12/15/21):  analyze + Kommentare beantworten + Follower + DMs + lernen
#   weekly (So): Entfolgen + FB-Gruppen
#
# Voraussetzung: Brave-Profil 'brave-agent' bei TikTok/IG/tutti EINGELOGGT. PC an. Eingerichtet via SUPERBOT-SETUP.bat.
param([string]$Mode = "post")
$ErrorActionPreference = "Continue"
$branch = "claude/luxestyle-product-CizQ6"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$log = Join-Path $PSScriptRoot "vollautomat.log"
function Log($m){ $line="[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m; Write-Host $line; Add-Content $log $line }
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }

# ===== Modus 'update' : LOCK-PROOF Repo-Sync (läuft allein, kein Posting gleichzeitig → keine Lock-Konkurrenz) =====
if ($Mode -eq "update") {
  Log "=== UPDATE: lock-proof Sync auf origin/$branch ==="
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue  # node-Locks lösen
  & attrib -R "$repo\*.*" /S /D 2>$null                                                               # Schreibschutz weg
  & git fetch origin $branch 2>&1 | ForEach-Object { Add-Content $log $_ }
  & git reset --hard "origin/$branch" 2>&1 | ForEach-Object { Add-Content $log $_ }
  & git clean -fd 2>&1 | ForEach-Object { Add-Content $log $_ }
  Log "UPDATE fertig: $(& git rev-parse --short HEAD)"
  return
}

# --- Brave-Debug-Port 9222 sicherstellen (kein git noetig) ---
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$open = Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue
if (-not $open -and (Test-Path $brave)) {
  Log "Starte Brave (brave-agent) mit Debug-Port 9222..."
  Start-Process $brave "--remote-debugging-port=9222 --user-data-dir=`"$env:USERPROFILE\brave-agent`""
  Start-Sleep -Seconds 18
}

# Node-Runner mit Argumenten + ENV. Best-effort, ein Fehler stoppt den Rest nicht.
function Node($script, [string[]]$nargs=@(), $env_pairs=@{}){
  foreach($k in $env_pairs.Keys){ Set-Item -Path "Env:$k" -Value $env_pairs[$k] }
  Log ("RUN {0} {1} {2}" -f $script, ($nargs -join ' '), (($env_pairs.GetEnumerator()|%{$_.Key+'='+$_.Value}) -join ' '))
  try { & node $script @nargs 2>&1 | ForEach-Object { Add-Content $log $_ } ; Log "OK $script" }
  catch { Log "FEHLER $script : $_" }
  foreach($k in $env_pairs.Keys){ Remove-Item -Path "Env:$k" -ErrorAction SilentlyContinue }
}

Log "=== VOLLAUTOMAT Modus=$Mode START ==="
switch ($Mode) {
  "post" {
    Node "automation/local/tiktok-bot.mjs" @("analyze","--max","80")    # erst lernen
    Node "automation/local/tiktok-bot.mjs" @("post")                    # dann 1 Reel posten (stumm)
    Node "automation/local/tiktok-bot.mjs" @("engage","--cap","10")     # Kommentare beantworten
    Node "automation/local/tutti-post.mjs"  @() @{ AUTO_PUBLISH="1"; TUTTI_CAP="3" }
    Node "automation/local/anibis-post.mjs" @() @{ AUTO_PUBLISH="1"; ANIBIS_CAP="3" }
    Node "automation/brain/self_learn.mjs"
  }
  "engage" {
    Node "automation/local/tiktok-bot.mjs" @("analyze","--max","80")
    Node "automation/local/tiktok-bot.mjs" @("engage","--cap","12")
    Node "automation/local/ch-follower-growth.mjs"
    Node "automation/local/ig-dm-browser.mjs"
    Node "automation/local/tiktok-dm-browser.mjs"
    Node "automation/local/fb-group-post.mjs"
    Node "automation/brain/self_learn.mjs"
  }
  "weekly" {
    Node "automation/local/ch-unfollow.mjs"
    Node "automation/local/fb-group-join.mjs"
  }
  default { Log "Unbekannter Modus '$Mode' — nichts getan." }
}
Log "=== VOLLAUTOMAT Modus=$Mode FERTIG ==="
