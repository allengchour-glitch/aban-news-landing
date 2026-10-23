# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-10-23 06:14 UTC, Stand 2026-10-23 06:20 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **1'823**
- Optionen mit englischen Werten (Kandidaten): 94
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 536
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 2

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

_keine_


## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

- `15450839777665` [Farbe] xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264: 120cm pink → 120 cm Pink; 120cm black → 120 cm Schwarz; 120cm navy blue → 120 cm Marineblau; 120cm grey → 120 cm Grau; 150cm pink → 150 cm Pink
- `15443497025921` [Farbe] smartwatch-activeone-fitness-anrufe-101440: Braun Aprikose Gelb → Braun-Aprikose-Gelb; Braun Aprikose Braun → Braun-Aprikose-Braun; Braun Aprikose → Braun-Aprikose

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 4 Sitzungen · `15450836566401` led-wasserwellen-projektionsleuchte-677504 [Ausführung]: 3W-16color plug in square-1PC | 3W-16color plug in crown-3PCS | 3W-16color plug in crown-1PC | 3W-16color plug in square-2PCS | 3W-16color plug in crown-2PCS | 3W-16color plug in square-3PCS
- 1 Sitzungen · `15521235992961` damen-v-ausschnitt-trager-mehrlagiges-bedruckt-624900 [Farbe]: Foundation Flower | White Background Pink | Purple On White Background | Big Red Flower | Little Blue Flowers
- 1 Sitzungen · `15476000293249` a5-notizbuch-im-retro-stil-634100 [Ausführung]: A5 Loose Spiral Notebook-Tree Of Life Brownish Red | A5 Loose Spiral Notebook-Tree Of Life Gray | A5 Loose Spiral Notebook-Tree Of Life Green | A5 Loose Spiral Notebook-Smiling Sun Brown | A5 Loose Spiral Notebook-Smiling Sun Blue
- 1 Sitzungen · `15450839777665` xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264 [Farbe]: Short pink | Short black | Short navy blue | Short wine red | Short grey | 120cm red black grid
- 1 Sitzungen · `15443496927617` fitness-tracker-activeband-herzfrequenz-schrit-635800 [Farbe]: Rose Gold Steel Belt | Black Steel Belt Silicone Band | Silver Steel Strip | Black Magnetic Silicone Strap | Silver Magnetic Silicone Strap
- 1 Sitzungen · `15450851967361` augenbrauen-epilierer-5121f6 [Farbe]: Black usb charging color box | Blue usb charging color box | Red usb charging color box | Rose usb charging color box | White usb charging color box | Black charging color box 2PC
- 1 Sitzungen · `15453761372545` dehnbare-yoga-hose-aus-ice-silk-622700 [Ausführung]: 01Bleach Color-100 X 165CM -75D ice silk | 02Books White-100 X 165CM -75D ice silk | 03Light Blue-100 X 165CM -75D ice silk | 04Pink-100 X 165CM -75D ice silk | 05Gray-100 X 165CM -75D ice silk | 06Black-100 X 165CM -75D ice silk
- 1 Sitzungen · `15412945224065` herrenuhr-carre-minimalist-square [Farbe]: Silver Case Blue Face Blue | Silver Shell Brown | Gold Shell Black | Golden Shell Brown | Golden Shell Blue Blue | Gold Shell Blue
- 1 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `15443182813569` moissanit-ring-marquise-4ct-925-silber-625300 [Ausführung]: Code No Gold High carbon stone | Code No Platinum Gold High carbon stone | US Code No 8-Gold-High carbon stone | US Code No 8-Platinum gold-High carbon stone | Gold High carbon stone | Platinum Gold High carbon stone
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Big red | White shoe buckle | Black shoe buckle
- 1 Sitzungen · `15450828800385` e-ink-smartphone-hulle-mit-personalisierbarem-336320 [Farbe]: Black-Apple 15pro | Black-Apple 15Promax | Black-Apple 14 Promax | Gray-Apple 15pro | Gray-Apple 15Promax | Gray-Apple 14 Promax
- 1 Sitzungen · `15475226247553` kuscheldecke-mit-halloween-print-611200 [Farbe]: White Skull Ghost | Bat Spider White | Pumpkin Ghost Skull White | Pumpkin Hat White | Elk White | Easter One
- 1 Sitzungen · `15472044147073` retro-kariert-schal-608600 [Farbe]: Rice Coffee
- 1 Sitzungen · `15449569722753` eleganter-a-linien-maxi-rock-613900 [Ausführung]: Short stature | Regular style

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 4 Sitzungen · `15450836566401` led-wasserwellen-projektionsleuchte-677504 [Ausführung]: 3W-16color plug in square-1PC | 3W-16color plug in crown-3PCS | 3W-16color plug in crown-1PC | 3W-16color plug in square-2PCS | 3W-16color plug in crown-2PCS | 3W-16color plug in square-3PCS | 3 W-Set 1-1 Stück | 3 W-Set 2-1 Stück
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Weiss | Königsblau | Rosa | Lila | Marineblau | Himmelblau | Big red | Hellgrau

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`light` 31, `generation` 30, `batteries` 24, `of` 23, `bag` 21, `color` 19, `high` 19, `hat` 18, `gallium` 16, `nitride` 16, `electric` 16, `suit` 15, `handle` 15, `stone` 14, `promax` 13, `carbon` 12, `iphone13` 12, `45se6` 12, `steel color` 12, `to9mm` 11, `no` 9, `platinum` 9, `three` 9, `monolever` 9, `watch` 9, `cup` 9, `lens` 9, `ice` 8, `regular` 8, `16color` 7, `⟨satzbau:adjektiv-vor-nomen⟩` 7, `belt` 7, `strap` 7, `shell` 7, `tea` 7, `one` 7, `chain` 7, `moissanite` 6, `15promax` 6, `laser` 6, `rows` 6, `columns` 6, `infrared` 6, `obstacle` 6, `avoidance` 6, `storage` 6, `loose` 5, `spiral` 5, `notebook` 5, `case` 5, `face` 5, `15pro` 5, `diamond` 5, `milk` 5, `key` 5, `elephant` 5, `ber` 5, `lampshade` 5, `headlights` 5, `dual` 5

