# Last-Asylum-Bot dauerhaft einrichten – einmal ausführen, danach nie wieder.
#
#   powershell -ExecutionPolicy Bypass -File .\autostart-einrichten.ps1 -Jetzt
#
# Legt eine Startdatei im Autostart-Ordner des Benutzers an. Braucht **keine
# Administratorrechte** – anders als die Windows-Aufgabenplanung, die dafür
# eine erhöhte PowerShell verlangt.
#
# Der Bot startet danach bei jeder Anmeldung, läuft ohne Zeitlimit und beginnt
# nach einem Absturz nach einer Minute von vorn.
#
#   .\autostart-einrichten.ps1 -Entfernen   -> wieder abschalten
#   .\autostart-einrichten.ps1 -Jetzt       -> zusätzlich sofort starten
#   .\autostart-einrichten.ps1 -Aufgabenplanung  -> stattdessen geplante Aufgabe
#                                                   (nur als Administrator)

param(
    [switch]$Entfernen,
    [switch]$Jetzt,
    [switch]$Aufgabenplanung,
    [int]$VerzoegerungSekunden = 180
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$Autostart = [Environment]::GetFolderPath("Startup")
$Starter   = Join-Path $Autostart "last-asylum-bot.cmd"
$Aufgabe   = "LastAsylumBot"

function Gut($t)     { Write-Host "  OK  $t" -ForegroundColor Green }
function Warnung($t) { Write-Host "  !   $t" -ForegroundColor Yellow }
function Fehler($t)  { Write-Host "  X   $t" -ForegroundColor Red }

# ------------------------------------------------------------------- Entfernen
if ($Entfernen) {
    $weg = $false
    if (Test-Path $Starter) { Remove-Item $Starter -Force; Gut "Autostart-Datei entfernt."; $weg = $true }
    $task = Get-ScheduledTask -TaskName $Aufgabe -ErrorAction SilentlyContinue
    if ($task) {
        try { Unregister-ScheduledTask -TaskName $Aufgabe -Confirm:$false; Gut "Geplante Aufgabe entfernt."; $weg = $true }
        catch { Warnung "Geplante Aufgabe liess sich nicht entfernen (Adminrechte noetig)." }
    }
    if (-not $weg) { Warnung "Es war nichts eingerichtet." }
    exit 0
}

if (-not (Test-Path (Join-Path $PSScriptRoot "start-windows.ps1"))) {
    Fehler "start-windows.ps1 liegt nicht neben dieser Datei."
    exit 1
}

# ------------------------------------------------- Variante A: Aufgabenplanung
if ($Aufgabenplanung) {
    $admin = ([Security.Principal.WindowsPrincipal] `
        [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $admin) {
        Fehler "Die Aufgabenplanung braucht eine PowerShell 'Als Administrator ausfuehren'."
        Write-Host "     Ohne Adminrechte einfach ohne -Aufgabenplanung starten - der"
        Write-Host "     Autostart-Ordner tut dasselbe und braucht keine Rechte."
        exit 1
    }
    $aktion = New-ScheduledTaskAction -Execute "cmd.exe" `
        -Argument "/c `"$Starter`"" -WorkingDirectory $PSScriptRoot
    $ausloeser = New-ScheduledTaskTrigger -AtLogOn
    $ausloeser.Delay = "PT$([int]($VerzoegerungSekunden / 60))M"
    $einst = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Hours 0)
    if (Get-ScheduledTask -TaskName $Aufgabe -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $Aufgabe -Confirm:$false
    }
    Register-ScheduledTask -TaskName $Aufgabe -Action $aktion -Trigger $ausloeser `
        -Settings $einst -Description "Spielt Last Asylum selbstaendig weiter" | Out-Null
    Gut "Geplante Aufgabe '$Aufgabe' eingerichtet."
    # WICHTIG: hier aufhoeren. Ohne das legt der Rest zusaetzlich die Datei im
    # Autostart-Ordner an - dann starten zwei Bots auf demselben Geraet und
    # tippen sich gegenseitig ins Handwerk.
    Write-Host "     Der Autostart-Ordner wird dabei bewusst NICHT zusaetzlich belegt -"
    Write-Host "     zwei Startwege wuerden zwei Bots auf demselben Geraet bedeuten."
    exit 0
}

# --------------------------------------------- Variante B: Autostart-Ordner
# Die Schleife im Batch sorgt fuer den Neustart nach einem Absturz - dafuer
# braucht es keine Aufgabenplanung.
$inhalt = @"
@echo off
rem Automatisch erzeugt von autostart-einrichten.ps1 - nicht von Hand aendern.
cd /d "$PSScriptRoot"
timeout /t $VerzoegerungSekunden /nobreak >nul
:schleife
rem Bei STOP nicht aussteigen, sondern warten - sonst heisst "STOP loeschen"
rem in Wahrheit "neu anmelden oder von Hand starten", und der Bot bleibt
rem stumm liegen, obwohl die Datei laengst weg ist.
:warten
if not exist "STOP" goto los
timeout /t 30 /nobreak >nul
goto warten
:los
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "start-windows.ps1" -Scharf -Dauerlauf
rem Abgestuerzt oder beendet: kurz warten und von vorn.
timeout /t 60 /nobreak >nul
goto schleife
"@
# Laeuft die Schleife gerade, haelt cmd.exe diese Datei offen und sie laesst
# sich nicht ueberschreiben ("Der Datenstrom war nicht lesbar"). Frueher brach
# das Skript daran ab - und startete den Bot dann gar nicht mehr. Steht schon
# dasselbe drin, ist Schreiben ohnehin ueberfluessig; klappt es trotzdem nicht,
# reicht eine Warnung.
$schonDa = $false
if (Test-Path $Starter) {
    try {
        $alt = (Get-Content -Path $Starter -Raw -ErrorAction Stop)
        $schonDa = ($alt.TrimEnd() -eq $inhalt.TrimEnd())
    } catch { }
}
if ($schonDa) {
    Gut "Autostart steht bereits richtig: $Starter"
} else {
    try {
        Set-Content -Path $Starter -Value $inhalt -Encoding OEM -ErrorAction Stop
        Gut "Autostart eingerichtet: $Starter"
    } catch {
        Warnung "Startdatei ist gerade in Benutzung - bleibt unveraendert."
        Write-Host "     Das ist meist harmlos: die laufende Schleife haelt sie offen."
        Write-Host "     Soll sie wirklich neu geschrieben werden, erst alle Bot-Fenster"
        Write-Host "     schliessen und dieses Skript dann noch einmal starten."
    }
}
Write-Host "     Start:    $VerzoegerungSekunden Sekunden nach jeder Anmeldung"
Write-Host "     Laufzeit: ohne Limit, nach einem Absturz Neustart in 60 Sekunden"
Write-Host ""
Write-Host "  Anhalten:     New-Item `"$PSScriptRoot\STOP`"" -ForegroundColor Yellow
Write-Host "  Weiterlaufen: die Datei STOP wieder loeschen (laeuft dann binnen 30 Sekunden an)"
Write-Host "  Ganz weg:     .\autostart-einrichten.ps1 -Entfernen"

if ($Jetzt) {
    if (Test-Path (Join-Path $PSScriptRoot "STOP")) {
        Warnung "Datei STOP liegt noch da - der Bot wuerde sich sofort beenden. Wird geloescht."
        Remove-Item (Join-Path $PSScriptRoot "STOP") -Force
    }
    # Direkt starten statt ueber die Startdatei - die wartet erst die
    # Anmelde-Verzoegerung ab, und darauf will jetzt niemand warten.
    # -ArgumentList als EINE fertig zitierte Zeichenkette, nicht als Feld:
    # PowerShell fuegt ein Feld ungeschuetzt mit Leerzeichen zusammen. Liegt der
    # Bot unter "C:\Users\Max Muster\bot", zerfaellt der Pfad sonst in zwei
    # Argumente und der Start geht ins Leere - ohne erkennbaren Grund.
    $befehl = '-NoProfile -ExecutionPolicy Bypass -File "{0}\start-windows.ps1" -Scharf -Dauerlauf' -f $PSScriptRoot
    Start-Process -FilePath "powershell.exe" -ArgumentList $befehl -WorkingDirectory $PSScriptRoot
    Gut "Bot laeuft jetzt in einem eigenen Fenster."
    Write-Host "     Protokoll: $PSScriptRoot\logs\"
}
