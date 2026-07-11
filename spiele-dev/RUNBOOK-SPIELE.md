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

## 🕹️ MASTERPLAN „aban Arcade" (User-Auftrag 2026-07-10: „alles in 1, handy-optimiert, alle online koop/multiplayer")
Grossprojekt in Phasen — jede 2h-Runde arbeitet den nächsten offenen Schritt ab, IMMER mit
Smoke+Shot-Verifikation pro Änderung. Fortschritt hier abhaken (✅), damit Sessions nahtlos übernehmen.

### Phase 1 — Alles-in-1-Shell (Arcade-Launcher)
- [x] spiele.html → „aban Arcade" (2026-07-11): einheitliche Game-Cards (Play-Button ≥44px, frisch
      aufgewertete zuerst), gemeinsames Profil (Spielername, localStorage `abanArcade`, Button oben),
      Gesamt-Highscore-Leiste (Chips „Fortschritt in X von 11 Spielen" + je Spiel), Highscore-Badge
      pro Karte (defensiv, auch JSON-Saves: nr_save1→lvl, lp_save1→round, aban_wdt_stats→streak),
      Zurück-zur-Arcade-Link in ALLEN 11 Spielen (neu ergänzt: neon-flug Startscreen inkl. DE+EN-Dict,
      wort-des-tages + wortbruecke Footer). Sitemap: spiele.html + alle 11 Spiele eingetragen.
- [~] Shared js/arcade.js ERSTELLT (AbanArcade: profile/setName, readBest, isTouch, fullscreen,
      getMuted/setMuted, onPause) — Hub nutzt es; Spiele-seitige Übernahme = Phase 2 (kein Risiko-Umbau).
      Key-Inventar: nj_best·nr_best(Racer!)·ns_best·na_best·nc_best·nd_best·aban_neon_best(Flug)·
      nr_save1(Realm-JSON)·lp_save1(JSON)·aban_wdt_stats(JSON). ⚠️ Realm nutzt nr_-Präfix wie Racer.

### Phase 2 — Handy-Optimierung (alle 12 Spiele)
- [ ] Audit pro Spiel via game_shot mit Mobile-Viewport (390×844) — Liste: was hat Touch, was nicht
- [ ] Touch-Controls nachrüsten wo fehlend (Muster: neon-realm tAtk/tDodge-Buttons + virtueller Stick)
- [ ] Performance: pixelRatio-Cap, reduzierte Partikel auf Mobile (navigator.maxTouchPoints)
- [ ] viewport-fit=cover + safe-area-insets, Buttons ≥44px

### Phase 3 — Online Koop/Multiplayer
- **ARCHITEKTUR-UPDATE (2026-07-11, umgesetzt):** Statt KV-Signaling (blockierte auf User-Klick
  fürs KV-Binding) → **PeerJS-Cloud-Signaling als Default**: `js/vendor/peerjs.min.js` (vendored)
  + gratis Cloud-Broker `0.peerjs.com` (kein eigener Server, kein API-Key, kein User-Klick).
  Nach dem Handshake läuft ALLES P2P über WebRTC-DataChannels (DSGVO-freundlich).
  `/api/mp-signal` (KV) bleibt als späterer Fallback/Upgrade notiert, falls 0.peerjs.com je
  wegfällt — mp.js ist dafür Engine-austauschbar gebaut.
- [x] **js/mp.js** (wiederverwendbar für alle Spiele): `MP.host(gameId)` → 4-Zeichen-Raum-Code
      (A–Z ohne I/O, sofort verfügbar, PeerJS-ID `aban-<game>-<CODE>`, Kollision → neu würfeln),
      `MP.join(gameId, code)` mit 15s-Timeout + klarer Fehlermeldung. Session-API: `send`
      (reliable, Events), `sendFast` (2. unreliable DataChannel für Positions-Spam, Fallback auf
      reliable), `onMessage`, `onStatus` ("waiting"/"connected"/"lost"/"closed"), `close()`.
      Robustheit: 1× Reconnect bei Abriss (Host wartet 10s auf Wieder-Andocken, Gast verbindet
      1× neu), **Heartbeat-Watchdog** (Stille >6s bei laufendem Traffic = Abriss — nötig, weil
      DataChannel-close bei hartem Tab-Kill erst nach langem ICE-Timeout feuert).
      Test-Engine: `?mp=local` in der URL = echtes RTCPeerConnection, Signaling über
      BroadcastChannel (für Sandbox ohne wss-Ausgang; DataChannel-Logik identisch/echt).
- [x] **Pilot neon-duo LIVE:** Startscreen-Modus „🌐 Online spielen" → Raum erstellen (Code
      GROSS + Copy-Button + navigator.share + `?join=CODE`-Link mit Auto-Join) / Raum beitreten
      (4 grosse Buchstaben-Felder ≥44px, Paste-Support, Auto-Submit). Netzcode host-autoritativ:
      Host simuliert alles (Gegner/Boss/HP/Revive/Band-Schaden), sendet **12 Snapshots/s**
      (unreliable, kompakt: Positionen+HP+down/rev+Gegnerliste per eid) + Events reliable
      (announce/hint/wave/nova/attack-fx/boss-warn/gameover). Client steuert ✦ Funke
      client-autoritativ (**20 Positions-Updates/s**), interpoliert Klinge/Gegner/Boss per lerp
      (dt*10). Ping-Anzeige im HUD (1s-Takt, gelb >80ms, rot >150ms). Disconnect → Overlay
      „Verbindung verloren" mit **„Weiter mit KI-Partner"** (Host: nahtlos im selben Run;
      Client: frischer Solo-Run) + „Menü". Refactor-Muster im Spiel: `simFrame` (Host/lokal) /
      `clientFrame` (Interpolation) / `visFrame` (geteilte Optik) + `buildEnemyG`/`buildBossG`
      (Mesh-Bau geteilt Host-Sim ↔ Client-Spiegel) + Debug-Griff `window.__nd.s()` für Tests.
- [ ] Danach ausrollen: neon-racer (Ghost-Race), neon-survivor (Koop-Wellen), wortbruecke (Duell)
- ⚠️ **Sandbox-Fakten:** wss zu 0.peerjs.com geht im Sandbox-Chromium NICHT raus (Proxy) —
  curl über HTTPS_PROXY erreicht die Cloud aber (Prod-Browser ok). Für Tests IMMER `?mp=local`.
  SwiftShader-WebGL macht 2 gleichzeitige Game-Pages ~5-10fps → Spielzeit läuft in Zeitlupe
  (dt-Clamp) und In-Game-Ping wirkt aufgebläht (Main-Thread render-busy). Reine
  DataChannel-RTT gemessen: **0.5–1.3ms** (median 0.9ms, Loopback).

### Verifikation Multiplayer (ohne 2 Menschen) — REZEPT (funktioniert, 2026-07-11)
Playwright, EIN Browser, 2 Pages im SELBEN Context (BroadcastChannel!), URL mit `?mp=local`:
Page A `#startOnline`→`#mpMakeBtn`→Code aus `#mpCode`; Page B `#mpJoinBtn`→4×`.codeIn` tippen
(Auto-Join). Beide `window.__nd.s().running` abwarten, dann: Gegner-Spiegel (`enemies` Host ==
`mirrors` Client), Bewegungs-Sync beide Richtungen (Taste halten → Positions-Diff im Debug-Griff),
`#ping`-Text, Page B schliessen → `#netLost`-Overlay + `#netAiBtn` → KI übernimmt.
Launch-Args gegen Hintergrund-Throttling: `--disable-background-timer-throttling
--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`. Viewport klein
halten (640×440), Wartezeiten großzügig (SwiftShader-Zeitlupe). Fertiges Skript-Muster:
Scratchpad `mp_test.cjs` der Koop-Session (Server-Port 8794).

### Phase 2b — Blender-Charakter (User 2026-07-10: „mit Blender, Charakter muss einzigartig sein")
**Blender 4.0.2 ist im Container installiert** (`/usr/bin/blender`, headless nutzbar!). Auftrag:
- [ ] Einzigartigen aban-Arcade-Helden prozedural in Blender bauen (bpy-Python-Skript ins Repo:
      spiele-dev/blender_hero.py — Low-Poly-Neon-Wesen, markante Silhouette, emissive Akzente)
- [ ] Export als .glb (Draco aus — three.js r128 GLTFLoader lädt plain GLB), Ziel < 200 KB
- [ ] In neon-realm als Spielfigur einbinden (GLTFLoader statt prozeduraler Mesh), dann weitere Spiele
- [ ] Loop je Iteration: blender -b -P blender_hero.py → GLB → game_shot → Screenshot ansehen
      (+ optional Gemini-Vision, Key im Sessionverlauf). „YouTube-Lernen" = Technik-Recherche via
      WebSearch (Low-Poly-Character-Workflows), Video-Ansehen geht nicht.

### Phase 2c — Landschafts-Upgrade (User 2026-07-10: „Hintergrundlandschaft mega gut — Meshy Grundsachen, Blender Polish")
- Pipeline: Meshy (Text-to-3D, braucht **MESHY_KEY vom User — fehlt in Session!**) für Basis-Meshes
  → Blender-Polish (decimate, Emissive, Materialien) → models/*.glb (<500 KB) → GLTFLoader.
- Ohne Meshy-Key: rein prozedural via Blender (läuft — spiele-dev/blender_landscape.py, Pilot neon-realm).
- [ ] Pilot neon-realm (Agent läuft 10.07.), dann: neon-flug (Horizont), neon-racer (Streckenrand),
      neon-survivor (Bergring ersetzen), je mit Shot-Verifikation.

### 🔑 DEPLOY-FAKTEN (2026-07-11, teuer gelernt — NIE wieder suchen)
- Cloudflare Pages deployt **AUTOMATISCH bei jedem Push auf main** (Git-Anbindung, Build:
  `bash build-pages.sh`, Output `_site/`) — **kein wrangler, kein GitHub Actions nötig.**
- **Live-Check-Falle:** `.html`-URLs liefern **308-Redirect** (Extension-Strip) → immer
  `curl -sL` (mit -L!) prüfen, sonst 0-Byte-Body und falscher „nicht live"-Alarm.
- Rollout-Stand: neon-flug/racer/survivor haben Landschaft+HUD-Muster (PR #1684, live
  verifiziert). Neue GLBs: landscape_flug.glb (Korridor+Parallax), landscape_survivor.glb.

### ✅ 2026-07-11: neon-realm-Komplettausbau GEMERGT (PR #1682) — Runden 2–4 alle umgesetzt
Meshy-Held (9 Clips) + Klassenwahl (Held/Magier/Ranger/Titan + Boni) + 5 Monster in Zonen +
Skills R/F/C/V + Klassen-Signaturen + Level-Up-FX + Rudel/Wellen (Cap 22) + 3 Detail-Häuser +
Mensch-NPCs + 1447 Vegetation + Tasten-Prompts + HUD ≥16px. Meshy: 482/1690 Credits verbraucht.
Assets in models/: hero.glb, hero_meshy(.glb/_combat.glb), class_{mage,ranger,titan}.glb,
monster_{slime,wisp,panther,golem,guardian}.glb, building_{fachwerk,turm,werkstatt}.glb,
nature_pack.glb, landscape_realm.glb. NÄCHSTER SCHRITT: Rollout auf neon-flug/racer/survivor
(Landschaft + HUD-Lesbarkeits-Muster), dann Arcade-Shell Phase 1, dann Phase 3 Koop.

### User-Feedback 2026-07-10 (nach Landschafts-Review) — NÄCHSTE SCHRITTE neon-realm
- [ ] **Schrift & Symbole grösser** (User: „besser lesen") — HUD/Quest-Panel/Steuerleiste skalieren,
      min. 16px mobil, Symbole deutlicher; gilt als Muster danach für ALLE Spiele (Design-Regel!)
- [ ] **Boden verbessern** (User) — Dorf-/Weltboden: Farb-/Helligkeitsvariation, Pfade, dezente
      Glow-Flecken statt flacher dunkler Platte (an Vision-Befund „Terrain beleben" andocken)
- [x] „Profi für online": Phase 3 (WebRTC-Koop) — Pilot neon-duo LIVE (2026-07-11, s. Phase-3-Block)

### User-Feedback 2026-07-10 (Runde 2 — „geiler Skill, mach besser als andere Spiele")
- [ ] **Charaktere wie Menschen + Bewegung**: menschenähnliche Low-Poly-Figuren (Kopf/Rumpf/Arme/Beine)
      MIT Blender-Rig + Animationen (idle/walk) → GLB mit Animations-Tracks → three.js AnimationMixer,
      Walk-Anim an Bewegungsgeschwindigkeit gekoppelt. Pipeline: spiele-dev/blender_hero.py → models/hero.glb.
      Gilt für Spieler UND NPCs (NPCs mind. idle-Bewegung).
- [ ] **Bäume detaillierter + verschieden**: 3+ Baum-Varianten (Stamm + mehrlagige Krone, Neon-Ton),
      via Blender → models/nature_pack.glb (benannte Objekte für Instancing).
- [ ] **Alles lebhafter — Rasen, Blumen, Gebüsche**: Gras-Büschel/Blumen/Büsche als instanzierte
      Low-Poly-Meshes verstreut (InstancedMesh, Performance!), dezentes Wind-Wackeln (Shader/Vertex).
- [ ] **Tasten-Anzeige**: kontextuelle Prompts im Spiel („E drücken" über NPC/Tür/Item, mobil: Tap-Symbol),
      + Steuerungs-Legende sichtbar; wird Muster für alle Spiele.
- Recherche-Auftrag (User: „im YouTube und Netz sind viele Tipps"): vor jedem Baustein WebSearch nach
  Low-Poly-/Blender-Python-/three.js-Best-Practices, Erkenntnisse hier eintragen.

### User-Feedback 2026-07-10 (Runde 3 — „das sieht nice aus, mach weiter und mehr, mit Liebe")
- [ ] **Kampf-Animationen** (User: „kämpfen animation gut, attacke auch super animation"): Meshy-
      Bewegungsbibliothek auf dem gerigten hero_meshy (Rigging-Task 019f4e41-19a0-7ec9-ba2e-aa412560c362):
      attack/slash, skill/cast, dodge, hit-reaction (+ ggf. death) → models/hero_meshy_combat.glb,
      im Spiel: Space-Angriff spielt attack-Clip, Q-Puls spielt cast, Shift-Ausweichen dodge.
- [ ] **Klassen-Charaktere** (User: „mache verschiedene auch für andere Klassen"): 2–3 weitere
      Meshy-Helden im selben Stil (Magier mit Stab, Waldläufer/Bogen, schwerer Titan/Schild) je mit
      idle/walk/run/attack → models/class_*.glb; später Klassenwahl im Startmenü.
- [ ] **Blender-Glättung** (User: „glätte alles mit blender?"): im Polish-Pass Shade-Smooth/Normals
      prüfen, harte Kanten nur wo gewollt.
- Meshy-Verbrauch bisher: 167/1690 Credits (Hero 117 + Häuser 50). Plan: Klassen ~150/Stk, Anims ~3/Stk.
- [x] **Monster-Modelle FERTIG** (User: „viele verschiedene monster einzigartige"): 5 GLBs in models/ —
      monster_slime (0.8, statisch→prozedural hüpfen), monster_wisp (0.9 schwebend, idle/walk/attack),
      monster_panther (1.2, statisch→prozedural schleichen; Meshy-Rigging ist humanoid-only, 422 bei
      Vierbeiner/Blob = normal), monster_golem (2.2, idle/walk/attack Ground-Slam), monster_guardian
      (2.8 Mini-Boss, Triple-Combo; ⚠️ attack hat Root-Motion → Phase 0.4–0.9 nutzen). 209 Credits.
- [ ] Monster-INTEGRATION in neon-realm (Pass 3): Kegel-Gegner ersetzen, Zonen: Slime=Start,
      Wisp=Wald, Panther=Pfade, Golem=Berge, Guardian=Verlies-Boss; prozedurale Anims für
      Slime (Squash&Stretch-Hüpfen) + Panther (Duck-Wippen, Sprung-Tween).
- [ ] Klassenwahl im Startmenü (Pass 3): Held/Magier/Ranger/Titan, Wahl in localStorage.

### User-Feedback 2026-07-11 (Runde 10 — Survivor-Bau-Modus + neon-realm Kamera-Bug)
- [ ] **neon-survivor: Aufbauen/Bauen** (User-Wunsch „survival aufbauen bauen und so"):
      Bau-Phase zwischen Wellen — Kills geben 🔩 Schrott, damit baut man: Mauer-Segmente
      (blocken Gegner, HP), Neon-Turm (schiesst automatisch), Falle (verlangsamt), Heil-Feld;
      Platzieren per Geister-Vorschau (Desktop Maus, mobil Tap+Bestätigen), Abriss = 50% zurück,
      Cap (z.B. 12 Strukturen) für Performance/Balance; Strukturen überleben Wellen, Gegner
      greifen Mauern an. Save: Baubestand persistieren (defensiv).
- [ ] **neon-realm BUG (User-Screenshot vom Handy)**: Kamera steckt HINTER Hausdach — Spieler
      unsichtbar. Fix: Gebäude/grosse Deko zwischen Kamera und Spieler ausblenden/faden
      (Raycast Kamera→Spieler, material.opacity ~0.25 mit sanftem Übergang) ODER Kamera-
      Kollision (heranziehen). Zusätzlich prüfen: Screenshot zeigt ALTE Box-Häuser →
      GLB-Fallback auf dem Handy? (Netz/Fehler-Logging prüfen) oder Edge-Cache.

### User-Feedback 2026-07-11 (Runde 9 — „mehr Features und mehr mit Liebe machen")
Liebe-Paket Lebenspfad (mit B3/Runde-8 kombinierbar, jeweils klein aber fühlbar):
- [ ] **Jahreszeiten-Metapher**: Kapitel-Stimmung wandert Frühling (Kindheit) → Sommer → Herbst →
      Winter (Lebensabend): Bodentöne, Deko (Blüten→Laub→Schnee), Licht — die Welt altert mit.
- [ ] **Haustier läuft mit**: Hund trabt sichtbar hinter der Figur her (wedelt beim Warten),
      hüpft mit ins Auto.
- [ ] **Foto-Album**: grosse Momente (Hochzeit, Auto, Haus, Kind, Gabel-Wahl) als Polaroid-
      Schnappschüsse gesammelt → am Ende Teil der Biografie-Show (mit Spielernamen).
- [ ] **Meilenstein-Geburtstag**: Kerzen-Törtchen + „Alles Gute!"-Moment am Kapitelwechsel
      (verbindet sich mit dem Altern aus Runde 8).
- [ ] **Idle-Leben**: wartende Figuren schauen sich um, winken sich zu wenn nah, Vögel/
      Schmetterlinge landen gelegentlich auf Feldern.
- [ ] **Klang-Liebe**: sanfte Kapitel-Themen (Kindheit verspielt → Alter ruhig), Würfel-Klacker,
      Seiten-Rascheln beim Karten-Flip (alles dezent, OPT.music/sfx respektieren).

### User-Feedback 2026-07-11 (Runde 8 — Lebenspfad: Altern, Feld-Klarheit, Kamera, Spannung)
- [ ] **Charaktere altern von Kind bis alt** (Kern-Wunsch!): Look wandelt sich pro Kapitel —
      Kind (klein, grosser Kopf) → Teen → Erwachsen → Senior (grauer Haarton, Gehstock, leicht
      gebeugt); Übergang als kleine „Geburtstags"-Animation am Kapitel-Meilenstein (Konfetti +
      Figur wächst sichtbar). Picker-Wahl (Frau/Mann/Style/Hautton) bleibt in jeder Altersstufe
      erkennbar. „Gute Animation" = weiche Morph-/Scale-Übergänge, kein hartes Umschalten.
- [ ] **Farbige Felder: Bedeutung unklar** → GROSSE Icons auf jedem Feld (Emoji-Sprite deutlich
      grösser/zentriert), Farbe nur noch als Unterstützung; + Mini-Legende (aufklappbar ODER
      beim ersten Betreten je Feldtyp 1 Erklär-Toast). Felder ohne Bedeutung: entfernen/neutral.
- [ ] **Map scrollen/bewegen**: Drag/Swipe schwenkt die Kamera frei übers Brett (Grenzen ans
      Brett gebunden), loslassen/Zug-Start → sanft zurück zum aktiven Spieler; Pinch-Zoom mobil
      wenn einfach machbar.
- [ ] **Pixel-Fehler auf Feldern** (User sieht welche): gezielt untersuchen — Kandidaten:
      Z-Fighting Feld-Ring vs. Scheibe, Moiré auf Ring-Geometrie, Schatten-Akne; auf echtem
      Hochformat-Viewport reproduzieren und fixen.
- [ ] **„Zu langweilig — spannender machen"**: Drama-Paket — seltene Grossereignisse mit
      Fullscreen-Moment (💥 Jackpot, 🌪️ Wirbelsturm der 2 Spieler tauscht, 🎁 Mystery-Box),
      Near-Miss-Effekte, Kapitel-Finale mit Zwischenstands-Show („Wer führt?"), Sound-Stinger,
      Sieg-Zeremonie mit Podium + Biografie-Highlights.
- [ ] **Detail-Animationen**: Figuren hüpfen/laufen sichtbar von Feld zu Feld (Bounce mit Squash),
      3D-Würfel rollt echt, Jubel-/Trauer-Animation je nach Feld, Geld-Regen bei Gewinn,
      Karten flippen beim Aufdecken.
- [ ] **Mehr als Würfeln**: interaktive Stations-Events (Mini-Entscheidungen mit Timer,
      Glücksrad existiert — mehr Abwechslung: Quiz-Karte, Tausch-Event, Wettrennen-Feld).
- [ ] **Smiley-Fast-Chat** (wie neon-duo): 6 kindersichere Emotes als Sprechblasen — auch lokal.
- [ ] **Wie Plato-App**: Lebenspfad ONLINE spielbar machen via js/mp.js (Raum-Codes, 2 Spieler,
      Host-autoritativ Würfel/Karten; Lobby wie neon-duo) — Lebenspfad = 2. mp.js-Spiel.
- [ ] **Frau/Mann-Auswahl**: Charakterwahl beim Start (Frau/Mann + Hautton/Frisur/Accessoire,
      kombinierbar mit „jeder Charakter einzigartig" aus Runde 6).
- [ ] **Romantik-Feature (familienfreundlich — NICHT explizit, Entscheid 2026-07-11):** Heiraten
      an Kirchen-Station (Hochzeits-Animation: Herzen/Konfetti/💋), Partner-Figur, Kinder die
      im Auto mitfahren — klassisches Spiel-des-Lebens-Feature. Explizite Sex-Animationen sind
      abgelehnt (öffentliche, familienfreundliche Site — gilt dauerhaft).

### User-Feedback 2026-07-11 (Runde 6 — Multiplayer-Zusatz + Lebenspfad-Ausbau)
- [ ] **Multiplayer-Zusatzfeature** (neon-duo online): Quick-Chat/Emotes (vorgefertigte kinder-
      sichere Nachrichten + Emoji-Reaktionen über den Figuren, KEIN Freitext), Spielernamen aus
      abanArcade-Profil über den Figuren, Rematch-Button am Game-Over (beide bestätigen → neuer Run).
- [ ] **Lebenspfad: mehrere Wege** — Weggabelungen à la Spiel des Lebens (z.B. Studium-Route vs.
      Abenteuer-Route: länger/sicher vs. kurz/riskant), Wahl-UI am Gabelungs-Feld (2 grosse Buttons).
- [ ] **Lebenspfad: mehr Entscheidungen** — mehr Wahl-Karten an Stationen (Job/Haus/Hobby …),
      Konsequenzen sichtbar (Geld/Herzen/Wissen-Deltas).
- [ ] **Lebenspfad: Besitz-Anzeige** — Panel/Icons „was habe ich": Auto, Haus, Haustier, Job …
      (antippbar für Details); **wenn Auto gekauft → Spielfigur FÄHRT im Fahrzeug** (Figur sitzt
      in Low-Poly-Auto, Räder drehen beim Ziehen).
- [ ] **Lebenspfad: jeder Charakter einzigartig** — Rot/Blau (+KI) bekommen individuelle Figuren
      (Frisur/Hut/Accessoire/Farbe, nicht nur Umfärbung), Wahl beim Start.

### User-Feedback 2026-07-11 (Runde 5 — „attacken mehr polish, noch mehr attacken")
- [ ] **Mehr Attacken** (Meshy-Bibliothek auf Rigging-Task 019f4e41-…, ~3 Cr/Clip):
      3-Hit-Kombo (Space-Kette mit Timing-Fenster: attack→attack2→attack3), Charge-Attacke
      (Space halten → Glow-Aufladung → Burst), Dash-Attacke (Angriff während Roll),
      → models/hero_meshy_combat2.glb (alle Clips in einer Datei, Root-Motion ankern!).
- [ ] **Attacken-Polish** (Game-Feel): Hit-Stop 60–90ms bei Treffern, Einschlag-Partikel
      + Treffer-Blitz auf Gegnern, Schadenszahlen-Pop, kalibrierter Screen-Shake,
      Knockback spürbar, Swing-Trail am Helden.

### User-Feedback 2026-07-10 (Runde 4 — „level ups viele gegner, cooler skills etc")
- [ ] **Pass 4 Gameplay-Tiefe** (nach Pass 3, wieder nur neon-realm.html):
      (a) **Level-Ups spürbar**: satisfying Level-Up-Moment (Blitz/Ring-Effekt, Fanfare, „Level 5!"-
      Anzeige gross), pro Level klarer Zuwachs (HP/Schaden), alle 3–5 Level 1 neuer Skill-Unlock;
      (b) **Viele Gegner**: Spawn-Dichte rauf + kleine Rudel/Wellen (3–5 Slimes, Panther-Paare),
      Schwierigkeits-Kurve sanft (Design-Regel: erste 30s verzeihend!), Performance: Mixer-Update
      nur Kameranähe, gerigte Instanzen begrenzen, statische clonen;
      (c) **Coole Skills**: Skill-System (T) ausbauen — z.B. Nova-Puls (AoE-Ring), Ketten-Blitz,
      Dash-Schlag, Schild-Sphäre, Ultimate mit Cooldown + fettem Effekt; jede Klasse 1 Signature-
      Skill (Magier=Kettenblitz, Ranger=Pfeilregen, Titan=Bodenschlag, Held=Nova); Effekte
      partikelbasiert, Bloom-bewusst; Skills mit Symbol+Taste im HUD, mobil als Buttons.

## ⭐ OBERSTE DESIGN-REGEL (User 2026-07-10): „Müssen alle einfach zum Spielen sein"
Gilt für JEDE Spiele-Änderung, wird bei jedem Shot-Review mitgeprüft:
1. **Sofort losspielen**: max. 1 Klick/Tap bis ins Spiel; Steuerung in EINER Zeile mit Symbolen auf dem Startschirm
2. **Verzeihender Einstieg**: erste ~30 s kein Sofort-Tod, Schwierigkeit steigt sanft
3. **Ein-Daumen-tauglich** auf dem Handy, wo das Genre es erlaubt; Buttons ≥44 px
4. **Immer klar, was zu tun ist**: Ziel in einem Satz im HUD (Muster: neon-realm „Aufgaben"-Panel)
5. **Pause & Weiterspielen**: Esc/Button pausiert; Fortschritt/Highscore überlebt Reload (localStorage)
Shot-Review-Frage ab jetzt immer: „Würde ein 8-Jähriger ohne Erklärung loslegen können?"
