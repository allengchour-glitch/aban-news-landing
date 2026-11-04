# LuxeStyle Produktkatalog: kontrollierter Live-Stapel R86

Stand: 04.11.2026, Europe/Zurich

R86 führte **exakt vier** serielle Shopify-Writes in dieser Reihenfolge aus: Eisraspler, runde Wandlampe, Meerjungfrauenlampe, Laternenleuchte. Jeder Write hatte genau einen Mutationsversuch, keine `userErrors` und keinen Retry. Nach jedem Write wurden Admin und öffentliche Storefront vollständig rückgelesen; HTML und Produkt-JSON antworteten bei allen vier Produkten mit HTTP 200.

## Bestätigte Reihenfolge und Live-Zustände

| Seq. | Produkt-ID | Titel nachher | Preis | Varianten | Medien | Kategorie erhalten |
|---:|---|---|---:|---|---:|---|
| 1 | `gid://shopify/Product/15448963645825` | **Manueller Eisraspler mit Handkurbel** | CHF 15.90 | 1 (`gid://shopify/ProductVariant/55878385926529`) | 6 | `gid://shopify/TaxonomyCategory/hg-11-7-27` |
| 2 | `gid://shopify/Product/15454472012161` | **Runde Wandlampe mit glänzender Halterung** | CHF 47.90 | 1 (`gid://shopify/ProductVariant/55910476579201`) | 13 | `gid://shopify/TaxonomyCategory/hg-13-9-4` |
| 3 | `gid://shopify/Product/15465835233665` | **Meerjungfrauen-Wandlampe mit Muschelmotiv** | CHF 19.90 | 1 (`gid://shopify/ProductVariant/55951255273857`) | 6 | `gid://shopify/TaxonomyCategory/hg-13-9-4` |
| 4 | `gid://shopify/Product/15476180451713` | **Wandleuchte im Laternen-Stil, Warm- oder Weisslicht** | CHF 15.90 | 2 (`gid://shopify/ProductVariant/67842211840391`, `gid://shopify/ProductVariant/67842211873159`) | 5 | `gid://shopify/TaxonomyCategory/hg-13-9-4` |

Alle Varianten sind kaufbar, verwenden `CONTINUE` und sind nicht inventargeführt. Alle Barcode-Verbindungen sind in der vollständigen Vorher- und Nachherbasis leer. Die zwei Laternenvarianten bleiben exakt an ihre bisherigen Medien gebunden:

- Warmlicht: Variante `gid://shopify/ProductVariant/67842211840391`, SKU `CJYD301176502BY`, Medium `gid://shopify/MediaImage/70303901778305`.
- Weißlicht: Variante `gid://shopify/ProductVariant/67842211873159`, SKU `CJYD301176503CX`, Medium `gid://shopify/MediaImage/70303901811073`.

## Entfernte Fehlzuordnungen und unbelegte Angaben

1. **Eisraspler**: Tags `aufbewahrung`, `organizer`, `sort-mixer-entsafter-zerkleinerer`; Claims zu 500 ml, PP/PS, Lebensmittelechtheit, 13 × 12.5 × 26 cm und gewerblicher Eignung.
2. **Runde Wandlampe**: Tags `aufbewahrung`, `organizer`; Claims zu einfacher Installation und Betriebsspannung ≤36 V.
3. **Meerjungfrauenlampe**: Tags `aufbewahrung`, `organizer`; Claims zu Kunstharz, Langlebigkeit und spezifischer Geschenkeignung.
4. **Laternenleuchte**: Tags `aufbewahrung`, `organizer`; Claims zu Bewegungssensor, 22 W, PVC, IP65, 111–240 V, 23.5 cm und Aussenbereich.

Bei allen vier Produkten wurden ausserdem die produktbezogene Lieferzeile «10–20 Werktage» und der ungeprüfte Rabattcode aus Produkttext/Produkt-SEO entfernt. `rueckhol-0907` blieb auf allen vier Produkten erhalten und sperrt neue Social-Ausspielung.

## Geschützte Felder und Rücklesung

Status `ACTIVE`, Handles, Vendor, offizielle Shopify-Kategorie-IDs, Publikationszustände, Varianten-IDs, SKUs, Preise, Vergleichspreise, Kaufbarkeit, `inventoryPolicy`, Tracking, Barcodes, Optionen sowie Medien-IDs, Reihenfolge und Bindungen blieben exakt erhalten. Die vier geschützten Feld-Hashes stimmen jeweils mit der unmittelbaren Vorherbasis überein.

Bei der Laternenleuchte meldete die strikte Rohtextprüfung `target_mismatch`, weil Shopify ausschliesslich Zeilenumbrüche zwischen den `<li>`-Elementen eingefügt hat. Die semantische Gegenprobe bestätigte identischen Inhalt; Ziel- und Nachher-Hash sind beide `492a9488b828134acf4618164c104baeaca4f14e6b6a478453c0dfa381bf971e`. Es wurde korrekt kein Retry ausgeführt.

## Getrennte Restbefunde

- Die globale Theme-Lieferzeile und `WELCOME10` bleiben im Theme bestehen. R86 änderte das Theme nicht.
- Historische Handles wurden bewusst erhalten, darunter `wandlampe-mit-spiegel-finish-634100`, `meerjungfrauen-wandlampe-deko-612700` und `bewegungssensor-wandleuchte-im-laternen-stil-618900`.
- Alte Medien-Alttexte tragen teilweise weiterhin die früheren Namen «Wandlampe mit Spiegel-Finish», «Meerjungfrauen Wandlampe & Deko» und «Bewegungssensor Wandleuchte im Laternen-Stil». Medien wurden in R86 nicht geändert.
- Materialien, Masse, elektrische Werte, Sensorfunktion und weitere Spezifikationen bleiben ohne unabhängige Quelle unbekannt.
- Der Gesamtkatalog ist nicht abgeschlossen.

Es gab keine Social-/Metricool-, Merchant-/Feed-, Theme-, Klaviyo-/Flow- oder Kauf-Watch-Aktion. Ebenso wurden keine Rabatte, Budgets, Versand- oder Shop-Einstellungen geändert.

Bevorzugter Laufbeleg: `RUN-RESULTS-R85-R86.json`, SHA-256 `8e5a2efbdc2b83865b49d67342c4d3865875eea184ec8b52a95e1fb3b6097e7c`. R86-Allowlist-SHA-256: `14d3d58c88dcbb751032f002f16d7d23d0648371956e82110d9e3cf8d609bd17`.
