# Dauerauftrag: Zahllink direkt erstellen (Betreiber 11.10.2026)

**Wortlaut Betreiber:** «link für später merken, dass du direkt link für mich erstellst zum zahlen».

## Regel
- Wenn eine CJ-Bestellung auf Zahlung wartet, erstellt die Sitzung den **Zahllink direkt** und legt ihn dem Betreiber vor.
  Der Betreiber sucht nichts in der CJ-Konsole.
- **Bezahlt wird nur vom Betreiber.** Die Sitzung zahlt nie, belastet nie Guthaben.
- Vor dem Link prüfen: Shopify-Bestellung bezahlt, Kunde + Adresse stimmen, CJ-Betrag plausibel.

## Stand 11.10.2026
- **Shopify #1023** (heute, bezahlt CHF 63.81, 1 × Magnetische 3-in-1-Ladestation, unversandt).
  Vorhandener CJ-Zahllink vom Betreiber: https://cjdropshipping.com/mine/payment?pid=P2109213079232450560
  ⚠️ Die Zuordnung «Link gehört zu #1023» ist **unbestätigt**. Ohne CJ-Konsole lässt sich nicht lesen, zu welcher Bestellung die pid gehört.
- CJ-Bestellliste (wartende Zahlungen): https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5

## Nachtrag 11.10.2026 (Betreiber: «cj waren für 59 bezahlt»)
- Betreiber hat die CJ-Bestellung bezahlt (Betrag laut Betreiber 59).
- Shopify #1023: weiterhin PAID / UNFULFILLED, keine Sendungsnummer.
- `_cj_order_watch_state.json` hat **keinen Eintrag** für #1023 → die Sitzung kann CJ-Auftrag und Shopify-Bestellung nicht verknüpfen.
- Offen: CJ-Bestellnummer vom Betreiber, dann Eintrag in die Überwachung, damit die Sendungsnummer zurück zu Shopify geht.
