# Motion-Shorts (`video-pipeline/motion/`)

Animierte YouTube Shorts (9:16) aus HTML/SVG: Chromium rendert deterministisch Bild für Bild, ffmpeg macht das Video. **Lernen: `LERNEN.md`, dann `LERNEN-2-GESTALTEN-FALLEN.md`.**

```bash
cd video-pipeline/motion
node render.mjs bausteine/04-baum-waechst.html --vorschau 0,1,2.5      # Standbilder (schnell)
node render.mjs projekte/frieden/szenen.html --out ausgabe/frieden-stumm.mp4   # stummes MP4 (ca. 9 Min für 35 s)
bash mix.sh ausgabe/frieden-stumm.mp4 ausgabe/frieden.mp4               # + Musik (rotiert, −22 LUFS)
bash stimme.sh projekte/frieden/stimme.txt ausgabe/frieden-stimme.wav 35   # deutsche Stimme (Piper, lokal, gratis)
STIMME_DATEI=ausgabe/frieden-stimme.wav STIMME_START=0 bash mix.sh ausgabe/frieden-stumm.mp4 ausgabe/frieden-mit-stimme.mp4
node pruefe_sicherzone.mjs projekte/frieden/szenen.html                 # Titel in der Sicherheitszone?
bash render_test.sh                                                     # Selbsttest (ohne Netz)
```

Voraussetzungen: Node 22, Playwright mit Chromium (global), ffmpeg, Schrift Inter; für die Stimme `pip install piper-tts` (das Modell lädt `stimme.sh` einmalig nach `~/.local/share/luxe-stimmen`, nicht ins Repo). Nichts wird veröffentlicht; `ausgabe/` ist git-ignoriert.
Dateien: `motion.js` (Helfer), `render.mjs` (Renderer), `mix.sh` (Ton), `stimme.sh` (deutsche Sprachspur), `bausteine/` (5 Übungen), `projekte/frieden/` (Beispiel-Short mit `skript.md`).
