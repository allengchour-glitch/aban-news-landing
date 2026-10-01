# Ersatz-Zuordnung für Artikel ohne CJ-SKU (01.10.2026, Verbesserungsrunde)

## Gemessen
- Landeseiten 7 T: «Kristall-Set 3-teilig» 6 Sitzungen, 2 Warenkörbe, 2× Kasse (dazu #1020 am 29.09. gekauft).
- SKU `LX-23-KRISTALL-SET-3-TEILIG` = hand-kuratiert, keine Bezugsquelle. Die Bestell-Engine filtert nur CJ-SKUs →
  jede Kristall-Bestellung landet als «keine CJ-Artikel (anderer Lieferant)» und wartet auf Handarbeit (so bei #1020:
  Ersatzsuche, CJ-Auftrag von Hand, Betreiber «1020 push»).
- Abgebrochene Kassen (Shopify): 5 gespeichert, 3 davon unter der Gratisgrenze (+ CHF 7.00), u. a. Kristall 29.90 → 36.90.
  Gratisversand-Balken existiert schon (Vault 13.09.) — kein neuer Fix dort.

## Getan
- `cj_order_engine.py`: `zuordnung_vid(sku)` liest `dropship/_cj_varianten_zuordnung.tsv` für JEDE SKU-Form; `ist_cj()` zählt
  Artikel mit Eintrag mit; `vid_fuer()` holt die Ersatz-Variante per `variant/queryByVid` und prüft vorher die Auslistung.
- Eintrag `LX-23-KRISTALL-SET-3-TEILIG → 1394197124702408704` (Eight colors-Set1, USD 13.02) mit Beleg #1020-Freigabe.
- Gegenproben: Kristall → Ersatz-vid; LX-Bambus-Diffusor (kein Eintrag) → weiter «anderer Lieferant»; Uhr #1021 unverändert.

## Wächter
- Bestell-Ampel (stündlich) meldet nach 2 h «KEIN CJ-Auftrag»; die Engine schreibt den Grund ins Log.

## Regel
- Ersatz nur mit Betreiber-Freigabe oder Bildvergleich-Beleg eintragen (Spalte 4 = Beleg). Ausgelistete Ersatzware → AUSGELISTET.
