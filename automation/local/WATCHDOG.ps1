# WATCHDOG.ps1 — hält den LuxeStyle-Bot von selbst am Leben (User 2026-06-19 „mach e Bot wo klickt").
# Läuft alle 10 Min (Task „LuxeWatchdog", vom Listener selbst registriert). Prüft den Heartbeat des
# Listeners; ist er tot/stale (>6 Min), startet er den Listener neu + sichert den Brave-Debug-Port.
# So fährt der Bot nach Crash/Reboot/Login von SELBST wieder hoch — ohne dass du klickst.
# Kein Admin nötig. Läuft nur sinnvoll, wenn der PC AN + ein Benutzer eingeloggt ist (Browser braucht Desktop).
$ErrorActionPreference = "SilentlyContinue"
$here = $PSScriptRoot
$BEAT = "$env:USERPROFILE\.luxe-listener-beat.txt"

# 1) Brave-Debug-Port 9222 sicherstellen (sonst scheitern alle Browser-Befehle)
$brave = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if (-not (Test-Path $brave)) { $brave = "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe" }
$open = Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue
if (-not $open -and (Test-Path $brave)) {
  Start-Process $brave "--remote-debugging-port=9222 --user-data-dir=`"$env:USERPROFILE\brave-agent`""
}

# 2) Listener-Heartbeat prüfen — fehlt er oder ist er älter als 6 Min → Listener neu starten
$stale = $true
if (Test-Path $BEAT) {
  try { $age = (Get-Date) - [datetime]((Get-Content $BEAT -Raw).Trim()); if ($age.TotalMinutes -lt 6) { $stale = $false } } catch {}
}
if ($stale) {
  Write-Host "Listener tot/stale → starte neu."
  Start-Process powershell "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$here\pc-listener.ps1`""
} else {
  Write-Host "Listener lebt (Heartbeat frisch)."
}
