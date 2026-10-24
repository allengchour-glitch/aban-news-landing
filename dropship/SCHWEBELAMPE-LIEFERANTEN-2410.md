# Schwebende Ladelampe — zwei CJ-Lieferanten gemessen (24.10.2026)

Anlass: der Besitzer schickte einen CJ-Screenshot der „Creative Smartphone Wireless
Charging Suspension Table Lamp Balance Lamp", SKU `CJSN156134801AZ`, USD 8.96.

## Ergebnis: nichts angelegt — der Shop führt das Produkt bereits

`smart-wireless-charger-lampe-365952`, ACTIVE, 7 Kanäle, 5 Medien READY,
VK CHF 28.90, CJ-pid `1703968845146365952`.

## Fracht CN→CH live gemessen (`logistic/freightCalculate`, Kurs USD→CHF 0.82435)

| Lieferant | EK USD | günstigste Fracht USD | Linien | Summe CHF |
|---|---|---|---|---|
| **im Shop** `CJYD185097301AZ` (weiss) | 9.30 | 11.00 — CJPacket EQ Ordinary, 5–9 Tage | **16** | **16.74** |
| im Shop `CJYD185097302BY` (schwarz) | 8.82 | 11.00 — dieselbe Linie | 16 | 16.26 |
| Screenshot `CJSN156134801AZ` (classic) | 8.96 | 12.49 — CJPacket EQ Sensitive, 6–10 Tage | 6 | 17.69 |
| Screenshot `CJSN156134802BY` (wireless) | 10.75 | 12.49 — dieselbe Linie | 6 | 19.16 |

**Der eingetragene Lieferant ist der bessere**: günstiger in der Summe, mehr als
doppelt so viele Frachtlinien, und seine Linien laufen als `Ordinary` statt
`Sensitive`. Ein Wechsel wäre eine Verschlechterung.

## Marge, gerechnet statt geschätzt

- Einzelartikel-Korb (Kundin zahlt CHF 7 Versand): 35.90 − 16.74 = **CHF 19.16**
  vor Zahlgebühr.
- Gratis-Versand-Korb (echte Schwelle CHF 55.56): Beitrag **CHF 12.16**.

## Behoben: die Kostenangabe liess das Produkt wie einen Dünnmargen-Fall aussehen

`unitCost` stand auf **CHF 22.94** (= USD 27.8). CJs heutiger Warenpreis ist
USD 9.30 = **CHF 7.67**. Bei VK 28.90 meldete jeder Margenwächter damit nur
CHF 5.96 — genau die Grösse, bei der dieses Projekt Produkte bewusst sperrt.
Gesetzt und per frischer Lesung nachgeprüft. Konvention bestätigt am Fleischwolf
vom selben Tag: **`unitCost` ist die Ware allein, ohne Fracht.**

## Marktpreis Schweiz (Firecrawl, 2 Credits)

Dieselbe Bauart heisst bei Casativo/ideoon „Schwebende RGB Tischlampe mit Handy
Ladeport", **CHF 37.95** einzeln (2er-Set CHF 81.95, also 18.98 je Stück), auch bei
Galaxus gelistet. Unsere CHF 28.90 liegen **unter** dem Schweizer Einzelpreis.

## Das eigentliche Problem ist die Sichtbarkeit

**0 Sitzungen in 60 Tagen** (ShopifyQL). Gegenprobe greift: dieselbe Abfrage gibt
für die Abendkleid-Seiten 231 und 161. Technisch ist an der Seite nichts zu tun.

## Zwei Verdachtsmomente, die sich beim Nachsehen auflösten

1. Die Varianten-SKU `CJ-1703968845146365952` ist **keine** kaputte SKU:
   `lieferbarkeit_guard.mjs` schneidet `CJ-` ab und erkennt die Ziffernfolge über
   `/^\d{15,}$/` als pid. Der Wächter kann das Produkt messen.
2. Die Produktsuche ignorierte die Suchwörter und lieferte zehn beliebige Produkte
   — dieselbe Klasse wie die still ignorierten Shopify-Filter. Erst eine
   GraphQL-Abfrage mit `query: "title:*schweb*"` fand den Treffer.

Dazu die Publish-Falle in neuer Form: die `InventoryItem`-ID lässt sich **nicht**
aus der Varianten-ID ableiten — geraten antwortete Shopify „Produkt nicht
vorhanden". **IDs nie raten, auch keine Inventar-IDs.**

## Offen, klein

Die schwarze Variante (USD 8.82, ebenfalls 16 Frachtlinien) ist im Shop nicht
angelegt. Nicht ergänzt, weil das den Produktaufbau ändert.
