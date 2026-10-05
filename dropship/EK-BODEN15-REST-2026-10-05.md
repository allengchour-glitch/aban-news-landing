# EK-Boden 15: Rest ohne CJ-Punkte erledigt (05.10.2026, Verbesserungsrunde 16:25 + CJ-Fenster)

## Gemessen
- FIX-12H Punkt 15 plante `cj_kosten_backfill.mjs NUR_IDS` (≈ 10 CJ-Punkte je Produkt, ~40k Punkte, Tranchen à 500 über Tage).
- CJ-Punkte nach 16:00 UTC: rest 91, usedToday 106'240 > total 63'387 — kein Reset → der CJ-Weg war heute zu.
- `kosten_boden15_korrigieren.py` (DRY, SIGNATUR=1): **3'703 Produkte** mit dem widerlegten Frachtboden CHF 15 im EK.
  Dieses Werkzeug rechnet den Boden aus Shopify-EK + Gewicht heraus — **0 CJ-Punkte**. Der Aufseher fuhr nur 400/Tag.

## Getan
- 500 (16:25) + 3'203 (Betreiber «nicht drosseln», 17:50) korrigiert; Ledger `_kosten_boden15_fix.txt` 14'274 → 17'977.
- Aufseher-LIMIT 400 → 5'000 (`fixer_keepalive.sh`), damit Nachzügler aus Neuimporten nicht wieder Tage brauchen.

## Nachgemessen
- DRY-Gegenzählung: **0 Produkte offen**. `preis_verlustschutz.py`: **0 Verlust-Varianten**, 0 Hebungen; 674 Varianten ohne EK (POD, tabu).

## Lehre
Ein Plan-Punkt nennt ein Werkzeug — vor dem Lauf fragen, ob ein billigeres dieselbe Klasse schon trifft. Hier lag die
punktfreie Rückrechnung seit 28.08. im Repo; der Plan hätte 40k CJ-Punkte für dasselbe Ergebnis verbraucht.
