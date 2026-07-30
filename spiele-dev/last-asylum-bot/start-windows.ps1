# Last-Asylum-Bot – Startskript für Windows (PowerShell)
#
#   Rechtsklick auf die Datei -> "Mit PowerShell ausführen"
#   oder im Ordner:  powershell -ExecutionPolicy Bypass -File .\start-windows.ps1
#
# Ohne Parameter läuft ein Trockenlauf (5 Minuten, es wird NICHTS angetippt).
#   .\start-windows.ps1 -Scharf              -> tippt wirklich, 60 Minuten
#   .\start-windows.ps1 -Scharf -Minuten 180 -> 3 Stunden
#   .\start-windows.ps1 -NurPruefen          -> nur Konfiguration prüfen, kein Gerät nötig
#
# Emulator statt Handy (BlueStacks, LDPlayer, MEmu, Nox) wird automatisch gesucht.
# Bei BlueStacks vorher einmal: Einstellungen -> Erweitert -> "Android Debug Bridge (ADB)" an.

param(
    [switch]$Scharf,
    [switch]$NurPruefen,
    [int]$Minuten = 0,
    [string]$Adb = ""
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Schritt($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Gut($text)     { Write-Host "  OK  $text" -ForegroundColor Green }
function Warnung($text) { Write-Host "  !   $text" -ForegroundColor Yellow }
function Fehler($text)  { Write-Host "  X   $text" -ForegroundColor Red }

# ---------------------------------------------------------------- Python finden
Schritt "Python"
$python = $null
foreach ($kandidat in @("python", "python3", "py")) {
    try {
        $version = & $kandidat --version 2>&1
        if ($LASTEXITCODE -eq 0) { $python = $kandidat; Gut "$kandidat -> $version"; break }
    } catch { }
}
if (-not $python) {
    Fehler "Kein Python gefunden. Installieren: https://www.python.org/downloads/ (Haken bei 'Add to PATH')"
    exit 1
}

# ------------------------------------------------------------------ numpy holen
Schritt "numpy (macht die Bildsuche ~20x schneller)"
& $python -c "import numpy" 2>$null
if ($LASTEXITCODE -ne 0) {
    Warnung "numpy fehlt, wird installiert ..."
    & $python -m pip install --quiet numpy
    & $python -c "import numpy" 2>$null
    if ($LASTEXITCODE -ne 0) { Warnung "numpy liess sich nicht installieren - der Bot laeuft trotzdem, nur langsamer" }
    else { Gut "numpy installiert" }
} else { Gut "numpy vorhanden" }

# -------------------------------------------------------- Konfiguration pruefen
Schritt "Konfiguration und Templates"
& $python bot.py check
if ($LASTEXITCODE -ne 0) { Fehler "Konfiguration ist fehlerhaft - Abbruch"; exit 1 }
if ($NurPruefen) { Write-Host "`nFertig (nur geprueft)." -ForegroundColor Cyan; exit 0 }

# --------------------------------------------------------------- ADB aufspueren
Schritt "ADB und Geraet"
if (-not $Adb) {
    $gefunden = Get-Command adb.exe -ErrorAction SilentlyContinue
    if ($gefunden) { $Adb = $gefunden.Source }
    else {
        foreach ($pfad in @("C:\platform-tools\adb.exe",
                            "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
                            "$env:USERPROFILE\platform-tools\adb.exe")) {
            if (Test-Path $pfad) { $Adb = $pfad; break }
        }
    }
}
if (-not $Adb) {
    Fehler "adb.exe nicht gefunden."
    Write-Host "     1. Platform-Tools laden: https://developer.android.com/tools/releases/platform-tools"
    Write-Host "     2. ZIP nach C:\platform-tools entpacken"
    Write-Host "     3. Dieses Skript erneut starten (oder -Adb C:\pfad\adb.exe angeben)"
    exit 1
}
Gut "adb: $Adb"

# Emulatoren melden sich nicht von selbst - erst verbinden, dann fragen.
function Verbinde-Emulator($adbPfad) {
    $ports = New-Object System.Collections.Generic.List[string]

    # BlueStacks schreibt seinen ADB-Port in die Konfigurationsdatei.
    foreach ($conf in @("$env:ProgramData\BlueStacks_nxt\bluestacks.conf",
                        "$env:ProgramData\BlueStacks\bluestacks.conf")) {
        if (Test-Path $conf) {
            foreach ($zeile in Get-Content $conf) {
                if ($zeile -match 'adb_port\s*=\s*"?(\d+)"?' -and $matches[1] -ne "0") {
                    $ports.Add($matches[1])
                }
            }
        }
    }
    # Standard-Ports: BlueStacks, LDPlayer, MEmu, Nox
    foreach ($p in @("5555", "5554", "21503", "62001", "7555")) { $ports.Add($p) }

    foreach ($port in ($ports | Select-Object -Unique)) {
        $antwort = & $adbPfad connect "127.0.0.1:$port" 2>&1
        if ("$antwort" -match "connected to") {
            Gut "Emulator verbunden auf 127.0.0.1:$port"
            return $true
        }
    }
    return $false
}

& $python bot.py --adb "$Adb" devices
if ($LASTEXITCODE -ne 0) {
    Warnung "Kein Geraet gefunden - suche nach einem Emulator ..."
    $null = Verbinde-Emulator $Adb
    & $python bot.py --adb "$Adb" devices
    if ($LASTEXITCODE -ne 0) {
        Fehler "Weder Handy noch Emulator erreichbar."
        Write-Host "     Handy:      USB-Debugging an, Kabel steckt, 'Diesem Computer vertrauen?' bestaetigt."
        Write-Host "     BlueStacks: Einstellungen -> Erweitert -> 'Android Debug Bridge (ADB)' einschalten,"
        Write-Host "                 dann BlueStacks neu starten und dieses Skript nochmal ausfuehren."
        Write-Host "     Manuell:    $Adb connect 127.0.0.1:<port aus den BlueStacks-Einstellungen>"
        exit 1
    }
}

$paket = & $python bot.py --adb "$Adb" package 2>$null
if ($paket) { Gut "App im Vordergrund: $paket" }
if ($paket -and $paket -notmatch "com.phs.global") {
    Warnung "Das Spiel scheint nicht offen zu sein - oeffne Last Asylum, bevor es losgeht."
}

# ------------------------------------------------------------------- Bot starten
if (-not (Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }
$stempel = Get-Date -Format "yyyyMMdd-HHmmss"
$protokoll = "logs\lauf-$stempel.jsonl"

if ($Scharf) {
    if ($Minuten -le 0) { $Minuten = 60 }
    Schritt "Bot laeuft SCHARF fuer $Minuten Minuten"
    Write-Host "  Anhalten: Strg+C, oder in diesem Ordner eine Datei namens STOP anlegen." -ForegroundColor Yellow
    & $python bot.py --adb "$Adb" run --minutes $Minuten --jsonl $protokoll
} else {
    if ($Minuten -le 0) { $Minuten = 5 }
    Schritt "TROCKENLAUF fuer $Minuten Minuten - es wird nichts angetippt"
    Write-Host "  Sieht das Protokoll sinnvoll aus, dann:  .\start-windows.ps1 -Scharf" -ForegroundColor Yellow
    & $python bot.py --adb "$Adb" run --dry-run --minutes $Minuten --log-level debug --jsonl $protokoll
}

Schritt "Fertig"
Write-Host "  Protokoll: $protokoll"
Write-Host "  Schwellen nachjustieren:  $python bot.py lernen $protokoll"
Write-Host "  Und uebernehmen mit:      $python bot.py lernen $protokoll --anwenden"
