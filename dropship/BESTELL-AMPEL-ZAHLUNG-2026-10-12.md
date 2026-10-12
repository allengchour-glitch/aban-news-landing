# Bestell-Ampel: angelegter, unbezahlter CJ-Auftrag stand als «KEIN CJ-Auftrag» da (12.10.2026, Verbesserungsrunde 16:25)

## GEMESSEN
- Shopify #1025 (15:57 UTC, CHF 91.62). Der Bestell-Automat legte um 16:02 **LX1025 = SD2610121602510642100** ($73.29) an
  und schrieb es sofort ins Ledger `dropship/_cj_orders_done.txt`.
- Die Ampel las nur `dropship/_cj_order_watch_state.json`. Den Zustand schreibt `cj_order_watch.py`, und das lief nur alle 2 h
  (letzter Lauf 14:32). Um 16:26 stand deshalb «#1025 → KEIN CJ-Auftrag». Ab 2 h wäre daraus ein ⚠️-Fehlalarm geworden.
  Genau diese Zeile braucht der Betreiber zum Bezahlen (Dauerauftrag Zahllink 11.10.).

## GETAN
1. `automation/bestell_ampel.py`: Fehlt der Abgleich, liest die Ampel das Ledger des Automaten (`ledger_eintrag()`) →
   «LX1025 angelegt (SD…, $73.29), CJ-Abgleich folgt — falls unbezahlt: 💳 Zahlliste». Bei CJ-Status CREATED/IN_CART/UNPAID
   hängt sie immer «→ 💳 zahlen: …orderList?orderType=5» an. `--selbsttest` 4/4 (inkl. «#102» ≠ «#1025», «(bereits-bei-cj)» zählt nicht).
2. `automation/fixer_keepalive.sh`: `cj_order_watch.py` läuft zusätzlich **sofort**, wenn das Ledger jünger ist als das
   Abgleich-Log (neuer Auftrag) — nicht erst nach 2 h.
3. Nachgemessen: Abgleich 16:3x → `LX1025: UNPAID`; Ampel-Zeile «#1025 1h CHF 91.62 → LX1025: UNBEZAHLT → 💳 zahlen: …».

## OFFEN (Betreiber)
- LX1025 bezahlen: https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5 — nur SD2610121602510642100 über $73.29.
