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
# 3) QUEUE-DRAIN (FIX 2026-06-22, teuer gelernt): der CLOUD-AN/cmd-poll-Loop blieb mehrfach stehen
# (Heartbeat eingefroren) -> gequeuete Bots wie die Pixel-Kampagne liefen NIE. Dieser Health-Task laeuft
# dagegen verlaesslich + zieht den Code -> wir ziehen die Befehls-Queue HIER mit. Entkoppelt das Abarbeiten
# vom fragilen Loop. cmd-poll macht eigenes Lock/Pull/Push -> nach unserem Push aufrufen (kein Git-Interleave).
# Watchdog in cmd-poll/ai-browser verhindert, dass ein haengender Bot uns blockiert.
# ZEIT-BOX (FIX 2026-06-22): falls cmd-polls eigenes 'git pull' oder ein Bot haengt, darf das den Health-Task
# NICHT blockieren -> in einen Job mit 12-Min-Timeout kapseln, danach hart beenden. So erreicht der Task
# IMMER Schritt 4 (CLOUD-AN-Neustart) und der naechste Zyklus versucht es frisch.
try {
  $jb = Start-Job -ScriptBlock { param($p) & powershell -ExecutionPolicy Bypass -File $p } -ArgumentList "$repo\automation\local\cmd-poll.ps1"
  if (Wait-Job $jb -Timeout 720) { Receive-Job $jb | Out-Null } else { Stop-Job $jb }
  Remove-Job $jb -Force
} catch {}
# 4) CLOUD-AN-Heartbeat pruefen + bei Stale (>15 Min) neu starten (wie WATCHDOG den Listener) -> Loop heilt sich selbst.
try {
  $hb = "$repo\reports\heartbeat.json"; $stale = $true
  if (Test-Path $hb) { try { $j = Get-Content $hb -Raw | ConvertFrom-Json; if (((Get-Date) - [datetime]$j.ts).TotalMinutes -lt 15) { $stale = $false } } catch {} }
  if ($stale -and (Test-Path "$repo\automation\local\CLOUD-AN.bat")) {
    Start-Process cmd "/c `"$repo\automation\local\CLOUD-AN.bat`"" -WindowStyle Minimized
  }
} catch {}
