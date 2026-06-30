# aurora-voice.ps1 — legt eine sexy/warme Damen-Stimme (ElevenLabs) auf reels/aurora-veo-final.mp4.
# Laeuft am PC (ELEVENLABS_API_KEY aus luxe-secrets.ps1). Loopt das 8s-Video auf VO-Laenge, mischt, pusht.
# PowerShell-sicher: keine Prozentzeichen / keine Klammern-mit-Variablen in Strings.
$ErrorActionPreference = "Continue"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repo
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null | Out-Null
if (Test-Path "$env:USERPROFILE\luxe-secrets.ps1") { . "$env:USERPROFILE\luxe-secrets.ps1" }
if (-not $env:ELEVENLABS_API_KEY) { Write-Host "FEHLER: ELEVENLABS_API_KEY fehlt in luxe-secrets.ps1."; exit 1 }

$src = "reels/aurora-veo-final.mp4"
if (-not (Test-Path $src)) { $src = "reels/veo-aurora.mp4" }
if (-not (Test-Path $src)) { Write-Host "FEHLER: kein Aurora-Video gefunden (reels/aurora-veo-final.mp4)."; exit 1 }

# Sexy/warme Damen-Stimme: ElevenLabs 'Charlotte' (sultry). Aenderbar via ELEVEN_VOICE_ID.
$env:ELEVEN_VOICE_ID = "XB0fDUnXU5powFXDhCwa"
$script = "Aurora. Alle Farben des Nordlichts, in einer einzigen Kette. Echter Moissanit, funkelnd und edel, mit edler Geschenkbox. Jetzt bei LuxeStyle. Zehn Prozent mit dem Code Welcome zehn."
$vo = "reports/aurora-vo.mp3"
New-Item -ItemType Directory -Force -Path reports | Out-Null

Write-Host "1) Stimme generieren (ElevenLabs Charlotte)..."
node automation/elevenlabs_tts.mjs $script $vo
if (-not (Test-Path $vo)) { Write-Host "FEHLER: keine VO erzeugt (Key/Quota?)."; exit 1 }

$dur = (& ffprobe -v error -show_entries format=duration -of csv=p=0 $vo).Trim()
if (-not $dur) { $dur = "12" }
Write-Host ("VO-Laenge: " + $dur + "s. 2) Video loopen + Stimme druntermischen...")
$outv = "reels/aurora-veo-voice.mp4"
ffmpeg -y -stream_loop -1 -i $src -i $vo -t $dur -map 0:v:0 -map 1:a:0 -af "loudnorm=I=-15:TP=-1.5" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k $outv

if (Test-Path $outv) {
  $mb = [math]::Round((Get-Item $outv).Length / 1MB, 2)
  Write-Host ("FERTIG: " + $outv + " - " + $mb + " MB. Pushe zu Claude...")
  git add -f $outv $vo 2>$null
  git commit -m "aurora-voice: Damen-Stimme auf Aurora-Video" 2>$null
  git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
  git push origin claude/luxestyle-product-CizQ6 2>$null
  Write-Host ""
  Write-Host "ERLEDIGT. Schreib Claude:  stimme da"
} else {
  Write-Host "FEHLER beim Mischen - siehe ffmpeg-Ausgabe oben."
}
