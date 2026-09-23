# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-09-23 20:36 UTC, Stand 2026-09-23 20:36 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **573**
- Optionen mit englischen Werten (Kandidaten): 42
- Optionen übersetzt: **3** · Werte übersetzt: **4**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 245
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 1
- übersprungen «kleidungsstueck-im-wert»: 1

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

- `15449163432321` [Farbe] **Raw-Edge Jeansjacke im Old-Money-Stil** · 1 Sitzungen/30 T — hose, jacke: Blue Coat | Blue Pants

## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

- `15449432555905` [Farbe] ems-bauch-und-muskel-trainer-b08b29: A Set1 → A Set 1; A Set2 → A Set 2; Red battery → Rot Batterie; Red battery set → Rot Batterie Set; Set2 → Set 2

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 7 Sitzungen · `15412918190465` blumen-maxikleid-fleurette-neckholder-mit-fishtail [Farbe]: Color
- 5 Sitzungen · `15412945289601` armbanduhr-rettangolo-rechteckig-unisex [Farbe]: Black Belt Black Shell | Brown With Black Shell | Black Belt Silver Case | Gray Belt Silver Case | Blue Ribbon Silver Case | Green Belt With A Black Shell
- 3 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 2 Sitzungen · `15412949451137` reed-diffuser-aroma-duftstabchen-ohne-flamme [Duft]: Blau – Ocean 150ml
- 2 Sitzungen · `15446275588481` keramik-teedose-luftdicht-630100 [Farbe]: Type A Imitating Stone | Type A Alluvial Gold | A Spotted Yellow | Style A Spring Green | Type B Spot Yellow | B Style Spring Green
- 1 Sitzungen · `15449432555905` ems-bauch-und-muskel-trainer-b08b29 [Farbe]: Full and Arms | Full and Pull out packaging | Sixbelly charging modelfull | Yellow arms | 10pcs Alternative gel | 5pcs Alternative gel
- 1 Sitzungen · `15449432588673` miniatur-shaver-fur-prazises-rasieren-698816 [Farbe]: Shaver 6blades-No
- 1 Sitzungen · `15450041319809` britische-stiefel-im-biker-stil-626000 [Farbe]: Color Matching
- 1 Sitzungen · `15524878287233` herren-sneaker-mit-8-cm-plateausohle-610100 [Farbe]: Black, Hidden Elevator 8CM
- 1 Sitzungen · `15447897407873` farbwechselnde-stoffmasken-mit-print-10er-set-620900 [Farbe]: Plum Blossom-10PCS | Cherry Blossom-10PCS | Arrow-10PCS | Plum Blossom 3D-10PCS | Cherry Blossom 3D-10PCS
- 1 Sitzungen · `15449577062785` herren-thermal-halsbund-pullover-602900 [Farbe]: Mo Blue
- 1 Sitzungen · `15452709552513` low-top-bergwanderschuhe-fur-alltag-sport-604500 [Farbe]: 25 July Color
- 1 Sitzungen · `15454047011201` elegante-strandkleidung-mit-blumenmuster-602000 [Farbe]: Blue Background | Yellow background pattern
- 1 Sitzungen · `15412945224065` herrenuhr-carre-minimalist-square [Farbe]: Silver Case Blue Face Blue | Silver Shell Brown | Gold Shell Black | Golden Shell Brown | Golden Shell Blue Blue | Gold Shell Blue
- 1 Sitzungen · `15448880939393` intelligentes-wecker-armband-mit-vibrationsala-620000 [Farbe]: Basic 2nd Generation
- 1 Sitzungen · `15412960592257` satin-seidenkissenbezug-2er-set-sanft-zu-haut-haar [Farbe & Grösse]: Gray-CK 51x102cm | White-CK 51x102cm | Green-CK 51x102cm
- 1 Sitzungen · `15448076976513` yoga-tanktop-mit-uberkreuztem-rucken-609800 [Farbe]: Camping Green | Swamp Green | Night Sea Color
- 1 Sitzungen · `15449430950273` katzen-hunde-bett-atmungsaktiv-reisebereit-583232 [Farbe]: Cherry
- 1 Sitzungen · `15449474204033` herren-pullover-aus-baumwolle-623900 [Farbe]: Round Neck Ice Crystal Blue | Round Neck Snow Gray
- 1 Sitzungen · `15450743439745` racing-carbon-plate-rebound-shock-absorption-s-156672 [Farbe]: Glacier
- 1 Sitzungen · `15449427280257` magnetische-led-wandlampe-mit-bewegungssensor-169776 [Farbe]: Ash 2pcs | Ash 4pcs | Walnut 2pcs | Walnut 4pcs | Ash 3pcs | Walnut 3pcs
- 1 Sitzungen · `15449427837313` vakuum-cupping-massage-mit-fettverbrennung-ant-364736 [Farbe]: Mix D packing-12speed charging-USB | Blue and 2black-6speed charging-USB | 2Blue and black-6speed charging-USB | Red and 2black-6speed charging-USB | 2Red and black-6speed charging-USB | 2Red and blue-6speed charging-USB
- 1 Sitzungen · `15450519503233` elegante-business-mid-heel-pumps-601400 [Farbe]: Black Light-34-8CM | Black Light-35-8CM | Black Light-36-8CM | Black Light-37-8CM | Black Light-38-8CM | Black Light-39-8CM
- 1 Sitzungen · `15450829914497` kabellose-2-in-1-glattburste-fur-schnelles-sty-599296 [Farbe]: LCD unpredictable blue | LCD unpredictable blue 2pcs | LCD unpredictable blue 3pcs
- 1 Sitzungen · `15448495391105` sport-yoga-set-mit-shorts-und-bra-869889 [Farbe]: Sour Orange Yellow | Scheler Green | Grilled brown | Milk white
- 1 Sitzungen · `15448639897985` high-waist-yoga-shorts-fur-damen-118145 [Farbe]: Angola Red | Scarlett Red | Mocha Brown | Snowfield White | Ice Lotus Green | Matte Oat
- 1 Sitzungen · `15449428885889` personalisierbarer-zugfreier-reflektierender-h-4ce320 [Farbe]: Black-Baby1 | Black-Baby2 | Blue-Baby1 | Blue-Baby2 | Blue and stars-Baby1 | Blue and stars-Baby2
- 1 Sitzungen · `15450743701889` md-trainingsschuh-mit-stossdampfung-308352 [Farbe]: White Blue Card | White, Blue And Red Combo | White Spot Blue
- 1 Sitzungen · `15450856292737` reise-hangematte-aus-fallschirm-nylon-86eb20 [Farbe]: Sky + gray
- 1 Sitzungen · `15475226247553` kuscheldecke-mit-halloween-print-611200 [Farbe]: White Skull Ghost | Bat Spider White | Pumpkin Ghost Skull White | Pumpkin Hat White | Elk White | Easter One
- 1 Sitzungen · `15447959241089` baumwoll-sweatshirt-mit-rundhals-und-langen-ar-604500 [Farbe]: Royal
- 1 Sitzungen · `15448661623169` nahtloses-feuchtigkeitsableitendes-yoga-top-600800 [Farbe]: Caramel Copper | Light Custard | Pearl Powder | Soft Fog Blue | Pine Green | Electric Blue
- 1 Sitzungen · `15449429016961` lederhandtasche-mit-mehreren-fachern-987200 [Farbe]: Rubber powder
- 1 Sitzungen · `15450828898689` thermo-strumpfhose-mit-fleece-futter-065536 [Farbe]: Black skin with feet-80g spring and autumn style | Black skin with feet-80grams plus size | Black skin with feet-220g fleece and thickened | Black skin with feet-220grams plus size | Black skin with feet-300g fleece thickened | Black and translucent footstep-80g spring and autumn style
- 1 Sitzungen · `15453809738113` lange-gerade-jeans-632600 [Farbe]: Light Medium Blue | Antique Dark Blue | Pitch Black
- 1 Sitzungen · `15470351909249` ballet-style-halskette-624800 [Farbe]: Ballet Apple Chain
- 1 Sitzungen · `15501902840193` radfahrer-schuhe-197504 [Farbe]: Road black | Road gray | Road blue | Mountain style black | Mountain grey | Mountain blue

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 1 Sitzungen · `15449432555905` ems-bauch-und-muskel-trainer-b08b29 [Farbe]: Pink | Rot | Full and Arms | A Set1 | A Set2 | Yellow1 | Pink1 | Full and Pull out packaging
- 1 Sitzungen · `15449428033921` lippenglanzstift-341696 [Farbe]: 1 Farbe | 2 Farben | 3 Farben | 4 Farben | 5 Farben | 6 Farben | 1 Farbe · 3 Stück | 1 Farbe · 5 Stück
- 1 Sitzungen · `15450857931137` mikrostrom-gesichtsmassagegerat-mit-doppelroll-903488 [Farbe]: Pink-USB-Standard | Weiss-USB-Standard | Pink-USB-Box | Weiss-USB-Box | Pink Set 1-USB-Box | Weiss Set 1-USB-Box
- 1 Sitzungen · `15449427280257` magnetische-led-wandlampe-mit-bewegungssensor-169776 [Farbe]: Ash 2pcs | Ash 4pcs | Walnut 2pcs | Walnut 4pcs | Set 1 | Set 2 | Set 3 | Set 4
- 1 Sitzungen · `15450829914497` kabellose-2-in-1-glattburste-fur-schnelles-sty-599296 [Farbe]: LCD Schwarz Englisch | LCD Weiss Englisch | Set | LCD Blau Englisch | LCD unpredictable blue | LCD Taro-Violett | Set 1 | Set 2
- 1 Sitzungen · `15450828898689` thermo-strumpfhose-mit-fleece-futter-065536 [Farbe]: Black skin with feet-80g spring and autumn style | Black skin with feet-80grams plus size | Black skin with feet-220g fleece and thickened | Black skin with feet-220grams plus size | Black skin with feet-300g fleece thickened | Black and translucent footstep-80g spring and autumn style | Black and translucent footstep-220g fleece and thickened | Black and translucent footstep-220grams plus size

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`skin` 61, `feet` 52, `light` 20, `220grams` 18, `spring` 13, `80grams` 12, `autumn` 10, `foot` 9, `shell` 8, `footstep` 8, `stepping` 8, `plush` 8, `baby1` 7, `baby2` 7, `translucent` 7, `case` 6, `alternative` 5, `gel` 5, `2black` 5, `2blue` 5, `2red` 5, `belt` 4, `blossom` 4, `color` 3, `alluvial` 3, `spot` 3, `full` 3, `cherry` 3, `ck` 3, `ash` 3, `walnut` 3, `unpredictable` 3, `stars` 3, `road` 3, `mountain` 3, `imitating` 2, `stone` 2, `antique` 2, `arms` 2, `plum` 2, `background` 2, `ice` 2, `3black` 2, `3blue` 2, `3red` 2, `skull` 2, `ghost` 2, `pumpkin` 2, `powder` 2, `2pcsblack` 2, `ribbon` 1, `tea` 1, `–` 1, `ocean` 1, `spotted` 1, `pull` 1, `out` 1, `sixbelly` 1, `modelfull` 1, `shaver` 1

