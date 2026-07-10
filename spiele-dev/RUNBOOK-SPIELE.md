# 🎮 RUNBOOK Spiele-Entwicklung (Skill-Bibliothek, Hermes-Prinzip)

> Für jede Session, die an den Browser-Spielen arbeitet (`neon-*.html`, `lebenspfad.html`,
> `wort-*.html`). Wiederkehrende Aufgaben sind hier als fertige „Skills" dokumentiert —
> nicht neu erfinden, einfach ausführen. Stand: 2026-07-09.

## Der Verbesserungs-Loop (jede Runde gleich)
1. **Implementieren** (python3-Patches mit `assert old in s` — nie blind sed)
2. **Smoke**: `node tools/game_smoke.cjs <spiel>.html` → muss PASS sein (0 JS-Fehler)
3. **In-Game-Screenshot**: `node tools/game_shot.cjs <spiel-ohne-.html> …` → `/tmp/aban-smoke/ig_<spiel>.png`
   (startet das Spiel headless, klickt Start-Button, simuliert Bewegung)
4. **Gemini-Vision-Review** (Art-Director): Screenshot als base64 `inline_data` an
   `gemini-2.5-flash` mit `"thinkingConfig":{"thinkingBudget":0}` (WICHTIG, sonst frisst
   Thinking das Token-Budget) + `"responseMimeType":"application/json"`. Prompt:
   „Nenne die N wichtigsten konkreten visuellen Fixes (three.js r128, prozedural)".
5. **Fixes umsetzen** → zurück zu 2. Screenshot-Iteration ist Pflicht (Wolken-zu-nah-Falle!)
6. **Liefern**: Commit (Message via `-F` Datei) → `git push -u origin claude/neon-realm` →
   **non-draft PR** via `mcp__github__create_pull_request` (draft:false) →
   `merge_pull_request` squash → `git fetch origin main && git merge origin/main && push`.
   (Draft-PR + undraft ist rate-limited — direkt non-draft erstellen.)

## Werkzeuge (persistent im Repo)
- `tools/game_smoke.cjs` — Smoke-Test aller Spiele (Playwright, Chromium unter
  `/opt/pw-browsers/…`; falls node_modules fehlt: `npm install playwright`)
- `tools/game_shot.cjs` — In-Game-Screenshots (dieses Runbook, Schritt 3)
- `gltf-transform` (`npm i -g @gltf-transform/cli`) — GLB-Optimierung:
  `resize --width 512` + `simplify --ratio 0.05 --error 0.001` + `prune`
  (Meshy-Refine liefert ~300k Tris / 8+ MB → Ziel <500 KB)
- `ffmpeg` (apt) — Audio-Transkodierung nach `/audio/` (112–128 kbps)

## Assets & APIs
- **Musik**: echte Tracks in `/audio/` (Zuordnung + CC-BY-Attribution siehe Spiele-Footer;
  Quellen `automation/music/` + CREDITS.txt). Muster: `MUS=new Audio(...)`, `musSync()`
  respektiert mute/pause/running; Autoplay ok, weil Start immer nach User-Klick.
- **Meshy** (Text-to-3D, PBR): preview → refine (`enable_pbr:true`) → GLB →
  gltf-transform-Kette → `models/*.glb`. Key als Env `MESHY_KEY` (nie committen!).
- **HDRI**: `textures/sky_1k.hdr` (PolyHaven CC0) + `js/vendor/RGBELoader.js`;
  in Tageslicht-Szenen `scene.environment` via PMREMGenerator, `envMapIntensity`
  **dimmen** (0.3) sonst überstrahlt. Nur `isWebGL2`.
- **Gemini** Key als Env `GEMINI_KEY` (nie committen).

## Teuer gelernte Fallen
- **RenderTarget frisst Canvas-AA** → Bloom-Spiele brauchen `WebGLMultisampleRenderTarget`
  (WebGL2-Check + Fallback). Das war die Ursache von „zu pixelig".
- **Bloom-Blowout**: threshold ≥0.7, strength ≤0.7 bei hellen Szenen; nach jedem
  Bloom-Einbau Screenshot prüfen (weiße Klötze = zu heiß).
- **Points ohne Sprite-Map = eckige Klötzchen** → immer weiche Radial-Canvas-Textur als map.
- **Alte Variablen-Referenzen nach Ersatz** (grid→gridMesh): nach jedem Ersetzen
  `grep` auf den alten Namen.
- **Gegner-Umfärbung**: Kind-Meshes mit `m.material` (geteilt) anlegen, dann färbt
  `material.color.setHex` alles mit; unabhängige Teile (Augen) eigenes Material.
- **Wolken/Sonne nicht in Kameranähe** (wäscht Bild aus) — weit hinter das Brett.
- **Musik-Dateien**: `preload="none"` (Seitenladezeit), Lautstärke 0.26–0.34.

## Spiel-Besonderheiten
- `lebenspfad.html`: OPT (music/sfx/tempo/motion) aus localStorage; updater-Kette in der
  Hauptschleife (`updClouds`, `updButterflies`, `updDekoCoins` …); Kapitel-Farben CHAPTERS[];
  Debug-Hook-Muster: Kopie `_lpdbg.html` mit `window.__T=…` (nie committen).
- `neon-colossus.html`: eigenes Composite-Grading — **kein** renderer.toneMapping setzen.
- `neon-realm.html`: Bloom nur `!IS_COARSE` (Mobile rendert direkt).
- Wortspiele: Musik-Toggle standardmäßig AUS.

## 📋 Offener Vision-Befund neon-realm (Gemini-Art-Director, 2026-07-10)
In-Game-Shot (nach game_smoke-Startklick-Fix) reviewt — 3 konkrete Fixes, absteigend nach Wirkung:
1. **Bloom/Emissive verstärken**: Häuserfenster, Laternenköpfe, Spielerfigur mit Emissive-Material
   + UnrealBloomPass (three.js r128 examples/js/postprocessing) — Neon-Titel visuell einlösen.
2. **Boden beleben**: Perlin/Simplex-Noise-Höhenkarte statt flacher Ebene + verstreute kleine
   „Neon-Pflanzen" (instanzierte Cones/Spheres, emissive) — Welt wirkt aktuell leer/statisch.
3. **Tag-Nacht-Zyklus sichtbar machen**: HUD zeigt „Tag 1 · 08:06" mit Mond, Szene ist aber
   Dauernacht — Ambient/DirectionalLight-Farbe+Intensität an Spielzeit koppeln, Fog-Farbe mitziehen.
Loop: implementieren → game_smoke PASS → game_shot → selbst ansehen (Gemini-Key des Users nur in Session).
