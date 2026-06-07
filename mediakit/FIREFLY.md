# Firefly-Bearbeitung (Adobe-MCP) — ehrliche Anleitung

**Wichtig:** Die kreative KI-Bearbeitung läuft **nicht** über ein `mediakit`-Skript.
Es gibt **kein** `python3 -m mediakit firefly edit`. Die eigentlichen Edits
(Hintergrund entfernen, generativ erweitern, Farb-Grade, Video-Cut) führt der
**Agent über die Adobe-Firefly-MCP-Tools** aus. `mediakit firefly` stellt nur
Dateien bereit (`prepare`) und holt das Ergebnis zurück (`ingest`).

## Ablauf (Mensch + Agent zusammen)
1. **Du / Skript:** `python3 -m mediakit firefly prepare bild.png`
   → kopiert die Datei nach `mediakit/.firefly_stage/` und gibt den Pfad aus.
2. **Agent (per MCP):** `adobe_mandatory_init` → Asset hochladen
   (`asset_initialize_file_upload` / `asset_add_file`) → gewünschtes Tool aufrufen.
3. **Agent:** Ergebnis herunterladen.
4. **Du / Skript:** `python3 -m mediakit firefly ingest ergebnis.png img/ai/held.png`
   → übernimmt es ins Repo; danach ggf. markenkonform nachschneiden.

## Rezepte
**Hintergrund entfernen (z. B. für ein sauberes Thumbnail)**
- `firefly prepare foto.png`
- Agent: `image_remove_background`
- `firefly ingest out.png /tmp/clean.png` → `mediakit image overlay /tmp/clean.png final.png --brand-bar`

**1:1 → 9:16 generativ erweitern (statt Balken)**
- `firefly prepare quadrat.png`
- Agent: `image_generative_expand` (Zielverhältnis 9:16)
- `firefly ingest out.png slide_bg.png`

**Schneller Social-Cut aus einem Clip**
- `firefly prepare clip.mp4`
- Agent: `video_create_quick_cut` / `video_resize` (9:16)
- `firefly ingest out.mp4 /tmp/cut.mp4` → `mediakit video captions /tmp/cut.mp4 final.mp4 --srt subs.srt`

**Farb-Grade / Belichtung**
- `firefly prepare bild.png`
- Agent: `image_adjust_*` (Helligkeit/Kontrast/Sättigung/Temperatur)
- `firefly ingest out.png final.png`

## Voraussetzung
Adobe-Konto/Anmeldung für die Firefly-MCP-Tools (und ggf. Credits). Das ist der
einzige Teil des Toolkits, der **nicht** gratis/offline läuft — die `image`/`video`/
`reel`-Befehle brauchen kein Adobe.
