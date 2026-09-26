# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-09-26 01:12 UTC, Stand 2026-09-26 01:17 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **2'424**
- Optionen mit englischen Werten (Kandidaten): 380
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 2'064
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kleidungsstueck-im-wert»: 16
- übersprungen «kollision-nach-uebersetzung»: 13

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

- `15449163432321` [Farbe] **Raw-Edge Jeansjacke im Old-Money-Stil** · 1 Sitzungen/30 T — hose, jacke: Blue Coat | Blue Pants
- `15447951835521` [Farbe] **Weihnachts-Hoodie für die ganze Familie** — hose: Dark Red Winter Fleece Lining-Crawling Suit 66 | Dark Red Winter Fleece Lining-Crawling Suit 73 | Dark Red Winter Fleece Lining-Crawling Suit 80 | Dark Red Winter Fleece Lining-Climbing Suit 90 | Dark Red Winter Fleece Lining-80cm | Dark Red Winter Fleece Lining-90cm | Dark Red Winter Fleece Lining-100cm | Dark Red Winter Fleece Lining-110cm
- `15447957733761` [Farbe] **Familien-T-Shirt im Partnerlook · Kurzarm mit Brusttasche** — hose, jacke: coat | coat-100 | coat-110 | coat-120 | coat-130 | coat-140 | coat-150 | coat-Female S
- `15447962091905` [Farbe] **Partnerlook Herbst Sweatshirts für Eltern & Kinder** — overall, pullover: Sweater Autumn-90cm | Sweater Autumn-100cm | Sweater Autumn-110cm | Sweater Autumn-120cm | Sweater Autumn-130cm | Sweater Autumn-140cm | Sweater Autumn-150cm | Sweater Autumn-Adult S
- `15447964516737` [Farbe] **Hoodie & Jogginghose Set im Partnerlook** — hose, pullover · Titel nennt Set: Gray Sweater | Gray Trousers | Grey Suit | Set1
- `15447969595777` [Ausführung] **Freizeit Cheongsam Familien-Set im China-Stil** — hose, oberteil, rock · Titel nennt Set: Men's top | Men's Shorts | Women's Shirt | Female Style Skirt | Green Cheongsam Suit

## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

- `15449432555905` [Farbe] ems-bauch-und-muskel-trainer-b08b29: A Set1 → A Set 1; A Set2 → A Set 2; Red battery → Rot Batterie; Set2 → Set 2; Set1 → Set 1
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

- 7 Sitzungen · `15412918190465` blumen-maxikleid-fleurette-neckholder-mit-fishtail [Farbe]: Color
- 5 Sitzungen · `15412945289601` armbanduhr-rettangolo-rechteckig-unisex [Farbe]: Black Belt Black Shell | Brown With Black Shell | Black Belt Silver Case | Gray Belt Silver Case | Blue Ribbon Silver Case | Green Belt With A Black Shell
- 2 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `15449428033921` lippenglanzstift-341696 [Farbe]: 1 3 6color | 1 4 5color | 1 4 6color | 1 5 6color | 1 3 5color
- 1 Sitzungen · `15449432555905` ems-bauch-und-muskel-trainer-b08b29 [Farbe]: Full and Arms | Full and Pull out packaging | Sixbelly charging modelfull | Red battery set | Yellow arms | 10pcs Alternative gel
- 1 Sitzungen · `15449432588673` miniatur-shaver-fur-prazises-rasieren-698816 [Farbe]: Shaver 6blades-No
- 1 Sitzungen · `15412949451137` reed-diffuser-aroma-duftstabchen-ohne-flamme [Duft]: Blau – Ocean 150ml
- 1 Sitzungen · `15446275588481` keramik-teedose-luftdicht-630100 [Farbe]: Type A Imitating Stone | Type A Alluvial Gold | A Spotted Yellow | Style A Spring Green | Type B Spot Yellow | B Style Spring Green
- 1 Sitzungen · `15524878287233` herren-sneaker-mit-8-cm-plateausohle-610100 [Farbe]: Black, Hidden Elevator 8CM
- 1 Sitzungen · `15412945224065` herrenuhr-carre-minimalist-square [Farbe]: Silver Case Blue Face Blue | Silver Shell Brown | Gold Shell Black | Golden Shell Brown | Golden Shell Blue Blue | Gold Shell Blue
- 1 Sitzungen · `15450834469249` new-flame-aroma-diffuser-mit-flammeneffekt-620700 [Farbe]: Black Gift Remote Control-1PCS | White Gift Remote Control-1PCS | Black Gift Remote Control-2PCS | Black Gift Remote Control-3PCS | White Gift Remote Control-2PCS | White Gift Remote Control-3PCS
- 1 Sitzungen · `15452709552513` low-top-bergwanderschuhe-fur-alltag-sport-604500 [Farbe]: 25 July Color
- 1 Sitzungen · `15448880939393` intelligentes-wecker-armband-mit-vibrationsala-620000 [Farbe]: Basic 2nd Generation
- 1 Sitzungen · `15449430950273` katzen-hunde-bett-atmungsaktiv-reisebereit-583232 [Farbe]: Cherry
- 1 Sitzungen · `15449474204033` herren-pullover-aus-baumwolle-623900 [Farbe]: Round Neck Ice Crystal Blue | Round Neck Snow Gray
- 1 Sitzungen · `15412960592257` satin-seidenkissenbezug-2er-set-sanft-zu-haut-haar [Farbe & Grösse]: Gray-CK 51x102cm | White-CK 51x102cm | Green-CK 51x102cm
- 1 Sitzungen · `15449427280257` magnetische-led-wandlampe-mit-bewegungssensor-169776 [Farbe]: Ash 2pcs | Ash 4pcs | Walnut 2pcs | Walnut 4pcs | Ash 3pcs | Walnut 3pcs
- 1 Sitzungen · `15450743439745` racing-carbon-plate-rebound-shock-absorption-s-156672 [Farbe]: Glacier
- 1 Sitzungen · `15450829914497` kabellose-2-in-1-glattburste-fur-schnelles-sty-599296 [Farbe]: LCD unpredictable blue | LCD unpredictable blue 2pcs | LCD unpredictable blue 3pcs
- 1 Sitzungen · `15448639897985` high-waist-yoga-shorts-fur-damen-118145 [Farbe]: Angola Red | Scarlett Red | Mocha Brown | Snowfield White | Ice Lotus Green | Matte Oat
- 1 Sitzungen · `15449427837313` vakuum-cupping-massage-mit-fettverbrennung-ant-364736 [Farbe]: Mix D packing-12speed charging-USB | Blue and 2black-6speed charging-USB | 2Blue and black-6speed charging-USB | Red and 2black-6speed charging-USB | 2Red and black-6speed charging-USB | 2Red and blue-6speed charging-USB
- 1 Sitzungen · `15449428885889` personalisierbarer-zugfreier-reflektierender-h-4ce320 [Farbe]: Black-Baby1 | Black-Baby2 | Blue-Baby1 | Blue-Baby2 | Blue and stars-Baby1 | Blue and stars-Baby2
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Big red | White shoe buckle | Black shoe buckle
- 1 Sitzungen · `15449429016961` lederhandtasche-mit-mehreren-fachern-987200 [Farbe]: Rubber powder
- 1 Sitzungen · `15450743701889` md-trainingsschuh-mit-stossdampfung-308352 [Farbe]: White Blue Card | White, Blue And Red Combo | White Spot Blue
- 1 Sitzungen · `15450856292737` reise-hangematte-aus-fallschirm-nylon-86eb20 [Farbe]: Sky + gray
- 1 Sitzungen · `15448115544449` damen-yoga-jumpsuit-mit-mock-neck-626800 [Farbe]: Black Without Chest Pad | Beige Without Chest Pad | Light Coffee Without Chest Pad | Black Chest Pad | Beige With Chest Pad | Light Coffee With Chest Pad
- 1 Sitzungen · `15453809738113` lange-gerade-jeans-632600 [Farbe]: Light Medium Blue | Antique Dark Blue | Pitch Black
- 1 Sitzungen · `15470351909249` ballet-style-halskette-624800 [Farbe]: Ballet Apple Chain

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 1 Sitzungen · `15449428033921` lippenglanzstift-341696 [Farbe]: Farbton 1 | Farbton 2 | Farbton 3 | Farbton 4 | Farbton 5 | Farbton 6 | Farbton 1 · 3 Stück | Farbton 1 · 5 Stück
- 1 Sitzungen · `15449432555905` ems-bauch-und-muskel-trainer-b08b29 [Farbe]: Pink | Rot | Full and Arms | A Set1 | A Set2 | Yellow1 | Pink1 | Full and Pull out packaging
- 1 Sitzungen · `15450834469249` new-flame-aroma-diffuser-mit-flammeneffekt-620700 [Farbe]: Black Gift Remote Control-1PCS | White Gift Remote Control-1PCS | Black Gift Remote Control-2PCS | Black Gift Remote Control-3PCS | White Gift Remote Control-2PCS | White Gift Remote Control-3PCS | Set 1-1 Stück | Set 2-1 Stück
- 1 Sitzungen · `15449427280257` magnetische-led-wandlampe-mit-bewegungssensor-169776 [Farbe]: Ash 2pcs | Ash 4pcs | Walnut 2pcs | Walnut 4pcs | Set 1 | Set 2 | Set 3 | Set 4
- 1 Sitzungen · `15450829914497` kabellose-2-in-1-glattburste-fur-schnelles-sty-599296 [Farbe]: LCD Schwarz Englisch | LCD Weiss Englisch | Set | LCD Blau Englisch | LCD unpredictable blue | LCD Taro-Violett | Set 1 | Set 2
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Weiss | Königsblau | Rosa | Lila | Marineblau | Himmelblau | Big red | Hellgrau

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`degrees` 101, `color` 65, `mother` 61, `light` 58, `core` 52, `hat` 46, `rope` 44, `to` 44, `⟨satzbau:adjektiv-vor-nomen⟩` 38, `lens` 38, `father` 38, `for` 35, `generation` 34, `shell` 31, `no` 30, `years` 30, `old` 30, `adjustable` 29, `mom` 28, `insert` 26, `crotch` 26, `case` 24, `batteries` 24, `dog` 24, `dad` 24, `bag` 23, `of` 22, `tea` 21, `surface` 21, `bear` 21, `⟨satzbau:nomen-vor-farbe⟩` 20, `high` 19, `number` 19, `deer` 19, `clothing` 18, `belt` 16, `stone` 16, `face` 16, `suit` 16, `gallium` 16, `nitride` 16, `sunglasses` 16, `parent` 16, `full` 15, `handle` 15, `electric` 15, `waist` 15, `pumpkin` 15, `blocking` 15, `pad` 14, `chain` 14, `simple` 14, `mirror` 14, `mother's` 14, `powder` 13, `carbon` 13, `open` 13, `⟨satzbau:lehnwort-vor-nomen⟩` 13, `45se6` 12, `steel color` 12

