# LuxeStyle Produktkatalog: kontrollierter Live-Lauf R85

Stand: 04.11.2026, Europe/Zurich

R85 führte **genau einen** seriellen Shopify-Write aus und stoppte danach. Betroffen war ausschliesslich die Nudelmaschine `gid://shopify/Product/15495105184129`. Die Mutation meldete keine `userErrors`; es gab **einen Versuch und keinen Retry**.

## Bestätigte Änderung

| Feld | Belegter Zustand |
|---|---|
| Produkt | `gid://shopify/Product/15495105184129` — **Manuelle Nudelmaschine mit Handkurbel** |
| Handle / URL | `manuelle-nudelmaschine-160-3mm-619100` / https://luxestyle.ch/products/manuelle-nudelmaschine-160-3mm-619100 |
| Produkttyp / Kategorie | `Küche & Bar` / `gid://shopify/TaxonomyCategory/hg-11-7-36` (Nudelmaschinen) |
| Preis | CHF 120.90 |
| Variante | 1: `gid://shopify/ProductVariant/56086713336193`, SKU `CJ-2604130915211619100`, kaufbar, `CONTINUE`, nicht getrackt |
| Medien / Publikationen | 6 Medien / 8 Publikationszustände |
| Sperrtag | `rueckhol-0907` unverändert erhalten |

Geändert wurden Titel, Beschreibung, Produkttyp, Tags und SEO. Entfernt wurden die falschen Tags `aufbewahrung` und `organizer`. Aus Produkttext und Produkt-SEO entfernt wurden die unbelegten Angaben zu rostfreiem Stahl, Modell 160, 3-mm-Flachschneider und Lieferumfang sowie die produktbezogene Lieferzeile «10–20 Werktage» und der ungeprüfte Rabattcode.

Status `ACTIVE`, Handle, Vendor, offizielle Kategorie, Publikationszustände, Varianten-ID, SKU, Preis, Vergleichspreis, Kaufbarkeit, `inventoryPolicy`, Tracking, Optionen sowie Medien-IDs, Reihenfolge und Bindungen wurden geschützt und nach dem Write vollständig über Admin zurückgelesen.

## Verbindlicher Stoppgrund

Die Admin-Vorherbasis enthielt das Barcode-Feld nicht. Der Barcode-Zustand **vorher ist deshalb unbekannt**. Die Rücklesung nach dem Write zeigt eine leere Barcode-Verbindung. Das wird weder als unverändert noch als Nullbestand interpretiert. Der Guard stoppte R85 nach Sequenz 1; ein zweiter Write und ein Retry wurden nicht gesendet.

## Rücklesung

- Admin: vollständig zurückgelesen; geschützte Felder ausser der nicht belegbaren Barcode-Vorherbasis exakt.
- Storefront HTML: HTTP 200.
- Storefront Produkt-JSON: HTTP 200.
- Neuer Titel, neuer Text und bereinigtes Produkt-SEO öffentlich bestätigt.

## Getrennte Restbefunde

- Die globale Theme-Lieferzeile und `WELCOME10` bleiben im Theme bestehen. R85 änderte das Theme nicht.
- Der historische Handle enthält weiterhin `160-3mm`; alte Medien-Alttexte mit `3mm` wurden nicht geändert.
- Weitere Materialien, Masse und technische Angaben bleiben ohne unabhängige Quelle unbekannt.
- Der Gesamtkatalog ist nicht abgeschlossen.

Es gab keine Social-/Metricool-, Merchant-/Feed-, Theme-, Klaviyo-/Flow- oder Kauf-Watch-Aktion. Ebenso wurden keine Rabatte, Budgets, Versand- oder Shop-Einstellungen geändert.

Bevorzugter Laufbeleg: `RUN-RESULTS-R85-R86.json`, SHA-256 `8e5a2efbdc2b83865b49d67342c4d3865875eea184ec8b52a95e1fb3b6097e7c`.
