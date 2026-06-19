# HeyGen-Klon — eigenes Text→Avatar-Video-Tool

Macht HeyGens Kernfunktion als **dein eigenes Werkzeug** nutzbar: Avatare/Stimmen
auflisten, Videos einzeln oder als Batch erzeugen, fertige MP4s lokal herunterladen.
Ziel: im bezahlten Monat **alle Videos rausholen** → Outputs gehören dir und bleiben
nach einer Kündigung erhalten.

> ⚠️ Was es **nicht** ist: ein Nachbau von HeyGens KI-Modell. Avatar-Generierung,
> Lip-Sync und Voice-Cloning laufen auf HeyGens Servern (proprietär). Dieses Tool
> ist ein sauberer **API-Client/Wrapper** um genau diese Funktion.

## Einrichtung
```bash
export HEYGEN_API_KEY="dein_key"      # NIE committen / nicht in den Chat tippen
```

## Benutzung
```bash
# 1) Verfügbare Avatare + Stimmen anschauen (IDs notieren)
node automation/heygen_clone.mjs avatars
node automation/heygen_clone.mjs voices de        # optional gefiltert (z. B. Sprache)

# 2) Einzelvideo
node automation/heygen_clone.mjs gen "Dein Text" \
  --avatar <avatar_id> --voice <voice_id> \
  --out heygen/out/clip.mp4 --w 1080 --h 1920 --bg "#ffffff"

# 3) Batch (mehrere Videos aus einer Queue)
cp heygen/queue.example.json heygen/queue.json   # IDs/Texte eintragen
node automation/heygen_clone.mjs batch heygen/queue.json

# Job-Status separat prüfen
node automation/heygen_clone.mjs status <video_id>
```

## Hinweise
- **Hochformat 1080×1920** für Reels/TikTok/IG, **1920×1080** für YouTube/Landscape.
- Outputs landen in `heygen/out/` (per `.gitignore` vom Repo ausgeschlossen — zu groß).
- `queue.json` (deine echten IDs/Texte) wird **nicht** versioniert; nur `queue.example.json`.
- Rate-Limits/Kontingent richten sich nach deinem HeyGen-Plan.
