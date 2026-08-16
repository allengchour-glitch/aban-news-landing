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
| `th7_hochhaus_modul.glb` | Turm-Segment: Eck- und Mittelpfeiler, 24 Fenster mit Laibung | **8,200** × 8,200 × **6,000** | **stapeln: y += 6** |
| `th7_hochhaus_dach.glb` | Turmabschluss: Attika-Ring, Treppenhaus, Technik, Antenne | 8,3 × 8,3 × 3,55 | oben aufsetzen |
| `th7_reihenhaus_modul.glb` | Stadthaus: Laibungen, Fensterläden, Vordach, Kamin | **6,000** × 8,3 × 9,5 | **reihen: x += 6** |
| `th7_parkhaus.glb` | 3 offene Decks, Geländer, Treppenkern, schräge Rampe | 22,1 × 11,5 × 10,8 | frei |
| `th7_lagerhalle.glb` | Tonnendach, Rolltore, Oberlichtband, Rinne | 20,5 × 14,9 × 8,7 | frei |
| `th7_bruecke_modul.glb` | Straßenbrücke mit Brüstung + Pfeilern | **14,0** × 9,0 × 5,1 | **reihen: x += 14** |
| `th7_lieferwagen.glb` | Transporter (parkend) | 2,3 × 4,8 × 2,5 | Front auf −z |
| `th7_lkw.glb` | Sattelzug (parkend) | 2,5 × 10,5 × 3,7 | Front auf −z |
| `th7_taxi.glb` | Taxi mit Dachschild | 1,9 × 4,3 × 1,7 | Front auf −z |

| `th7_denkmal.glb` | Denkmal auf Stufensockel | 3,0 × 3,0 × 5,3 | Platzmitte |

> 🔧 **Hochhaus- und Reihenhaus-Modul wurden korrigiert** — bitte die alten GLB ersetzen.
> Beide Rastermasse waren kaputt: der Turm-Abschluss ragte 4 cm ueber die Stapelkante
> (6,04 statt 6,000), und das „Satteldach" der Zeile war ein `kegel(vertices=4)` — eine
> Pyramide, deren Ecken 13,0 m auseinander standen statt 6,0. Dafuer gibt es jetzt
> `satteldach_x()`, ein echtes Prisma mit First in x. Im 3-Modul-Test bilden die
> Zeilenhaeuser eine durchgehende Reihe mit durchlaufendem First.

> 🔧 **Fassaden-Relief (31.07.)** — die fünf Bauten oben sind neu erzeugt, bitte die alten
> GLB ersetzen. Vorher waren es glatte Quader mit aufgemaltem Fensterband; gestapelt gab
> das eine 30 m hohe leere Wand. Jetzt tragen sie Pfeiler, Gesimse und Fenster mit echter
> Laibung (Helfer `fbox`/`laibung`/`randring` im Generator). **Die Rastermasse sind
> unveraendert und nachgemessen: Turm exakt 8,200 × 8,200 × 6,000, Zeile exakt 6,000 in x.**
> Regel dabei: kein Bauteil darf ueber die Aussenflucht hinaus — beim Reihenhaus heisst
> das, Relief gibt es **nur in y**, die Giebelseite bleibt als Brandwand glatt.

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

> 🔧 **Die Markthalle wurde am 28.07. überarbeitet** — bitte das alte GLB ersetzen.
> Ihr Tonnendach war ein **voller Zylinder**: die untere Hälfte füllte die Halle, von
> der Tür aus sah man nur eine graue Wand (Unterkante lag bei −1,90). Jetzt halbiert
> `tonne()` das Gewölbe wirklich, der Radius sitzt exakt auf der Wandflucht (T/2), und
> die Innenstützen stehen auf den Pfeiler- statt den Torachsen.

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

> 🔧 **Aussenrelief (31.07.) — bitte die GLB/STL dieser Charge ersetzen.** Die Bauten waren
> von aussen glatte Quader mit Fensterstreifen und einer leeren weissen Dachplatte; im
> Kontaktbogen sahen mehrere davon identisch aus. Neu in allen drei Generatoren:
> `bandring()` (umlaufendes Band aus VIER Quadern — ein Vollquader mauert die Decke der
> begehbaren Bauten von innen zu), `aussenrelief()` (Sockelband, Ecklisenen, zweistufiges
> Kranzgesims, optional Attika) und `dachtechnik()` (Aufzugsueberfahrt, Lueftungsgeraete,
> Oberlichter, Fallrohr). **Alle Dachaufbauten laufen am Rand entlang** — Bibliothek und
> Einkaufszentrum haben ein Atrium-Loch in der Dachplatte, mittig gesetzte Aufbauten
> schwebten darueber. Relief fasst bewusst nur Ecken und umlaufende Baender an, damit es
> nicht mit den `fensterband()`-Achsen kollidiert. Innenleben unveraendert, zmin 0,00.

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

> 🔧 **Aussenrelief (31.07.) — bitte die GLB/STL dieser Charge ersetzen.** Die Bauten waren
> von aussen glatte Quader mit Fensterstreifen und einer leeren weissen Dachplatte; im
> Kontaktbogen sahen mehrere davon identisch aus. Neu in allen drei Generatoren:
> `bandring()` (umlaufendes Band aus VIER Quadern — ein Vollquader mauert die Decke der
> begehbaren Bauten von innen zu), `aussenrelief()` (Sockelband, Ecklisenen, zweistufiges
> Kranzgesims, optional Attika) und `dachtechnik()` (Aufzugsueberfahrt, Lueftungsgeraete,
> Oberlichter, Fallrohr). **Alle Dachaufbauten laufen am Rand entlang** — Bibliothek und
> Einkaufszentrum haben ein Atrium-Loch in der Dachplatte, mittig gesetzte Aufbauten
> schwebten darueber. Relief fasst bewusst nur Ecken und umlaufende Baender an, damit es
> nicht mit den `fensterband()`-Achsen kollidiert. Innenleben unveraendert, zmin 0,00.
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

> 🔧 **Aussenrelief (31.07.) — bitte die GLB/STL dieser Charge ersetzen.** Die Bauten waren
> von aussen glatte Quader mit Fensterstreifen und einer leeren weissen Dachplatte; im
> Kontaktbogen sahen mehrere davon identisch aus. Neu in allen drei Generatoren:
> `bandring()` (umlaufendes Band aus VIER Quadern — ein Vollquader mauert die Decke der
> begehbaren Bauten von innen zu), `aussenrelief()` (Sockelband, Ecklisenen, zweistufiges
> Kranzgesims, optional Attika) und `dachtechnik()` (Aufzugsueberfahrt, Lueftungsgeraete,
> Oberlichter, Fallrohr). **Alle Dachaufbauten laufen am Rand entlang** — Bibliothek und
> Einkaufszentrum haben ein Atrium-Loch in der Dachplatte, mittig gesetzte Aufbauten
> schwebten darueber. Relief fasst bewusst nur Ecken und umlaufende Baender an, damit es
> nicht mit den `fensterband()`-Achsen kollidiert. Innenleben unveraendert, zmin 0,00.

> ⚠️ **Der Glas-Fallstrick gilt auch für Möbel.** Beim Apotheken-Sichttresen sass die
> Scheibe 3 cm hinter der Tresenfront und die Auslage steckte im massiven Korpus — von
> aussen ein blinder Klotz. Und ein `regal()` als Vollkorpus lässt die Ware unsichtbar
> im Block verschwinden: Regale gehören offen gebaut (Rückwand + Wangen + Deckel + Böden),
> mit so gerechnetem Bodenabstand, dass die oberste Warenreihe unter dem Deckel bleibt.

---

## 1s. Charge 22 — BAUSTELLE (`models/th21_*.glb`)

| Datei | Maße (B×T×H) | Modul-Raster / Hinweis |
|---|---|---|
| `th21_turmdrehkran.glb` | 5,33 × 32,91 × **34,02** | Gitterturm, Ausleger, Gegenausleger mit Ballast, Laufkatze, Haken |
| `th21_geruest_modul.glb` | **6,000** × 1,39 × **8,000** | **x += 6,00**, Ständerraster 2,00, keine Doppelständer an der Fuge |
| `th21_bauzaun_modul.glb` | **3,500** × 0,78 × 2,10 | **x += 3,50**, an jeder Fuge genau eine Klemme |
| `th21_baucontainer.glb` | **2,440** × 7,71 × **2,600** | **stapeln: z += 2,60**, Eckbeschläge bündig |
| `th21_rohbau.glb` | **12,000 × 12,000 × 3,200** | **begehbar**, **stapeln: z += 3,20**, Treppe läuft durchs Deckenauge |
| `th21_bagger.glb` | 3,22 × 8,08 × 4,76 | Ketten, Drehkranz, Ausleger, eingerollter Löffel |
| `th21_radlader.glb` | 2,74 × 7,03 × 2,97 | Schaufel, Knicklenkung, Kabine |
| `th21_betonmischer.glb` | 3,26 × 9,81 × 4,26 | drehbare Trommel, Rutsche |
| `th21_materialstapel.glb` | 5,53 × 3,73 × 1,57 | Paletten mit Ziegeln, Rohren, Zementsäcken |
| `th21_sandhaufen.glb` | 10,52 × 5,64 × 1,65 | Sand und Kies, Trennwand |
| `th21_betonrohre.glb` | 7,56 × 4,70 × 3,42 | Pyramidenstapel |

Generator: `tools/assets/mk_th21_baustelle.py`

Der Rohbau hat bewusst **kein** Geländer am Deckenauge und die Treppe keinen Handlauf —
beides würde über 3,20 m ragen und den fugenlosen Stapel zerstören.

> ⚠️ **`read_factory_settings(use_empty=True)` reicht nicht immer.** Ein Lauf lieferte
> trotzdem einen Default-Würfel mit Unterkante −1,00 ins Modell. Das `neu()` dieser
> Charge löscht zusätzlich alle Objekte.

> ⚠️ **Gedrehte Körper: den Versatz senkrecht zur Achse rechnen.** Eine Treppenwange
> tauchte 7 cm unter den Boden, weil der senkrechte statt des achsnormalen Versatzes
> angesetzt war (`0,15 · cos α`). Für gekippte Quader gilt `(b·sin α + h·cos α)/2`.

---

## 1t. Charge 23 — WOHNBAUTEN (`models/th22_*.glb`)

| Datei | Maße (B×T×H) | Modul-Raster / Hinweis |
|---|---|---|
| `th22_altbau_modul.glb` | **8,000** × 11,45 × **16,000** | **x += 8,00**, Erker, Stuckbänder, hohe Fenster |
| `th22_altbau_eck.glb` | 12,50 × 13,02 × 21,50 | Eckhaus mit Turmhaube, Brandwand exakt bei x = −6,000 |
| `th22_plattenbau_modul.glb` | **12,000** × 14,11 × **15,000** | **x += 12,00**, durchgehende Balkonreihe |
| `th22_dachterrasse.glb` | **12,000** × 8,00 × 3,15 | Aufsatz für Flachdächer, Pergola, Pflanzen |
| `th22_villa.glb` | 23,00 × 17,00 × 10,43 | Walmdach, Erker, Garage, Vorgarten |
| `th22_bungalow.glb` | 25,00 × 19,00 × 4,50 | Terrasse, Carport |
| `th22_doppelhaus.glb` | 22,00 × 17,00 × 10,74 | 2 Hälften, gemeinsame Wand, 2 Eingänge |
| `th22_hinterhof.glb` | 29,00 × 27,00 × 14,07 | **begehbar**, Toreinfahrt, Innenhof, Treppenhäuser, Fahrradständer |
| `th22_balkon_modul.glb` | 3,60 × 2,32 × 3,10 | vorgehängt, zum Anbauen |
| `th22_garage.glb` | 6,60 × 8,94 × 3,82 | **begehbar**, Kipptor, Werkbank, Regal |

Generator: `tools/assets/mk_th22_wohnen.py`
Neue Helfer: `walmdach()` (echtes Mesh — vier gekippte Platten lassen an den Graten
Schlitze), `satteldach_x()` (First in x, für Reihen- und Doppelhäuser), `giebel_quer()`
(Giebel über Objektrotation, weil ein von Hand gespiegeltes Mesh die Normalen umdreht)
und `dachrand()`.

> ⚠️ **Attika als Vollplatte macht jedes Flachdach zu einem weissen Klotz** — sie deckt
> die dunkle Dachhaut zu. `dachrand()` legt nur einen Ring. Betraf hier vier Modelle.

> ⚠️ **Anbauteile sprengen das Modulraster.** Portallampen machten das Altbau-Modul
> 8,17 statt 8,00 m breit, Schornsteine 16,55 statt 16,00 m hoch, ein Handlauf die
> Dachterrasse 12,06 statt 12,00. Bei Modulen nach jedem Detail neu messen.

---

## 1u. Charge 24 — WINTER UND WEIHNACHTSMARKT (`models/th29_*.glb`)

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th29_weihnachtsbude.glb` | 6,00 × 5,40 × 4,18 | Giebeldach mit Schneeauflage, Theke mit Waren, Regal, Tannengrün, Lichterkette |
| `th29_christbaum.glb` | 5,25 × 5,38 × 10,30 | Kreuzfuss, Kugeln, Lichter, Schneeauflage, Goldspitze |
| `th29_eisbahn_freiluft.glb` | 42,4 × 24,9 × 5,72 | Eisfläche mit Bande, 8 Lichtermasten mit Girlanden, Verleihhütte, Bänke |
| `th29_schneemaenner.glb` | 7,29 × 2,17 × 3,43 | 3 Grössen, Zylinderhut, Schal, Möhrennase, Aststarme |
| `th29_rodelhang.glb` | 19,5 × 20,0 × 5,44 | **x += 12,00**, Piste zwischen Schneewällen, Strohballen, Streckenfahnen |
| `th29_skiliftmast.glb` | 3,80 × 1,80 × 9,32 | Rollenbatterie, Seil, 2 Schleppbügel, Steigleiter |

Generator: `tools/assets/mk_th29_winter.py`
Neue Helfer: `tanne()` (gestapelte Kegel, optional mit Kugeln und Lichtern),
`lichterkette()` (Segmente per `atan2` ausgerichtet — eine Reihe ungedrehter Boxen
liest sich als Treppe).

> ⚠️ **Ein um 90° gekippter Kegel legt seinen RADIUS auf die z-Achse** und taucht damit
> um r unter den Boden (beim Rodelhang gemessene −0,69). Für einen langen Wall lieber
> Quader plus aufgesetzten Halbzylinder, dessen untere Hälfte im Quader verschwindet.

---

## 1v. Charge 25 — FLUGHAFEN (`models/th25_*.glb`)

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th25_terminal.glb` | 53,2 × 35,4 × 15,6 | **begehbar**, Check-in-Reihe, Anzeigetafeln, Sitzreihen, Galerie mit Treppe |
| `th25_tower.glb` | 11,7 × 11,7 × 34,3 | Schaft, auskragende Kanzel mit geneigten Scheiben, Umlaufgalerie |
| `th25_flugzeug.glb` | 34,8 × 38,6 × 11,8 | Rumpf geloftet, gepfeilte Tragflächen, 2 Triebwerke, Fahrwerk am Boden |
| `th25_hangar.glb` | 45,2 × 33,4 × 16,9 | **begehbar**, riesiges Tor, Tonnendach, Werkstattzeile, Deckenkran |
| `th25_fluggastbruecke.glb` | 5,8 × 21,4 × 7,4 | Stützen, Faltenbalg, Rotunde |
| `th25_landebahn_modul.glb` | **30,0** × 30,0 × 0,68 | **x += 30,00**, Mittellinie und Randbefeuerung laufen durch |
| `th25_radarturm.glb` | 9,3 × 5,2 × 19,1 | Drehradar auf Gittermast |
| `th25_gepaeckwagen.glb` | 2,1 × 11,0 × 3,0 | Schlepper mit 2 Anhängern und Koffern |
| `th25_tankwagen.glb` | 3,3 × 10,1 × 4,2 | Tank, Schlauchtrommel, Kabine |

Generator: `tools/assets/mk_th25_flughafen.py`


## 1z. Charge 32 — FREIZEITPARK-ERWEITERUNG (`models/th32_*.glb`)

Baut auf Charge 9 (`th13_*`, Jahrmarkt) auf. **Mit Animation und Texturen.**

| Datei | Maße (B×T×H) | Animation | Hinweis |
|---|---|---|---|
| `th32_achterbahn_kurve.glb` | 7,9 × 7,3 × 6,8 | — | **90°-Kurve auf 12×12-Kachel** |
| `th32_achterbahn_station.glb` | 13,2 × 10,6 × 10,7 | — | **12,0 m lang**, Bahnsteig, Dach, Pult |
| `th32_kettenkarussell.glb` | 18,4 × 18,4 × 14,9 | `DrehkranzAction` (8,3 s) | 16 Sitze, ausgestellt |
| `th32_piratenschiff.glb` | 20,0 × 13,0 × 13,2 | `PendelAction` (6,2 s) | Schiffsschaukel ±34° |
| `th32_teetassen.glb` | 17,0 × 17,0 × 8,6 | 4 Clips (8,3 s) | Teller + 3 **gegenläufige** Unterteller |
| `th32_wildwasserbahn.glb` | 30,7 × 22,7 × 12,0 | — | Liftberg, Sturzrinne, Becken, 2 Boote |
| `th32_geisterbahn.glb` | 20,0 × 16,7 × 13,0 | — | Ein-/Ausfahrt, kindgerecht (kein Blut) |
| `th32_parkeingang.glb` | 27,8 × 10,0 × 13,9 | 4 × `DrehkreuzN` (10 s) | Torbogen, 4 Kassen, Drehkreuze |

Generatoren: `tools/assets/mk_th32_freizeitpark.py` · `tools/assets/mk_th32_texturen.py`

### 🎢 Schienen-Schnittstelle (der Grund für diese Charge)
`th13_achterbahn_modul` konnte nur geradeaus. Kurve und Station bedienen exakt dieselbe
Schnittstelle, damit sich daraus eine Strecke legen lässt:

```
Fahrbahnmitte y = 0 · Schienenpaar y = ±0,62 · Profil 0,15 × 0,15
Mittelrohr 0,28 unter der Schienenmitte · Schienen-Mittelhöhe z = 6,60 · Steigung 0
```

> ⚠️ **Die Kurve wird an der KACHELMITTE verankert, nicht an ihrer Bounding-Box-Mitte.**
> Sie belegt die Kachel `x,y ∈ [−6, +6]`, ihr Bogen läuft aber nur durch einen Quadranten
> (Bogenmitte (−6, +6), Radius 6,0) — die Bounding-Box ist deshalb nur 7,9 × 7,3 groß und
> liegt **außermittig**. Wer das Modell auf seine eigene Box zentriert, verschiebt die
> Gleisenden und die Kachel passt nicht mehr. Ein-/Austritt liegen bei (−6, 0) und (0, +6).

### 🎬 Animationen
Die GLB tragen echte glTF-Animationen; im Spiel wie bei den Charakteren abspielen:
`mixer = new THREE.AnimationMixer(gltf.scene); gltf.animations.forEach(a => mixer.clipAction(a).play())`.

> ⚠️ **glTF speichert Rotationen als Quaternion.** Zwei Keyframes 0° → 360° sind für den
> Interpolator identisch — der Spieler sieht **keine** Drehung. Jede Umdrehung wird deshalb
> in Viertelschritte zerlegt (`dreh_anim()`).
> ⚠️ **Blender 5 hat die Action-API auf Layer/Slots umgestellt** — `action.fcurves` gibt es
> nicht mehr. Die Interpolation wird über `preferences.edit.keyframe_new_interpolation_type`
> gesetzt (LINEAR für Dauerdrehung, BEZIER für das Pendel).
> ⚠️ Beim Parenten muss `matrix_parent_inverse` gesetzt werden, sonst springt jedes Kind um
> die Elternposition — der Kettenflieger stand 11 m über seinem Mast.

### 🎨 Texturen (`textures/th32/*.png`)
512×512, **nahtlos**, geprüft per Kennzahl (Randsprung ÷ Innensprung ≤ 1,5) **und** per
2×2-Kachelbogen — die Kennzahl allein genügt nicht.

| Datei | Wofür |
|---|---|
| `zeltbahn.png` | Markisen, Stationsdach, Schirme (rot-weiß gestreift) |
| `bohlen.png` | Bahnsteig, Bootsdeck, Stege |
| `riffelblech.png` | Stahlstege, Gitterroste |
| `parkpflaster.png` | Wege und Bodenplatten |
| `wasser.png` | Becken, Rinnen |
| `lichterband.png` | Leuchtbänder an Fassaden und Bogen |

Die Texturen sind **im GLB eingebettet** (`mat_bild()`), das Spiel braucht keine Extra-Verdrahtung.

> ⚠️ **Fallen bei den Texturen:**
> * **Die Zellenzahl muss 512 teilen.** Mit 6 Zellen ergibt 512/6 = 85,33 px — die letzte
>   Reihe wird abgeschnitten und die Kante reißt auf (gemessene Kennzahl 20,3).
> * **Ein Muster-Index muss umlaufen** (`% BOHLEN`), sonst bekommt die letzte Bohle einen
>   anderen Farbton als die erste der Nachbarkachel.
> * **Fuge/Farbwechsel nicht auf die Kachelkante legen.** Das kachelt zwar korrekt, die
>   Textur ist dann aber nur noch gekachelt brauchbar. Ein Viertel Zelle Versatz löst es.
> * **`giebel()` baut sein Mesh mit `from_pydata` und hat deshalb keine UVs.** Eine
>   Bildtextur trifft dann überall denselben Pixel → einfarbige Fläche (das Stationsdach
>   war rot statt gestreift). Der Helfer legt jetzt UVs aus den Punktkoordinaten an.
> * **`read_factory_settings()` macht geladene Bilder ungültig.** Ein Image-Cache über
>   mehrere Modelle hinweg muss in `neu()` geleert werden, sonst
>   „StructRNA of type Image has been removed".
> * Prozedurale Koordinaten-Knoten (`Generated`/`Object`) exportiert glTF **nicht** —
>   gekachelt wird über echte UVs (`uv_kacheln()` skaliert sie mit den Objektmaßen).

---



## 1z6. Charge 37 — STADTHAEUSER, FAHRZEUGE, SCHIESSBUDE (`models/th37_*.glb`)

Drei Gruppen, ein Generator. Charge 34 ist ein **Baukasten** — gut zum Selberbauen,
aber jedes Haus daraus sieht gleich aus. Hier stehen vier **Charaktere**, dazu vier
Wagen und eine Kirmesbude.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th37_altbau.glb` | 11,34 × 10,89 × 16,40 | 33 548 | Gründerzeit, Erker mit Sprossen, Balkone, Verdachungen, Eckquaderung, Fallrohre |
| `th37_eckhaus.glb` | 10,71 × 11,47 × 13,40 | 17 140 | Rundecke mit Turmdach, Ladenfront, Markise, Ladenschild, Fensterläden |
| `th37_reihenhaus.glb` | 6,74 × 9,22 × 9,70 | 14 132 | Giebel zur Straße, Ziegeldach, Läden, Rinne, **Raster x += 6,00** |
| `th37_cafe.glb` | 9,64 × 10,17 × 6,74 | 16 336 | Markise, Ladenschild, 4 Tische mit Schirmen, Pflanzkübel |
| `th37_limousine.glb` | 4,61 × 2,14 × 1,44 | 13 360 | viertürig, Front auf **+x** |
| `th37_kombi.glb` | 4,77 × 1,96 × 1,70 | 13 628 | durchlaufende Dachlinie, Reling |
| `th37_sportwagen.glb` | 4,31 × 2,14 × 1,18 | 13 240 | Fastback, Heckflügel |
| `th37_lieferwagen.glb` | 5,25 × 2,30 × 2,50 | 13 628 | Kasten, Schiebetür, Flügeltüren |
| `th37_schiessbude.glb` | 5,16 × 3,13 × 3,30 | 10 752 | Klappziele, Dosen, zwei Budengewehre |
| `th37_wasserpistole.glb` | 0,77 × 0,18 × 0,50 | 2 384 | Spielzeug-Requisite |
| `th37_strassenzug.glb` | 50,40 × 20,17 × 16,40 | 162 604 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th37_stadt.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle elf: zmin = 0,000. **Fahrzeuge zeigen mit der Front auf +x**, nicht auf +y — sie
stehen an einer Straße, nicht auf einem Sockel.

> 🛠️ **`keil_y(prof, cy, breite)` — Profil aus der x-z-Ebene entlang y extrudiert.**
> Das Gegenstück zu `keil_x` aus Charge 34 und das Werkzeug für Fahrzeuge: man zeichnet
> die **Seitenansicht** und zieht sie auf Wagenbreite. Aus Kisten gestapelt bekommt man
> nie eine Windschutzscheibenneigung hin. Die Deckflächen werden **trianguliert**, nicht
> als N-Gon geschlossen — ein Auto-Seitenriss ist nicht konvex (die Fensterlinie springt
> zurück), und ein N-Gon darüber faltet sich.

> 🎯 **Die Schießbude ist ausdrücklich familienfreundlich.** Klappziele, Blechdosen und
> zwei bunte Budengewehre mit Korkkugel — Spielzeug in Spielzeugfarben. Keine echten
> Feuerwaffen, keine realen Maße: STL ist ein Druckformat, und maßgetreue Waffenteile
> entstehen hier nicht.

### 🎀 Zweiter Durchgang: Zierrat

Die erste Fassung war korrekt, aber karg. Ergänzt wurden **Fensterläden** mit Lamellen,
**Verdachungen** über der Beletage (nur dort — über allen Geschossen wäre es Kitsch),
**Eckquaderung**, **Ziegelreihen** auf dem Satteldach samt Rinne und Fallrohr,
**Ladenschilder** und eine Sprossenteilung im Erker. Zwei Bretter neben einem Fenster
ändern mehr am Gesamteindruck als jede Texturverfeinerung: sie geben der Fassade
Rhythmus und eine zweite Tiefenstufe. Und ein Dach als glatte Fläche ist die größte
einzelne Schwachstelle — es ist die zweitgrößte sichtbare Fläche am Haus und trägt
sonst keinerlei Maßstab.

### 🚗 Dritter Durchgang: Zierrat an den Fahrzeugen

Speichenfelgen, Radläufe, Chrom-Zierleiste, Türfugen mit Griffen, Kühlergrill, runde
Scheinwerfer mit Chromring. Der Zierrat sitzt in `_wagen()`, damit jede Verbesserung
sofort allen vier zugutekommt — die Form steckt allein im übergebenen Seitenprofil.
Speichen sind dabei der Unterschied zwischen „Rad" und „schwarze Scheibe": eine glatte
Felge liest sich aus jeder Entfernung als Loch.

> 🛞 **Der Radlauf brauchte drei Anläufe** — er steht hier, weil das Muster übertragbar
> ist. (1) Ein Rohr bei y = Breite/2 + 0,01 mit r = 0,045 ragte 5,5 cm heraus und stand
> als **Drahtbügel neben** dem Wagen. (2) Neun tangential gedrehte Quader lasen sich als
> **Zackenkranz**, weil jedes Segment eine eigene Silhouette hat — und beim ersten
> Versuch stand das Vorzeichen der Drehung falsch (ein um y mit `ry` gedrehter Quader
> legt seine lange Achse auf `(cos ry, −sin ry)`; tangential heißt `(−sin a, cos a)`,
> also `ry = −(a + π/2)`). (3) Wieder ein Rohr, aber **halb im Blech**: Mitte 4,5 cm
> innerhalb der Flanke, Querschnitt 6 cm, sichtbar bleiben 1,5 cm. Eine weiche
> durchgehende Wulst, wie an einem echten Kotflügel.

> ⚠️ **Radhaus-Scheibe unter dem Boden.** Die dunkle Scheibe hinter dem Reifen hatte
> Radius `r_rad + 0,05` auf Höhe `r_rad` — also 5 cm **unter** z = 0 (gemessen zmin
> −0,050 bei allen vier Wagen). Sie zeigt nur den Spalt hinter dem Reifen und muss
> darum knapp **kleiner** als das Rad sein.

### 🔧 Fünf Fehler, die erst der Render gezeigt hat

* **Vier weiße Kisten.** Alle Häuser hatten denselben Materialsatz — Putz, Rahmen und
  Werkstein lagen zwischen 0,82 und 0,97 Helligkeit. Das ganze Relief aus Gesimsen,
  Gewänden und Balkonen war unsichtbar, weil es **keinen Kontrast zum Grund** hatte.
  Es lag nie an der Textur. Das ist die Antwort auf den alten Befund „Häuser zu simple
  Textur": jedes Haus braucht eine eigene Wandfarbe und nahezu weiße Zierglieder.
* **Die Wandfarbe kam nicht an.** `mat_bild` legt die Textur **direkt** auf Base Color
  und wirft die übergebene Farbe weg. Neuer Schalter `tint=True` hängt einen
  Multiply-Mix dazwischen. Ohne Schalter bleibt das alte Verhalten — deshalb mussten
  Charge 35/36 nicht neu gebaut werden.
* **Fenster als Vollplatte statt als Rahmen** — dieselbe Falle wie bei der Gaube in
  Charge 35. Und im zweiten Anlauf lag die Scheibe **innen in der Wand**, die kein Loch
  hat: durch die Rahmenöffnung sah man den Putz. Jetzt steht das Fenster vor der
  Fassade, wie es bei vorkragenden Gewänden ohnehin richtig ist. `_rahmen()` legt immer
  vier Balken, nie eine Platte.
* **Die Platte deckte die Tafel zu — zum dritten Mal in derselben Charge.** Beim
  Ladenschild lag die Rahmenplatte vor der farbigen Tafel; im Render ein leeres weißes
  Brett. Merksatz für den ganzen Baukasten: *was hinten liegen soll, gehört nach hinten,
  und ein Rahmen sind vier Balken.*
* **Die Straße lag hinter den Häusern.** Im Straßenzug bei y = −6, aber die Schauseite
  ist +y: im Render sah man eine Häuserzeile und sonst nichts, die vier Wagen standen
  verdeckt dahinter.

---
## 1z5. Charge 36 — PARK- UND PLATZSCHMUCK (`models/th36_*.glb`)

Fortsetzung von Charge 35 mit denselben zwei Werkzeugen. Charge 35 hat das **Mobiliar**
eines Zierplatzes gebaut (Brunnen, Bank, Laterne, Balustrade); Charge 36 baut, was einen
ganzen **Park** ausmacht: ein Bauwerk zum Draufschauen, eine Brücke zum Drübergehen, eine
Einfriedung zum Reihen und die kleinen Dinge dazwischen.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th36_musikpavillon.glb` | 5,60 × 5,93 × 4,90 | 12 518 | achteckig, 8 Säulen, geschweiftes Dach, Treppe |
| `th36_zierzaun.glb` | **2,040** × 0,26 × 1,56 | 8 286 | Schmiedezaun, Speerspitzen, Volutenfries |
| `th36_bogenbruecke.glb` | 7,76 × 3,14 × 1,69 | 14 384 | Steinbogen, Docken, Flügelmauern |
| `th36_vogeltraenke.glb` | 0,75 × 0,74 × 1,00 | 2 542 | Drehkörper vom Fuß bis zum Rand, 2 Vögel |
| `th36_obelisk.glb` | 3,08 × 3,05 × 5,20 | 5 312 | gestufter Sockel, Bronzetafeln, Buchskranz |
| `th36_trinkbrunnen.glb` | 2,56 × 1,40 × 1,97 | 5 908 | Schweizer Dorfbrunnen, Trog + Stock |
| `th36_rondell.glb` | 3,00 × 3,00 × 1,12 | 36 600 | rundes Beet, Einfassung, Buchsrand |
| `th36_ensemble.glb` | 22,00 × 22,00 × 5,20 | 232 736 | **Kurpark**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th36_parkschmuck.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle acht: zmin = 0,000, Schauseite +y.

> 🧰 **`th_werkzeug.py` — gemeinsamer Werkzeugkasten.** `dreh()`, `rohr()`, `bogen_pkt()`,
> `volute_pkt()`, `box()`, `runden()`, `export()` liegen jetzt EINMAL da und werden von
> Charge 35 **und** 36 importiert. Vorher stand derselbe 200-Zeilen-Block in jeder Charge
> noch einmal — beim Gold-Fix hätte man ihn zweimal ändern müssen und die zweite Kopie
> vergessen. Charge 35 wurde nach dem Herauslösen neu gebaut: Dreiecke und Maße sind
> identisch (Brunnen 10 332 Tri, Ensemble 215 242 Tri), nur die GLB-Bytes unterscheiden
> sich — der glTF-Export nummeriert Materialien nicht reproduzierbar durch.

> ⚠️ **`th36_zierzaun` ist 2,040 breit, das Raster bleibt 2,000** — der Pfostenring kragt
> je Seite 0,02 aus. Aneinandergereiht überlappen sich zwei Module also um 0,04; gewollt,
> sonst klafft an der Fuge ein Spalt. Damit ist er mit `th35_balustrade` (Raster 2,00)
> mischbar: Stein und Eisen im selben Zug.

> ⚠️ **`th36_musikpavillon` ist in y NICHT zentriert** (yM +0,165): die Zugangstreppe
> springt auf der Schauseite vor. Verankert wird am Achteck-Mittelpunkt, nicht an der Box.

### 🔧 Drei Fehler, die erst der Render gezeigt hat

* **Die Brücke schwebte.** Der Gehweg-Bogen startete auf z = 0,55 und endete damit 43 cm
  über dem Boden — dazu zwei runde Klötze als Widerlager, die aussahen wie vergessene
  Sockel. Eine Brücke muss am Ufer den Boden berühren, sonst ist sie eine Rampe ins
  Nichts. Jetzt Basis 0,14, Flügelmauern und Anschlussplatten.
* **Ein Rohr liegt mit seiner MITTE auf der Kurve.** Die Bogenlaibung auf z = 0,02 mit
  r = 0,16 tauchte 12 cm unter den Boden (zmin −0,123). Dieselbe Rechnung wie bei den
  Kugeln: die Achse gehört auf z = r.
* **Verstreute Erbsen, zum zweiten Mal.** Acht einzelne Laubkugeln im Kreis um den
  Obelisken — genau der Fehler, der in Charge 35 schon an der Sonnenuhr auftrat. Ein
  Buchskranz braucht so viele Ballen, dass sie sich **überlappen**; erst dann ist es eine
  Hecke und keine Streuung.

---
## 1z4. Charge 35 — ZIERWERK (`models/th35_*.glb`)

Der Bestand war gut im **Bauen** und schwach im **Schmücken**: fast alles bestand aus
Quadern mit Bevel — und ein Quader mit Bevel bleibt ein Quader. Was einem Ort Schönheit
gibt, ist gekrümmt. Charge 35 baut genau das, mit zwei Werkzeugen, die es hier vorher
nicht gab.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th35_brunnen_zier.glb` | 3,32 × 3,32 × 2,56 | 10 332 | zweischaliger Zierbrunnen, 8 Fontänen |
| `th35_laterne_schmiede.glb` | 1,81 × 0,80 × 4,55 | 12 608 | Kandelaber, Stützvoluten, 2 Blumenampeln |
| `th35_torbogen.glb` | 4,60 × 0,80 × 3,85 | 23 672 | Schmiedetor, zwei Flügel, Bogenfüllung |
| `th35_pflanzschale.glb` | 1,23 × 1,22 × 1,16 | 30 150 | Zierschale auf Balusterfuß, überhängend bepflanzt |
| `th35_bank_zier.glb` | 1,83 × 0,64 × 0,98 | 8 320 | Gussbank, Volutenwangen, Holzlatten |
| `th35_pergola.glb` | 3,87 × 2,74 × 3,11 | 32 176 | Rosenpergola, Durchgang 2,00 × 2,20 |
| `th35_sonnenuhr.glb` | 1,24 × 1,24 × 1,62 | 3 604 | Balustersäule, Zifferblatt, Gnomon 47° |
| `th35_balustrade.glb` | **2,000** × 0,36 × 1,09 | 4 324 | 7 Balustren, **Raster x += 2,00** |
| `th35_ensemble.glb` | 17,20 × 17,20 × 4,55 | 215 242 | **Brunnenplatz**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th35_zierwerk.py` · Texturen aus `textures/th32`.
Alle neun Teile: zmin = 0,000, in x und y auf die Mitte zentriert, Schauseite +y.

### Die zwei neuen Werkzeuge

> 🛠️ **`dreh(profil, m, seg)` — Drehkörper.** Ein Profil aus `(radius, höhe)`-Punkten
> wird um die Z-Achse gedreht. Damit entstehen Schalen, Balustren, Vasen und Sockel in
> **einem** Stück. Eine Brunnenschale aus fünf gestapelten Zylindern zeigt fünf sichtbare
> Absätze; ein Drehkörper hat eine stetige Silhouette, und genau daran erkennt das Auge
> „gedrechselt" statt „gebastelt". Ein Profilpunkt mit r = 0 ist erlaubt — aber nur am
> Anfang oder Ende, mittendrin entstehen Flächen mit Nullbreite.

> 🛠️ **`rohr(punkte, r)` — Rundrohr entlang eines Linienzugs**, gebaut als Blender-Kurve
> mit `bevel_depth` und sofort zu Mesh gewandelt (glTF exportiert keine Kurven).
> `glatt=True` legt eine Bézier-Kurve mit AUTO-Griffen durch die Punkte: an geraden
> Segmenten sieht man jeden Knick, und ein Schmiedebogen mit Knick sieht aus wie ein
> Rohrschaden. Dazu `bogen_pkt()` für Rundbögen und `volute_pkt()` für Schnecken — deren
> Radius läuft **logarithmisch** nach innen, sonst wird aus der Volute eine Sprungfeder.

> ⚠️ **Drehkörper und Rohre dürfen NICHT durch `runden()`.** Sie sind bereits rund; ein
> zweiter Bevel auf einer 48-seitigen Schale erzeugt nur Fehlkanten und verdreifacht die
> Dreiecke. Beide Helfer setzen darum selbst das `nb`-Flag.

### 🔧 Fünf Fehler, die erst der Render gezeigt hat

* **Gold wurde schwarz.** `metallic 0,90` heißt: das Material zeigt fast nur Spiegelung —
  und ohne Environment-Map ist da nichts zu spiegeln. Die Kugeln am Brunnenrand sahen aus
  wie Oliven. Halbmetallisch (0,45) und heller, dann trägt die diffuse Farbe.
* **Ein Rohrende steht nicht auf `z − r`.** Der Bevelkreis liegt quer zur Tangente; läuft
  das Bein senkrecht aus, ist die Unterkante genau der Endpunkt. Erst z = 0,02
  (zmin 0,016), dann z = 0,032 (zmin 0,028) — die Bank schwebte beide Male. Jetzt enden
  die Beine auf 0,03 und stehen auf vier Fußplatten.
* **`volute_pkt` lag in der falschen Ebene.** Ohne den Schalter `ebene="yz"` stand die
  Volute der Bank quer zur Wange und blies deren Tiefe von 0,66 auf **1,70 m** auf.
* **Überhängende Pflanzen sind keine Linien.** Zwei Anläufe gescheitert: dicke Bögen nach
  außen (= fünf Henkel an einer Suppenterrine), dann dünne Rohre gerade nach unten
  (= Fransenvorhang aus grünen Stangen). Eine hängende Pflanze ist eine **Kette aus
  Blattballen**, die nach unten kleiner werden und seitlich auswandern. Rohre können das
  nicht.
* **Vier Balustraden auf einem Kreis** lasen sich wie vier vergessene Zaunstücke. Erst
  aneinandergereiht (Raster 2,00 → x = ±1, ±3, ±5) wird daraus eine Brüstung.

> 🧩 **`th35_ensemble` ist der Maßstabs-Test.** Ein Teil allein sieht immer gut aus; erst
> nebeneinander fällt auf, wenn die Bank zu klein oder die Laterne zu groß ist. Der Platz
> ist ausschließlich aus den acht Teilen zusammengesetzt.

> 📁 **Pfade kommen aus `__file__`**, nicht aus einem festen `/home`-Pfad. Charge 34 ließ
> sich in einem zweiten Arbeitsbaum nicht bauen, weil `OUT_GLB` fest verdrahtet war und
> ins falsche Verzeichnis schrieb.

---
## 1z3. Charge 34 — HAUS-BAUKASTEN (`models/th34_*.glb`)

Modulare Teile zum Häuserbauen. Der ganze Sinn der Charge ist **ein** Raster, damit
man ohne Nachmessen zusammensetzen kann.

```
Wandmodul      4,000 (x) × 0,300 (y) × 2,750 (z)   →  reihen:  x += 4,00
Geschossdecke  4,000 × 4,000 × 0,250
Geschosshöhe   2,750 + 0,250 = 3,000               →  stapeln: z += 3,00
Ecke           0,300 × 0,300 Pfeiler
```

Jedes Teil ist in x **und** y auf die Mitte zentriert, die Unterkante liegt auf z = 0.
Ein Wandmodul an (0,0) belegt x −2,00 … +2,00 und y −0,15 … +0,15. Die Wandflucht
ist damit y = 0; **außen ist +y** (three.js −z, die Schauseite).

| Datei | Maße (B×T×H) | Raster | Inhalt |
|---|---|---|---|
| `th34_wand_voll.glb` | **4,000** × 0,42 × **2,750** | x += 4,00 | Sockelband, Traufgesims |
| `th34_wand_fenster.glb` | **4,000** × 0,53 × **2,750** | x += 4,00 | Fenster 1,60 × 1,30 mit Laibung, Bank, Sturz, Sprossen |
| `th34_wand_fenster2.glb` | **4,000** × 0,53 × **2,750** | x += 4,00 | zwei schmale Fenster (Treppenhaus, Bad) |
| `th34_wand_tuer.glb` | **4,000** × 0,76 × **2,750** | x += 4,00 | Haustür 1,10 × 2,15, Zarge, Oberlicht, Griff, Stufe |
| `th34_wand_tor.glb` | **4,000** × 0,42 × **2,750** | x += 4,00 | Sektional-Garagentor 2,60 × 2,10 |
| `th34_ecke.glb` | 0,44 × 0,44 × **2,750** | Hausecke | Eckquaderung, Sockel, Gesims |
| `th34_decke.glb` | **4,000** × **4,000** × **0,250** | z += 3,00 | gedielte Platte mit Randbalken |
| `th34_dach_sattel.glb` | 4,04 × 4,44 × 1,73 | x += 4,00 | Satteldach-Abschnitt, First in x |
| `th34_dach_giebel.glb` | 4,39 × 0,36 × 1,70 | Abschluss | Giebeldreieck mit Lüftungsluke |
| `th34_treppe.glb` | 4,01 × 1,25 × 3,82 | eine Geschosshöhe | 17 Steigungen à 0,176, Handlauf |
| `th34_balkon.glb` | **4,000** × 1,61 × 1,75 | an ein Wandmodul | Brüstung, Handlauf, Konsolen |
| `th34_wand_schaufenster.glb` | **4,000** × 0,61 × **2,750** | x += 4,00 | Ladenfront, Markisenkasten, Sockel |
| `th34_erker.glb` | 2,94 × 1,30 × 3,17 | **vor** ein Wandmodul | dreiseitig, Kragsteine, eigenes Dach |
| `th34_gaube.glb` | 2,00 × 1,48 × 1,71 | **auf** die Dachfläche | Schleppgaube, Fenster, Sohlbank |
| `th34_dach_pult.glb` | 4,04 × 4,44 × 1,32 | x += 4,00 | Pultdach für Anbau, Garage, Carport |
| `th34_dach_flach.glb` | 4,10 × 4,10 × 0,92 | x += 4,00 | Flachdach mit Attika-Ring und Kiesfeld |
| `th34_kamin.glb` | 0,86 × 0,86 × 2,25 | frei aufs Dach | Schaft, Gesims, Krone, Abdeckplatte |
| `th34_beispielhaus.glb` | 8,64 × 5,93 × 9,15 | — | **fertig zusammengesetzt** aus den Modulen |

Generator: `tools/assets/mk_th34_hausbaukasten.py` · Texturen aus `textures/th32` (Fassade: `hausputz.png`).

> ⚠️ **Verankert wird am RASTER, nicht an der Bounding-Box.** Bei Fensterbank, Gesims
> und Türstufe springt die Box über das Raster hinaus (Türmodul 0,76 statt 0,30 tief) —
> wer auf die Box-Mitte zentriert, verschiebt die Wandflucht.

> ⚠️ **Zwei Teile haben zmin < 0** — `th34_balkon` (−0,605) und `th34_erker` (−0,545).
> Das ist Absicht: beide werden an der Geschossdecke montiert, ihre **Oberkante** ist
> der Bezugspunkt, die Kragsteine greifen darunter an die Fassade. Alle anderen 16
> Teile stehen exakt auf z = 0.

> 📐 **Setzhöhen der Aufsätze — nicht raten, ausrechnen.** Die Dachneigung liegt einmal
> im Generator als `DSP, DHH = 4,40, 1,70` → `DNEIG = 0,7727` (37,7°); vorher stand sie
> dreimal als Literal da. Die **Gaube** ist an ihrer **vorderen Unterkante** verankert
> (y = 0 ist die Traufseite, der Körper liegt bei negativem y, dachaufwärts); die
> Wangen sind unten auf `DNEIG` angeschnitten. Setzt man sie an y_traufe, ist die Höhe
> `z_dach + DHH · (1 − |y_traufe| / (DSP/2))`. Im Beispielhaus: y = −1,90 → z = 6,232.
> Mit der geratenen Zahl 6,30 steckte sie 0,55 m **im Dach**, sichtbar blieb nur das
> Gaubendach als Platte auf der Ziegelfläche.

> ⚠️ **`th34_dach_flach` ist 4,10 breit, das Raster bleibt 4,000.** Die Attika kragt je
> Seite 0,05 aus. Aneinandergereiht überlappen sich zwei Flachdächer also um 0,10 —
> gewollt, sonst klafft an der Fuge ein Spalt. Anker ist wie überall die Rastermitte.

> 🧩 **`th34_beispielhaus` ist die Bauanleitung UND der Raster-Test.** Es ist nur aus
> den dokumentierten Schritten zusammengesetzt (x += 4,00, z += 3,00), ohne eine
> einzige Sonderzahl. Bliebe an einer Ecke oder einem Geschossstoß eine Fuge, wäre
> die Maßangabe falsch. Gemessene Höhe 7,73 = 2 × 3,00 + 1,73 Dach — genau wie
> gerechnet. Wer den Kasten benutzt, kann den Aufbau dort ablesen:
>
> ```
> Süd  y = -2, rot π      Nord y = +2, rot 0
> West x = -4, rot π/2    Ost  x = +4, rot -π/2
> Ecken (±4, ±2) · Decken (±2, 0) auf z = 2,75 und 5,75
> Dach  (±2, 0) auf z = 6,00 · Giebel (±4, 0) quer dazu
> ```
>
> 🔧 Neun Fehler, die erst die Messung bzw. der Render gezeigt hat — alle behoben:
> * **Zargen und Randbalken waren höher als ihr Bauteil, saßen aber auf dessen Mitte**
>   und ragten dadurch unter den Boden (zmin −0,151 / −0,130 / −0,010).
> * Die **untere Türfüllung** stand bei z = 0,13 und war 0,56 hoch — sie hing unter der Tür.
> * Die Decke hatte **zwei überlappende Dielenschichten** (0,235…0,265 gegen Oberkante
>   0,250) und flimmerte gegen sich selbst.
> * Ein **C-Kommentar `/* */` im Python-Generator** — die Datei parste nicht mehr, und
>   ein „0 Tracebacks"-Check fing das nicht. `ast.parse` nach jeder Änderung fängt es.
> * **Jedes Modul rief selbst `neu()`**, was die Szene leert. Das Beispielhaus bestand
>   deshalb nur aus dem zuletzt gesetzten Teil (gemessen 4,00 × 1,61 — der Balkon).
>   Die Geometrie liegt jetzt in `_b_*`-Funktionen ohne `neu()`; `_modul()` exportiert
>   ein Einzelteil, `beispielhaus()` kombiniert dieselben Bauer zu einem Haus.
> * Der **Markisenkasten** des Schaufensters saß auf 2,945 und durchbrach damit die
>   Wandkrone von 2,750 — beim Stapeln hätte das Obergeschoss darauf gestanden.
> * Die **Stirnwand der Gaube** saß bei y = GT/2, also mittig zwischen den Wangen statt
>   vorne. Von der Schauseite las sich die Gaube als oben offene Kiste.
> * Die **Gaubenscheibe** war 0,10 tief und lag in einer 0,14 tiefen Vollwand — komplett
>   verdeckt. Eine Fensterwand ist ein **Rahmen** (Brüstung, Sturz, zwei Pfosten), nie
>   ein Vollquader mit einer Scheibe darin.
> * Die **Erkerkonsolen** waren zwei dünne Streben und lasen sich wie abgebrochene Beine;
>   die **Kaminkrone** stand nur auf zwei Pfosten und sah von vorn aus wie ein T. Beides
>   ist jetzt massiv bzw. ein Ring aus vier.
>
> 🧰 `keil_x(profil, cx, breite, mat)` extrudiert ein y-z-Profil entlang x und ersetzt
> drei handgeschriebene `from_pydata`-Blöcke (Pultfläche, Gaubenwangen, Kragsteine).
> **Es erzeugt UVs** — `from_pydata` legt keine UV-Ebene an, und ein Mesh ohne UVs zeigt
> eine Bildtextur als einfarbige Fläche (derselbe Fehler machte in Charge 32 das
> gestreifte Stationsdach knallrot).

---
## 1z2. Charge 33 — PARK-AUSSTATTUNG (`models/th33_*.glb`)

Das, was einem Freizeitpark neben den Fahrgeschäften fehlt. Bank, Laterne, Mülleimer,
Hecke und Brunnen gibt es bereits (th4/th5/th6) — hier steht nur, was es **noch nicht** gab.

| Datei | Maße (B×T×H) | Raster | Hinweis |
|---|---|---|---|
| `th33_warteschlange_modul.glb` | 4,26 × 0,52 × 1,19 | **x += 4,00** | Pfosten + durchhängender Gurt |
| `th33_parkzaun_modul.glb` | 4,14 × 0,34 × 1,79 | **x += 4,00** | Schmiedeeisen mit Goldspitzen |
| `th33_parklaterne.glb` | 2,4 × 0,7 × 5,4 | frei | 2 Leuchten, Wimpel, Blumenampeln |
| `th33_wegweiser.glb` | 2,4 × 2,4 × 3,5 | frei | 4 Schilder, gestaffelte Höhen |
| `th33_imbisswagen.glb` | 5,1 × 4,7 × 3,1 | Ausgabe auf +y | Markise, Theke, Menütafel, Räder |
| `th33_toilettenhaus.glb` | 7,3 × 5,3 × 4,5 | Eingänge auf +y | **echte Türöffnungen**, Piktogramme |
| `th33_parkplan.glb` | 3,7 × 1,0 × 3,6 | Karte auf +y | Übersichtstafel mit Leuchtband |
| `th33_kassenhaus.glb` | 4,2 × 4,2 × 4,7 | Schalter auf +y | Scheibe, Ablage, Preisschild |
| `th33_blumenrabatte.glb` | 4,0 × 2,2 × 0,9 | frei | 46 Blüten, unregelmäßig gesetzt |

Generator: `tools/assets/mk_th33_parkausstattung.py` · Texturen aus `textures/th32`.

> ⚠️ **Bei den beiden Modulen ist das Raster 4,000 m, die Bounding-Box aber größer**
> (4,26 bzw. 4,14). Der Pfosten steht **nur am linken Modulende** und ragt mit seinem
> halben Fuß darüber hinaus. Erst hatte jedes Modul beide Enden — aneinandergereiht
> standen dann zwei deckungsgleiche Pfosten auf jeder Fuge und flimmerten gegeneinander.
> Anker ist die Rasterlinie, **nicht** die Box-Mitte.

> ⚠️ **`box()` setzt die Skalierung bereits auf die Bauteilmaße** — wer sie danach
> nachjustiert, muss **multiplizieren**. Ein `o.scale[1] = 1.9` machte aus dem
> Warteschlangen-Gurt ein 1,9 m dickes Brett (gemessen: Modul 1,90 m tief statt 0,52).

---

## 🧍 Menschenmengen aus den NPC-Modellen — die Skinned-Clone-Falle

Für `neon-park.html` werden ~78 Besucher aus `npc_*.glb` gebaut. Dabei ist eine Falle,
die **jede** Session trifft, die Figuren vervielfältigen will:

> ⚠️ **Die NPC-Modelle sind SkinnedMeshes. `Object3D.clone()` kopiert das Skelett nicht mit.**
> Die Klone zeigen weiter auf die Knochen der Vorlage — hängt die nicht in der Szene,
> werden ihre Weltmatrizen nie aktualisiert und die Geometrie kollabiert. Symptom: der
> Gast steht in den Daten korrekt (2 SkinnedMeshes, `visible=true`, Größe 1,97 × 1,72)
> und ist **trotzdem unsichtbar**. Kein Fehler in der Konsole.
>
> Ohne `SkeletonUtils` ist der saubere Weg, die **Ruhepose einmal in ein statisches Mesh
> zu backen** und das zu klonen (`entskinnen()` in `neon-park.html`): pro Mesh ein
> `THREE.Mesh` mit derselben Geometrie, `applyMatrix4(n.matrixWorld)`, `frustumCulled=false`.
> Für Statisten, die man ohnehin nicht animiert, ist das die richtige Lösung — und billiger.

---
## 1z7. Charge 38 — BAUERNHOF (`models/th38_*.glb`)

Im Spiel steht seit langem ein Bauernhof-Wegweiser bei (−40 | −196), aber dort gibt es
nur ein einzelnes Gebäude. Diese Ladung macht daraus einen Hof.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th38_scheune.glb` | 14,60 × 9,73 × 9,60 | 5 784 | rotes Blech, Satteldach, Schiebetor mit Andreaskreuz, Heuluke im Giebel |
| `th38_silo.glb` | 4,56 × 4,40 × 11,20 | 3 760 | Drehkörper mit Ringsicken, Kuppel, Leiter, Auslaufklappe |
| `th38_traktor.glb` | 3,42 × 1,96 × 2,49 | 4 284 | Stollenreifen, Überrollbügel, Auspuff, Front auf **+x** |
| `th38_heuballen.glb` | 3,62 × 1,31 × 2,26 | 3 420 | Rundballen-Stapel 3 + 2, Wickelbänder |
| `th38_weidezaun.glb` | 2,73 × 0,30 × 1,26 | 952 | Rundpfosten, drei Querlatten, Strebe, **Raster x += 2,50** |
| `th38_huehnerstall.glb` | 2,80 × 2,85 × 2,23 | 5 770 | Stelzen, Rampe, Einflugklappe, Legenester, Wellblechdach, Wetterhahn |
| `th38_futtertrog.glb` | 2,20 × 0,68 × 0,72 | 3 000 | Keilform auf Böcken, Heu im Trog |
| `th38_hoftor.glb` | 4,78 × 0,88 × 3,04 | 6 220 | zwei Steinpfeiler, Rundbogen aus `rohr()`, zwei Torflügel, Hofschild |
| `th38_hof.glb` | 30,00 × 30,00 × 11,20 | 38 940 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th38_bauernhof.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000. Der Traktor zeigt wie die Wagen aus Charge 37 mit der **Front
auf +x**. `th38_weidezaun` läuft auf demselben Raster von 2,50 m wie eine Steinmauer und
ist damit am selben Koppelrand mischbar.

> ⚠️ **Ein liegender Zylinder gehört auf z = r — und seine Bänder auf dieselbe Achse.**
> Beim Rundballen liefen die sechs Wickelbänder erst entlang **x**, also quer zur
> Ballenachse. Sie standen seitlich heraus und machten den Stapel **4,66 statt 3,60 m**
> breit. Und weil die Bänder Radius `R + 0,012` haben, tauchten sie unter den Boden,
> solange der Ballen auf `z = R` lag: die Auflage bestimmt der **größte** Radius, nicht
> der des Grundkörpers.

### 🔍 Vier Befunde, die nur der Kontaktbogen gezeigt hat

Die Messung meldete `AUFFAELLIG: 0`, bevor irgendetwas davon behoben war. Rendern und
Hinschauen ist die Abnahme, nicht die Maßliste — zum wiederholten Mal.

* **Gras waren Kugeln.** Je eine grüne Kugel r = 0,09 am Pfostenfuß von Weidezaun und
  Hoftor. Das liest sich als **Murmel**, nicht als Grasbüschel. Gras ist dünn und
  aufrecht — eine Kugel ist beides nicht. Jetzt fünf geneigte Kegelhalme (`_gras`).
* **Der Hahn war ein Ball.** Auf dem First des Hühnerstalls lag eine rote Kugel mit
  einem Kegelchen daneben, 1,2 cm über dem Wellblech **schwebend**. Ein Hahn braucht
  Silhouette: Beine, länglicher Rumpf, Hals, Kamm, Kehllappen, aufgestellter Schwanz
  (`_hahn`, rund 36 cm hoch). Erst damit erkennt man aus zwanzig Metern, was da steht.
* **Scheinwerfer über der Motorhaube.** Sie saßen auf z = 1,52 mit r = 0,13, die Haube
  endet aber bei 1,55 — Oberkante 1,65, also 10 cm darüber, dazu Leuchtstärke 2,4. Auf
  dem Bogen las sich das als zwei weiße Klötze, die vorne in der Luft hängen. Jetzt
  tiefer in die Haubenfläche, Chromtopf dahinter, Glas knapp davor, Stärke 1,4.
* **Fünf Eier im Futtertrog.** Fünf Kugeln r = 0,13 auf exakt gleicher Höhe sehen aus
  wie ein Gelege. Heu ist flach und struppig: gedrückte Haufen (Kugel auf z-Skala 0,44)
  plus einzelne Halme, die schräg über den Rand stehen.

> ⚠️ **Ein geneigter Kegel fällt unter seine Mitte.** Die neuen Grashalme sind um 0,30 rad
> gekippt; damit sinkt eine Kante der Grundfläche um `r·sin(0,30)` plus den Kosinusverlust
> der halben Höhe — gemessen zmin −0,01 bei Weidezaun, Hoftor und Hof. Der Aufschlag von
> 1 cm auf die Mittenhöhe fängt genau das ab. Alles, was gedreht wird, braucht diese
> Reserve: die Bounding-Box kennt die Rotation, das Bauchgefühl nicht.

---
## 1z8. Charge 39 — STRASSENAUSSTATTUNG (`models/th39_*.glb`)

Die Landstraße und ihre sechs Zubringer sind befahrbar, aber nackt: kein Vorfahrtsschild
an den Einmündungen, keine Leitpfosten am Bankett, keine Leitplanke am Hang, keine
Haltestelle. Genau das fehlt einer Straße, damit sie nicht als Asphaltband im Gras liest.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th39_vorfahrt.glb` | 0,90 × 0,18 × 2,30 | 220 | Dreieck auf der Spitze, roter Rand, Mast mit Fußplatte |
| `th39_ortstafel.glb` | 1,58 × 0,16 × 2,50 | 700 | Tafel auf zwei Masten, Schriftbalken, Klemmschienen |
| `th39_wegweiser.glb` | 3,39 × 0,40 × 3,05 | 904 | zwei Pfeilarme in Gegenrichtung, Schellen |
| `th39_leitpfosten.glb` | 0,20 × 0,16 × 1,00 | 380 | Flachprofil, Kopfband, Reflektor rot/weiß, Fußstein |
| `th39_leitplanke.glb` | 3,94 × 0,25 × 0,92 | 1 328 | W-Profil-Holm, Sigma-Pfosten, **Raster x += 4,00** |
| `th39_bushalt.glb` | 4,20 × 1,80 × 2,84 | 4 012 | Wartehäuschen, Glas in Vierbalken-Rahmen, Bank, Fahrplan, Haltemast |
| `th39_bake.glb` | 1,55 × 0,50 × 1,06 | 1 656 | rot-weißes Schrägstreifenbrett auf zwei Klappböcken |
| `th39_pylon.glb` | 0,35 × 0,35 × 0,76 | 612 | Drehkörper mit Sockel und zwei Reflexbändern |
| `th39_kreuzung.glb` | 24,00 × 24,00 × 3,05 | 16 082 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th39_strasse.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000. `th39_leitplanke` läuft auf Raster 4,00 m — für sich geschlossen,
nicht mit dem 2,50er Raster des Weidezauns aus Charge 38 mischbar.

> ⚠️ **Ein XYZ-Euler dreht zuletzt um z — und das ist fast nie die Achse, die man meint.**
> Das Vorfahrtsschild ist ein dreikantiges Prisma, mit `rot=(π/2,0,0)` aufgestellt. Um die
> Spitze nach unten zu bekommen, stand dort erst `rz = π`. Blender wendet einen XYZ-Euler
> in der Reihenfolge x, y, z an, das z kommt also **nach** dem Kippen und dreht die Tafel
> um die **Welt**-Hochachse: sie schaut danach nach hinten, die Spitze bleibt oben. Nach
> dem Kippen liegt die Tafelebene auf x-z, und in dieser Ebene dreht **y**. Mit einem
> Probeprisma nachgemessen statt weiter geraten:
>
> | Euler | höchster Punkt | tiefster Punkt | Lesart |
> |---|---|---|---|
> | `x90` | z +0,500 bei x 0 | z −0,250 | Spitze **oben** |
> | `x90 z180` | z +0,500 bei x 0 | z −0,250 | Spitze **oben** (nur weggedreht) |
> | `x90 y180` | z +0,250 | z −0,500 bei x 0 | Spitze **unten** ✔ |
> | `x90 y+90` | — | — | Spitze bei **x +0,500** (Pfeil nach +x) |
>
> Dieselbe Falle traf den Wegweiser: ein Pfeilkopf stand quer statt nach außen.

### 🔍 Weitere Befunde aus dem Kontaktbogen

* **Die Leitplanke schwebte über ihren eigenen Pfosten.** Der Holm saß auf 0,73 und reichte
  mit dem oberen Band bis 1,00 — die Pfosten waren 0,74 hoch. Ein Bauteil, das oben über
  seine Tragkonstruktion hinausragt, liest sich sofort als falsch. Holm auf 0,60, Pfosten
  auf 0,92.
* **Die Schrägstreifen der Bake standen 8 cm über das Brett hinaus.** Ein um `a` gekippter
  Quader braucht `h·cos a + b·sin a ≤ Bretthöhe` — nicht `h ≤ Bretthöhe`. Bei 0,40 hoch,
  0,20 breit und 0,62 rad sind das 0,44 auf einem Brett von 0,28.
* **Die Ortstafel las sich als Plakatwand.** 1,80 breit auf 2,18 Gesamthöhe ist ein Plakat;
  ein Straßenschild steht hoch über dem Bankett. Die Masthöhe ist der halbe
  Wiedererkennungswert.

---
## 1z9. Charge 40 — NUTZFAHRZEUGE UND ÖV (`models/th40_*.glb`)

Seit Charge 39 stehen zwei Wartehäuschen an den Zubringern — und es hält nichts daran.
Der einzige Bus im Spiel ist prozedural aus acht Quadern gebaut und fährt nur die
Südstraße.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th40_bus.glb` | 11,07 × 3,06 × 3,69 | 16 632 | Stadtbus, Fensterband mit Sprossen, zwei Falttüren, Zielanzeige, Klimakasten |
| `th40_postauto.glb` | 8,67 × 2,96 × 3,11 | 12 048 | Postbus, Gepäckklappen, Dreiklanghorn |
| `th40_kleinbus.glb` | 5,85 × 2,59 × 2,63 | 10 316 | Minibus, Schiebetürfuge, Dachreling |
| `th40_muellwagen.glb` | 8,46 × 3,01 × 3,16 | 12 464 | Fahrerhaus + Pressaufbau + Schüttung, Rundumleuchten |
| `th40_pritsche.glb` | 6,51 × 2,79 × 2,42 | 8 720 | Pritsche mit vier Bordwandklappen, Kistenladung |
| `th40_anhaenger.glb` | 5,08 × 2,28 × 1,79 | 5 532 | Kipp-Anhänger, Deichsel + Zugöse auf 0,92 — passt an `th38_traktor` |
| `th40_wohnmobil.glb` | 6,94 × 2,89 × 3,25 | 8 748 | Alkoven, Wohnraumfenster, Aufbautür, Dachluke |
| `th40_busbahnhof.glb` | 34,00 × 22,00 × 3,69 | 74 472 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th40_nutzfahrzeuge.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle acht: zmin = 0,000, **Front auf +x** wie die Wagen aus Charge 37 und der Traktor aus
Charge 38.

> 🛠️ **`keil_y` und `rad` stehen jetzt in `th_werkzeug.py`.** Beide standen seit Charge 37
> lokal in `mk_th37_stadt.py`. Ladung 40 sind wieder Fahrzeuge — statt zu kopieren sind sie
> ins gemeinsame Werkzeug gehoben. `mk_th37` führt seine eigenen Fassungen weiter (sie stehen
> nicht in seiner Importliste), damit an den fertigen Wagen aus Charge 37 nichts nachträglich
> anders wird.

> ⚠️ **ZUM FÜNFTEN MAL derselbe Fehler — und diesmal umgekehrt herum.** Bisher lautete die
> Lehre „ein Rahmen sind vier Balken, keine Platte davor" (Gaube 35, Fenster 37, Ladenschild
> 37, Klappe 38). Hier war es dasselbe Prinzip aus der anderen Richtung: **was man sehen soll,
> muss VOR dem stehen, was es umgibt.**
>
> Das Fensterband lag auf `br/2 − 0,03` mit 5 cm Tiefe, also von `br/2 − 0,055` bis
> `br/2 − 0,005` — **komplett innerhalb der Flanke**, während die Pfosten mit `br/2 + 0,02`
> davor standen. Im Render hatte **kein einziger der sechs Wagen Scheiben**, nur eine dunkle
> Fuge. Dasselbe beim Türglas hinter dem Türblatt, beim Wohnmobilfenster hinter dem Rahmen —
> und die Seitenscheiben der Fahrerhäuser waren mit `B − 0,24` schmaler als der Wagen und
> damit ganz im Blech versenkt.
>
> Merksatz für die nächste Ladung: bei jedem Glas die **Außenkante** ausrechnen und mit der
> Flanke vergleichen. `Mitte ± Tiefe/2` gegen `Breite/2` — zwei Zahlen, und der Fehler ist weg.

### 🔍 Zwei Maßfehler, die die Bounding-Box verraten hat

* **Die Spiegel bestimmten die Wagenbreite.** 0,41 m Überstand je Seite: der Bus maß damit
  3,38 statt 2,55. Ein echter Busspiegel steht rund 0,25 m ab.
* **Die Dachantenne legte den Maßstab fest.** 0,60 m hoch schob sie den Bus auf 3,88 m —
  und `bau()` skaliert im Spiel über die **Höhe**. Ein 60-cm-Stab hätte damit den ganzen Bus
  um 5 % geschrumpft. Alles, was oben dünn heraussteht, ist bei diesem Skalierverfahren
  teurer als es aussieht.

---
## 2a. Charge 41 — BAHNANLAGEN (`models/th41_*.glb`)

Am Gleis bei z = 112 steht seit langem ein Bahnhof — aber als Quaderkiste: Sockel,
Kasten, flache Dachplatte, Fenster als aufgeklebte Rechtecke, Bänke aus drei Boxen.
Genau der Zustand, in dem die Stadthäuser vor Charge 37 waren. Dazu fehlte dem
Bahnsteig alles, was einen Bahnsteig ausmacht.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th41_bahnhof.glb` | 24,60 × 13,14 × 12,25 | 35 424 | Sockel, Eckquaderung, Gesims, Satteldach mit Ziegelreihen, Rinne + 4 Fallrohre, Rundbogenfenster, Portal mit Vordach und Freitreppe, Bahnhofsuhr, Namensschild, 2 Kamine |
| `th41_bahnsteigkante.glb` | 6,00 × 3,60 × 0,58 | 3 240 | Kantenstein, Sicherheitsstreifen, Taststreifen, **Raster x += 6,00** |
| `th41_signal.glb` | 0,67 × 0,72 × 5,49 | 2 352 | Mast mit Steigleiter, drei Lichter mit Schirmen |
| `th41_prellbock.glb` | 1,93 × 2,00 × 1,26 | 2 048 | Untergurt, Schräge, Endpfosten, Prellbalken mit Warnfeld |
| `th41_fahrleitungsmast.glb` | 2,90 × 0,62 × 7,20 | 8 128 | Gittermast, Ausleger auf +x, Isolatoren |
| `th41_anzeigetafel.glb` | 2,66 × 0,32 × 3,11 | 1 564 | Abfahrtstafel auf zwei Masten, vier Zeilen, Gleisnummer |
| `th41_gepaeckkarre.glb` | 2,43 × 1,18 × 1,35 | 8 444 | Karre mit Rungen, Deichsel, drei Koffern |
| `th41_bahnsteigbank.glb` | 3,22 × 0,73 × 3,51 | 2 852 | Bank mit Lehne, Laterne daneben |
| `th41_bahnsteig.glb` | 44,00 × 30,00 × 12,25 | 102 224 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th41_bahn.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000.

> 🛤️ **Gleisgebundene Teile richten sich nach der GLEISACHSE x, nicht nach +y.**
> `th41_bahnsteigkante` läuft auf `x += 6,00`, der Ausleger von `th41_fahrleitungsmast`
> zeigt auf +x über das Gleis, und der Prellbalken von `th41_prellbock` zeigt auf −x
> (Gleisende). Nur die Teile mit einer echten Schauseite — Gebäude, Signal, Anzeigetafel,
> Bank — halten die übliche Regel „Schauseite auf +y". Das ist keine Ausnahme aus
> Bequemlichkeit: ein Bahnsteig ist entlang des Gleises gerastert, und ein Raster, das
> quer zur Verlegerichtung steht, ist keins.

> ⚠️ **Ein Dach ist ein KÖRPER, keine Sammlung von Platten.** Der erste Walm bestand aus
> vier geneigten Boxen. Die beiden Stirnplatten waren 10,1 × 11,8 m groß und standen im
> Render als schräge Bretter waagrecht aus dem Haus heraus — gemessene Gesamthöhe 12,77
> statt der geplanten 12,0. `keil_y` zieht den Giebelquerschnitt zu genau diesem Körper
> aus, **inklusive geschlossener Giebelflächen**. Der First soll auf x laufen, das Profil
> liegt aber in x-z: also einmal um z drehen, danach zeigt die Extrusionsachse auf x.
> Damit ist auch die Euler-Falle aus Charge 39 hier gar nicht erst im Spiel — eine
> Drehung um z lässt „oben" oben.

### 🔍 Was der Kontaktbogen gezeigt hat

* **Der Prellbock war zweimal ein Haufen Kanthölzer.** Erst mit `strebe()`-Schrägen und
  Querbalken darüber; dann mit 2,50 m langen Grundschienen, die rechts ins Leere liefen.
  Ein Prellbock liest sich als **geschlossenes Dreieck**: Untergurt, Schräge, Endpfosten.
  Was über die Ecken hinaussteht, macht daraus ein Gerüst.
* **Die Bahnsteigbank hatte den Laternenmast mitten in der Sitzfläche** — und die
  Wangenvolute schlug 2,30 m tief aus (als Bautiefe gemessen). Eine Bank erkennt man an
  Sitz und Lehne, nicht am Schnörkel.
* **Zwei Teile hatten keinen Kontrast.** Die Bahnsteigkante blieb eine glatte weiße Platte,
  weil Kantenstein und Sicherheitsstreifen (0,95) nur 0,4 heller waren als der Körper
  (0,55). Und der Prellbock blieb auch nach der Formkorrektur unleserlich, weil **alles
  daran denselben Braunton hatte**. Körper jetzt 0,40, Stahl 0,26. Das ist wörtlich die
  Lehre aus Charge 37 („vier weiße Kisten"): es liegt nie an der Textur, sondern daran,
  dass Grund und Zierglied gleich hell sind.

---
## 2b. Charge 42 — SCHULE UND PAUSENHOF (`models/th42_*.glb`)

Die Schule bei (−56 | 100) war eine Kiste: Sockel, Korpus, flache Dachplatte, Fenster als
aufgeklebte Rechtecke, ein Glockenturm aus zwei Quadern, und ein Pausenhof mit genau einem
Basketballkorb. Dieselbe Ausgangslage wie beim Bahnhof vor Charge 41.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th42_schule.glb` | 22,20 × 14,91 × 17,42 | 34 470 | Lisenen, Gurt- und Hauptgesims, Satteldach, Eingangsrisalit mit Freitreppe und Vordach, Schulschild, Dachreiter mit Glocke |
| `th42_turnhalle.glb` | 25,90 × 15,90 × 8,32 | 9 972 | Oberlichtband, Wandpfeiler, Lichtkuppeln, Tor, Sprossenwand außen |
| `th42_fahrradstaender.glb` | 3,36 × 1,23 × 2,44 | 3 048 | drei Anlehnbügel, Pultdach, **Raster x += 3,20** |
| `th42_basketballkorb.glb` | 1,86 × 1,90 × 3,76 | 4 248 | Ausleger, Brett mit Zielfeld, Ring, Netz |
| `th42_pausenhofdach.glb` | 8,40 × 5,47 × 3,48 | 3 348 | vier Stützen, Pultdach, Umlaufbank, Anschlagtafel |
| `th42_klettergeruest.glb` | 5,97 × 4,80 × 2,61 | 3 408 | Rahmen, Sprossen, Kletternetz, Rutsche, Fallschutzfläche |
| `th42_tischtennis.glb` | 2,74 × 1,81 × 0,92 | 2 268 | Betonplatte im Normmaß, Metallnetz |
| `th42_schulbank.glb` | 4,45 × 1,40 × 2,79 | 3 576 | Bank, Abfallbehälter, Baum mit Baumscheibe |
| `th42_schulhof.glb` | 52,00 × 44,00 × 17,42 | 87 162 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th42_schule.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000. `th42_klettergeruest` hat Boxmitte +0,58 — die Rutsche liegt auf
+x, das ist gewollt.

> ✅ **Was diesmal vorher richtig war.** Die vier teuersten Lehren der letzten Ladungen sind
> hier von vornherein eingebaut, und keine davon ist erneut aufgetreten: Dach als **Körper**
> (`keil_y`, um z gedreht — Charge 41), Glas **5 cm vor** der Wand (Charge 40), Rahmen aus
> **vier Balken** (Charge 35/37/38), und Wand (0,66) gegen Zierglied (0,95) mit **0,29
> Hellwertabstand** statt der 0,04, die in Charge 41 die Bahnsteigkante unsichtbar machten.
> Der Aufwand dafür ist ein Kommentar und eine Zahl; er hat vier Fehlerrunden gespart.

### 🔍 Was der Kontaktbogen trotzdem noch fand

* **Der Korbring stand senkrecht.** `zyl(rot=(π/2,0,0))` kippt die Zylinderachse von z auf y —
  richtig für ein Rad, falsch für einen Korbring: der hängt waagrecht, seine Achse bleibt auf
  z. Als senkrechte Scheibe vor dem Brett war er im Bild gar nicht zu erkennen. Und ein Ring
  ist ein **Rohr im Kreis**, keine Scheibe, sonst ist es ein Deckel.
* **Brett und Ring lagen auf −y**, also auf der abgewandten Seite — während der Dateikopf
  „Schauseite auf +y" vorschreibt. Eine Konvention, an die man sich in derselben Datei nicht
  hält, ist keine.
* **Das Dach des Fahrradständers war eine Pergola** — 1,50 tief auf 2,44 Höhe über drei
  Bügeln von 0,86. Ein Radunterstand deckt die Räder, nicht den Hof.

### 📐 Vier Maßbefunde, die die Messung fand

* **Ein Rahmen wird von der MITTE gerechnet.** Der Torrahmen der Turnhalle saß auf z = 1,90
  bei 3,90 Höhe — Unterkante damit −0,05. `z − h/2`, nicht `z`.
* **Gekippte Körper brauchen Aufschlag.** Die um 0,10 gekippten Füße der Tischtennisplatte
  messen `0,68·cos + 0,16·sin = 0,693` und endeten bei −0,007.
* **`bau()` setzt über den Ursprung, nicht über die Boxmitte.** Pausenhofdach (−0,73) und
  Schulbank (+0,54) hatten ihren Schwerpunkt weit daneben und wären im Spiel versetzt
  gelandet. Wer mehrere Dinge in ein Modul packt, muss sie um den Ursprung verteilen.
* **Die Fallschutzfläche war größer als das Gerät darauf** — r = 3,20 machte das
  Klettergerüst 6,40 breit.

---
## 2c. Charge 43 — FEUERWACHE UND TANKSTELLE (`models/th43_*.glb`)

Die letzten beiden prozeduralen Quaderbauten der Stadt: die Feuerwache bei (56 | 100) —
Sockel, Korpus, Dachplatte, Tore als Bretter auf der Wand, Schlauchturm aus einem Quader —
und die Tankstelle bei (92 | −74), deren Zapfsäulen drei Boxen sind. **Damit ist die Reihe
abgearbeitet, die mit den Stadthäusern in Charge 37 begann.**

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th43_feuerwache.glb` | 18,22 × 15,07 × 13,81 | 12 666 | zwei Rolltore in echten Öffnungen, Ecklisenen, Gesims, Satteldach, Wachschild, Blaulichter, Schlauchturm mit Lüftungslamellen und Pyramidendach |
| `th43_loeschfahrzeug.glb` | 7,67 × 3,02 × 3,24 | 16 796 | Rollladenkästen, Dachleiter, Blaulichtbalken, Haspel, Front auf **+x** |
| `th43_hydrant.glb` | 0,44 × 0,60 × 0,93 | 784 | Drehkörper mit zwei Abgängen |
| `th43_tankstelle.glb` | 14,40 × 7,86 × 5,06 | 4 216 | Kiosk mit Schaufenstern, Vordach auf vier Stützen mit Fundamenttellern, Deckenleuchten |
| `th43_zapfsaeule.glb` | 1,14 × 0,70 × 2,03 | 1 880 | Drehkörper, zwei Anzeigen, zwei Zapfventile mit durchhängendem Schlauch |
| `th43_preistafel.glb` | 1,94 × 0,62 × 5,20 | 1 492 | Totem mit Markenfeld und drei Preiszeilen |
| `th43_luftstation.glb` | 1,45 × 0,88 × 1,80 | 1 120 | Säule, Schlauchtrommel, Wassereimer |
| `th43_waschbox.glb` | 5,40 × 6,99 × 3,93 | 3 488 | drei Wandscheiben, Pultdach, Schwenkarm mit Lanze, Münzautomat |
| `th43_wachhof.glb` | 46,00 × 32,00 × 13,81 | 61 130 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th43_wache.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000, alle Boxmitten auf dem Ursprung.

> ⚠️ **Die Glasregel gilt auch senkrecht.** Galerie, Leiter und Blaulichtbalken des
> Löschfahrzeugs saßen auf z 2,72…3,06 — der Aufbau reicht aber bis `0,34 + 2,60 = 2,94`.
> Alles darunter steckte **im Dach**, von der Leiter war im Kontaktbogen nichts zu sehen.
> Das ist derselbe Fehler wie das versenkte Glas in Charge 40, nur um 90° gedreht:
> **Bauteilkante gegen Körperkante rechnen**, waagrecht wie senkrecht.

> ⚠️ **Eine Fahrbahnmarkierung gehört an den Ort, nicht ins Gebäude.** Zwei gelbe
> Ausfahrtsbahnen lagen im Feuerwachen-Modell. Sie machten es 20,97 tief statt 13,5 und
> hingen im Kontaktbogen als freischwebende Striche neben dem Haus. Was zum Grundstück
> gehört, wird beim Einbau gezeichnet — sonst schleppt jedes Exemplar den Vorplatz mit.

---
## 2d. Charge 44 — STADION UND SPORTPLATZ (`models/th44_*.glb`)

Der Sportpark bei (0 | 216) hat Schwimmbad, Tennishalle, Fitnessstudio, Eishalle,
Kletterhalle und einen Basketballplatz — aber keinen Sportplatz: kein Spielfeld, keine
Tribüne, kein Flutlicht, kein Tor. Dieselbe Lücke wie die Wartehäuschen ohne Bus in
Charge 39.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th44_tribuene.glb` | 13,54 × 7,90 × 8,06 | 23 428 | 8 Reihen Sitzschalen, Wangen, offenes Geländer, geneigtes Dach, seitlicher Aufgang, **Raster x += 12,00** |
| `th44_flutlichtmast.glb` | 3,40 × 1,58 × 17,63 | 15 412 | Gittermast, Steigleiter, Traverse mit acht Strahlern |
| `th44_tor.glb` | 7,44 × 2,00 × 2,50 | 1 608 | Pfosten, Latte, Netzbügel, Netz aus Maschen |
| `th44_ballfangzaun.glb` | 4,24 × 0,42 × 4,90 | 1 044 | Pfosten, drei Riegel, Netzfläche, **Raster x += 4,00** |
| `th44_spielstand.glb` | 5,30 × 0,62 × 5,60 | 1 728 | zwei Masten, Ziffernfelder, Spielzeit |
| `th44_ersatzbank.glb` | 6,23 × 1,87 × 1,86 | 2 832 | Tonnendach, Glas-Stirnwände, Sitzbank |
| `th44_sprunganlage.glb` | 14,23 × 3,34 × 0,18 | 1 728 | Anlaufbahn, Absprungbalken, Sandgrube mit Randsteinen |
| `th44_kasse.glb` | 3,70 × 3,31 × 3,09 | 2 852 | Schalterfenster mit Ablage, Schild, Vordach |
| `th44_stadion.glb` | 96,00 × 66,67 × 17,84 | 158 256 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th44_stadion.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000. Die Feldmarkierung liegt im Ensemble, nicht in den Bauteilen
(Lehre aus Charge 43).

> 🪜 **Der Querschnitt einer Tribüne IST eine Treppe.** `keil_y` zieht ihn zu einem Körper
> aus und liefert Auflager, Stirnseiten und Stufen in einem Zug. Aus gestapelten Quadern
> hätte jede Reihe eine eigene Silhouette und die Stirnseite wäre offen — derselbe Fehler
> wie das Plattendach in Charge 41. Dasselbe Werkzeug macht das Tonnendach der Ersatzbank:
> Profil als Bogen, extrudiert, einmal um z gedreht.

> ⚠️ **Ein Geländer ist DURCHSICHTIG.** Auf der Tribüne stand eine geschlossene Platte
> 12,00 × 1,10 als „Geländer", und weil sie oben auf der Sitzseite sitzt, verdeckte sie im
> Kontaktbogen die ganze Tribüne: zu sehen war eine Wand mit Dach, von den acht Reihen ein
> farbiger Strich. Pfosten und zwei Riegel — sonst ist es eine Brüstungsmauer.

### 📐 Und zweimal dieselbe Zahl, weil ich die erste Vermutung nicht nachgerechnet habe

Die Messung meldete an der Tribüne `zmin −0,21`. Ich habe die nächstliegende Stelle
geändert (die Wangen saßen tatsächlich auf halber Treppenhöhe statt auf ihrer eigenen) —
und danach meldete die Messung **denselben Wert**. Die Ursache war die unterste
Aufgangsstufe: `k·ST − ST/2 + 0,07 = −0,14`, minus halbe Dicke `= −0,21`.

Beide Stellen waren falsch, aber nur eine erklärte die Zahl. **Wer eine gemessene Zahl
korrigieren will, muss sie vorher aus der Vermutung ausrechnen können** — sonst repariert
man den nächstbesten Kandidaten und hält das Ergebnis für bestätigt, wenn die Zahl
zufällig verschwindet. Hier ist sie nicht verschwunden, und das war das Glück.

Dieselbe Klasse von Fehler steckte im Tor: der unterste waagrechte Netzstrang lag exakt auf
`z = 0` und ragte mit seinem Radius darunter — bei Rückwand und Seitennetzen gleichermaßen.

---
## 2e. Charge 45 — HAFEN UND STRAND (`models/th45_*.glb`)

Im Westen liegt seit langem ein Meer (200 × 340 bei x = −232), ein Sandstreifen bei
x = −128, eine Eisenbahnbrücke und ein Wendeplatz — aber nichts, was eine Küste ausmacht:
keine Kaimauer, kein Boot, kein Leuchtturm, kein Strandkorb. **340 m Ufer ohne einen
einzigen Gegenstand.**

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th45_kaimauer.glb` | 8,00 × 3,53 × 2,62 | 2 504 | Kranzstein, Reibhölzer, Reifenfender, zwei Poller, Steigleiter, **Raster x += 8,00** |
| `th45_hafenkran.glb` | 8,00 × 9,91 × 14,37 | 4 892 | Portal auf Schienen, Kranbrücke, Ausleger, Maschinenhaus, Gegengewicht, Haken |
| `th45_fischerboot.glb` | 9,00 × 3,14 × 5,20 | 3 104 | Rumpf aus `keil_y`, Ruderhaus, Mast, Netztrommel, Fender · **Tiefgang 0,55** |
| `th45_segelboot.glb` | 6,40 × 2,05 × 8,29 | 1 824 | Rumpf, Mast, Großsegel und Fock, Wanten · **Tiefgang 0,40** |
| `th45_leuchtturm.glb` | 6,00 × 6,00 × 19,44 | 5 964 | Drehkörper-Schaft mit roten Bändern, Galerie, Laternenhaus, Kuppel |
| `th45_container.glb` | 6,25 × 2,52 × 7,83 | 16 368 | drei Container versetzt gestapelt, Sicken, Eckbeschläge |
| `th45_strandkorb.glb` | 3,50 × 2,28 × 2,61 | 2 584 | Haube aus `keil_y`, Sonnenschirm, Handtuch |
| `th45_rettungsturm.glb` | 3,32 × 2,61 × 4,09 | 4 612 | Stelzen, Kanzel zur Wasserseite offen, Leiter, Rettungsring |
| `th45_hafen.glb` | 60,00 × 43,00 × 19,99 | 70 764 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th45_hafen.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000.

> ⚓ **TIEFGANG — die einzige Zahl dieser Ladung, die man beim Einbau braucht.**
> Die Boote stehen konventionsgemäß mit `zmin = 0` auf dem Boden, und `bau()` rechnet
> damit. Beim Platzieren müssen sie um ihren Tiefgang **gesenkt** werden, sonst schwimmen
> sie obenauf: Fischerboot **0,55**, Segelboot **0,40**. Die Zahl steht im Dateikopf, im
> Docstring des Bauteils und hier.
>
> Im Ensemble ist es andersherum gelöst: dort liegt nicht das Boot tiefer, sondern **alles
> andere um 0,55 höher**. Sieht gleich aus, hält `zmin = 0` ein.

> ⚠️ **Gekippte Körper brauchen Aufschlag — zum dritten Mal.** Die Stelzen des
> Rettungsturms sind um 0,06 nach zwei Achsen geneigt; ihre senkrechte Ausdehnung wächst
> dadurch von 2,50 auf 2,51 und die Unterkante landete bei −0,105. Dieselbe Rechnung wie
> bei den Bakenstreifen in Charge 39 und den Tischtennisfüßen in Charge 42:
> `h·cos a + b·sin a`, und dann von der Mitte aus prüfen.

---
## 2f. Charge 46 — BAUSTELLE (`models/th46_*.glb`)

Die Baustelle bei (−30 | 102) war der letzte Ort, an dem noch Quader Bauteile darstellten:
der Turmdrehkran ein Balken auf einem Balken, der Rohbau eine Kiste mit drei Platten darin,
der Bauzaun sieben durchscheinende Bretter.

| Datei | Maße (B×T×H) | Dreiecke | Inhalt |
|---|---|---|---|
| `th46_baukran.glb` | 4,10 × 24,77 × 26,52 | 25 440 | Gittermast, Drehkranz, Ausleger mit Fachwerk, Gegenausleger mit Ballast, Maschinenhaus, Kabine |
| `th46_rohbau.glb` | 12,41 × 9,40 × 11,44 | 9 512 | drei Geschossdecken, Stützen, Absturzsicherung, Bewehrung, Schalungstafeln, Treppenläufe |
| `th46_geruest.glb` | 2,58 × 1,64 × 7,34 | 2 888 | drei Lagen, Bohlen mit Fugen, Diagonalen, Bordbretter, **Raster x += 2,50** |
| `th46_bauzaun.glb` | 3,74 × 0,32 × 2,16 | 1 276 | Gitter aus Stäben in Rohrrahmen, Betonfüße, **Raster x += 3,50** |
| `th46_bagger.glb` | 6,75 × 2,82 × 3,73 | 9 992 | Raupenlaufwerk als Oval, Drehbühne, Kabine, angewinkelter Ausleger mit Löffel |
| `th46_baucontainer.glb` | 6,20 × 3,58 × 2,90 | 7 588 | Sicken, Fenster, Tür mit Außentreppe, auf Kanthölzern |
| `th46_materiallager.glb` | 6,80 × 3,69 × 1,20 | 6 872 | Ziegelpaletten, Rohrbündel, Sandhaufen, Schubkarre |
| `th46_mischer.glb` | 1,47 × 0,89 × 1,36 | 1 476 | Freifallmischer mit offenem Maul auf Gestell |
| `th46_baustelle.glb` | 42,00 × 32,00 × 26,52 | 93 060 | **Maßstabs-Test**, nur aus den Teilen oben |

Generator: `tools/assets/mk_th46_baustelle.py` · Werkzeug: `tools/assets/th_werkzeug.py`.
Alle neun: zmin = 0,000.

> 🏗️ **Der Ausleger liegt mittig über der Mastachse.** Der Kran ist so gebaut, dass das Spiel
> seinen Oberteil um `x = 0, y = 0` drehen kann: Ausleger auf +y, Gegenausleger auf −y.
> Ausmittig aufgehängt eierte er beim Schwenken.

> ⚠️ **Eine Raupenkette ist ein OVAL, kein Kreis.** Die Glieder lagen auf einem Kreis, und im
> Kontaktbogen sah das Laufwerk aus wie ein großes Zahnrad. Eine Kette hat zwei **gerade
> Trümmer** zwischen den Umlenkrollen und an den Enden je einen Halbkreis — genau die geraden
> Trümmer machen die Form aus, die man erkennt.
>
> Und die Glieder standen zunächst **radial**: `rotation_euler[1] = −a` legt die lange Achse
> nach außen, unten am Umlauf stand das Glied hochkant und ragte 0,17 statt 0,06 unter den
> Boden. Tangential heißt `ry = −(a + π/2)` — dieselbe Formel wie beim Radlauf in Charge 37,
> wo sie schon im Kommentar stand.

> ⚠️ **Der Mischertrommel fehlte die Öffnung.** Erst war sie mit r = 0,42 eine Kugel, die das
> Gerät verschluckte; schlanker blieb sie ein Ei. Ein Freifallmischer ist ein **Kegelstumpf
> mit weitem Maul**, und das dunkle Loch am oberen Ende ist das Merkmal, an dem man ihn
> erkennt — nicht die Rundung.

> ⚠️ **`kegel()` setzt die MITTE auf z, nicht den Fuß.** Der Sandhaufen lag mit `z = 0` und
> Höhe 0,90 von −0,45 bis +0,45. Ein Schüttkegel gehört auf `h/2`.

Die Boxmitte des Baggers liegt bei x +1,27: der Ausleger reicht nach vorn, und der Ursprung
gehört an die **Maschine**, nicht in die Mitte ihrer Bounding-Box — `bau()` setzt darüber.
Dieselbe Ausnahme wie beim Fahrleitungsmast in Charge 41.

---

---
## 🎡 Freizeitpark-Quartier in `traumhaus.html` — fertiger Einbau

**Das Quartier gibt es schon** (`viertel({name:"Freizeitpark", x:-190, z:158, w:170, d:92 …})`,
6 th13-Bauten) und daneben eine bereits in Ego-Perspektive fahrbare Achterbahn bei z = 234.
Es fehlen nur die neuen **th32**-Fahrgeschäfte — und die stünden dort **still**, weil der
Bau-Helfer `bau()` die glTF-Animationen verwirft. Zwei kleine Änderungen, beide unten:

**1) Die drei animierten Fahrgeschäfte in die `bauten:`-Liste des Freizeitparks:**
```js
{file:"th32_kettenkarussell.glb", h:15,  w:19, d:19, tuer:false},
{file:"th32_teetassen.glb",       h:8.6, w:17, d:17, tuer:false},
{file:"th32_piratenschiff.glb",   h:13,  w:20, d:13, tuer:false},
{file:"th32_parkeingang.glb",     h:14,  w:28, d:10, tuer:false},
```

**2) Damit sie sich auch drehen — in `bau()` (bei `GL.load`) den Mixer anlegen und in der
Hauptschleife takten.** Ohne das lädt das Modell zwar, bleibt aber stehen:
```js
// in bau(), direkt nach  var root=g.scene;
if(g.animations&&g.animations.length){
  var mx=new THREE.AnimationMixer(root);
  g.animations.forEach(function(a){mx.clipAction(a).play();});
  (window._glbMixer||(window._glbMixer=[])).push(mx);
}
// in der Hauptschleife, neben den Bewohner-Mixern:
if(window._glbMixer)for(var i=0;i<window._glbMixer.length;i++)window._glbMixer[i].update(dt);
```

### Quartier oder Portal? — **beides, aber getrennt**
Das *Quartier* ist der **Ort** (Kulisse, Landmarke, Lieferziel — steht schon in `LIEFERZIELE`).
Das *Koop-Spiel* `neon-park.html` gehört **hinter ein Portal**, nicht in die Datei hinein:

* **Andere Netz-Session.** traumhaus nutzt `MP.host("traumhaus")`, der Park `MP.host("park")`.
  Eine gemeinsame Sitzung hiesse, die komplette Park-Logik in traumhaus' Netzcode umzubauen.
* **Andere Steuerung.** Orbit-Bau-Kamera gegen Ego-Perspektive mit Pointer-Lock.
* **Grösse.** `traumhaus.html` hat bereits ~5900 Zeilen; ein zweites Spiel darin ist eine
  Wartungsfalle.
* **Der Park spricht das Stations-Protokoll schon** (`?station=1`, `stationPost("mini-back")`,
  `{t:"stationDone",score}`) — genau dafür gebaut. Ein Portal ist damit ein Schild plus
  Näherungs-Trigger, kein Umbau.

---
## 1w. Charge 26 — BERGWELT (`models/th26_*.glb`)

Ein eigenes Biom für die Openworld.

| Datei | Maße (B×T×H) | Hinweis |
|---|---|---|
| `th26_felswand_modul.glb` | **12,00** × 4,21 × **16,00** | **x += 12,00**, Bänder und Vorsprünge laufen durch |
| `th26_felsformation.glb` | 18,2 × 15,0 × 14,6 | verschachtelte Blöcke mit Verwitterungskanten |
| `th26_wasserfall.glb` | 27,2 × 24,0 × 14,0 | Felsschlucht mit Sturzbahn, Gischtring, Becken, Geröll |
| `th26_hoehleneingang.glb` | 23,5 × 25,7 × 11,7 | **begehbar**, Tropfsteine, dunkler Gang |
| `th26_berghuette.glb` | 16,6 × 16,6 × 6,0 | **begehbar**, Stube mit Ofen, Tisch, Bänken, Holzstapel |
| `th26_seilbahn_station.glb` | 20,6 × 33,3 × 11,5 | **begehbar**, Umlenkscheibe, Perron, Antriebsraum |
| `th26_seilbahn_gondel.glb` | 2,5 × 3,6 × 5,2 | 6 Personen, Aufhängung, Laufwerk |
| `th26_seilbahn_stuetze.glb` | 9,0 × 9,2 × 15,9 | Rollenbatterie, Leiter |
| `th26_haengebruecke.glb` | 8,2 × 29,9 × 5,2 | Tragseile, Holzbohlen, Seitennetze |
| `th26_gipfelkreuz.glb` | 9,0 × 8,0 × 9,1 | Steinsockel, Gipfelbuch-Kasten |
| `th26_bergsee.glb` | 30,5 × 26,2 × 7,1 | Uferfelsen, Schilf, Bootssteg |

Generator: `tools/assets/mk_th26_berge.py`

> 🔧 **Entkantung der Bergwelt (31.07.) — bitte die GLB/STL dieser Charge ersetzen.**
> Die Felsen waren achsparallele Quader (`kipp_box`) und Kegelstümpfe. Eine Kippung
> ändert daran nichts: die Silhouette bleibt eine Kiste, im Rudel sahen die Brocken
> aus wie ein Feld kleiner Zelte. Neu ist **`felskoerper()`** — eine Icosphäre, deren
> Punkte radial verrauscht werden, danach **exakt auf (sx, sy, sz) normiert**. Die
> Normierung ist der Kern: nur so bleibt ein Rastermaß erhalten und der tiefste Punkt
> liegt garantiert auf `z0`, ganz ohne `kipp_lift`-Rechnerei. Die Kippung wird in die
> **Punkte** gerechnet, nicht auf das Objekt gelegt — sonst wäre die Bounding-Box wieder
> unbestimmt. `seed` macht jede Form reproduzierbar, sonst wird jeder Lauf ein anderes
> Modell und die Diffs unlesbar.
>
> Fallen dabei:
> * **`runden()` darf Felskörper nicht anfassen.** Bevel + Auto-Smooth machen aus dem
>   facettierten Fels einen Kartoffel-Blob — die Facetten *sind* der Fels. Sie tragen
>   deshalb `nb` und werden nur flach schattiert.
> * **Blenders `subdivisions` zählt Stufen, nicht Flächen:** 1 → 20 Dreiecke, 2 → 80,
>   3 → 320. Mit „2" waren die Hauptblöcke rohe Achtzigflächner.
> * **Aufgesetzte Bänder und Kappen müssen mitschrumpfen.** Sie saßen auf der alten
>   Bounding-Box-Kante; an der schmaleren Flanke eines Felskörpers standen sie frei in
>   der Luft wie Regalbretter bzw. als Teller auf dem Gipfel.
> * Die drei Kluft-Quader sind ersatzlos weg — an einer unregelmäßigen Flanke standen
>   sie als Stangen **vor** dem Fels statt als Spalte darin.
> * `fels()` behält seine Signatur, damit Geröll, Bergsee, Gipfelkreuz, Wasserfall und
>   Höhle automatisch mitprofitieren. `seg` wird nur noch geschluckt.
Neuer Helfer: `kipp_lift(sx, sy, sz, rx, ry, rz)` — halbe Höhe eines gekippten Quaders
über die Rotationsmatrix, also genau der Betrag zum Anheben.

> ⚠️ **Nur `rx` gegenzurechnen reicht bei gekippten Quadern nicht.** Eine zusätzliche
> y-Kippung senkt die Ecke um `sx·|sin ry|` weiter ab. `kipp_lift()` nimmt die dritte
> Zeile der Rotationsmatrix und ist damit für jede Achsenkombination exakt.

> ⚠️ **Ein Felskessel aus freistehenden gekippten Blöcken liest sich als umfallende
> Platten.** Erst eine durchlaufende Wand mit einer Kerbe dazwischen ergibt eine
> Schlucht. Starke Kippungen machen es schlimmer, nicht besser.

---

## 1x. Charge 28 — CHARAKTERE (`models/th30_*.glb`)

Runde, organische Figuren. **Keine Quaderketten** — alles aus Kapseln und Ellipsoiden,
glatt schattiert. Blickrichtung wie bei allen Assets: Gesicht auf Blender +y = three.js −z.

| Datei | Maße (B×T×H) | Dreiecke |
|---|---|---|
| `th30_mensch_mann.glb` | 0,71 × 0,28 × **1,79** | 21 912 |
| `th30_mensch_frau.glb` | 0,63 × 0,27 × **1,69** | 22 640 |
| `th30_kind.glb` | 0,49 × 0,20 × **1,23** | 21 912 |
| `th30_arbeiter.glb` | 0,71 × 0,30 × **1,82** | 24 216 | Helm und Warnweste |
| `th30_hund.glb` | 0,32 × 1,17 × 0,72 | 15 668 |

Generator: `tools/assets/mk_th30_charaktere.py`
Neue Helfer: `kapsel()` (Zylinder plus zwei Halbkugeln zwischen zwei Punkten — für
Gliedmassen), `ellipsoid()`, `glatt()`, und `figur()`, das alle Masse als Anteil der
Gesamthöhe rechnet, damit Kind und Erwachsener dieselben Proportionen haben.

> ⚠️ **Organische Teile brauchen einen grösseren Smooth-Winkel.** Die 38° aus `runden()`
> lassen an Kapseln und Ellipsoiden die Facetten stehen — genau der Klotz-Eindruck, der
> hier vermieden werden soll. `glatt()` setzt 62°.

> ⚠️ **Getrennte Ellipsoide uebereinander ergeben einen geriffelten Michelin-Rumpf.**
> Erst ein durchgehendes, durch die Querschnitte geloftetes Mesh liest sich als Koerper —
> dieselbe Lehre wie bei Schiffsruempfen und Fahrzeugkarosserien. Dafuer gibt es hier
> `loft(schnitte, ...)`.

> ⚠️ **Ein Ellipsoid ueber dem Kopf durchdringt die Schaedelkugel** und hinterlaesst
> quer ueber dem Scheitel eine harte Kante. `kappe()` schneidet die Haare stattdessen
> auf Haaransatzhoehe ab und schliesst das Loch — der Rand liegt dann dort, wo er
> hingehoert.

**Offen an dieser Charge:** die Schulterpartie hat im Frontblick noch eine kantige
Silhouette, und die Figuren stehen in einer starren Ruhepose ohne Rig.

---

## 1y. Charge 30 — WAFFEN-PROPS (`models/th31_*.glb`)

Spiel-Requisiten im Action-Adventure-Stil, stilisiert und gerundet. Alle Handwaffen
liegen mit Klinge/Spitze auf **+y**, der Griff bei −y, Griffunterkante auf z = 0 —
so laesst sich das Modell direkt an eine Hand haengen.

| Datei | Maße (B×T×H) | Griffpunkt |
|---|---|---|
| `th31_schwert_ritter.glb` | 0,25 × 1,06 × 0,09 | (0, −0,125, 0,048) |
| `th31_schwert_kurz.glb` | 0,20 × 0,70 × 0,09 | (0, −0,10, 0,047) |
| `th31_axt_kampf.glb` | 0,33 × 0,86 × 0,07 | (0, −0,235, 0,038) |
| `th31_streitkolben.glb` | 0,15 × 0,62 × 0,15 | (0, −0,16, 0,074) |
| `th31_speer.glb` | 0,06 × 2,20 × 0,06 | (0, −0,17, 0,029) |
| `th31_bogen.glb` | 0,20 × 1,73 × 0,08 | (0,15, 0, 0,04) |
| `th31_koecher.glb` | 0,40 × 0,93 × 0,18 | (0,30, 0, 0,089) |
| `th31_armbrust.glb` | 0,66 × 0,93 × 0,17 | (0, −0,15, 0,077) |
| `th31_schild_rund.glb` | 0,75 × 0,20 × 0,75 | (0, −0,05, 0,375) |
| `th31_schild_wappen.glb` | 0,55 × 0,18 × 0,76 | (0, −0,06, 0,558) |
| `th31_zauberstab.glb` | 0,07 × 0,43 × 0,06 | (0, −0,13, 0,033) |
| `th31_magierstab.glb` | 0,22 × 1,87 × 0,21 | (0, −0,33, 0,098) |
| `th31_blaster.glb` | 0,08 × 0,46 × 0,24 | (0, −0,06, 0,081) |
| `th31_energieschwert.glb` | 0,07 × 1,11 × 0,07 | (0, −0,14, 0,035) |

Generator: `tools/assets/mk_th31_waffen.py`

**Bewusste Grenze:** Fantasy, historisch und Sci-Fi — keine masshaltigen oder
mechanisch korrekten Feuerwaffenteile, keine realen Modellbezeichnungen. Das Repo
exportiert jedes Modell auch als druckfertiges STL; stilisierte Props sind davon
unproblematisch, nachgebaute Waffenteile waeren es nicht.

---

## 1z. Rundungs-Durchgang an den Fahrzeugen

Fuenf Fahrzeuge waren Quaderketten und wurden auf geloftete Karosserien umgebaut:
`th7_lieferwagen`, `th7_lkw`, `th7_taxi`, `th9_stadtbus`, `th9_feuerwehr`.
**Bitte die alten GLB ersetzen.** Ausrichtung und Modulmasse sind unveraendert.

Dafuer gibt es in `mk_th9_landmarken.py` jetzt `karosse()` und `rprofil()`: `rprofil()`
liefert EINEN verrundeten Rechteck-Querschnitt mit fester Punktzahl, `karosse()` loftet
daraus ein Mesh — alle Masse duerfen Zahl **oder** Funktion von y sein, damit Front, Dach
und Taille flie&szlig;end ineinander uebergehen.

> ⚠️ **Nur mit konstanter Punktzahl je Querschnitt laesst sich loften.** Deshalb gibt
> `rprofil()` immer 4·(n+1) Punkte zurueck, auch wenn ein Radius null ist.

`th18_traktor` und `th18_anhaenger` sind ebenfalls umgebaut: gewoelbte Motorhaube,
Kabine mit geneigten Scheiben, Kotfluegel und Stollenreifen mit Felgen.

Beim Bagger sind Motorhaube und Kabine geloftet, beim Radlader die Motorhaube.

Kabine und Schaufel des Radladers sowie das Fahrerhaus des Betonmischers sind ebenfalls
umgebaut: die Schaufel ist ein mit `prisma_x()` extrudiertes Profil mit durchgezogenem
Boden und Zaehnen, die Kabinendaecher sind geloftet.

Auch der Baggerloeffel ist jetzt ein `prisma_x()`-Profil: Rueckwand, Woelbung, Bodenblech
und Schneide bilden EINEN Polygonzug (aussen hin, innen zurueck), die Wangen sind dasselbe
Profil schmal extrudiert und aussen davorgesetzt. Ein Kasten als Wange stand quer zur
Woelbung und sah aus wie eine Scheuklappe.

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

### Charge 5 — Stadtdetails (`textures/th28/*.png`)

| Datei | Wofür | `repeat` pro 20 m |
|---|---|---|
| `gehwegplatten.png` | Gehwege, Vorplätze | 10 |
| `fahrbahnmarkierung.png` | Fahrbahnen mit Mittellinie | 4 längs |
| `graffitiwand.png` | Unterführungen, Hinterhöfe, Bahnmauern | 4 |
| `rauputz.png` | Wohnhausfassaden | 6 |
| `rostblech.png` | Container, Schuppen, Baustelle | 6 |
| `dachpfannen.png` | Sattel- und Walmdächer | 8 |
| `badfliesen.png` | Bäder, Schwimmbad, Umkleiden | 20 |
| `auslegware.png` | Büros, Praxen, Hotelflure | 12 |
| `kopfstein_nass.png` | Altstadtgassen bei Regen | 8 |
| `gitterrost.png` | Stege, Roste, Industrieböden | 12 |

Generator: `tools/assets/mk_th28_texturen.py`

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
python3 tools/assets/mk_th21_baustelle.py # Baustelle -> models/th21_*.glb
python3 tools/assets/mk_th22_wohnen.py    # Wohnbauten -> models/th22_*.glb
python3 tools/assets/mk_th29_winter.py    # Winter/Weihnachtsmarkt -> models/th29_*.glb
python3 tools/assets/mk_th25_flughafen.py # Flughafen -> models/th25_*.glb
python3 tools/assets/mk_th26_berge.py     # Bergwelt -> models/th26_*.glb
python3 tools/assets/mk_th30_charaktere.py  # Charaktere -> models/th30_*.glb
python3 tools/assets/mk_th31_waffen.py    # Waffen-Props -> models/th31_*.glb
python3 tools/assets/mk_th28_texturen.py  # Stadtdetails -> textures/th28/*.png
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
