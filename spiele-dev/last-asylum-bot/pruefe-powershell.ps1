# Prueft die PowerShell-Skripte, ohne sie auszufuehren.
#
#   pwsh -NoProfile -File ./pruefe-powershell.ps1
#
# Warum es das gibt: an start-windows.ps1 sind schon mehrere Fehler
# vorbeigekommen, die ein Blick nicht faengt - eine Zahl, die als negatives
# Int32 gelesen wird; zwei Parameter, die sich ausschliessen; ein .Trim() auf
# einem leeren Ergebnis. In der Entwicklungsumgebung gab es lange kein
# PowerShell, also wurde geraten. Wer eines hat, soll das hier laufen lassen.
#
# EHRLICHE GRENZE: das prueft Syntax, nicht Verhalten. Und pwsh 7 ist nicht
# Windows PowerShell 5.1 - Unterschiede bei $ErrorActionPreference und
# nativen Befehlen faengt das hier NICHT. Der einzige echte Test ist ein Lauf
# auf dem Zielrechner:  .\start-windows.ps1 -NurPruefen

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$schlimm = 0

foreach ($datei in (Get-ChildItem -Path $PSScriptRoot -Filter "*.ps1")) {
    $fehler = $null
    $baum = [System.Management.Automation.Language.Parser]::ParseFile(
        $datei.FullName, [ref]$null, [ref]$fehler)

    if ($fehler -and $fehler.Count) {
        Write-Host "X  $($datei.Name): $($fehler.Count) Syntaxfehler" -ForegroundColor Red
        foreach ($f in $fehler) {
            Write-Host ("     Zeile {0}: {1}" -f $f.Extent.StartLineNumber, $f.Message)
        }
        $schlimm++
        continue
    }

    # Grosse Zahlen-Literale: 0x80000000 liest PowerShell als vorzeichen-
    # behaftetes Int32, also als -2147483648. Genau daran ist der
    # Ruhezustands-Aufruf am 01.08. gescheitert.
    $zahlen = $baum.FindAll({
        param($n) $n -is [System.Management.Automation.Language.ConstantExpressionAst]
    }, $true) | Where-Object {
        $_.Extent.Text -match '^0x[0-9a-fA-F]{8}$' -and
        [Convert]::ToUInt32($_.Extent.Text, 16) -gt 2147483647
    }
    foreach ($z in $zahlen) {
        Write-Host ("!  {0} Zeile {1}: {2} wird als negatives Int32 gelesen - als Dezimalzahl schreiben" `
                    -f $datei.Name, $z.Extent.StartLineNumber, $z.Extent.Text) -ForegroundColor Yellow
        $schlimm++
    }

    # Start-Process mit -ArgumentList als Feld: die Elemente werden ungeschuetzt
    # mit Leerzeichen zusammengefuegt. Ein Pfad wie "C:\Users\Max Muster\bot"
    # zerfaellt dann in zwei Argumente, leere Elemente verschwinden ganz.
    $aufrufe = $baum.FindAll({
        param($n) $n -is [System.Management.Automation.Language.CommandAst]
    }, $true)
    foreach ($a in $aufrufe) {
        if ($a.GetCommandName() -ne "Start-Process") { continue }
        for ($i = 0; $i -lt $a.CommandElements.Count - 1; $i++) {
            $e = $a.CommandElements[$i]
            if ($e -isnot [System.Management.Automation.Language.CommandParameterAst]) { continue }
            if ($e.ParameterName -notlike "ArgumentList*" -and $e.ParameterName -ne "Args") { continue }
            $wert = $a.CommandElements[$i + 1]
            if ($wert -is [System.Management.Automation.Language.ArrayLiteralAst] -or
                $wert.Extent.Text -match '^@\(') {
                Write-Host ("!  {0} Zeile {1}: Start-Process -ArgumentList mit Feld - Pfade mit Leerzeichen brechen. Vorher selbst in Anfuehrungszeichen setzen." `
                            -f $datei.Name, $a.Extent.StartLineNumber) -ForegroundColor Yellow
                $schlimm++
            }
        }
    }

    Write-Host "OK $($datei.Name)" -ForegroundColor Green
}

if ($schlimm) {
    Write-Host "`n$schlimm Beanstandung(en)." -ForegroundColor Yellow
    exit 1
}
Write-Host "`nAlle PowerShell-Skripte in Ordnung." -ForegroundColor Green
