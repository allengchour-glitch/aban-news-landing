# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-10-09 13:22 UTC, Stand 2026-10-09 13:26 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **1'227**
- Optionen mit englischen Werten (Kandidaten): 50
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 242
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 2
- übersprungen «kleidungsstueck-im-wert»: 1

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

- `15449163432321` [Farbe] **Raw-Edge Jeansjacke im Old-Money-Stil** · 1 Sitzungen/30 T — hose, jacke: Blue Coat | Blue Pants

## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

- `15450839777665` [Farbe] xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264: 120cm pink → 120 cm Pink; 120cm black → 120 cm Schwarz; 120cm navy blue → 120 cm Marineblau; 120cm grey → 120 cm Grau; 150cm pink → 150 cm Pink
- `15443497025921` [Farbe] smartwatch-activeone-fitness-anrufe-101440: Braun Aprikose Gelb → Braun-Aprikose-Gelb; Braun Aprikose Braun → Braun-Aprikose-Braun; Braun Aprikose → Braun-Aprikose

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 10 Sitzungen · `15524878287233` herren-sneaker-mit-8-cm-plateausohle-610100 [Farbe]: Black, Hidden Elevator 8CM
- 6 Sitzungen · `15412918190465` blumen-maxikleid-fleurette-neckholder-mit-fishtail [Farbe]: Color
- 3 Sitzungen · `15412945289601` armbanduhr-rettangolo-rechteckig-unisex [Farbe]: Black Belt Black Shell | Brown With Black Shell | Black Belt Silver Case | Gray Belt Silver Case | Blue Ribbon Silver Case | Green Belt With A Black Shell
- 2 Sitzungen · `15447925916033` warme-touchscreen-handschuhe-fur-ski-und-velo-651900 [Farbe]: Gray And White Letters
- 1 Sitzungen · `15447580541313` kupfer-fusskettchen-unisex-verstellbar-633300 [Farbe]: Mosquito coil type | Red Copper
- 1 Sitzungen · `15521235992961` damen-v-ausschnitt-trager-mehrlagiges-bedruckt-624900 [Farbe]: Foundation Flower | White Background Pink | Purple On White Background | Big Red Flower | Little Blue Flowers
- 1 Sitzungen · `16603322122631` leichte-down-jacke-fur-damen-606100 [Farbe]: Delightful Red
- 1 Sitzungen · `15450839777665` xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264 [Farbe]: Short pink | Short black | Short navy blue | Short wine red | Short grey | 120cm red black grid
- 1 Sitzungen · `15446275588481` keramik-teedose-luftdicht-630100 [Farbe]: Type A Imitating Stone | Type A Alluvial Gold | A Spotted Yellow | Style A Spring Green | Type B Spot Yellow | B Style Spring Green
- 1 Sitzungen · `15450834469249` new-flame-aroma-diffuser-mit-flammeneffekt-620700 [Farbe]: Black Gift Remote Control-1PCS | White Gift Remote Control-1PCS | Black Gift Remote Control-2PCS | Black Gift Remote Control-3PCS | White Gift Remote Control-2PCS | White Gift Remote Control-3PCS
- 1 Sitzungen · `15453761372545` dehnbare-yoga-hose-aus-ice-silk-622700 [Ausführung]: 01Bleach Color-100 X 165CM -75D ice silk | 02Books White-100 X 165CM -75D ice silk | 03Light Blue-100 X 165CM -75D ice silk | 04Pink-100 X 165CM -75D ice silk | 05Gray-100 X 165CM -75D ice silk | 06Black-100 X 165CM -75D ice silk
- 1 Sitzungen · `15412945224065` herrenuhr-carre-minimalist-square [Farbe]: Silver Case Blue Face Blue | Silver Shell Brown | Gold Shell Black | Golden Shell Brown | Golden Shell Blue Blue | Gold Shell Blue
- 1 Sitzungen · `15449920995713` damenstiefel-aus-vollnarbenleder-mit-weicher-s-638700 [Farbe]: Wipe Gray
- 1 Sitzungen · `15447598072193` gestreiftes-langarm-hemdblusenkleid-622600 [Farbe]: Light Blue Embroidery
- 1 Sitzungen · `15448880939393` intelligentes-wecker-armband-mit-vibrationsala-620000 [Farbe]: Basic 2nd Generation
- 1 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `15448639897985` high-waist-yoga-shorts-fur-damen-118145 [Farbe]: Angola Red | Scarlett Red | Mocha Brown | Snowfield White | Ice Lotus Green | Matte Oat
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Big red | White shoe buckle | Black shoe buckle
- 1 Sitzungen · `15450856292737` reise-hangematte-aus-fallschirm-nylon-86eb20 [Farbe]: Sky + gray
- 1 Sitzungen · `15448115544449` damen-yoga-jumpsuit-mit-mock-neck-626800 [Farbe]: Black Without Chest Pad | Beige Without Chest Pad | Light Coffee Without Chest Pad | Black Chest Pad | Beige With Chest Pad | Light Coffee With Chest Pad
- 1 Sitzungen · `15517783097729` bedrucktes-midikleid-mit-weitem-faltenrock-627200 [Farbe]: Sugar Brown
- 1 Sitzungen · `15521250443649` geblumtes-a-linien-kleid-mit-ruschentragern-637900 [Farbe]: Blue Dyed | Fireworks Printing
- 1 Sitzungen · `16603337687431` koreanischer-oversize-polstermantel-621500 [Farbe]: Angora Red
- 1 Sitzungen · `15449569722753` eleganter-a-linien-maxi-rock-613900 [Ausführung]: Short stature | Regular style
- 1 Sitzungen · `15470351909249` ballet-style-halskette-624800 [Farbe]: Ballet Apple Chain

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 1 Sitzungen · `15450834469249` new-flame-aroma-diffuser-mit-flammeneffekt-620700 [Farbe]: Black Gift Remote Control-1PCS | White Gift Remote Control-1PCS | Black Gift Remote Control-2PCS | Black Gift Remote Control-3PCS | White Gift Remote Control-2PCS | White Gift Remote Control-3PCS | Set 1-1 Stück | Set 2-1 Stück
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Weiss | Königsblau | Rosa | Lila | Marineblau | Himmelblau | Big red | Hellgrau

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`generation` 31, `stone` 15, `suit` 13, `high` 12, `carbon` 12, `45se6` 12, `belt` 11, `to9mm` 11, `shell` 10, `ice` 9, `platinum` 9, `case` 8, `chain` 8, `⟨satzbau:adjektiv-vor-nomen⟩` 7, `moissanite` 7, `strap` 7, `gift` 6, `tea` 6, `chest` 6, `pad` 6, `no` 5, `milk` 5, `code` 4, `boxes` 4, `bag` 4, `color` 3, `alluvial` 3, `spring` 3, `ck` 3, `background` 2, `grid` 2, `imitating` 2, `spot` 2, `shoe` 2, `buckle` 2, `sugar` 2, `replenishment` 2, `strip` 2, `magnetic` 2, `ladder` 2, `eye` 2, `diamond` 2, `dark` 2, `plum` 2, `sweet` 2, `makeup` 2, `bucket` 2, `ribbon` 1, `hidden` 1, `elevator` 1, `letters` 1, `mosquito` 1, `coil` 1, `copper` 1, `foundation` 1, `on` 1, `little` 1, `delightful` 1, `spotted` 1, `antique` 1

