# Nacharbeit Runde 2 — offene Qualitätspunkte der Semrush-Umsetzung 2 (05.10.2026, 08:40–09:25 UTC)

Betreiber: «fix mal weiter semrush». Bereich «nacharbeit-runde2», **Semrush-Einheiten: 0** (nur Shopify-Admin + WebFetch).
Ledger mit Altwerten: `dropship/semrush/_nacharbeit_runde2_2026-10-05.tsv` (Produkt-Titel/SEO/Tags/Text, Kollektionstext, Block-Korrekturen);
Tag-Läufe in `dropship/_kategorie_rein.tsv` (08:55Z); neue Link-Blöcke im Ledger `_interne_links_2026-10-05.tsv` (Aktion `block`, 20 Zeilen 09:1x).
Nichts committet (Vorgabe).

## (1) Regel teppiche — Fussmatten/PVC-Leder/Fremdware
- Gemessen vorher (`products(query:"tag:kat-teppiche")`): **38** Produkte. Keine Fussmatte darunter — die Suche (`suche`) kannte «fussmatte» nicht,
  nur `echt`; wäre die Suche erweitert worden, hätten 9 Fussmatten + «Geprägtes PVC-Leder für Fussmatten» (Typ Basteln & DIY, nicht im BAN) die
  Seite erreicht. Fremdware IM Bestand: «2er-Set Badematten aus Akazienholz», «Badematte aus Akazienholz» (Holzroste), «Diatomit Badematte» (Steinplatte).
- Regel geschärft (`automation/kategorie_rein_semrush.py`): `echt` ohne fussmatte/fußmatte/türmatte; BAN + `fussmatte|türmatte|\bpvc\b|kunstleder|
  meterware|\bstoff\b|für (teppiche|fussmatten|badematten)|akazie|\bholz|diatomit|kiesel|stein-matte`. Kanarienvögel: 73/73 (14 neue, u. a. PVC-Leder,
  Auto-Fussmatten, Akazienholz, Diatomit, Leder-Teppich bleibt JA).
- Trocken: «jetzt 38 · gehört 35 · raus 3 · neu 0» → `SCHARF=1 kategorie_rein.py teppiche`: 3 Tags entfernt. Live: `productsCount` 35, `products(first:60)` 35;
  **WebFetch /collections/teppiche: H1 «Teppiche», 35 Artikel, kein Akazienholz/Diatomit/Fussmatte.**
- Kollektionstext nannte «Fussmatten» in der Bad-Zeile → entfernt (Ledger `kollektion-text`, zurückgelesen, WebFetch: Wort nicht mehr im Text).

## (2) WELTEN-Regexe ohne Wortgrenzen + Anker «Baustelle Kinder»
- Gemessen (alte `welten()` auf den 15 offenen Produkten): «k**leine**r Luftbefeuchter» → tier, «reflek**tier**ender Rucksack» → tier,
  «Schrei**bh**ilfe» → damen, «automa**tisch**er Schwenkventilator» → wohnen (der Fehl-Link in aufbewahrung-sub), Rucksäcke-Kollektion ohne Welt
  (`rucksack` traf «rucksaecke» nicht), Nachtwäsche/Pyjama/Büro/Wecker/Ballett ohne passende Welt.
- Neu (`automation/interne_links.py`): `welt_re()` — ein Merkmal zählt nur am **Wortanfang** (Stamm: WOHNzimmer, KINDerwagen) oder am **Wortende
  mit Flexion** -e/-en/-er/-es/-n/-s (Grundwort: halsKETTE, stehLAMPE, damenSCHUHE), nie mitten im Wort. Ausnahme «tisch»: Adjektive auf -tisch
  (automaTISCHer, prakTISCHe, romanTISCHe) tragen die Flexion wie ein Grundwort → Lookbehind-Liste von 19 Adjektivstämmen. Dazu Komposita-Sperren
  `leine(?!n)` (Leinen), `schul(?!ter)`, `tee(?!n)`, `back(?!pack)`, `wand(?!er)`, `bad(?!minton)`, `tasche(?!nlamp)`, `strick(?!jacke…)`,
  `(?<!kaffee|wasch|spuel|naeh)maschine`, `ring(?!licht)`; neue Welten `homewear` (Pyjama/Nachtwäsche/Loungewear) und `buero`; Ergänzungen
  `rucks(a|ae)ck`, `backpack`, `ballett|tanz|bandage|gelenkstuetz` (sport), `wecker` (elektronik), `luftbefeuchter|luftreiniger|klimager` (wohnen).
- Anker: `anker_tauglich()` verlangte bei Produkten nur EIN Wort → «Baustelle Kinder» stand dreimal auf dem Bausteine-Set (nur «kinder» passte).
  Jetzt alle Wörter auch bei Produkten; &-Regel nur für Kollektionen. Fallback = bereinigter Produkttitel.
- Kanarienvögel `python3 automation/interne_links.py --kanarien`: **41/41** (34 Welt-Texte + 7 Anker-Fälle).
- Nachmessung alt→neu über alle 541 Kollektionen: **24 Weltwechsel**, alle geprüft (−damen bei «Bekleidung», −schmuck bei «Mitbringsel», −accessoires
  bei «Panzerglas», −wohnen bei «Wandern», +taschen bei 4 Rucksack-Kollektionen, +homewear bei Loungewear/Nachtwäsche, +buero bei 3 Büro-Seiten,
  +sport bei Fussball, +elektronik bei Wecker, +wohnen bei Luftreiniger).
- Live korrigiert (frisch gelesen, nur im Block, zurückgelesen, Ledger `ls-verwandt-korrektur`): aufbewahrung-sub ohne Kinderwagen-Ventilator-Link;
  baby-kleinkind, spielzeug, klemmbausteine-bausaetze: Anker «Baustelle Kinder» → «Bausteine-Set Baufahrzeuge für Kinder».
- `--scharf` (live): **20 Blöcke geschrieben, 20 ok, 0 Fehler** — 15 Links (Ballettschuhe → sport-outdoor; Fussgelenkstütze → wellness-gesundheit,
  sport-outdoor, fitness-training; Luftbefeuchter → sub-aroma-diffuser, luftreiniger-klimageraete; Schreibhilfe → buero-schreibwaren, schule-buro;
  Pyjama → nachtwaesche-pyjamas, loungewear; Wecker-Armband → wecker, gadgets; Rucksack → rucksaecke; nintendo-switch/pc-komponenten → gadgets)
  + 12 Übersicht-Links (u. a. 8 neue Kollektionen des Parallel-Workflows: abendkleider, bauchtaschen, etageren, lunchboxen, usb-sticks, wanduhren,
  winterschuhe, woks). Wächter `--pruefen`: «164 ls-verwandt-Blöcke, alle Ziele kaufbar».

## (3) «Leichter Wintermantel aus Baumwolle» (630500)
- Gemessen: Bild = Kinderjacke mit Stehkragen und Druckknöpfen, rosa; Varianten 32/32 kaufbar, Grösse **110–180** (Kindergrössen), Farben Grau,
  Helllila, Pink, Schwarz; Beschreibung «Polyester», «Stoffdicke: dünn», «Unisex». Titel sagte Wintermantel/Baumwolle, Typ Damenmode, Tag kat-winterjacken.
- Geändert (productUpdate, zurückgelesen ok, 4 Ledger-Zeilen): Titel «Leichte Kinderjacke mit Stehkragen und Druckknöpfen, Gr. 110–180»; SEO-Titel
  «Leichte Kinderjacke Gr. 110–180, 4 Farben | LuxeStyle» (53 Z.); Meta aus den Varianten (153 Z.); Typ «Baby & Kinder»; Tags −damen/−mantel/
  −winter/−kat-winterjacken, +kinder/+jacke; erster Satz «Für kühle Wintertage hält dieser Mantel …» → «Diese leichte Kinderjacke aus Polyester ist
  für Herbst und Übergangstage gedacht.» **WebFetch: H1 und erster Satz neu, Grössen 110–180, 4 Farben.** Winterjacken-Kollektion: 45 → 44.

## (4) Wecker-Armband 620000 in kat-wecker
- Ursache: BAN `armband` (gegen Armbanduhren mit Weckfunktion) traf auch «Wecker-Armband». Regel: `echt` + `wecker-?armband`, BAN
  `(?<!wecker-)(?<!wecker )armband` + `armbanduhr|fitness-?armband|tracker`. Kanarienvögel 10 (JA Wecker-Armband; NEIN Armbanduhr mit Wecker,
  Fitness-Armband mit Wecker, Vibrationsarmband-Smartwatch). Trocken «neu 1», scharf getaggt; **WebFetch /collections/wecker: 22 Artikel, Wecker-Armband
  gelistet** (erstes Produkt). Der «Teppich-Wecker» (Auto-Zubehör) bleibt im Wecker, nicht bei Teppichen (bewusst, ist ein Wecker).

## (5) Zahlen in den SEO-Metas (103 vom 02.10. + 24 vom 05.10.)
- Live gelesen (121 eindeutige Handles, 13 Bündel-Queries): SEO-Titel + Meta gegen Varianten (`selectedOptions` + `availableForSale`).
- 02.10.: die Metas sind «Titel + Zahlart/Versand» — keine Grössen-/Farbangaben; Zahlen nur als Stückzahl/Volumen aus dem Produkttitel
  (10 Stück, 80 Stück, 50 L, 20 L) = Lieferantenangabe, nicht aus Varianten messbar, unverändert.
- 05.10.: 13 Fundstellen, 11 stimmen mit den Varianten (36–48 · 3 Farben; 39–45 · 3 Farben; Beige/Schwarz; 3 Ausführungen; 2er-Set/34 mm/2 Trucks aus Titel).
  **2 korrigiert** (beide SEO-Felder, zurückgelesen, Ledger `produkt-seo-zahlen`): Fingerskateboard-Achsen «sechs Farben» → **sieben** (7/7 kaufbar);
  Camping-Luftbett «Einzel bis Triple» → **«190 × 100 × 25 cm»** (nur 1 von 6 Grössen kaufbar).

## (6) Die 15 «offen» von interne_links.py
Vorher offen 15 (Trockenlauf 08:45) → nachher **offen 11**, kaufbare Ziele mit < 3 eingehenden Links **16 → 11** von 62 (`--messen` 09:20).
| Produkt | vorher → nachher | Weg |
|---|---|---|
| Ballettschuhe | 2 → **3** | Welt sport (ballett) → sport-outdoor |
| Kleiner Luftbefeuchter | 1 → **3** | Welten wohnen/buero → sub-aroma-diffuser, luftreiniger-klimageraete |
| Wecker-Armband | 0 → **2** | kat-wecker + Welt elektronik → wecker, gadgets; elektronik-technik hat 4 Links (voll) → 1 offen |
| Weihnachts-Pyjama | 1 → **3** | Welt homewear → nachtwaesche-pyjamas, loungewear |
| Schreibhilfe für Kinder | 1 → **3** | Tags buero + schule-buero (Schule & Büro), Welt buero → buero-schreibwaren, schule-buro |
| Fussgelenkstütze | 0 → **3** | Typ «Aufbewahrung & Organizer» → «Sport & Outdoor», Tags −aufbewahrung/−wohnen/−haushalt/−organizer, +gesundheit/+sport/+fitness/+bandage → wellness-gesundheit, sport-outdoor, fitness-training (Mitgliedschaft nach 20 s propagiert) |
| Reflektierender Rucksack | 1 → **2** | Welt taschen für «Rucksäcke» → rucksaecke; dritte Quelle fehlt (Sport-/Schul-/Laptop-Rucksäcke sind Titelregeln, Produkt passt nicht) |
| Spaghettiträger-Kleid | 1 → 1 | Tag kategorie-kleid → jetzt in Kleider; Kleider-Block (5) und Damen-Mode-Block (4) sind voll, Sommer verlinkt es schon |
| Blumenkleid, Leopard-Kleid, Off-Shoulder, Zweiteiler, Karierte Bluse, Tunika-Bluse | unverändert (0–2) | einzige thematische Quellen Kleider/Damen-Mode/Damen-Blusen, Blöcke voll (max. 4 Links); keine zweite Kleider-Seite (nur Midikleider per Titel) |
| Beistelltisch Acryl | 2 → 2 | keine Möbel-Kollektion im Shop (gemessen: 0 Handles mit moebel/tisch ausser Lampen/Wandregale) |
| Kinderwagen-Ventilator | 3 → 2 | Fehl-Link aus Aufbewahrung entfernt (gewollt); sub-baby-kids + ventilatoren bleiben |

## Offen / Lehren
- Die Kleider/Blusen-Ziele brauchen ein zweites Feld (Footer-Rubrik oder Ratgeber-Links) oder eine höhere Blockgrenze — Eingriff in Menü/Blog, nicht hier.
- Lehre: eine Regex-Tabelle für deutsche Produkttexte braucht Wortgrenzen ASYMMETRISCH (Stamm links, Grundwort rechts), nicht `\b…\b`; Adjektive auf
  -tisch/-isch sind die Ausnahme. Und: existierende Blöcke werden beim Neulauf übernommen — falsche Anker/Links müssen gezielt im Block korrigiert werden.
- Tag-/Typ-Änderungen erreichen Smart-Kollektionen asynchron (hier 20 s) — vor dem Verlinken auf die Mitgliedschaft warten (Poll), nicht auf productsCount.
