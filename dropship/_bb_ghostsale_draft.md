# Ghost-Sale-Schutz: BigBuy-Draft (2026-07-18)

**Befund (verifiziert):** Alle 5 Zwangs-Rückerstattungen #1006–#1010 waren BigBuy-Produkte
(SKU BB-*), 0 CJ. Ursache: BigBuy 78% totes Lager + Moneybox=0 (keine API-Fulfillment möglich).

**Aktion:** 201 aktive BigBuy-Produkte OHNE Tag `bb-lieferbar-ch` (unverifiziert lieferbar) auf
DRAFT gesetzt, Tags `ghost-sale-schutz-bb-draft` + `nicht-verifiziert-lieferbar` (reversibel).
Ledger: /tmp/bb_draft_done.txt (201 IDs).

**Ergebnis:** Aktive unverifizierte BigBuy = 0 (war 201). Aktiv-BigBuy gesamt: 337 → 136 (nur CH-verifiziert).

**OFFEN (User):** Moneybox aufladen → dann können auch die 136 verifizierten sicher fulfillen.
Solange Moneybox=0 ist selbst bei den 136 jede Bestellung ein Refund-Risiko. REVIVE der 201:
`tag:ghost-sale-schutz-bb-draft` → status ACTIVE, sobald BigBuy finanziert + Stock verifiziert.

## UPDATE (2026-07-18, User: "bigbuy ist doch geld drauf")
- **Moneybox verifiziert: €1000.00** (live покупка purse.json) — Geld IST da, frühere 0-Lesung war falsch.
- **Frischer Live-Bestand gezogen** (productsstockbyhandlingdays, 299.060 Produkte): nur **2.669 lagernd (0,9%)**
  → BigBuy ist zu 99% totes Lager (bestätigt Import-Deaktivierung).
- **Präziser Fix statt Blanko-Draft:** `/tmp/bb_fix2.py` gleicht alle 469 relevanten BB-Produkte
  (aktiv + die 201) gegen den frischen Bestand ab: **lagernd → ACTIVE + tracked+DENY+echte Menge**
  (verkaufbar UND ghost-sale-sicher, weil DENY bei 0 = unkaufbar); **ausverkauft → DRAFT**.
  Damit sind in-stock BigBuy-Artikel wieder verkaufbar, ohne Refund-Risiko. Ledger /tmp/bb_fix2_done.txt.

## ABGESCHLOSSEN (2026-07-18): 469/469 verarbeitet
- **302 lagernd → ACTIVE + tracked:true + DENY + echte Menge** (verifiziert: Shopify-Menge = BigBuy-Live-Bestand aufs Stück).
- **167 ausverkauft → DRAFT.**
- Ghost-Sale STRUKTURELL unmöglich: DENY bei qty=0 = unkaufbar. Bestände meist 1–2 Stück (verkaufen schnell aus, dann auto-unkaufbar).
- Marken aktiv: Bellevue, Folli Follie, Radiant, Breil, Cristian Lay, Tommy Hilfiger, Tom Hope u.a. (Schmuck/Uhren).
- OFFEN: BigBuy-Stock verändert sich → periodisch `bb_fix2` mit frischem productsstock-Pull wiederholen (Bestand geht schnell auf 0).
