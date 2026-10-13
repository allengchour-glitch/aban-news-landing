# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-10-13 11:10 UTC, Stand 2026-10-13 11:11 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **1'850**
- Optionen mit englischen Werten (Kandidaten): 205
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 974
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 13

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

- 6 Sitzungen · `15412918190465` blumen-maxikleid-fleurette-neckholder-mit-fishtail [Farbe]: Color
- 2 Sitzungen · `15450836566401` led-wasserwellen-projektionsleuchte-677504 [Ausführung]: 3W-16color plug in square-1PC | 3W-16color plug in crown-3PCS | 3W-16color plug in crown-1PC | 3W-16color plug in square-2PCS | 3W-16color plug in crown-2PCS | 3W-16color plug in square-3PCS
- 1 Sitzungen · `15476000293249` a5-notizbuch-im-retro-stil-634100 [Ausführung]: A5 Loose Spiral Notebook-Tree Of Life Brownish Red | A5 Loose Spiral Notebook-Tree Of Life Gray | A5 Loose Spiral Notebook-Tree Of Life Green | A5 Loose Spiral Notebook-Smiling Sun Brown | A5 Loose Spiral Notebook-Smiling Sun Blue
- 1 Sitzungen · `15521235992961` damen-v-ausschnitt-trager-mehrlagiges-bedruckt-624900 [Farbe]: Foundation Flower | White Background Pink | Purple On White Background | Big Red Flower | Little Blue Flowers
- 1 Sitzungen · `15450839777665` xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264 [Farbe]: Short pink | Short black | Short navy blue | Short wine red | Short grey | 120cm red black grid
- 1 Sitzungen · `15453761372545` dehnbare-yoga-hose-aus-ice-silk-622700 [Ausführung]: 01Bleach Color-100 X 165CM -75D ice silk | 02Books White-100 X 165CM -75D ice silk | 03Light Blue-100 X 165CM -75D ice silk | 04Pink-100 X 165CM -75D ice silk | 05Gray-100 X 165CM -75D ice silk | 06Black-100 X 165CM -75D ice silk
- 1 Sitzungen · `15412945224065` herrenuhr-carre-minimalist-square [Farbe]: Silver Case Blue Face Blue | Silver Shell Brown | Gold Shell Black | Golden Shell Brown | Golden Shell Blue Blue | Gold Shell Blue
- 1 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Big red | White shoe buckle | Black shoe buckle
- 1 Sitzungen · `15449569722753` eleganter-a-linien-maxi-rock-613900 [Ausführung]: Short stature | Regular style
- 1 Sitzungen · `15459741434241` nachtlicht-aus-holz-und-resin-600200 [Farbe]: Warm Light-6x 4 Inches | Warm Light-8x 5 Inches | Warm Light-10x6 Inches | White Light-6x 4 Inches | White Light-8x 5 Inches | White Light-10x6 Inches
- 1 Sitzungen · `15470351909249` ballet-style-halskette-624800 [Farbe]: Ballet Apple Chain

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 2 Sitzungen · `15450836566401` led-wasserwellen-projektionsleuchte-677504 [Ausführung]: 3W-16color plug in square-1PC | 3W-16color plug in crown-3PCS | 3W-16color plug in crown-1PC | 3W-16color plug in square-2PCS | 3W-16color plug in crown-2PCS | 3W-16color plug in square-3PCS | 3 W-Set 1-1 Stück | 3 W-Set 2-1 Stück
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Weiss | Königsblau | Rosa | Lila | Marineblau | Himmelblau | Big red | Hellgrau

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`core` 52, `light` 43, `color` 39, `⟨satzbau:adjektiv-vor-nomen⟩` 38, `generation` 30, `shell` 28, `insert` 26, `of` 25, `batteries` 24, `case` 21, `bag` 21, `surface` 21, `high` 19, `number` 19, `hat` 17, `face` 16, `gallium` 16, `nitride` 16, `no` 15, `suit` 15, `handle` 15, `electric` 15, `stone` 14, `carbon` 13, `45se6` 12, `steel color` 12, `noodles` 12, `to9mm` 11, `belt` 11, `three` 11, `storage` 11, `cat` 10, `mask` 10, `background` 9, `chain` 9, `platinum` 9, `neck` 9, `monolever` 9, `watch` 9, `cup` 9, `lens` 9, `ports` 9, `feather` 9, `lingyun` 9, `ice` 8, `tea` 8, `regular` 8, `line` 8, `one` 8, `two` 8, `phoenix` 8, `16color` 7, `moissanite` 7, `strap` 7, `fan` 7, `diamond` 6, `milk` 6, `plum` 6, `protection` 6, `laser` 6

