# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-11-24 15:46 UTC, Stand 2026-11-24 17:30 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **17'413**
- Optionen mit englischen Werten (Kandidaten): 716
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 2'108
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 24
- übersprungen «kleidungsstueck-im-wert»: 15

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

- `15447957733761` [Farbe] **Familien-T-Shirt im Partnerlook · Kurzarm mit Brusttasche** — hose, jacke: coat | coat-100 | coat-110 | coat-120 | coat-130 | coat-140 | coat-150 | coat-Female S
- `15447962091905` [Farbe] **Partnerlook Herbst Sweatshirts für Eltern & Kinder** — overall, pullover: Sweater Autumn-90cm | Sweater Autumn-100cm | Sweater Autumn-110cm | Sweater Autumn-120cm | Sweater Autumn-130cm | Sweater Autumn-140cm | Sweater Autumn-150cm | Sweater Autumn-Adult S
- `15447969595777` [Ausführung] **Freizeit Cheongsam Familien-Set im China-Stil** — hose, oberteil · Titel nennt Set: Herren Oberteil | Herren Shorts | Damen Shirt | Damen Stil Rock | Grün Cheongsam Anzug
- `15448011178369` [Farbe] **T-Shirt mit Cartoon-Hasen-Print für Damen** — pullover: Violent Robber Bear | Delivery Team | HOODIE Bear | Paradise Shark Letters | MOTORS Letters | POTRO Letters | VINTAGE Gelbe Buchstaben | Three Rows Lettered Rabbit
- `15449108578689` [Farbe] **Damen Langarm-Top aus Gold-Samt** — weste: Lange Ärmel | Vest | Off shoulder

## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

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
- `15447889740161` [Farbe] sonnen-cape-im-retro-stil-617300: White Color → Weiss
- `15448539922817` [Farbe] eleganter-casual-jumpsuit-mit-weitem-bein-613100: Lemon Green → Zitronengrün
- `15449432555905` [Farbe] ems-bauch-und-muskel-trainer-b08b29: A Set1 → A Set 1; A Set2 → A Set 2; Set2 → Set 2; Set1 → Set 1; Yellow 3pcs → Gelb · 3 Stück
- `15450036601217` [Farbe] retro-high-top-schuhe-fur-herren-600800: Black → Schwarz
- `15450830176641` [Farbe] kuschel-hoodie-mit-grosser-tasche-052928: Dark gray → Dunkelgrau; Set1 → Set 1; Set2 → Set 2; Set3 → Set 3; Set4 → Set 4
- `15450840596865` [Farbe] kompression-shorts-mit-taschen-ebe7fd: Weissweiss → Weiss; Schwarzschwarz → Schwarz
- `15453570597249` [Farbe] hochtaillierte-caprihosen-638600: Marineblaublau → Marineblau
- `15453761798529` [Farbe] lassiger-waffelstrick-stehkragen-pullover-mit-610300: Marineblaublau → Marineblau
- `15453761929601` [Farbe] farbige-hoodie-mit-kordelzug-636100: Marineblaublau → Marineblau
- `15454132371841` [Farbe] mid-rise-flared-jeans-629100: Medium Blue → Mittelblau
- `15454235689345` [Farbe] high-waist-yoga-pants-mit-beutlifting-effekt-632800: Kaffeebraun-Braun → Kaffeebraun
- `15455729582465` [Farbe] sonnenschutzpullover-mit-kragen-und-kurzarmel-629700: Mustard Yellow → Senfgelb
- `15456157794689` [Farbe] weite-cropped-hosen-620200: Marineblaublau → Marineblau
- `15466024305025` [Farbe] elegantes-a-linien-kleid-mit-ruschenarmeln-620600: Polka Dot → Gepunktet; Marineblaublau → Marineblau

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 10 Sitzungen · `15449407783297` selbstreinigende-haarburste-894400 [Farbe]: Elegant Weiss | Elegant Weiss 2 Stk
- 2 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 2 Sitzungen · `15450839122305` kristall-tischlampe-mit-touch-funktion-775808 [Ausführung]: Transparent-Plugin models three colors-USB | Transparent-Charging touch 3colors-USB | Transparent-Plugin models 16colors-USB | Amber-Plugin models three colors-USB | Amber-Charging touch 3colors-USB | Amber-Plugin models 16colors-USB
- 1 Sitzungen · `15472047456641` herzring-aus-titanstahl-mit-zirkonia-617300 [Farbe]: Gold Powder Drill-6 | Gold Powder Drill-7 | Gold Powder Drill-8 | Gold Powder Drill-9 | Golden White Diamond-6 | Golden White Diamond-7
- 1 Sitzungen · `15523179004289` manueller-dosen-und-flaschenoffner-615500 [Menge]: 1er-Pack | 2er-Pack
- 1 Sitzungen · `16615704756615` stickbild-set-fur-fotorahmen-blumenmuster-629900 [Grösse]: 25x25cm Without Stamp Pin | 25x25cm Including Stamp Pin
- 1 Sitzungen · `15508396802433` nano-ionen-dampfgerat-2fbb30 [Farbe]: Blaues Set1
- 1 Sitzungen · `15509389246849` dekorativer-wandfacher-aus-bambus-626500 [Grösse]: 75x150cm Gradient powder
- 1 Sitzungen · `15509183562113` leinenhemd-fur-herren-im-chinesischen-stil-624000 [Farbe]: Optic Linen
- 1 Sitzungen · `15483934900609` beruhigendes-kuscheltier-608200 [Ausführung]: New Breathing Rabbit | 4speed breathing elephant

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 10 Sitzungen · `15449407783297` selbstreinigende-haarburste-894400 [Farbe]: Schwarzgold | Elegant Weiss | Schwarzlila | Schwarz-Gold Set | Set · Weiss | Schwarz-Lila Set | Weiss, gepresste Haarentfernung | Rosenrot, gepresste Haarentfernung

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`powder` 82, `⟨satzbau:adjektiv-vor-nomen⟩` 71, `shell` 47, `⟨satzbau:mass-ohne-einheit⟩` 45, `diamond` 40, `chain` 39, `cherry` 35, `space` 33, `tc` 31, `high` 27, `end` 26, `plush` 24, `four` 23, `eyelashes` 23, `one` 22, `blossom` 21, `of` 21, `deer` 20, `perforated` 20, `acupuncture` 20, `magnetic` 20, `therapy` 20, `oxford` 20, `lamp` 19, `holder` 19, `line` 18, `tea` 17, `full` 17, `degrees` 17, `lotus` 17, `carbon` 17, `⟨satzbau:praeposition⟩` 17, `elegant` 16, `color` 16, `rain` 16, `pin` 15, `strawberry` 15, `data` 14, `to` 14, `the` 14, `rabbit` 13, `light` 13, `cup` 13, `bag` 12, `dragon` 12, `waist` 12, `cloud` 12, `titanium` 12, `meter` 12, `sunflower` 12, `snake` 12, `elastic` 12, `mouth` 12, `three` 11, `⟨satzbau:adjektivfolge⟩` 11, `deep` 11, `avocado` 11, `size` 11, `festive` 11, `1er` 10

