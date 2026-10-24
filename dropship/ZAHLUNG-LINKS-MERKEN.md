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
- **Betreiber 12.10. ~16:45 UTC: «bezahle morgen, KK gesperrt»** → LX1025 wird am 13.10. bezahlt. Geprüft: kein eigener Automat
  storniert unbezahlte CJ-Aufträge (cj_zahlung_offen.py meldet nur, cj_fulfill_engine zahlt nie, Guthaben $0). Die Ampel zeigt
  bis zur Zahlung «LX1025: UNBEZAHLT → 💳 zahlen». Am 13.10. nachprüfen: Status UNSHIPPED = bezahlt.

## 12.10.2026 19:56 UTC: Shopify #1026 → CJ LX1026 wartet auf Zahlung (Betreiber «1026 push»)
- Shopify #1026 (19:53 UTC): bezahlt CHF 29.41, Zell (CH), 1 × LED Wasserwellen-Projektionsleuchte (3W, 16 Farben, Stecker, 2 Stück).
- Von Hand angestossen (`cj_order_engine.py`, der 5-min-Lauf hatte sie noch nicht gesehen): angelegt **LX1026 = SD2610121956040669300**,
  Ware $3.82 + CJPacket EQ Sensitive $16.12 = **$19.94**, Marge ~CHF 12.80, 6–10 Tage. Keine Kunden-Telefonnummer → Händler-Nummer als Kontakt.
  Ledger 1 Eintrag (kein Doppel), `cj_zahlung_offen.py`: «2 zu bezahlen ($93.23): LX1025 LX1026».
- Zahllink: https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5 — dort **SD2610121602510642100 / LX1025 $73.29** und
  **SD2610121956040669300 / LX1026 $19.94** bezahlen, zusammen **$93.23**; leere `DP…`/«#…»-Hüllen ohne Betrag nie.

## 13.10.2026 ~15:00 UTC: LX1025 + LX1026 bezahlt (Betreiber «alle zahlung bezahlt in cj»)
- An der CJ-API bestätigt: `cj_order_watch.py` meldet **LX1025 UNPAID → UNSHIPPED** und **LX1026 UNPAID → UNSHIPPED**, `cj_zahlung_offen.py` «nichts offen».
- Bestell-Ampel danach: #1025, #1026 und #1023 «bezahlt, wartet auf Versand», #1024 bei Mister DTF. **Kein Zahllink offen.**
- Die Sendungsnummern holt der Abgleich (alle 2 h) und schreibt sie an Shopify zurück.

## 13.10.2026 16:15 UTC: Prüfung #1023 (Betreiber «check mal 1023»)
- Shopify #1023: 11.10. 09:12 UTC, CHF 63.81 (Gratisversand), «Magnetische 3-in-1-Ladestation», Bern, Erstkundin, bezahlt, in Shopify noch UNERFÜLLT. Die Kundin hat also noch keine Sendungsnummer bekommen.
- CJ LX1023 = SD2610110914560648000: bezahlt 11.10. 09:24, Status UNSHIPPED/PENDING, Lager Dongguan (CN), CJPacket EQ Sensitive. Kosten $59.52 = Ware 46.95 + Fracht 12.57.
- Sendung EQKPT8613048701YQ: nur «Label created. Warehouse is processing» (11.10. 09:26), noch kein Scan beim Zusteller. Nach 2 T 7 h ist das normal (gemessen 1–5 T bis zur Übergabe).
- Leere Hülle «#1023» DP2610110912410642200 (CREATED, Betrag 0) **nie bezahlen**. Sie ist nur der Shopify-Import.
- Neu in der Bestell-Ampel: ab 5 T unversandt erscheint «⚠️ seit N T unversandt → CJ fragen». Für LX1023 wäre das am 16.10. ~09:15 UTC. Bisher gab es dafür keinen Wächter (versand_stillstand prüft nur erfüllte Sendungen).

## 24.10.2026 10:00 UTC: Shopify #1028 → zwei CJ-Aufträge, nur LX1028 ist richtig (Betreiber «falsches Produkt und zu teuer?»)
- Shopify #1028 (07:58 UTC): bezahlt CHF 20.41, Genève, 1 × LED Wasserwellen-Projektionsleuchte, Variante «3W-16color plug in square-1PC» (SKU CJYD188109102BY).
- **RICHTIG:** Automat LX1028 = **SD2610240910290652100**, vid 1717718400048312320 = exakt diese SKU, Ware $2.00 + CJPacket EQ Sensitive $10.96 = **$12.96**
  (billigste der 7 Fracht-Optionen; nächste: CJPacket Sensitive $11.56, YunExpress $12.49), Status CREATED, unbezahlt → Betreiber zahlt in
  https://cjdropshipping.com/mine/dropshipping/orderList?orderType=5 (nur diese Zeile über $12.96).
- **FALSCH:** Hülle `DP2610240831200987600` (08:31 UTC, CJ-Shopify-Connector, Status IN_CART, $19.84 = $5.24 + $14.60), vid 1697153030640115712 /
  SKU CJJT161977605EV = ein ANDERES CJ-Produkt. Der Connector hat die Shopify-Variante falsch zugeordnet. **Nie bezahlen, Betreiber entfernt sie**;
  nicht von Hand ein zweites #1028 anlegen (sonst doppelte Lieferung).
- Ursache nicht behebbar von hier: die Zuordnung Shopify-Variante → CJ-Produkt liegt in der CJ-App (Store-Mapping). Der Automat nimmt die
  SKU aus dem Shopify-Artikel und ist deshalb von der Fehlzuordnung nicht betroffen.
