# Video-Projekt — Stil-Prototypen & Handoff

> **Achtung:** Dieses Verzeichnis liegt im **aban-news-landing**-Repo, weil die Web-Session
> hier startete. Die **echte Produktion** läuft im separaten **`make-blueprint`**-Projekt
> (Remotion-Engine: `remotion-build/`). Diese Dateien sind **Stil-Prototypen** (Python/Pillow),
> gebaut um Stil-Entscheidungen zu treffen, bevor in Remotion produziert wird.

## Stand / Entscheidungen

- **Format:** ~45 s+, vertikal 9:16, für YouTube Shorts (Haupt-Kanal) + TikTok + Reels parallel.
- **Nische:** Psychologie / Gewohnheiten / „wie dein Gehirn tickt" (DE).
- **Stil ENTSCHIEDEN:** **South-Park-artiger Paper-Cutout** — eigene Figur (NICHT die
  geschützten SP-Charaktere kopieren!).
- **Bewegung:** schnell-zappelig/energetisch; Mund-Flap-Lipsync; Papier-Zittern auf ~8 fps gequantelt.
- **Hintergrund:** detaillierte gezeichnete Szene, passend zum Skript (Demo: Stadt-Straße bei Dämmerung mit Ampel).
- **🔴 OFFEN / zu klären:** „echte Menschen?" — Foto-/Realismus-Hintergrund oder realistische
  Figuren statt Cutout? (Pillow-Prototyp kann das nicht; bräuchte KI-Bild-Generierung = anderer Lane.)

## Cutout-Style-Spec (für Remotion-Umsetzung)
- Figur: großer Kopf (~Ø180), kleiner Körper, Mütze+Bommel, eigene Farben.
- Augen: 2 weiße Ovale, beady Pupillen, Blinzeln ~alle 3 s.
- Mund: Flap-Lipsync, Höhe = Sprech-Amplitude, Mini-Pausen.
- Pivot-Gliedmaßen (Schulter/Ellbogen, Hüfte/Knie), Fäustlinge.
- Flache Farben, dicke Outline, Papier-Textur-Hintergrund ODER detaillierte Szene.

## Skripte (45-s-Struktur)
Hook (0–3s) → Stakes (3–10s) → Mechanik (10–22s) → Beispiel-Szene (22–35s) → Trick (35–42s) → Loop-Satz (42–45s+).
- **#6 „96× am Tag"** (Handy-Check-Reflex) — voll ausgeschrieben + prototypisiert (siehe output/).
- #3 (21-Tage-Mythos) und #7 (Rauchen-Loop) — als nächstes auszuschreiben.

## Dateien
### scripts/ (Python/Pillow Render-Prototypen)
- `render_southpark.py` — reiner Cutout-Charakter-Stiltest (redende Figur).
- `render_s6_cutout.py` — Skript #6 als Cutout, Beats+Props+Captions synchron, Papier-Hintergrund.
- `render_s6_scene.py` — wie oben, aber **detaillierter Szenen-Hintergrund** (Stadt-Straße/Ampel).
- `render_scene6.py` — frühere Stickman-Variante (voll gelenkig, FK) — verworfen zugunsten Cutout.
- `render_mp4.py` — MP4/Stills-Export-Helper für render_scene6.

Ausführen: `pip install Pillow imageio imageio-ffmpeg` dann `python3 scripts/render_s6_scene.py`.

### output/ (gerenderte Beispiele)
- `s6-scene.mp4` — **aktueller bester Stand**: Cutout + detaillierter Hintergrund.
- `s6-cutout.mp4` — Cutout auf Papier-Hintergrund.
- `southpark-style.mp4` — reiner Charakter-Stiltest.
- `szene-06.mp4` — alte Stickman-Variante.
- `*-preview.html` — frühe CSS/SVG-Vorschauen.

## Nächste Schritte
1. „echte Menschen"-Frage klären (Stil-Fork).
2. Skripte #3 und #7 ausschreiben.
3. In `make-blueprint`/Remotion: Cutout-`Character.tsx` bauen, Word-Sync + Props anbinden,
   1 PoC-Render von #6, an Qualitäts-Checkliste messen, DANN Batch über alle 100.

## ✅ TTS-LÖSUNG: piper funktioniert IM Container (von der Dropship-Session getestet, 2026-06-03)
XTTS scheiterte (Dependency-Hölle, siehe XTTS-SETUP.md) — **piper läuft sauber, ohne Build-Probleme**:
```bash
pip install piper-tts                       # Binary + Python-Modul, keine Kaskade
# Deutsche Stimme laden (HuggingFace rhasspy/piper-voices):
#   weiblich: de/de_DE/kerstin/low/de_DE-kerstin-low.onnx(+.json)  (~61 MB)
#   maennlich Top-Qualitaet: de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx
echo "Dein Satz." | piper -m de_DE-kerstin-low.onnx -f vo.wav   # -> sauberes WAV
```
Fallback `espeak-ng` (apt) ist auch da (roboterhaft). Damit ist **Voiceover im Container moeglich** —
kein make-blueprint noetig, falls nur Stimme + ffmpeg-B-Roll gebraucht wird.
**PoC (LuxeStyle, gleiche Methode):** `reels/script-sommer-20260603-1834.mp4` — piper-Voiceover +
B-Roll pro Satz + Hook + geduckter Beat, voll mit ffmpeg gebaut. Vorgehen dort als Vorlage nutzbar.
