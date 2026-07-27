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
Maße in Metern, Materialien als PBR (Base Color + Roughness).

> ⚠️ **ACHSEN — bitte lesen, sonst steht alles falsch herum:**
> Der glTF-Export dreht Blender-Koordinaten. Was in den Generator-Skripten „+y (vorne)" ist,
> liegt in three.js bei **−z**. Also: **Die Schauseite (Tür, Schaufenster, Portal, Fahrzeugfront)
> zeigt in three.js nach −z.** Ein Gebäude ohne Rotation schaut nach Norden (−z);
> soll es nach Süden schauen, `rotation.y = Math.PI` setzen.
> Selbst per Render verifiziert — die Tabellen unten nennen die Seite bereits in three.js-Konvention.

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
| `th7_lieferwagen.glb` | Transporter (parkend) | 2,3 × 4,8 × 2,5 | Front auf −z |
| `th7_lkw.glb` | Sattelzug (parkend) | 2,5 × 10,5 × 3,7 | Front auf −z |
| `th7_taxi.glb` | Taxi mit Dachschild | 1,9 × 4,3 × 1,7 | Front auf −z |

| `th7_denkmal.glb` | Denkmal auf Stufensockel | 3,0 × 3,0 × 5,3 | Platzmitte |

> 🔧 **Die drei Fahrzeuge wurden am 27.07. neu erzeugt** — bitte die alten GLBs ersetzen.
> Zwei Fehler waren drin: (a) die Räder standen **quer** (Zylinderachse lag auf der
> Fahrzeuglängsachse) und ragten seitlich über die Karosserie; (b) die Front zeigte
> entgegen der Tabelle nach **+z**. Beides ist behoben und per Render belegt.

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

## 1d. Charge 4 — BEGEHBARE Gebäude (`models/th8_*.glb`)

Hohl gebaut: echte Wände, **durchgehende Türöffnung**, Boden, Innenausstattung.
Die Spielfigur (~1,8 m) läuft hinein. Türöffnungen ≥ 2,4 m hoch, Innenhöhe ≥ 3,4 m.
Alle Innenräume per Render aus **Augenhöhe (1,7 m) vor der Tür** verifiziert.

| Datei | Was | Maße (B×T×H) | Innenausstattung |
|---|---|---|---|
| `th8_stadthaus_offen.glb` | 2 Etagen, Wohnhaus | 12,8 × 10,8 × 9,2 | Geschossböden, **Treppe ins OG** mit Podest, Fenster auf allen 4 Seiten |
| `th8_markthalle_offen.glb` | Große Halle, 3 Tore | 25 × 17 × 11 | Stützenreihe, Hallenboden, Tonnendach, Fensterbänder |
| `th8_laden_offen.glb` | Ladenlokal | 9,6 × 8,6 × 3,9 | **Verkaufstheke**, 3-stöckige Regalwand mit Ware, Schaufenster + Markise |
| `th8_kirche_offen.glb` | Kirchenschiff + Turm | 15 × 27 × 21 | **Säulenreihen, 18 Bankreihen, Altar**, hohe Buntglasfenster |
| `th8_werkstatt_offen.glb` | Werkstatt/Garage | 14,8 × 12,8 × 5,3 | **Hebebühne**, Werkbank, Werkzeugtafel, großes Tor + Nebentür |

Generator: `tools/assets/mk_th8_begehbar.py`

### Einbau — Eingang zur Straße drehen
```js
// Tür zeigt ohne Rotation nach -z (Norden). Eingang nach Süden:
bau("th8_laden_offen.glb", 3.9, x, 0, z, Math.PI, false);
```
### Wände selbst bauen
`wand_mit_tuer(cx, cy, laenge, dicke, hoehe, mat, tuer_b, tuer_h, achse, tuer_off)`
setzt eine Wand als **links + rechts + Sturz** — dadurch entsteht eine echte Öffnung
ohne Boolean-Operationen. Für eigene Grundrisse einfach wiederverwenden.

---

## 1e. Charge 5 — GROSSE Landmarken (`models/th9_*.glb`)

Bauten, die eine Skyline prägen. Alles deutlich größer als Charge 1–4; gedacht als
Blickfang an Plätzen, Kreuzungen und am Stadtrand. Alle Höhen sind Meter ab y=0.

| Datei | Was | Maße (B×T×H) | Hinweis |
|---|---|---|---|
| `th9_wolkenkratzer.glb` | 3-fach gestufter Turm, Lobby-Portal, Signallicht | 20,0 × 22,8 × **52,6** | höchstes Asset; Portal + Freitreppe auf −z, rote Signalkugel emissiv |
| `th9_stadion.glb` | Ovale Arena: Rasen, Rang, Traufband, 4 Flutlichtmasten | 55,7 × 43,4 × 24,6 | Masten stehen **außerhalb** der Tribüne; 4 Glas-Tore im Ring |
| `th9_museum.glb` | Klassizistisch: Kuppel, 8-Säulen-Portikus, Freitreppe | 41,4 × 41,2 × 24,1 | echte Halbkugel-Kuppel auf Tambour; Bronzeportal |
| `th9_mall.glb` | Einkaufszentrum: Glasfront, Vordach, Werbeturm | 46,0 × 33,0 × 16,3 | Portal mit 2 Türflügeln auf −z, Oberlichter im Dach |
| `th9_krankenhaus.glb` | H-Grundriss, 6 Etagen, rotes Kreuz, Vorfahrt | 40,4 × 34,3 × 26,5 | überdachte Vorfahrt + Glas-Eingang auf −z |
| `th9_hotel.glb` | Hochhaus-Hotel, 9 Balkonreihen **beidseitig** | 26,0 × 23,0 × 38,4 | Lobby-Vordach auf −z, Dachterrasse |
| `th9_burg.glb` | Ringmauer mit Zinnen, echter Tor-Durchlass, 4 Ecktürme, Bergfried | 41,8 × 34,0 × 31,9 | Tor auf −z; Türme haben geschlossenes Deck unter dem Dach |
| `th9_wasserturm.glb` | Schaft mit Ringgesimsen, Streben, Tank, Kegeldach | 11,1 × 11,2 × 24,2 | gute Landmarke am Stadtrand |
| `th9_stadtbus.glb` | Gelenkloser Stadtbus mit Zielanzeige | 2,8 × 11,2 × 3,1 | **Front auf −z**, Türen rechts |
| `th9_feuerwehr.glb` | Löschfahrzeug: Leiter mit Holmen+Sprossen, Blaulicht | 2,8 × 8,1 × 3,0 | **Front auf −z**, Blaulicht emissiv |

Generator: `tools/assets/mk_th9_landmarken.py`

### Platzbedarf beachten
Diese Bauten sind groß genug, dass sie Straßen und Gehwege verdecken können.
Grobe Grundflächen zum Freihalten (mit 2 m Luft):

```js
// Stadion braucht ~60 × 48 m, Wolkenkratzer nur 24 × 27 m (dafür 53 m hoch)
bau("th9_wolkenkratzer.glb", 52.6, x, 0, z, 0, false);   // Portal schaut nach -z
bau("th9_stadion.glb",       24.6, x, 0, z, 0, false);
bau("th9_museum.glb",        24.1, x, 0, z, Math.PI, false);  // Portikus nach Süden
```

### Neue Helfer im Generator
- `giebel(cx, cy, cz, halbb, hoehe, tiefe, m)` — Dreiecksgiebel als echtes **Prisma**.
  (`kegel(vertices=3)` liefert eine Pyramide, keinen Giebel.)
- `halbkugel(x, y, z, r, m, seg, flach)` — Kuppel, untere Hälfte per `bmesh.ops.bisect_plane`
  **weggeschnitten** und Loch geschlossen. Basis liegt exakt bei `z`, sitzt also bündig
  auf einem Tambour. Nur zu skalieren reicht nicht — die untere Hälfte steckt sonst im Bau.
- `rad(x, y, z, r, breite, m)` — Fahrzeugrad mit korrekter Achse.
- `dreh180()` / `export(..., drehen=True)` — dreht das fertige Modell um die Welt-Z-Achse.
  So darf man bequem mit der Front auf Blender −y bauen und landet trotzdem auf three.js −z.

---

## 1f. Charge 6 — BEGEHBARE GROSSBAUTEN (`models/th10_*.glb`)

Öffentliche Häuser, in die die Spielfigur hineinläuft. Deutlich größer als Charge 4
und mit echtem Innenleben — Treppen, Galerien, Möblierung.

> 🚪 **Der Fußboden liegt bei z = 0,30, nicht bei 0.** Außensockel und Innenboden enden
> beide auf dieser Höhe, damit in der Tür **keine Schwelle** entsteht. Im Generator ist
> das die Konstante `FB`; jedes Einrichtungsstück bekommt sein z als `FB + Höhe über Boden`.

| Datei | Was | Maße (B×T×H) | Innenleben |
|---|---|---|---|
| `th10_bahnhof.glb` | Bahnhofshalle, 3 Portale | 44,4 × 28,4 × 24,0 | **Glas-Tonnendach** mit 9 Bindern, Bahnsteig, Anzeigetafel (emissiv), Uhr, Schalter, Wartebänke |
| `th10_einkaufszentrum.glb` | 2 Ebenen mit Atrium | 38,0 × 30,0 × 10,2 | Rolltreppe auf die Galerie, umlaufende Brüstung, 16 Ladenfronten, Oberlicht, Brunnen |
| `th10_schule.glb` | Foyer, Mittelflur, 4 Klassen | 35,6 × 21,6 × 5,0 | Tafeln, 24 Pulte mit Stühlen, Garderobe |
| `th10_bibliothek.glb` | Lesesaal mit Galerie | 30,0 × 24,0 × 11,1 | Treppe hinauf, 14 Regalreihen mit Büchern, 4 Lesetische mit Lampen, Ausleihtheke |
| `th10_sporthalle.glb` | Halle mit Tonnendach | 36,0 × 24,0 × 19,0 | Spielfeld mit Linien, **Körbe auf 3,05 m**, 4-stufige Tribüne, Firstoberlicht |
| `th10_rathaus.glb` | Foyer mit Freitreppe | 33,0 × 29,1 × 19,5 | 35-stufige Treppe auf die Galerie, Schalterhalle, Portikus, Uhrturm auf der Schauseite |
| `th10_kino.glb` | Foyer + Saal | 32,0 × 28,4 × 9,8 | 2 Saaleingänge, **9 ansteigende Sitzreihen à 14 Plätze**, Leinwand, Kasse, Marquee |
| `th10_restaurant.glb` | Gastraum + Terrasse | 24,0 × 21,3 × 4,8 | 6 Tische, Tresen mit Barhockern, offene Küche mit Abzug, Pendelleuchten |

Generator: `tools/assets/mk_th10_grossbauten.py`

### Neue Helfer
- `boden(B, T, m_sockel, m_boden)` — Sockel + Innenboden bündig auf `FB`, keine Schwelle.
- `wand_mit_oeffnungen(...)` + `oeffnungs_achsen(laenge, n, off_b)` — die zweite Funktion
  liefert die Pfeiler-Achsen zurück. **Damit setzt man Stützen und Einbauten neben die
  Durchgänge statt hinein** — sonst steht beim Eintreten eine Säule im Portal.
- `bruestung(cx, cy, lb, lt, z, m)` — Geländer an **allen vier** Kanten eines Galerie-Lochs.
- `treppe(cx, y0, z0, breite, hoehe_ges, m, m_gel, steig, auftritt, richtung)` — Lauf mit
  begehbarer Steigung (~0,17 m) und mitlaufendem, korrekt geneigtem Handlauf. Gibt
  `(Stufenzahl, y_ende, Lauflänge)` zurück, damit sich der Anschluss an die Galerie nachrechnen lässt.
- `tonne(...)` — **halbes** Tonnengewölbe (untere Hälfte per `bmesh` weggeschnitten).

---

## 1g. Charge 7 — INNENAUSSTATTUNG (`models/th11_*.glb`)

Einzelmöbel zum Einstreuen in die begehbaren Häuser. Alle Unterkante 0,00.

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th11_schreibtisch.glb` | 1,60 × 0,81 × 1,29 | mit Rollcontainer |
| `th11_buerostuhl.glb` | 0,64 × 0,64 × 1,00 | Fußkreuz mit Rollen, Lendenstütze |
| `th11_sofa.glb` | 2,12 × 0,90 × 0,82 | 3-Sitzer mit Kissen |
| `th11_esstisch_stuehle.glb` | 1,50 × 1,92 × 0,92 | Tisch + 4 Stühle als Set |
| `th11_bett.glb` | 1,62 × 2,12 × 1,10 | Decke mit Umschlag, Kopfteil |
| `th11_kuechenzeile.glb` | 3,24 × 0,71 × 2,23 | Spüle, Herd, Backofen, Oberschränke, Dunstabzug |
| `th11_ladenregal.glb` | 2,02 × 0,90 × 1,82 | doppelseitig, mit Ware |
| `th11_empfangstheke.glb` | 2,90 × 1,28 × 1,14 | geschwungen |
| `th11_rolltreppe.glb` | 1,28 × 9,43 × 5,27 | überwindet **exakt 4,00 m**, Glasbrüstung, Podeste |
| `th11_aufzug.glb` | 1,80 × 1,83 × 2,48 | Kabine mit offener Tür, Taster, Etagenanzeige |
| `th11_treppenlauf.glb` | 1,54 × 6,28 × 5,26 | **exakt 4,00 m Steighöhe, stapelbar: z += 4,0** (in y symmetrisch) |
| `th11_pflanzkuebel_innen.glb` | 1,02 × 1,02 × 1,94 | große Zimmerpflanze |

Generator: `tools/assets/mk_th11_moebel.py`

---

## 1h. Charge 9 — VERGNÜGUNGSVIERTEL, begehbar (`models/th12_*.glb`)

Nachtleben-Bauten, alle betretbar. Familienfreundlich gehalten: die Spieltische sind
Deko, es gibt kein Spielgeld, keine Gewinnanzeigen und keine Waffen.

| Datei | Was | Maße (B×T×H) | Innenleben |
|---|---|---|---|
| `th12_casino.glb` | Spielsaal im Vegas-Look | 43,0 × 40,6 × 12,5 | 48 Automaten, 5 Spieltische mit Filz, Bar mit Hockern, 2 Kronleuchter, Musterteppich, Vorfahrt mit Neon-Vordach, Leuchtschild mit Lauflicht |
| `th12_nachtclub.glb` | Club über 2 Ebenen | 30,0 × 25,4 × 10,4 | 12 × 12 m Tanzfläche aus Leuchtfeldern, DJ-Podest mit LED-Wand, Bar, Galerie mit Treppe, Discokugel, 6 Lichttraversen |
| `th12_bowlingbahn.glb` | 6 Bahnen | 36,0 × 28,2 × 6,6 | Bahnen mit Rinnen, je 10 Pins, Kugelrückgabe mit Kugeln, Monitore, Sitzgruppen, Schuhausgabe |
| `th12_spielhalle.glb` | Arcade | 28,0 × 22,2 × 5,7 | 36 Automaten, 3 Airhockey-Tische, 6 Greifautomaten, Preistheke, viel Neon |
| `th12_theater.glb` | Bühne + Zuschauerraum | 40,0 × 40,8 × 13,7 | Bühne 1,10 m hoch mit Portal und Samtvorhang, 8 ansteigende Reihen mit Mittelgang, Rang mit zwei Aufgängen, Kronleuchter, Portikus |

Generator: `tools/assets/mk_th12_vergnuegen.py`

### Zusätzliche Helfer
- `teppich(cx, cy, B, T, z, m1, m2, feld)` — zweifarbiger Musterboden. Ein einfarbiger
  Saal wirkt in diesen Größen tot.
- `leuchtband(...)` — Reihe **einzelner** Leuchtkästen statt eines durchgehenden Balkens.
- `spieltisch(px, py, ...)` — ovaler Tisch, Höhe 0,78 m über Boden.
- `automat(px, py, ..., rot)` — Spielautomat, Bedienseite auf −y, per `rot` drehbar
  (Rücken-an-Rücken-Reihen mit `rot=math.pi`).

---

## 1i. Charge 10 — JAHRMARKT (`models/th13_*.glb`)

Fahrgeschäfte und Buden, alle bunt und mit emissiven Lichtern — funktionieren auch im
Nachtrender.

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th13_riesenrad.glb` | 24,4 × 12,6 × **26,0** | 12 offene Gondeln, A-Böcke, Lichterkette |
| `th13_freefall_turm.glb` | 11,0 × 11,1 × **30,4** | Gondelring, Lichter, offener Zaun |
| `th13_karussell.glb` | 11,6 × 11,8 × 6,3 | 8 Sitze, Mittelsäule, Lichterrand |
| `th13_autoscooter.glb` | 19,5 × 13,7 × 8,5 | Fahrbahn, Bande, 6 Scooter, Neonschriftzug |
| `th13_achterbahn_modul.glb` | **12,0** × 2,6 × 6,7 | **reihen: x += 12,0**, knickfrei |
| `th13_festzelt.glb` | 18,4 × 14,4 × 6,5 | begehbar, Biertischgarnituren, Girlanden |
| `th13_lichterbogen.glb` | **9,0** × 3,6 × 9,7 | Eingangsbogen, begehbar durch |
| `th13_losbude.glb` | 6,2 × 5,2 × 4,3 | Theke, Preisregal, Markise |
| `th13_imbissbude.glb` | 6,0 × 9,6 × 4,3 | Ausgabefenster, Menütafel, Schirm |
| `th13_zuckerwatte_stand.glb` | 4,0 × 4,1 × 3,3 | Maschine, rosa Markise |

Generator: `tools/assets/mk_th13_jahrmarkt.py`

> ⚠️ **Schrift auf Schildern spiegelt.** Wer von vorn (Blender +y = three.js −z) auf ein
> Schild schaut, sieht Welt-+x **links**. Buchstaben müssen also in −x laufen, sonst steht
> der Schriftzug spiegelverkehrt. Der Helfer `dotword()` macht das per Vorgabe richtig.

---

## 1j. Charge 11 — CASINO- UND BAR-EINRICHTUNG (`models/th14_*.glb`)

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th14_spielautomat.glb` | 1,64 × 0,81 × 1,88 | Automat + Hocker (Sitz 0,64) |
| `th14_automatenreihe.glb` | **1,60** × 1,70 × 2,17 | 4 Automaten, **modular: x += 1,60** |
| `th14_roulettetisch.glb` | 2,65 × 1,55 × 1,12 | Platte 0,78, Kessel bis 1,12 |
| `th14_kartentisch.glb` | 3,12 × 1,31 × 0,94 | halbrund, 5 Hocker |
| `th14_pokertisch.glb` | 3,89 × 2,98 × 0,95 | 8 Plätze mit Stühlen |
| `th14_casinobar.glb` | 4,72 × 3,22 × 2,45 | Tresen 1,10, Rückbuffet, 5 Barhocker |
| `th14_neonschild_gross.glb` | 5,00 × 1,30 × 7,85 | Tafel 5 × 3 m auf z 4,00–7,00 |
| `th14_dj_pult.glb` | 2,32 × 0,81 × 1,36 | 2 Decks, Mixer, LED-Front |
| `th14_tanzflaeche.glb` | **6,00 × 6,00** × 0,15 | 8×8 Leuchtfelder, **kachelbar: 6,00** |
| `th14_samtkordel.glb` | 2,19 × 0,39 × 0,97 | Pfostenabstand 1,80 |
| `th14_discokugel.glb` | 0,71 × 0,72 × 1,36 | **hängt**: Deckenplatte auf z = 3,60 |
| `th14_kronleuchter.glb` | 1,87 × 1,88 × 2,05 | **hängt**: Deckenrosette auf z = 4,00 |

Generator: `tools/assets/mk_th14_spieltische.py`

---

## 1k. Charge 13 — BEGEHBARE VERKEHRSBAUTEN (`models/th20_*.glb`)

| Datei | Maße (B×T×H) | Innenleben |
|---|---|---|
| `th20_ubahn_station.glb` | 37,0 × 32,5 × 18,1 | Gewölbehalle, Bahnsteig 0,76 m mit Blindenstreifen, Gleis längs daneben, Fahrkartenautomaten, Anzeigetafel, Sitzbänke |
| `th20_tankstelle.glb` | 34,0 × 30,0 × 8,8 | Vordach auf 4 Stützen, 4 Zapfsäulen auf Inseln, begehbarer Shop mit Regalen und Kasse, Preismast |
| `th20_busbahnhof.glb` | 60,0 × 41,5 × 5,5 | 4 überdachte Bussteige mit Kanten, Bänken und Anzeigen, Wartehalle mit Abfahrtstafel |
| `th20_feuerwache.glb` | 46,3 × 35,0 × 18,6 | Fahrzeughalle mit 3 Toren und Ausfahrtmarkierungen, 17-m-Schlauchturm, Mannschaftstrakt, Blaulichter |
| `th20_parkgarage.glb` | 37,0 × 25,0 × 7,4 | 2 begehbare Decks, Rampe/Treppe, Stellplatzmarkierung, Brüstungen, Deckenlicht |

Generator: `tools/assets/mk_th20_verkehrsbauten.py`

Neue Helfer: `gleisstueck(cx, cy, laenge, z, ...)` — Schotter, Schwellen, 2 Schienen,
Spurweite 1,435 m, **Gleis läuft in x** (längs gebaut stünde es quer vor dem Bahnsteig).
`markierung(...)` setzt Stellplatzstriche im Raster.

---

## 1l. Charge 15 — PARK UND SPIELPLATZ (`models/th16_*.glb`)

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th16_spielturm.glb` | 4,90 × 6,21 × 3,09 | Turm mit Rutsche, Leiter, Kletternetz |
| `th16_schaukel.glb` | 3,92 × 2,22 × 2,51 | A-Gestell, 2 Sitze an Ketten |
| `th16_sandkasten.glb` | 3,08 × 3,08 × 0,59 | Holzrand, Eimer, Schaufel |
| `th16_wippe.glb` | 0,86 × 3,62 × 1,21 | 2 Sitze mit Griffen, Bodenpuffer |
| `th16_karussell_klein.glb` | 3,00 × 3,00 × 1,43 | Drehscheibe mit Haltestangen |
| `th16_pavillon.glb` | 8,68 × 9,00 × 5,61 | **begehbar**, 7 Bänke, 2,95 m licht, Stufen |
| `th16_teichbruecke.glb` | 1,76 × 7,00 × 1,95 | geschwungen, Geländer folgt dem Bogen |
| `th16_skate_rampe.glb` | **8,00** × 6,00 × 3,46 | **reihen: x += 8,00**, Coping durchlaufend |
| `th16_basketballplatz.glb` | 16,00 × 26,00 × 4,07 | Linien, 2 Körbe (Ring exakt 3,050 m), Ballfangzaun |
| `th16_grillplatz.glb` | 6,82 × 6,87 × 1,25 | Feuerring, Sitzstämme, Holzstapel |
| `th16_blumenbeet.glb` | **4,00** × 2,00 × 0,71 | **reihen: x += 4,00**, 3 Blütenfarben |
| `th16_baum_birke.glb` | 3,33 × 3,44 × 9,28 | schlank, heller Stamm — Ergänzung zu Ahorn/Pappel/Fichte |

Generator: `tools/assets/mk_th16_park.py`
Neue Helfer: `rampe()`, `pyramide()`, `bogen_linie()`, `zentriere()`.

> ⚠️ **`zentriere()` verschiebt auch nach oben.** Beim Spielturm hob es den kompletten
> Turm 9 cm in die Luft, weil ein Dekostein unter z = 0 lag. Nach dem Zentrieren immer
> die Bounding-Box nachmessen — bei fünf Modellen dieser Charge lag die Unterkante
> zunächst unter null (A-Bock-Streben, Brückenträger, Skate-Fahrfläche, Feuerring).

---

## 1m. Charge 16 — BAHN UND TRAM (`models/th17_*.glb`)

Modulare Schieneninfrastruktur. **Schienenoberkante liegt überall auf z = 0,650**,
der Fahrdraht auf z = 5,600 (= 4,950 über SOK, Höhe der Stromabnehmer).

| Datei | Maße (B×T×H) | Modul-Raster / Hinweis |
|---|---|---|
| `th17_gleis_modul.glb` | **12,000** × 5,20 × 0,65 | **x += 12,00**, Spurweite 1,435 m |
| `th17_gleis_bogen.glb` | 22,72 × 22,72 × 0,65 | 90°, schliesst an die Gerade an |
| `th17_bahnsteig_modul.glb` | **12,000** × 6,00 × **0,760** | **x += 12,00**, Blindenstreifen, Spalt zum Gleis 0,19 m |
| `th17_bahnsteigdach.glb` | **12,000** × 5,61 × 4,36 | **x += 12,00**, Stützen im 6-m-Raster |
| `th17_lokomotive.glb` | 3,11 × 19,02 × 4,95 | E-Lok, Führerstände beidseitig, Stromabnehmer |
| `th17_personenwagen.glb` | 3,05 × **24,000** × 4,03 | **kuppeln: y += 24,00** |
| `th17_tram.glb` | 2,55 × **28,000** × 4,95 | 3 Gelenkteile, Türen, Stromabnehmer |
| `th17_tramhaltestelle.glb` | 18,00 × 3,60 × 3,75 | Insel mit Wartehäuschen und Vitrine |
| `th17_oberleitungsmast.glb` | **12,000** × 3,70 × 8,01 | **x += 12,00**, Fahrdraht läuft durch |
| `th17_signal.glb` | 0,92 × 1,07 × 5,91 | 3 Lichter, emissiv, Schauseite −z |
| `th17_tunnelportal.glb` | 21,35 × 12,54 × 11,20 | lichte Weite ≥ 8 m |

Generator: `tools/assets/mk_th17_bahn.py`

Modultest mit je 3 Modulen gerendert (Gleis, Bahnsteig, Dach, alle zusammen und der
Bogen an der Geraden): keine Fuge, kein Versatz. Schwellen 0,60, Plattenfugen 1,50,
Dachrippen 0,30 und Fahrdraht-Hänger 3,00 laufen über die Modulfuge weiter.

> ⚠️ **Zylindersegmente gerade wählen, wenn etwas aufstehen soll.** Ein Rad mit 22
> Segmenten hat unten keine Kante, sondern eine Ecke — es schwebte 6 mm. Mit 24
> Segmenten liegt die Unterkante exakt auf 0,000.

---

## 1n. Charge 17 — HAFEN UND WASSER (`models/th15_*.glb`)

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th15_kaimauer_modul.glb` | **12,00** × 3,64 × 5,01 | **x += 12,00**, Poller, Fender, Steigleiter |
| `th15_containerkran.glb` | 12,00 × 38,95 × 24,84 | Schienen 12,0 → passt aufs Kaimauer-Raster |
| `th15_containerstapel.glb` | 7,76 × 6,76 × 5,24 | 3 × 2 Container, verschiedene Farben |
| `th15_frachtschiff.glb` | 15,25 × 45,06 × 18,25 | Aufbauten, Schornstein, Ladeluken, 2 Ladekrane |
| `th15_segelboot.glb` | 2,70 × 8,03 × 8,91 | Mast, Grosssegel, Cockpit |
| `th15_leuchtturm.glb` | 7,20 × 8,20 × 22,14 | rot-weiss, Laterne emissiv, Galerie |
| `th15_steg.glb` | **8,00** × 3,53 × 1,99 | **x += 8,00**, auf Pfählen |
| `th15_bootshaus.glb` | 11,60 × 16,70 × 6,49 | **begehbar**, offene Wasserseite, Steg innen, Werkbank |
| `th15_faehranleger.glb` | 10,42 × 27,57 × 5,48 | Rampe, Geländer, Wartehäuschen |
| `th15_fischerhuette.glb` | 8,80 × 9,80 × 5,07 | **begehbar**, Netze, Kisten, Ofen |

Generator: `tools/assets/mk_th15_hafen.py`
Neue Helfer: `hull()` loftet einen Schiffsrumpf als **ein** Mesh mit Materialstreifen
für Unterwasserschiff, Wasserpass, Bordwand und Deck; `schanzkleid()` legt das
Schanzkleid als gedrehte Balken entlang der Kante.

> ⚠️ **Ein Rumpf aus aneinandergereihten Quadern sieht aus wie eine Treppe.** Alle vier
> Boote dieser Charge waren zunächst Quaderketten — mit Zinnen-Lücken im Schanzkleid und
> einem geraden Wasserpass-Brett, das am Bug wie ein Steg herausragte. Für alles mit
> gekrümmtem Umriss lohnt sich ein geloftetes Mesh.

> ⚠️ **z-Fighting** trat an drei Stellen auf, wo zwei Flächen exakt deckungsgleich lagen
> (Mauerkrone gegen Kranzbalken, Containergurte, `boden()`-Vorplatz gegen Innenboden —
> dort gewann der graue Sockel über die Holzdiele). 2 cm Versatz genügen.

---

## 1o. Charge 18 — BAUERNHOF UND STADTRAND (`models/th18_*.glb`)

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th18_scheune.glb` | 20,40 × 27,20 × 12,05 | **begehbar**, breites Tor, Heuboden mit freiem Gang, Balkenwerk |
| `th18_stall.glb` | 18,00 × 14,22 × 7,61 | **begehbar**, Boxen, Futtertrog, Vordach |
| `th18_gewaechshaus.glb` | 11,00 × 17,00 × 7,37 | **begehbar**, Tonnendach, Glas mit Alpha 0,34, Pflanztische |
| `th18_silo.glb` | 6,70 × 7,82 × 14,27 | Kegeldach, Aussenleiter, Wartungstür, Auslauftrichter |
| `th18_traktor.glb` | 2,66 × 5,32 × 3,26 | grosse Hinterräder, Kabine, Frontgewichte |
| `th18_anhaenger.glb` | 2,51 × 6,36 × 2,55 | Kipper mit Bordwänden und Deichsel |
| `th18_heuballen.glb` | 5,23 × 2,98 × 1,92 | 3 Rundballen als Gruppe |
| `th18_zaun_modul.glb` | **4,00** × 0,27 × 1,46 | **x += 4,00**, Pfostenraster 2,0 — keine Doppelpfosten an der Fuge |
| `th18_feld_modul.glb` | **10,00 × 10,00** × 0,44 | **kachelbar in x UND y**, Furchenraster 0,50 |
| `th18_windrad.glb` | 14,44 × 5,44 × 28,60 | 3 Rotorblätter, Gondel |
| `th18_wassertank.glb` | 3,29 × 3,46 × 6,04 | Holzgestell, Leiter, Zapfhahn, Tränketrog |

Generator: `tools/assets/mk_th18_bauernhof.py`
Neue Helfer: `tonne_y()` (Tonnendach mit Fassachse in **y** — `tonne()` liegt in x),
`satteldach()` (Traufe exakt auf z0, Neigung per `atan2` statt geschätzt), dazu
`strebe_xz/_yz/_xy`, `ring()`, `leiter()`, `pflanze()`.

> ⚠️ **`kegel(vertices=4)` legt die Ecken auf die Achsen, nicht die Flächen.** Ein
> Pfostenkopf ragte dadurch 4 cm über das Raster und machte das Zaunmodul 4,08 statt
> 4,00 m breit — also unbrauchbar zum Reihen. Für achsparallele Pyramidenstümpfe
> lieber zwei Quader nehmen.

> ⚠️ **Erde und andere dunkle Materialien rendern in three.js deutlich heller als der
> Blender-Wert.** Das Ackerfeld musste dreimal nachgedunkelt werden.

---

## 1p. Charge 19 — BÄDER UND SPORTHALLEN (`models/th19_*.glb`)

Alle sechs begehbar und gross. In jeder Innenansicht wurde eine 1,80-m-Massstabsfigur
mitgerendert.

| Datei | Maße (B×T×H) | Innenleben |
|---|---|---|
| `th19_schwimmbad.glb` | 46,0 × 33,5 × 15,0 | 25-m-Becken mit Bahnen und Rinne, Kinderbecken, Sprungbrett, Startblöcke, Liegestühle, Umkleiden, Tonnengewölbe |
| `th19_eishalle.glb` | 47,0 × 33,3 × 9,6 | Eisfläche mit Bande und Plexiglas, 2 Tore, Spielerbänke, Tribüne, Anzeigetafel |
| `th19_tennishalle.glb` | 41,0 × 31,1 × 15,4 | 2 Plätze mit Linien, Netzkante exakt 0,914 m, Tonnengewölbe, Zuschauerbank |
| `th19_reithalle.glb` | 47,0 × 29,1 × 10,2 | Sandplatz mit Bande, Hindernisse ab Sandoberkante gemessen, Tribüne, Tor |
| `th19_kletterhalle.glb` | 28,5 × 24,9 × 13,5 | Kletterwände mit farbigen Griffen, Überhänge mit Zugstreben, Bouldermatten, Galerie |
| `th19_fitnessstudio.glb` | 32,5 × 24,9 × 5,4 | Laufbänder, Bänke, Hantelablagen, Seilzug, Spiegelwand, Empfang |

Generator: `tools/assets/mk_th19_baeder.py`
`platte_mit_loch()` wurde um einen Loch-Versatz erweitert, `tonne(..., fuellen=False)`
liefert ein offenes Gewölbe mit halbrunden Stirndeckeln.

> ⚠️ **Ein Becken geht nach unten, nicht die Möbel nach oben.** Der Schwimmbadboden
> liegt auf 0,60 — nur so passt eine 0,30-m-Beckenkante über den Wasserspiegel, ohne
> dass das Becken unter z = 0 rutscht. Und der Boden muss eine **Ringplatte mit
> Aussparung** sein, sonst betoniert der Sockel das Becken zu.

---

## 1q. Charge 20 — ZOO UND TIERPARK (`models/th24_*.glb`)

Die Anlagen; die Tiere selbst baut die Spiel-Session.

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th24_gehege.glb` | 17,5 × 14,2 × 5,3 | Wassergraben, Besucherbrüstung, Felsen, Bäume, Unterstand, Infotafel |
| `th24_voliere.glb` | 24,4 × 24,4 × 9,3 | **begehbar**, Netzkuppel auf Ringstützen, Bäume, Sitzstangen, Teich |
| `th24_aquarienhaus.glb` | 26,4 × 32,1 × 6,6 | **begehbar**, dunkler Gang, 8 beleuchtete Becken, Bodenleitlicht |
| `th24_streichelzoo.glb` | 20,2 × 18,0 × 3,0 | Gatter mit offenem Tor, Unterstand, Heuraufe, Futterautomaten, Bänke |
| `th24_zoo_eingang.glb` | 32,0 × 20,4 × 8,6 | **begehbar**, Torbogen, 2 Kassen, 3 Drehkreuze, Lageplan, Shop |

Generator: `tools/assets/mk_th24_zoo.py`
Neue Helfer: `fels()` (gekippter Kegelstumpf), `gitterwand()`, `baumstamm()`.
`mat()` hat hier zusätzlich einen `alpha`-Parameter.

> ⚠️ **Keinen durchsichtigen Wasserquader vor ein Riff stellen.** three.js sortiert
> transparente Flächen nicht zuverlässig — das Riff verschwand dahinter. Besser die
> Rückwand in Wasserfarbe einfärben und die Deko direkt hinter das Glas setzen.

> ⚠️ **Gekippte Objekte sinken unter null.** Der `fels()`-Helfer kippt um 0,10/0,08 rad;
> ohne Gegenrechnung lag die Unterkante des Geheges bei −0,08.

---

## 1r. Charge 21 — ÖFFENTLICHE PUBLIKUMSBAUTEN (`models/th23_*.glb`)

Alle sechs begehbar, Masse zur 1,8-m-Figur geprüft (Theken 1,10, Sitze 0,45, Tische 0,75).

| Datei | Maße (B×T×H) | Innenleben |
|---|---|---|
| `th23_post.glb` | 30,5 × 24,9 × 6,1 | 5 Schalter, Paketannahme, Schliessfachwand, Wartebereich, Automaten |
| `th23_bank.glb` | 33,0 × 25,9 × 7,2 | Kassenhalle, Beratungskabinen, Geldautomaten-Nische, Marmorboden |
| `th23_polizeiwache.glb` | 28,5 × 22,5 × 5,8 | Empfangstheke, Wartebank, Büroreihe hinter Glas, blaues Fassadenband |
| `th23_gericht.glb` | 43,0 × 37,7 × 13,4 | Portikus, Freitreppe, Foyer mit Bänken, Saal mit Richterbank und Zuschauerbänken |
| `th23_arztpraxis.glb` | 24,0 × 19,7 × 5,1 | Empfang, Wartezimmer, 3 Behandlungsräume, heller Flur |
| `th23_apotheke.glb` | 18,0 × 15,5 × 4,8 | Sichttresen als echte Vitrine, Schubladenwand, Kordel, Leuchtkreuz |

Generator: `tools/assets/mk_th23_oeffentlich.py`

> ⚠️ **Der Glas-Fallstrick gilt auch für Möbel.** Beim Apotheken-Sichttresen sass die
> Scheibe 3 cm hinter der Tresenfront und die Auslage steckte im massiven Korpus — von
> aussen ein blinder Klotz. Und ein `regal()` als Vollkorpus lässt die Ware unsichtbar
> im Block verschwinden: Regale gehören offen gebaut (Rückwand + Wangen + Deckel + Böden),
> mit so gerechnetem Bodenabstand, dass die oberste Warenreihe unter dem Deckel bleibt.

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

### Charge 3 — Grossbauten (`textures/th9/*.png`)

Passend zu den Landmarken der Charge 5. Alle 512×512, nahtlos (Randdifferenz gemessen
**und** per um 256/256 gerollter Kachel sichtgeprüft — die Naht läuft dann mitten durchs Bild).

| Datei | Motiv | 1 Kachel ≈ | `repeat` pro 20 m | Wofür |
|---|---|---|---|---|
| `glasraster.png` | Vorhangfassade, Scheiben einzeln getönt | 12 × 6 m | 1,5–2 breit / 3–4 hoch | Wolkenkratzer, Bürotürme |
| `bueropaneel.png` | Helle Fassadenpaneele mit Fugen | 5 × 5 m | 4 | Krankenhaus, Mall, Verwaltung |
| `stadionrasen.png` | Rasen mit gemähten Bahnen | 20 m (8 Bahnen) | 1 | Stadion, Sportplatz — Bahnen längs drehen |
| `marmorboden.png` | Polierter Marmor mit Adern | 2,4 m | 8 | Museum, Hotel, Rathaus-Foyer |
| `burgmauer.png` | Unregelmässiges Bruchsteinmauerwerk | 4 m | 5 | Burg, Stützmauern, Altstadt |
| `betonwerkstein.png` | Grossformatige Platten im halben Verband | 4 m | 5 | Plätze, Parkhaus, Vorfahrten |
| `metallpaneel.png` | Trapezblech mit Bahnstoss + Schrauben | 3 m | 6–8 | Hallen, Tanks, Werkstätten |
| `terrazzo.png` | Terrazzo mit kantigen Splittern | 1 m | 20 | Einkaufszentrum, Bahnhofshalle |

Generator: `tools/assets/mk_th9_texturen.py`

### Charge 4 — Vergnügungsviertel (`textures/th12/*.png`)

| Datei | Wofür | 1 Kachel ≈ | `repeat` pro 20 m |
|---|---|---|---|
| `casinoteppich.png` | Casino-/Foyerboden | 1,8 m | 10–12 |
| `spielfilz.png` | Poker- und Roulettetische | 0,8 m | 24 (1–3 pro Tisch) |
| `bowlingahorn.png` | Bowlingbahnen, Anlaufzone | 1,2 m | 16–18 |
| `samtvorhang.png` | Theatervorhang, Wandbespannung | 1,2 m | 16 |
| `neonkacheln.png` | Tanzfläche, LED-Wände | 2 m | 10 |
| `sternenhimmel.png` | Theater-/Saaldecke | 4,5 m | 4–5 |
| `goldstuck.png` | Theaterwände, Casino-Pilaster | 2 m | 10 |
| `arcade_boden.png` | Spielhalle, Zuschauerbereiche | 2,5 m | 8 |

Generator: `tools/assets/mk_th12_texturen.py`

---


## 3. Nachschub produzieren

Die Generatoren liegen in `tools/assets/`:

```bash
python3 tools/assets/mk_th5_modelle.py    # Modelle -> models/th5_*.glb + models/stl/
python3 tools/assets/mk_th5_texturen.py   # Texturen -> textures/th5/*.png
python3 tools/assets/mk_th6_stadt.py      # Riesenstadt-Modelle -> models/th6_*.glb
python3 tools/assets/mk_th6_texturen.py   # Fassaden/Belaege -> textures/th6/*.png
python3 tools/assets/mk_th7_gebaeude.py   # modulare Gebaeude+Fahrzeuge -> models/th7_*.glb
python3 tools/assets/mk_th8_begehbar.py   # BEGEHBARE Gebaeude -> models/th8_*.glb
python3 tools/assets/mk_th9_landmarken.py # GROSSE Landmarken -> models/th9_*.glb
python3 tools/assets/mk_th9_texturen.py   # Grossbau-Texturen -> textures/th9/*.png
python3 tools/assets/mk_th10_grossbauten.py  # BEGEHBARE Grossbauten -> models/th10_*.glb
python3 tools/assets/mk_th11_moebel.py    # Innenausstattung -> models/th11_*.glb
python3 tools/assets/mk_th12_vergnuegen.py   # Vergnuegungsviertel -> models/th12_*.glb
python3 tools/assets/mk_th12_texturen.py  # Casino/Club/Theater -> textures/th12/*.png
python3 tools/assets/mk_th13_jahrmarkt.py    # Jahrmarkt -> models/th13_*.glb
python3 tools/assets/mk_th14_spieltische.py  # Casino-Einrichtung -> models/th14_*.glb
python3 tools/assets/mk_th20_verkehrsbauten.py  # Verkehrsbauten -> models/th20_*.glb
python3 tools/assets/mk_th15_texturen.py  # Naturtexturen -> textures/th15/*.png
python3 tools/assets/mk_th16_park.py      # Park und Spielplatz -> models/th16_*.glb
python3 tools/assets/mk_th17_bahn.py      # Bahn und Tram -> models/th17_*.glb
python3 tools/assets/mk_th15_hafen.py     # Hafen und Wasser -> models/th15_*.glb
python3 tools/assets/mk_th18_bauernhof.py # Bauernhof -> models/th18_*.glb
python3 tools/assets/mk_th19_baeder.py    # Baeder und Sporthallen -> models/th19_*.glb
python3 tools/assets/mk_th24_zoo.py       # Zoo und Tierpark -> models/th24_*.glb
python3 tools/assets/mk_th23_oeffentlich.py # Publikumsbauten -> models/th23_*.glb
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

### Zwei teuer gelernte Fallstricke (bitte nicht wiederholen)

1. **`export_apply=True` ist Pflicht beim GLB-Export.** Ohne den Parameter verwirft
   `bpy.ops.export_scene.gltf` alle Modifier — die Modelle kamen mit reiner Box-Geometrie
   an (144 statt 2256 Dreiecke), also *ohne jede Rundung*. Die STL-Exporte waren korrekt
   und haben den Fehler verdeckt. **Prüfung:** Dreiecke im GLB zählen; eine gebevelte Box
   hat ~150–200 statt 12.
2. **Nahaufnahmen zur Abnahme, nicht nur Kontaktbögen.** Ein Skalierungsfehler
   (`primitive_cube_add(size=1)` liefert bereits Kantenlänge 1 — zusätzliches `/2` halbiert
   alles) ließ Dächer schweben und Bänke auseinanderfallen. Aus 25 m Entfernung unsichtbar,
   in der Nahaufnahme sofort klar.
3. **Fensterglas gehört knapp VOR die Wandfläche, nicht hinein.** In Charge 5 saß das Glas
   0,07 m nach innen versetzt und steckte damit vollständig in der Fassade — die Häuser
   rendern als weiße Klötze ohne ein einziges Fenster. Offset `−0,02` (leicht vorstehend)
   plus vorstehende Geschossbänder ergibt die gewünschte Tiefe.
4. **Zylinderachsen und Ellipsen-Tangenten nachrechnen.** `rot=(π/2,0,0)` legt eine
   Zylinderachse auf **−y**, nicht auf x — Fahrzeugräder stehen damit quer. Und
   `rotation_euler[2] = a + π/2` ist nur auf dem **Kreis** die Tangente; auf einer Ellipse
   braucht es `atan2(B·cos t, −A·sin t)`, sonst klaffen zwischen den Segmenten Schlitze.
5. **`transform_apply` nie nur mit `rotation=True`,** wenn das Objekt eine nicht-uniforme
   Skalierung hat — sonst wird die Box geschert. Rotation und Skalierung zusammen anwenden.
6. **Möbel gehören auf die Fußboden-Oberkante, nicht auf z = 0.** In Charge 6 lag der
   begehbare Boden bei 0,48, die Möbel aber auf 0 — Stühle steckten komplett im Boden,
   Tische waren 0,31 m hoch. Deshalb gibt es jetzt die Konstante `FB` und jedes
   Einrichtungsstück wird als `FB + Höhe über Boden` gesetzt. Gleiches Muster gilt für
   Wandkronen: eine Decke, die 0,6 m über der Wand sitzt, lässt rings einen Himmelsspalt.
7. **Ein voller Zylinder ist kein Tonnendach und eine skalierte Kugel keine Kuppel.** Die
   untere Hälfte steckt im Gebäude und verdeckt von innen den ganzen Raum. Beide Formen
   werden mit `bmesh.ops.bisect_plane` wirklich halbiert (`tonne()`, `halbkugel()`).
8. **Stützen und Einbauten neben die Durchgänge, nicht hinein.** `oeffnungs_achsen()`
   liefert die Pfeiler-Achsen — sonst steht beim Eintreten eine Säule im Portal oder ein
   Schaufenster mauert das Eingangstor zu.
9. **`rotation_euler[2] = π` auf einem symmetrischen Quader ist ein No-Op.** Ein damit
   „gespiegelter" Spielautomat schaute weiter in dieselbe Richtung, und die
   Rücken-an-Rücken-Reihe stand Front-an-Rücken mit 8 cm Abstand. Gespiegelt wird über
   das **Vorzeichen der Offsets**, nicht über eine Rotation. Zwei Prüfdurchgänge haben
   genau diesen Fehler unabhängig voneinander gefunden.
10. **Metallic über ~0,4 rendert in three.js ohne Environment-Map fast schwarz.** Für
    Chrom, Messing und Spiegel höchstens 0,6–0,8 bei niedriger Roughness ansetzen.
11. **Treppenlängen ausrechnen, nicht schätzen.** `n = round(Höhe/Steigung)` bestimmt die
    Lauflänge; wer den Startpunkt aus einer geratenen Stufenzahl ableitet, landet
    zuverlässig daneben — und die Treppe endet in der Luft oder rammt die Decke.

### Prüfvorgehen, das sich bewährt hat
Pro Modell **zwei** Renders: eine 3/4-Totale auf die Schauseite (−z) **und** eine
Nahaufnahme auf Augenhöhe. Für Rundbauten zusätzlich eine Aufsicht — das Stadion sah
von schräg unten korrekt aus, erst von oben war zu sehen, dass eine Linienfläche den
kompletten Rasen zudeckte. Dazu Dreiecke zählen (Bevel-Kontrolle) und die Bounding-Box
messen (Unterkante muss exakt 0,00 sein).
