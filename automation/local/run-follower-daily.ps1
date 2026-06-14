# run-follower-daily.ps1 — LuxeStyle CH-Follower OHNE Befehl (für Windows-Taskplaner)
# Startet Brave mit Debug-Port (falls nicht offen) und holt dann CH-Follower. 1x/Tag.
# Wochentags-Logik: Sonntags zusätzlich Entfolgen der Nicht-Zurückfolger.
#
# EINMALIGE EINRICHTUNG (dann läuft es täglich von selbst, kein Tippen mehr):
#   schtasks /create /tn "LuxeFollower" /sc daily /st 10:00 ^
#     /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\allen\aban-news-landing\automation\local\run-follower-daily.ps1"
#   (einmal vorher Brave mit dem brave-agent-Profil bei Instagram + TikTok einloggen — bleibt eingeloggt.)

$ErrorActionPreference = "SilentlyContinue"
$port = 9222
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$profile = "$env:USERPROFILE\brave-agent"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)  # ...\aban-news-landing

# 1) Brave mit Debug-Port starten, falls Port noch nicht lauscht
$open = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $open) {
  Start-Process $brave "--remote-debugging-port=$port --user-data-dir=`"$profile`""
  Start-Sleep -Seconds 25   # Browser + Session laden lassen
}

# 2) Repo aktuell halten (optional, ignoriert Fehler) + Follower holen
Set-Location $repo
git pull origin claude/luxestyle-product-CizQ6 2>$null
node "automation/local/ch-follower-growth.mjs"

# 3) Sonntags zusätzlich aufräumen (entfolgt Nicht-Zurückfolger nach ~14 Tagen)
if ((Get-Date).DayOfWeek -eq "Sunday") {
  node "automation/local/ch-unfollow.mjs"
}
