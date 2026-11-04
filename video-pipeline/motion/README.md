# Motion-Shorts (`video-pipeline/motion/`)

Animierte YouTube Shorts (9:16) aus HTML/SVG: Chromium rendert deterministisch Bild für Bild, ffmpeg macht das Video. **Lernen: `LERNEN.md`.**

```bash
cd video-pipeline/motion
node render.mjs bausteine/04-baum-waechst.html --vorschau 0,1,2.5      # Standbilder (schnell)
node render.mjs projekte/frieden/szenen.html --out ausgabe/frieden-stumm.mp4   # stummes MP4 (ca. 9 Min für 35 s)
bash mix.sh ausgabe/frieden-stumm.mp4 ausgabe/frieden.mp4               # + Musik (rotiert, −22 LUFS)
node pruefe_sicherzone.mjs projekte/frieden/szenen.html                 # Titel in der Sicherheitszone?
bash render_test.sh                                                     # Selbsttest (ohne Netz)
```

Voraussetzungen: Node 22, Playwright mit Chromium (global), ffmpeg, Schrift Inter. Nichts wird veröffentlicht; `ausgabe/` ist git-ignoriert.
Dateien: `motion.js` (Helfer), `render.mjs` (Renderer), `mix.sh` (Ton), `bausteine/` (5 Übungen), `projekte/frieden/` (Beispiel-Short mit `skript.md`).
