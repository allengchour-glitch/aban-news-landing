# Gibt es bei CJ edle und teure Produkte? (Messung 16.11.2026 abends)

Anlass: Besitzer 16.11. «gibts bei cj edle und teure produkten?». Nur lesend. Keine Produkte angelegt, nichts im Shop geändert.
Werkzeuge: `scan.mjs` (Preisbänder und Kandidaten ab USD 100), `fracht.mjs` (Fracht CN nach CH je Kandidat). CJ-Abfragen: rund 80 (Punktestand nicht gelesen).

## Katalog nach Preis (GEMESSEN 16.11. 23:2x UTC, `product/list` mit `minPrice`/`maxPrice`, Verkaufspreis bei CJ in USD = unser Einkauf)

| Preisband (USD) | Produkte |
|---|---|
| bis 20 | 1 501 938 |
| 20 bis 50 | 119 229 |
| 50 bis 100 | 46 598 |
| 100 bis 200 | 27 884 |
| 200 bis 500 | 13 399 |
| 500 bis 1 000 | 2 228 |
| über 1 000 | 1 935 |

Das Filterfeld heisst `minPrice` (und `maxPrice`); `startSellPrice`/`endSellPrice` wirken bei `product/list` NICHT (gleiche Trefferzahl wie ohne Filter).

## Was davon edel wirkt (Stichprobe: 650 Treffer ab USD 100 aus 40 Suchwörtern, je erste Seite, `kandidaten_kurz.json`)

- Silberschmuck S925 mit Moissanit oder Laborsteinen: USD 103 bis 322. Natürliche Hetian-Jade-Armbänder: USD 104 bis 117.
- Echtleder-Handtaschen: USD 102 bis 112 (gelistet bei 116, 208 und 292 anderen Läden). Wollmäntel und Kaschmir (Pullover, Cardigan): USD 105 bis 126.
- Kronleuchter: USD 104 bis 370 und mehr. Quarz-Uhren ab USD 100, Uhrenbeweger.
- Das Länderfeld des Katalogs (`shippingCountryCodes`) nennt die Schweiz bei 0 von 650 Treffern (Beispielwerte `CN`, `CN_US`): es taugt nicht als Lieferbarkeit, nur die Frachtabfrage zählt.

## Fracht CN nach CH (GEMESSEN, `logistic/freightCalculate`, erste Variante, Menge 1; günstigste Linie)

| Produkt (gekürzt) | Einkauf USD | Gewicht g | Varianten | günstigste Linie |
|---|---|---|---|---|
| S925 Silver 11.7g Moissanite Tennis Bracelet, 33pcs 0.3ct  | 102.9 | 200 | 3 | CJPacket Ordinary VIP 7.2 USD, 7-10 Tage |
| Tahitian Natural Seawater Black Pearl Moissanite Pendant S | 119.22 | 21 | 1 | CJPacket YT Ordinary 4.52 USD, 9-10 Tage |
| S925 Silver 5.6g Lab-Created Ruby Sapphire Emerald Necklac | 124.9 | 200 | 3 | CJPacket Ordinary VIP 7.2 USD, 7-10 Tage |
| Natural Light Green Hetian Jade Bracelet Xiuyan Jade Multi | 116.58 | 300 | 1 | CJPacket Ordinary VIP 8.86 USD, 7-10 Tage |
| Natural Hetian Jade  Amber Gourd Tassel Bracelet Round Bea | 103.81 | 300 | 1 | CJPacket Ordinary VIP 8.86 USD, 7-10 Tage |
| AutumnWinter Bestselling Women's Wool Coat Natural Outerwe | 105.47 | 1320 | 36 | CJPacket Ordinary F 21.96 USD, 5-12 Tage |
| Solid-color Women's Cashmere Knit Cardigan Thick Coat With | 116.99 | 820 | 10 | CJPacket EQ Ordinary 15.23 USD, 5-9 Tage |
| Cashmere Long-sleeve Shirt-collar Sweater | 117.19 | 220 | 6 | CJPacket YT Ordinary 7.43 USD, 9-10 Tage |
| Niche Original Genuine Genuine Leather Handbag | 101.83 | 720 | 4 | CJPacket EQ Ordinary 13.95 USD, 5-9 Tage |
| Cowhide Embroidery Ladies Bamboo Handbag | 102.81 | 650 | 3 | CJPacket EQ Ordinary 13.06 USD, 5-9 Tage |
| Vintage Vegetable Tanned Leather Men's First Layer Cowhide | 108.86 | 1220 | 2 | CJPacket Ordinary F 20.67 USD, 5-12 Tage |
| Men's Genuine Leather Handmade Retro Handbag | 111.94 | 1020 | 1 | CJPacket Ordinary F 18.08 USD, 5-12 Tage |
| Van Gogh Star Radiance Series Quartz Wrist Watch | 110 | 500 | 3 | CJPacket EQ Sensitive 13.23 USD, 6-10 Tage |
| Fully Automatic Nine-position Watch Winder | 103.52 | 7600 | 1 | CJPacket EQ Sensitive 109.18 USD, 6-10 Tage |
| French-style Green Amber Smoky Glass Chandelier | 187.5 | 10200 | 8 | CJPacket Ordinary VIP 143.5 USD, 7-10 Tage |

Lesart: Schmuck kostet USD 4.5 bis 9 Fracht (5 bis 10 Tage), Taschen und Mäntel USD 13 bis 22, der Uhrenbeweger USD 109 und der Kronleuchter USD 143: Möbel und Schweres lohnt sich nicht. Die Quarz-Uhr hat nur «Sensitive»-Linien (USD 13 bis 18).

## Grenzen (Hypothesen, soweit nicht anders markiert)

- Echte Luxusmarken gibt es nicht; Treffer mit Markennamen (z. B. «Dr Martens», «KIIROO») nie importieren.
- «Echt» (Leder, Kaschmir, Jade, Silber, Moissanit) ist nur die Angabe des Lieferanten. Ohne Muster nicht als echt verkaufen (wie bei den Lederhüllen, `dropship/HANDYHUELLEN-PLAN-2910.md`). Moissanit ist Laborstein: der Titel muss es sagen.
- Viele teure Treffer sind Möbel, Autoteile oder US-Lagerware («Amazon Shipping», «Prohibited by WalMart» im Titel): nicht für uns.
- Preisformel: USD 133 Einkauf plus USD 9 Fracht entsprechen bei Kurs 0.82435 rund CHF 117 Einstand. Ein Verkaufspreis von CHF 250 wäre nötig; ob das bei LuxeStyle jemand kauft, ist ungemessen (Warenkorb im Schnitt CHF 41.15 in 30 Tagen, teuerste bezahlte Bestellung CHF 81.81). Die Sammlung «Premium ab CHF 80» (Regel `VARIANT_PRICE > 80`) führt 8 481 Produkte (Entwürfe eingeschlossen), die obersten aktiven sind Werkzeug, Hantel, Fotorahmen: nichts Edles.

## Vorschlag (Entscheid des Besitzers, noch nicht beantwortet)

Kleiner Test mit 5 bis 8 Stück als Entwurf: 2 Silber-Moissanit-Stücke, 1 Jade-Armband, 1 Echtleder-Handtasche, 1 Kaschmir-Cardigan; dazu ein Muster bei CJ für die Echtheit. Veröffentlichen erst nach seinem Ja.
