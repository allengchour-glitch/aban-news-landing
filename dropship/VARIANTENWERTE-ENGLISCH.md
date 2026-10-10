# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-10-10 12:08 UTC, Stand 2026-10-10 12:36 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **21'031**
- Optionen mit englischen Werten (Kandidaten): 2'103
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 11'875
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kleidungsstueck-im-wert»: 46
- übersprungen «kollision-nach-uebersetzung»: 33

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

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
- `15459786752385` [Farbe] **Haltbare Einheitsjacke mit mehreren Taschen** — hose, oberteil: Black Suspender Pants | Dark Gray Suspender Pants | Dark Gray Split Suit | Dark Gray Trousers | Dark Gray Single Blouse

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
- `15448539922817` [Farbe] eleganter-casual-jumpsuit-mit-weitem-bein-613100: Lemon Green → Zitronengrün
- `15448673288577` [Farbe] gefutterter-coral-fleece-loungewear-hoodie-615800: Black Red Checkered → Schwarz-Rot kariert; Deep Green → Dunkelgrün; Dark Green → Dunkelgrün; Flower Gray → Graumeliert; Gray Brown → Grau-Braun
- `15448903385473` [Farbe] herren-automatikuhr-skelettiert-609900: Black Golden Black → Schwarz-Gold-Schwarz; Black Gold Black → Schwarz-Gold-Schwarz; Black Silver Black → Schwarz-Silber-Schwarz; Brown With Gold And White → Braun mit Gold-Weiss; Brown Gold White → Braun-Gold-Weiss
- `15449065718145` [Farbe] corduroy-weste-im-preppy-stil-fur-herren-635500: Deep Coffee → Dunkelkaffeebraun; Green Coffee → Grün-Kaffeebraun
- `15449432555905` [Farbe] ems-bauch-und-muskel-trainer-b08b29: A Set1 → A Set 1; A Set2 → A Set 2; Red battery → Rot Batterie; Set2 → Set 2; Set1 → Set 1
- `15450036601217` [Farbe] retro-high-top-schuhe-fur-herren-600800: Black → Schwarz
- `15450830176641` [Farbe] kuschel-hoodie-mit-grosser-tasche-052928: Dark gray → Dunkelgrau; Army Green Blue → Armeegrün-Blau; Army Green 2pcs → Armeegrün · 2 Stück; Coffee 2pcs → Kaffeebraun · 2 Stück; Grey 2pcs → Grau · 2 Stück
- `15450837975425` [Farbe] hangematte-mit-moskitonetz-pop-up-241216: Blue blue → Blau; Green green → Grün
- `15450840596865` [Farbe] kompression-shorts-mit-taschen-ebe7fd: Camouflage grey → Camouflage Grau; Army green camouflage → Armeegrün Camouflage; Weissweiss → Weiss; Schwarzschwarz → Schwarz; White camouflage → Weiss Camouflage
- `15453570597249` [Farbe] hochtaillierte-caprihosen-638600: Marineblaublau → Marineblau
- `15453761798529` [Farbe] lassiger-waffelstrick-stehkragen-pullover-mit-610300: Marineblaublau → Marineblau
- `15453761929601` [Farbe] farbige-hoodie-mit-kordelzug-636100: Marineblaublau → Marineblau
- `15454132371841` [Farbe] mid-rise-flared-jeans-629100: Medium Blue → Mittelblau
- `15454235689345` [Farbe] high-waist-yoga-pants-mit-beutlifting-effekt-632800: Kaffeebraun-Braun → Kaffeebraun
- `15455729582465` [Farbe] sonnenschutzpullover-mit-kragen-und-kurzarmel-629700: Mustard Yellow → Senfgelb
- `15456157794689` [Farbe] weite-cropped-hosen-620200: Marineblaublau → Marineblau
- `15458844049793` [Farbe] herren-langarm-button-down-hemd-615300: Pink Color → Pink
- `15466024305025` [Farbe] elegantes-a-linien-kleid-mit-ruschenarmeln-620600: Polka Dot → Gepunktet; Marineblaublau → Marineblau
- `15468651315585` [Farbe] retro-bluse-622200: Pink Color → Pink
- `15480167530881` [Farbe] leder-sneaker-mit-seitenreissverschluss-630000: Black-US9 → Schwarz-US9; Black → Schwarz; White-US9 → Weiss-US9; White → Weiss

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 10 Sitzungen · `15524878287233` herren-sneaker-mit-8-cm-plateausohle-610100 [Farbe]: Black, Hidden Elevator 8CM
- 7 Sitzungen · `15412918190465` blumen-maxikleid-fleurette-neckholder-mit-fishtail [Farbe]: Color
- 1 Sitzungen · `15521235992961` damen-v-ausschnitt-trager-mehrlagiges-bedruckt-624900 [Farbe]: Foundation Flower | White Background Pink | Purple On White Background | Big Red Flower | Little Blue Flowers
- 1 Sitzungen · `15450839777665` xxl-hoodie-decke-mit-taschen-fur-sie-ihn-059264 [Farbe]: Short pink | Short black | Short navy blue | Short wine red | Short grey | 120cm red black grid
- 1 Sitzungen · `15453761372545` dehnbare-yoga-hose-aus-ice-silk-622700 [Ausführung]: 01Bleach Color-100 X 165CM -75D ice silk | 02Books White-100 X 165CM -75D ice silk | 03Light Blue-100 X 165CM -75D ice silk | 04Pink-100 X 165CM -75D ice silk | 05Gray-100 X 165CM -75D ice silk | 06Black-100 X 165CM -75D ice silk
- 1 Sitzungen · `15412945224065` herrenuhr-carre-minimalist-square [Farbe]: Silver Case Blue Face Blue | Silver Shell Brown | Gold Shell Black | Golden Shell Brown | Golden Shell Blue Blue | Gold Shell Blue
- 1 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `15448639897985` high-waist-yoga-shorts-fur-damen-118145 [Farbe]: Angola Red | Scarlett Red | Mocha Brown | Snowfield White | Ice Lotus Green | Matte Oat
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Big red | White shoe buckle | Black shoe buckle
- 1 Sitzungen · `15449569722753` eleganter-a-linien-maxi-rock-613900 [Ausführung]: Short stature | Regular style
- 1 Sitzungen · `15470351909249` ballet-style-halskette-624800 [Farbe]: Ballet Apple Chain

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Weiss | Königsblau | Rosa | Lila | Marineblau | Himmelblau | Big red | Hellgrau

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`⟨satzbau:adjektiv-vor-nomen⟩` 457, `light` 414, `inner` 326, `color` 276, `degrees` 159, `shell` 156, `core` 137, `surface` 119, `⟨satzbau:material-vor-farbe⟩` 111, `diamond` 108, `powder` 107, `skin` 98, `three` 94, `rain` 88, `high` 86, `bag` 85, `case` 84, `french` 84, `four` 76, `belt` 75, `to` 73, `no` 70, `rope` 70, `petal` 68, `chain` 67, `dark` 63, `size` 62, `feet` 62, `mother` 61, `of` 60, `dual` 60, `base` 59, `half` 58, `net` 57, `buckle` 56, `tea` 55, `electric` 54, `plush` 54, `code` 53, `face` 52, `strap` 52, `person` 51, `opp` 51, `little` 50, `lens` 50, `line` 49, `bear` 49, `ice` 48, `hat` 47, `space` 47, `cloud` 46, `sheet` 46, `for` 46, `about` 46, `warped` 46, `milk` 45, `clock` 45, `tip` 44, `bed` 44, `⟨satzbau:menge-vor-nomen⟩` 44

