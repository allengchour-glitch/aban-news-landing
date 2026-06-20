# cleanup-storage.ps1 - ASCII only. SPEICHER-AUFRAEUMER (User 2026-06-20 "Daten die viel Platz brauchen
# in die Cloud / PC schlank halten"). Die echten Daten (Reports/Reels/Queue/Analysen) liegen via Git auf
# GitHub = Cloud-Backup. Hier wird nur EPHEMERES auf dem PC beschnitten, damit die Disk nicht volllaeuft.
# Laeuft im Weekly-Task + per cmd "cleanup". No-op-sicher, loescht NICHTS aus Git.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$mb = 0
function Size($p){ if(Test-Path $p){ (Get-ChildItem $p -Recurse -File -EA SilentlyContinue | Measure-Object Length -Sum).Sum/1MB } else { 0 } }

# 1) Logs auf letzte 600 Zeilen kuerzen (wachsen sonst unbegrenzt)
foreach($log in @("$PSScriptRoot\vollautomat.log","$PSScriptRoot\cmd-poll.log")){
  if(Test-Path $log){ try{ $t=Get-Content $log -Tail 600; Set-Content $log $t }catch{} }
}

# 2) Temp-Reste der Builder/Tools (regenerierbar) loeschen
foreach($t in @("$env:TEMP\ms","$env:TEMP\mfast","$env:TEMP\va-out-*","$env:TEMP\va-err-*","$env:TEMP\camp-*","$env:TEMP\tt-*","$env:TEMP\anibis-*")){
  Get-Item $t -EA SilentlyContinue | Remove-Item -Recurse -Force -EA SilentlyContinue
}

# 3) Screenshots beschneiden: nur die neuesten 15 behalten (Rest ist nur fuer Einmal-Kontrolle)
foreach($d in @("$repo\automation\local\campaign-shots","$repo\automation\local\ig-delete-shots","$repo\reports")){
  if(Test-Path $d){ Get-ChildItem $d -Filter *.png -EA SilentlyContinue | Sort-Object LastWriteTime -Desc |
    Select-Object -Skip 15 | Remove-Item -Force -EA SilentlyContinue }
}

# 4) Musik-Cache (gitignored, re-downloadbar) leeren wenn > 150 MB
$lib = "$repo\automation\music\lib"
if((Size $lib) -gt 150){ Get-ChildItem $lib -File -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue; Write-Host "Musik-Cache geleert (re-downloadbar)" }

# 5) Git komprimieren (packt die History, spart Platz im .git)
Push-Location $repo; try { & git gc --auto 2>$null } catch {}; Pop-Location

Write-Host "cleanup-storage fertig. Reports/Reels/Queue bleiben (sind in Git=Cloud). Nur Ephemeres beschnitten."
