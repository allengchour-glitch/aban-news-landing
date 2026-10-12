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
- **CJ-Bestellnummer #1023 = CJ2610115452995745998** (Teil SD2610110914560648000, Subtotal $59.52, Status «Pending» = bezahlt, noch nicht verschickt). In `_cj_order_watch_state.json` eingetragen, damit die Sendungsnummer zurück zu Shopify geht und nichts doppelt bestellt wird.

## Nachtrag 11.10.2026 14:56 UTC: Shopify #1024 (Bügeltransfer, Mister DTF — KEIN CJ)
- #1024 bezahlt CHF 40.12, Schweiz. Zwei Bügeltransfers: TRANSFER-A3 (Design «Bild») und TRANSFER-A5 (Text «Feivel»).
- **Lieferant ist Mister DTF (misterdtf.ch), manuell** — `dropship/pod/MISTER-DTF-FULFILLMENT.md`. Die CJ-Automatik legt sie nicht an (`#1024: keine CJ-Artikel`).
- Druckdateien liegen NICHT im Repo (Kundendesign, enthält einen Namen). Sie wurden dem Betreiber direkt geschickt; Ablage `scratchpad/druck1024/`, nicht versionieren.
- Nächster Schritt Betreiber: Dateien auf misterdtf.ch hochladen (A3 + A5), bestellen, Shopify-Bestellung als erledigt markieren.

## Merkzettel 11.10.2026: Preise später anpassen (Betreiber «preise anpassen später»)
- **Noch nicht geändert.** Nur auf Auftrag des Betreibers.
- Vermutlich gemeint: **Bügeltransfer** (Marge knapp, #1024 ca. 2 CHF). Aktuell A3 CHF 24.90, A5 CHF 11.90 im Shop. Einkauf Mister DTF: A3 Öko-Tex 12.90 pro Bogen, Versand A-Post 9.90 extra.
- Rückfrage offen: welche Preise gemeint sind (Bügeltransfer, Sirène, andere).

## Nachtrag 11.10.2026 20:30 UTC (Betreiber «cj pay link verbessern bei bestellung»)
- Zahllink-ID `P2109213079232450560` steht in keinem Feld der CJ-API und ist nicht gleich einer Bestell-ID. Ein direkter Link
  pro Bestellung ist daher nicht erzeugbar.
- Handy-Benachrichtigung zeigt jetzt direkt die Liste der wartenden Bestellungen: `orderList?orderType=5`.
- #1023 ist bezahlt (CJ UNSHIPPED, Zahlung 09:24 UTC), kein Zahllink mehr offen.
- Leere CJ-Hüllen (`DP…`, CREATED, ohne Betrag) kommen vom CJ-Shopify-Connector, nicht vom Automaten. Nie bezahlen; der Betreiber entfernt sie.

## 12.10.2026 16:02 UTC: Shopify #1025 → CJ LX1025 wartet auf Zahlung
- Shopify #1025 (15:57 UTC): bezahlt CHF 91.62, Lausanne, 2 × K68 Signal-Detektor, Gratisversand, Neukunde.
- Automat (cj_fulfill_runner 16:02): angelegt **LX1025 = SD2610121602510642100**, Ware $56.48 + CJPacket EQ Sensitive $16.81
  = **$73.29**, Marge ~CHF 30.58, 6–10 Tage. CJ-Status CREATED, Guthaben $0.00 → Betreiber zahlt.
- Zahllink (Liste der wartenden Zahlungen): https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5
  Dort nur die Bestellung **SD2610121602510642100 / LX1025 über $73.29** bezahlen; leere `DP…`-Hüllen ohne Betrag nie.
- Nach der Zahlung holt `cj_order_watch.py` die Sendungsnummer und meldet sie an Shopify zurück (nichts von Hand nötig).
