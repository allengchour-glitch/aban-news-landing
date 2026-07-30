# Last-Asylum-Bot dauerhaft einrichten – einmal ausführen, danach nie wieder.
#
#   powershell -ExecutionPolicy Bypass -File .\autostart-einrichten.ps1
#
# Danach startet der Bot bei jeder Windows-Anmeldung von selbst, läuft ohne
# Zeitlimit und wird nach einem Absturz automatisch neu gestartet.
#
#   .\autostart-einrichten.ps1 -Entfernen   -> Aufgabe wieder löschen
#   .\autostart-einrichten.ps1 -Jetzt       -> zusätzlich sofort starten

param(
    [switch]$Entfernen,
    [switch]$Jetzt,
    [int]$VerzoegerungMinuten = 3
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$AufgabenName = "LastAsylumBot"
$Skript = Join-Path $PSScriptRoot "start-windows.ps1"

function Gut($t)     { Write-Host "  OK  $t" -ForegroundColor Green }
function Warnung($t) { Write-Host "  !   $t" -ForegroundColor Yellow }
function Fehler($t)  { Write-Host "  X   $t" -ForegroundColor Red }

# ------------------------------------------------------------------- Entfernen
if ($Entfernen) {
    $da = Get-ScheduledTask -TaskName $AufgabenName -ErrorAction SilentlyContinue
    if ($da) {
        Unregister-ScheduledTask -TaskName $AufgabenName -Confirm:$false
        Gut "Aufgabe '$AufgabenName' entfernt - der Bot startet nicht mehr von selbst."
    } else {
        Warnung "Es gab keine Aufgabe '$AufgabenName'."
    }
    exit 0
}

if (-not (Test-Path $Skript)) {
    Fehler "start-windows.ps1 liegt nicht neben dieser Datei."
    exit 1
}

# ---------------------------------------------------------------- Einrichten
$aktion = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$Skript`" -Scharf -Dauerlauf" `
    -WorkingDirectory $PSScriptRoot

# Nach der Anmeldung ein paar Minuten warten, damit BlueStacks zuerst hochkommt.
$ausloeser = New-ScheduledTaskTrigger -AtLogOn
$ausloeser.Delay = "PT${VerzoegerungMinuten}M"

$einstellungen = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

$vorhanden = Get-ScheduledTask -TaskName $AufgabenName -ErrorAction SilentlyContinue
if ($vorhanden) { Unregister-ScheduledTask -TaskName $AufgabenName -Confirm:$false }

Register-ScheduledTask `
    -TaskName $AufgabenName `
    -Action $aktion `
    -Trigger $ausloeser `
    -Settings $einstellungen `
    -Description "Spielt Last Asylum selbstaendig weiter (siehe $PSScriptRoot)" | Out-Null

Gut "Aufgabe '$AufgabenName' eingerichtet."
Write-Host "     Start:    $VerzoegerungMinuten Minuten nach jeder Windows-Anmeldung"
Write-Host "     Laufzeit: ohne Limit, Neustart nach Absturz (bis zu 5x, alle 10 Minuten)"
Write-Host ""
Write-Host "  Anhalten:    New-Item `"$PSScriptRoot\STOP`"" -ForegroundColor Yellow
Write-Host "  Weiterlaufen: die Datei STOP wieder loeschen"
Write-Host "  Ganz weg:    .\autostart-einrichten.ps1 -Entfernen"

if ($Jetzt) {
    Start-ScheduledTask -TaskName $AufgabenName
    Gut "Aufgabe zusaetzlich sofort gestartet."
    Write-Host "     Fortschritt im Protokoll: $PSScriptRoot\logs\"
}
