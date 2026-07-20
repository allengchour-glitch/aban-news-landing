# 🎨 Verschönerungs-Plan (53 Agenten Vision-Sweep · 2026-07-20)

# Umsetzungsplan Verschönerung — 12 Spielszenen

Priorisierung = Sichteffekt × Machbarkeit, nur safe/medium. Reihenfolge innerhalb der Dateien = Batch-Reihenfolge (eine Datei = ein Commit + Screenshot-Verify).

---

## 1) TOP-10 (gruppiert nach Datei)

### /home/user/aban-news-landing/neon-survivor.html

**#1 — Bloom-Diät + Struktur-Farbidentität** (high|safe — heilt lt. Kritik ~80% der Szene, reine Konstanten)
- Z.1530: `threshold:{value:0.72}` → `0.80`; Z.1532: `strength:{value:0.7}` → `0.55`.
- Z.1088 (in `makeStruct`, Traverse mit Kommentar "Bloom nicht ausblasen"): `emissiveIntensity=0.7` → `0.4`.
- Akzentfarben sättigen: Z.1047 `0xd8ffff`→`0x5ef2ff`, Z.1054 `0xe6ffe6`→`0x8dffb8`, Z.1060 `0xfff0a0`→`0xffd166`, Z.1075 **und** Z.1080 `0xdff0ff`→`0x9cc8ff` (bewusst beide Vorkommen: Core + Satelliten, konsistent).
- Verify: `desk_structs_close`-Shot nachstellen; falls Gesamtbild zu dunkel: Ambient Z.263 von 1.0 → 1.1 nachziehen.

### /home/user/aban-news-landing/neon-flug.html

**#2 — Burst-Partikel: trailTex-Map statt grauer Quadrate** (high|safe — größter Gewinn pro Zeile im ganzen Projekt)
- Z.252 in `burst()`: PointsMaterial ergänzen um `map:trailTex` und `size:0.5`→`0.6`. Sonst nichts. trailTex (Z.155) ist top-level und wird von 3 anderen Materials bereits geteilt; Cleanup disposed kein Material — kein Risiko.

**#3 — Säulen: Neon-Kanten + dunklerer Kern** (high|safe)
- Z.222ff `pillar()`: Basisfarbe `0x222a55`→`0x10152e`, emissiveIntensity bei .55 LASSEN.
- Pro Säule nach Berg-Muster (Z.194-195): `var ec=COLORS[(Math.random()*COLORS.length)|0];` als emissive setzen und `m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), lineMat(ec)))` — geteiltes `LineBasicMaterial({color:ec,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending})` pro Farbe cachen statt 14 Instanzen.
- Den mitvorgeschlagenen AmbientLight-Drop 1.1→0.7 hier NICHT mitmachen (siehe Abschnitt 3).

### /home/user/aban-news-landing/neon-dungeon.html

**#4 — Mobile-Bug bossBar/Stage-Pill-Overlap** (high|safe — echter, live belegter Bug, zuerst fixen)
- Ursache verifiziert: @media(max-width:430px)-Regel steht in Z.22 VOR der Basis-Regel Z.23 → toter Code (gleiche Spezifität).
- Fix: kompletten `@media(max-width:430px){...}`-Block hinter Z.23 (ans Ende des Style-Blocks, vor Z.52) verschieben. Falls Selektor-Variante: `#hud #bossBar` (Container ist `#hud`, NICHT `#ui`).
- Verify auf 390×780 UND 900×600.

**#5 — Vordere Boss-Pfeiler zu Ruinen-Stümpfen kappen** (high|safe)
- Z.183 im 14er-Loop: `var front=Math.sin(wa)>0.45; var h=front?2.0:7;` → CylinderGeometry(0.55,0.75,`h`,6); Z.184: hartkodiertes `y=3.5` auf `h/2` ändern (Pflicht!).
- Optional je Stumpf 1 Schutt-Box (0.5³, wallM, feste Rotation). Trifft exakt die 4 kameraseitigen Pfeiler (wi=2..5), Ring bleibt hinten geschlossen.

**#6 — Texel-Dichte vereinheitlichen + Kammerboden auf Cobble** (high|safe)
- Z.118: `STONE_M` mit tex_stone repeat 4,4 anlegen; in `plat()` Z.124: `mat||(w<=3.5?STONE:STONE_M)`.
- Z.176: Call-Site ändern zu `plat(0,0,CHZ,26,26,COBBLE_FLOOR)` mit `MT(0x38305e,cobT)` — dabei das bereits geladene, ungenutzte `cobT` wiederverwenden und `cobT.repeat.set(14,14)`. STONE2 global NICHT anfassen (wird für Fels-Unterbau genutzt, Z.127).
- STONE-Farbe `0x645a8c`→`0x7a70a2` (Lambert map*color, Textur säuft sonst ab).

**#7 — Enrage-Rot wirklich kippen (Boss-Kampf)** (high|safe)
- Z.98: `_ambBoss` `0x3a1a24`→`0x4a201c`; dort `_fogBoss=new THREE.Color(0x160a10)`, `_fogBase=new THREE.Color(0x0a0812)` definieren.
- Unter Z.413 (amb-Lerp): `scene.fog.color.lerp(bossOn?_fogBoss:_fogBase,Math.min(1,dt*1.2)); scene.background.lerp(...)` analog.
- Z.417: bestehende Zeile `upLight.intensity=1.2+Math.sin(t*8)*0.4` ERSETZEN durch `upLight.intensity=1.2+0.6*_cp2` (synchron zu den Brust-Rissen, kein neuer Puls-Code).

### /home/user/aban-news-landing/neon-zusammen.html (Tempel)

**#8 — Seitenwand-Repeat fixen (Mauerwerk statt Schmier-Gradient)** (high|safe — größter Einzelgewinn pro Zeile im Tempel)
- Z.106: `var WALL_LONG=MT(0x5a6157,gtex("/textures/tex_stone.png",20,1.4));` (EIN Wandton: 0x5a6157, wärmer/heller als Boden).
- Z.110: beide Seitenwand-`box(±10.4,...,72,...)` auf WALL_LONG umstellen; WALL für die Rückwand Z.111 behalten, dessen Repeat auf ~6×1.4 anheben.

**#9 — Raum-Farbwelten: Fackelfarben + Schwellen-Streifen** (high|safe)
- Z.114-118: `torch(x,z)` → `torch(x,z,col)`; col in Flammen-Material `M(col,col,1)` und `PointLight(col,0.6,8)` durchreichen (keine neuen Lichter, nur Umfärbung der 6 vorhandenen).
- Z.119: Aufrufe raumweise färben — Raum 1 (z=-4) beidseitig 0xffa040; Raum 2 (z=-26) x=-9 → 0xff6a28 (Feuer), x=9 → 0x38c8ff (Wasser); Raum 3 (z=-48) 0xc9a0ff.
- Vor jedem Tor Schwellen-Streifen: `box(0,0.02,zTor+1.1,19,0.05,0.5,M(c,c,0.7))`, Raum-2-Variante als zwei 9.5er-Boxen bei x=±4.75 (0xff6a28 | 0x38c8ff). KEIN solid-Flag.

### /home/user/aban-news-landing/neon-jump.html

**#10 — Stacheln als Gefahr lesbar (Farbsprache reparieren)** (high|safe — Gameplay-relevant: Weiß darf nicht gleichzeitig Tod und Belohnung heißen)
- Z.344 spikes-forEach: `ConeGeometry(0.34,0.95,4)` (Höhe alternieren `k%2?0.95:0.8`, deterministisch), Material `mat(0xff2030,0xff2030,0.45)` — Emissive UNTER Bloom-Schwelle 0.78.
- y um `(h-0.7)/2` anheben (Kegel wächst sonst nach unten).
- Sockelleiste pro Feld: `roundedBoxGeo(sp[2]+0.4,0.22,1.5,0.08)` in `matS(0x2a0713,0xff2030,0.22)` bei y=sp[1]-0.45; nach Einbau prüfen, ob sie in der Plattform (Tiefe 3) versinkt → ggf. Tiefe 3.2.

**#11 — Hintergrund-Tonwert-Rampe umdrehen (nah=dunkel, fern=hell)** (high|safe, 3 Konstanten)
- Z.192 hillsB (nah, z=-95): `mat(0x100823,0x1a0e38,0.16)`.
- hillsA (fern, z=-150): emissive `0x2c1e52`, ei 0.5.
- Skyline NUR via Turmhöhe: Z.216-218 `bh3` von `6+rnd*24` auf `14+rnd*26`. Variante "Türme auf z=-135 vorziehen" verboten (Fensterstreifen-z hartkodiert -123.4).
- Screenshot-Gegencheck hillsB gegen Fog 0x0d0930; optional Palmenwedel (Z.224) mit abdunkeln.

### /home/user/aban-news-landing/neon-wildnis.html

**#12 — Nacht-Vignette kühl-blau + viewport-relativ** (high|safe — Rot bleibt exklusiv Gefahrensignal)
- Z.111 `#nightVig`: box-shadow ersetzen durch `inset 0 0 18vmin 5vmin rgba(14,10,52,.60), inset 0 0 8vmin 2vmin rgba(0,0,24,.5)`.
- Z.3922 in updDayNight: Opacity-Amplitude auf `0.42+Math.sin(perfNow*0.004)*0.07`.
- Optionale Boss-Rot-Klasse: eigene billige `monsters[].boss`-Prüfung in updDayNight — NICHT `_boss` referenzieren (lokal in updMusic).

*(Ja, das sind 12 Punkte — #4 ist ein Bugfix, kein Beauty-Item, und #2/#3 bzw. #8/#9 laufen je als ein Datei-Batch. Effektiv 10 Beauty-Hebel in 6 Dateien.)*

**Welle 2 (gut, aber nach den obigen):** Racer-Asphalt-Textur (Z.249, `t.encoding=THREE.sRGBEncoding` Pflicht!), Wildnis Gras-Wrap-Teppich (Z.496/546, Flora-Teil braucht eigenes _floraBase-Array), Racer FOV-Fix (Z.615, Funktion heißt `emitSpark`, Streaks mobil halbieren), Lebenspfad Fork-Inszenierung (Z.2053/4067), Wildnis-Nacht Grundlicht senken + Fackel-Flicker (Z.3934/3854, `g.userData.flameF=fl` in Z.3065 ergänzen), Jump-Feder (`pl.spring?0.25:0.42` als Ternary!), Survivor-Boden-Asphalt (Z.283/281/413).

---

## 2) Umsetzungs-Regeln für alle Punkte

- Pro Datei: Branch-Edit → Screenshot-Loop (900×600 + 390×780, gleiche Kamerapositionen wie Beauty-Shots) → Vorher/Nachher-Vergleich → Commit.
- Wildnis-Regeln beachten: kein `rnd()`-Konsum zur Laufzeit verändern, kein neues Licht ins Budget, Lambert bleibt. Alle TOP-Punkte oben erfüllen das bereits.
- three r128: `encoding` statt `colorSpace`, `texture.clone()` braucht `needsUpdate=true`.

---

## 3) Was NICHT tun

**Risky-skip / kaputt as-is:**
- **wildnis-hub Blüten-Dorfmaske** wie vorgeschlagen: `villages[]` ist zum Blumen-Zeitpunkt LEER (buildAmbient läuft vor decorateWorld) → der Check wäre ein No-op ohne jeden Sichteffekt. Nur in der Alternativ-Variante (Slots merken, nach _vc-Draw verstecken) und als eigener PR.
- **wildnis-see-dorf Krater-Seen**: hoher Effekt, aber vier verifizierte Zusatzfallen (VF-Falle mobil, shared-rnd-Disziplin über 30+ Calls, keine Dorf-Kollisionsprüfung, grobes 6.7u-Grid) — nicht in den Politur-Batch, sondern eigener PR mit Teleport-Screenshot-Loop; der abhängige Ufer/Wasser-Punkt wartet mit.
- **wildnis-nacht Monster-emissive-Anhebung**: kollidiert mit Hit-Flash-Cache `e._fl` und Enrage, Klon-Mobs TEILEN Proto-Materialien — nur der Ring-Decal-Teil ist sicher (mit Scale-Kompensation + beiden Spawn-Pfaden), der Emissive-Teil entfällt.
- **survivor Ring-Salat-Mechanik (b)** wie vorgeschlagen: beide Opacities werden BEREITS pro Frame in updateBuildRuntime überschrieben — ein zweiter Writer kämpft mit den Formeln. Falls umgesetzt: Phasenfaktor `ph=(S.buildPhase==="build")?1:0.35` an die bestehenden Formeln Z.1228/1233 multiplizieren, shieldFlash-Zweig ungedimmt.
- **lebenspfad Blumen-Streu-Pass (b)**: Prämisse falsch — ein kompletter Wegesrand-Deko-Pass inkl. Blumen-Tupfer existiert bereits (Z.2704-2804); ein zweiter Pass doppelt und erzeugt Clutter. Nur Teil (a) Pfadband-Entblenden ist sinnvoll.
- **wildnis-feld Abendlicht (b)**: bereits implementiert (Z.3928-3936, Konstante bewusst auf warm*0.55 getunt) — ein zweiter Lerp würde doppelt tinten und den Boden matschig machen; höchstens 0.55→0.65 anheben.
- **jump Skyline-Variante B** (Türme vorziehen): zerstört die hartkodierten Fensterstreifen.

**Fein-getunte Systeme nicht anfassen (Stilbruch-/Regressionsrisiko):**
- **flug AmbientLight 1.1→0.7** als Beifang: hängt an Wände-, GLB-Rock- und Gleiter-Tuning — wenn, dann separat, erst 1.1→0.9, mit Sichtcheck.
- **hub warmCobble-Bake**: hoher Effekt, aber der Vorschlag hat zwei verifizierte Bugs (async TEXLOADER → Bake läuft nie → schwarze Wege; colorSpace-No-op auf r128) und 5 Cobble-Callsites inkl. cbAll — nur als sorgfältiger eigener Patch (Bake in onLoad, `t2.encoding=t.encoding`, ALLE Flächen konsistent), nicht im Schnell-Batch.
- **wildnis Kamera-Pitch (Horizont)**: "bei Zoom≤1 ändert sich fast nichts" stimmt nicht (pow hebt Nah-Kamera ~18%) — nur mit Blend ab Zoom>1.2, eigener PR.

**Geschmack / zu geringer Hebel:**
- Racer Grid-/Gras-Kegel-Politur (low-Effekt, erst wenn Himmel/Asphalt sitzen).
- Jump Checkpoint-Fahne: NUR Inaktiv-Farbe Z.348 tauschen — die komplette Aktiv-Logik (Grün + Burst) existiert schon; 0x6aff9e beibehalten, nicht 0x39ff9e.
- Lebenspfad Kamera-Absenkung: lohnend, aber drei synchron zu ändernde Stellen (2905/2912/3914) + Hochformat-Risiko — Welle 2 mit Pflicht-Screenshots.

---

## 4) Was schon gut ist (nicht anfassen)

- **dungeon-parcours**: Edge-Glow-Kanten, Staub-Motes, Checkpoint-Inszenierung, Deko-Ritter, Kammer-Pfeiler-Textur (repeat 1×3) — Referenz-Niveau.
- **dungeon-boss**: KOLOSS-Modell (tex_stone, Brust-Risse, Faust-Kristalle), Rise-Kamera, Stampf-Telegraph.
- **tempel**: GLB-Figuren mit Element-Auren, Gem-Animationen, Gleichklang-Ringe, Announce-Typo, HUD.
- **flug**: Shader-Grid-Boden, Wireframe-Berge, Biom-Fog-Wechsel — Fundament steht, nur Säulen/Partikel/Himmel fehlen.
- **racer**: Curbs, Schulter-Deko (Bäume/Büsche/Kugelbäume), Kart-Glow.
- **jump**: Menü + Startmoment ("wie ein fertiges Produkt"), Retro-Sonne, Grid, Chibi-Figuren.
- **survivor**: Hintergrund komplett (Retro-Sonne, Berge, Vignette+Grain, Bau-Menü) — Problem ist ausschließlich der Vordergrund-Weißclip.
- **lebenspfad**: gesamte Spielzeug-Pastell-Identität, Felder-Discs, HUD-Spielerkarten, Mobile-Layout.
- **wildnis-hub**: Häuser-Typen-Vielfalt, Dachlandschaft/Silhouette, Schmiede-/Tavernen-Licht, Wimpel.
- **wildnis allgemein**: Schatten-Verankerung, Baum-Silhouetten, Pilzbaum, Wegenetz, HUD; Account-fürs-Ganze: Mondlicht-Basisfarben der Nacht sind richtig gewählt — nur Intensität/Vignette justieren, Palette lassen.
