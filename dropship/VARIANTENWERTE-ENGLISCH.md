# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-10-12 12:25 UTC, Stand 2026-10-12 12:28 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **632**
- Optionen mit englischen Werten (Kandidaten): 14
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 62
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 1

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

_keine_


## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

- `15450839777665` [Farbe] xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264: 120cm pink → 120 cm Pink; 120cm black → 120 cm Schwarz; 120cm navy blue → 120 cm Marineblau; 120cm grey → 120 cm Grau; 150cm pink → 150 cm Pink

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 7 Sitzungen · `15412918190465` blumen-maxikleid-fleurette-neckholder-mit-fishtail [Farbe]: Color
- 1 Sitzungen · `15476000293249` a5-notizbuch-im-retro-stil-634100 [Ausführung]: A5 Loose Spiral Notebook-Tree Of Life Brownish Red | A5 Loose Spiral Notebook-Tree Of Life Gray | A5 Loose Spiral Notebook-Tree Of Life Green | A5 Loose Spiral Notebook-Smiling Sun Brown | A5 Loose Spiral Notebook-Smiling Sun Blue
- 1 Sitzungen · `15521235992961` damen-v-ausschnitt-trager-mehrlagiges-bedruckt-624900 [Farbe]: Foundation Flower | White Background Pink | Purple On White Background | Big Red Flower | Little Blue Flowers
- 1 Sitzungen · `15450839777665` xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264 [Farbe]: Short pink | Short black | Short navy blue | Short wine red | Short grey | 120cm red black grid
- 1 Sitzungen · `15453761372545` dehnbare-yoga-hose-aus-ice-silk-622700 [Ausführung]: 01Bleach Color-100 X 165CM -75D ice silk | 02Books White-100 X 165CM -75D ice silk | 03Light Blue-100 X 165CM -75D ice silk | 04Pink-100 X 165CM -75D ice silk | 05Gray-100 X 165CM -75D ice silk | 06Black-100 X 165CM -75D ice silk
- 1 Sitzungen · `15412945224065` herrenuhr-carre-minimalist-square [Farbe]: Silver Case Blue Face Blue | Silver Shell Brown | Gold Shell Black | Golden Shell Brown | Golden Shell Blue Blue | Gold Shell Blue
- 1 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Big red | White shoe buckle | Black shoe buckle
- 1 Sitzungen · `15450836566401` led-wasserwellen-projektionsleuchte-677504 [Ausführung]: 3W-16color plug in square-1PC | 3W-16color plug in crown-3PCS | 3W-16color plug in crown-1PC | 3W-16color plug in square-2PCS | 3W-16color plug in crown-2PCS | 3W-16color plug in square-3PCS
- 1 Sitzungen · `15449569722753` eleganter-a-linien-maxi-rock-613900 [Ausführung]: Short stature | Regular style
- 1 Sitzungen · `15459741434241` nachtlicht-aus-holz-und-resin-600200 [Farbe]: Warm Light-6x 4 Inches | Warm Light-8x 5 Inches | Warm Light-10x6 Inches | White Light-6x 4 Inches | White Light-8x 5 Inches | White Light-10x6 Inches
- 1 Sitzungen · `15470351909249` ballet-style-halskette-624800 [Farbe]: Ballet Apple Chain

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Weiss | Königsblau | Rosa | Lila | Marineblau | Himmelblau | Big red | Hellgrau
- 1 Sitzungen · `15450836566401` led-wasserwellen-projektionsleuchte-677504 [Ausführung]: 3W-16color plug in square-1PC | 3W-16color plug in crown-3PCS | 3W-16color plug in crown-1PC | 3W-16color plug in square-2PCS | 3W-16color plug in crown-2PCS | 3W-16color plug in square-3PCS | 3 W-Set 1-1 Stück | 3 W-Set 2-1 Stück

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`light` 9, `⟨satzbau:adjektiv-vor-nomen⟩` 7, `16color` 7, `ice` 6, `color` 5, `loose` 5, `spiral` 5, `notebook` 5, `shell` 5, `tree` 3, `of` 3, `life` 3, `case` 3, `crown` 3, `6x` 3, `8x` 3, `ck` 3, `smiling` 2, `sun` 2, `background` 2, `grid` 2, `shoe` 2, `buckle` 2, `replenishment` 2, `brownish` 1, `foundation` 1, `on` 1, `little` 1, `01bleach` 1, `02books` 1, `03light` 1, `04pink` 1, `05gray` 1, `06black` 1, `face` 1, `tea` 1, `base` 1, `stature` 1, `regular` 1, `ballet` 1, `chain` 1, `cologne` 1, `gardenia` 1

