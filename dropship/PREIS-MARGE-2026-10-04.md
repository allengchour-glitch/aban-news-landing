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

%%WEG%%

Regel und Ledger wie `cj_ausgelistet_sichtbar.py` (Tags `cj-entfernt`, `cj-entfernt-2026-10-05`, zusätzlich `ohne-ek-cj-weg`;
Zeile in `dropship/_cj_nachpruefung.tsv`, Altwerte in `dropship/_preis_marge_cj_weg_2026-10-05.tsv`). Vor jeder Mutation
Live-Lesen + CJ ein zweites Mal gefragt; nur 1602002 zählt.

## 5. Werkzeuge erweitert (kein Neubau)

- `automation/kosten_export_bauen.py`: Feld `compareAtPrice` im Bulk-Export.
- `automation/cj_kosten_backfill.mjs`: `NUR_IDS=<Datei>` (gezielte Produkte, Ledger-Quittung gilt nicht als Urteil für immer) und
  siebte SKU-Form `product/query?variantSku=` als letzter Rückfall (Freizeitschuhe/Laufschuhe blieben sonst ohne EK).
- `automation/ek_varianten_nachtragen.py`: `NUR_IDS=<Datei>` statt Schreiber-Tags.
- `automation/preis_verlustschutz.py`: `NUR_IDS=<Datei>` (live prüfen statt Export-Kandidaten); leere Kandidatenliste zählt nicht
  mehr als «heute quittiert» (sonst übersprang der Lauf alle NUR_IDS-Produkte, sobald das Ledger eine Zeile von heute hatte).

## 6. Bewusst NICHT gemacht

- **Printful-/POD-Varianten ohne EK (481)** und Eigenmarke/Sets (114): kein Lieferanten-Endpunkt in diesem Lauf, Editor/POD ist tabu;
  Preise dort 11.90–199.90 ohne Kostenbasis → offen, nicht geraten.
- Keine Preissenkung, kein Start von `reprice_to_benchmark.py`.
- Die 5 «Variante entfernt» (1602003) nicht gedraftet: Produkt bei CJ vorhanden, nur die hinterlegte Varianten-SKU fehlt — braucht
  Varianten-Neuzuordnung oder Urteil; der tägliche Wächter wertet 1602003 als «kein Urteil».
- Kein Theme, keine Kundenmail, nichts gelöscht.

## 7. Nachmessung

Frischer Export nach dem Lauf (siehe Feld «nachher» im Ergebnis): Verlust-Varianten 0; Varianten ohne EK %%NACHHER%%.
