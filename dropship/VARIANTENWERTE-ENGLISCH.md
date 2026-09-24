# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-09-23 20:46 UTC, Stand 2026-09-24 01:02 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **12'654**
- Optionen mit englischen Werten (Kandidaten): 1'420
- Optionen übersetzt: **17** · Werte übersetzt: **29**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 7'190
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kleidungsstueck-im-wert»: 36
- übersprungen «kollision-nach-uebersetzung»: 24

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

- `15449163432321` [Farbe] **Raw-Edge Jeansjacke im Old-Money-Stil** · 1 Sitzungen/30 T — hose, jacke: Blue Coat | Blue Pants
- `15447951835521` [Farbe] **Weihnachts-Hoodie für die ganze Familie** — hose: Dark Red Winter Fleece Lining-Crawling Suit 66 | Dark Red Winter Fleece Lining-Crawling Suit 73 | Dark Red Winter Fleece Lining-Crawling Suit 80 | Dark Red Winter Fleece Lining-Climbing Suit 90 | Dark Red Winter Fleece Lining-80cm | Dark Red Winter Fleece Lining-90cm | Dark Red Winter Fleece Lining-100cm | Dark Red Winter Fleece Lining-110cm
- `15447957733761` [Farbe] **Familien-T-Shirt im Partnerlook · Kurzarm mit Brusttasche** — hose, jacke: coat | coat-100 | coat-110 | coat-120 | coat-130 | coat-140 | coat-150 | coat-Female S
- `15447962091905` [Farbe] **Partnerlook Herbst Sweatshirts für Eltern & Kinder** — overall, pullover: Sweater Autumn-90cm | Sweater Autumn-100cm | Sweater Autumn-110cm | Sweater Autumn-120cm | Sweater Autumn-130cm | Sweater Autumn-140cm | Sweater Autumn-150cm | Sweater Autumn-Adult S
- `15447964516737` [Farbe] **Hoodie & Jogginghose Set im Partnerlook** — hose, pullover · Titel nennt Set: Gray Sweater | Gray Trousers | Grey Suit | Set1
- `15447969595777` [Ausführung] **Freizeit Cheongsam Familien-Set im China-Stil** — hose, oberteil, rock · Titel nennt Set: Men's top | Men's Shorts | Women's Shirt | Female Style Skirt | Green Cheongsam Suit
- `15448011178369` [Farbe] **T-Shirt mit Cartoon-Hasen-Print für Damen** — pullover: Violent Robber Bear | Delivery Team | HOODIE Bear | Paradise Shark Letters | MOTORS Letters | POTRO Letters | VINTAGE Yellow Letters | Three Rows Lettered Rabbit
- `15448509383041` [Farbe] **Gefüttertes Kapuzen-Sweatshirt für Damen – Black-Hoodie** — hose, pullover: Black-Hoodie | Black-Pants | Milky Apricot-Hoodie | Milky Apricot-Pants | Slate Blue-Hoodie | Slate Blue-Pants | Olive Green-Hoodie | Olive Green-Pants
- `15448574099841` [Farbe] **Eleganter Off-Shoulder Jumpsuit** — oberteil · Titel nennt Set: OliveGreen | Blau | a white Tshirt
- `15448670273921` [Farbe] **Damen Wollmantel für Winter Business** — oberteil: Marineblau | White Long Sleeve Shirt
- `15448718180737` [Farbe] **Gestreifter Business-Anzug für Herren** — jacke, weste · Titel nennt Set: Caramel Jacket | Sugar Coffee Vest | Set
- `15449055854977` [Farbe] **Kapuzen-Sweatshirt-Set, Fleece-gefüttert · Modell 2** — hose, pullover · Titel nennt Set: Blue-Hoodie | Blue-Pants | Grayish Brown-Hoodie | Grayish Brown-Pants | Navy Blue-Hoodie | Navy Blue-Pants | Leafy Gray-Hoodie | Leafy Gray-Pants
- `15449066766721` [Farbe] **Vintage Patchwork Distressed Jeansjacke für Herren** — hose, jacke: Single Jacket | Single Pants
- `15449108578689` [Farbe] **Damen Langarm-Top aus Gold-Samt** — weste: Long sleeves | Vest | Off shoulder
- `15449114837377` [Ausführung] **Herren Hoodie und Trainerhosen Set** — hose, pullover · Titel nennt Set: Dark gray-L-Hoodie | Dark gray-M-Hoodie | Dark gray-S-Hoodie | Dark gray-S-Pants | Dark gray-XL-Hoodie | Royal blue-L-Hoodie | Royal blue-L-Pants | Royal blue-M-Hoodie
- `15449165824385` [Ausführung] **Streetwear Hoodie mit Herz-Augenmaske** — hose, pullover: Pale yellow-L-Sweatshirt | Pale yellow-L-Pants | Pale yellow-M-Sweatshirt | Pale yellow-M-Pants | Pale yellow-S-Sweatshirt | Pale yellow-S-Pants | Pale yellow-XL-Sweatshirt | Pale yellow-XL-Pants
- `15449439994241` [Farbe] **Retro Sport-Casual Gestreifte Jacke und Weitbein-Hose** — hose, jacke: Coat Red | Coat Black | Pants Red | Pants Black
- `15453570728321` [Farbe] **Japanischer Segler-Anzug** — kleid, rock · Titel nennt Set: Short Sleeves Bow Tie | Long Sleeves Bow Tie | Short Sleeves Skirt Bow Tie | Long Sleeve With Dress Bow Tie | Skirt

## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

- `15449432555905` [Farbe] ems-bauch-und-muskel-trainer-b08b29: A Set1 → A Set 1; A Set2 → A Set 2; Red battery → Rot Batterie; Red battery set → Rot Batterie Set; Set2 → Set 2
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
- `15448539922817` [Farbe] eleganter-casual-jumpsuit-mit-weitem-bein-613100: Lemon Green → Zitronengrün
- `15448673288577` [Farbe] gefutterter-coral-fleece-loungewear-hoodie-615800: Black Red Checkered → Schwarz-Rot kariert; Deep Green → Dunkelgrün; Dark Green → Dunkelgrün; Flower Gray → Graumeliert; Gray Brown → Grau-Braun
- `15448903385473` [Farbe] herren-automatikuhr-skelettiert-609900: Black Golden Black → Schwarz-Gold-Schwarz; Black Gold Black → Schwarz-Gold-Schwarz; Black Silver Black → Schwarz-Silber-Schwarz; Brown With Gold And White → Braun mit Gold-Weiss; Brown Gold White → Braun-Gold-Weiss
- `15449065718145` [Farbe] corduroy-weste-im-preppy-stil-fur-herren-635500: Deep Coffee → Dunkelkaffeebraun; Green Coffee → Grün-Kaffeebraun
- `15450036601217` [Farbe] retro-high-top-schuhe-fur-herren-600800: Black → Schwarz
- `15450830176641` [Farbe] kuschel-hoodie-mit-grosser-tasche-052928: Dark gray → Dunkelgrau; Army Green Blue → Armeegrün-Blau; Army Green 2pcs → Armeegrün · 2 Stück; Coffee 2pcs → Kaffeebraun · 2 Stück; Grey 2pcs → Grau · 2 Stück
- `15450837975425` [Farbe] hangematte-mit-moskitonetz-pop-up-241216: Blue blue → Blau; Green green → Grün
- `15450839777665` [Farbe] xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264: 120cm pink → 120 cm Pink; 120cm black → 120 cm Schwarz; 120cm navy blue → 120 cm Marineblau; 120cm grey → 120 cm Grau; 150cm pink → 150 cm Pink
- `15450840596865` [Farbe] kompression-shorts-mit-taschen-ebe7fd: Camouflage grey → Camouflage Grau; Army green camouflage → Armeegrün Camouflage; Weissweiss → Weiss; Schwarzschwarz → Schwarz; White camouflage → Weiss Camouflage
- `15453570597249` [Farbe] hochtaillierte-caprihosen-638600: Marineblaublau → Marineblau
- `15453761798529` [Farbe] lassiger-waffelstrick-stehkragen-pullover-mit-610300: Marineblaublau → Marineblau
- `15453761929601` [Farbe] farbige-hoodie-mit-kordelzug-636100: Marineblaublau → Marineblau

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
- 1 Sitzungen · `15449427280257` magnetische-led-wandlampe-mit-bewegungssensor-169776 [Farbe]: Ash 2pcs | Ash 4pcs | Walnut 2pcs | Walnut 4pcs | Set 1 | Set 2 | Set 3 | Set 4
- 1 Sitzungen · `15450829914497` kabellose-2-in-1-glattburste-fur-schnelles-sty-599296 [Farbe]: LCD Schwarz Englisch | LCD Weiss Englisch | Set | LCD Blau Englisch | LCD unpredictable blue | LCD Taro-Violett | Set 1 | Set 2
- 1 Sitzungen · `15450828898689` thermo-strumpfhose-mit-fleece-futter-065536 [Farbe]: Black skin with feet-80g spring and autumn style | Black skin with feet-80grams plus size | Black skin with feet-220g fleece and thickened | Black skin with feet-220grams plus size | Black skin with feet-300g fleece thickened | Black and translucent footstep-80g spring and autumn style | Black and translucent footstep-220g fleece and thickened | Black and translucent footstep-220grams plus size

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`⟨satzbau:adjektiv-vor-nomen⟩` 263, `light` 239, `color` 189, `degrees` 159, `shell` 81, `skin` 78, `to` 70, `high` 69, `rope` 66, `feet` 62, `mother` 61, `three` 59, `⟨satzbau:material-vor-farbe⟩` 57, `no` 56, `size` 55, `surface` 53, `core` 53, `dark` 49, `electric` 48, `line` 48, `hat` 47, `powder` 47, `inner` 47, `for` 45, `of` 44, `case` 43, `bag` 43, `buckle` 42, `perforated` 42, `years` 40, `acupuncture` 40, `belt` 39, `opp` 39, `tea` 38, `lens` 38, `bear` 38, `father` 38, `generation` 37, `cup` 37, `adjustable` 37, `magnetic` 36, `suit` 35, `⟨satzbau:nomen-vor-farbe⟩` 35, `old` 35, `person` 35, `carbon` 34, `⟨satzbau:menge-vor-nomen⟩` 34, `⟨satzbau:adjektivfolge⟩` 32, `fiber` 32, `plush` 30, `eyelets` 30, `button` 30, `winding` 30, `iphone13` 29, `ice` 28, `batteries` 28, `little` 28, `mom` 28, `lamp` 28, `mushroom` 27

