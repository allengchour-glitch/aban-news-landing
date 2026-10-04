# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-10-04 05:09 UTC, Stand 2026-10-04 05:12 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **613**
- Optionen mit englischen Werten (Kandidaten): 25
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 79
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kleidungsstueck-im-wert»: 1

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

- `15449163432321` [Farbe] **Raw-Edge Jeansjacke im Old-Money-Stil** · 1 Sitzungen/30 T — hose, jacke: Blue Coat | Blue Pants

## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

_keine_


## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 11 Sitzungen · `15524878287233` herren-sneaker-mit-8-cm-plateausohle-610100 [Farbe]: Black, Hidden Elevator 8CM
- 8 Sitzungen · `15412918190465` blumen-maxikleid-fleurette-neckholder-mit-fishtail [Farbe]: Color
- 4 Sitzungen · `15412945289601` armbanduhr-rettangolo-rechteckig-unisex [Farbe]: Black Belt Black Shell | Brown With Black Shell | Black Belt Silver Case | Gray Belt Silver Case | Blue Ribbon Silver Case | Green Belt With A Black Shell
- 2 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `16603322122631` leichte-down-jacke-fur-damen-606100 [Farbe]: Delightful Red
- 1 Sitzungen · `15521235992961` damen-v-ausschnitt-trager-mehrlagiges-bedruckt-624900 [Farbe]: Foundation Flower | White Background Pink | Purple On White Background | Big Red Flower | Little Blue Flowers
- 1 Sitzungen · `15446275588481` keramik-teedose-luftdicht-630100 [Farbe]: Type A Imitating Stone | Type A Alluvial Gold | A Spotted Yellow | Style A Spring Green | Type B Spot Yellow | B Style Spring Green
- 1 Sitzungen · `15450834469249` new-flame-aroma-diffuser-mit-flammeneffekt-620700 [Farbe]: Black Gift Remote Control-1PCS | White Gift Remote Control-1PCS | Black Gift Remote Control-2PCS | Black Gift Remote Control-3PCS | White Gift Remote Control-2PCS | White Gift Remote Control-3PCS
- 1 Sitzungen · `15448880939393` intelligentes-wecker-armband-mit-vibrationsala-620000 [Farbe]: Basic 2nd Generation
- 1 Sitzungen · `15447598072193` gestreiftes-langarm-hemdblusenkleid-622600 [Farbe]: Light Blue Embroidery
- 1 Sitzungen · `15448639897985` high-waist-yoga-shorts-fur-damen-118145 [Farbe]: Angola Red | Scarlett Red | Mocha Brown | Snowfield White | Ice Lotus Green | Matte Oat
- 1 Sitzungen · `15450829914497` kabellose-2-in-1-glattburste-fur-schnelles-sty-599296 [Farbe]: LCD unpredictable blue | LCD unpredictable blue 2pcs | LCD unpredictable blue 3pcs
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Big red | White shoe buckle | Black shoe buckle
- 1 Sitzungen · `15450856292737` reise-hangematte-aus-fallschirm-nylon-86eb20 [Farbe]: Sky + gray
- 1 Sitzungen · `15448115544449` damen-yoga-jumpsuit-mit-mock-neck-626800 [Farbe]: Black Without Chest Pad | Beige Without Chest Pad | Light Coffee Without Chest Pad | Black Chest Pad | Beige With Chest Pad | Light Coffee With Chest Pad
- 1 Sitzungen · `15517783097729` bedrucktes-midikleid-mit-weitem-faltenrock-627200 [Farbe]: Sugar Brown
- 1 Sitzungen · `15521250443649` geblumtes-a-linien-kleid-mit-ruschentragern-637900 [Farbe]: Blue Dyed | Fireworks Printing
- 1 Sitzungen · `16603337687431` koreanischer-oversize-polstermantel-621500 [Farbe]: Angora Red
- 1 Sitzungen · `15449569722753` eleganter-a-linien-maxi-rock-613900 [Ausführung]: Short stature | Regular style
- 1 Sitzungen · `15453809738113` lange-gerade-jeans-632600 [Farbe]: Light Medium Blue | Antique Dark Blue | Pitch Black
- 1 Sitzungen · `15470351909249` ballet-style-halskette-624800 [Farbe]: Ballet Apple Chain

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 1 Sitzungen · `15450834469249` new-flame-aroma-diffuser-mit-flammeneffekt-620700 [Farbe]: Black Gift Remote Control-1PCS | White Gift Remote Control-1PCS | Black Gift Remote Control-2PCS | Black Gift Remote Control-3PCS | White Gift Remote Control-2PCS | White Gift Remote Control-3PCS | Set 1-1 Stück | Set 2-1 Stück
- 1 Sitzungen · `15450829914497` kabellose-2-in-1-glattburste-fur-schnelles-sty-599296 [Farbe]: LCD Schwarz Englisch | LCD Weiss Englisch | Set | LCD Blau Englisch | LCD unpredictable blue | LCD Taro-Violett | Set 1 | Set 2
- 1 Sitzungen · `15450851836289` press-lock-schnursenkel-elastisch-bindefrei-755456 [Farbe]: Weiss | Königsblau | Rosa | Lila | Marineblau | Himmelblau | Big red | Hellgrau

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`shell` 8, `case` 6, `gift` 6, `chest` 6, `pad` 6, `belt` 4, `alluvial` 3, `spring` 3, `unpredictable` 3, `ck` 3, `background` 2, `⟨satzbau:adjektiv-vor-nomen⟩` 2, `imitating` 2, `stone` 2, `spot` 2, `antique` 2, `shoe` 2, `buckle` 2, `replenishment` 2, `color` 1, `ribbon` 1, `hidden` 1, `elevator` 1, `tea` 1, `delightful` 1, `foundation` 1, `on` 1, `little` 1, `spotted` 1, `basic` 1, `2nd` 1, `generation` 1, `embroidery` 1, `angola` 1, `scarlett` 1, `mocha` 1, `snowfield` 1, `ice` 1, `lotus` 1, `oat` 1, `sky` 1, `sugar` 1, `dyed` 1, `fireworks` 1, `angora` 1, `stature` 1, `regular` 1, `light` 1, `pitch` 1, `ballet` 1, `chain` 1, `face` 1, `cologne` 1, `gardenia` 1

