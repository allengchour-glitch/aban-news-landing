# Traumhaus Asset-Lieferung `th5_*` — Übergabe an die Spiel-Session

**Rollenteilung (User-Auftrag):** Diese Session liefert **nur Assets** (3D-Modelle + Texturen).
Der Einbau ins Spiel (`traumhaus.html`) liegt bei der anderen Session.

Alles ist **fertig einsetzbar**, CC0/eigenproduziert, keine externen Abhängigkeiten.

---

## 1. Modelle (`models/th5_*.glb`)

GLB für three.js, dazu STL als Referenz/Weiterbearbeitung in `models/stl/`.

| Datei | Was | Maße (B×T×H) | Hinweis |
|---|---|---|---|
| `th5_telefonzelle.glb` | Rote Telefonzelle | 1,05 × 1,05 × 2,7 | Tür/Apparat auf −z |
| `th5_bushaltestelle.glb` | Wartehäuschen mit Bank | 4,2 × 1,4 × 2,5 | Rückwand +z, Schild rechts |
| `th5_parkbrunnen.glb` | Brunnen mit Schale | ⌀ 3,8 × 2,2 | Wasserfläche y≈0,5 |
| `th5_laterne_altstadt.glb` | Gusslaterne | ⌀ 0,7 × 4,5 | Leuchtkorpus y≈3,95 |
| `th5_baum_ahorn.glb` | Laubbaum, breite Krone | ⌀ 3,6 × 4,7 | 5 Kronenballen |
| `th5_baum_pappel.glb` | Säulenpappel, schmal | ⌀ 2,0 × 7,0 | für Alleen |
| `th5_parkbank.glb` | Bank mit Gusswangen | 1,75 × 0,62 × 0,9 | Sitzhöhe **0,45** |
| `th5_marktstand.glb` | Marktstand mit Markise | 3,2 × 1,7 × 2,2 | Theke y≈0,92, Kunden auf −z |
| `th5_poller.glb` | 4er-Pollerreihe | 3,6 × 0,26 × 1,05 | Abstand 1,2 |
| `th5_ortsschild.glb` | Ortsschild am Mast | 1,9 × 0,06 × 2,4 | Tafel leer → beschriftbar |

**Konventionen:** Ursprung mittig, **Unterkante exakt auf y = 0** (kein Versenken nötig),
Maße in Metern, **+z = Vorderseite/Schauseite**, Materialien als PBR (Base Color + Roughness).

### Einbau (bestehendes `bau()` in traumhaus.html)
```js
// bau(datei, zielHoehe, x, y, z, rotY, center)
bau("th5_parkbank.glb",      0.9,  12, 0, 52,  Math.PI, false);
bau("th5_laterne_altstadt.glb", 4.5, -30, 0, 52, 0,      false);
bau("th5_baum_pappel.glb",   7.0, -44, 0, 60,  0,        false);
```
Sitzhöhe der Bank für NPC-Posen: **0,45** (Schwarm-Befund „NPC steckt in der Bank").

---

## 1b. Charge 2 — Riesenstadt (`models/th6_*.glb`)

Verkehr, Stadtmobiliar und Grün. Gleiche Konventionen (y=0, Meter, +z Schauseite),
alle mit **Bevel + Auto-Smooth** — keine harten Kanten.

| Datei | Was | Maße (B×T×H) | Hinweis |
|---|---|---|---|
| `th6_ampel.glb` | Ampel mit 3 Linsen + Blenden | 0,5 × 0,5 × 4,5 | Linsen auf −z, rote Linse emissiv |
| `th6_schild_stop.glb` | Stopschild achteckig | 0,85 × 0,1 × 2,4 | Schildfläche auf −z |
| `th6_hydrant.glb` | Hydrant mit Abgängen | 0,45 × 0,45 × 1,0 | |
| `th6_pylonen.glb` | 3 Leitkegel in Reihe | 2,0 × 0,45 × 0,7 | Baustellen/Sperrung |
| `th6_litfasssaeule.glb` | Litfaßsäule mit Dach | ⌀ 1,3 × 2,9 | Plakatfläche umlaufend |
| `th6_papierkorb.glb` | Abfallkorb am Pfosten | 0,45 × 0,45 × 0,95 | |
| `th6_blumenkuebel.glb` | Kübel mit Blüten | ⌀ 0,95 × 0,9 | 2 Blütenfarben |
| `th6_stromkasten.glb` | Verteilerkasten | 0,95 × 0,55 × 1,3 | Tür auf −z |
| `th6_muellcontainer.glb` | Container auf Rollen | 1,4 × 0,95 × 1,25 | |
| `th6_kiosk.glb` | Zeitungskiosk | 2,9 × 2,3 × 2,8 | Verkaufsfenster + Auslage auf −z |
| `th6_billboard.glb` | Werbetafel mit Strahlern | 4,3 × 0,5 × 4,6 | Plakatfläche auf −z, frei bespielbar |
| `th6_fichte.glb` | Nadelbaum, 4 Etagen | ⌀ 2,7 × 4,8 | Kontrast zu den Laubbäumen |
| `th6_hecke_modul.glb` | Heckenstück, aneinanderreihbar | 2,4 × 0,7 × 1,25 | **modular**: Abstand 2,4 = fugenlos |
| `th6_brunnen_trog.glb` | Wandbrunnen mit Trog | 2,2 × 0,9 × 1,3 | Wasserfläche y≈0,52 |

Generator: `tools/assets/mk_th6_stadt.py`

### Modular bauen
`th6_hecke_modul` im Raster **2,4** aneinanderreihen → durchgehende Hecke ohne Fuge.
`th6_pylonen` und `th6_poller` (th5) eignen sich als Absperr-Bausteine.

---

## 1c. Charge 3 — MODULARE Gebäude + Fahrzeuge (`models/th7_*.glb`)

Mit diesen Modulen baut man **ganze Viertel aus wenigen Teilen**. Modultest gerendert:
gestapelt/aneinandergereiht entstehen fugenlose Türme und Zeilen.

| Datei | Was | Maße (B×T×H) | Modul-Raster |
|---|---|---|---|
| `th7_hochhaus_modul.glb` | Turm-Segment, Fensterbänder + Gesimse | 8,2 × 8,2 × **6,0** | **stapeln: y += 6** |
| `th7_hochhaus_dach.glb` | Turmabschluss: Attika, Technik, Antenne | 8,3 × 8,3 × 3,6 | oben aufsetzen |
| `th7_reihenhaus_modul.glb` | Stadthaus mit Satteldach + Haustür | **6,0** × 7,5 × 8,2 | **reihen: x += 6** |
| `th7_parkhaus.glb` | 3 offene Decks, Stützen, Rampe | 16,2 × 11,2 × 9,8 | frei |
| `th7_lagerhalle.glb` | Tonnendach, 2 Rolltore, Laderampe | 20,4 × 12,4 × 9,0 | frei |
| `th7_bruecke_modul.glb` | Straßenbrücke mit Brüstung + Pfeilern | **14,0** × 9,0 × 5,1 | **reihen: x += 14** |
| `th7_lieferwagen.glb` | Transporter (parkend) | 2,2 × 4,6 × 2,5 | Front auf −z |
| `th7_lkw.glb` | Sattelzug (parkend) | 2,5 × 10,5 × 3,7 | Front auf −z |
| `th7_taxi.glb` | Taxi mit Dachschild | 1,9 × 4,3 × 1,7 | Front auf −z |
| `th7_denkmal.glb` | Denkmal auf Stufensockel | 3,0 × 3,0 × 5,3 | Platzmitte |

Generator: `tools/assets/mk_th7_gebaeude.py`

### So baut man einen Turm
```js
for (var e = 0; e < 5; e++) bau("th7_hochhaus_modul.glb", 6.0, x, e*6, z, 0, false);
bau("th7_hochhaus_dach.glb", 3.6, x, 30, z, 0, false);   // 5*6 = 30
```
### So baut man eine Zeile
```js
for (var i = 0; i < 6; i++) bau("th7_reihenhaus_modul.glb", 8.2, x0 + i*6, 0, z, rot, false);
```
Fassaden-Texturen aus `textures/th6/` (`glasfassade`, `betonfassade`) passen maßstäblich dazu.

---

## 2. Texturen (`textures/th5/*.png`)

512×512, **nahtlos kachelbar** (Wrap-Arithmetik, verifiziert per 2×2-Kachel-Kontaktbogen).

| Datei | Motiv | Empfohlenes `repeat` |
|---|---|---|
| `kopfstein.png` | Pflastersteine, versetzt | 6–10 pro 20 m |
| `dachziegel.png` | Ziegeldach rot | 3–5 pro Dachfläche |
| `beton_platten.png` | Betonplatten mit Fugen | 4–8 pro 20 m |
| `holzdielen.png` | Dielen mit Maserung | 2–4 pro Fläche |
| `riffelblech.png` | Metall-Riffelblech | 2–4 |
| `backstein_alt.png` | Backstein mit Mörtel | 3–6 |
| `kies.png` | Schotter (Voronoi-Steinchen) | 8–14 pro 20 m |
| `wiese_satt.png` | Sattes Gras mit Variation | 20–30 pro 100 m |

### Einbau (bestehendes `ladeTex()`)
```js
ladeTex("textures/th5/kopfstein.png", 8, 8, function(t){ mat.map = t; mat.needsUpdate = true; });
```

### Charge 2 — Riesenstadt (`textures/th6/*.png`)

| Datei | Motiv | Empfohlenes `repeat` | Wofür |
|---|---|---|---|
| `glasfassade.png` | Glasraster, Scheiben getönt | 1 pro 3 Etagen | **Downtown-Hochhäuser** |
| `betonfassade.png` | Beton mit Fensterraster + Sims | 1 pro 3 Etagen | Wohnblöcke, Bürobauten |
| `asphalt.png` | Feine Fahrbahnkörnung | 8–14 pro 20 m | Straßen, Parkplätze |
| `dachpappe.png` | Bahnen mit Kanten | 3–6 | Flachdächer |
| `marmor.png` | Adern, hell | 1–2 | Rathaus, Foyers, Denkmäler |
| `metallgitter.png` | Feines Gitter | 4–8 | Zäune, Roste, Geländer |
| `acker.png` | Furchen | 4–8 | Bauernhof, Felder |
| `sand.png` | Wellen | 6–12 | Strand, Seeufer, Spielplatz |

Generator: `tools/assets/mk_th6_texturen.py`

**Fassaden-Tipp:** `glasfassade`/`betonfassade` mit `repeat.set(1, etagen/3)` auf die
Turmkörper legen — dann sitzt das Fensterraster maßstäblich, ohne Geometrie zu ändern.

---

## 3. Nachschub produzieren

Die Generatoren liegen in `tools/assets/`:

```bash
python3 tools/assets/mk_th5_modelle.py    # Modelle -> models/th5_*.glb + models/stl/
python3 tools/assets/mk_th5_texturen.py   # Texturen -> textures/th5/*.png
python3 tools/assets/mk_th6_stadt.py      # Riesenstadt-Modelle -> models/th6_*.glb
python3 tools/assets/mk_th6_texturen.py   # Fassaden/Belaege -> textures/th6/*.png
python3 tools/assets/mk_th7_gebaeude.py   # modulare Gebaeude+Fahrzeuge -> models/th7_*.glb
```

Beide brauchen nur **bpy 5.x + numpy** (im Container vorhanden, kein Blender-Binary nötig,
kein Netz). Neue Objekte: Funktion nach dem Muster der bestehenden ergänzen und in die
Liste am Dateiende eintragen — die Helfer `box/zyl/kugel/kegel/mat/export` nehmen die Arbeit ab.

**Wichtig bei Texturen:** `np.ix_` nur mit 1-D-Indizes verwenden (in `noise()` korrekt);
für 2-D-Indexraster direktes Fancy-Indexing `tint[iy, ix]` nutzen.

---

## 4. Qualitätssicherung

Beide Chargen wurden vor der Auslieferung gerendert und mit Augen geprüft:
- Modelle: gemeinsame three.js-Szene, alle 10 laden fehlerfrei, stehen aufrecht auf y=0
- Texturen: 2×2-Kachelung ohne sichtbare Naht; `kies` und `riffelblech` waren im ersten
  Wurf zu schwach (wolkig bzw. zu fein) und wurden nachgebessert
