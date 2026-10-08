# Feinkatalog: Schuhe, saubere Trennung Spielzeug/RC, Oberklassen-Reste (08.10.2026, 10:00–11:00 UTC)

Betreiber 08.10.: «verbessere feinkataloge», danach «saubere trennung».

## 1. Schuhe: 5'646 standen in Shopify nur auf «Shoes»

**GEMESSEN** (Export 51'626 aktive, Tiefe der Shopify-Kategorie): Die grösste grobe Klasse im ganzen Katalog war
«Apparel & Accessories > Shoes» (aa-8) mit 5'646 Produkten. Bei Google ist «Shoes» das feinste Blatt. `kategorie_fein.py`
verfeinert nur über Google und kommt deshalb nie unter «Shoes»; der Shop-Filter «Kategorie» konnte Sneakers nicht von
Stiefeln oder Sandalen trennen. Shopify kennt 8 Schuhklassen plus 5 Kinderklassen.

**GETAN:** `schuhe_fein.py` ordnet nach dem Titelwort ein, erste Regel gewinnt. Kinderwort → Kinderzweig (Lauflernschuhe,
Kinderstiefel, Kindersandalen, Kindersportschuhe, Kindersneaker). Danach Hausschuh → Stiefel/Boots → Sandale (auch
Stiletto-Sandalette) → Sport/Lauf/Trekking → Loafer/Mokassin/Ballerina → Sneaker/Canvas/Freizeit → Absatz → flache Schuhe.
Zweideutige Fälle bleiben: Sicherheitsschuhe, Rollschuhe, Mules, «Slipper» ohne Zusatz. Das Werkzeug fasst nur aa-8 und
aa-8-11 an, eine schon feine Klasse nie; Google bleibt «Shoes». Kanarien 52/52 aus echten Titeln. Die Stichprobe von 48 zeigte
46 richtige Zuordnungen; die 2 Fehler wurden vor dem Schreiben behoben («verdeckter Absatz» = Herren-Erhöhung, «High-top
Loafer»). Plan 4'939, 707 bleiben. Täglich in der Kategorie-Kette des Aufsehers, damit auch Neuimporte erfasst werden.

## 2. Saubere Trennung: Spielzeug ist keine RC-Elektronik

**GEMESSEN:** Die CJ-Gruppe `cjspielelektronik` gab jedem Import den Typ «Spass-Elektronik» und die Tags `rc` und `gadgets`, auch
Klemmbausteinen, 3D-Holzpuzzles und Modellbausätzen. Dadurch waren **841 von 1'040 Produkten mit Tag `rc` nicht
ferngesteuert**, und die sichtbare Kollektion **«Spass-Elektronik & RC»** (Regel TAG=rc, 7 Kanäle, 1'446 Produkte) zeigte sie
alle. 614 Spielzeuge ohne jede Elektronik trugen den Typ «Spass-Elektronik». Die Kategorien selbst stimmten schon
(Building Toys 481/497, Puzzles, Remote Control Toys).

**GETAN:** Es gibt EINE Regeldatei `data/spielzeug_trennung.json` für Wächter UND Importer:
- Der Tag `rc` bleibt bei einem RC-Wort (ferngesteuert, RC, Drohne, Helikopter, DJI/FPV …) oder einem Elektronik-Wort, denn die
  Kollektion heisst «RC-Autos, Drohnen & Spass-Elektronik». Er fällt nur bei reinem Spielzeug weg.
- Der Typ «Spass-Elektronik» wird «Spielzeug & Spiele», wenn kein Elektronik-Wort vorkommt. Im Bestand muss zusätzlich die
  Kategorie unter Toys & Games liegen, beim Import ein Bau- oder Puzzlewort im Titel stehen.
- Kanarien 19/19; sie fingen ab, dass «Motor» in «**Motor**rad» als Elektronik galt, und dass elektrisches Spielzeug aus der
  Kollektion gefallen wäre.
- Der Importer `cj_category_fill.mjs` nutzt `spielzeugTrennung()` mit derselben Datei. Gleichlauf py=js über 1'040 Titel: 0 Abweichungen.
- Das Schreiben ist gebündelt (10 Produkte je Mutation plus 1 Rücklese-Abfrage). Einzeln waren es 3 Aufrufe je Produkt und
  ~7/min. Täglich im Aufseher.

## 3. Oberklassen-Reste mit Zweigwechsel (772 Einzelurteile)

**GEMESSEN:** 450 Produkte standen in Google UND Shopify nur auf «Electronics», 236 auf «Home & Garden > Decor», ~110 auf «Toys &
Games > Toys». `kategorie_fein` zählt sie als «einig», weil beide Seiten gleich grob sind. Die Runde vom 07.10. hatte die meisten
mit «bleibt» beurteilt (402 Electronics, 201 Decor): Die Prüfer durften nur INNERHALB der Oberklasse verfeinern, und ein
Food-Processor oder eine Waage hat unter «Electronics» keinen Platz.

**GETAN:** Drei Prüfer haben je ~258 Produkte beurteilt, mit erlaubtem Zweigwechsel. Jeder Pfad ist zeichengenau gegen die
Google-Taxonomie geprüft, Unklares bekam «?». Ergebnis: 772 Urteile, 733 mit Pfad, 39 «?», 0 ungültig. Den Grenzfall
«Zeitgesteuertes Regensystem» (vermutlich Terrarium) habe ich von Hand auf «?» gesetzt. Anwendung über
`kategorie_urteile_anwenden.py` mit Regel-Vorrang: 6 liess die tägliche Titelregel liegen (RC, Uhren …), geplant 727.
Taxonomie-Lücken (Version 2021): keine eigene Klasse für Küchenwaagen, Food-Processoren und Sterilisatoren → nächstpassende.

## Bewusst nicht angefasst
- 252 Sticker «Arts & Entertainment» (Shopify grob): Die Printful-Synchronisation setzt sie zurück, Google bleibt fein (siehe `rueckfall-grob`).
- 1'662 Produkte ohne Google-Kategorie: 1'561 davon sind Kostüme, absichtlich nicht im Google-Kanal.
- Die fünf Kollektionen «spielzeug-…» (Regel TYPE=Spielzeug) sind nicht im Onlineshop veröffentlicht.

## Nachmessung (08.10. 10:55 UTC)

| Messgrösse | vorher | nachher |
|---|---:|---:|
| Kollektion «Spass-Elektronik & RC» (alle / aktiv) | 1'446 / – | **726 / 466** |
| Produkte mit Tag `rc` (aktiv) | 1'040 | **309** |
| Typ «Spass-Elektronik» (aktiv) | 1'026 | **377** |
| Typ «Spielzeug & Spiele» (aktiv) | 655 | **1'304** |
| Oberklassen-Reste per Einzelurteil | 772 | **727 gesetzt / 0 Fehler** (Rücklesen 15/15), 39 «?», 6 Regel-Vorrang |
| Schuhe auf grobem «Shoes» | 5'646 | **4'939 gesetzt / 0 Fehler** (Rücklesen 20/20), 707 bleiben (zweideutig) |

**Nachbefund beim Messen:** Die RC-Kollektion hatte zusätzlich die Regel «Titel enthält ‹Bausteine›». Damit wären alle
Bausteine trotz entferntem Tag drin geblieben. Die Bedingung ist entfernt, die Altregel liegt in
`_spass_elektronik_regel_alt_2026-10-08.json`. Der Wächter meldet künftig jede Bau-/Puzzle-Titelregel in dieser Kollektion.
**Zweiter Nachbefund:** Bei Bau- und Puzzletiteln nennen «Helikopter», «Kamera», «Roboter», «Lasercut» und «Musik(dose)» meist
nur das MODELL. Für diese Titel zählen deshalb nur echte Elektronik-Merkmale (`rc_bau`/`el_bau`: Fernsteuerung, programmierbar,
Akku/USB, LED/Beleuchtung, Solar, Motor). Ergebnis: Kanarien 27/27, Gleichlauf 1'040/0, 23 Nachzügler gesetzt. Die
22 Restfälle in der Kollektion wurden erst Sekunden vorher umgetaggt; Shopify berechnet die Mitgliedschaft im Hintergrund nach.

**ENDSTAND 11:20 UTC:** Alle 4'939 Schuhe sind gesetzt (0 Fehler, Rücklesen 20/20). In der RC-Kollektion stehen jetzt 443 aktive
Produkte und **0 reine Bausteine/Puzzles**: Shopify hat die Mitgliedschaft nachgerechnet, die 22 Restfälle von 10:55 sind weg.
