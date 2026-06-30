# aurora-video.ps1 — 1-Klick: drehendes Aurora-Ketten-Video.
# Reine API (Veo/Gemini -> Fallback fal/Seedance). Startet Brave NICHT (stoert die Kampagne nicht).
# Git-frei beim Rendern; pusht nur das fertige Video zurueck. Aufruf via AURORA-VIDEO.bat.
$ErrorActionPreference = "Continue"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repo

# Code aktuell holen (best-effort; kein Abbruch bei Fehler)
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null | Out-Null

# Secrets (GEMINI_API_KEY / FAL_KEY)
if (Test-Path "$env:USERPROFILE\luxe-secrets.ps1") { . "$env:USERPROFILE\luxe-secrets.ps1" }
if (-not $env:GEMINI_API_KEY) { Write-Host "WARNUNG: GEMINI_API_KEY fehlt in luxe-secrets.ps1 (Veo geht dann nicht)." }

$img = "https://cdn.shopify.com/s/files/1/0943/6856/3585/files/3d48340e-cc7f-4d18-8f74-cd2c8d463c9b.jpg?v=1781380333"
$prompt = "Cinematic luxury jewelry commercial. The rainbow-gemstone necklace slowly rotates and turns, dazzling sparkle and glossy light reflections across the colourful stones. Elegant dark background with soft golden bokeh and a subtle aurora light glow. Slow, smooth, stabilized motion. The necklace stays true to the reference image, same colours and design, no distortion. No text, no logo, no watermark. Vertical 9:16, high quality."
$out = "reels/veo-aurora.mp4"

Write-Host "=== 1) Veo (Gemini-Guthaben) — rendert, kann 1-6 Min dauern ==="
node automation/veo_product_clip.mjs --image $img --prompt $prompt --aspect 9:16 --seconds 8 --out $out

if (-not (Test-Path $out)) {
  Write-Host "=== Veo kein Output -> 2) Fallback fal/Seedance ($31 Guthaben) ==="
  node automation/seedance_video.mjs --image $img --prompt $prompt --res 720p --dur 5 --ar 9:16 --out $out
}

if (Test-Path $out) {
  $mb = [math]::Round((Get-Item $out).Length/1MB, 2)
  Write-Host "=== FERTIG: $out ($mb MB) -> pushe zu Claude ==="
  git add -f $out 2>$null
  git commit -m "aurora-video: drehendes Aurora-Video (1-Klick)" 2>$null
  git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
  git push origin claude/luxestyle-product-CizQ6 2>$null
  Write-Host ""
  Write-Host "ERLEDIGT. Schreib Claude: 'video da' -> er haengt Stimme + Text dran."
} else {
  Write-Host ""
  Write-Host "KEIN Video erstellt. Moegliche Ursache: Gemini-Key ohne Billing-Projekt ODER fal/Veo-Fehler."
  Write-Host "Plan B: in der Gemini-App selbst generieren (Foto + 'drehend, glaenzend, 9:16') und Claude schicken."
}
