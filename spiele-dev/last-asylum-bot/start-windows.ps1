# Last-Asylum-Bot – Startskript für Windows (PowerShell)
#
#   Rechtsklick auf die Datei -> "Mit PowerShell ausführen"
#   oder im Ordner:  powershell -ExecutionPolicy Bypass -File .\start-windows.ps1
#
# Ohne Parameter läuft ein Trockenlauf (5 Minuten, es wird NICHTS angetippt).
#   .\start-windows.ps1 -Scharf              -> tippt wirklich, 60 Minuten
#   .\start-windows.ps1 -Scharf -Minuten 180 -> 3 Stunden
#   .\start-windows.ps1 -Scharf -Dauerlauf    -> ohne Zeitlimit (fuer den Autostart)
#   .\start-windows.ps1 -NurPruefen          -> nur Konfiguration prüfen, kein Gerät nötig
#   .\start-windows.ps1 -Serial emulator-5554 -> ein bestimmtes Gerät erzwingen
#
# Emulator statt Handy (BlueStacks, LDPlayer, MEmu, Nox) wird automatisch gesucht.
# Bei BlueStacks vorher einmal: Einstellungen -> Erweitert -> "Android Debug Bridge (ADB)" an.

param(
    [switch]$Scharf,
    [switch]$NurPruefen,
    [switch]$Dauerlauf,
    [int]$Minuten = 0,
    [string]$Adb = "",
    [string]$Serial = "",
    # Notausgang: startet ohne das Holen des neuen Standes. Wenn das Update je
    # der Grund sein sollte, dass gar nichts mehr laeuft, kommt man hiermit
    # sofort wieder ins Spiel.
    [switch]$UeberspringeUpdate
)

# Bewusst NICHT "Stop": das Skript ruft ueberall native Befehle (python, adb,
# git) und leitet deren stderr um. In Windows PowerShell 5.1 macht "Stop"
# daraus einen abbrechenden NativeCommandError - schon eine harmlose Zeile wie
# "* daemon not running; starting now" beendet dann den ganzen Start, im
# minimierten Autostart-Fenster unsichtbar. Der Erfolg jedes Aufrufs wird
# ohnehin ueber $LASTEXITCODE bzw. den Rueckgabewert geprueft.
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

# Gilt fuer JEDEN git-Aufruf in diesem Skript: nie nach Zugangsdaten fragen.
# Eine Passwortabfrage in einem minimierten Fenster sieht niemand - der Start
# haengt dann stumm, und die Neustart-Schleife macht daraus eine Endlosschleife.
$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "never"

function Schritt($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Gut($text)     { Write-Host "  OK  $text" -ForegroundColor Green }
function Warnung($text) { Write-Host "  !   $text" -ForegroundColor Yellow }
function Fehler($text)  { Write-Host "  X   $text" -ForegroundColor Red }

# git-Ausgabe als schlichter Text - nie $null, nie eine Ausnahme. Ohne das
# stolpert der Aufrufer ueber .Trim() auf einem leeren Ergebnis.
function Git-Text {
    param([Parameter(ValueFromRemainingArguments = $true)] $Argumente)
    try {
        $zeilen = & git -C $PSScriptRoot @Argumente 2>$null
    } catch {
        return ""
    }
    if ($null -eq $zeilen) { return "" }
    return (($zeilen | Out-String) -replace "`r", "").Trim()
}

# git mit harter Zeitgrenze. Fragt git trotz GIT_TERMINAL_PROMPT doch einmal
# nach etwas, oder haengt das Netz, wartet hier nichts endlos - der Bot soll
# spielen, nicht auf eine Eingabeaufforderung starren, die niemand sieht.
#
# Rueckgabe: "ok" | "zeit" (Zeitgrenze erreicht) | "fehler". Der Unterschied
# zaehlt: bei "zeit" lohnt ein zweiter Versuch, bei "fehler" nicht - und eine
# Meldung, die beides zusammenwirft, schickt einen auf die falsche Suche.
function Git-MitZeitlimit {
    param([string[]]$Argumente, [int]$Sekunden = 120)
    $alle = @("-C", $PSScriptRoot) + $Argumente
    # JEDES Argument einzeln in Anfuehrungszeichen. Start-Process fuegt die
    # Liste ungeschuetzt mit Leerzeichen zusammen: ein Ordner wie
    # "C:\Users\Max Muster\bot" zerfiele sonst in zwei Argumente, und leere
    # Elemente verschwinden ganz - dann landet das naechste Wort hinter -C.
    $zeile = ($alle | ForEach-Object { '"' + ([string]$_ -replace '"', '\"') + '"' }) -join " "
    try {
        # Nur -NoNewWindow: zusammen mit -WindowStyle wehrt PowerShell den
        # Aufruf ab ("Parameter set cannot be resolved").
        $p = Start-Process -FilePath "git" -PassThru -NoNewWindow -ArgumentList $zeile
    } catch {
        return "fehler"
    }
    if (-not $p.WaitForExit($Sekunden * 1000)) {
        try { $p.Kill() } catch { }
        return "zeit"
    }
    if ($p.ExitCode -eq 0) { return "ok" }
    return "fehler"
}

# Ein Startabbruch war bisher unsichtbar: das Autostart-Fenster ist minimiert,
# und die Neustart-Schleife probiert es stumm alle 60 Sekunden erneut. Von
# aussen sah das genauso aus wie ein zufriedener Bot - naemlich nach nichts.
# Darum schreibt jeder Abbruch von hier an seinen Grund ins Repository.
#
# Auch das ist nur eine Meldung und darf niemals selbst zum Abbruchgrund
# werden - deshalb liegt alles in try/catch und der exit-Code kommt am Ende
# in jedem Fall.
function Abbruch {
    param([string]$Grund, [string[]]$Hinweise = @(), [int]$Code = 1)
    Fehler $Grund
    foreach ($h in $Hinweise) { Write-Host "     $h" }
    try {
        $ordner = Join-Path $PSScriptRoot "austausch"
        if (-not (Test-Path $ordner)) { New-Item -ItemType Directory -Path $ordner | Out-Null }
        $datei = Join-Path $ordner "start-fehler.txt"
        $zeilen = @(
            "# Der Start ist abgebrochen. Diese Datei sagt wo.",
            "zeit:   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
            "rechner: $env:COMPUTERNAME",
            "grund:  $Grund"
        ) + ($Hinweise | ForEach-Object { "hinweis: $_" })
        Set-Content -Path $datei -Value $zeilen -Encoding UTF8
        [void](Git-MitZeitlimit @("add", "--", "austausch/start-fehler.txt") 30)
        [void](Git-MitZeitlimit @("commit", "-m", "Start abgebrochen: $Grund") 30)
        # Nicht "hochgeladen" melden, wenn der push scheitert - eine Meldung,
        # die einen Fehlschlag wie einen Erfolg aussehen laesst, ist schlimmer
        # als gar keine.
        if ((Git-MitZeitlimit @("push") 60) -eq "ok") {
            Warnung "Grund in austausch/start-fehler.txt vermerkt und hochgeladen."
        } else {
            Warnung "Grund in austausch/start-fehler.txt vermerkt - Hochladen ging nicht."
        }
    } catch {
        Warnung "Der Grund liess sich nicht hochladen: $($_.Exception.Message)"
    }
    exit $Code
}

# Alles, was hier unerwartet schiefgeht, muss sichtbar werden. Ohne dieses Netz
# stirbt das Skript bei einem unbehandelten Fehler still, die Neustart-Schleife
# im Autostart hebt es 60 Sekunden spaeter wieder hoch, es stirbt wieder - und
# von aussen sieht das aus wie ein Bot, der einfach nichts mehr meldet. Genau
# dieses Bild gab es am 29.08. nach 00:17.
trap {
    $grund = "$($_.Exception.Message)"
    try { Abbruch "Startskript abgebrochen" @($grund, "$($_.InvocationInfo.PositionMessage)") }
    catch { Write-Host "Startskript abgebrochen: $grund" -ForegroundColor Red; exit 1 }
}

# Laeuft der Start durch, muss die alte Fehlermeldung weg - sonst sucht man
# spaeter nach einem Problem, das laengst behoben ist.
function Abbruch-Vermerk-Loeschen {
    try {
        # Auch der Ende-Vermerk muss weg: ein alter "Lauf beendet" waere sonst
        # der letzte Stand im Repository, waehrend der Bot laengst wieder laeuft.
        $wegdamit = @("austausch/start-fehler.txt", "austausch/lauf-ende.txt")
        $gab_es = $false
        foreach ($rel in $wegdamit) {
            $datei = Join-Path $PSScriptRoot ($rel -replace "/", "\")
            if (Test-Path $datei) { Remove-Item $datei -Force; $gab_es = $true }
        }
        if (-not $gab_es) { return }
        [void](Git-MitZeitlimit (@("add", "--") + $wegdamit) 30)
        [void](Git-MitZeitlimit @("commit", "-m", "Start laeuft wieder") 30)
        [void](Git-MitZeitlimit @("push") 60)
    } catch { }
}

# Haelt der Bot an, sah das von aussen bisher aus wie "laeuft noch": die letzte
# Meldung im Repository blieb einfach stehen. Am 22.08. war der letzte Eintrag
# vier Stunden alt, und es war von hier aus nicht zu entscheiden, ob der Bot
# arbeitet oder tot ist. Diese Datei beantwortet genau das.
function Ende-Vermerken {
    param([int]$Code, [string]$Protokoll)
    try {
        $ordner = Join-Path $PSScriptRoot "austausch"
        if (-not (Test-Path $ordner)) { New-Item -ItemType Directory -Path $ordner | Out-Null }
        $datei = Join-Path $ordner "lauf-ende.txt"
        $zeilen = @(
            "# Der Bot-Lauf ist beendet. Steht hier ein frischer Zeitpunkt,",
            "# laeuft der Bot NICHT mehr.",
            "zeit:      $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
            "rechner:   $env:COMPUTERNAME",
            "rueckgabe: $Code"
        )
        if ($Protokoll -and (Test-Path $Protokoll)) {
            $zeilen += "", "# letzte Protokollzeilen:"
            $zeilen += (Get-Content $Protokoll -Tail 25 -ErrorAction SilentlyContinue)
        }
        Set-Content -Path $datei -Value $zeilen -Encoding UTF8
        [void](Git-MitZeitlimit @("add", "--", "austausch/lauf-ende.txt") 30)
        [void](Git-MitZeitlimit @("commit", "-m", "Bot-Lauf beendet (Rueckgabe $Code)") 30)
        if ((Git-MitZeitlimit @("push") 60) -eq "ok") {
            Warnung "Ende in austausch/lauf-ende.txt vermerkt und hochgeladen."
        } else {
            Warnung "Ende in austausch/lauf-ende.txt vermerkt - Hochladen ging nicht."
        }
    } catch {
        Warnung "Das Ende liess sich nicht vermerken: $($_.Exception.Message)"
    }
}

# ------------------------------------------------------------- Neuen Stand holen
# Bisher zog nur der laufende Bot alle dreissig Minuten `git pull`. Steht er
# still - abgestuerzt, PC neu gestartet, Fenster geschlossen -, kam gar nichts
# mehr an: weder ein Fehler-Fix noch eine auftrag.txt. Genau dann ist ein Start
# aber der einzige Moment, in dem jemand nachschaut. Also hier zuerst holen,
# damit ein einziger Start alles mitnimmt, was seither dazugekommen ist.
Schritt "Neuen Stand holen"
# GRUNDREGEL: Dieser Block ist eine Bequemlichkeit. Er darf den Start NIE
# verhindern - lieber mit altem Stand spielen als gar nicht. Darum liegt alles
# in try/finally, und der Bot laeuft danach in jedem Fall weiter.
#
# Zwei Fallen stecken hier drin, beide unsichtbar:
#  1) git fragt nach Zugangsdaten und wartet. In einem minimierten Fenster
#     sieht das niemand - der Bot "laeuft einfach nicht", ohne Fehlermeldung.
#     GIT_TERMINAL_PROMPT=0 laesst git stattdessen scheitern.
#  2) Oben steht $ErrorActionPreference = "Stop". git schreibt auch Harmloses
#     nach stderr; das allein kann den ganzen Start abbrechen.
if (-not $UeberspringeUpdate) {
    try {
        $vorher = Git-Text "rev-parse" "--short" "HEAD"
        $zug = Git-MitZeitlimit @("pull", "--ff-only") 120
        $nachher = Git-Text "rev-parse" "--short" "HEAD"
        $offen = Git-Text "status" "--porcelain"

        if (-not $nachher) {
            Warnung "Kein Git-Ordner - der Bot laeuft mit dem Stand, der hier liegt."
        } elseif ($zug -eq "zeit") {
            Warnung "Holen hat zu lange gedauert - alter Stand, es geht trotzdem weiter."
        } elseif ($zug -ne "ok") {
            Warnung "Holen ist fehlgeschlagen - alter Stand, es geht trotzdem weiter."
            Write-Host "     Einmal von Hand pruefen: git -C `"$PSScriptRoot`" pull"
        } elseif ($vorher -ne $nachher) {
            Gut "Neue Fassung geholt: $vorher -> $nachher"
        } elseif ($offen) {
            # Die stille Falle: eine geaenderte Datei blockiert jedes kuenftige
            # Update, und ohne Hinweis merkt das niemand.
            Warnung "Geaenderte Dateien blockieren neue Fassungen - so raeumt man auf:"
            Write-Host "     git -C `"$PSScriptRoot`" checkout -- . ; git -C `"$PSScriptRoot`" pull"
        } else {
            Gut "Stand ist aktuell ($nachher)"
        }
    } catch {
        Warnung "Neuen Stand holen ging schief - der Bot startet trotzdem."
        Write-Host "     $($_.Exception.Message)"
    }
} else {
    Warnung "Update uebersprungen (-UeberspringeUpdate)."
}

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
    Abbruch "Kein Python gefunden" @(
        "Installieren: https://www.python.org/downloads/ (Haken bei 'Add to PATH')")
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
# Die Ausgabe mitschneiden, nicht nur den Rueckgabewert: am 28.08. um 21:23
# brach der Start mit "Konfiguration ist fehlerhaft" ab, und im hochgeladenen
# Vermerk stand als einziger Hinweis "bot.py check meldet einen Fehler" - also
# genau das, was man ohnehin schon wusste. Zwei Minuten spaeter lief es wieder,
# und der Grund war nicht mehr zu ermitteln.
# Erst laufen lassen, dann SOFORT den Rueckgabewert sichern - vor jedem
# weiteren Befehl. $LASTEXITCODE gehoert immer dem zuletzt gelaufenen nativen
# Programm; wer erst noch etwas dazwischenschiebt, liest womoeglich einen
# fremden Wert. Und keine Pipeline mehr um den Aufruf herum: in Windows
# PowerShell 5.1 ist "nativer Befehl mit 2>&1 in einer Pipeline" die Ecke, in
# der die Fehlerbehandlung sich anders verhaelt als man denkt.
$pruefung = & $python bot.py check 2>&1
$pruefcode = $LASTEXITCODE
foreach ($zeile in $pruefung) { Write-Host "$zeile" }
if ($pruefcode -ne 0) {
    $letzte = @()
    foreach ($zeile in $pruefung) {
        $text = "$zeile"
        if ($text.Trim()) { $letzte += $text }
    }
    if ($letzte.Count -gt 12) { $letzte = $letzte[-12..-1] }
    Abbruch "Konfiguration ist fehlerhaft" $letzte
}
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
    Warnung "adb.exe nicht gefunden - lade die Android-Platform-Tools von Google ..."
    $zip = Join-Path $env:TEMP "platform-tools.zip"
    try {
        $alt = $ProgressPreference; $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -Uri "https://dl.google.com/android/repository/platform-tools-latest-windows.zip" `
                          -OutFile $zip -UseBasicParsing
        $ProgressPreference = $alt
        Expand-Archive -Path $zip -DestinationPath "C:\" -Force
        Remove-Item $zip -ErrorAction SilentlyContinue
        if (Test-Path "C:\platform-tools\adb.exe") { $Adb = "C:\platform-tools\adb.exe"; Gut "installiert nach C:\platform-tools" }
    } catch {
        Fehler "Download fehlgeschlagen: $($_.Exception.Message)"
    }
}
if (-not $Adb) {
    Abbruch "adb.exe fehlt" @(
        "1. Platform-Tools laden: https://developer.android.com/tools/releases/platform-tools",
        "2. ZIP nach C:\platform-tools entpacken (adb.exe muss direkt darin liegen)",
        "3. Skript erneut starten - oder Pfad mitgeben: -Adb C:\pfad\adb.exe")
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

# Der Bot soll durchlaufen. Ist BlueStacks gar nicht gestartet, hilft kein
# Verbinden - dann wird es selbst hochgefahren und einmal abgewartet.
function Starte-BlueStacks {
    if (Get-Process -Name "HD-Player" -ErrorAction SilentlyContinue) { return $false }
    foreach ($pfad in @(
        "$env:ProgramFiles\BlueStacks_nxt\HD-Player.exe",
        "${env:ProgramFiles(x86)}\BlueStacks_nxt\HD-Player.exe",
        "$env:ProgramFiles\BlueStacks\HD-Player.exe")) {
        if (Test-Path $pfad) {
            Warnung "BlueStacks laeuft nicht - wird gestartet ..."
            Start-Process -FilePath $pfad
            for ($i = 0; $i -lt 24; $i++) {
                Start-Sleep -Seconds 5
                if (Verbinde-Emulator $Adb) { return $true }
            }
            Warnung "BlueStacks gestartet, meldet sich aber noch nicht."
            return $true
        }
    }
    return $false
}

& $python bot.py --adb "$Adb" devices
if ($LASTEXITCODE -ne 0) {
    Warnung "Kein Geraet gefunden - suche nach einem Emulator ..."
    # Den RUECKGABEWERT auswerten, nicht $LASTEXITCODE. Der stammt hier vom
    # letzten `adb connect` in der Funktion - und adb quittiert ein
    # fehlgeschlagenes connect mit 0. Die Entscheidung "muss BlueStacks
    # gestartet werden?" haette also an einer Groesse gehangen, die mit dem
    # Ergebnis nichts zu tun hat: der eingebaute Automatikstart lief nie an,
    # und die Neustart-Schleife wiederholte den Abbruch alle 60 Sekunden.
    # Zwanzig Zeilen weiter oben macht es Starte-BlueStacks bereits richtig.
    if (-not (Verbinde-Emulator $Adb)) { $null = Starte-BlueStacks }
    & $python bot.py --adb "$Adb" devices
    if ($LASTEXITCODE -ne 0) {
        Abbruch "Weder Handy noch Emulator erreichbar" @(
            "Handy:      USB-Debugging an, Kabel steckt, 'Diesem Computer vertrauen?' bestaetigt.",
            "BlueStacks: Einstellungen -> Erweitert -> 'Android Debug Bridge (ADB)' einschalten,",
            "            dann BlueStacks neu starten und dieses Skript nochmal ausfuehren.",
            "Manuell:    $Adb connect 127.0.0.1:<port aus den BlueStacks-Einstellungen>")
    }
}

# BlueStacks meldet sich oft doppelt (emulator-5554 UND 127.0.0.1:5555) - dann
# verweigert adb jeden Befehl ohne -s. Also genau ein Geraet festlegen.
if (-not $Serial) {
    $liste = @()
    foreach ($zeile in (& $Adb devices)) {
        if ($zeile -match '^(\S+)\s+device$') { $liste += $matches[1] }
    }
    if ($liste.Count -gt 1) {
        # Ueber den Port steuern: 127.0.0.1:5555 laesst sich mit `adb connect`
        # jederzeit neu aufbauen, wenn die Verbindung abreisst. Der Eintrag
        # emulator-5554 verschwindet dagegen mit dem BlueStacks-Fenster und
        # kommt nur durch einen Neustart des ADB-Servers zurueck.
        $bevorzugt = $liste | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+:\d+$' } | Select-Object -First 1
        if (-not $bevorzugt) { $bevorzugt = $liste[0] }
        $Serial = $bevorzugt
        Warnung "$($liste.Count) Geraete gemeldet ($($liste -join ', ')) - steuere ueber $Serial"
    } elseif ($liste.Count -eq 1) {
        $Serial = $liste[0]
    }
}
$geraet = @()
if ($Serial) { $geraet = @("-s", $Serial); Gut "Geraet: $Serial" }

$paket = & $python bot.py --adb "$Adb" @geraet package 2>$null
if ($paket) { Gut "App im Vordergrund: $paket" }
if ($paket -and $paket -notmatch "com.phs.global") {
    Warnung "Das Spiel scheint nicht offen zu sein - oeffne Last Asylum, bevor es losgeht."
}

# ------------------------------------------------------------------- Auftraege
# Eine Live-Verbindung von Claude zu diesem PC gibt es nicht. Der Bot zieht aber
# ohnehin alle dreissig Minuten `git pull` und startet bei neuem Stand neu -
# liegt dann eine auftrag.txt hier, wird sie vorher abgearbeitet. So kommt eine
# Anweisung aus dem Repository hier an, ohne dass jemand etwas abtippen muss.
#
# BEWUSST ENG: eine Datei aus einem Repository darf keine beliebigen Befehle
# ausloesen. Erlaubt sind genau vier Woerter, sonst nichts.
$auftrag = Join-Path $PSScriptRoot "auftrag.txt"
if (Test-Path $auftrag) {
    Schritt "Auftrag gefunden"
    $erledigt = @()
    foreach ($zeile in (Get-Content $auftrag)) {
        $z = $zeile.Trim()
        if (-not $z -or $z.StartsWith("#")) { continue }
        if ($z -match '^teilen\s+([A-Za-z0-9_-]{1,32})$') {
            $name = $matches[1]
            Gut "teilen --als $name"
            & $python bot.py --adb "$Adb" @geraet teilen --als $name
            & $python kacheln.py
            $erledigt += "teilen $name"
        } elseif ($z -eq "kacheln") {
            Gut "kacheln"
            & $python kacheln.py
            $erledigt += "kacheln"
        } elseif ($z -eq "feinschliff") {
            Gut "feinschliff --anwenden"
            & $python feinschliff.py --anwenden
            $erledigt += "feinschliff"
        } elseif ($z -eq "entdecke") {
            Gut "entdecke"
            & $python bot.py --adb "$Adb" @geraet entdecke
            $erledigt += "entdecke"
        } else {
            Warnung "Unbekannte Zeile uebergangen: $z"
        }
    }
    # Umbenennen und hochladen: so laeuft nichts doppelt, und im Repository
    # steht, was tatsaechlich passiert ist.
    $fertig = Join-Path $PSScriptRoot "auftrag-erledigt.txt"
    $kopf = "# erledigt am " + (Get-Date -Format "yyyy-MM-dd HH:mm")
    Set-Content -Path $fertig -Value (@($kopf) + $erledigt) -Encoding UTF8
    Remove-Item $auftrag -Force
    # Ueber Git-MitZeitlimit, nicht direkt: diese drei Aufrufe liegen VOR dem
    # Botstart. Wartet einer davon auf eine Passwortabfrage, startet der Bot
    # nie - im minimierten Fenster sieht das niemand.
    [void](Git-MitZeitlimit @("add", "--", "auftrag.txt", "auftrag-erledigt.txt", "austausch") 60)
    [void](Git-MitZeitlimit @("commit", "-m", "Auftrag erledigt: $($erledigt -join ', ')") 60)
    if ((Git-MitZeitlimit @("push") 120) -eq "ok") {
        Gut "$($erledigt.Count) Auftrag/Auftraege erledigt und hochgeladen."
    } else {
        Warnung "$($erledigt.Count) Auftrag/Auftraege erledigt - Hochladen ging nicht."
    }
}

# ------------------------------------------------------------------- Bot starten
if (-not (Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }
$stempel = Get-Date -Format "yyyyMMdd-HHmmss"
$protokoll = "logs\lauf-$stempel.jsonl"

# Ein schlafender PC tippt nichts an. Solange dieses Fenster offen ist, bleibt
# der Rechner wach - Bildschirm darf dunkel werden, das stoert nicht.
if ($Scharf -and $Dauerlauf) {
    # Die Signatur muss in einer eigenen Variablen stehen: nach dem
    # Here-String-Ende "@ darf auf derselben Zeile nichts mehr folgen.
    $signatur = @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern uint SetThreadExecutionState(uint esFlags);
'@
    try {
        if (-not ("Win32.Schlaf" -as [type])) {
            Add-Type -Name Schlaf -Namespace Win32 -MemberDefinition $signatur | Out-Null
        }
        # ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x1) = 2147483649.
        # Nicht als Hex schreiben: PowerShell liest 0x80000000 als vorzeichen-
        # behaftete 32-Bit-Zahl, also als -2147483648. Nach dem Oder kommt
        # -2147483647 heraus, und eine negative Zahl passt in kein UInt32 -
        # genau daran ist es am 01.08. gescheitert.
        [void][Win32.Schlaf]::SetThreadExecutionState([uint32]2147483649)
        Gut "Ruhezustand ausgesetzt, solange der Bot laeuft."
    } catch {
        Warnung "Ruhezustand liess sich nicht aussetzen: $($_.Exception.Message)"
    }
}

# Bis hierher gekommen heisst: der Start hat geklappt. Eine alte Fehlermeldung
# muss jetzt weg, sonst sucht man spaeter nach einem laengst behobenen Problem.
Abbruch-Vermerk-Loeschen

if ($Scharf -and $Dauerlauf) {
    Schritt "Bot laeuft SCHARF ohne Zeitlimit"
    Write-Host "  Anhalten: Strg+C, oder in diesem Ordner eine Datei namens STOP anlegen." -ForegroundColor Yellow
    & $python bot.py --adb "$Adb" @geraet run --jsonl $protokoll
} elseif ($Scharf) {
    if ($Minuten -le 0) { $Minuten = 60 }
    Schritt "Bot laeuft SCHARF fuer $Minuten Minuten"
    Write-Host "  Anhalten: Strg+C, oder in diesem Ordner eine Datei namens STOP anlegen." -ForegroundColor Yellow
    & $python bot.py --adb "$Adb" @geraet run --minutes $Minuten --jsonl $protokoll
} else {
    if ($Minuten -le 0) { $Minuten = 5 }
    Schritt "TROCKENLAUF fuer $Minuten Minuten - es wird nichts angetippt"
    Write-Host "  Sieht das Protokoll sinnvoll aus, dann:  .\start-windows.ps1 -Scharf" -ForegroundColor Yellow
    & $python bot.py --adb "$Adb" @geraet run --dry-run --minutes $Minuten --log-level debug --jsonl $protokoll
}

$rueckgabe = $LASTEXITCODE
Ende-Vermerken $rueckgabe $protokoll

Schritt "Fertig"
Write-Host "  Protokoll: $protokoll"
Write-Host "  Schwellen nachjustieren:  $python bot.py lernen $protokoll"
Write-Host "  Und uebernehmen mit:      $python bot.py lernen $protokoll --anwenden"
