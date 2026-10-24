# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-10-24 04:28 UTC, Stand 2026-10-24 04:29 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **2'422**
- Optionen mit englischen Werten (Kandidaten): 280
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 1'483
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 13
- übersprungen «kleidungsstueck-im-wert»: 1

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

_keine_


## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

- `15450839777665` [Farbe] xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264: 120cm pink → 120 cm Pink; 120cm black → 120 cm Schwarz; 120cm navy blue → 120 cm Marineblau; 120cm grey → 120 cm Grau; 150cm pink → 150 cm Pink
- `15443497025921` [Farbe] smartwatch-activeone-fitness-anrufe-101440: Braun Aprikose Gelb → Braun-Aprikose-Gelb; Braun Aprikose Braun → Braun-Aprikose-Braun; Braun Aprikose → Braun-Aprikose
- `15447596302721` [Farbe] glanzendes-mini-kleid-mit-raffung-634500: Marineblaublau → Marineblau
- `15447598268801` [Farbe] damen-kleid-mit-puffarmeln-und-taillengurtel-613900: Marineblaublau → Marineblau
- `15447603413377` [Farbe] leinenhemd-kurzarm-loose-fit-fur-herren-613900: Marineblaublau → Marineblau
- `15447603806593` [Farbe] casual-loose-fit-t-shirt-mit-zwei-taschen-628400: Marineblaublau → Marineblau
- `15447603937665` [Farbe] herren-jacquard-polo-shirt-mit-reissverschluss-614101: Marineblaublau → Marineblau
- `15447604658561` [Farbe] polo-shirt-kurzarm-slim-fit-pique-baumwolle-615000: Marineblaublau → Marineblau
- `15447605510529` [Farbe] leinenhemd-langarmlig-fur-herren-624700: Marineblaublau → Marineblau
- `15447606198657` [Farbe] jacquard-polo-shirt-mit-reverskragen-602400: Marineblaublau → Marineblau
- `15447606428033` [Farbe] herren-langarmhemd-mit-revers-619700: Marineblaublau → Marineblau
- `15447606657409` [Farbe] leinenhemd-kurzarm-fur-herren-605000: Marineblaublau → Marineblau
- `15447889740161` [Farbe] sonnen-cape-im-retro-stil-617300: Black Lake Blue → Schwarz-Seeblau; Rose Red Black → Rosarot-Schwarz; White Color → Weiss; Light Blue Silver → Hellblau-Silber

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 4 Sitzungen · `15450836566401` led-wasserwellen-projektionsleuchte-677504 [Ausführung]: 3W-16color plug in square-1PC | 3W-16color plug in crown-3PCS | 3W-16color plug in crown-1PC | 3W-16color plug in square-2PCS | 3W-16color plug in crown-2PCS | 3W-16color plug in square-3PCS
- 1 Sitzungen · `15476000293249` a5-notizbuch-im-retro-stil-634100 [Ausführung]: A5 Loose Spiral Notebook-Tree Of Life Brownish Red | A5 Loose Spiral Notebook-Tree Of Life Gray | A5 Loose Spiral Notebook-Tree Of Life Green | A5 Loose Spiral Notebook-Smiling Sun Brown | A5 Loose Spiral Notebook-Smiling Sun Blue
- 1 Sitzungen · `15521235992961` damen-v-ausschnitt-trager-mehrlagiges-bedruckt-624900 [Farbe]: Foundation Flower | White Background Pink | Purple On White Background | Big Red Flower | Little Blue Flowers
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

`degrees` 101, `light` 57, `core` 52, `color` 47, `rope` 44, `⟨satzbau:adjektiv-vor-nomen⟩` 38, `lens` 38, `generation` 33, `no` 29, `shell` 28, `insert` 26, `crotch` 26, `of` 25, `batteries` 24, `bag` 23, `case` 21, `surface` 21, `tea` 20, `⟨satzbau:nomen-vor-farbe⟩` 20, `high` 19, `hat` 19, `number` 19, `face` 16, `gallium` 16, `nitride` 16, `electric` 16, `sunglasses` 16, `suit` 15, `handle` 15, `waist` 15, `blocking` 15, `stone` 14, `simple` 14, `mirror` 14, `carbon` 13, `promax` 13, `open` 13, `⟨satzbau:lehnwort-vor-nomen⟩` 13, `belt` 12, `iphone13` 12, `45se6` 12, `full` 12, `steel color` 12, `noodles` 12, `ski` 12, `gloves` 12, `to9mm` 11, `three` 11, `adjustable` 11, `storage` 11, `cat` 10, `mask` 10, `background` 9, `platinum` 9, `one` 9, `neck` 9, `monolever` 9, `watch` 9, `cup` 9, `powder` 9

