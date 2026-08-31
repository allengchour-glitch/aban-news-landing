# LuxeStyle TikTok-Autoposter — STANDALONE-Einrichtung (31.08.2026, kein Git noetig).
# Alles kommt vom Shopify-CDN des Shops. Kann jederzeit erneut laufen (idempotent).
# Start:  iwr "<cdn>/luxestyle-tt-setup.ps1?v=$(Get-Random)" -OutFile "$env:TEMP\lx-tt.ps1"; powershell -ep Bypass -File "$env:TEMP\lx-tt.ps1"
# ⚠️ ?v=<zufall> ist Pflicht: Shopifys CDN cached die Basis-URL ~ewig und ignoriert ?t=.
$ErrorActionPreference = "Continue"
$CDN = "https://cdn.shopify.com/s/files/1/0943/6856/3585/files"
$dir = Join-Path $env:USERPROFILE "LuxeStyleTT"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $dir
Write-Host "Ordner: $dir"

# --- Dateien vom CDN (Poster-Skript + Marken-Musik + Queue-Startkopie) ---
iwr "$CDN/luxestyle-tt-post.mjs?v=$(Get-Random)" -OutFile (Join-Path $dir "luxestyle-tt-post.mjs")
iwr "$CDN/luxestyle-tt-check.mjs?v=$(Get-Random)" -OutFile (Join-Path $dir "luxestyle-tt-check.mjs")
if (-not (Test-Path (Join-Path $dir "luxe-premium.wav"))) {
  Write-Host "Lade Marken-Musik (11 MB, einmalig) ..."
  iwr "$CDN/luxe-premium.wav?v=$(Get-Random)" -OutFile (Join-Path $dir "luxe-premium.wav")
}
iwr "$CDN/tiktok_queue.json?v=$(Get-Random)" -OutFile (Join-Path $dir "tiktok_queue.json")

# --- Node.js (fuer das Skript) ---
$node = "node"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  $nodeExe = Join-Path $env:ProgramFiles "nodejs\node.exe"
  if (Test-Path $nodeExe) { $node = $nodeExe }
  else {
    Write-Host "Node.js fehlt - installiere per winget ..."
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    if (Test-Path $nodeExe) { $node = $nodeExe } else { Write-Host "Node-Installation unklar - Terminal neu oeffnen und Setup erneut laufen lassen."; }
  }
}
$npm = "npm"
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { $npm = Join-Path $env:ProgramFiles "nodejs\npm.cmd" }
if (-not (Test-Path (Join-Path $dir "package.json"))) { & $npm init -y | Out-Null }
& $npm install playwright-core --no-audit --no-fund

# --- ffmpeg (Musik unterlegen; ohne Musik wird bewusst NICHT gepostet) ---
$ffOk = (Get-Command ffmpeg -ErrorAction SilentlyContinue) -or (Test-Path (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\ffmpeg.exe"))
if (-not $ffOk) {
  Write-Host "ffmpeg fehlt - installiere per winget ..."
  winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
}

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
$startCmd = Join-Path $dir "start-browser.cmd"
@"
@echo off
start "" "$browser" --remote-debugging-port=9222 --user-data-dir="$botProfil" https://www.tiktok.com/
"@ | Set-Content -Encoding ASCII $startCmd

# --- Taeglicher Poster-Lauf (Log in log.txt, Beweise in beweise\) ---
$runCmd = Join-Path $dir "run-post.cmd"
@"
@echo off
cd /d "$dir"
rem Skript vorher frisch vom CDN — Verbesserungen kommen ohne Zutun an; scheitert der
rem Download, bleibt die vorhandene Fassung (Move nur nach Erfolg).
powershell -NoProfile -Command "try { iwr ('$CDN/luxestyle-tt-post.mjs?t='+(Get-Random)) -OutFile lx-neu.mjs; Move-Item -Force lx-neu.mjs luxestyle-tt-post.mjs } catch {}"
"$node" luxestyle-tt-post.mjs >> log.txt 2>&1
"@ | Set-Content -Encoding ASCII $runCmd

# --- «Jetzt posten»-Bruecke: alle 10 Min nach einem Cloud-Befehl sehen ---
$befehlCmd = Join-Path $dir "befehl.cmd"
@"
@echo off
cd /d "$dir"
powershell -NoProfile -Command "try { iwr ('$CDN/luxestyle-tt-check.mjs?t='+(Get-Random)) -OutFile lxc-neu.mjs; Move-Item -Force lxc-neu.mjs luxestyle-tt-check.mjs } catch {}"
powershell -NoProfile -Command "try { iwr ('$CDN/luxestyle-tt-post.mjs?t='+(Get-Random)) -OutFile lx-neu.mjs; Move-Item -Force lx-neu.mjs luxestyle-tt-post.mjs } catch {}"
"$node" luxestyle-tt-check.mjs >> befehl-log.txt 2>&1
"@ | Set-Content -Encoding ASCII $befehlCmd

# --- Aufgabenplanung: 17:28 Browser sicherstellen, 17:31 posten ---
schtasks /create /f /tn "LuxeStyle TikTok Browser" /sc daily /st 17:28 /tr "`"$startCmd`"" | Out-Null
schtasks /create /f /tn "LuxeStyle TikTok Post"    /sc daily /st 17:31 /tr "`"$runCmd`"" | Out-Null
schtasks /create /f /tn "LuxeStyle TikTok Befehl"  /sc minute /mo 10 /tr "`"$befehlCmd`"" | Out-Null
Write-Host "Geplante Aufgaben angelegt: 17:28 Browser, 17:31 Post, alle 10 Min Befehls-Check."

# --- Bot-Browser jetzt oeffnen fuer die einmalige Anmeldung ---
& $startCmd
Write-Host ""
Write-Host "==> LETZTER SCHRITT (einmalig): Im GERADE GEOEFFNETEN Fenster bei tiktok.com"
Write-Host "    als @luxestyle.ch anmelden. Diese Anmeldung bleibt im Bot-Profil erhalten."
Write-Host "    Ab morgen 17:31 postet der PC taeglich selbst EINEN Beitrag (mit Musik)."
Write-Host "    Probelauf ohne Posten:  cmd /c `"set DRY=1&& $runCmd`""
Write-Host "    Stoppen: Datei STOPP.txt im Ordner $dir anlegen."
