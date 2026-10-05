# Kategorie-Korrektur 05.10.2026 (03:30–04:10 UTC) — Prüferbefunde Index 3 + 4, Plan 6/7/9/20 (+3)

Bereich «kategorie» des Folgelaufs zum 12-h-Fix. Alle Zahlen gemessen (Befehl → Zahl), alle Schreibvorgänge live zurückgelesen.
Keine KI-Aufrufe (Kontingente leer) — die Urteile am Bild/Text stammen aus dieser Session (Kontaktbogen per PIL, Vier-Augen = zwei
unabhängige schriftliche Begründungen je Produkt: Bild und Text).

## Vorher (03:35 UTC)
- `productsCount("status:active AND -category_id:*")` = **6** (4 UNEINIG vom 04.10. + 4 frische Damenschuhe-Importe 03:47, die der
  Tageslauf über TABELLE holt; im zweiten Blick waren es 8, zwei kamen während der Messung dazu).
- Live falsch: `versteckte-leckereien-b386e5` tg-5 Toys; `intelligente-wlan-steckdose-e0e1e2` hg-10-16 Storage;
  `adventskalender-blind-box-sammlung-2026-636300` hg-10-16 Storage; `smart-sensor-stunt-hund-…-851136` ap-2 Pet Supplies.
- `kategorie_ki.py`: UNEINIG sperrte 30 Tage (4 Produkte bis 03.11. ohne Kategorie).
- `produkttyp_vereinheitlichen.py --zurueck`: las alle 3'900 Zeilen, 152 davon im Fremdformat (gid/alt/neu/grund/titel →
  «Beauty-Tools» wäre als Produkt-ID in die Mutation gegangen), keine Laufkennung.
- `dropship/_kategorie_rein_2_vorher.tsv`: 23'818 Zeilen / 2'468'648 B, +~11'000 Zeilen je Tageslauf (volle Mitgliederliste auch bei «raus 0»).
- `sub-hund` 419 / `sub-katze` 213 aktive Produkte — **kein Konsument**: 0 Kollektionen mit dieser Regel (Vollscan aller Kollektionen),
  0 Skripte ausser dem Alt-Regel-Backup; die Kollektionen «Hunde»/«Katzen» laufen seit 04.10. auf `kat-hunde` (1'686) / `kat-katzen` (736).

## Geändert

### `automation/kategorie_wache.py` (Plan 6)
- Neue Vorrang-Regeln (direkt nach den Lehrmodellen): `adventskalender` → **hg-3-58-1 Advent Calendars** (gemessen per
  `taxonomy.categories(search:"advent")`, genauer als Party Supplies); ferngesteuertes Tier/Roboter/Dino → **tg-5-18 Remote Control
  Toys**, Haushaltsroboter (Saug-/Wisch-/Mähroboter) per Negativ-Lookahead ausgenommen (Regression fand «Saugroboter mit Fernbedienung»).
- Box-Regel: `(?<!blind )(?<!blind-)(?<!blind)box` — Blind Box ist keine Aufbewahrung.
- Vor der Elektronik-Sammelregel: `steckdosenleiste|mehrfachsteckdose|steckerleiste` → **el-7-15-8 Power Strips**,
  `steckdose|smart-?plug|…` → **el-7-15 Electronics Accessories > Power** (keine Taxonomie-Klasse «Smart Plug», search leer).
- Regel 139: `dose\b` → `(?<!steck)dose\b`.
- **`--test`**: 17 Kanarienvögel ohne Shop-Zugriff (Steckdose, Adventskalender Blind Box, Stunt-Hund mit Fernbedienung, Saugroboter,
  Hunderte LED, Katzenaugen-Sonnenbrille, Hundeskelett-Modell, Vorratsdose …) → **17/17**.
- **Regression** über alle 5'165 aktiven Sammeltyp-Produkte (Snapshot alt vs. neu `ziel_fuer`): **36 Verschiebungen, alle gewollt**
  (Steckdosen 15 → Power/Leisten, RC-Tiere/Roboter 17 → Remote Control Toys, Adventskalender 4 → Advent Calendars); alle 36 live gesetzt.

### Live-Kategorien (Ledger `dropship/_kategorie_korrektur.txt`, 50 Zeilen mit Grund, 50/50 zurückgelesen)
| Produkt | vorher | nachher | Begründung Bild / Text |
|---|---|---|---|
| Versteckte Leckereien | tg-5 Toys | **ap-2-3-7 Dog Toys**, Typ → Haustierbedarf | Plüsch-Kartoffeln mit Taschen und Leckerli-Würfeln / «Hundespielzeug mit Futtertäschchen» |
| Intelligente WLAN-Steckdose | hg-10-16 | **el-7-15** | Smart-Plug Typ J mit App / «WLAN-Steckdose» |
| Adventskalender Blind Box Sammlung 2026 | hg-10-16 | **hg-3-58-1** | 24-Türchen-Kalender mit Figuren / «Adventskalender» |
| Stunt-Hund mit Fernbedienung | ap-2 | **tg-5-18** | RC-Spielzeug / Regel: ferngesteuertes Tier = Spielzeug |
| Winter-Geschenkset für Kinder (UNEINIG) | – | **aa-2-33 Baby & Children's Clothing Accessories** | Box mit Plüsch-Ohrenwärmern, Fäustlingen, Schal, Thermosflasche / Winter-Set für Kindergarten/Primarschule — Accessoires, keine Kleidung (Groq hatte aa-1-25 Clothing) |
| Antirutsch-Mat (UNEINIG) | – | **hg-11-8-67 Sink Mats & Grids** | 4/4 Bilder: Matte um den Küchenhahn auf dem Spülbeckenrand / Diatomeenerde, «Küche und Bad» — Küche dominiert (Groq hg-1-2 Badematte) |
| Innenraum-Bürsten-Set (UNEINIG) | – | **vp-1-5-2 Vehicle Cleaning** | Staubbürste an Lenkrad/Lüftung, Packung «Car Air Vent Extended Brush» / «Car Interior Cleaning Brush» (qwen vp-1, Groq ha-15) |
| Gel-Pads 2er Pack (UNEINIG) | – | **el-4-8-4 Mobile & Smart Phone Accessories** | Haft-Gel-Pads (Fixate) / «kompatibel mit Smartphones, portable Halterung»; kein Halterungs-Blatt in der Taxonomie, Cases (el-4-8-4-2) wäre falsch |
| 7 Adventskalender Typ Partydeko | ae-3-2 Party Supplies | **hg-3-58-1** | Titel «Adventskalender» (inkl. «Adventskalender-Haus aus Holz») |

### `automation/kategorie_ki.py` (Plan 7)
- `SPERRTAGE_UNEINIG = 1` (UNEINIG/KEINER), GESETZT/FEHLER weiter 30 — `gesperrt_bis()` je Ergebnis, Einheitstest 5/5.
- Prompt-Regel: Spielzeug FÜR Tiere → Pet Supplies, nie Toys & Games; ferngesteuertes Tier/Tier als Motiv ≠ Tierbedarf.
- Ledger `_kategorie_ki.tsv`: die 4 UNEINIG-Zeilen auf 2026-09-01 umdatiert (vermerkt), 5 Hand-Zeilen GESETZT mit Vier-Augen-Grund,
  Korrekturzeile für Versteckte Leckereien.

### `automation/produkttyp_vereinheitlichen.py` (Plan 9)
- Ledger-Zeile neu: `datum, id, alt, neu, zeit, lauf` (LAUF=… oder Startminute); Altbestand rückwirkend gekennzeichnet:
  2'620 «2026-10-02-dubletten», 984 «2026-10-04-morgen», 144 «2026-10-04T2300-sammel» (Grenze Zeile 3605 am Typwechsel
  Trend-Produkt→Trend-Gadget Mode/Schuhe gemessen), 152 Fremdformat unverändert.
- `--zurueck LAUF=<kennung>`: nur diese Zeilen, Fremdformat-Zeilen gezählt und übersprungen; ohne LAUF nur Kennungsliste.
  Gemessen: `--zurueck` → Liste 4 Kennungen; `--zurueck LAUF=2026-10-04T2300-sammel` → genau 144 Produkte, 0 gid-Fehler.
- NOT_EQUALS-Sperre nur bei `inCollection` (Sammeltyp-Pfad, je Produkt): die 2 Feuerzeuge wurden dadurch frei → Raucherzubehör.
- Scharfer Lauf LAUF=2026-10-05-kategorie: 7 umgelegt, 7 zurückgelesen (Raucherzubehör 2, Wohnen & Deko 2, Handy-Zubehör 1
  [Gel-Pads], Küche & Bar 1 [Antirutsch-Mat], Auto-Zubehör 1 [Bürsten-Set]); Trend-Produkt aktiv 6 → **1**, Trend-Gadget 4 → **1**.

### `automation/kategorie_rein_2.py` (Prüfer Index 3, Plan 20-Teil)
- VORHER-Ledger: nur noch Abgänge, nur wenn es welche gibt, mit Zeitstempel. Datei bleibt (23'818 → 23'835 Zeilen: die 17 echten
  Abgänge von heute, statt +11'000). Trockenlauf bestätigt 0 Wachstum ohne Abgänge.
- TIER_BAN `luftbefeuchter|filtergewebe|pet bear`, TIER_FREMD + «Wellness & Aromatherapie»; Büro-FREMD + «Wellness & Aromatherapie»
  (Entscheid: Schreibtisch-Luftbefeuchter sind kein Büromaterial, sie bleiben in «Aroma & Diffuser»); kern_ban Kinder
  `katzen-?spielzeug|katzenhängematte|hunde-?plüschtier|hunde-?nächte|für (ruhige )?hunde|katzen-?plüschkissen`;
  ECHT `kuschel` → `kuschel.{0,6}(kinder|baby)`. Kanarienvögel 19/19 (alle Prüfer-Titel + Gegenproben Kuscheltier/Babydecke/Mauspad).
- Scharf für die 3 Kollektionen: Haustierwelt −2 +1 (3'301), Büro −10 (133), Kinder & Baby −5 (3'452); `--nachmessen` 3/3 ✅
  (Regel = TAG, aktiv = mit Tag). Nachgemessen: `kat-buero ∧ kat-aroma` 11 → 1, `kat-kinder-baby ∧ Heimtextilien` 2 → 1.

## sub-hund / sub-katze (Plan 20)
Kein Setzer gebaut — die Tags haben keinen Abnehmer (0 Kollektionen, 0 Skripte); der wirksame Setzer ist `kategorie_rein_2.py`
mit `kat-hunde`/`kat-katzen`. Differenz zu den Welten lokal gemessen (Mitglieder ∩ Tag):
- Hundewelt aktiv 1'660 vs. kat-hunde 1'686 → **1,6 %** (33 nur in der Welt = Motivware/Fremdtyp: Hunde-Print-Shirt, Hundelaterne,
  Plüschkissen Hundeform; 59 nur im Tag = «für Hund & Katze»-Ware ohne «Hunde» im Titel).
- Katzenwelt aktiv 762 vs. kat-katzen 736 → **3,4 %** (89 nur in der Welt: Katzenring, Katzen-Armbanduhr, Katzenaugen-Nagelsticker …).
Beide ≤ 5 %. Hinweis: `productsCount(collection)` zählt Entwürfe mit (2'422/1'151), nur ACTIVE zählt.

## Nachher (04:08 UTC)
- aktive ohne Kategorie **0** · Advent Calendars 13 · Remote Control Toys 17 · Power 9 · Trend-Produkt 1 / Trend-Gadget 1 (Importer legt
  weiter Sammeltypen an — Plan 16).
- Aroma-Diffuser (Plan 20, nur nachmessen): Typ «Wellness & Aromatherapie» 153 aktiv, «Aroma-Diffuser» 1, Beauty-Tools in kat-aroma 1.

## Offen / nicht gemacht
- Plan 16 (Importer setzt Typ aus Kategorie) — nicht dieser Bereich; Trend-* füllt sich täglich nach.
- Prüfer Index 3 «optional» (Aroma-BAN `katzen`, Handy-BAN `laptop`, Ladegeräte-FREMD Gaming) — < 10 Produkte, nicht angefasst.
- Ampel-Altbug (`betreiber_ampel.py` Z. 501 `>` statt `>=`) — Datei nicht in diesem Auftrag; Stand liefert `_kategorie_stand.json`.
- WARTE_MIN/Timeout-Lücke beim Bulk-Pfad (Ledger erst nach Rückkehr) — nicht geändert, idempotent.
