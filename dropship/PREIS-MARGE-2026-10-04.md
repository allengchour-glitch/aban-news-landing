# Preis / Marge — Fixlauf 05.10.2026 (Betreiber 04.10. «fix 12 h lang alles», Bereich preis-marge)

Regel (unverändert, Betreiber 02.10. «15 % Reserve»): Preis ≥ `marge_wahrheit.mindestpreis(EK, versand=0) / 0,85`, aufgerundet
auf .90. EK = `unitCost` (enthält bei CJ die Fracht schon). Fehlender EK = **unbekannt**, nie 0.

## 1. Messung vorher (frischer Voll-Export, 05.10. 00:08 UTC)

Befehl: `MAXALTER=0 python3 automation/kosten_export_bauen.py` → `/tmp/kost28.jsonl` (485'811 Zeilen = objectCount, letzte Zeile geprüft),
dann Auswertung mit `tools/marge_wahrheit.mindestpreis` (gleiche Formel wie `preis_verlustschutz.boden`).

| Klasse | Zahl |
|---|---|
| aktive Produkte / Varianten | 50'755 / 435'056 |
| **Verlust-Varianten** (Preis < Boden bei 15 % + Gratisversand, EK bekannt) | **0** (Produkte 0) |
| Varianten **ohne EK** | **908** in 315 Produkten |
| davon CJ-SKU | 312 Varianten / **87 Produkte** (83 ganz ohne EK, 4 teils) |
| davon Printful `9000001_…` (POD-Poster/Magnet/…) | 481 / 186 Produkte |
| davon Eigenmarke/Kuratiert (`LX-`, `LXSCH-`, `GLOBAL-`, `MUGSET-`, `SHIRT-`, `SET-`, `LS…`, `TRANSFER-`) | 114 / 41 Produkte |
| davon Fortura | 1 / 1 |
| **Streichpreise** (`compareAtPrice` gesetzt) | **0** von 435'056 — weder Streichpreis < Preis noch Fantasie-Streichpreise |

Der alte Export (03.10. 01:18) zeigte noch 5'742 Verlust-Varianten in 708 Produkten; die hat `preis_verlustschutz` (Aufseher,
Läufe 03.10. 08:08–08:31 und 04.10. 22:46) bereits gehoben — am 04.10. 06:13 meldete er `schon_ok_oder_inaktiv: 708`.
Die Klasse «Verlust bei bekanntem EK» war also sauber. **Die Lücke war der unbekannte EK**: dort prüft der Schutz nichts.

Shopifys Suchfilter `compare_at_price:>0` wird **still ignoriert** (gemessen: `productVariants(query:"compare_at_price:>0")`
liefert Varianten mit `compareAtPrice: null`) → Streichpreise sind nur über den Export messbar; `kosten_export_bauen.py` trägt
`compareAtPrice` jetzt dauerhaft mit (zusätzliches Feld, Vertrag der Leser unverändert).

## 2. Die 87 CJ-Produkte ohne EK — live geprüft (Shopify + CJ `product/query`)

Ledger `_cj_kosten_done.txt` hatte 78 davon quittiert: 70× `cj-abgekuendigt-pruefen`, 6× `cj-ohne-antwort`, 2× `keine-cj-referenz`;
9 standen nirgends. Live (05.10. 00:05–00:12 UTC, 87 Abfragen):

| Urteil | Produkte | getan |
|---|---|---|
| CJ antwortet mit Preis + Gewicht (`ok`) | 21 | EK geschrieben (16 + 2 via `cj_kosten_backfill NUR_IDS`, 3 teils via `ek_varianten_nachtragen NUR_IDS`) |
| CJ 1602002 «removed from shelves» (`weg`) | 47 | siehe Abschnitt 4 |
| CJ 1602003 «Variant has been removed from shelves» | 5 | **offen** — Produkt existiert, unsere Varianten-SKU nicht mehr (Gitarrenplektren, Megaphon, Seiden-Bettwäsche 60 Var., Motorrad-Hausschuhe, Leoparden-Maxikleid) |
| keine CJ-Referenz in der SKU (`CJ-SHOWERCADDY-5SET`, `CJ-CJJJJTJT22925`, `CJ-CJY 104172601AZ`) | 3 | offen (Hand-SKUs vom Mai/Juni) |
| inzwischen DRAFT | 10 | nichts |
| teils (erste Variante hat EK, Rest nicht; Kinder-Canvas-Schuhe zusätzlich) | 4 | EK proportional (`ek_varianten_nachtragen`) |

## 3. Neu bekannter EK → 10 Produkte waren echte Verlustbringer

Sobald der EK stand, fand `preis_verlustschutz` (NUR_IDS, live) **10 Produkte / 34 Varianten unter dem Boden** — unsichtbar,
solange der EK fehlte. Alle gehoben (Rücklesen in der Mutation, Ledger `dropship/_preis_verlustschutz.txt`, Datum 2026-10-05):

| Produkt | alt | EK | neu | Faktor |
|---|---|---|---|---|
| Bambus-Besteckorganizer | 26.90 | 24.35 | 30.90 | 1.15× |
| UV/LED Nageltrockner 120W (8 Var.) | 16.90 | 15.47 | 19.90 | 1.18× |
| Wasserdichte Digitale Sportuhr | 16.90 | 19.29 | 24.90 | 1.47× |
| SKMEI Digitale Sportuhr | 21.90 | 22.15 | 27.90 | 1.27× |
| BlueMagic / GreyMagic Cube Katzentoilette | 50.90 | 62.37 | 77.90 | 1.53× |
| Agility-Trainingsset für Hunde | 92.90 | 115.88 | 143.90 | 1.55× |
| Multiport USB-C Hub | 15.90 | 17.50 | 22.90 | 1.44× |
| LED Stirnlampe mit Bewegungssensor | 20.90 | 32.16 | 40.90 | 1.96× |
| Koreanische Freizeitschuhe (18 Var.) | 29.90 | 28.05 | 34.90 | 1.17× |

Katzentoilette zu CHF 50.90 bei EK 62.37: jeder Verkauf hätte ~CHF 14 gekostet, plus 15 % Rabatt.

## 4. CJ-ausgelistete Ware ohne EK (47) → DRAFT

Trockenlauf 00:30–00:36 UTC: 47/47 erneut 1602002 (zweite CJ-Antwort deckungsgleich mit der ersten). Scharf 00:40–00:47 UTC: **47 → DRAFT**, Rücklesen 47/47 `DRAFT` + Tag `cj-entfernt`. Darunter drei «Serum»-Artikel (topische Kosmetik, Betreiber-Entscheid 30.08.) und «Ersatzklinge für elektrische Schaufel» — beides ohnehin nicht im Sortiment gewollt.

| Produkt (Handle) | CJ-Referenz |
|---|---|
| `automatischer-futterspender-fur-katzen-hunde-653760` | 1747883348753653760 |
| `dr-meinaier-sussholz-serum-anti-aging-lsf-50-154306` | 2037766339821154306 |
| `sussholz-gesichtsserum-mit-vitamin-c-retinol-721473` | 2037764087679721473 |
| `lakritz-wurzel-anti-aging-serum-lsf-50-572354` | 2033471318793572354 |
| `mondphase-tourbillon-automatikuhr-fur-herren-639500` | 2602260805271639500 |
| `profi-dampf-glatteisen-mit-keramik-turmalin-404353` | 2043598066818404353 |
| `2-stockiger-organizer-fur-die-kaffeestation-561793` | 2066457516934561793 |
| `besteckkasten-aus-bambus-ausziehbar-348737` | 2064328754111348737 |
| `geruchsneutrale-katzentoilette-mit-schaufel-ma-987138` | 2044312567296987138 |
| `moderne-geschlossene-katzentoilette-697858` | 2044311973224697858 |
| `musikstander-fur-noten-734594` | 2038890961242734594 |
| `3-zoll-multifunktions-hud-display-531906` | 1981258486785531906 |
| `doppel-handtuchhalter-aus-edelstahl-820674` | 1990686669601820674 |
| `micro-suede-sofauberwurf-anthrazit-623554` | 1990425669161623554 |
| `2er-set-usb-led-taschenlampen-mit-zoom-883906` | 2045027488997883906 |
| `tragbares-grill-set-aus-edelstahl-213378` | 2074708566250213378 |
| `duschvorhangstange-ausziehbar-68-193-cm-794242` | 2074709354646794242 |
| `schuh-organizer-fur-die-tur-10-facher-034946` | 2074709072750034946 |
| `raven-ohrring-611500` | 2607100849421611500 |
| `personalisierte-pluschdecke-628600` | 2606010822031628600 |
| `braunes-uhrenset-fur-herren-898112` | 1726129244343898112 |
| `dreieckskissenkissen-mit-kegelformigem-design-601300` | 2607150524441601300 |
| `edelstahl-reisebecher-621900` | 2607150250381621900 |
| `pimdir-50l-ultraleichtatmungs-rucksack-618300` | 2607151141211618300 |
| `silikon-schutzcover-fur-game-console-607200` | 2607151217501607200 |
| `kinder-teleskop-mit-hd-vergro-erung-623900` | 2607151210531623900 |
| `gelbe-kinderschlauchrutsche-150-cm-604000` | 2607151159591604000 |
| `sicherheitsgurt-fur-felskletterei-620000` | 2607151134401620000 |
| `schwerer-karabiner-mit-sicherung-600700` | 2607151127521600700 |
| `titan-pfanne-mit-anti-haft-beschichtung-603200` | 2607151243191603200 |
| `universal-kochtopf-24cm-fur-induktion-gasherd-615600` | 2607151219221615600 |
| `baseball-und-softball-bucket-tasche-mit-schlag-631000` | 2607160348361631000 |
| `flachboden-topfset-mit-abnehmbaren-griffen-610200` | 2607151239331610200 |
| `solar-wlan-uberwachungskamera-768896` | 1381186958658768896 |
| `pfanne-mit-antihaft-beschichtung-622600` | 2607170507061622600 |
| `ersatzklinge-fur-elektrische-schaufel-628900` | 2607200701141628900 |
| `acryl-organizer-fur-brett-und-kartenspiele-637800` | 2607300132171637800 |
| `polyester-aufbewahrungstasche-634900` | 2607300845401634900 |
| `handheld-mit-drehbarem-bildschirm-603400` | 2606300847291603400 |
| `gps-tracker-fur-kinder-636000` | 2606010719251636000 |
| `helm-intercom-mikrofon-3er-set-638600` | 2607280549061638600 |
| `smart-armband-mit-herzfrequenz-und-schlaf-trac-605824` | 1380840579222605824 |
| `mini-rc-helikopter-sturzfester-flugspass-604300` | 2605110545101604300 |
| `high-speed-mobile-ssd-913088` | 1428302779037913088 |
| `ultradunne-magnetische-powerbank-mit-qi2-611500` | 2511200734111611500 |
| `non-x-4-lagen-liegetuch-625200` | 2607230551451625200 |
| `dekokissen-im-modernen-luxus-stil-303936` | 1583273835611303936 |

Regel und Ledger wie `cj_ausgelistet_sichtbar.py` (Tags `cj-entfernt`, `cj-entfernt-2026-10-05`, zusätzlich `ohne-ek-cj-weg`;
Zeile in `dropship/_cj_nachpruefung.tsv`, Altwerte in `dropship/_preis_marge_cj_weg_2026-10-05.tsv`). Vor jeder Mutation
Live-Lesen + CJ ein zweites Mal gefragt; nur 1602002 zählt.

## 4b. Zweite Messung 00:55 UTC: 371 NEUE Verlust-Varianten — alle vom selben Morgen

Frischer Export nach dem Lauf (`MAXALTER=0 kosten_export_bauen.py`, 486'016 Zeilen): **371 Verlust-Varianten in 27 Produkten**,
alle `cj-real`, alle angelegt 05.10. 00:13–00:41 UTC vom laufenden Grind (`cj_category_fill.mjs`, Kinderschuhe/Schmuck/Rucksäcke).
Beispiel «Studentenschulranzen» (140 g): Preis 25.90, EK 21.48 → Boden 26.90.

**Ursache (an der Zahl nachgerechnet):** `cj_category_fill.mjs` hatte EIGENE Kopien von `chf()`, `kosten()`, `gewicht()` aus dem
August — Fracht-Boden 15 (widerlegt 23.08.), `.split('--')`-Spannenfehler, kein Verlustschutz-Boden, Abrundung. Der Fix vom
04.10. in `cj_preis.mjs` (`bodenVerlustschutz`, `aufNeunzig`) kam dort nie an (`cj_sku_import.mjs` importiert seit 27.08. aus
`cj_preis.mjs`, diese Datei nicht). Rechnung Schulranzen mit der alten Kopie: CJ $7.20 → EK 6.48 + 15 = **21.48** ✓, Preis
landed 6.48 + (15 − 7) = 14.48 → max(20.27, 25.10, 16.90) → **25.90** ✓ — beide Zahlen exakt. Wahre Kosten 6.48 + 5.68 = 12.16.
Folge seit 28.08.: EK leichter Ware um 15 − max(5, 3.4 + 16.3·kg) zu hoch (bis CHF 10), `kosten_boden15_korrigieren.py`
reparierte täglich ~400 davon («war NIE unter Einstand») — die Quelle lief weiter.

Getan:
- `cj_category_fill.mjs`: die drei Kopien entfernt, `import { chf, kosten, gewicht } from './cj_preis.mjs'` (Signaturen identisch,
  `node --check` ok; laufende Runner laden es beim nächsten Node-Start, Backup der alten Fassung im Scratchpad).
- Die 27 Produkte / 371 Varianten: `preis_verlustschutz NUR_IDS` scharf 00:47 UTC gehoben (Faktor 1.04–1.10, Ledger 05.10.).
  ⚠️ Diese Hebung rechnete mit dem AUFGEBLÄHTEN EK — die Preise sind damit etwas höher als nötig (≈ +1 CHF), nie zu tief.
  Nicht zurückgesetzt: ohne den wahren EK (CJ-Preis je Produkt) gibt es keinen Boden, unter den man senken dürfte.

## 5. Werkzeuge erweitert (kein Neubau)

- `automation/kosten_export_bauen.py`: Feld `compareAtPrice` im Bulk-Export.
- `automation/cj_kosten_backfill.mjs`: `NUR_IDS=<Datei>` (gezielte Produkte, Ledger-Quittung gilt nicht als Urteil für immer) und
  siebte SKU-Form `product/query?variantSku=` als letzter Rückfall (Freizeitschuhe/Laufschuhe blieben sonst ohne EK).
- `automation/ek_varianten_nachtragen.py`: `NUR_IDS=<Datei>` statt Schreiber-Tags.
- `automation/preis_verlustschutz.py`: `NUR_IDS=<Datei>` (live prüfen statt Export-Kandidaten); leere Kandidatenliste zählt nicht
  mehr als «heute quittiert» (sonst übersprang der Lauf alle NUR_IDS-Produkte, sobald das Ledger eine Zeile von heute hatte).
- **NEU `automation/ek_luecke_cj.py`** (täglicher Wächter, Trockenlauf Standard, `SCHARF=1`): (1) aktive CJ-Produkte ohne EK aus
  `/tmp/kost28.jsonl` → Backfill / Varianten-Nachtrag → Verlustschutz live; (2) **alle aktiven Produkte der letzten 36 h live
  durch den Verlustschutz** (schliesst die Export-Lücke bei Neuimporten: Selbsttest 00:55 — 870 Neuprodukte, 4 unter Boden);
  (3) wer dann noch ohne EK ist und bei CJ 1602002 bekommt → DRAFT wie `cj_ausgelistet_sichtbar`. Halbgeschriebener Export →
  PAUSE statt Traceback (eigene Falle beim ersten Lauf).

## 6. Bewusst NICHT gemacht

- **Printful-/POD-Varianten ohne EK (481)** und Eigenmarke/Sets (114): kein Lieferanten-Endpunkt in diesem Lauf, Editor/POD ist tabu;
  Preise dort 11.90–199.90 ohne Kostenbasis → offen, nicht geraten.
- Keine Preissenkung, kein Start von `reprice_to_benchmark.py`.
- **Aufgeblähter EK im Altbestand NICHT korrigiert:** Schätzung aus Export (cj-real, ab 28.08., eine Variante mit Gewicht < 712 g
  und EK ≥ 15): **~3'940 Produkte** tragen vermutlich den Boden 15 im EK. Für Ein-Varianten-Produkte gibt es keine Signatur
  (`kosten_boden15_korrigieren` fasst sie bewusst nicht an); Beweis nur über CJ `product/query` (10 Punkte je Produkt ≈ 40'000
  Punkte). Empfehlung: `cj_kosten_backfill.mjs NUR_IDS` mit Überschreib-Modus über mehrere Tage, dann Verlustschutz — eine eigene
  Klasse, nicht in diesem Lauf.
- Die 5 «Variante entfernt» (1602003) nicht gedraftet: Produkt bei CJ vorhanden, nur die hinterlegte Varianten-SKU fehlt — braucht
  Varianten-Neuzuordnung oder Urteil; der tägliche Wächter wertet 1602003 als «kein Urteil».
- Kein Theme, keine Kundenmail, nichts gelöscht.

## 7. Nachmessung

| Messung | vorher (Export 03.10. 01:18 / 05.10. 00:08) | nachher |
|---|---|---|
| Verlust-Varianten, EK bekannt | 5'742 (03.10.) → 0 (00:08) | Export 00:55: 371 — alle Neuware vom Morgen, gehoben 00:47; Neuware-Livecheck (870 Produkte, 36 h) 01:00 UTC: 0 offen |
| aktive Varianten ohne EK | 908 (315 Produkte) | 674 (Export 00:55); CJ-Anteil 312 → 78 Varianten; nach Wächterlauf 01:01: 6 CJ-Produkte (3 ohne CJ-Referenz, 3× «Variant removed» 1602003) |
| aktive CJ-Produkte, bei CJ ausgelistet, ohne EK | 47 (verkäuflich, in 6 Kanälen) | 0 (alle DRAFT, Rücklesen 47/47) |
| Streichpreise gesetzt | 0 | 0 |
| Preise gehoben heute (Ledger `_preis_verlustschutz.txt`, 2026-10-05) | — | 412 Varianten |
| Importer-Formel `cj_category_fill.mjs` | eigene August-Kopie (Boden 15, ohne Verlustschutz) | importiert `cj_preis.mjs` |

Trockenlauf → scharf bei jedem Schritt; keine Senkung; nichts gelöscht; Theme/Kundenmails/CJ-Bestellungen unberührt.
