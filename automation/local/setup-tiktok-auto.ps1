# LuxeStyle TikTok-Autoposter — Einrichtung in einem Lauf (Windows PowerShell)
# Wird von automation/local/README-Block aufgerufen; kann jederzeit erneut laufen (idempotent).
$ErrorActionPreference = "Continue"
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $repo
Write-Host "Repo: $repo"

# --- Node-Pakete (npm ggf. ueber vollen Pfad, PATH ist nach winget oft noch alt) ---
$npm = "npm"
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  $npm = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
}
if (-not (Test-Path "package.json")) { & $npm init -y | Out-Null }
& $npm install playwright-core --no-audit --no-fund

# --- Browser finden (Brave > Chrome > Edge) ---
$kandidaten = @(
  "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
  "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser = $kandidaten | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { Write-Host "KEIN Browser gefunden - bitte Brave oder Chrome installieren."; exit 1 }
Write-Host "Browser: $browser"

# --- Bot-Browser: EIGENES Profil mit Fernsteuerungs-Port (kollidiert nie mit deinem Alltag) ---
$botProfil = Join-Path $env:LOCALAPPDATA "LuxeStyleBot"
$startCmd = Join-Path $repo "automation\local\start-tiktok-browser.cmd"
@"
@echo off
start "" "$browser" --remote-debugging-port=9222 --user-data-dir="$botProfil" https://www.tiktok.com/
"@ | Set-Content -Encoding ASCII $startCmd

# --- Taeglicher Poster-Lauf ---
New-Item -ItemType Directory -Force -Path (Join-Path $repo "tiktok-auto") | Out-Null
$runCmd = Join-Path $repo "automation\local\run-tiktok-post.cmd"
@"
@echo off
cd /d "$repo"
git pull --ff-only
node automation\local\tiktok-upload-auto.mjs >> tiktok-auto\log.txt 2>&1
"@ | Set-Content -Encoding ASCII $runCmd

# --- Aufgabenplanung: 17:28 Browser sicherstellen, 17:31 posten ---
schtasks /create /f /tn "LuxeStyle TikTok Browser" /sc daily /st 17:28 /tr "`"$startCmd`"" | Out-Null
schtasks /create /f /tn "LuxeStyle TikTok Post"    /sc daily /st 17:31 /tr "`"$runCmd`"" | Out-Null
Write-Host "Geplante Aufgaben angelegt: 17:28 Browser, 17:31 Post."

# --- Bot-Browser jetzt oeffnen fuer die einmalige Anmeldung ---
& $startCmd
Write-Host ""
Write-Host "==> LETZTER SCHRITT (einmalig): Im GERADE GEOEFFNETEN Fenster bei tiktok.com"
Write-Host "    als @luxestyle.ch anmelden. Diese Anmeldung bleibt im Bot-Profil erhalten."
Write-Host "    Ab morgen 17:31 postet der PC taeglich selbst einen Beitrag."
Write-Host "    Probelauf ohne Posten:  set DRY=1 && automation\local\run-tiktok-post.cmd"
