# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-11-28 14:20 UTC, Stand 2026-11-28 15:46 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **6'606**
- Optionen mit englischen Werten (Kandidaten): 249
- Optionen übersetzt: **0** · Werte übersetzt: **0**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 589
- Fehler Shopify: 0 · Rückgelesen abweichend: 0
- übersprungen «kollision-nach-uebersetzung»: 12
- übersprungen «kleidungsstueck-im-wert»: 10

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

## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 10 Sitzungen · `15449407783297` selbstreinigende-haarburste-894400 [Farbe]: Elegant Weiss | Elegant Weiss 2 Stk
- 3 Sitzungen · `15450839122305` kristall-tischlampe-mit-touch-funktion-775808 [Ausführung]: Transparent-Plugin models three colors-USB | Transparent-Charging touch 3colors-USB | Transparent-Plugin models 16colors-USB | Amber-Plugin models three colors-USB | Amber-Charging touch 3colors-USB | Amber-Plugin models 16colors-USB
- 2 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `15500936937857` uv-led-nagellampe-mit-akku-606800 [Ausführung]: Weiss Light EU | Silber Diamant Light EU
- 1 Sitzungen · `15509396160897` sonnenschutz-schlamm-stick-620700 [Farbe]: Zhu Kaki
- 1 Sitzungen · `15450854916481` mini-silikon-gesichtsreinigungsburste-415808 [Farbe]: Schwarz 2PC, Elektrisch-DC | Blau 2PC, Elektrisch-DC | Grün 2PC, Elektrisch-DC | Pink 2PC-Electric-DC
- 1 Sitzungen · `15483793768833` haarentferner-106496 [Farbe]: Bright pink-Colorful package | Bright pink-OPP packaging | Shiny gold-Colorful package | Shiny gold-OPP packaging | 2pcs Matt white-OPP packaging | 3pcs Matt white-OPP packaging
- 1 Sitzungen · `16615704756615` stickbild-set-fur-fotorahmen-blumenmuster-629900 [Grösse]: 25x25cm Without Stamp Pin | 25x25cm Including Stamp Pin
- 1 Sitzungen · `15483934900609` beruhigendes-kuscheltier-608200 [Ausführung]: New Breathing Rabbit | 4speed breathing elephant
- 1 Sitzungen · `15450836697473` beheizbare-wimpernzange-mit-temperaturkontroll-659840 [Farbe]: Pink expensive-USB-1PC
- 1 Sitzungen · `16608629031303` elektrische-heizkissen-mit-ruckenlehne-fur-das-e19886 [Modell]: One
- 1 Sitzungen · `16610395160967` faltbare-babybadewanne-mit-temperaturanzeige-458112 [Farbe]: Star Schwimmmatte
- 1 Sitzungen · `16613787468167` anti-statischer-arbeitsschuh-mit-flyknit-obert-629300 [Farbe]: Size 41696 Black And Red-41-696 Black And Red | Size 42696 Black And Red-42-696 Black And Red | Size 43696 Black And Red-43-696 Black And Red | Size 44696 Black And Red-44-696 Black And Red | Size 45696 Black And Red-45-696 Black And Red | Size 46696 Black And Red-46-696 Black And Red
- 1 Sitzungen · `15450838892929` aroma-diffuser-mit-flammeneffekt-448192 [Farbe]: Schwarz, USB Plug-in Version | Weiss, USB Plug-in Version | Set, USB Plug-in Version | Set 1, USB Plug-in Version | Schwarz 2 Stk., USB Plug-in Version | Weiss 2 Stk., USB Plug-in Version
- 1 Sitzungen · `15472047456641` herzring-aus-titanstahl-mit-zirkonia-617300 [Farbe]: Gold Powder Drill-6 | Gold Powder Drill-7 | Gold Powder Drill-8 | Gold Powder Drill-9 | Golden White Diamond-6 | Golden White Diamond-7

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 10 Sitzungen · `15449407783297` selbstreinigende-haarburste-894400 [Farbe]: Weiss, gepresste Haarentfernung | Schwarzgold | Elegant Weiss | Schwarzlila | Schwarz-Gold Set | Set · Weiss | Schwarz-Lila Set | Rosenrot, gepresste Haarentfernung
- 1 Sitzungen · `15483793768833` haarentferner-106496 [Farbe]: Bright pink-Colorful package | Bright pink-OPP packaging | Glänzendes Schwarz, Bunte Verpackung | Glänzendes Schwarz, OPP Verpackung | Glänzendes Dunkelblau, Bunte Verpackung | Glänzendes Dunkelblau, OPP Verpackung | Glänzendes Silber, Bunte Verpackung | Glänzendes Silber, OPP Verpackung
- 1 Sitzungen · `15450838892929` aroma-diffuser-mit-flammeneffekt-448192 [Farbe]: Schwarz, USB Plug-in Version | Weiss, USB Plug-in Version | Set, USB Plug-in Version | Set 1, USB Plug-in Version | Schwarz 2 Stk., USB Plug-in Version | Weiss 2 Stk., USB Plug-in Version | Schwarz / Weiss, USB Plug-in Version | Schwarz Set-EU

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`⟨satzbau:adjektiv-vor-nomen⟩` 37, `diamond` 36, `powder` 29, `opp` 20, `deer` 19, `degrees` 17, `one` 16, `tea` 14, `⟨satzbau:praeposition⟩` 12, `hat` 10, `to` 10, `insert` 9, `elegant` 8, `cherry` 8, `blossom` 8, `waist` 8, `rope` 8, `electric` 7, `bag` 7, `hot` 7, `machine` 7, `glittering` 7, `soft` 7, `washed` 7, `size` 6, `milk` 6, `handle` 6, `gun` 6, `color` 6, `ice` 6, `stone` 6, `three` 5, `bright` 5, `storage` 5, `papa` 5, `mama` 5, `hunde` 5, `halstuch` 5, `meter` 5, `plugin` 4, `models` 4, `touch` 4, `light` 4, `drill` 4, `gallium` 4, `nitride` 4, `4x` 4, `⟨satzbau:material-vor-farbe⟩` 4, `⟨satzbau:adjektivfolge⟩` 4, `fog` 4, `c1color` 4, `c2color` 4, `c3color` 4, `c4color` 4, `c5color` 4, `ski` 4, `gloves` 4, `skin` 4, `charming` 4, `crotch` 4

