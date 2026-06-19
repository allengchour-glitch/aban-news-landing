# =============================================================================
#  run-freegen-bot.ps1 — selbstlaufender freegen-Content-Bot fuer Windows
# -----------------------------------------------------------------------------
#  Installiert (einmalig) die Abhaengigkeiten und startet den Bot. Aus dem
#  Repo-Wurzelverzeichnis ausfuehren:
#      powershell -ExecutionPolicy Bypass -File automation\run-freegen-bot.ps1
#
#  Parameter:
#      -Count 2        Hubs pro Lauf
#      -LoopSeconds 0  0 = einmalig; >0 = Endlosschleife im Intervall
#      -NoVoiceover    ohne TTS (schneller)
#
#  Dauerbetrieb per Windows-Aufgabenplanung (taeglich 08:00):
#   schtasks /Create /TN "freegen-bot" /SC DAILY /ST 08:00 ^
#     /TR "powershell -ExecutionPolicy Bypass -File C:\Pfad\zum\repo\automation\run-freegen-bot.ps1"
# =============================================================================
param(
  [int]$Count = 2,
  [int]$LoopSeconds = 0,
  [switch]$NoVoiceover
)

$ErrorActionPreference = "Stop"
# Ins Repo-Wurzelverzeichnis wechseln (eine Ebene ueber diesem Skript)
Set-Location (Split-Path (Split-Path $MyInvocation.MyCommand.Path))

# Python finden
$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { $py = (Get-Command python3 -ErrorAction SilentlyContinue).Source }
if (-not $py) { Write-Error "Python nicht gefunden. Bitte Python 3 installieren (python.org)."; exit 1 }

Write-Host "Installiere Abhaengigkeiten (einmalig)..." -ForegroundColor Cyan
& $py -m pip install --quiet --upgrade pillow imageio-ffmpeg piper-tts

# Deutsches Stimmmodell laden, falls noch nicht vorhanden
$voiceDir = Join-Path $env:USERPROFILE ".local\share\piper-voices"
if (-not (Test-Path (Join-Path $voiceDir "de_DE-thorsten-medium.onnx"))) {
  Write-Host "Lade deutsches Stimmmodell (~61 MB)..." -ForegroundColor Cyan
  & $py -m piper.download_voices de_DE-thorsten-medium --download-dir $voiceDir
}

# Bot starten
$botArgs = @("automation/freegen_bot.py", "--count", $Count)
if ($LoopSeconds -gt 0) { $botArgs += @("--loop", $LoopSeconds) }
if ($NoVoiceover) { $botArgs += "--no-voiceover" }

Write-Host "Starte freegen-Bot..." -ForegroundColor Green
& $py @botArgs
