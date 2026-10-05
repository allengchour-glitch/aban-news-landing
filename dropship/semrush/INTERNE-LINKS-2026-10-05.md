# Interne Verlinkung der Seiten mit Suchvolumen — 05.10.2026
Betreiber: «das geht mehr verbesserung mit semrush». Semrush-Einheiten in diesem Bereich: **0** (nur die Ernte vom 02.10. gelesen).
Werkzeug: `automation/interne_links.py` (`--messen`, `--trocken`, `--scharf`, `--zurueck [ledger]`, `--pruefen`). Ledger mit Altwerten: `dropship/semrush/_interne_links_2026-10-05.tsv`.
## Messung (vorher, 07:35 UTC)
- Quellen gelesen: 541 Kollektionen (371 im Onlineshop veröffentlicht und gefüllt), Hauptmenü + Footer (`menus`), Startseite (`templates/index.json`, 28 Kollektions-Verweise), 322 veröffentlichte Ratgeber-Artikel, 108 veröffentlichte Seiten.
- Ziele: 40 Kollektionen mit dem höchsten Schweizer Suchvolumen (`suchvolumen.fuer_kollektion`, 6'600–27'100/Mt) + 38 Ranking-URLs Platz ≤ 30 (`luxestyle_ch_top30_2026-10-02.csv`).
- **Kollektionstexte verlinkten einander nie** (Spalte «Koll.» überall 0). Eingehende Links der Top-40-Kollektionen: Minimum 1, Mittel 3.5; **20 der 40 hatten ≤ 2**, 10 davon nur den einen Menü-Eintrag (nintendo-switch 27'100/Mt, pc-gaming, pool, vorhaenge, puzzles …).
- Von 37 Ranking-Produkten sind **12 DRAFT** (Google listet tote Seiten, Klasse google_nachfrage_luecke), 5 Kostüm (Hausregel), 20 kaufbar — **19 davon mit 0 eingehenden Links** (nur der Luftbefeuchter hatte 1 Ratgeber-Link).
- `/collections/beleuchtung-lampen` (Platz 20 «stimmungslicht», 6 eingehende Links aus Ratgebern/Seiten) ist **unveröffentlicht** und leitet per 301 auf `sub-beleuchtung` — die 6 Links laufen über einen Umweg.
- Kaufbare Ziele mit < 3 eingehenden Links: **42 von 62**.
- Punkt (3): von den Unterkollektionen im Hauptmenü hatten **129** keinen Link zurück zur Oberkategorie im eigenen Text (gezählt ohne Menü; «Highlights»/bestseller nicht als Oberkategorie gewertet).
## Änderung (07:47 UTC, `--scharf`)
- **149 Kollektionstexte** erhielten am Ende einen Block `<!-- ls-verwandt --> … <!-- /ls-verwandt -->`: «Passend dazu: …» mit 2–4 Links (Ankertext = Suchbegriff, wenn er zum Titel passt, sonst der bereinigte Titel; `ss` statt `ß`) und/oder «Zur Übersicht: <Menü-Titel der Oberkategorie>». 149/149 live zurückgelesen, 0 Fehler. Insgesamt 192 Links, davon 63 «Passend dazu» und 129 Übersicht-Links.
- Quellen nur thematisch: Menü-Eltern, Menü-Geschwister (mit gemeinsamer Welt zuerst), eigene Unterkollektionen, Wortstamm + gemeinsame Welt, Welt-Teilmenge. Für Produkte: ihre Kollektionen ohne Sammel-/Preis-Kollektionen und nur mit gemeinsamer Welt zum Produkttitel (kleinste zuerst).
- Ausgeschlossen: Entwürfe, leere/unveröffentlichte Kollektionen, Kostüm/Fasnacht/Halloween/Erotik/Tabak/Smoke/Klingen (Handle, Titel, Produkttyp, Tags), POD/Editor, Sammel-Kollektionen (all, bestseller, neu, viral-hits, unter-chf-25 …) als Quelle.
- Rückweg geprüft: `--zurueck` auf ein Ein-Zeilen-Ledger (vorhaenge) stellte den Altwert her (Block weg, 327 Zeichen), `--scharf` setzte ihn wieder (Ledger-Zeilen 07:50/07:51).
- Live (WebFetch 07:52 UTC): /collections/sub-haustier (Kratzbäume · Kratzsäule · Zur Übersicht: Kinder & Haustier), /collections/elektronik-technik (Nintendo Switch · 3D-Drucker & Stifte · Kopfhörer & Lautsprecher · PC-Komponenten & Speicher), /collections/schuhe (Sneaker & Sportschuhe · Ballerinas, Flats & Loafers · Ballettschuhe) — alle drei zeigen den Block mit genau diesen Links.
## Nachmessung (07:49 UTC, `--messen`)
- Kaufbare Ziele mit < 3 eingehenden Links: **42 → 16** von 62. Top-40-Kollektionen: Minimum 1 → **3**, Mittel 3.5 → **5.0**, unter 3: 20 → **0**.
- Alle 20 Kollektions-Ziele unter 3 sind jetzt ≥ 3. Die 16 verbliebenen sind Produkte, für die es nicht genug thematisch passende Kollektionen gibt (Kleider: nur `sub-kleider` + `damen-mode`) oder deren Kategorie falsch ist (siehe Offen).

| # | Ziel | Suchbegriff | Vol./Mt | Pos. | eingehend vorher | eingehend nachher | Status |
|---|---|---|---|---|---|---|---|
| 1 | /collections/nintendo-switch | nintendo switch | 27100 |  | 1 | **3** | ok |
| 2 | /collections/elektronik-technik | elektronik | 18100 |  | 15 | **28** | ok |
| 3 | /collections/haushaltsgeraete | staubsauger | 18100 |  | 5 | **5** | ok |
| 4 | /collections/schmuck-uhren | uhren | 18100 |  | 2 | **11** | ok |
| 5 | /collections/3d-drucker | 3d drucker | 14800 |  | 2 | **3** | ok |
| 6 | /collections/gaming | gaming pc | 14800 |  | 7 | **7** | ok |
| 7 | /collections/kaffee-ecke | kaffeemaschine | 14800 |  | 4 | **4** | ok |
| 8 | /collections/parfum-duefte | parfum | 14800 |  | 9 | **9** | ok |
| 9 | /collections/pc-gaming | pc gaming | 14800 |  | 1 | **3** | ok |
| 10 | /collections/schuhe | schuhe | 14800 |  | 9 | **18** | ok |
| 11 | /collections/sub-bademode | bikini | 14800 |  | 4 | **4** | ok |
| 12 | /collections/t-shirts-tops | t-shirt | 14800 |  | 3 | **3** | ok |
| 13 | /collections/audio-sub | kopfhörer | 12100 |  | 3 | **3** | ok |
| 14 | /collections/elektronik-audio | kopfhörer | 12100 |  | 1 | **3** | ok |
| 15 | /collections/elektronik-laden | powerbank | 12100 |  | 7 | **7** | ok |
| 16 | /collections/kopfhoerer-audio | kopfhörer | 12100 |  | 4 | **4** | ok |
| 17 | /collections/pool | pool | 12100 |  | 1 | **3** | ok |
| 18 | /collections/smartwatches-wearables | smartwatch | 12100 |  | 5 | **5** | ok |
| 19 | /collections/sneaker-sportschuhe | sneaker | 12100 |  | 2 | **3** | ok |
| 20 | /collections/ventilatoren | ventilator | 12100 |  | 6 | **6** | ok |
| 21 | /collections/vorhaenge | vorhänge | 12100 |  | 1 | **3** | ok |
| 22 | /collections/caps-huete | caps | 9900 |  | 3 | **3** | ok |
| 23 | /collections/foto-tech | kamera | 9900 |  | 2 | **3** | ok |
| 24 | /collections/garten-balkon | gartenmöbel | 9900 |  | 7 | **7** | ok |
| 25 | /collections/grill-bbq | gasgrill | 9900 |  | 4 | **4** | ok |
| 26 | /collections/licht-decken-steh | stehlampe | 9900 |  | 1 | **3** | ok |
| 27 | /collections/make-up | kosmetik | 9900 |  | 3 | **3** | ok |
| 28 | /collections/portemonnaie | portemonnaie | 9900 |  | 4 | **4** | ok |
| 29 | /collections/puzzles | puzzles | 9900 |  | 1 | **3** | ok |
| 30 | /collections/sticker-aufkleber | sticker | 9900 |  | 2 | **3** | ok |
| 31 | /collections/sub-ballerinas | ballerinas | 9900 |  | 2 | **3** | ok |
| 32 | /collections/wallets-sub | portemonnaie | 9900 |  | 2 | **3** | ok |
| 33 | /collections/aufbewahrung-sub | regale | 8100 |  | 4 | **4** | ok |
| 34 | /collections/beamer-heimkino | beamer | 8100 |  | 3 | **3** | ok |
| 35 | /collections/jeans-denim | jeans | 8100 |  | 2 | **3** | ok |
| 36 | /collections/kratzbaeume | katzenbaum | 8100 |  | 2 | **3** | ok |
| 37 | /collections/pc-komponenten | speicher | 8100 |  | 1 | **3** | ok |
| 38 | /collections/accessoires | accessoires | 6600 |  | 1 | **3** | ok |
| 39 | /collections/geschirr-servieren | geschirr set | 6600 |  | 1 | **3** | ok |
| 40 | /collections/hoodies-sweatshirts | hoodie | 6600 |  | 2 | **3** | ok |
| 41 | /products/ballettschuhe-aus-leder-622800 | ballettschuhe | 590 | 29 | 0 | **2** | ok |
| 42 | /products/herrenuhr-casio-world-time-illuminator-rot-43 | casio illuminator | 320 | 21 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 43 | /products/katzenklo-mobel-aus-holzwerkstoff-42x-030657 | katzenklo möbel | 320 | 26 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 44 | /products/trinkrucksack-hydration-2l-trinkblase | trinkrucksack | 260 | 26 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 45 | /products/elegantes-blumenkleid-639000 | blumenkleid | 260 | 29 | 0 | **2** | ok |
| 46 | /products/kleiner-luftbefeuchter-fur-zuhause-und-buro-7 | kleiner luftbefeuchter | 260 | 23 | 1 | **1** | ok |
| 47 | /products/gesichtsmassagegerat-060097 | gesichtsmassagegerät | 210 | 26 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 48 | /products/intelligentes-wecker-armband-mit-vibrationsal | armband vibration wecker | 170 | 26 | 0 | **0** | ok |
| 49 | /products/holzspiegel-im-europaischen-stil-621200 | holzspiegel | 140 | 17 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 50 | /products/sisal-kratzsaule-fur-katzen-629500 | kratzsäule | 140 | 28 | 0 | **3** | ok |
| 51 | /products/karierte-bluse-633600 | karierte bluse damen | 140 | 30 | 0 | **2** | ok |
| 52 | /products/langes-kissen-aus-eisseide-kuhlend-629200 | eisseide | 140 | 26 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 53 | /products/weihnachts-pyjama-sets-fur-die-ganze-familie- | familien pyjama weihnachten | 140 | 29 | 0 | **1** | ok |
| 54 | /products/elegantes-leopard-kleid-627600 | leoparden kleid | 140 | 27 | 0 | **1** | ok |
| 55 | /products/schreibhilfe-fur-kinder-635600 | schreibhilfe für kinder | 110 | 24 | 0 | **1** | ok |
| 56 | /products/fussgelenkstutze-616900 | fußgelenkstütze | 110 | 21 | 0 | **0** | ok |
| 57 | /products/einfarbige-damen-tunika-bluse-638900 | tunika bluse | 110 | 25 | 0 | **1** | ok |
| 58 | /products/kinder-schuhe-mit-led-licht-609000 | leuchtschuhe kinder | 110 | 30 | 0 | **3** | ok |
| 59 | /products/elegantes-off-shoulder-kleid-602200 | off shoulder kleid | 110 | 24 | 0 | **1** | ok |
| 60 | /products/multifunktionales-push-up-board-fur-oberkorpe | push up board | 110 | 29 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 61 | /products/retro-spielkonsole-068866 | spielkonsole für tv | 110 | 27 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 62 | /products/elegantes-zweiteiler-kleid-im-a-linien-schnit | kleid zweiteiler | 110 | 30 | 0 | **0** | ok |
| 63 | /products/kostum-dieb-t-shirt-fgss2973 | dieb kostüm | 90 | 27 | 0 | **0** | Hausregel-Klasse |
| 64 | /collections/beleuchtung-lampen | stimmungslicht | 90 | 20 | 6 | **6** | nicht kaufbar/online |
| 65 | /products/kostum-aladdin-fgss1022 | aladdin kostüm | 90 | 24 | 0 | **0** | Hausregel-Klasse |
| 66 | /products/corduroy-rucksack-im-preppy-stil-633000 | corduroy rucksack | 90 | 28 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 67 | /products/automatischer-schwenkventilator-fur-kinderwag | kinderwagen ventilator | 90 | 24 | 0 | **3** | ok |
| 68 | /products/horror-maske-fur-halloween-und-fasnacht-82150 | gruselmaske | 90 | 29 | 0 | **0** | Hausregel-Klasse |
| 69 | /products/kostum-haftling-overall-orange-fgss5842 | kostüm häftling | 90 | 22 | 0 | **0** | Hausregel-Klasse |
| 70 | /products/reflektierender-rucksack-mit-grossem-volumen- | reflektierender rucksack | 90 | 30 | 0 | **1** | ok |
| 71 | /products/acryl-beistelltisch-fur-wohn-und-schlafzimmer | beistelltisch acryl | 70 | 16 | 0 | **2** | ok |
| 72 | /products/sonnenbrille-photo-selbsttonend-polarisiert | sonnenbrille selbsttönend | 70 | 30 | 0 | **2** | ok |
| 73 | /products/bausteine-set-baufahrzeuge-fur-kinder-877120 | baustelle kinder | 70 | 30 | 0 | **3** | ok |
| 74 | /products/rock-mit-pailletten-rosa-fgssck4741 | glitzerrock | 70 | 30 | 0 | **0** | ok |
| 75 | /products/cellulite-massage-roller | roller cellulite | 70 | 22 | 0 | **3** | ok |
| 76 | /products/elegantes-sommerkleid-mit-spaghetti-tragern-6 | spaghettiträger kleid | 70 | 28 | 0 | **1** | ok |
| 77 | /products/sonnenbrillen-set-retro-polarized | retro sonnenbrille | 70 | 30 | 0 | **0** | Produkt DRAFT / nicht im Onlineshop |
| 78 | /products/kostum-kapitan-fgssbo8378 | kostüm kapitän | 70 | 29 | 0 | **0** | Hausregel-Klasse |

(Spaltenwerte = Zahl der Quell-Dokumente: Hauptmenü, Footer, Startseite, andere Kollektionstexte, Ratgeber, Seiten; Volltabellen in `_interne_links_messung_2026-10-05.json` = nachher.)

## Offen
- 12 Ranking-Produkte (Platz 17–30) sind DRAFT: casio illuminator, katzenklo möbel, trinkrucksack, gesichtsmassagegerät, holzspiegel, eisseide, push up board, spielkonsole für tv, corduroy rucksack, retro sonnenbrille — Google schickt Suchende auf tote Seiten; Entscheid Ersatz/Reaktivierung gehört zu `google_nachfrage_luecke.py`, nicht hierher.
- `Fussgelenkstütze` (Platz 21, 110/Mt) steht unter Produkttyp «Aufbewahrung & Organizer» und nur in Wohn-Kollektionen → keine passende Quelle; Produkttyp/Tags korrigieren (Bereich Kategorien), dann nimmt der nächste `--scharf`-Lauf sie auf.
- `Intelligentes Wecker-Armband` (Platz 26, 170/Mt) fehlt in der neuen Kollektion `wecker` (Tag `kat-wecker`); mit Tag entsteht die Quelle automatisch.
- 6 Ratgeber/Seiten verlinken `/collections/beleuchtung-lampen` (301 → sub-beleuchtung): Blog/Seiten-Texte liegen beim parallelen Workflow; Direktlink statt Umweg wäre sauberer.
- Footer und Startseite verlinken keine der Top-40-Kollektionen ausser elektronik-technik/aufbewahrung-sub (Startseite); Footer-Rubrik «Beliebte Kategorien» wäre ein Menü-Eingriff (Backup-Pflicht), nicht in diesem Lauf.

## Wächter
`python3 automation/interne_links.py --pruefen` → eine Zeile «INTERNE-LINKS: …», ⚠️ wenn ein Link in einem ls-verwandt-Block auf eine fehlende/unveröffentlichte/leere Kollektion oder ein nicht-aktives Produkt zeigt (05.10.: 149 Blöcke, alle Ziele kaufbar). Wöchentlich reicht; `--scharf` ist idempotent (bestehende Blöcke werden eingelesen, nur Änderungen geschrieben — zweiter Trockenlauf: 0 zu schreiben).
