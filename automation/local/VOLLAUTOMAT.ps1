# VOLLAUTOMAT.ps1 — robuster PC-Bot OHNE Cloudflare-Worker / Listener-Poll / git-pull.
# WARUM: vermeidet KV-Gratis-Limit (Worker), Git-Lock (kein pull) und Dauer-Polling.
# Startet die Browser-/Automations-Skripte DIREKT, je nach Modus. Von Windows-Task aufgerufen.
#
# Aufruf:  powershell -ExecutionPolicy Bypass -File VOLLAUTOMAT.ps1 -Mode post|engage|weekly
#   post   (1-2x/Tag): 1 Reel auf TikTok + tutti/anibis-Inserate + Gehirn lernt
#   engage (mehrmals/Tag): Follower + Kommentare/DMs beantworten + FB-Gruppen  (User: "mehrmals analysiere+chatte+folge, weniger selber posten")
#   weekly (1x/Woche): Entfolgen der Nicht-Zurueckfolger
#
# Voraussetzung: Brave-Profil 'brave-agent' bei IG/TikTok/tutti EINGELOGGT. PC an.
param([string]$Mode = "post")
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$log = Join-Path $PSScriptRoot "vollautomat.log"
function Log($m){ $line="[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m; Write-Host $line; Add-Content $log $line }
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }

# --- Brave-Debug-Port 9222 sicherstellen (kein git noetig) ---
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$open = Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue
if (-not $open -and (Test-Path $brave)) {
  Log "Starte Brave (brave-agent) mit Debug-Port 9222..."
  Start-Process $brave "--remote-debugging-port=9222 --user-data-dir=`"$env:USERPROFILE\brave-agent`""
  Start-Sleep -Seconds 18
}

function Node($script, $env_pairs=@{}){
  foreach($k in $env_pairs.Keys){ Set-Item -Path "Env:$k" -Value $env_pairs[$k] }
  Log "RUN $script $(($env_pairs.GetEnumerator()|%{$_.Key+'='+$_.Value}) -join ' ')"
  try { & node $script 2>&1 | ForEach-Object { Add-Content $log $_ } ; Log "OK $script" }
  catch { Log "FEHLER $script : $_" }
  foreach($k in $env_pairs.Keys){ Remove-Item -Path "Env:$k" -ErrorAction SilentlyContinue }
}

Log "=== VOLLAUTOMAT Modus=$Mode START ==="
switch ($Mode) {
  "post" {
    Node "automation/local/tiktok-upload-browser.mjs"
    Node "automation/local/tutti-post.mjs"  @{ AUTO_PUBLISH="1"; TUTTI_CAP="3" }
    Node "automation/local/anibis-post.mjs" @{ AUTO_PUBLISH="1"; ANIBIS_CAP="3" }
    Node "automation/brain/self_learn.mjs"
  }
  "engage" {
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
