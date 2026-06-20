# VOLLAUTOMAT.ps1 - SUPER-AUTONOMER PC-Bot. Robuste Architektur (User 2026-06-19 "fix fuer super autonome bot"):
# Direkte Skript-Ausfuehrung ueber Windows-Tasks - KEIN Cloudflare-Worker-Poll, KEIN Listener-Dauerpoll,
# KEIN git-pull im Hot-Path -> KEIN Git-Lock. Updates laufen separat im Modus 'update' (ruhiges Fenster).
#
# Aufruf:  powershell -ExecutionPolicy Bypass -File VOLLAUTOMAT.ps1 -Mode update|post|engage|weekly
#   update (1x/Tag frueh, allein): lock-proof Repo-Sync (kill node, reset --hard) -> neuester Code
#   post   (10:00 + 19:00): TikTok analyze->post->engage + tutti/anibis + lernen
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

# ===== SINGLE-INSTANCE-SPERRE (FIX 2026-06-20: Runaway-Loop / Aufruftiefe-Ueberlauf) =====
# Verhindert, dass sich ueberlappende Tasks (z.B. SUPERBOT-Testlauf + geplanter LuxePost/LuxeEng)
# gleichzeitig denselben Brave + dasselbe vollautomat.log greifen und sich aufschaukeln. Nur EINE
# VOLLAUTOMAT-Instanz darf laufen; weitere beenden sich sofort sauber (kein Doppellauf, kein Stau).
$global:LuxeMutex = New-Object System.Threading.Mutex($false, "Global\LuxeVollautomat")
$gotLock = $false
try { $gotLock = $global:LuxeMutex.WaitOne(0) } catch { $gotLock = $true }  # AbandonedMutex = frei
if (-not $gotLock) { Log "Andere VOLLAUTOMAT-Instanz laeuft bereits -> beende (kein Doppellauf)."; return }

# ===== Modus 'update' : LOCK-PROOF Repo-Sync (laeuft allein, kein Posting gleichzeitig -> keine Lock-Konkurrenz) =====
if ($Mode -eq "update") {
  Log "=== UPDATE: lock-proof Sync auf origin/$branch ==="
  # SELBST-HEILEND (FIX 2026-06-20: das Lock-/Rechte-Drama nie wieder): Sperren loesen + Rechte fixen,
  # dann hart auf origin angleichen (lokale Bot-Commits = regenerierbar -> keine Divergenz mehr).
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Get-Process powershell,pwsh -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
  & attrib -R "$repo\*.*" /S /D 2>$null
  & takeown /F "$repo\automation\local" /R /D J 2>$null | Out-Null      # Besitz zurueck (gegen "Permission denied")
  & icacls "$repo\automation\local" /grant "$($env:USERNAME):F" /T /Q 2>$null | Out-Null
  & git fetch origin $branch 2>&1 | ForEach-Object { Add-Content $log $_ }
  & git reset --hard "origin/$branch" 2>&1 | ForEach-Object { Add-Content $log $_ }
  if ((& git rev-parse --short HEAD) -ne (& git rev-parse --short "origin/$branch")) {
    Log "UPDATE: 1. reset blockiert -> 5s + 2. Versuch (Handles loesen)"
    Start-Sleep -Seconds 5
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    & git reset --hard "origin/$branch" 2>&1 | ForEach-Object { Add-Content $log $_ }
  }
  Log "UPDATE fertig: $(& git rev-parse --short HEAD)"
  return
}

# --- Brave-Debug-Port 9222 sicherstellen (ZUVERLAeSSIG: wenn Port zu, ALLE Brave killen, dann brave-agent
#     mit Port neu starten - sonst wird --remote-debugging-port von einem offenen Brave ignoriert) ---
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$open = Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue
if (-not $open -and (Test-Path $brave)) {
  Log "Port 9222 zu -> alle Brave beenden + brave-agent mit Port neu starten..."
  Get-Process brave -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
  Start-Process $brave "--remote-debugging-port=9222 --user-data-dir=`"$env:USERPROFILE\brave-agent`""
  Start-Sleep -Seconds 18
}

# Node-Runner mit Argumenten + ENV. Best-effort, ein Fehler stoppt den Rest nicht.
# ROBUST (FIX 2026-06-20): Output geht in EINE Temp-Datei und wird EINMAL angehaengt, GEKAPPT auf 200
# Zeilen -> der frueher genutzte "2>&1 | ForEach-Object { Add-Content }"-Pipe konnte bei viel Node-Output
# die PowerShell-Aufruftiefe ueberlaufen + das Log mit tausenden Zeilen fluten. Hard-Timeout killt zudem
# jeden haengenden/loopenden node-Prozess, statt ewig Ressourcen zu fressen.
function Node($script, [string[]]$nargs=@(), $env_pairs=@{}, [int]$timeoutSec=1200){
  foreach($k in $env_pairs.Keys){ Set-Item -Path "Env:$k" -Value $env_pairs[$k] }
  Log ("RUN {0} {1} {2}" -f $script, ($nargs -join ' '), (($env_pairs.GetEnumerator()|%{$_.Key+'='+$_.Value}) -join ' '))
  $tmp = [System.IO.Path]::GetTempPath()
  $out = Join-Path $tmp ("va-out-" + [System.IO.Path]::GetRandomFileName() + ".txt")
  $err = Join-Path $tmp ("va-err-" + [System.IO.Path]::GetRandomFileName() + ".txt")
  try {
    $p = Start-Process -FilePath "node" -ArgumentList (@($script) + $nargs) -NoNewWindow -PassThru `
         -RedirectStandardOutput $out -RedirectStandardError $err
    if (-not $p.WaitForExit($timeoutSec * 1000)) {
      try { $p.Kill() } catch {}
      Log "TIMEOUT $script (>${timeoutSec}s) -> Prozess beendet (Schutz vor Endlosschleife)."
    } else {
      Log "OK $script (exit $($p.ExitCode))"
    }
  } catch { Log "FEHLER $script : $_" }
  finally {
    foreach($f in @($out, $err)){
      if (Test-Path $f) { try { Get-Content $f -TotalCount 200 -EA SilentlyContinue | ForEach-Object { Add-Content $log $_ } } catch {}; Remove-Item $f -EA SilentlyContinue }
    }
    foreach($k in $env_pairs.Keys){ Remove-Item -Path "Env:$k" -ErrorAction SilentlyContinue }
  }
}

Log "=== VOLLAUTOMAT Modus=$Mode START ==="
switch ($Mode) {
  "tiktok" {
    # REIN TIKTOK (User 2026-06-19 "alles nur fuer tiktok"): analysieren -> posten (stumm) -> Kommentare beantworten
    Node "automation/local/tiktok-bot.mjs" @("analyze","--max","80")
    Node "automation/local/tiktok-bot.mjs" @("post")
    Node "automation/local/tiktok-bot.mjs" @("engage","--cap","12")
  }
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
    Node "automation/local/ch-follower-growth.mjs" @() @{} 2700   # Follower: langsame Pausen -> mehr Zeit
    Node "automation/local/ig-dm-browser.mjs"      @() @{} 1800
    Node "automation/local/tiktok-dm-browser.mjs"  @() @{} 1800
    Node "automation/local/fb-group-post.mjs"
    Node "automation/brain/self_learn.mjs"
  }
  "weekly" {
    Node "automation/local/ch-unfollow.mjs"
    Node "automation/local/fb-group-join.mjs"
  }
  default { Log "Unbekannter Modus '$Mode' - nichts getan." }
}
Log "=== VOLLAUTOMAT Modus=$Mode FERTIG ==="
try { if ($gotLock) { $global:LuxeMutex.ReleaseMutex() } } catch {}
