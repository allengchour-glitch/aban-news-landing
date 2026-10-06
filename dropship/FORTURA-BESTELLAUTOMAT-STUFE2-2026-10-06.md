# Fortura-Bestellautomat Stufe 2 — Bestellung als XML, Lieferschein zurück (06.10.2026)

## Anlass
Betreiber 05.10.: «jeder kauf muss auch automatisch auslösen bei fortuna». Stufe 1 (05.10.) erkannte Fortura-Positionen und meldete
«im Portal bestellen». Die XML-Muster fehlten seit 22.07.; Fortura (R. Papini) schickte sie am 06.10. 14:56, der Betreiber lud sie
hier hoch (Gmail-Konnektor liefert keine Anhang-Bytes). Abgelegt: `dropship/fortura/Opacc_Orders_Template.xml`, `_Muster.xml`,
`Opacc_Delvry_Template.xml` (keine Personendaten). Der Beispiel-DataFeed (Preise) bleibt bewusst AUSSERHALB des Repos.

## Format (aus dem Template)
`Opacc.ORDERS/DOC`: HEADER (DOC_NO = **LX<nr>**, SHIPMENT nur «EXPRESS» oder leer, DELIVERYDATE, TEXT nicht auf Lieferschein) ·
CUSTOMER/CUST_NO **544341** · DELIVERYADDR (Pflicht FIRSTNAME, LASTNAME, STREET, ZIP, CITY, **EMAIL für DPD-PRO**; optional COMPANY,
EXTRALINE) · POSITIONS/POS (ARTICLE_NO + QUANTITY Pflicht; POS_NO 10/20/…, EAN optional). Rücklauf `Opacc.DELVRY` in /home/DESADV:
ORDER_NO = unsere DOC_NO, TRACKING_NO (DPD, mehrfach), je Position bestellt/geliefert (+ TEXT z. B. Ersatzartikel).

## Gebaut
- `automation/fortura_xml.py`: `bau_orders_xml()` (XML-escaped, Pflichtfelder, nur CH, ArtNr 3–8 Ziffern, Menge > 0, **Gerüst-Abgleich
  gegen das Fortura-Template**: jeder Pfad muss dort vorkommen und umgekehrt), SYNO.FileStation `anmelden/liste/hochladen/herunterladen`
  (Port 443, Zugang `/tmp/fortura_env.sh`), `lies_delvry()`. Selbsttest 7/7 (`--selbsttest`), `--liste` zeigt ORDERS/DESADV.
- `automation/fortura_bestell_engine.py` Stufe 2 (Schalter `dropship/_fortura_xml_aktiv`, gesetzt): je «bereit» → XML → Upload
  `ORDERS_LX<nr>.xml` (overwrite=false, vorher Liste = nie doppelt, danach zurückgelesen) → Status «xml-hochgeladen»; jeder Lauf liest
  DESADV → «versandt» + DPD-Tracking + ⚠️ bei Teillieferung; > 48 h ohne Lieferschein → ⚠️ «bei Fortura nachfragen». Fehlt ein
  Pflichtfeld oder der Zugang → **kein Upload**, Ampel wie Stufe 1. Paket mit Lieferadresse nur in `/tmp` (600), wird nach einem
  Neustart aus Shopify neu gebaut; Ledger ohne Personendaten.
- Läuft stündlich über `engine_keepalive.sh` (bestand schon). Ablauf-Test mit nachgebautem Server 6/6 (Upload einmal, kein Doppel,
  fehlende E-Mail blockiert, Lieferschein → Tracking, Teillieferung gemeldet). Echter Server danach unberührt (ORDERS/DESADV leer).

## Offen
- Erste echte Fortura-Bestellung beobachten: Lieferschein in /home/DESADV binnen ~1–2 Werktagen? Sonst bei Papini nachfragen, ob
  ORDERS-Dateien für Kundennr. 544341 abgeholt werden (Ampel meldet nach 48 h).
- Tracking aus DESADV in Shopify als Sendung eintragen (heute nur Ampel) = nächster Schritt (ohne Kundenmail → `notifyCustomer:false`
  oder Betreiber-Entscheid).
- Schalter aus = Datei `dropship/_fortura_xml_aktiv` löschen.
